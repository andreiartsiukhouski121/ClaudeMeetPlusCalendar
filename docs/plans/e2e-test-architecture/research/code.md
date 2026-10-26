# Code sweep — e2e-test-architecture (FEAT-S1)

The sweep converged after about 45 files: the last four searches (importers, `storageState`, locks, routes) returned no new files.

> **Re-run after the research review (2026-10-21, `researcher`, no sub-dispatch).** Every `path:line` in this file was re-opened against HEAD `548195c` and re-pointed where it was wrong (`auth.api.ts`, `cleanup.api.ts`, `warm-up.ts`, `session-cookie.ts`, `dal.ts`, `proxy.ts`, `auth.fixture.ts:8-12`, `auth.controller.ts`, `auth.config.ts`). Two statements were added from the files (`auth.api.ts:17`, `auth.fixture.ts:32-34`), and the `'ps_session'` constant count went from three specs to four.

## 1. The session cookie (what a test would have to reproduce)

- **Name:** `export const SESSION_COOKIE_NAME = 'ps_session';` — `apps/web/src/lib/session-cookie.ts:10`.
- **Attributes:** `buildSessionCookieOptions` returns `httpOnly: true`, `sameSite: 'lax'`, `path: '/'`, `maxAge: SESSION_MAX_AGE_SECONDS` (3600), `secure: nodeEnv === 'production'` — `session-cookie.ts:34-41`; `SESSION_MAX_AGE_SECONDS = 60 * 60` at `:17`. No `domain` is passed.
- **Value:** the raw Nest JWT, no wrapper — `apps/web/src/lib/session.ts:7` ("The cookie holds the **raw JWT** from Nest with no extra wrapper: it is HS256-signed"). Set by `cookieStore.set(SESSION_COOKIE_NAME, token, buildSessionCookieOptions(process.env.NODE_ENV))` — `session.ts:21`. `session.ts` reads no web-side secret.
- **Who sets it:** only `createSession(result.accessToken)` inside `loginAction`, after `apiFetch('/auth/login', { method: 'POST', body: { email, password } })` — `apps/web/src/lib/actions/auth.ts:45-49`; then `redirect('/')` at `:65`.
- **How the web app reads/validates it:** `readSessionToken()` returns `cookieStore.get(SESSION_COOKIE_NAME)?.value` (`session.ts:24-27`). `lib/dal.ts` passes it as `token` to `apiFetch('/auth/me', { token })` (`dal.ts:46`, inside `getCurrentUser` at `:40`), `getMeetings` (`:71`, call at `:77`), `getMeetingById` (`:103`, call at `:110`), `getMeetingFiles` (`:139`, call at `:146`). A 401 redirects to `SESSION_RESET_PATH` (defined `'/auth/session-expired'` at `dal.ts:25`; `redirect(SESSION_RESET_PATH)` at `:58,86,128,164`). Validation is Nest's (`session.ts:9-10`: "Nest itself confirms the token on `GET /auth/me`").
- **proxy.ts:** checks only existence — `request.cookies.has(SESSION_COOKIE_NAME)` (`apps/web/src/proxy.ts:18`); matcher `['/', '/auth/login', '/meetings/:path*']` (`:48`). With a cookie, GET `/auth/login` redirects to `/` (`:37-39`).
- **`/auth/session-expired`:** Route Handler `GET` → `destroySession()` (`cookieStore.delete`, `session.ts:29-32`) → `redirect('/auth/login')` — `apps/web/src/app/auth/session-expired/route.ts:22-26`.
- **Corpus:** `FACT-0024` (`docs/architecture.md:138`: "`ps_session`, httpOnly, holding the JWT Nest signed"); `FACT-1029` (`docs/data-model.md:140`: expires after 1 h).
- **The fixture's stated reason for UI login:** `e2e/fixtures/auth.fixture.ts:8-12`: "the session cookie is httpOnly and set by a Server Action, so the browser never sees the JWT from Nest. Hence we log in through the UI rather than forging a cookie — building one by hand would duplicate production session logic and go red or green at the wrong moments." Measured comparison: probes P1.

## 2. The API login path

- `@Post('login') @HttpCode(HttpStatus.OK) login(@Body() dto: LoginDto)` — `apps/api/src/auth/auth.controller.ts:31-34`.
- Body: `return { accessToken, user: toPublicUser(user) }` — `apps/api/src/auth/auth.service.ts:57-59`; `accessToken: string` at `auth.types.ts:23`. Token payload `{ sub: user.id, email: user.email }` (`auth.service.ts:57`).
- Lifetime: default `'1h'` — `apps/api/src/config/auth.config.ts:13`, overridable by `process.env.JWT_EXPIRES_IN` (`:35`); `JwtModule.register({ secret: jwtSecret, signOptions: { expiresIn } })` (`auth.module.ts:24`). Secret: `process.env.JWT_SECRET`, dev fallback `'purpleschool-dev-secret'` (`auth.config.ts:12,23,34`); the e2e api is started with `JWT_SECRET: 'e2e-secret'` (`playwright.config.ts`, api `webServer.env`).
- `POST /auth/login` runs scrypt, per `e2e/fixtures/auth.api.ts:10-11`. The existing per-worker token cache is `const tokenCache = new Map<SeedUserKey, string>()` (`auth.api.ts:19`).
- `auth.api.ts:17`: "Tokens do not expire mid-run: JWT_EXPIRES_IN is '1h' against a 60 s test timeout."

## 3. `e2e/fixtures/**`

| File                       | Exports                                                                                                                                                                                                                         | Importers (grep over `e2e/` and `playwright.config.ts`)                                                                                                                                           |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth.fixture.ts` (124 l.) | `test` (adds option `authUser`, worker fixture `authStateFor`, test fixture `authedPage`), `expect`                                                                                                                             | `accessibility.functional`, `home-dashboard.functional`, `meeting-files.functional`, `security.functional` specs                                                                                  |
| `auth.api.ts` (69)         | `loginApi`, `authHeaders`, `authHeadersFor`                                                                                                                                                                                     | `auth-login.api`, `home-dashboard.api`, `home-dashboard.functional`, `meeting-files.api`, `meeting-files.functional`, `meetings-detail.api`, `security.api`, `smoke/seed.api` specs; `warm-up.ts` |
| `api.ts` (66)              | `ApiOptions` type, `isNestRequest`, `test` (option `apiBaseURL`, fixture `apiRequest`), `expect`                                                                                                                                | `home-dashboard.functional`, `meeting-files.functional`, `security.functional`; `playwright.config.ts` (type only)                                                                                |
| `cleanup.api.ts` (100)     | `ErrorBody`, `MEETING_NOT_FOUND_BODY`, `FILE_NOT_FOUND_BODY`, `Track`, `withCleanup`                                                                                                                                            | `home-dashboard.api`, `meeting-files.api`, `meetings-detail.api`, `security.api` specs                                                                                                            |
| `seed.ts` (182)            | `SeedUserKey`, `SeedUser`, `SEED_USERS`, `SEED_USER_KEYS`, `TEACHER_MEETINGS`, `PLANNER_MEETING_PARTICIPANTS`, `ORGANIZER_MEETING_PARTICIPANTS`, title/id/file constants, `HEADER_SAFETY_MEETING`, `FUTURE_STARTS_AT_ISO/LOCAL` | 11 specs (every feature spec, security, smoke)                                                                                                                                                    |
| `console.ts` (42)          | `isDevServerNoise`, `collectConsoleProblems`                                                                                                                                                                                    | `auth-login.functional`, `home-dashboard.functional`, `meeting-files.functional`                                                                                                                  |
| `multipart.ts` (65)        | `MultipartField`, `buildMultipartBody`                                                                                                                                                                                          | `meeting-files.api`, `security.api`                                                                                                                                                               |
| `warm-up.ts` (138)         | default `warmUp` (globalSetup)                                                                                                                                                                                                  | `playwright.config.ts` only                                                                                                                                                                       |

- `auth.fixture.ts`: the `authStateFor` worker fixture logs in once per worker per user via `uiLogin` (fills the form, clicks `Sign in`, expects URL `/`) and writes `auth-state-w<workerIndex>-<user>.json` into the project `outputDir` (`:36-41, 52-83, 90-106`); `authedPage` does `browser.newContext({ storageState })` per test (`:111-121`). `authUser` defaults to `'teacher'` (`:109`). Why option/function scoping: `:16-29`. On the state file's lifetime, `:32-34`: "The state file lives in the project's `outputDir`: it is wiped between runs anyway and needs no separate `.gitignore` line."
- `cleanup.api.ts`: `withCleanup(request, headers, steps)` runs the steps, then deletes tracked paths in reverse registration order, tolerating a 404 only with the exact named body (`:62-100`; the per-path delete is `deleteTracked` at `:37`). Its header says it is for "`*.api.spec.ts` cases that create meetings" (`:4`); its importers are `.api` specs only.
- `warm-up.ts`: a real browser login as `teacher` (`:102-106`); comment: "a real session lets every protected route execute its own handler instead of being bounced by `proxy.ts`" (`:19-20`). It mentions "up to 14 workers" (`:10`).
- UI login clicks outside the fixture: `accessibility.functional.spec.ts:80`, `home-dashboard.functional.spec.ts:115`, `meeting-files.functional.spec.ts:358`. Counts of `authUser|authedPage` hits: accessibility 18, home-dashboard 97, meeting-files 97, security 13.
- `'ps_session'` is re-declared as a constant in four specs: `auth-login.functional.spec.ts:26`, `home-dashboard.functional.spec.ts:35`, `meeting-files.functional.spec.ts:46`, `security.functional.spec.ts:28` (the first pass listed three; the re-run's `grep -rn "'ps_session'" --include=*.spec.ts e2e` returns four).

## 4. `playwright.config.ts`

- `fullyParallel: true` (`:28`), `retries: isCI ? 2 : 0` (`:30`), `workers: isCI ? 1 : undefined` (`:31`), `timeout: 60_000` (`:33`), `expect.timeout: 10_000` (`:34`).
- `globalSetup: './e2e/fixtures/warm-up.ts'` (`:51`; BL-058 comment at `:49-50`).
- Projects (`:63-73`): `api` (`/.*\.api\.spec\.ts$/`, baseURL `:3101`), `web` (`/.*\.functional\.spec\.ts$/`, Desktop Chrome, baseURL `:3100`), `integration` (`/.*\.integration\.spec\.ts$/`, baseURL `:3101`).
- `webServer`: web `pnpm dev --port <WEB_PORT>` in `apps/web`, `env: { API_URL }`, `reuseExistingServer: !isCI`; api `pnpm start:e2e` in `apps/api`, env `PORT`, `JWT_SECRET: 'e2e-secret'`, `DATABASE_URL=…/purpleschool_e2e`, `reuseExistingServer: false`.
- `use.apiBaseURL: API_URL`, `trace: 'on-first-retry'`.
- `storageState`: not in the config. In `e2e/` it appears only as `test.use({ storageState: undefined })` — `auth-login.functional.spec.ts:50`, `home-dashboard.functional.spec.ts:89`, `meeting-files.functional.spec.ts:291`, `security.functional.spec.ts:157` — and the fixture's `browser.newContext({ storageState })` (`auth.fixture.ts:113`).

## 5. The seed

- Users (`apps/api/src/users/users.seed.ts:29-60`, mirrored at `e2e/fixtures/seed.ts:32-67`), one password `Passw0rd!`: `teacher` (5 meetings, never mutated, `seed.ts:30`), `student` (0, never mutated), `planner` (2; mutation sandbox for `*.api.spec.ts`, `seed.ts:45`), `organizer` (1; sandbox for `*.functional.spec.ts`, `seed.ts:53`), `eraser` (0; `HD-API-23` only, `seed.ts:60`). Five users in total.
- Meetings: `mtg-teacher-1…5`, `mtg-planner-1`, `mtg-planner-2`, `mtg-organizer-1` (`apps/api/src/meetings/meetings.seed.ts:21-77`).
- Files: `fil-teacher-3-1`, `-2` on `mtg-teacher-3`; `fil-planner-2-1…5` on `mtg-planner-2` (`apps/api/src/meeting-files/meeting-files.seed.ts:62-119`).
- Seeding: `db:reset` → `prisma db push` → `db:seed` (`apps/api/package.json:27`); `prisma/seed.ts` upserts users, meetings and files by literal id. `start:e2e` runs `db:reset` on every start (`package.json:14`).
- Drift between `seed.ts` and the api seed is caught by `e2e/smoke/seed.api.spec.ts` (`seed.ts:8`).

## 6. Write routes and their DELETE counterparts

Controllers: `auth.controller.ts`, `meetings.controller.ts`, `meeting-files.controller.ts`, `app.controller.ts`.

| Route                                                         | Creates                                                                                            | Removable via API                                                                         |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `POST /auth/login` (`auth.controller.ts:31`)                  | nothing persisted                                                                                  | n/a                                                                                       |
| `POST /meetings` (`meetings.controller.ts:57`)                | a meeting; `participants?: string[]` is a field of the create DTO (`dto/create-meeting.dto.ts:61`) | `DELETE /meetings/:id` (`:84-85`, 204; `FACT-2128`, `docs/api-contract.md:43`)            |
| `POST /meetings/:id/files` (`meeting-files.controller.ts:63`) | a file row                                                                                         | `DELETE /meetings/:id/files/:fileId` (`:129-130`, 204; `FACT-2129`, `api-contract.md:44`) |

- No `@Patch` or `@Put` appears in any `*.controller.ts` (grep of route decorators). No route creates a user: `apps/web/src/app/auth/register/` is a page, and `auth.controller.ts` has only `login` and `me`. `prisma/schema.prisma` has models `User`, `Meeting`, `MeetingFile` only; participants are a field of the meeting.
- Files go with their meeting: `onDelete: Cascade` on `MeetingFile.meeting` (`apps/api/prisma/schema.prisma:49`) and on `Meeting.owner` (`:34`). Delete is owner-scoped by one `deleteMany({ where: { id, ownerId } })` (`prisma-meeting.repository.ts:50`); a second DELETE, a foreign or an absent id is 404 (`api-contract.md:245,256-257`, `FACT-2124`).

## 7. Existing locks

- **Not found:** a cross-process or file lock — searched `scripts/`, `e2e/`, `apps/api/src`, `apps/api/prisma`, `apps/api/scripts`, root `package.json` for `flock`, `lockfile`, `proper-lockfile`, `mkdirSync`, `openSync(..., 'wx')`. The only `mkdirSync` hits are `scripts/new-change.mjs`, `scripts/save-verdict.mjs`, `scripts/skills-sync.mjs`, `e2e/process/process.api.spec.ts:381-399` (directory creation, not a lock).

## What depends on the area

- Functional specs on `authedPage`/`authUser`: `accessibility`, `home-dashboard`, `meeting-files`, `security` (section 3).
- Specs setting `storageState: undefined` for anonymous cases: four, listed in section 4.
- `seed.ts:25-28` ties the five-user count to `fullyParallel: true` and the mutating `POST /meetings`.
- `warm-up.ts` and `auth.api.ts` are consumed outside specs (globalSetup).

## Not found

- **Not found:** ten seeded users, or a user-creation API — five seed users (section 5); no create-user route (section 6).
- **Not found:** a worker count of 7 anywhere — `workers` is `isCI ? 1 : undefined` in `playwright.config.ts`; grep of `e2e/README.md` for `workers` returned nothing.
- **Not found:** a keyed corpus fact for the cookie's `sameSite`, `path` and `maxAge` — `grep ps_session` over `docs/data-model.md`, `docs/api-contract.md`, `docs/architecture.md` found `FACT-1029`, `FACT-0024` and an unkeyed flow line at `docs/data-model.md:213`.
- **Not found:** a helper layer in `e2e/` other than `e2e/fixtures/` — `ls e2e`, `ls e2e/fixtures`.
