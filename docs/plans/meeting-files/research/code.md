# Code sweep: meeting-files

## Scope of this sweep

One research pass over the current in-memory data layer (`apps/api`, `apps/web`), the project
configuration that a Prisma/PostgreSQL move and a file-upload endpoint would touch, and every
upload/binary-related surface already in the repository. The four scoping decisions (users AND
meetings move to Prisma, PostgreSQL via docker-compose, bytes in the DB, both API and web halves)
were given as settled and are not re-examined here — only what exists around them is recorded.

67 files read with content (plus several greps over the lockfile, `.github/workflows/`, and the
docs corpus). The sweep converged: repeated greps for `prisma`, `docker`, `multer`, `multipart`,
`FormData`, `Buffer`, `base64` and `process.env` stopped turning up new product-code files after the
second pass, and the one web route directory in question (`apps/web/src/app/meetings/**`) was
confirmed absent by a direct `find`.

## API: meetings module (in-memory store, end to end)

- `apps/api/src/meetings/meeting.types.ts:5-17` — `Meeting` interface: `id`, `ownerId`, `title`,
  `startsAt` (string, ISO 8601 UTC, comment at line 2-4 says so explicitly), `durationMinutes`,
  `participants: string[]`. No field for attachments or files anywhere in this type.
- `apps/api/src/meetings/meeting.types.ts:23` — `MeetingDto = Omit<Meeting, 'ownerId'>`; the mapper
  is the only place `ownerId` is stripped.
- `apps/api/src/meetings/meeting.types.ts:26-33` — `MeetingsPageDto { items: MeetingDto[]; total: number }`,
  with the comment at line 28-30 naming invariant 4 directly: `total` is the owner's full count, not
  `items.length`.
- `apps/api/src/meetings/meeting.types.ts:40-45` — `CreateMeetingInput` has no `ownerId` field; the
  comment ties this to invariant 5 (owner comes from `@CurrentUser()`).
- `apps/api/src/meetings/meetings.service.ts:33-41` — `MeetingsService` holds `private readonly
meetingsById = new Map<string, Meeting>()`, seeded in the constructor from `SEED_MEETINGS`, with a
  shallow-copy-avoidance comment (`// A shallow copy would share 'participants' with the module-level
SEED_MEETINGS array.`).
- `apps/api/src/meetings/meetings.service.ts:69-84` — `create(ownerId, input)`: id from
  `randomUUID()` (`node:crypto`), `startsAt` normalized via `new Date(input.startsAt).toISOString()`,
  `durationMinutes: input.durationMinutes ?? DEFAULT_DURATION_MINUTES` (60),
  `participants: [...(input.participants ?? [])]`. Stores into `this.meetingsById` and returns a copy.
- `apps/api/src/meetings/meetings.service.ts:48-59` — `findRecent(ownerId, limit)` filters + sorts +
  slices; `countByOwner(ownerId)` is `this.byOwner(ownerId).length` — the full count, never derived
  from `findRecent`'s result (invariant 4's exact location).
- `apps/api/src/meetings/meetings.service.ts:92-98` — `findById(ownerId, id)`: one `Map.get`, then
  `meeting && meeting.ownerId === ownerId ? copy : undefined` — missing-id and wrong-owner collapse to
  the same `undefined` by construction (comment cites `ADR-0018`).
- `apps/api/src/meetings/meetings.service.ts:21-25` — `compareByStartsAtDesc`: DESC by
  `Date.parse(startsAt)`, secondary key `left.id.localeCompare(right.id)` — invariant 7's exact
  location.
- `apps/api/src/meetings/meetings.controller.ts:29-72` — `@Controller('meetings')` with class-level
  `@UseGuards(JwtAuthGuard)` (invariant 5's enforcement point). Three routes already exist:
  - `GET /meetings` (line 34-44): `ownerId` from `@CurrentUser()`, calls
    `findRecent(current.id, query.limit)` mapped through `toMeetingDto`, `total` from
    `countByOwner(current.id)`.
  - `POST /meetings` (line 47-50): no `@HttpCode` — default 201 is correct per the comment
    (invariant 1 is a login-only rule; this route is POST-default-201 deliberately).
  - **`GET /meetings/:id` already exists** (line 63-72): `@Param('id') id: string` with **no pipe**
    (comment at line 56-61 explains why: no seed id is a UUID, and a validating pipe's 400 would
    violate invariant 8). `findById` returning `undefined` becomes one `NotFoundException('Meeting
not found')` — the no-argument form is explicitly called "forbidden" in the comment.
- `apps/api/src/meetings/meetings.mapper.ts:11-18` — `toMeetingDto` lists fields explicitly (no rest
  destructuring), comment notes there is deliberately no `meetings.mapper.spec.ts`.
- `apps/api/src/meetings/meetings.seed.ts:16-73` — `SEED_MEETINGS`: 7 meetings across 4 owners
  (`usr-teacher` 5, `usr-student` 0, `usr-planner` 1, `usr-organizer` 1), fixed dates in January 2026,
  never `Date.now()`.
- `apps/api/src/meetings/meetings.module.ts:11-17` — imports `AuthModule` (for the guard),
  `controllers: [MeetingsController]`, `providers: [MeetingsService]`, `exports: [MeetingsService]`.
- `apps/api/src/meetings/dto/create-meeting.dto.ts:25-52` — `CreateMeetingDto`: `title` (`@IsString
@Length(3,100)`), `startsAt` (`@IsISO8601()`), `durationMinutes` optional
  (`@IsOptional @Type(Number) @IsInt @Min(15) @Max(480)`), `participants` optional array
  (`@IsOptional @IsArray @ArrayMaxSize(20) @IsString({each:true}) @Length(1,100,{each:true})`). No
  `ownerId` field — comment ties this explicitly to `forbidNonWhitelisted`.
- `apps/api/src/meetings/dto/list-meetings-query.dto.ts:19-26` — `ListMeetingsQueryDto`: `limit`
  optional (`@IsOptional @Type(Number) @IsInt @Min(1) @Max(100)`). Default of 3 lives in the service,
  not the DTO (comment explains `plainToInstance` does not apply a DTO default predictably).
- `apps/api/src/meetings/meetings.service.spec.ts` — 321 lines, unit titles `HD-UT-01`…`HD-UT-09` and
  `MD-UT-01`…`MD-UT-09` (the `MD-` prefix is the existing `GET /meetings/:id` feature's case ID
  family), covering `findRecent`, `countByOwner`, `create`, `findById`, copy-not-reference semantics.

## API: users module

- `apps/api/src/users/user.types.ts:1-9` — `User { id, email, name, passwordHash }`;
  `PublicUser = Omit<User, 'passwordHash'>`.
- `apps/api/src/users/users.seed.ts:1-52` — `SEED_USERS`: 4 users (`usr-teacher`, `usr-student`,
  `usr-planner`, `usr-organizer`), one shared plaintext password `'Passw0rd!'` (`SEED_PASSWORD`,
  line 19). The file-level comment (line 5-9) states plaintext passwords are hashed with `scrypt`
  "when `UsersService` initializes" and calls this "a deliberate concession of a demo without a
  database."
- `apps/api/src/users/users.service.ts:22-39` — `UsersService` holds `usersById: Map<string, User>`
  and `userIdsByEmail: Map<string, string>`, both populated in the constructor by hashing every seed
  password via `hashPassword` (`common/crypto/password.ts`).
- `apps/api/src/users/users.service.ts:13-15` — `normalizeEmail = (e) => e.trim().toLowerCase()`,
  exported and reused by `auth.service.ts`.
- `apps/api/src/users/users.mapper.ts:8-10` — `toPublicUser` lists fields explicitly.
- `apps/api/src/users/users.module.ts:5-8` — `providers: [UsersService]`, `exports: [UsersService]`,
  no controller of its own (routes live on `AuthController`/`MeetingsController`).

## API: auth path and the exact user-record coupling point

- `apps/api/src/auth/auth.service.ts:38` — `AuthService.login` calls
  `this.usersService.findByEmail(normalizeEmail(dto.email))` — this is the one place login reaches a
  `User` record.
- `apps/api/src/auth/auth.service.ts:27` — `DUMMY_PASSWORD_HASH = hashPassword(randomBytes(16).toString('hex'))`,
  a module-level constant (comment at line 23-26 explains why not a class field: initialization-order
  risk in a security branch).
- `apps/api/src/auth/auth.service.ts:47-53` — password is verified unconditionally against either the
  real hash or `DUMMY_PASSWORD_HASH`; `user === undefined || !passwordMatches` is the single throw
  branch (`INVALID_CREDENTIALS_MESSAGE`, invariant 6/18's location).
- `apps/api/src/auth/auth.controller.ts:39-48` — `AuthController.me` calls
  `this.usersService.findById(current.id)` — the second (and only other) point auth reaches a `User`
  record; falls back to 401 (not 500) if the signed token's subject is gone.
- `apps/api/src/auth/jwt-auth.guard.ts:35-58` — `JwtAuthGuard` never touches `UsersService`: it only
  extracts a bearer token, calls `tokenService.verify`, and sets `request.user = { id: payload.sub,
email: payload.email }` from the JWT payload alone (line 55). It does not re-read the user store on
  every request.
- `apps/api/src/auth/token.service.ts:14-23` — thin wrapper over `@nestjs/jwt`'s `JwtService`:
  `sign(payload)` → `signAsync`, `verify(token)` → `verifyAsync<JwtPayload>`.
- `apps/api/src/auth/auth.types.ts:6-25` — `JwtPayload { sub, email }`, `AuthenticatedUser { id,
email }`, `AuthenticatedRequest extends Request { user: AuthenticatedUser }`, `LoginResult {
accessToken, user: PublicUser }`.
- `apps/api/src/auth/current-user.decorator.ts:9-12` — `@CurrentUser()` reads
  `request.user` set by the guard; only works on routes behind `JwtAuthGuard` (comment line 7).
- `apps/api/src/auth/dto/login.dto.ts:7-14` — `LoginDto { email: @IsEmail(); password: @IsString
@IsNotEmpty }`, no strength rule (comment explains: would turn 401 into 400).
- `apps/api/src/auth/password.service.ts:11-18` — `PasswordService` is a one-line DI wrapper over
  `common/crypto/password.ts`'s `hashPassword`/`verifyPassword`; explicitly has no spec of its own.
- `apps/api/src/common/crypto/password.ts:18-54` — `scrypt`-based hashing, format
  `scrypt$<saltHex>$<keyHex>` (16-byte salt, 64-byte key), `verifyPassword` never throws — returns
  `false` for any unusable `stored` value (comment line 26-27 ties this to not turning 401 into 500).
- `apps/api/src/config/auth.config.ts:1-37` — `loadAuthConfig()` reads `process.env.JWT_SECRET` and
  `process.env.JWT_EXPIRES_IN` directly. Comment at line 3-5: "`@nestjs/config` and dotenv are
  deliberately absent, so values come straight from `process.env`." A missing `JWT_SECRET` logs a
  `Logger.warn` and falls back to the hard-coded `DEV_JWT_SECRET = 'purpleschool-dev-secret'`
  (comment: a stable constant rather than `randomBytes` at startup, because `--watch` restarts would
  otherwise invalidate every issued token).
- `apps/api/src/auth/auth.module.ts:12,24` — `const { jwtSecret, jwtExpiresIn } = loadAuthConfig();`
  is called at **module-load time** (top-level, not inside a factory), then passed into
  `JwtModule.register({ secret: jwtSecret, signOptions: { expiresIn } })`. Module imports:
  `[UsersModule, JwtModule.register(...)]`; exports `[JwtAuthGuard, TokenService]` "`MeetingsModule`
  needs both of these" (comment line 27).

## API: app wiring and bootstrap

- `apps/api/src/app.module.ts:9-28` — `@Module({ imports: [AuthModule, MeetingsModule], controllers:
[AppController], providers: [AppService, { provide: APP_PIPE, useValue: new ValidationPipe({
whitelist: true, forbidNonWhitelisted: true, transform: true }) }] })`. The comment (line 14-18)
  names invariant 3 exactly: registered as an `APP_PIPE` provider rather than
  `app.useGlobalPipes(...)` in `main.ts`, because `Test.createTestingModule({ imports: [AppModule]
})` would otherwise boot without validation.
- `apps/api/src/main.ts:17-24` — `bootstrap()`: `NestFactory.create<NestExpressApplication>(AppModule)`,
  `app.disable('x-powered-by')`, `await app.listen(process.env.PORT ?? 3001)`. No `app.enableCors()`,
  no global prefix (comment line 7-15 explains both are deliberate), no `ValidationPipe` call here.
  **No `onModuleDestroy`, no `enableShutdownHooks`, no `OnApplicationShutdown` anywhere in
  `apps/api/src`** — confirmed by `grep -rn "onModuleDestroy\|enableShutdownHooks\|OnModuleInit\|OnApplicationShutdown" apps/api/src` returning no matches (exit code 1).
- `apps/api/src/config/auth.config.ts` is the **only** `process.env` reader inside `apps/api/src`
  besides `main.ts`'s `process.env.PORT` — confirmed by `grep -rn "process\.env" apps/api/src
apps/web/src e2e scripts`: the API-side hits are exactly `auth.config.ts:23,35` and `main.ts:23`.

## Configuration surfaces relevant to a Prisma/Postgres move

- `apps/api/package.json` — `"type": "module"`; dependencies are `@nestjs/common`, `@nestjs/core`,
  `@nestjs/jwt`, `@nestjs/platform-express`, `class-transformer`, `class-validator`,
  `reflect-metadata`, `rxjs` only. **No `prisma`, `@prisma/client`, `pg`, `typeorm`, `drizzle`,
  `sqlite`/`better-sqlite3`, `knex`, `dotenv`, or `@nestjs/config`** in either `dependencies` or
  `devDependencies`.
- `apps/api/tsconfig.json:1-9` — `"extends": "@purpleschool/tsconfig/nestjs.json"`, adds
  `"outDir": "./dist"`, `"types": ["vitest/globals", "node"]`, `"include": ["src/**/*", "test/**/*",
"*.ts"]`.
- `packages/tsconfig/nestjs.json:1-16` — `"module": "nodenext"`, `"moduleResolution": "nodenext"`,
  `"resolvePackageJsonExports": true`, `"emitDecoratorMetadata": true`,
  `"experimentalDecorators": true`, `"allowSyntheticDefaultImports": true`,
  `"strictPropertyInitialization": false`, `"removeComments": true`, `"sourceMap": true`.
- `packages/tsconfig/base.json:1-16` — `"target": "ES2023"`, `"strict": true`, `"isolatedModules":
true`, `"moduleDetection": "force"`, `"declaration": true`, `"incremental": true`. **No
  `verbatimModuleSyntax`** anywhere in `packages/tsconfig/*.json`, the root `tsconfig.json`, or
  `apps/api/tsconfig.json` — confirmed by `grep -rn "verbatimModuleSyntax"` over the repository's
  own `*.json` files (only hits are inside `node_modules/typescript`'s localized diagnostic message
  catalogs, not project configuration).
- Root `tsconfig.json:1-14` — `"extends": "./packages/tsconfig/base.json"`, `"module": "esnext"`,
  `"moduleResolution": "bundler"`, scoped to `playwright.config.ts` and `e2e/**/*.ts` only
  (`exclude: ["node_modules", "apps", "packages"]`).
- `apps/api/nest-cli.json` — `{ "collection": "@nestjs/schematics", "sourceRoot": "src",
"compilerOptions": { "deleteOutDir": true } }`. No custom webpack/build settings, no asset-copy
  configuration (relevant to a generated Prisma client needing to ship alongside `dist/`).
- `apps/api/.env.example:1-13` — documents `PORT`, `JWT_SECRET`, `JWT_EXPIRES_IN` only. Line 1-3's
  comment: "Nest does NOT read `.env` — dotenv and `@nestjs/config` are deliberately absent."
- `apps/web/.env.example:1-7` — documents `API_URL` only.

## Docker / compose / CI service containers

- **No `docker`, `Dockerfile`, or `compose` file anywhere in the repository.** Searched with `find .
-iname "Dockerfile*"` and `find . -iname "*compose*.yml" -o -iname "*compose*.yaml"` (both
  excluding `node_modules`/`.git`) — zero hits. The only path-name match for "compose" in the whole
  tree is an unrelated CSV, `.agents/skills/ui-ux-pro-max/data/stacks/jetpack-compose.csv`.
- `.github/workflows/ci.yml` — one workflow, two jobs (`verify`, `build`). The `verify` job runs
  (in order): `actions/checkout@v4` (`fetch-depth: 0`), `pnpm/action-setup@v4`,
  `actions/setup-node@v4` (`node-version-file: .nvmrc`), `pnpm install --frozen-lockfile`, a cached
  Playwright Chromium install, `pnpm check:orientation`, `pnpm lint`, `pnpm typecheck`, `pnpm test`,
  `pnpm --filter @purpleschool/api test:e2e`, `pnpm format:check`, `pnpm e2e`, an on-failure report
  upload, `pnpm audit --audit-level high`. **No `services:` key and no service container of any kind**
  — no Postgres, no database service defined anywhere in the workflow file. The comment at
  `.github/workflows/ci.yml:9` states "No secrets are needed: `playwright.config.ts` passes
  `JWT_SECRET` and `API_URL` through `webServer.env`." The `build` job runs `pnpm build` and uploads
  `apps/web/.next/` + `apps/api/dist/` as an artifact; comment notes "There is no deployment."

**The CI environment itself**, added at the `FEAT-G1` review because the first version of this sweep
stopped at "no `services:`" and never recorded where the compose deliverable would actually have to
work:

- Both jobs run on Linux: `verify` is `runs-on: ubuntu-latest` (`.github/workflows/ci.yml:33`) and
  `build` is `runs-on: ubuntu-latest` (`:115`). `verify` has `timeout-minutes: 25` (`:34`), `build`
  has `timeout-minutes: 20` (`:116`), and `build` carries `needs: verify` (`:114`).
- Three steps in `verify` execute code that, after this change, would talk to a database —
  the same three named in probe 6: `pnpm test` (`:83`), `pnpm --filter @purpleschool/api test:e2e`
  (`:86`) and `pnpm e2e` (`:93`). The comment at `:91` records that `pnpm e2e` is "The only step that
  starts dev servers."
- `HUSKY: 0` is set at the workflow level (`:28`).

**Not found:** any mechanism in `.github/workflows/ci.yml` that would provide a database to those
three steps — searched the whole file for `services:`, `container:`, `postgres`, `docker` and
`compose`; none appears. How CI gets a database is recorded as an open question below, not answered.

- `.nvmrc` pins Node `24`.
- Root `package.json` — `"packageManager": "pnpm@10.32.1"`. `pnpm.overrides.multer: '>=2.3.0'`
  (`pnpm-workspace.yaml:21-26`, comment: pinned because `@nestjs/platform-express@12.0.1` transitively
  pulls a vulnerable `multer@2.2.0` — `FX-029` in `docs/CHANGELOG.md:123`). `multer@2.4.0` is present
  in `pnpm-lock.yaml:3000` **only as a transitive dependency of `@nestjs/platform-express`**
  (`pnpm-lock.yaml:4467`), not a direct dependency of `apps/api`, and it is never imported anywhere in
  `apps/api/src` (confirmed: no `multer` import hit in the earlier grep over product source).
  `docs/BACKLOG.md:46` (`BL-018`, P3) proposes dropping that override once Nest raises its own range —
  open, unrelated to this feature.

## Cross-cutting: multipart / streams / Buffer / base64 / uploads

Grepped `apps/api/src`, `apps/web/src` (and, more broadly, `apps/`, `e2e/`, `scripts/` excluding
build output) for `multipart`, `FormData`, `Buffer`, `createReadStream`, `fs\.`, `multer`, `busboy`,
`Blob`, `File`, `base64`, `arrayBuffer`:

- `FormData` appears only in the web layer's text-only Server Action parsing:
  `apps/web/src/lib/actions/auth.ts:36,38` (`readLoginCredentials(formData)`),
  `apps/web/src/lib/actions/meetings.ts:25,33-34` (`formData.get('title')`, `formData.get('startsAt')`),
  `apps/web/src/lib/login-credentials.ts:16,18,20` and its spec, `apps/web/src/lib/types.ts:43`
  (a comment). None of these read a file field.
- `Buffer` appears only in `apps/api/src/common/crypto/password.ts:43-44`
  (`Buffer.from(saltHex, 'hex')`, `Buffer.from(keyHex, 'hex')`) — hex-decoding a stored hash, nothing
  to do with uploads.
- **Not found:** any use of `multipart`, `multer` (as an import), `busboy`, `createReadStream`,
  `fs.*`, `Blob`, a `File` type, `base64`, or `arrayBuffer` in `apps/api/src` or `apps/web/src` —
  searched with `grep -rniE "multipart|FormData|createReadStream|multer|busboy|\bBlob\b|base64|arrayBuffer"
apps/api/src apps/web/src` and separate greps for `Buffer`, `fs\.`, `\bFile\b`; all returned either
  zero hits or only the lines quoted above.

## Web: pages, components, data access

- `apps/web/src/app/page.tsx:35-67` — the only page that renders meeting data. `HomePage` calls
  `getCurrentUser()` then `getMeetings()` (both from `lib/dal.ts`), renders `<MeetingList
meetings={items} />` and `<CreateMeetingForm />` plus a `StatTile`. No link or route to any
  per-meeting page.
- **No `apps/web/src/app/meetings/**` directory exists.** Confirmed by `find apps/web/src/app -iname
"*meeting*"`, which returned nothing — the only "meeting" hits in `apps/web/src` are
  `components/meeting-list.tsx` and `components/create-meeting-form.tsx`, both outside `app/`.
  `apps/web/src/app` itself only contains `auth/` (login, register, session-expired) and the root
  `page.tsx`/`layout.tsx`.
- `apps/web/src/app/auth/session-expired/route.ts` — **the repository's only Route Handler, and its
  only non-page HTTP response from the BFF.** Added as a characterisation at the `FEAT-G1` review,
  where this file had been listed as a directory entry only. 26 lines: it exports a single
  `export async function GET(): Promise<never>` (`:22`) that `await destroySession()` (`:23`) then
  `redirect('/auth/login')` (`:25`). It imports `redirect` from `next/navigation` (`:1`) and
  `destroySession` from `@/lib/session` (`:3`). Its comment block (`:5-21`) records four things: it
  is invariant 17's implementation; `proxy.ts` only sees that a cookie exists, so redirecting
  straight to `/auth/login` produces `ERR_TOO_MANY_REDIRECTS` (found by `SEC-FN-05`);
  `cookies().delete()` throws outside a Server Action or Route Handler, so "A Route Handler is the
  only place that can read the session, erase it and redirect in one go"; and its path is
  "deliberately **outside** the `proxy.ts` matcher".
  It returns no body and sets no `Content-Type` — it is a redirect, not a payload. **Not found:** any
  Route Handler in `apps/web` that returns a body, a binary response, or a `Content-Type` other than
  what `redirect()` sets — searched `apps/web/src/app/**` for `route.ts`, which matches this file
  only.
- `apps/web/src/components/meeting-list.tsx:29-63` — server component (no `'use client'`), renders
  a `ul`/`li` list, each item an HeroUI `Card.Root`/`Card.Content` with title, formatted
  date/time (`formatMeetingDateTime`), and a `Chip` for duration. No participants rendering, no
  attachment affordance. Comment block (line 10-27) ties every markup choice to specific case IDs
  (`HD-FN-04/05/09/14`) and `ADR-0023`.
- `apps/web/src/components/create-meeting-form.tsx:1-65` — `'use client'`, `useActionState` wired to
  `createMeetingAction`. Fields: `title` (`TextField type="text"`), `startsAt`
  (`TextField type="datetime-local"`). No file input, no duration/participants fields in the form
  (duration defaults server-side; comment line 29 says "Duration is not asked for at all"). Native
  `<form action={formAction} noValidate>`, `<Button type="submit" isPending={pending}>`.
- `apps/web/src/lib/dal.ts:40-90` — exactly two exported functions: `getCurrentUser` (cached via
  React's `cache()`, calls `apiFetch('/auth/me', { token })`) and `getMeetings(limit)` (calls
  `apiFetch('/meetings?limit=...', { token })`). **No `getMeetingById` or any per-meeting fetch
  function exists in `dal.ts`.**
- `apps/web/src/lib/api-client.ts:79-116` — `ApiFetchOptions { token?, method?: 'GET'|'POST', body?:
unknown }`; `apiFetch<T>` always sets `headers['Content-Type'] = 'application/json'` (line 96) and
  does `body: body === undefined ? undefined : JSON.stringify(body)` (line 105) — **no branch for
  `multipart/form-data` or a raw/binary body exists.** `method` is typed as a union of exactly `'GET'
| 'POST'` (line 82) — no `'PATCH'`/`'DELETE'` either. Errors: non-2xx responses are parsed as JSON
  (`.json().catch(() => undefined)`, line 111) and thrown as `ApiError` via `ApiError.fromBody`,
  which normalizes Nest's two message shapes (string vs. array, line 59-77 `extractErrorMessage`).
- `apps/web/src/lib/session.ts:19-32` — `createSession` sets the cookie via
  `buildSessionCookieOptions(process.env.NODE_ENV)` (invariant 12's exact location);
  `readSessionToken`/`destroySession` the other two cookie operations. All three are `server-only`.
- `apps/web/src/lib/session-cookie.ts:34-41` — `buildSessionCookieOptions`: `secure: nodeEnv ===
'production'`.
- `apps/web/src/lib/types.ts:15-28` — `Meeting { id, title, startsAt, durationMinutes,
participants }`, `MeetingsPage { items, total }`. Mirrors the API's `MeetingDto`/`MeetingsPageDto`
  field-for-field; no attachment field.
- `apps/web/src/lib/actions/meetings.ts:23-78` — `createMeetingAction`: reads `token` via
  `readSessionToken()`, redirects to `/auth/session-expired` if absent (invariant 10's web-side
  duplication); reads `title`/`startsAt` from `FormData`; posts JSON via `apiFetch`; on success calls
  `revalidatePath('/')` (line 76) — the one revalidation call in the codebase.
- `apps/web/src/proxy.ts:17-32` — matcher `{ matcher: ['/', '/auth/login'] }` (line 38). Redirects
  unauthenticated `/` to `/auth/login`; bounces an authenticated **GET** away from `/auth/login`
  (`request.method === 'GET'` check at line 27, so a POST Server Action to that path is not touched).
- `apps/web/next.config.ts:1-9` — the entire file: `allowedDevOrigins: ['127.0.0.1']`. **No
  `experimental`, no `serverActions` block of any kind** (e.g., no `bodySizeLimit` override, which
  governs the default Server Action payload ceiling).

## Dependencies: apps/web

- `apps/web/package.json` dependencies: `@heroui/react`, `@heroui/styles`, `@phosphor-icons/react`,
  `@tailwindcss/postcss`, `next@16.3.6`, `postcss`, `react@19.2.8`, `react-dom@19.2.8`,
  `tailwind-variants`, `tailwindcss`. devDependencies: the workspace `eslint-config`/`tsconfig`,
  `@types/node`, `@types/react`, `@types/react-dom`, `eslint`, `typescript`, `vitest`. **No Prisma
  client, no upload-handling package of any kind.**

## Architecture corpus: what already governs this area

- `docs/adr/ADR-0007-in-memory-store.md:1-52` — **"An in-memory store with a code seed instead of a
  database," status `accepted`.** The Decision section's `FACT-3121` states services own plain
  arrays seeded at module init; the "Rejected" list includes `FACT-3127` "A database — see Context.
  — this record" and the rationale block (unkeyed) explains the project's subject is "the contract,
  the suite and the development process," not persistence. `FACT-3133` cites `BL-004` ("Replacing the
  seed with a migration") as the backlog item this would close, "marked as conflicting with
  `e2e/fixtures/seed.ts`."
- `docs/architecture.md:149` — `FACT-0037` in the "Patterns deliberately refused" table: `A database`
  refused, governed by `ADR-0007`.
- `docs/architecture.md:112-113` — `FACT-0030`/`FACT-0031`, "In-memory repository + seed" /
  "Test fixture mirroring the seed", listed as currently-used patterns, both under `ADR-0007`.
  (Corrected at the `FEAT-G1` review: this entry previously cited `:149`, which is `FACT-0037`'s
  row in a different table.)
- `docs/data-model.md:94` — `FACT-1025` "There is no database. — `ADR-0007`", under "Storage and
  lifetime."
- `docs/data-model.md:17-33` — the `Meeting`/`MeetingDto`/`MeetingsPageDto` field tables
  (`FACT-1005`-`FACT-1013`), matching the types file exactly; no attachment/file field listed.
- `docs/BACKLOG.md:58` — `BL-004` (P2, security): "Seed → migration with pre-computed hashes instead
  of plaintext in `users.seed.ts`," conflicts column: "a database."
- `docs/BACKLOG.md:46` — `BL-018` (P3, process): drop the `multer` override once
  `@nestjs/platform-express` raises its range; conflicts column: "no; the override only raises a
  version inside the range and changes no behaviour."
- `docs/api-contract.md:34-39` — the Routes table already lists `GET /meetings/:id` as `FACT-2011`,
  guard `Bearer`, success `200`, errors `401`,`404`, case family `MD-API-01`…`07`.
- `docs/api-contract.md:192-224` — the full `GET /meetings/:id` section: `FACT-2061`…`FACT-2068`,
  matching the controller code read above line-for-line (no `ParseUUIDPipe`, one `NotFoundException`
  branch, Express's own 404 for a two-segment unmatched path).
- `e2e/regression/meetings-detail/` — contains `meetings-detail.api.cases.md`,
  `meetings-detail.api.spec.ts`, `meetings-detail.unit.cases.md` **only**. No
  `meetings-detail.functional.cases.md` / `.spec.ts` pair exists in that directory — consistent with
  there being no web page for a single meeting yet.
- `docs/security.md:19-20` — "The application is a learning project with no database and no
  production deployment, so the threat model is narrow" (unkeyed, in the "What is protected"
  section). Line 75-77 (unkeyed): "No rate limiting... Acceptable for a demo without a database."
- `e2e/security/security.api.spec.ts:22-32` — `PROTECTED_ROUTES` already lists `GET /auth/me`,
  `GET /meetings?limit=3`, `POST /meetings`, and `GET /meetings/:id` (built from the decorators per
  the comment at line 27-29, compared as the literal `:id` placeholder).
- `e2e/security/security.functional.spec.ts:31` — `PROTECTED_PAGES = ['/']` — the only entry; no
  meeting-detail page is listed (none exists).
- `.claude/skills/project-context/SKILL.md` — states the ADR rule used above: "An accepted ADR is
  never edited in substance. A changed decision is a **new** ADR whose `Supersedes` names the old
  one," and the table of "what each role opens first," including `implementer-api` reading
  `api-contract.md`/`data-model.md`/`architecture.md` and invariants 1-8.

## Module maps (package-level CLAUDE.md)

- `apps/api/CLAUDE.md:17-28` — map table: `src/meetings/` described as "controller, the in-memory
  service, DTOs, mapper, seed"; `src/config/` as "reads `JWT_SECRET` / `JWT_EXPIRES_IN` from the
  environment." Line 35-37: "**No database, in-memory repositories.** `nest start --watch` restarts
  on every edit and wipes anything the tests created." Line 38-39: "**`.env` is not read** — neither
  `dotenv` nor `@nestjs/config` is wired in."
- `apps/web/CLAUDE.md:15-25` — map table: no row for a meeting-detail route (because none exists);
  `src/lib/api-client.ts` described as "the server-side `fetch` to Nest — the only door into the
  API."

## Not found

- **Not found:** any existing Prisma schema, migration file, or `prisma` CLI usage anywhere in the
  repository — searched `grep -rniE "prisma" pnpm-lock.yaml` plus `find . -iname "package.json" |
xargs grep -li prisma` (excluding `node_modules`); zero hits beyond this research document itself.
- **Not found:** any Docker or docker-compose file, in any form, anywhere in the repository —
  searched `find . -iname "Dockerfile*"` and `find . -iname "*compose*.yml" -o -iname
"*compose*.yaml"` excluding `node_modules`/`.git`.
- **Not found:** any CI service container (e.g., a `services:` block for Postgres) in
  `.github/workflows/ci.yml` — read the file in full; it has exactly two jobs, `verify` and `build`,
  neither declares `services:`.
- **Not found:** any existing multipart/file-upload code path, in product source, in either
  direction (API accepting a file, or web sending one) — see the "Cross-cutting" section above for
  the exact greps run.
- **Not found:** a `GET /meetings/:id` web page or any web-side fetch for a single meeting — `dal.ts`
  exposes only `getCurrentUser`/`getMeetings`; no `app/meetings/**` directory exists; no
  `meetings-detail.functional.*` files exist.
- **Not found:** `verbatimModuleSyntax` set anywhere in this project's own `tsconfig*.json` files
  (only inside `node_modules/typescript`'s own localized diagnostic strings, which is not project
  configuration).
- **Not found:** any lifecycle hook (`onModuleDestroy`, `enableShutdownHooks`,
  `OnApplicationShutdown`, `OnModuleInit`) anywhere in `apps/api/src` — `main.ts` calls neither
  `app.enableShutdownHooks()` nor registers any such hook.

## Open questions

These are the places where the next stage (design) inherits a genuine gap rather than a researched
answer; nothing in the code or the corpus resolves them:

- Whether a Prisma-backed `MeetingsService`/`UsersService` would keep the exact same public method
  signatures (`findRecent`, `countByOwner`, `create`, `findById`, `findByEmail`, `findById`) is not
  addressed anywhere in the corpus — `ADR-0007`'s "Consequences" section only names `BL-004` (the
  seed-to-migration backlog item) as the thing this change would close, without specifying a service
  contract.
- No document specifies a `bodySizeLimit`/`serverActions` ceiling for `apps/web`'s Server Actions
  (`next.config.ts` carries no `experimental.serverActions` block at all), which matters once a file
  upload is expected to pass through a Server Action rather than a direct `fetch`.
- No document specifies how `ValidationPipe`'s `whitelist`/`forbidNonWhitelisted`/`transform` config
  (`apps/api/src/app.module.ts:19-26`) is expected to interact with a `multipart/form-data` body,
  which `class-validator`/`class-transformer` DTOs do not natively describe the way they describe a
  JSON body today.

Added at the `FEAT-G1` review:

- **How CI gets a database.** Both jobs are `ubuntu-latest`, three `verify` steps would talk to one
  after this change (`pnpm test` `:83`, `pnpm --filter @purpleschool/api test:e2e` `:86`, `pnpm e2e`
  `:93`), and the workflow declares no `services:` block and no container. Nothing in the repository
  addresses it. Linux is the one environment here where a compose Postgres is unambiguously
  available, but no file says CI should use one.
- **How `DATABASE_URL` reaches each of the four places that start the API** — `pnpm dev`, the two
  `playwright.config.ts` `webServer.env` blocks (which today pass only `API_URL`, and
  `PORT`/`JWT_SECRET`), and CI. `SEC-API-10` forbids a `.env` file in the repository (`tests.md` §7),
  `apps/api/.env.example` and `apps/api/CLAUDE.md:38-39` record `.env` and `@nestjs/config` as
  deliberately absent, and `config/auth.config.ts` reads `process.env` with an in-code default.
  Nothing records a mechanism for a secret that is neither hard-coded nor in a `.env`.
- **The `prisma-client` generator's option space.** Only `output` and `moduleFormat` were set. Whether
  an option governs the extension of emitted or consumed import specifiers is untested, and
  `prisma validate` cannot be used to enumerate the options — it accepted an invented key without
  complaint (probes.md, probe 1c).
- **Whether `prisma-client-js` is deprecated or supported.** It works in `7.10.0` today; its status
  going forward was not established, and the CLI prints an upgrade banner to `8.0.0-rc.20` on every
  invocation. A generator chosen on a probe has a shelf life, and nothing here says how long.
- **Whether Docker is available without the GUI, after a reboot, or under CI.** The engine was not up
  until Docker Desktop was launched. Nothing was measured about restart behaviour, resource limits,
  or CI.
- **How `pnpm lint` and `pnpm format:check` would treat generated code**, which matters only if
  generated output lands in the tree — itself a design question. The facts, not a conclusion:
  - Both run in `pnpm verify` (`package.json:36`).
  - The root `eslint.config.mjs:10-16` sets `globalIgnores(['apps/**', 'packages/*/dist/**',
'test-results/**', 'playwright-report/**', 'blob-report/**'])` — the root config lints only files
    outside `apps/*`, and each app carries its own `eslint.config.mjs` (comment at `:5-8`).
  - `.prettierignore` lists `node_modules`, `pnpm-lock.yaml`, `dist`, `build`, `out`, `.next`,
    `coverage`, `*.tsbuildinfo`, `next-env.d.ts`, `test-results`, `playwright-report`, `blob-report`,
    `playwright/.cache`, plus `e2e/scenarios-index.md` with a comment explaining that a generated file
    and Prettier want the same bytes and that `PR-API-07` compares it byte-exactly.
  - The `prisma-client` generator's output carries `// @ts-nocheck` and `/* eslint-disable */` in its
    header (probes.md, probe 1c), which addresses ESLint and `tsc` but says nothing about Prettier.
  - **Not found:** any existing entry in `.prettierignore` or an eslint ignore list for a generated
    _code_ directory — the one generated artifact named anywhere is `e2e/scenarios-index.md`, a
    markdown file.

---

## Probe facts

Added by the `researcher` at `FEAT-S1`, not by this sweep's author. **Eight** probes were run as
throwaway code in the session scratchpad per `feature-pipeline` §0; **nothing was installed into this
repository**. The commands and their full output are in [`probes.md`](probes.md) next to this file.
Only the facts are repeated here.

**Two** of the three Open questions this sweep left are answered below and are marked as such —
the `ValidationPipe`/multipart question and the Server Action body-limit question. The third,
whether Prisma-backed services keep today's method signatures, is **not** answered by any probe and
stays open. (Corrected at the `FEAT-G1` review, where this line said "three" and probe 7's heading
claimed to answer the first question in part; probe 7 does not touch method signatures.)

### Environment

**The Docker finding reversed during this stage.** Both states are recorded, because the machine was
reconfigured mid-cycle and a file showing only the end state would hide that.

- **First measurement (probe 0, as originally run): Docker was not installed anywhere checked.** Not
  on PATH, not in `C:\Program Files\Docker`, `C:\ProgramData\DockerDesktop` or
  `%LOCALAPPDATA%\Docker`, and not inside WSL (WSL2 with Ubuntu was present). No host PostgreSQL
  service and no `psql`/`pg_ctl`. The npm registry was reachable. That was a statement about what was
  installed, **not** about what could be — the first version of this file rendered it as "Docker
  cannot run on this machine", which over-read it, and `README.md` answered the capability question
  "Answered: no". Corrected at the `FEAT-G1` review.
- **Second measurement, after the owner had Docker Desktop installed mid-stage: Docker runs here.**
  `docker --version` → `Docker version 29.8.2, build 7fc2dff`; `docker compose version` →
  `Docker Compose version v5.5.1`; `docker info --format '{{.ServerVersion}}'` → `29.8.2`;
  `Get-LocalGroupMember -Group docker-users` → `PC-PF5JWGSQ\User`. — probes.md, probe 0.
- **A docker-compose PostgreSQL serves queries here.** A two-service-free compose file with a
  `pg_isready` healthcheck came up under `docker compose up -d --wait` (exit 0, status
  `Up 2 seconds (healthy)`), and `psql` inside it returned
  `PostgreSQL 18.6 on x86_64-pc-linux-musl, compiled by gcc (Alpine 15.2.0) 15.2.0, 64-bit`. So the
  deliverable scoping decision 2 names is exercisable on this machine. — probes.md, probe 0.
- **What that does not establish**, and what therefore stays open: whether the engine is available
  without the Docker Desktop GUI being launched first (it was not up until the app was started),
  whether it survives a reboot unattended, anything about resource limits, and anything at all about
  CI — `.github/workflows/ci.yml` still declares no service container (see the CI section above).
- A real PostgreSQL 18.4 was also started on this machine **without** Docker, from the
  `embedded-postgres` npm package, and served every query in probe 5. — probes.md, probe 5.

### Prisma under `apps/api`'s ESM + NodeNext configuration

- `npm install prisma @prisma/client` today installs **mismatched majors**: `prisma@8.0.0-rc.20` and
  `@prisma/client@7.10.0`, because npm's `latest` dist-tag for `prisma` points at a release
  candidate. — probes.md, probe 1a.
- **Prisma 7 rejects `url` inside the `datasource` block** with `P1012`: "The datasource property
  `url` is no longer supported in schema files." A `prisma.config.ts` plus a driver adapter passed to
  `new PrismaClient({ adapter })` is what the CLI accepts instead. — probes.md, probe 1b.
- The `prisma-client` generator, **configured with `output` and `moduleFormat = "esm"` only**, emits
  TypeScript source whose internal imports carry a `.ts` extension
  (`import * as $Enums from "./enums.ts"` — grep over the generated `client.ts`). **A consumer file
  importing that output through an explicit `.ts` specifier fails** under a tsconfig copied
  field-for-field from `packages/tsconfig/base.json` + `nestjs.json` with TypeScript `6.0.3`:
  `TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is
enabled.` — probes.md, probe 1c.

  **Narrowed at the `FEAT-G1` review.** The first version of this line concluded the generator is
  unusable here. The `tsc` output it rested on reports both errors against the probe's **own
  consumer file**, not against the generated sources, and the second error (`TS2305`, no exported
  member `MeetingFile`) means the probe's import was simply wrong — the generated name is
  `MeetingFileModel`. So what is evidenced is the sentence above: this import form fails, and the
  generated internals do use `.ts` specifiers. Whether the generator can be configured to emit or
  consume a different specifier was **not tested**, and `prisma validate` cannot be used to
  enumerate its options — it accepted an invented generator key (`bogusOption = "x"`) without
  complaint. Two unknowns recorded below.

- The `prisma-client-js` generator exists in Prisma `7.10.0`, emits into `node_modules/@prisma/client`,
  and **typechecks clean (`exit=0`) under those same settings**, imports under Node ESM in a
  `"type": "module"` package, and imports under `vitest@4.1.2`. That is a statement about `7.10.0`
  **today**; whether it is deprecated or supported going forward was not established, and the CLI
  prints an upgrade banner to `8.0.0-rc.20` on every run. — probes.md, probes 1d, 1e.

### Multipart on this stack

- `multer@2.4.0` and `express@5.2.1` are **already installed in this repository** as transitive
  dependencies of `@nestjs/platform-express` (`pnpm-lock.yaml:3000`), raised from `2.2.0` by
  `overrides: { multer: '>=2.3.0' }` at `pnpm-workspace.yaml:25-26`, whose comment at `:21-24`
  attributes the
  override to two advisories and `pnpm audit`, not to any upload feature. — probes.md, probe 2a.
- `FileInterceptor` works on this stack, and `file.buffer` is a Node `Buffer`
  (`Buffer.isBuffer(...) === true`) with the bytes intact. — probes.md, probe 2c.
- `multer@2.4.0` ships **no typings**; `@types/multer@2.3.0` supplies `Express.Multer.File` as a
  _global augmentation_. Under an explicit `"types"` array that omits it, `tsc` fails with
  `TS2694: Namespace 'global.Express' has no exported member 'Multer'`; adding `"multer"` to the
  array is the only change needed to reach `exit=0`. `apps/api/tsconfig.json:5` pins exactly such an
  explicit array, `"types": ["vitest/globals", "node"]`. — probes.md, probe 2d.

### `ValidationPipe` against a multipart body — answers this sweep's third Open question

Run against a `ValidationPipe` carrying **the repository's exact options**
(`whitelist: true, forbidNonWhitelisted: true, transform: true`, `apps/api/src/app.module.ts:21-24`):

- A numeric DTO field sent over multipart arrives as a **string** and **fails** `@IsInt`/`@Min`/`@Max`,
  giving a 400 with three messages — while the identical payload sent as JSON gives 200 with a real
  `number`. — probes.md, probe 3a.
- `@IsOptional()` behaves over multipart as invariant 2 requires: an omitted field gives 200, not 400. — probes.md, probe 3b.
- `forbidNonWhitelisted` fires over multipart, producing
  `{"message":["property ownerId should not exist"],"error":"Bad Request","statusCode":400}` — the
  body documented at `FACT-2013`. — probes.md, probe 3c.
- Multiple messages accumulate in the `message`-array shape of `FACT-2012` and invariant 8. The 400
  body over multipart is byte-compatible with the JSON one already documented. — probes.md, probe 3d.
- Two coercion routes were measured and both make the field validate —
  `transformOptions: { enableImplicitConversion: true }` on the pipe, or `@Type(() => Number)` on the
  field. Under implicit conversion the out-of-range case produces **one** message instead of three,
  i.e. it changes the 400 body that `FACT-2012`'s shape and the api cases assert. Choosing between
  them is design and is not done here. — probes.md, probe 3e.

### Next Server Action body limit — answers this sweep's second Open question

- The default is **exactly 1 MB**, read from the installed package:
  `apps/web/node_modules/next/dist/esm/server/app-render/action-handler.js:490-493`
  (`const defaultBodySizeLimit = '1 MB'; … : 1024 * 1024 // 1 MB`). `apps/web` has Next `16.3.6` and
  `next.config.ts` carries no `experimental.serverActions` block, so the default applies.
- Exceeding it throws `new ApiError(413, "Body exceeded 1 MB limit.\n…")` with `__NEXT_ERROR_CODE`
  `"E394"`, at `action-handler.js:521` and `:613`, enforced by a streaming transform rather than
  after buffering. The option is still read from `experimental.serverActions.bodySizeLimit`
  (`next/dist/server/config.js:699-706`). — probes.md, probe 4.
- **Still unknown:** what the browser and `useActionState` actually receive for that 413. Not probed —
  reason recorded in probes.md, probe 4.

### Prisma `Bytes`

- `Bytes` becomes a PostgreSQL **`bytea`** column; `DateTime` becomes
  `timestamp without time zone`, not `timestamptz`. — probes.md, probe 5b.
- A 1 MiB `Buffer` round-trips **byte-identical** (SHA-256 matches), but comes back as a plain
  `Uint8Array`: `Buffer.isBuffer(row.content)` is `false`. The declared type is `runtime.Bytes`,
  defined at `@prisma/client/runtime/client.d.ts:183` as `ReturnType<Uint8Array['slice']>`. —
  probes.md, probe 5c.
- `JSON.stringify` of such a value yields `{"content":{"0":1,"1":2,"2":3}}` — an index-keyed object,
  not an array and not base64. That is what a controller returning the entity directly would emit. —
  probes.md, probe 5d.
- Selecting metadata without `content` works, and `onDelete: Cascade` deletes the file rows with the
  meeting. — probes.md, probe 5e.
- A `DateTime` field returns a JS `Date`. The repository stores `startsAt` as an ISO **string**
  (`FACT-1008`). The conversion point is recorded, not resolved. — probes.md, probe 5f.
- `prisma db push` no longer accepts `--skip-generate` in Prisma 7. — probes.md, probe 5a.

### Playwright and a pre-server dependency

- `playwright.config.ts` has exactly two `webServer` entries and **no** `globalSetup` or
  `globalTeardown` key.
- The installed `playwright@1.62.1` constructs one `WebServerPlugin` per entry
  (`lib/runner/index.js:986-1000`), creates one setup task per plugin in order (`:6039-6047`), and
  awaits them **one at a time, in array order** (`:5827-5836`:
  `for (const task of this._tasks) { … await task.setup?.(…) }`). Each waits for its `url` or throws
  `Timed out waiting ...ms from config.webServer.` (`:940`). So the array is not limited to two and
  the entries are sequential. **Whether that is the right vehicle here is design and is not
  answered.** — probes.md, probe 6.

### A Prisma-backed service under Vitest with no database

- Importing `@prisma/client` and constructing the client **succeed** under `vitest@4.1.2` with
  nothing listening; the connection is only attempted at the first query.
- A service method that reaches Prisma rejects with `PrismaClientKnownRequestError`, code **`P1001`**.
- **Not probed:** whether a Prisma client can be faked in a Vitest unit (`vi.mock`, an in-memory
  adapter). No such pattern exists in the repository to test against. — probes.md, probe 7.
