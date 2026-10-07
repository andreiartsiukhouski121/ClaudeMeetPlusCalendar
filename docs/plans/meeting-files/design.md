# Design: meeting-files

> The shape of the change, written from the accepted `research/` folder. **Not a plan**: no tasks,
> no order of work, no file list. Every load-bearing statement below traces to `research/`, to the
> corpus, or to a source file read to confirm a cited claim.

## 1. What the research established

The findings this design rests on, as links. The research is not restated here.

| What it settles                                                                                                                                   | Where                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| The store is in-memory in four corpus places; `ADR-0007` accepted, never superseded                                                               | [`README.md` C1](research/README.md), [`code.md`](research/code.md)                                            |
| Docker and a compose PostgreSQL work here; `up -d --wait` blocks on the healthcheck                                                               | [probe 0](research/probes.md)                                                                                  |
| The generator fork: `prisma-client-js` green, `prisma-client` `TS5097` with options untested; Prisma 7 rejects `url`; npm's `latest` is an 8.x RC | [probe 1](research/probes.md)                                                                                  |
| `Bytes` → `bytea`, byte-identical, returns `Uint8Array`, `JSON.stringify` index-keyed, cascade works, `DateTime` → `timestamp without time zone`  | [probe 5](research/probes.md)                                                                                  |
| `FileInterceptor` works, `file.buffer` is a `Buffer`, `@types/multer` needs the `types` entry                                                     | [probe 2](research/probes.md)                                                                                  |
| C5: a numeric field over multipart 400s; `enableImplicitConversion` rewrites the 400 body                                                         | [probe 3](research/probes.md), [C5](research/README.md)                                                        |
| Next's Server Action limit is exactly 1 MB; its client-side 413 surface is unknown                                                                | [probe 4](research/probes.md)                                                                                  |
| No upload surface, no non-JSON body, no `413`/`415`, nothing on uploads in `security.md`                                                          | [`code.md`](research/code.md), [`tests.md` §11](research/tests.md), [`contract.md` §6–7](research/contract.md) |
| No meeting detail page; `api-client.ts` is JSON-only; one non-page BFF response exists                                                            | [`code.md`](research/code.md)                                                                                  |
| `SEC-API-10` rejects a committed `.env`; CI has no `services:`, both jobs `ubuntu-latest`                                                         | [`tests.md` §1](research/tests.md), [`code.md`](research/code.md)                                              |
| Isolation rests on the restart; a reset endpoint is already refused                                                                               | [Still unknown 12](research/README.md), [`contract.md` §3d](research/contract.md)                              |
| Prisma under Vitest: construction succeeds, a query rejects `P1001`, no mocking pattern                                                           | [probe 7](research/probes.md)                                                                                  |
| `embedded-postgres` ran a real PostgreSQL here with no Docker                                                                                     | [probes 0e and 5](research/probes.md)                                                                          |
| The affected `FACT-` keys split four ways, and the table is not provably complete                                                                 | [`contract.md` §3](research/contract.md)                                                                       |

Read from installed source while writing this, because the exact bodies must come from the framework
rather than memory (invariants 1 and 8): `@nestjs/common/exceptions/http.exception.js` —
`createBody` with a string or array first argument yields `{ message, error, statusCode }`;
`validation.pipe.js:36` — `forbidUnknownValues: false` is hard-coded ahead of the caller's options;
`payload-too-large.exception.js` / `unsupported-media-type.exception.js` — the default `error`
strings; `@nestjs/platform-express/multer/multer/multer.utils.js` and `multer.constants.js` —
`LIMIT_FILE_SIZE` → `PayloadTooLargeException('File too large')`, `LIMIT_UNEXPECTED_FILE` →
`BadRequestException('Unexpected field - <field>')`, a **string** message.

## 2. The shape

### Infrastructure

`docker-compose.yml` at the repository root: one service `db`, `postgres:18-alpine`, host port
`5433`, a `pg_isready` healthcheck, a named volume. Two databases on it — `purpleschool` for
development, `purpleschool_e2e` for the suite (`FACT-3573`), so a `pnpm dev` session and a
Playwright run never share rows.

`DATABASE_URL` reaches the API through `process.env` only (`FACT-3574`). A new
`apps/api/src/config/database.config.ts` mirrors `auth.config.ts` field for field: read the
variable, fall back to the compose service's development URL, `Logger.warn` when it falls back. No
`.env`, no `dotenv`, no `@nestjs/config` — the shape `SEC-API-10` permits and the one the API
already uses for its only other secret. `apps/api/.env.example` documents `DATABASE_URL`;
`*.env.example` is the exempt form.

The container comes up from `apps/api`'s own scripts: `db:up`
(`docker compose -f ../../docker-compose.yml up -d --wait` — the compose file sits at the root
because it is infrastructure for the repository, and the script that starts it sits with the only
package that needs it), `db:push`, `db:seed`, `db:reset` (`db:up` + `db push --force-reset` +
`db:seed`), `dev` (`db:up` then `nest start --watch`), and `start:e2e` (`db:reset` then
`nest start`). `playwright.config.ts`'s **api** `webServer` entry runs `pnpm start:e2e` and adds
`DATABASE_URL` to the `env` block beside the `JWT_SECRET` it already carries; its timeout rises from
120 s to 180 s. Because `webServer` entries are awaited in order until their url answers
([probe 6](research/probes.md)), every `pnpm e2e*` script — and CI's `pnpm e2e` — gets a reset,
seeded database with no further plumbing. **`db:reset` refuses to run unless `DATABASE_URL` is set
explicitly**, so it can never force-reset the development database by accident.

**`prisma generate` is a script prefix, not an install hook.** `apps/api` defines `prisma:generate`
once, and every script in that package that lints, type-checks, compiles or runs TypeScript begins
with `pnpm prisma:generate &&`: `lint`, `typecheck`, `build`, `test`, `test:e2e`, `dev`,
`start:e2e`. **It is not free, and an earlier draft of this design said it was.** The generator
itself is 59–168 ms, but the _process_ around it is about **2.0 s warm**, and `pnpm verify` invokes
the prefix roughly five times: **about +10 s on 66 s, near 15%.** That is not noise, it is a cost
somebody will notice, and what it buys is that the API's types are correct at every point they are
read — by `tsc`, by ESLint's type-aware rules, by Vitest and by `nest build` — without any of them
depending on a generation step that happened at some unknown earlier time. The alternative is not
"free": it is a hook whose having-run is invisible at the moment it matters.

**No `postinstall` anywhere, and nothing in `pnpm-workspace.yaml` has to change _for this_.** Its
`ignoredBuiltDependencies` list is read here only as evidence that this repository already declines
to run dependency build scripts; the generate prefix neither adds to that list nor relies on it. That
is a statement about the build-scripts policy and **not** a claim that the file is untouched by the
change as a whole: four new dependencies arrive with their own transitive trees, `pnpm audit
--audit-level high` is an acceptance blocker, and this repository's established answer to a
transitive advisory with no patched release is an `overrides:` entry with the reason in a comment
above it — `FX-029` and `BL-018` are that shape already. Under pnpm 10 the
install prints `Ignored build scripts: @prisma/engines@7.10.0, prisma@7.10.0` — a warning, not a
failure: the CLI fetches its own schema engine on first use (about 21 s, and it needs network), so
the workspace file stays exactly as it is. Making the precondition visible at each point where it
_is_ a precondition depends on nothing and is what the paragraph below rests on.

**Why the prefix is reached at all** is the load-bearing part: root `eslint.config.mjs:10-16`
ignores `apps/**` and root `tsconfig.json:13` excludes `apps`, so `pnpm lint` and `pnpm typecheck`
reach `apps/api` **only** through their `pnpm -r` half — which is where the prefix lives. Nothing
here depends on pnpm 10's lifecycle-script policy, and nothing depends on the root scripts changing.

**With that, CI needs no change — step by step:** `pnpm install --frozen-lockfile` (`ci.yml:55`, and
again at `:127` in the `build` job) needs no hook; `pnpm lint` (`:77`) and `pnpm typecheck` (`:80`)
generate first through `pnpm -r`; `pnpm test` (`:83`) and
`pnpm --filter @purpleschool/api test:e2e` (`:86`) generate first and reach no database; `pnpm e2e`
(`:93`) goes through the api `webServer`, which runs `start:e2e`, which brings the container up —
and `prisma db push` generates on its own in Prisma 7, which no longer accepts `--skip-generate`
([probe 5a](research/probes.md)); `pnpm build` → `nest build` (`:133`) generates first. The one
unproven link is Docker on `ubuntu-latest`, which §8 keeps as an open question rather than a claim.

### `apps/api`

- **New** `src/prisma/`: `PrismaModule` + `PrismaService extends PrismaClient`, constructed with a
  `@prisma/adapter-pg` driver adapter from `database.config.ts`. **No `$connect()`, no
  `OnModuleInit`, no `enableShutdownHooks()`** (`FACT-3581`) — the connection opens at the first
  query. The unit half of what that buys is measured ([probe 7](research/probes.md)); that
  `apps/api/test/app.e2e-spec.ts` still boots `AppModule` through Nest DI and exits cleanly with an
  undisposed adapter pool is an **inference**, and §8 carries it as one.
- **New** `prisma/schema.prisma` (no `url` in `datasource`), `prisma.config.ts`, `prisma/seed.ts`.
  **How the seed is invoked is a decision, not a detail** (`FACT-3643`): `db:seed` is plain
  `node prisma/seed.ts`, and because every relative import in `apps/api` carries a `.js` extension
  while the file on disk is `.ts` — a convention `tsc`, Vitest and `nest build` all follow and plain
  Node does not — the seed registers a narrow `node:module` resolve hook **on itself** before
  importing anything, redirecting a relative `.js` specifier to its sibling `.ts` when one exists.
  Three alternatives were weighed and rejected in `ADR-0028`: `tsx` (`FACT-3644`), plain `.ts`
  specifiers in the seed (`FACT-3645` — `TS5097`, and `prisma/**/*` is now type-checked), and running
  the seed from the compiled build (`FACT-3646`). The sharp edge belongs in this design too, because
  it is where a reviewer looks: **a static `import` added above the `register()` call is hoisted,
  runs before the hook exists, and fails with `ERR_MODULE_NOT_FOUND`** — which reads like a missing
  file rather than a broken contract. The imports after the registration are dynamic for that
  reason, and must stay so.
- **Changed** `UsersService`, `MeetingsService`: same public method names and signatures
  (`findByEmail`, `findById`, `findRecent`, `countByOwner`, `create`), bodies become Prisma queries,
  constructors stop seeding and stop holding `Map`s. **`normalizeEmail` moves to a module of its own
  that carries no decorator**, and `auth.service.ts`, `users.service.ts` and `prisma/seed.ts` all
  import it from there. The decorator matters: `@Injectable()` is not erasable syntax, so Node's
  type-stripping throws on `users.service.ts` and the seed cannot reach the function while it lives
  in that file — which is why the seed currently carries its own two-line copy. **That copy is the
  completion condition for the extraction, not a tidy-up for later:** the extraction is not done
  while two `trim().toLowerCase()` bodies exist in the tree, and a reviewer finding both should read
  the task as unfinished. A second copy of one rule is what `FX-023` and `FX-027` are both entries
  about; sorting moves into `orderBy: [{ startsAt: 'desc' }, { id: 'asc' }]` (invariant 7);
  `countByOwner` becomes `prisma.meeting.count({ where: { ownerId } })` (invariant 4).
- **Unchanged**: `AuthService`, `TokenService`, `JwtAuthGuard`, `PasswordService`,
  `common/crypto/password.ts`, `toPublicUser`, `toMeetingDto`, every DTO, `app.module.ts`'s
  `APP_PIPE` registration and its exact options (invariant 3), `main.ts`.
- **New module** `src/meeting-files/`: `MeetingFilesController` (`@Controller('meetings')`),
  `MeetingFilesService`, `dto/`, `meeting-file.types.ts`, `meeting-files.mapper.ts`,
  `meeting-files.seed.ts`, and a pure `meeting-files.rules.ts` holding the filename and
  content-type predicates. It imports `AuthModule`, `PrismaModule` and `MeetingsModule`, and
  resolves ownership through the existing `MeetingsService.findById(ownerId, id)` so the rule lives
  in one place.
- **Dependencies** of `apps/api`: `prisma`, `@prisma/client` and `@prisma/adapter-pg` pinned to the
  exact `7.10.0` (the adapter tracks the client), plus `pg` as a runtime dependency — a new package
  that `pnpm audit --audit-level high` now covers on every `pnpm verify`. `@types/multer` as a
  devDependency, with `"multer"` added to `apps/api/tsconfig.json`'s `types` array — the only change
  probe 2d needed to reach `exit=0`. That file also gains `"prisma/**/*"` in `include`: the existing
  `["src/**/*", "test/**/*", "*.ts"]` matched top-level `.ts` files only, so **nothing nested outside
  `src/` and `test/` was ever type-checked**. That is a pre-existing hole, not one this change
  introduces — but this change is what makes it bite, and §7 says what to do about it.

### `apps/web`

- **New page** `src/app/meetings/[id]/page.tsx` — a server component. The shell is the one
  `src/app/page.tsx` already uses (`ADR-0026`): nav rail, `max-w-7xl` main column, `gap-8` between
  sections.
- **New DAL functions** `getMeetingById(id)` and `getMeetingFiles(id)` in `lib/dal.ts`, each
  repeating the session check and redirecting to `SESSION_RESET_PATH` on 401 (invariants 10, 17); a
  404 from Nest becomes Next's `notFound()`.
- **New Server Action** `uploadMeetingFileAction` in `lib/actions/meeting-files.ts` — `'use server'`,
  async exports only (invariant 13), `redirect()` outside `try/catch` (invariant 11). The meeting id
  arrives as a **bound** argument (`.bind(null, meetingId)`), not as a hidden form field, so the
  client cannot substitute it; if binding does not compose with `useActionState`, the fallback is a
  hidden field plus the server-side ownership check, which is already a 404 branch. It repeats the
  session check **inside the action** and redirects to `/auth/session-expired` when the token is
  absent or Nest answers 401 — invariant 10, the pattern at
  `apps/web/src/lib/actions/meetings.ts:17-19,27-31`.
  **It shows Nest's message verbatim, and that is a decision rather than the path of least
  resistance.** `createMeetingAction` rewrites every failure into one of two generic strings because
  its 400 is a `ValidationPipe` array about a title and a date, which says nothing a user can act on.
  Here the opposite is true: §3 gives a specific, actionable sentence for every case a user can
  reach, and replacing them with "Could not upload the file" would throw away the only information
  the user needs. So `failure.message` — already normalized out of both Nest shapes by
  `ApiError.fromBody` — goes into the form's one `role="alert"` paragraph as it arrives, with
  **exactly one substitution: a 413**, where the action shows "That file is larger than the 1 MiB
  limit" instead. That exception is mechanical (one status) and principled: the 413 body is the one
  §3 deliberately let the framework author (`FACT-3629`), so "File too large" is the one message we
  did not write and the only one that names no limit. A 401 still redirects; anything that is not an
  `ApiError` is still rethrown to the error boundary rather than disguised as a validation failure.
  **The bar this sets, which the next person adding an error body to these routes inherits:** every
  message on these three routes is UI copy, and must be a sentence someone can act on rather than
  contract shorthand.
- **New Route Handler** `src/app/meetings/[id]/files/[fileId]/route.ts` — the second non-page
  response from the BFF, after `auth/session-expired/route.ts`. It reads the session token
  server-side and calls Nest; the browser never reaches Nest (`ADR-0002`) and the token never
  reaches a client component (invariant 19). Its own response, exactly, because these bytes are
  served from the application's own origin and the headers are the security control: on **200** the
  body is Nest's body streamed through with `Content-Type`, `Content-Length` and
  `Content-Disposition` forwarded, and `X-Content-Type-Options: nosniff` plus
  `Cache-Control: private, no-store` **set here** rather than relayed, so they are guaranteed at the
  origin that actually serves them. On **401**, `redirect('/auth/session-expired')` (invariant 17).
  On **404**, `new Response(null, { status: 404 })` — a bare status, since a stale link needs no
  payload. Anything else is rethrown to the error boundary rather than disguised. The whole shape is
  `lib/dal.ts:44-59` transplanted, and that includes **invariant 11**: classifying the `ApiError`
  needs a `try/catch`, the `catch` narrows and rethrows anything that is not a 401, and
  `redirect('/auth/session-expired')` is called **after** the block and outside it. `redirect()`
  works by throwing `NEXT_REDIRECT`; called inside the `try`, its own `catch` swallows it and the
  download silently returns nothing. This is the invariant with a prior incident, so it is stated
  here rather than left to the implementer.
- **Changed** `lib/api-client.ts`: a **second** exported function for a multipart body (no
  `Content-Type` header, so `fetch` sets the boundary; same `cache: 'no-store'`, same
  `ApiError.fromBody`). `apiFetch` itself is untouched, so `AL-UT-23…26` still describe it.
- **Changed** `components/meeting-list.tsx`: each item's title becomes a link to
  `/meetings/<id>`. The `ul`/`li` structure and the title text stay, so the accessible name of each
  row is unchanged.
- **Changed** `proxy.ts`, in **two** places, because the matcher alone does nothing: the matcher
  gains `'/meetings/:path*'` (still explicit and narrow, never a catch-all that would fire on
  `_next/static` — invariant 9), **and** a **second, separate branch** beside the one at
  `proxy.ts:21`. Separate, not merged: the existing `!hasSession && pathname === '/'` branch stays
  exactly as it is, and the new one is `!hasSession && request.method === 'GET' && pathname.startsWith('/meetings/')`.
  Folding the two into one condition with a shared `request.method === 'GET'` would silently make the
  `/` gate GET-only too — a behaviour change nothing in the suite would catch, which is why the shape
  is specified rather than described. Without the new branch the page reaches `NextResponse.next()`
  ungated and the `PROTECTED_PAGES` entry promised below would fail. The new branch is **`GET`-only**
  for the reason the comment at `:25-26` already records for the `/auth/login` bounce at `:27-29`:
  the upload Server Action POSTs to `/meetings/<id>`, and redirecting it instead of running it is how
  "login does nothing" happened once already. One mismatch, harmless and worth a sentence:
  `'/meetings/:path*'` matches `/meetings` itself while `startsWith('/meetings/')` does not, so that
  path would run the proxy and fall through — there is no `/meetings` page, so it 404s either way. The check stays optimistic; the real
  one is in the DAL and inside the action (invariant 10).
- **Changed** `next.config.ts`: `experimental.serverActions.bodySizeLimit: '2mb'`.
- **New pure helper** `lib/format-file-size.ts`, unit-testable (no `server-only`, invariant 14).

### HeroUI, tokens and accessible names

Taken from **`heroui-react`**: the `<form>` stays native with `action={formAction}` and
`noValidate`; the submit is `<Button type="submit" isPending={pending}>`, never `onPress`; the file
list stays `ul`/`li`, never `ListBox`; no `isRequired`, no `type="email"`, no `validate`
(invariant 15). Taken from **`design-system`**: `h1` `text-2xl font-bold tracking-tight`, `h2`
`text-lg font-semibold`, metadata `text-sm text-muted`, cards `bg-surface shadow-surface
rounded-2xl` (shadow **or** border, never both), `gap-8` between sections and `gap-4` between cards,
`p-5` card padding, Phosphor `Paperclip` at `size={20} weight="regular" aria-hidden="true"`, and the
accent spent on exactly one thing — the Upload button. No category tint is used; files are not a
category. Taken from **`ui-ux-pro-max`** (searched `--domain ux`): _Empty States_ (a helpful line,
not blank space), _Input Labels_ severity High (a visible `<label>`, never a placeholder as the
label), _Accessibility / Error Messages_ severity High (`role="alert"`). Its _Forms / Error
Placement_ rule asks for per-field errors; this form keeps the repository's single `role="alert"`
paragraph, because changing that is `BL-029` and a behaviour change of its own.

Accessible names the functional cases will address: exactly one `h1`, carrying the meeting title,
**and exactly one `main` landmark** — `ACC-FN-04` asserts both, per page, and now walks this page
because `AUDITED_PAGES` gains it (`accessibility.functional.spec.ts:92-102`). The shell gives one
`main`; stating it is the difference between that being true and being true by luck (`ACC-FN-04`); `h2` "Files"; the list as `ul` with `aria-label="Attachments"`; each row a link whose
accessible name is the filename; the control as `<label for="file">Attachment</label>` over a
**native** `<input id="file" type="file" name="file">`; the submit button named "Upload"; one
`role="alert"` paragraph; a link named "Back to dashboard".

### What deliberately does not change

`AuthService`'s dummy-hash branch and its single 401 message (invariants 6, 18); the error-shape
contract of every existing route; `MeetingDto`'s five keys; the `@HttpCode(HttpStatus.OK)` on login
(invariant 1); `ValidationPipe`'s options; identifier generation (`FACT-2060`); `participants` as
free-form strings (`ADR-0017`); the seed's user set; `security.functional.spec.ts`'s existing
entries; `apps/api/test/app.e2e-spec.ts`.

## 3. Contract

Three new routes, all guarded by `JwtAuthGuard` on the class. All three are added to
`PROTECTED_ROUTES` (invariant 16, enforced by `AR-API-06`) and to the Routes table in
`docs/api-contract.md` (enforced by `AR-API-05`).

| Method | Path                                  | Auth   | Request                                      | Success                             |
| ------ | ------------------------------------- | ------ | -------------------------------------------- | ----------------------------------- |
| `POST` | `/meetings/:id/files`                 | Bearer | `multipart/form-data`, one part named `file` | `201` `MeetingFileDto`              |
| `GET`  | `/meetings/:id/files`                 | Bearer | none                                         | `200` `{ items: MeetingFileDto[] }` |
| `GET`  | `/meetings/:id/files/:fileId/content` | Bearer | none                                         | `200` raw bytes, headers below      |

`POST` answers **201** by Nest's default and carries no `@HttpCode` — invariant 1 is a login-only
rule, and `POST /meetings` already sets this precedent (`FACT-2042`).

The listing body is `{ items }` with **no `total`**: this route has no `limit`, so a count would be
`items.length`, and producing a `total` that way is exactly what invariant 4 exists to forbid.
An object rather than a bare array, so the response can gain a field later.

`MeetingFileDto` — five keys, sorted: `contentType, filename, id, sizeBytes, uploadedAt`. The mapper
lists them explicitly (no rest destructuring) and drops `content` and `meetingId`, the way
`toMeetingDto` drops `ownerId` (`FACT-3626`).

**The download header is built, never interpolated, and no stored name is unrepresentable.**
`SEC-API-11` seeded five hostile names straight through Prisma and proved the invariant holds — no
injected header reached the wire — but it holds for the wrong reason: the controller interpolates the
stored value and **Node's own `setHeader` validator throws** on the forged ones, which is a defence
our code does not own. A different adapter, a `writeHead` with a raw array, or a future sanitiser
that strips-and-continues instead of throwing all lose it, and the 500 it produces is unacceptable by
`SEC-API-02`'s standard and documented nowhere.

**The asymmetry is the finding, and it generalises:** the `filename` column has **more than one
writer**. The upload route validates what it admits (§3's filename rule, still correct, and the 200
on a stored `../../etc/passwd` is right — that row exists only because the seed wrote it directly).
The read path inherited none of that and trusted the value anyway. **A read path validates its own
output; it does not inherit the write path's guarantees** (`FACT-3650`). The next read path added
here is held to the same rule.

**So there is no error case and no new status.** RFC 6266's pairing can represent _every_ byte
sequence, so the answer is always `200` and §3 gains no row — the observed 500 is a defect to remove,
not a status to document. Given the stored `filename`, the header is built in three steps:

1. **`base`** — everything up to and including the last `/` or `\` is dropped; if what remains is
   empty, `.` or `..`, it becomes `file`. A stored path never becomes a filesystem instruction, which
   is the upload path's `basename` applied again at the boundary that emits rather than trusted from
   the boundary that admits.
2. **`filename*=UTF-8''<pct>`** — `base` UTF-8 encoded, then every octet outside RFC 8187's
   `attr-char` set (`A-Za-z0-9` plus ``!#$&+-.^_`|~``) percent-encoded with uppercase
   hex. Lossless, and the parameter a modern client prefers (RFC 6266 §4.3). An
   `encodeURIComponent` that **additionally** escapes `*`, `'`, `(` and `)` satisfies this;
   over-encoding is always valid, under-encoding is not.
3. **`filename="<ascii>"`** — `base` with every character outside `A-Za-z0-9._-` and space replaced
   by `_`, capped at 100 characters, `file` if empty. Deliberately lossy: it is the compatibility
   parameter, it is never preferred when `filename*` is present, and because neither `"` nor `\` can
   survive it, the quoted string cannot terminate early.

The one benign and five hostile rows, which are what the cases assert — all **200**:

| Stored                          | `Content-Disposition`                                                                                      |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `syllabus.pdf`                  | `attachment; filename="syllabus.pdf"; filename*=UTF-8''syllabus.pdf`                                       |
| `report".txt`                   | `attachment; filename="report_.txt"; filename*=UTF-8''report%22.txt`                                       |
| `evidence.log\r\nX-Injected: 1` | `attachment; filename="evidence.log__X-Injected_ 1"; filename*=UTF-8''evidence.log%0D%0AX-Injected%3A%201` |
| `minutes.txt\nSet-Cookie: a=b`  | `attachment; filename="minutes.txt_Set-Cookie_ a_b"; filename*=UTF-8''minutes.txt%0ASet-Cookie%3A%20a%3Db` |
| `../../etc/passwd`              | `attachment; filename="passwd"; filename*=UTF-8''passwd`                                                   |
| `déjà-vu.png`                   | `attachment; filename="d_j_-vu.png"; filename*=UTF-8''d%C3%A9j%C3%A0-vu.png`                               |

**The bare-LF row is kept even though it is redundant against _this_ implementation.** Step 2
encodes every octet outside `attr-char` one at a time, so a lone LF and a CR LF pair take identical
paths and neither can be distinguished by the builder. That is an argument about branch coverage, and
a security case's subject is the **invariant**, not the branches: an implementation that later
replaced the encoder with a sanitiser splitting on `
` would pass the pair and fail the single,
which is the "defence our code does not own" failure recurring in a new form. The row costs one seed
entry and catches that; it stays.

**Both non-security defects are fixed by this same change, not recorded as gaps.** `déjà-vu.png`
arriving as `dýjý-vu.png` is UTF-8 read as latin-1, and `report".txt` truncating at `report` is the
quoted string terminating early; step 2 fixes the first and step 3 the second. Neither reaches
`docs/security.md` as a deliberate gap and neither goes to the backlog — a one-function fix that
closes three symptoms is not a thing to defer.

**Ownership.** The builder is a **pure function in `meeting-files.rules.ts`**, beside the filename
and content-type predicates, so the hostile inputs can be asserted at the unit level where they
belong — the same reachable-versus-defensive split §3 already draws. The function, the controller
using it instead of interpolating, and the removal of the 500 are the **implementer's**.
`SEC-API-11`'s open status resolving to 200 with the three header assertions, and unit cases over the
builder, are the **test designer's**.

**Download response headers** (`FACT-3627`): `Content-Type` = the stored `contentType`;
`Content-Length` = **the length of the buffer actually being sent**, not the stored `sizeBytes` — if
the two ever disagreed, a `Content-Length` taken from the column would truncate the body or hang the
client instead of failing loudly, and `sizeBytes` is only ever written from that same length at
upload; `Content-Disposition: attachment; filename="<filename>"`; `X-Content-Type-Options: nosniff`.
Never `inline` — a stored file must not be able to execute in the application's own origin. The
`Uint8Array` Prisma returns is converted to a `Buffer` at the controller boundary and nowhere else
(`FACT-3628`).

### Exact error bodies

| Situation                                                                               | Code | Body                                                                                                                                                                   |
| --------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| missing or invalid token                                                                | 401  | `{"message":"Authentication required","error":"Unauthorized","statusCode":401}` — `FACT-2015`, unchanged                                                               |
| no such meeting, or owned by another user                                               | 404  | `{"message":"Meeting not found","error":"Not Found","statusCode":404}` — byte-identical to `FACT-2016`, one code path, `ADR-0018`                                      |
| meeting owned, file id unknown or on another meeting                                    | 404  | `{"message":"File not found","error":"Not Found","statusCode":404}`                                                                                                    |
| no `file` part at all                                                                   | 400  | `{"message":["file is required"],"error":"Bad Request","statusCode":400}`                                                                                              |
| a `file` part with no `filename` parameter and `Content-Type: application/octet-stream` | 400  | the same body as above — `multer` discards a file part that has no filename, so `req.file` is undefined                                                                |
| a `file` part with no `filename` parameter and any other content type                   | 400  | `{"message":["property file should not exist"],"error":"Bad Request","statusCode":400}` — `busboy` classifies it as a **field**, and `forbidNonWhitelisted` rejects it |
| filename fails the rule below                                                           | 400  | `{"message":["filename must be 1 to 100 characters of letters, digits, dot, underscore, hyphen or space"],"error":"Bad Request","statusCode":400}`                     |
| any extra text field in the multipart body                                              | 400  | `{"message":["property label should not exist"],"error":"Bad Request","statusCode":400}` — `FACT-2013`'s shape, measured over multipart                                |
| a file part sent under a different field name                                           | 400  | `{"message":"Unexpected field - attachment","error":"Bad Request","statusCode":400}` — **a string**, from `@nestjs/platform-express`                                   |
| file larger than 1 048 576 bytes                                                        | 413  | `{"message":"File too large","error":"Payload Too Large","statusCode":413}` — multer's `LIMIT_FILE_SIZE`, mapped by Nest                                               |
| content type not in the allow-list                                                      | 415  | `{"message":"Unsupported file type: upload a PDF, PNG, JPEG or plain text file","error":"Unsupported Media Type","statusCode":415}`                                    |
| the meeting already held ten files when the upload was checked                          | 400  | `{"message":["a meeting may hold at most 10 files"],"error":"Bad Request","statusCode":400}`                                                                           |

Evaluation order, because it decides which body a request with two faults receives: guard (401) →
file interceptor (413, and the string 400) → `ValidationPipe` (the array 400s for extra fields) →
handler: missing file, then filename, then content type (415), then ownership (404), then the
per-meeting count (400) — a plain count, not a transaction, with the consequence named in §8. A stranger uploading an oversized file therefore gets 413, not 404 — which
leaks nothing, since the answer does not depend on the meeting. The count check is **after** the
ownership check, so the cap cannot be used to probe whether a meeting exists.

**The multipart `ValidationPipe` fork (C5) is resolved by removing the condition, not by coercing.**
The upload DTO declares **no properties at all**, so no numeric or boolean field ever travels over
multipart and the measured coercion failure cannot arise. `whitelist` + `forbidNonWhitelisted` then
turn any text part into the `FACT-2013` body, measured over multipart in probe 3c. The empty DTO works only because
`validation.pipe.js:36` hard-codes `forbidUnknownValues: false` ahead of the caller's options;
class-validator's own default is `true`, under which a class with no decorated properties rejects
every payload and **every upload would 400**. Adding `forbidUnknownValues: true` to the pipe is a
plausible future hardening edit that would break this endpoint and nothing else, so it is written
down here rather than discovered later. The global pipe's options are **not touched**: `enableImplicitConversion` would change the 400 body of
`?limit=` and `durationMinutes` from three messages to one, and `HD-API-*` asserts those bodies.
`@Type(() => Number)` is likewise unnecessary here and is left where it already is.

**Invariant 8 survives; `FACT-2017` does not.** Invariant 8 is already worded "with a 400 from
`ValidationPipe`, `message` is an **array**", which the string-message multer 400 does not
contradict. `FACT-2017`'s looser wording — "`message` is an array on a 400 and a string on a 401 and
on a 404" — becomes false and is retired (§6).

Its successor must be written against **every row above, not against `ValidationPipe` alone**.
Most of this endpoint's 400s carry an array and only one carries a string, and the array ones include
four the handler raises rather than the pipe — missing file, the no-filename field part, the filename
rule and the ten-file refusal:
`http.exception.js:114-119` builds `{ message: [...], error: 'Bad Request', statusCode: 400 }` from
an array argument, which is the same body shape, reached a different way. So the successor says
_except the multipart-limit 400_, not _only the `ValidationPipe` 400_. A statement phrased the
second way would be born false under `ADR-0022`, and the next reader would either call a
handler-thrown array 400 a contract violation or write an assertion against a string.

**These messages are read by users, not only by assertions** — the upload Server Action shows them
verbatim (§2), so the table above is UI copy as well as contract. Two things follow. First, three of
its rows are **unreachable through our own form** and are diagnostics rather than copy: the two
`property … should not exist` bodies and `Unexpected field - …` all describe a request shape our form
cannot produce — it submits exactly one part, named `file`, and no text fields. If one ever reaches a
user, our client is wrong, and that is the right thing for them to see rather than a reassuring
generic. (An empty file input is **not** one of these: it submits a `File` with an empty name, which
`multer` discards, so it lands on "file is required" — invariant 15 working as intended.) Second,
the 415 names the formats it will take rather than only refusing: "unsupported" with no list is the
one message a user cannot act on. That wording change costs a case edit, which is `test-designer`'s
to route.

The filename message stays as it is, which is the row worth defending explicitly: it describes a rule
about **the user's own input** — rename your file — and not about our data, our storage or another
account. That is the line invariant 6 draws for authentication, where an exact message would let
someone enumerate accounts; nothing is enumerable here, and the message that tells a user precisely
how to fix their file is worth more than the nothing an attacker learns from it.

**Filename rule.** The stored filename is `file.originalname`; it must be 1–100 characters matching
`^[A-Za-z0-9](?:[A-Za-z0-9._ -]*[A-Za-z0-9._-])?$`. No path separator, no quote, no control
character — the value is interpolated into a `Content-Disposition` header, and an unchecked one is a
header-injection vector. **What the parser does to that value first matters, and the rule is written
against the decoded form** (`FACT-3648`): `busboy` has already applied `basename()`, so a path is
stripped before our rule sees it and the no-path-separator clause is belt-and-braces rather than the
only defence; `busboy` prefers a percent-decoded RFC 5987 `filename*` over `filename`, so a non-ASCII
name really can arrive and really is refused by the rule below; and `multer` decodes `%0A`, `%0D` and
`%22` **back into a literal newline, carriage return and double quote**. That last one is the whole
point: those three characters can be present, so rejecting them is the actual `Content-Disposition`
injection defence rather than a precaution against something that cannot happen.

**So the separator clause cannot fire over HTTP, and that is confirmed rather than tolerated.**
`busboy`'s `basename` scans from the right and splits on the first separator it finds, treating `\`
(0x5C) exactly like `/` (0x2F) — `utils.js:479-491`. Therefore `../etc/passwd` is stored as
`passwd`, `sub/dir.txt` as `dir.txt` and `a\b.txt` as `b.txt`, all three answering **201**, and the
case asserts the **stored name** rather than claiming our rule removed anything. That is not a
weakening: traversal is neutralised before our code is reached, the stored value is a plain basename,
and the download builds its own `Content-Disposition: attachment`. A name reducing to `.` or `..`
yields the empty string, which `multer` discards, so it lands on "file is required" instead. The
backslash sample can come back to the api level on this evidence.

**Which clauses are reachable over HTTP, and which are defensive at the unit boundary only** — the
two case documents are not in conflict and should not be reconciled by deleting from either:

| Clause                                                            | Over HTTP                                                        |
| ----------------------------------------------------------------- | ---------------------------------------------------------------- |
| quote, CR, LF, other control characters                           | **reachable** — `multer` re-decodes `%22`, `%0D`, `%0A`          |
| non-ASCII                                                         | **reachable** — via a percent-decoded `filename*`                |
| leading space or punctuation, trailing space, over 100 characters | **reachable**                                                    |
| `/` or `\` anywhere                                               | **unreachable** — `basename` ran first                           |
| empty                                                             | **unreachable** — `multer` discards a part with a falsy filename |

The last two stay asserted at the unit level deliberately, and the reason is not symmetry. The
predicate is a module with its own contract, and a rule that holds only because another library
filters the input first fails silently the day that library changes — `preservePath` is a `multer`
option, and anything that ever sets it makes both clauses reachable in the same commit. A rule
described as a defence that cannot fire is how the next reader concludes the whole predicate is
removable; a rule documented as defence-in-depth with a named trigger is not.

**The rule forbids every non-ASCII character, and that is a decision, not
an oversight**: `CH-014` makes this project English-only including its seed and its UI strings, and
the alternative — `filename*=UTF-8''…` percent-encoding, with the ASCII fallback beside it — is
machinery for a case the project has ruled out. A later change that wants non-ASCII filenames
widens the regex and adds the encoded parameter together, or the header breaks.

**Allowed content types**, and **how the comparison is made**, because exact equality against four
literals would reject uploads browsers really send: take `file.mimetype`, cut it at the first `;`,
trim, lower-case — then compare that **media type alone** against `application/pdf`, `image/png`,
`image/jpeg`, `text/plain`. So `application/pdf; charset=utf-8` and `APPLICATION/PDF` are both
accepted; `image/gif`, `application/octet-stream` and `text/html` are refused with the single 415
body in the table above — one message, whatever the reason.

**An absent, empty or unparseable part `Content-Type` is accepted, not refused**, and an earlier
draft of this section had it the other way round. `busboy` initialises a part's type to the literal
`'text/plain'` and overwrites it only when the header is present _and_ parses; `multer` passes that
through untouched (`FACT-3647`). So by the time any rule of ours runs, "declared nothing" and
"declared `text/plain`" are the same value, and no implementation of the rule above can tell them
apart. Reading the raw header before the parser would mean leaving the `FileInterceptor` path this
design chose, to recover a distinction that buys nothing: the client controls the declared type
either way, so anyone wanting `text/plain` simply sends it. **The consequence is worth more than the
distinction was** (`FACT-3649`): at this layer the declared content type is not merely untrusted, it
is _not observable_ — which is exactly why the stored value is normalized to one of four literals and
the download is served `attachment` with `nosniff` instead of trusting what arrived.
**What is stored is the normalized media type, never the client's raw header string.** That is not
tidiness: `FACT-3627` echoes the stored value back as `Content-Type` on download, from this
application's own origin, so storing the normalized form makes that header provably one of four
known values instead of whatever parameters a client chose to attach. The allow-list is a usability
guard, since the part's declared type comes from the client; `attachment` + `nosniff` is the security
control (`FACT-3631`).

**An upload is refused when the meeting
already holds ten files**, so an authenticated user cannot grow the database without bound through a
feature that has no delete: ten times 1 MiB per meeting is a ceiling somebody can reason about, and
an uncapped count is not. The number is a contract value and lives in `docs/api-contract.md`, not in
a comment. The rule is stated as _the upload is refused_ rather than _a meeting holds at most ten_
on purpose: the check is a count followed by an insert, not a transaction, so two uploads in flight
at once can both see nine and leave eleven. §8 carries that as a deliberate omission rather than
letting the contract overclaim a number the implementation does not guarantee.

**File sizes as the user reads them**, because `formatFileSize` renders text a functional case has
to assert and an implementer would otherwise invent. Binary divisors with binary labels, a single
space, no thousands separator and **no `Intl`/locale** — a locale-dependent decimal mark would make
the units and the functional cases depend on the machine, which is the class `timeZone: 'UTC'` is
pinned against (`FACT-1019`):

| `sizeBytes`         | Output                                       | Examples                           |
| ------------------- | -------------------------------------------- | ---------------------------------- |
| 0 … 1023            | the exact integer, a space, `B`, no decimals | `0 B`, `48 B`, `1023 B`            |
| 1024 … 1 048 575    | value ÷ 1024 to **one** decimal, ` KiB`      | `1.0 KiB`, `1.5 KiB`, `1024.0 KiB` |
| 1 048 576 and above | value ÷ 1 048 576 to **one** decimal, ` MiB` | `1.0 MiB`                          |

`KiB`/`MiB` rather than `KB`/`MB` deliberately: the divisor is 1024, the contract's ceiling is
1 048 576 bytes, and this design calls that 1 MiB everywhere else. Labelling a 1024-based division
`MB` would put the UI and the contract 5% apart and invite the question of which one is lying. The
two seeded files therefore read `1.0 KiB` and `48 B`. One output is worth stating because it looks
like a mistake and is not: the top of the KiB band, 1 048 575 bytes, renders as `1024.0 KiB` — one
decimal of 1023.999, rounded. A case asserting the boundary should expect that rather than `1.0 MiB`.

**Web contract.** `GET /meetings/<id>` renders the page; `GET /meetings/<id>/files/<fileId>` is the
BFF Route Handler that streams the download, returning Nest's status unchanged on 404 and
redirecting to `/auth/session-expired` on 401 (invariant 17).

## 4. Data

Schema, with every format named. No `DateTime` column anywhere (`FACT-3582`).

| Entity        | Field             | Column                   | Format                                                        |
| ------------- | ----------------- | ------------------------ | ------------------------------------------------------------- |
| `User`        | `id`              | `text` PK                | `usr-<slug>`, issued by the seed                              |
|               | `email`           | `text` unique            | normalized lower-case                                         |
|               | `name`            | `text`                   | display name                                                  |
|               | `passwordHash`    | `text`                   | `scrypt$<saltHex>$<keyHex>`                                   |
| `Meeting`     | `id`              | `text` PK                | `mtg-<owner>-<n>` in the seed, `randomUUID()` from `create`   |
|               | `ownerId`         | `text` FK → `User.id`    | `onDelete: Cascade`; stripped by `toMeetingDto`               |
|               | `title`           | `text`                   | 3–100 characters                                              |
|               | `startsAt`        | `text`                   | ISO 8601 UTC, always `…Z`, milliseconds included              |
|               | `durationMinutes` | `integer`                | 15–480                                                        |
|               | `participants`    | `text[]`                 | 0–20 free-form strings, 1–100 characters each (`ADR-0017`)    |
| `MeetingFile` | `id`              | `text` PK                | `fil-<owner>-<n>-<k>` in the seed, `randomUUID()` from upload |
|               | `meetingId`       | `text` FK → `Meeting.id` | `onDelete: Cascade`; stripped by the mapper                   |
|               | `filename`        | `text`                   | the rule in §3                                                |
|               | `contentType`     | `text`                   | one of the four allowed values                                |
|               | `sizeBytes`       | `integer`                | 1 … 1 048 576                                                 |
|               | `content`         | `bytea`                  | the file, verbatim; **never** in a JSON body                  |
|               | `uploadedAt`      | `text`                   | ISO 8601 UTC                                                  |

Indexes: `Meeting(ownerId, startsAt)` for the owner-scoped recent list, `MeetingFile(meetingId)` for
the listing.

**What the seed gains.** The existing four users and seven meetings are unchanged, values included.
Two files are added, both on `usr-teacher`'s `mtg-teacher-3` ("Geometry workshop"), so the read-only
baseline carries absolute assertions and every other seeded meeting carries the empty state:

| id                | meeting         | filename       | contentType       | sizeBytes | uploadedAt                 |
| ----------------- | --------------- | -------------- | ----------------- | --------- | -------------------------- |
| `fil-teacher-3-1` | `mtg-teacher-3` | `syllabus.pdf` | `application/pdf` | 1024      | `2026-01-15T15:30:00.000Z` |
| `fil-teacher-3-2` | `mtg-teacher-3` | `notes.txt`    | `text/plain`      | 48        | `2026-01-15T15:31:00.000Z` |

Bytes are deterministic, built in the seed script from a fixed pattern (the ASCII `%PDF-1.7\n`
header padded with `0x20` to 1024 bytes; a fixed 48-byte ASCII line), never random and never
`Date.now()`. Listing order is `uploadedAt` descending with `id` ascending as the secondary key
(invariant 7), so `notes.txt` is first.

**Which owners mutating cases may use** — unchanged from `FACT-3126`: `usr-planner` for
`*.api.spec.ts`, `usr-organizer` for `*.functional.spec.ts`, so the two projects cannot race. What
changes, and this corrects an earlier draft of this section: **the owner is the sandbox, the meeting
is per case.** A shared mutating meeting does not survive the ten-file refusal — the case that proves
the refusal consumes all ten slots, and every later upload case against that meeting then fails for a
reason that has nothing to do with what it tests. So each mutating case **creates its own meeting
under its sandbox owner** and uploads into that. That is strictly stronger than the shared meeting it
replaces: a listing over a meeting the case made itself has an **exact** expected count rather than a
relative one. `FACT-3131`'s relative-counter rule still governs anything counted across an owner's
whole collection, which is where it was always aimed. The seeded `mtg-planner-1` and
`mtg-organizer-1` keep zero files and stay what they already were — the empty-state fixtures.

`e2e/fixtures/seed.ts` gains the mirror of the seed table above; it stays hand-kept and the
live smoke check stays its only enforcement (`FACT-1033`, `FACT-3247` — both unaffected).

## 5. Alternatives rejected

| Alternative                                                                                                                   | Why not                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The modern `prisma-client` generator                                                                                          | The only consumer form measured fails `TS5097`, and the options that govern emitted specifiers were never exercised ([probe 1c](research/probes.md)). Adopting it means designing on an unknown; the legacy generator was measured green end to end. Dated — `ADR-0028`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `allowImportingTsExtensions` so the modern generator fits                                                                     | A repository-wide compiler relaxation, inherited by both apps and the e2e project, to accommodate one dependency's generated output.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `enableImplicitConversion` on the global `ValidationPipe`                                                                     | Measured to turn a three-message 400 into a one-message 400 ([probe 3e](research/probes.md)). `HD-API-*` asserts those bodies, and the change would reach every endpoint to serve one that does not need it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `@Type(() => Number)` on an upload DTO field                                                                                  | Solves a problem this design does not have: the upload DTO declares no properties, so no numeric field crosses multipart.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| base64 bytes in the listing body                                                                                              | Inflates every listing by a third to carry data the listing does not display, when a download route already serves the bytes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Returning the entity straight from the controller                                                                             | `JSON.stringify` of a `Bytes` value emits `{"0":1,"1":2,…}` ([probe 5d](research/probes.md)) — neither readable nor decodable.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Files on disk or in object storage                                                                                            | Outside the owner's scoping decision, and a path on disk adds a second lifetime beside the row that points at it: a backup, a delete and a transaction that no longer agree.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Raising Next's limit and letting its own 413 be the user-facing error                                                         | Its client surface is unmeasured ([probe 4](research/probes.md)), so the message a user sees would be whatever Next happens to do.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| A size check in the browser before submitting                                                                                 | Invariant 15's class: the server branch stops being the one the UI exercises. The API's 413 is asserted at the `api` level instead, which `FACT-2000` already calls the executable truth of the contract.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| An `accept` attribute on the file input                                                                                       | Same class, with no server-side guarantee bought for it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `DateTime` columns for `startsAt` / `uploadedAt`                                                                              | Prisma maps `DateTime` to `timestamp without time zone` ([probe 5b](research/probes.md)) — a zone-less column in a project that pins time to UTC everywhere. A `text` ISO column also keeps `FACT-1008` and `FACT-1018` true and needs no conversion in the mapper.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Schema-issued ids (`@default(uuid())`)                                                                                        | The id-format divergence is `BL-024`'s to settle; changing it as a side effect of moving the store would resolve a tracked decision without anyone deciding it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Seeding from a service constructor on every boot                                                                              | Every API start would write to a shared database and two starts would race; and a constructor cannot await, so it needs a lifecycle hook this API has never had.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| A test-only reset endpoint                                                                                                    | Already refused (`FACT-3128`, backlog Rejected) and still a back door in a production API. The reset happens outside the running application instead.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| A GitHub Actions `services:` block for Postgres                                                                               | A second definition of the database beside `docker-compose.yml`. Two copies of one fact drift silently — `FX-023`, `FX-027`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| A committed `.env`, or `@nestjs/config`/`dotenv`                                                                              | `SEC-API-10` fails the run for the first; the second is explicitly absent and `auth.config.ts` already shows the shape that works.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| A repository layer between the services and Prisma                                                                            | Its only second implementation would be a hand-written fake, which moves the unit tests from testing the code to testing the fake. `FACT-0013` already says the service owns the store.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `vi.mock('@prisma/client')` to keep the service units                                                                         | The same objection, plus: the assertions would become "the service called `count` with this `where`", which is the restatement-of-the-implementation shape the backlog already rejected for `dal.ts` and for jsdom component tests.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **A real database under the units** — `embedded-postgres` (evidenced here, [probes 0e and 5](research/probes.md)) or `pglite` | The strongest of the three, and the only one that would keep `HD-UT-09`. Rejected on the hook, not on the idea: `.husky/pre-commit` runs `pnpm test` on **every commit**, its whole value is being a ~6 s floor, and `CLAUDE.md` records that a hook over ten seconds gets bypassed with `--no-verify` — after which none of its checks run. An `initdb` plus a server start, per run, is an unmeasured addition to exactly that budget, and it would also give `pnpm test` and `pnpm --filter api test:e2e` a database dependency they do not have today in CI. `pglite` is faster and would dodge the native binary, but no probe touched it and `ADR-0028` has just refused to adopt an unexercised Prisma path. **What makes the trade acceptable is that the coverage relocates rather than vanishing** — see §7, where the `HD-UT-09` replacement is specified at the same three-meeting strength as the unit it retires, so the detection rate is carried across rather than halved. The relocated case is better in **what it exercises** — the real `ORDER BY` rather than a JS comparator — and equal in **how often it catches a dropped tiebreak**; it is not better outright, and §7 does not claim it is. Were `HD-UT-09` not expressible over HTTP at that strength, this row and the decision would swap places. |
| Making `participants` a relation now                                                                                          | `ADR-0017`'s premise is stale, but no scoping decision asks for it — see §8.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

## 6. Decisions and ADRs

Three records, written before any code, with their facts numbered through `pnpm fact:next` and
`pnpm fact:lock` re-run:

- **`ADR-0027` — PostgreSQL via Prisma, run by docker-compose, replaces the in-memory store.**
  **Supersedes `ADR-0007`**, whose status is now `superseded` with the back-link. Owns: the
  container, the two databases, `DATABASE_URL`'s route into each process, the standalone seed
  script, the per-run reset, the lazy connection, `text` columns for timestamps, and
  application-issued ids.
- **`ADR-0028` — Prisma is pinned exactly and generated with `prisma-client-js` into
  `node_modules`.** A separate record on purpose: Prisma 8 leaving release candidate will force this
  to be revisited, and revisiting a generator must not mean reopening where the data lives.
- **`ADR-0029` — File bytes live in a `bytea` column and never cross the JSON boundary.** Owns the
  storage of bytes, the metadata/DTO split, the single byte-returning endpoint and its headers, the
  1 MiB per-file ceiling against Next's `'2mb'`, the ten-file-per-meeting cap, and the multipart
  function in `api-client.ts`.

`ADR-0017` and `ADR-0018` are **applied, not changed**: the file routes reuse `ADR-0018`'s
one-code-path 404 for a meeting the caller does not own, and `participants` stays as `ADR-0017`
fixed it.

### Facts retired, and facts that survive

Performed in this stage, because `ADR-0027` makes them false and its own facts are the successors —
the four live in `ADR-0007`'s new `## Retired facts` register (`ADR-0022`, `FACT-3489`), and
`pnpm fact:lock` has been re-run:

| Retired     | Stated                                    | Successor   |
| ----------- | ----------------------------------------- | ----------- |
| `FACT-3121` | services own plain arrays, seeded at init | `FACT-3572` |
| `FACT-3122` | plaintext hashed at startup               | `FACT-3578` |
| `FACT-3127` | a database — rejected                     | `FACT-3571` |
| `FACT-3130` | `--watch` wipes what a test created       | `FACT-3579` |

**Specified here, performed when the corpus changes with the code** — each needs a fresh key from
`pnpm fact:next` in its own block, a `## Retired facts` row in its own document, and a lock re-run:

| Retired     | Document          | Successor states                                                                                                                                                                                  |
| ----------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FACT-1025` | `data-model.md`   | persistence is PostgreSQL, run by docker-compose (`ADR-0027`)                                                                                                                                     |
| `FACT-1026` | `data-model.md`   | each service reads and writes through the injected Prisma client and holds no in-process copy                                                                                                     |
| `FACT-1027` | `data-model.md`   | users, meetings and meeting files are rows that survive a restart; the volume is the lifetime                                                                                                     |
| `FACT-1028` | `data-model.md`   | hashes are computed by the seed script and stored; the seed source's plaintext never reaches the DB                                                                                               |
| `FACT-1032` | `data-model.md`   | the seed is three `*.seed.ts` files, applied by `db:seed`, mirrored in `e2e/fixtures/seed.ts`                                                                                                     |
| `FACT-1036` | `data-model.md`   | `planner` owns **two** meetings: `mtg-planner-1`, the mutation sandbox for `*.api.spec.ts`, and `mtg-planner-2`, a never-mutated fixture carrying the `SEC-API-11` rows that nothing uploads into |
| `FACT-0030` | `architecture.md` | "Prisma client + seed script" replaces "In-memory repository + seed" in Patterns in use                                                                                                           |
| `FACT-0037` | `architecture.md` | the same successor — a database is no longer refused; a repository layer over Prisma is, as a new row                                                                                             |
| `FACT-2017` | `api-contract.md` | `message` is an array on every 400 **except** the ones `@nestjs/platform-express` raises from a multipart limit, which carry a string — as do 401, 404, 413 and 415                               |

**Ripples, swept.** `violationsFactReferences`
(`e2e/architecture/architecture.api.spec.ts:850-899`) exempts only `docs/plans`, `docs/profiling`
and the retired key's **own** file, so every other living citation of a retiring key has to move in
the same commit. Grepping `docs/`, `e2e/`, `.claude/`, `scripts/` and `CLAUDE.md` for all eight
specified keys gives exactly three, and no more:

| Retiring    | Cited from                                                                           | What must happen                                       |
| ----------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| `FACT-1032` | `docs/adr/ADR-0007-in-memory-store.md:20` — `FACT-3123`'s source                     | re-point at the successor; `AR-API-14` fails otherwise |
| `FACT-2017` | `docs/adr/ADR-0006-nest-layering.md:52`                                              | re-point at the successor; `AR-API-14` fails otherwise |
| `FACT-2017` | `docs/adr/ADR-0018-not-found-over-forbidden.md:57` — `FACT-3384` sources it directly | re-point at the successor; `AR-API-14` fails otherwise |
| `FACT-1036` | `docs/adr/ADR-0007-in-memory-store.md:26` — `FACT-3126`'s source                     | re-point at the successor; `AR-API-14` fails otherwise |

`docs/api-contract.md:218` and `:225` also cite `FACT-2017`, but they sit in the key's own file and
are mechanically exempt; they are re-pointed anyway, because an exempt citation of a retired fact is
still a reader being told something false. `FACT-1025`, `FACT-1026`, `FACT-1027`, `FACT-1028`,
`FACT-0030` and `FACT-0037` are cited **only at their definition sites**, so they move alone. Each
re-pointing changes a statement's words and therefore its hash: `pnpm fact:lock` is re-run and the
diff is what the reviewer reads (`ADR-0022`).

**Survives, and why** — the research's §3c and §3d, resolved: `FACT-1005` and `FACT-2060` (ids are
issued exactly as today); `FACT-1038`…`FACT-1041` (the shared password, the read-only pair, the
parallel-project sharing and the absolute dates all hold); `FACT-1008`, `FACT-1018`, `FACT-1019`
(`text` ISO columns keep every timestamp statement true); `FACT-3125`, `FACT-3126`, `FACT-3131`
(isolation-through-data is kept deliberately — only the restart is replaced); `FACT-3128`,
`FACT-3129`, `FACT-3132`, `FACT-3133`, `FACT-1033`, `FACT-3247`. The twelve keys of §3b are
untouched: their premises moved, their statements did not.

`docs/data-model.md` gains the `MeetingFile` entity table and `docs/api-contract.md` the three
routes with their bodies; `docs/architecture.md` gains the Prisma pattern row; `docs/security.md`
gains an uploads paragraph naming the size ceiling, the per-meeting cap, the allow-list,
`attachment` + `nosniff`, **the fact that the `filename` column has more than one writer so the
download route validates its own header rather than trusting the stored value** (`FACT-3650`), the
absence of any content scanning, **the fact that a declared content type is not observable above the
parser** (`FACT-3647`, `FACT-3649`) so the allow-list bounds what is
stored rather than what was sent, **and the raised global Server Action body limit** — specifically that `'2mb'` applies to every action including the unauthenticated
`loginAction`, so the body an anonymous visitor can make Next buffer goes from 1 MiB to 2 MiB. That
belongs in the "Deliberate gaps" list beside "No rate limiting", not only in this folder: it is a
consequence of a decision this change takes, and a consequence recorded only in a plan is a
consequence nobody reads. (`docs/security.md` carries no keys, by its own design.)

**Both `CLAUDE.md` files go false and are part of this change**, which the first draft of this
design omitted. They are not keyed documents, so there is no retirement mechanism — but `CLAUDE.md`
is the file whose invariants outrank every skill, and leaving it asserting "no database" after
shipping one is the drift `FX-023` and `FX-027` are entries about.

| File                       | What stops being true                                                                                                      |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/CLAUDE.md:24`    | `src/meetings/` described as "the **in-memory** service"                                                                   |
| `apps/api/CLAUDE.md:25`    | `src/users/` as "plaintext passwords → `scrypt` **at startup**" — hashing moves to the seed script                         |
| `apps/api/CLAUDE.md:27`    | `src/config/` reads `JWT_SECRET` / `JWT_EXPIRES_IN` — now `DATABASE_URL` too                                               |
| `apps/api/CLAUDE.md:35-37` | "**No database, in-memory repositories.** `nest start --watch` … wipes anything the tests created" — the whole bullet goes |
| `apps/api/CLAUDE.md:38-39` | "`.env` is not read" — still true and now **load-bearing**, so it is re-pointed at `database.config.ts` rather than left   |
| `apps/web/CLAUDE.md:18-24` | the map has no row for `app/meetings/[id]`, its Route Handler, or `lib/actions/meeting-files.ts`                           |

Root `CLAUDE.md` additionally gains what a contributor now needs before `pnpm e2e` — a running
Docker — because "the hook is a floor, not acceptance" stops being the whole story once acceptance
needs a container.

**Every sentence that says the seed is applied at startup also goes false**, and they are easy to
miss because none of them is a `FACT-`. Swept across `apps/api/src`, `e2e/**/*.cases.md` and the
module maps, in the shape the scenario stage found in `e2e/smoke/seed.api.cases.md`:

| Where                                                 | What it says that stops being true                                              |
| ----------------------------------------------------- | ------------------------------------------------------------------------------- |
| `e2e/regression/auth-login/auth-login.api.cases.md:9` | precondition: "The user seed is applied at startup"                             |
| `apps/api/src/users/users.seed.ts:5`                  | "hashed with `scrypt` when `UsersService` initializes"                          |
| `apps/api/src/users/users.service.ts:18`              | "In-memory user store … the seed is applied in the constructor"                 |
| `apps/api/src/meetings/meetings.service.ts:28`        | "In-memory meeting store — no database; the seed is applied in the constructor" |

The source-file comments go with the code that carries them, so they are an implementer's business;
the `.cases.md` precondition is not, and is named here because a false precondition in a case
document is read as a fact by whoever writes the next case against it.

## 7. Impact on what already exists

**Invariants.** 3 (the pipe's options are untouched), 4 (`countByOwner` becomes a SQL `count`), 5
(`ownerId` still from `@CurrentUser()`), 7 (ordering moves into `orderBy` with the `id` tiebreak),
8 (holds — it already says "from `ValidationPipe`"), 9, 10, 11, 13, 14, 15, 16 (three routes and one
page to register), 17, 19. None is relaxed.

**How this list is built, after it missed three times.** Two misses were found at `FEAT-S10`
(`HD-UT-09` named as covered over HTTP when nothing covered it; `MD-UT-06`…`08` put in the "covered"
bucket when they were withdrawn) and a third at implementation (`HD-FN-17` and `HD-FN-19`, below).
Patching the list a fourth time would be repairing the output of the method rather than the method,
so the method is stated here and the list below is its result.

**There are two failure modes, not one, and only the first was ever being asked about.**

- **Subtraction** — something is removed, and the question is what covered it. Misses 1 and 2 were
  this: answered per _group_ rather than per _case_, and answered from memory of what the api cases
  assert rather than from reading them. The repair is already applied above — one row per case, each
  naming the successor or saying "withdrawn, nothing covers it".
- **Addition** — something is added to a shared surface, and the question is what asserts the shape
  of that surface. **This analysis never asked it.** Nothing was removed from the dashboard; a link
  was added to each row, and two cases broke that are not about the list at all. A search for "which
  cases address the meeting list" — which is what the earlier draft of this section ran, and it is
  why `HD-FN-04`, `HD-FN-05`, `HD-FN-14`, `HD-FN-18` and `HD-FN-20` are named — cannot find them,
  because the thing that was added is not mentioned in them.

**What the addition question has to be.** Not "which cases mention the thing I changed" but **"which
cases have a scope that contains the thing I changed"** — a case is disturbed when the change lands
anywhere inside the scope of one of its assertions, whatever that assertion is _about_.
`HD-FN-17` is about the navigation rail and asserts `getByRole('link')).toHaveCount(1)` over the
**whole page**. Counting and negative assertions — `toHaveCount`, `toBeHidden`, "the only", "no new"
— are where this bites, because they are the ones written unscoped, but the root property is
**scope wider than subject**, not negativity. The sharpest evidence is inside `HD-FN-19` itself: its
button assertion unions four landmarks (`home-dashboard.functional.spec.ts:300-311`) and its link
assertion is page-scoped, in the same test. The defect is inconsistency, not ignorance, which is
exactly the kind a method has to catch rather than leave to care.

> This is the sibling, on the output axis, of the rule the parser findings produced on the input
> axis: _verify where a value comes from, not only what is done with it_ — and now, _when a change
> adds to a surface, enumerate what asserts the shape of that surface, not what names what you
> added_. Both are cheap greps. Neither was run.

**Re-running the repaired method over this change**, mechanically: every spec that visits a page this
change touches, grepped for `toHaveCount`, `toBeHidden`, `not.toBeVisible` and unscoped
`getByRole(...)`. It finds the two below and **one more** — `ACC-FN-04` constrains the new page to
exactly one `main` as well as one `h1`, now recorded in §2. It also clears, by reading rather than by
assumption: `HD-FN-18` (`list` count — no list is added to `/`), `HD-FN-09` (`listitem` count 0 for
`student` — nothing added), `HD-FN-14`/`HD-FN-16` (`h1` count on `/`), `HD-FN-19`'s landmark-scoped
button union, `HD-FN-20`/`HD-FN-21` (scoped to the overview), `SEC-FN`'s email-absence counts and
every `AL-FN-*` assertion (the login page is untouched). On the API side the same question asks
whether anything added to a response body disturbs an exact-shape assertion: `HD-API-01` pins the
meeting item's key set to exactly five keys, and **`MeetingDto` gains no field** — files are a
separate resource, which is the decision that keeps that case green and is worth naming as a check
that was made rather than a coincidence. That is the whole sweep; it is credible after three misses
only because it is a grep with a stated pattern rather than a recollection, and it can be re-run by
anyone.

**A fourth miss, and what two instances of the same shape say that one did not.** `FACT-1036`
states that `planner` owns one meeting; the `SEC-API-11` fixture adds `mtg-planner-2` and nobody
named it. It is the `HD-FN-17` shape exactly — a count, invisible to a search for the thing being
added — but living in the **corpus** rather than in a spec, and the repaired method greps `e2e/**`.
So the addition question needs a corpus arm, and it gets one below. **But the more useful reading is
one level up.**

Misses 3 and 4 are not two axes. They are **one question asked of two artifact families**, and the
pattern across all four misses is that I keep inventing a one-off sweep per family when prompted —
the seeding-precondition sweep, the `CLAUDE.md` table, the spec grep, now the corpus grep — instead
of enumerating the families once and asking both questions of each. The families that assert
something about this system are: **the specs**; **the four keyed corpus documents**; **`.cases.md`
preconditions**, which nothing checks and which the next case author reads as fact; **the module maps
and both `CLAUDE.md` files**; **the hand-maintained lists** (`PROTECTED_ROUTES`, `AUDITED_PAGES`,
`KNOWN_CASE_PREFIXES`), which this repository already knows are a weak point; and — the one no grep
over this repository can reach — **the framework's own output**, which is where
`__next-route-announcer__` came from. Subtraction and addition have to be asked of each. That
predicts where a fifth miss comes from: the families still handled by one-off sweep rather than by
arm, which are the `.cases.md` preconditions and the lists.

**Two root causes, not one, and they need different fixes.** Misses 1 and 2 were _asked and answered
from memory_ — the fix is a verification discipline: read the successor, do not recall it. Misses 3
and 4 were _never asked_ — the fix is an enumeration, above. Worth separating in the profiling
record, because "be more careful" repairs neither.

**The corpus arm, runnable.** The trigger is not a grep but a question: **for every collection this
change adds a member to, which keyed fact states that collection's size or membership?** Enumerate
the collections first — here: the seed's meetings (+1), the seed's files (new), the entity set (+1),
the route table (+3), `MeetingDto`'s key set (deliberately +0), and the hand-maintained lists. Then
find the keyed statement about each:

```
grep -nE '`FACT-[0-9]{4}`' docs/architecture.md docs/data-model.md docs/api-contract.md docs/adr/*.md \
  | grep -iE '\b(exactly|only|all |both |no |never|one|two|three|four|five|six|[0-9]+)\b'
```

**Re-running it over this whole change** turns up `FACT-1036` and nothing else false. Cleared by
reading: `FACT-1034` (teacher 5) and `FACT-1035` (student 0) — no meeting was added to either;
`FACT-1037` (organizer 1) — `mtg-planner-2` is the only new meeting, confirmed against
`meetings.seed.ts`; `FACT-1038` ("all four users") — no user added; `FACT-1040` ("two mutation
sandboxes") — unchanged; `FACT-1046` ("the three most recent"); `FACT-2004`/`FACT-2005`, which
describe the route table's _columns_ and are untouched by adding rows; and `FACT-2038`/`FACT-2063`,
the five-key `MeetingDto` — which survive **because** files are a separate resource, the second time
that decision has paid a count assertion. `FACT-1041` ("seed dates are absolute, January 2026")
survives in substance — every new `uploadedAt` and `mtg-planner-2` are January 2026 — but its source
names `meetings.seed.ts` alone where there are now three seed files: a source widening and a lock
re-run, not a retirement.

One the arm surfaces that must **not** be retired, recorded because a careless reader would:
`FACT-3334` (`ADR-0017`) says `data-model.md` "documented exactly two entities". It is a **Context**
fact in the past tense, describing the world when that record was written; `MeetingFile` does not
falsify it, and retiring it would be rewriting history rather than recording a change.

**Cases disturbed.**

- **`HD-FN-17`** ("the navigation rail names its one destination") and **`HD-FN-19`** ("the hero
  banner's two lines, and no new control") — both assert
  `expect(authedPage.getByRole('link')).toHaveCount(1)` over the whole page
  (`home-dashboard.functional.spec.ts:252`, `:298`), and three row links make both read `4`. The
  correction is to rescope each assertion to the landmark it is actually about — the `navigation`
  and the `banner` — which is the shape `HD-FN-18` already uses for its list-item count and
  `HD-FN-19` already uses for its buttons. Rescoping is not weakening: each case then asserts what
  its title says it asserts. The case text is `test-designer`'s and the spec a `tester-*` role's.
- `SM-API-02`, `SM-API-03` — the seed now arrives from a database; both must still pass unchanged
  against the same values, which is the point of keeping every seeded value identical. `SM-API-03`
  grows to cover the two seeded files.
- `HD-API-01…17`, `MD-API-01…07` — behaviour must be identical; they are the regression net for the
  whole storage move. `HD-API-13`/`HD-API-17` depend on the per-run reset for their relative
  counters to stay meaningful across runs.
- `AL-FN-*` and `SEC-FN-*` are unchanged. `HD-FN-02…21` are unchanged **apart from `HD-FN-17` and
  `HD-FN-19` above**: `meeting-list.tsx` now renders a link per row, and `HD-FN-04`, `HD-FN-05`,
  `HD-FN-14`, `HD-FN-18` and `HD-FN-20` address the list and its titles and must stay green without
  edits. That distinction is the one this section kept getting wrong — those five are disturbed in
  their **subject** and survive; the two above were disturbed in their **scope** and do not. If one
  of the five needs an edit, the accessible contract moved and that is a defect, not a test to
  update (`FACT-3559`). `ACC-FN-01…04` are unchanged in text but **not in reach** — see the
  `AUDITED_PAGES` bullet below.
- `SEC-API-03` hardcodes `sub: 'usr-teacher'`; the user id is unchanged, so it stands. `SEC-API-01`
  and `SEC-API-09` grow by the new routes cleanly. **`SEC-API-07` does not**: `POST_ROUTES` carries a
  JSON `valid` object and `callRoute` posts `data: {}`
  (`e2e/security/security.api.spec.ts:35-59`), so a multipart route needs a branch there — a change
  to the walker, not another row in the list.
- `PROTECTED_PAGES` and `AUDITED_PAGES` need a **concrete** path, and `AUDITED_PAGES` entries carry a
  `needsSession` flag; the new entry is `/meetings/mtg-teacher-3` with `needsSession: true`
  (`authUser` defaults to `teacher`, `auth.fixture.ts:109`, so the seeded teacher-owned meeting
  resolves). The literal id does **not** go in a spec: `e2e/fixtures/seed.ts` gains it as an exported
  constant, the way it already owns every seeded login, password and title. That splits cleanly
  against `meetings-detail.api.cases.md:15-17`'s "no meeting id is ever a literal", which governs
  **api** cases, where the ids under test are generated at runtime; a seeded id is a seeded value,
  and the mirror is where seeded values live.
- **The `AUDITED_PAGES` entry buys less than it looks like**, and the first draft of this section was
  wrong to list `ACC-FN-01…04` as simply unchanged. `ACC-FN-01` runs `axe` over `PUBLIC_PAGES` only
  (`accessibility.functional.spec.ts:49-55`), `ACC-FN-02` hardcodes `'/'`, and only `ACC-FN-04`
  iterates `SESSION_PAGES` — for the one-`h1`-and-one-`main` assertions, not a scan. So a
  `needsSession: true` entry gets those two assertions and **no WCAG scan at all**. The meeting page
  is the first authenticated page added since that structure was written, and it needs a scanned
  session page: either `ACC-FN-02` generalised from its hardcoded `'/'` to `SESSION_PAGES`, or a case
  of its own. Which one is the test designer's call; that the gap exists is this design's to state,
  because silence here leaves a page that looks audited and is not (`ADR-0025`).

**The unit level: what retires, what relocates, what is withdrawn.** The first draft of this design
put all eighteen meetings cases in one bucket and justified it with "already asserted over HTTP".
That was wrong for five of them, and the corrected split is below. `meetings.service.spec.ts` goes
either way — every case in it reaches Prisma — but what happens to the coverage differs per case,
and the difference is the whole point.

| Cases                                  | What happens                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `HD-UT-01`…`06`, `08`; `MD-UT-01`…`04` | **Already covered over HTTP** by `HD-API-01`…`10` and `MD-API-01`…`07`: the recent list, the limit and its default, the owner filter, the full count, creation and its defaults, by-id for an owner, an unknown id, a foreign owner, and `participants` normalization. They retire.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **`HD-UT-07`**                         | **Relocates.** It is not copy semantics: it asserts that `create` takes `ownerId` from its argument **and** that the id matches `/^[0-9a-f]{8}-…$/`. `FACT-3583` and the surviving `FACT-2060` keep both true under Prisma, and no API case asserts the id shape. A new api case must.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **`HD-UT-09`**                         | **Relocates, and this is the one that mattered.** It is invariant 7's secondary key — the behaviour this change _moves_, from a JS comparator into `orderBy: [{ startsAt: 'desc' }, { id: 'asc' }]`. No `HD-API-*` creates meetings sharing a `startsAt` (`HD-API-04` runs over the seed's five distinct dates), so dropping it would let a lost `{ id: 'asc' }` go green everywhere. The replacement creates **three** meetings as `planner` at the identical `FUTURE_STARTS_AT_ISO` — three, not two, because the detection rests on three random UUIDs happening to arrive out of ascending order: with three that is five chances in six, with two it is one in two, and the retired unit used three for exactly this reason. It reads back with `limit=100` (the established "everything" idiom — `list-meetings-query.dto.ts:12,24`, `HD-API-17`), **filters the response to the three created ids** and asserts that subsequence equals those ids ascending. The filter is what makes it race-safe: other mutating cases also create `planner` meetings at that same date, and they may interleave by id without the assertion caring. What it must **not** copy from the unit is the second read: the unit read twice because an in-memory sort can depend on insertion order, whereas PostgreSQL will return the same wrong order as often as you ask. |
| **`MD-UT-05`**                         | **Relocates.** `MD-API-05` sends two distinct clean strings; the unit sends `['  Nina Cole ', 'Nina Cole', 'Nina Cole', 'guest@…']` — padded and duplicated — which is the only thing that actually proves `FACT-1024` ("never trimmed, never deduplicated"). A new api case must send that payload, and it matters more now, not less: `participants` is moving to a `text[]` column §8 records as unexercised.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **`MD-UT-06`, `07`, `08`, `09`**       | **Withdrawn, not relocated.** All four mutate a returned array and re-read to prove the store hands out copies. Prisma builds a fresh object per query and there is no shared array to leak, so the behaviour they guard ceases to exist along with `FACT-3360`. There is nothing to assert over HTTP, where every response is a fresh parse. Calling these "covered" would have been false.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

- **`AL-UT-17` and `AL-UT-19` survive, re-pointed.** `AL-UT-17` moves to the pure exported
  `normalizeEmail`; `AL-UT-19` keeps calling `UsersService.toPublic` (the method name the spec
  actually uses, `users.service.spec.ts:34`, wrapping `toPublicUser`) but with a hand-built `User`
  instead of a `findByEmail` lookup, so it touches no database. `auth.service.spec.ts` is untouched —
  it already injects a cast fake for `UsersService`.
- New pure units arrive on both sides: the filename and content-type predicates, and
  `formatFileSize`.
- **`pnpm test:meetings-detail` loses its subject and goes**, with its row in `e2e/README.md`:
  `meetings-detail.unit.cases.md` maps to `meetings.service.spec.ts` and nothing else.
  **`pnpm test:home-dashboard` stays**, which an earlier draft of this section got wrong.
  `home-dashboard.unit.cases.md:12` declares 13 cases, and `HD-UT-10`, `HD-UT-11`, `HD-UT-15` and
  `HD-UT-16` are `apps/web/src/lib/format-date.spec.ts` units this change does not touch
  (`e2e/README.md:51` lists that spec under the same feature). The script keeps a subject, its
  `e2e/README.md` row keeps its second spec path and loses its first, and the root `CLAUDE.md`
  command table stays correct as written.

**What `.husky/pre-commit` still protects**, since that is the hook's entire value as a fast floor
and the unit layer just shrank: `AL-UT-*` across `auth.service.spec.ts`, `password.spec.ts`,
`token.service.spec.ts`, `jwt-auth.guard.spec.ts` and the four web modules — the whole authentication
and session surface, which is where this repository's security invariants live and which this change
does not touch. It no longer protects the meetings query layer; that moved to `pnpm e2e`, which the
hook deliberately does not run. The honest summary is that the hook gets **weaker** for meetings and
stays exactly as strong for auth, and the compensation is three new api cases rather than nothing.

**Lists and meta-tests.** `PROTECTED_ROUTES` (+3, checked by `AR-API-06`); `PROTECTED_PAGES` and
`AUDITED_PAGES` (+1, checked by nobody — review only); `KNOWN_CASE_PREFIXES` in
`e2e/suite-integrity.api.spec.ts` gains **`MF`** — unnamed, rules 5–7 go vacuously green over every
case this feature writes;
`e2e/README.md`'s "What lives where" table and `pnpm scenarios:index`; the Routes table
(`AR-API-05`), the Cases citations (`AR-API-09`), the ADR index (`AR-API-01…04`), the fact rules
(`AR-API-11…17`), and a `FT-` ledger entry (`LG-API-03`).

**One literal in two controllers.** The ownership _predicate_ genuinely lives in one place —
`MeetingsService.findById` — but `'Meeting not found'` would become a second string literal in
`MeetingFilesController`, and two copies of a documented body is how `FACT-2016` quietly becomes two
facts. The message is exported once from the meetings module and imported by the file controller.
The no-argument `NotFoundException()` form stays forbidden either way (`FACT-2066`, `ADR-0018`).

**A defect this change uncovered rather than caused, and my recommendation on it.**
`apps/api/tsconfig.json`'s `include` was `["src/**/*", "test/**/*", "*.ts"]`, and `*.ts` matches
top-level files only — so `pnpm typecheck` passed vacuously over any nested directory outside `src/`
and `test/`. It was proven with `tsc --listFiles` before and after, not inferred, and adding
`"prisma/**/*"` immediately surfaced two real type errors. **This should get its own `FX-` row with
"Found by: implementation"**, separate from the feature's `FT-`: it predates the change, so folding
it into the feature diff is exactly how it would become invisible, and "a check that silently covered
less than it appeared to" is the class `CLAUDE.md`'s ledger section already lists by name — beside
the vacuously passing meta-test and the lint rules left at `warn`. The argument against, stated so
the lead can overrule with it: the hole was **latent** — `prisma/` did not exist before this change,
so no file was ever actually mis-checked, and a defect with no past harm is arguably a hardening
rather than a fix. I think the ledger is better for having it; the ledger is not mine to shape.

**Behaviour that changes for a user.** Data now survives a restart — the single largest behavioural
change in this repository's history, and the one every mutating case was written assuming the
opposite of.

## 8. Open questions and deliberate omissions

1. **`participants` stays free-form strings.** `ADR-0017`'s stated premise — that nothing in a
   seeded in-memory store can enforce referential integrity — is now stale, and the record itself
   says a change wanting participants to _be_ users supersedes it. No scoping decision asks for it,
   so this design leaves it alone and records the pressure. **For the owner to decide**, not the
   design: the cost of doing it now is a second supersession, a join table, a contract change to
   `MeetingDto`, and `SM-API-03`'s per-title `participants` arrays rewritten; the cost of deferring
   is that `ADR-0017` keeps citing a reason that no longer holds.
2. **`BL-004` is unblocked but not closed.** Its "Depends on: a database" is satisfied; the seed
   source still holds plaintext and the seed script hashes it, so the item stays open with its
   conflict (`e2e/fixtures/seed.ts`, `SM-API-02`) now squarely inside this change's blast radius.
3. **`BL-024` is untouched by design.** Ids are issued exactly as today, so the two formats go on
   coexisting — now in a `text` column instead of a `Map` key. The change rewrites the code that
   issues them and deliberately does not decide their format.
4. **`participants String[]` is the one schema capability the probes did not exercise.** Probe 5
   used no scalar list. If `text[]` does not behave, the fallback is a `text` column holding a JSON
   array, mapped in the service — the wire contract is identical either way. Named rather than
   assumed.
5. **Next's 413 above 2 MiB stays unmeasured.** Files between 1 MiB and 2 MiB meet the API's
   documented 413 — `'2mb'` is parsed by Next's bundled `bytes`, so the ceiling is 2 MiB, not
   2 000 000; above it the surface is whatever Next does, which probe 4 could not establish without a
   live `next dev`. No case is designed against it.
6. **`apps/api/test/app.e2e-spec.ts` booting with no database is an inference, not a measurement.**
   Probe 7 established only that _constructing_ a `PrismaClient` does not connect. It did not boot
   `AppModule` through Nest DI with `PrismaModule` in the graph, and it says nothing about whether
   Vitest exits cleanly with an undisposed `@prisma/adapter-pg` pool — which matters because this
   design deliberately registers no shutdown hook. `GET /` touches no table, so the reasoning is
   sound and the risk is a hang rather than a failure; but it runs in CI before any container, and it
   belongs on this list rather than inside `FACT-3581`.
7. **`nest build` with a generated client is unverified.** Only `tsc --noEmit` and direct `node`
   were probed; `apps/api/nest-cli.json` has no asset configuration. The design puts nothing
   generated in the tree, which is the cheapest position to be in if `dist/` turns out to need
   something, but it is not proof.
8. **`prisma generate` is decided, not deferred** — §2 makes it a `pnpm prisma:generate &&` prefix
   on seven `apps/api` scripts and adds no install hook, precisely so the no-CI-change claim does
   not rest on pnpm 10's lifecycle-script policy. What remains open is narrower: whether
   `prisma generate` is also needed before `pnpm lint` in practice, or only before `typecheck` and
   `build`. Carrying it on `lint` too is the safe order, and it is also the marginal ~2 s that makes
   the +15% in §2 worth re-measuring once the scripts exist — if `lint` turns out not to need it,
   that is the first prefix to drop.
9. **`prisma.config.ts` importing `database.config.ts` is proven, and it carries one trap.** The
   Prisma CLI's loader transpiles the config, follows `./src/config/database.config.js` to the `.ts`
   source and runs it — including a `Logger` from `@nestjs/common`, whose `WARN` line prints from
   the CLI. So the shape in §2 holds and one fallback constant lives in one module. The trap is that
   from the CLI's side the fallback fires **silently enough to be missed**, which means
   **`db:reset`'s refusal to run without an explicit `DATABASE_URL` belongs in the script, not in
   `database.config.ts`**. A guard inside the module would make `FACT-3574` false — the module's
   contract is "read the variable, fall back, warn", and a module that throws instead of falling
   back is a different module. It is named here because the guard reads more tidily in the module,
   which is exactly why someone will put it there.
10. **CI is argued, not demonstrated.** The compose stack is reached through the api `webServer`
    command, so no workflow edit is needed and Docker on `ubuntu-latest` is the research's own
    finding — but no run has proved it, and the first CI run is the proof.
11. **Docker's availability without the Desktop GUI, after a reboot, and its resource limits** stay
    unmeasured (probe 0d). Every contributor now needs it for `pnpm e2e` and `pnpm verify`.
12. **`bodySizeLimit: '2mb'` raises the ceiling for _every_ Server Action**, not only the upload —
    login, register and create-meeting included. Their bodies are a few hundred bytes, so nothing
    changes in practice; what changes is the size of a request an unauthenticated visitor can make
    Next buffer on the login action. It is stated rather than scoped because `serverActions` has no
    per-action setting. Storage growth is bounded instead, in the API, by the ten-file cap in §3 —
    the feature still has no delete, which is in §12.
13. **The api `webServer`'s 180 s must cover a cold `docker pull`, `initdb`, the healthcheck,
    `db push --force-reset`, the seed and `nest start`.** None of that is measured, and Playwright's
    timeout message names none of it either — a slow first CI run would report
    "Timed out waiting 180000ms from config.webServer" and nothing about which step was slow. CI's
    `timeout-minutes: 25` is comfortable and needs no change.
14. **The ten-file rule is not transactional, and that is a deliberate omission.** The handler
    counts and then inserts; two uploads to the same meeting in flight at once can both see nine and
    leave eleven rows. It is bounded by concurrency rather than open-ended, and it is not a security
    hole: ownership is checked first, so the only person who can race the cap is the meeting's owner
    racing himself. Making it exact would mean a `$transaction` with an isolation level this project
    has never exercised, or a database constraint Prisma cannot express portably — both of which buy
    an exact number for a rule whose purpose is bounding unbounded growth. The contract is therefore
    worded as _the upload is refused when the meeting already holds ten_, which stays true under the
    race, rather than _a meeting holds at most ten_, which does not.
15. **The research's `FACT-` table is not provably complete** (`contract.md` §3e): 611 keys exist, a
    key-by-key pass was not performed, and 16 keys the keyword sweep surfaced were never assessed.
    This design retires what it can name; a key missed here surfaces as a corpus contradiction, not
    as a red test.
16. **Deliberately not done:** no delete or rename of a file — which is why the ten-file cap exists
    rather than being left to a later change; no multiple files per upload, no
    thumbnail or preview, no content scanning, no rate limit, no pagination on the listing, no
    migrations directory, no `prisma migrate`, and no change to `apps/api/test/app.e2e-spec.ts`.
