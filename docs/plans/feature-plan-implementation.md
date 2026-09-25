# Implementation plan: login `/auth/login` + home `/`

> **ARCHIVE. Do not cite this document for conventions.**
> It describes how the first two features were built and is kept for the "why" rather than the "how
> it works now". The live suite convention is [`e2e/README.md`](../../e2e/README.md), the invariants
> are [`CLAUDE.md`](../../CLAUDE.md), and the acceptance order is the `regression-verify` skill. Its
> numbers are stale (`FX-013`, `FX-027`). Translated into English in `CH-014` and condensed: the
> architecture, contract, data model, task list, risks and decisions are preserved; the repetitive
> line-by-line scaffolding is not.

The companion document is [feature-plan-testing.md](feature-plan-testing.md). At the time, this file
owned the application architecture and the task order while the test plan owned the suite structure;
today both questions are settled by the live documents named above.

---

## 0. Verified facts about the environment

Every architectural decision below rests on facts checked against the installed dependencies rather
than on memory: `middleware.ts` is deprecated in Next 16 and renamed to `proxy.ts` (export `proxy`,
`runtime` forbidden in its config); `import 'server-only'` does not resolve outside a Next build;
Nest answers POST with 201 unless `@HttpCode` says otherwise; the error body shapes come from
`HttpException.createBody`; named imports of `class-validator`/`class-transformer` work from ESM.

---

## 1. Final architecture

### 1.1 File tree

`apps/api`: `common/crypto/password.ts`; `config/auth.config.ts`; `auth/` (controller, service,
`token.service.ts`, `password.service.ts`, `jwt-auth.guard.ts`, `current-user.decorator.ts`, DTOs,
types, module); `users/` (service, seed, mapper, types, module); `meetings/` (controller, service,
seed, mapper, DTOs, types, module).

`apps/web`: `proxy.ts`; `app/` (`page.tsx`, `auth/layout.tsx`, `auth/login/{page,login-form}.tsx`,
`auth/register/page.tsx`, `auth/session-expired/route.ts`); `components/`
(`meeting-list.tsx`, `logout-button.tsx`, `create-meeting-form.tsx` plus CSS modules); `lib/`
(`actions/{auth,meetings}.ts`, `api-client.ts`, `dal.ts`, `session.ts`, `session-cookie.ts`,
`format-date.ts`, `login-credentials.ts`, `types.ts`).

### 1.2 New dependencies

`@nestjs/jwt@^12.0.1`, `class-validator@^0.15.1` and `class-transformer@^0.5.1` in `apps/api`;
`vitest@^4.1.2` in `apps/web`. Nothing else, deliberately:

- `bcrypt` is unnecessary — `node:crypto.scrypt` needs no native build;
- `jose`/`iron-session` are unnecessary — the cookie holds a JWT Nest already signed;
- `@nestjs/passport`/`passport-jwt` are unnecessary — a ~25-line `JwtAuthGuard` of our own;
- `@nestjs/config` is unnecessary — secrets come from `process.env` with defaults;
- `server-only` is unnecessary — Next aliases it itself;
- `@testing-library/*`/`jsdom` are unnecessary — React components are covered by Playwright, and
  Vitest covers only pure helpers.

### 1.3 Flow diagram

```
Browser ──GET /auth/login──────────────► Next   page.tsx → LoginForm ('use client')
Browser ──Server Action loginAction────► Next  ──fetch POST /auth/login──► Nest
                                          Next ◄──200 {accessToken,user}──
                                          Next  cookies().set('ps_session', token, httpOnly)
Browser ◄──redirect '/'─────────────────  Next
Browser ──GET /────────────────────────► Next   proxy.ts: cookie present? no → 307 /auth/login
                                          Next   page.tsx → dal.getCurrentUser()
                                                 ──GET /auth/me       (Bearer from the cookie)──► Nest
                                                 ──GET /meetings?limit=3 (Bearer)──────────────► Nest
Browser ──Server Action createMeeting──► Next  ──POST /meetings (Bearer)──► Nest → revalidatePath('/')
Browser ──Server Action logoutAction───► Next   cookies().delete('ps_session') → redirect '/auth/login'
```

The browser **never** talks to Nest directly, and the JWT never reaches browser JS. That is checked
by `AL-FN-13` (httpOnly cookie, JWT invisible to JS) and `HD-FN-11` (no browser request to `:3101`).

### 1.4 The CORS and global prefix decision

**No CORS, no global prefix.** CORS headers only matter for requests from a browser origin, and the
only clients are Next's server-side `fetch` and Playwright's `request` fixture — neither does a
preflight. A bare `app.enableCors()` sets `Access-Control-Allow-Origin: *`, widening the attack
surface for zero benefit. A global prefix would break `SM-API-01` (`GET /` → `Hello World!`) and
force the prefix into every path; the paths `/`, `/auth/*`, `/meetings` do not collide anyway. The
reasoning goes into a comment in `main.ts` so the next agent does not add CORS by reflex.

---

## 2. API contract

`Content-Type: application/json` everywhere except `GET /`.

| #   | Method | Path               | Auth     | Request body                                                        | Success                                                            | Errors      |
| --- | ------ | ------------------ | -------- | ------------------------------------------------------------------- | ------------------------------------------------------------------ | ----------- |
| 1   | `GET`  | `/`                | none     | —                                                                   | `200` `text/plain`: `Hello World!`                                 | —           |
| 2   | `POST` | `/auth/login`      | none     | `{"email": string, "password": string}`                             | **`200`** `{"accessToken": string, "user": {"id","email","name"}}` | `400`,`401` |
| 3   | `GET`  | `/auth/me`         | `Bearer` | —                                                                   | `200` `{"id","email","name"}`                                      | `401`       |
| 4   | `GET`  | `/meetings?limit=` | `Bearer` | —                                                                   | `200` `{"items": MeetingDto[], "total": number}`                   | `400`,`401` |
| 5   | `POST` | `/meetings`        | `Bearer` | `{"title": string, "startsAt": string, "durationMinutes"?: number}` | `201` `MeetingDto`                                                 | `400`,`401` |

`MeetingDto` = `{"id", "title", "startsAt" /* ISO 8601 UTC */, "durationMinutes"}`. **`ownerId` is
absent from the response** — `toMeetingDto` strips it, which `HD-API-01` checks by key set.

### 2.1 Exact error bodies

Derived from `HttpException.createBody`, not guessed.

| Situation                                   | Code  | Body                                                                                                                                                                  |
| ------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ValidationPipe` rejected the payload       | `400` | `{"message": ["email must be an email", …], "error": "Bad Request", "statusCode": 400}`                                                                               |
| An extra field under `forbidNonWhitelisted` | `400` | `{"message": ["property role should not exist"], …}`                                                                                                                  |
| Wrong email/password                        | `401` | `{"message": "Invalid email or password", "error": "Unauthorized", "statusCode": 401}`                                                                                |
| Missing/broken/expired Bearer               | `401` | `{"message": "Authentication required", "error": "Unauthorized", "statusCode": 401}`                                                                                  |
| `limit` outside `1..100` or non-numeric     | `400` | `{"message": ["limit must not be less than 1"], …}` — a **non-numeric** value yields three messages, so compare by inclusion rather than equality (verified by probe) |
| `durationMinutes` outside `15..480`         | `400` | `{"message": ["durationMinutes must not be less than 15"], …}`                                                                                                        |
| `limit > 100`                               | `400` | `{"message": ["limit must not be greater than 100"], …}`                                                                                                              |
| Broken JSON in the body                     | `400` | `{"message": "Unexpected end of JSON input", …}` — `message` is a **string** here: the body comes from `body-parser` **before** `ValidationPipe`                      |
| Method/path not found                       | `404` | `{"message": "Cannot GET /auth/login", …}` — deterministically `404`, not `405` (verified)                                                                            |

`message` is an **array of strings only for `ValidationPipe` errors**; for an `HttpException` we
throw (`401`) and for `body-parser` errors it is a string. An assertion that "message is always an
array" would go red on correct code.

The last two rows are deliberately uncovered by cases: those checks were deleted in review 1 as
tests of `body-parser` and the Express router. The shapes stay in the contract so the next agent,
seeing such a response, does not "fix" it blindly.

### 2.2 Mandatory implementation details

1. **`POST /auth/login` must carry `@HttpCode(HttpStatus.OK)`.** Nest answers POST with `201` by
   default; without the decorator `AL-API-01` goes red.
2. `POST /meetings` needs no status decorator — `201` is the correct answer here.
3. `LoginDto`: `@IsEmail()` plus `@IsString() @IsNotEmpty()`. **No password complexity rules on
   login** — otherwise a wrong password gives `400` instead of `401` and the specification point
   "shows an error on bad credentials" becomes unverifiable.
4. **`ListMeetingsQueryDto`: `limit?: number` with
   `@IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)`**; the service supplies `3` when
   the parameter is absent.
   - `@IsOptional()` is **mandatory**. Without it, under `whitelist: true, transform: true`, a
     missing field still runs through `@IsInt/@Min/@Max` and `GET /meetings` **without the
     parameter** returns `400` (verified by probe) — the dashboard would not load at all.
   - The upper bound is `@Max(100)`, not `50`: `limit=100` is used as "give me everything" by
     `HD-API-17` and `SM-API-03`. Rewriting the cases to `limit=50` was rejected — it would tie the
     seed smoke to a magic number that must change as the seed grows.
5. `CreateMeetingDto`: `title` `@IsString() @Length(3, 100)`; `startsAt` `@IsISO8601()`;
   `durationMinutes?` `@IsOptional() @Type(() => Number) @IsInt() @Min(15) @Max(480)`; the service
   supplies `60` when absent. **`@IsOptional()` is mandatory** — without it, `POST /meetings`
   without `durationMinutes` gives 400 (verified by probe), and that is exactly how
   `createMeetingAction` and the creation form send it: the "Create meeting" button would never
   work. Caught at contract level by `HD-API-20`.
6. `ValidationPipe` is registered as an **`APP_PIPE` provider in `AppModule`** rather than only via
   `app.useGlobalPipes` in `main.ts`. Otherwise `apps/api/test/app.e2e-spec.ts` and any
   `Test.createTestingModule({imports:[AppModule]})` boot the app without validation and the `400`
   checks diverge from the real server.
7. `JwtAuthGuard` is attached with `@UseGuards(JwtAuthGuard)` to `GET /auth/me` and to the whole
   `MeetingsController`. No global guard — it would break `GET /` and `POST /auth/login`.

---

## 3. Data model and seed

**Types (`apps/api`).** `Meeting` carries `id`, `ownerId`, `title`, `startsAt` (an ISO 8601 UTC
string rather than a `Date`, so it survives JSON serialization and compares stably) and
`durationMinutes`. `MeetingDto` = `Meeting` without `ownerId`. `MeetingsPageDto` = `{ items, total }`
where `total` is the owner's full count. `CreateMeetingInput` deliberately has no owner field.

**Password hash format.** `scrypt$<saltHex>$<keyHex>`: 16 random salt bytes per call, a 64-byte key,
compared with `timingSafeEqual`.

**User seed.** Four users rather than two — because `fullyParallel: true` plus a mutating
`POST /meetings` share one in-memory store, so every mutating spec file needs its own owner:
`teacher` (5 meetings, read-only baseline), `student` (0 meetings, the empty edge case), `planner`
(1 meeting, the API mutation sandbox), `organizer` (1 meeting, the functional mutation sandbox). One
password for all — different ones add no testable branch.

**Meeting seed.** Fixed absolute dates, never `Date.now()`, or assertions about ordering and the
top-three slice would drift with the calendar.

**Web types and the cookie.** The cookie holds the **raw JWT** with no extra wrapper: it is
HS256-signed, `httpOnly`, and carries only `sub` and `email`. There are no `parseSession` /
`serializeSession` functions — Nest confirms the token on `GET /auth/me`.
`SESSION_MAX_AGE_SECONDS` must equal `JWT_EXPIRES_IN`.

**Environment variables.** `PORT` (3001; Playwright passes 3101), `JWT_SECRET` (a stable dev default
with a `Logger.warn`), `JWT_EXPIRES_IN` (`1h`), and `API_URL` on the web side. `.env` is not read:
neither dotenv nor `@nestjs/config` is wired in, and `.env.example` documents the contract.

---

## 4. Tasks

Every task's DoD is a verifiable condition, not "done".

**T0 — foundation** (on the main branch, direct commits). Kept thin: infrastructure only, nothing
domain-specific. The Nest `auth` module _is_ feature 1's backend and `meetings` is feature 2's;
hoisting them into T0 would build half of feature 2 before feature 1.

- `T0.1` baseline commit of the scaffold.
- `T0.2` `apps/api` dependencies plus a **mandatory** ESM interop smoke check of the named imports;
  a fallback to `zod` was pre-described in case it failed.
- `T0.3` Vitest in `apps/web` plus the root `test:auth-login` / `test:home-dashboard` scripts.
  `--passWithNoTests` is required because `apps/web` has no spec files yet — and it must live in
  exactly one place, since `vitest@4.1.11` fails on a second occurrence. No `--` between
  `pnpm -r test` and `-t`, or the filter is disabled and the root package recurses into itself.
- `T0.4` the env contract, with a first-line comment in `apps/api/.env.example` saying the file is
  not read — without it the file looks like a working configuration mechanism, which it is not.
- `T0.5` `playwright.config.ts`: route projects by filename suffix and pass `API_URL` / `JWT_SECRET`
  through `webServer.env`. Kill the old dev servers afterwards, or `reuseExistingServer` reuses a
  process that never sees the new variables.
- `T0.6` the regression suite scaffold: `e2e/README.md`, the convention meta-test, the fixtures, the
  move of `health.spec.ts` into `e2e/smoke/` **with its title renamed** to start with `SM-API-01`,
  the documentation updates (`CLAUDE.md` and the `playwright-verify` skill still pointed at the old
  directories), and the ESLint change raising four `eslint-plugin-playwright` rules to `error` —
  in the preset they are `warn`, and ESLint exits 0 on warnings.
  `e2e/smoke/seed.api.spec.ts` is **not** created here: a knowingly red smoke would make the
  acceptance DoDs unreachable. There are no red tests in commits — a test is either green or not yet
  written.
- `T0.7` the T0 commit, preceded by a separate formatting commit so reformatting does not mix with
  the feature diff.

**T1 — feature 1, the login page** (branch `feat/auth-login`): passwords and users; the auth module
(one and the same message for an unknown email and a wrong password); the unit specs; the API specs
plus `SM-API-02`; the web session layer and API client; the Server Actions; the page and the form
(no `required`, email as `type="text"`); the functional specs; acceptance, a separate fix task, and
the merge.

**T2 — feature 2, the home page** (branch `feat/home-dashboard`): the meetings module with the
in-memory store; the controller and DTOs plus `SM-API-03`; the unit specs; the API specs; the DAL
and the meetings Server Action; `proxy.ts`; the page, the list, the creation form and the sign-out
button; the functional specs; the control experiments; acceptance and the merge.

---

## 5. Dependency graph, ## 6. Verification pipeline

The task graph was strictly sequential between features and parallel only where files did not
overlap. Review 2 and the later pipeline audit both found that the graph produced formally
independent tasks that in fact shared files (`app.module.ts`, `e2e/README.md`, the unit cases doc),
which is why the current plan template has a mandatory "files" column.

The per-feature verification pipeline had ten numbered steps from cheapest to most expensive. It was
later replaced by "one green `pnpm verify`" plus a diagnostic ladder — see `FX-014`.

---

## 7. Risks and pitfalls

The twenty-four risks recorded here are the origin of most of today's invariants in `CLAUDE.md`.
The ones that proved load-bearing:

1. **A cookie's `secure` follows the environment, but not for the usual reason.** Verified by probe:
   Chromium **accepts and sends** a `Secure` cookie on `http://127.0.0.1` — loopback is a trustworthy
   origin — so `secure: true` does not by itself break e2e, and the common explanation is wrong. It
   still follows `NODE_ENV`, because an unconditional `true` breaks any environment where loopback is
   not trustworthy. Diagnostic consequence: an endless `/` ↔ `/auth/login` redirect is risk 18 or the
   proxy matcher, **not** `secure` — a false explanation is more dangerous than none.
2. **`middleware.ts` is deprecated in Next 16**: the file is `src/proxy.ts`, the export is `proxy`,
   and `config.runtime` throws.
3. **The proxy matcher also covers Server Actions**, which are POSTs to the same path. Hence: the
   reverse redirect is `GET`-only, and the session is checked **inside every** Server Action.
4. **`cookies()` is async and cannot be written during a render.** `.set`/`.delete` throw outside a
   Server Action or a Route Handler, so a user cannot be signed out from `page.tsx`.
5. **Nest answers POST with 201 by default** — one line, caught only by a status assertion.
6. **`import 'server-only'` does not resolve under Vitest.** Hence pure modules without it, and
   `session.ts`/`dal.ts` with it and without units.
7. **`emitDecoratorMetadata` under Vitest** was verified to work here; if a new spec fails on DI, pass
   the dependencies explicitly rather than fighting the transpiler.
8. **The in-memory store and `nest start --watch`**: any edit restarts the process and wipes created
   meetings, so no test may depend on another's data, and `JWT_SECRET` must be a stable constant.
9. **`fullyParallel: true` plus a mutating `POST /meetings`**: three measures — a dedicated owner per
   mutating spec, never mutating `teacher`/`student`, and finding a new meeting by a unique generated
   title rather than by `total`; with a `serial` block as a backstop.
10. **A reused dev server without the new env** gives a result that is false in either direction.
11. **Ports**: dev 3000/3001, Playwright 3100/3101 — never move the config to 3000/3001.
12. **HMR console noise** must be filtered, or two console cases flake.
13. **Fetch caching**: `cache: 'no-store'` explicitly, plus `revalidatePath('/')` after creating a
    meeting, or the client router cache shows a stale list.
14. **Type-aware ESLint in `apps/api`** makes `no-unsafe-*` and `no-floating-promises` errors.
15. **`next typegen` before `tsc`**; new pages without `PageProps<…>`.
16. **`next/font/google` needs the network on the first build** — an offline `webServer` timeout is a
    server failure, not a Playwright or feature bug.
17. **`class-validator`/`class-transformer` are CJS in an ESM app** — hence the T0.2 smoke check.
18. **`redirect()` inside a `try` does not work**: it throws `NEXT_REDIRECT`, which a `catch`
    swallows. The symptom is "login does nothing but the cookie is set".
19. **A `'use server'` file may export only async functions** — hence `lib/types.ts` and
    `lib/session-cookie.ts`.
20. **`required` and `type="email"` hide the server validation** and turn two cases into tests of the
    browser.
21. **Git without a remote**: a "PR" here is a local branch and `git merge --no-ff`.
22. **The existing green tests are a constraint**: `GET /` → `Hello World!` forbids a global prefix
    and deleting `AppController`; the old home spec is why `proxy.ts` and rewriting `/` belong to
    feature 2.
23. **Cyrillic in assertions** was safe (`.editorconfig` sets `charset = utf-8`), but API error
    messages were compared by code and body shape rather than by text. (Moot since `CH-014`.)
24. **`apps/web/AGENTS.md` is rewritten by `next dev`** — commit it separately and do not revert it.

---

## 8. Objections and deliberate assumptions

**Objections to the decisions taken.** (1) `middleware.ts` → `proxy.ts` is a correction of fact, not
an argument. (2) `class-validator` is not free in an ESM Nest — `zod@4` would have been preferable,
but the plan is built on `class-validator` and the insurance is the T0.2 smoke check with a
pre-described fallback, so the cost of being wrong is one task rather than a rewrite. (3) Two seed
users are not enough under parallel mutating writes — hence four. (4) `ValidationPipe` goes through
`APP_PIPE`, or the test modules disagree with the real server.

**Deliberate assumptions and scope extensions**, each named out loud:

1. **`/auth/register` is a placeholder.** The spec asks only for a link; a link into a 404 cannot be
   checked functionally, so the page exists with a heading, an explanation and a way back.
2. **The "Create meeting" button actually works.** The spec asks only for a button, but a dead button
   cannot be checked functionally — hence `POST /meetings`, a Server Action and `revalidatePath('/')`.
   A minimal form only: no editing, deleting, attendees or overlap checks.
3. **Seed passwords are plaintext** in one file and hashed at startup; the store itself holds none.
4. **`JWT_SECRET` has a default in code** (with a warning). Unacceptable for production; there is no
   production deployment here.
5. **The cookie token is not additionally encrypted** — a separate `jose`/`iron-session` layer would
   only add a dependency.
6. **No refresh tokens, "remember me", rate limiting or CSRF tokens.** The session lives an hour with
   `sameSite: 'lax'`, and Next wraps Server Actions in its own cross-origin POST protection.
7. **The meeting display time zone is pinned to UTC** so tests are machine-independent; a real user's
   local zone is a separate task.
8. **No React component tests.** The UI is covered by Playwright; Vitest covers only pure helpers.
9. **No pluralization of the meeting counter.** The counter is a fixed string; the helper would be
   dead code and its units would test it.

---

## 9–12. Reconciliation and change logs

The original document ended with a reconciliation of the two plans and three change logs — the edits
made after review 1, after review 2, and after the implementation itself. Their content is preserved
in the review documents ([plan-review-1](plan-review-1.md), [plan-review-2](plan-review-2.md),
[plan-review-3](plan-review-3.md)) and, where it became a rule, in the `CLAUDE.md` invariants and in
the `docs/CHANGELOG.md` defect entries — which is where it should be read from today.
