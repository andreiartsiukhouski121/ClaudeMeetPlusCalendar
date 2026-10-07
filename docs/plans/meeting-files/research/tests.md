# Tests sweep — `meeting-files`

Files read directly: 45 (listed inline by path as cited below), plus repo-wide `grep` sweeps over
`e2e/`, `apps/`, `docs/` for `multipart`, `upload`, `octet-stream`, `formdata`, `bytea`, `Bytes`,
`prisma`, `docker-compose`. No test was run; no file outside this one was written.

## Scope of this sweep

The requirement adds meeting file attachments (upload + list) and moves the whole domain (users
_and_ meetings) from the in-memory seed to PostgreSQL via Prisma, docker-compose, bytes in a
`Bytes`/`bytea` column. This sweep records what the existing regression suite, its fixtures, its
meta-tests and its run configuration already assert and support — specifically everything that
reads a seeded value, a count, or depends on the in-memory nature of the store, since a move to a
real database is exactly the kind of change those assertions are built to catch if anything drifts.

---

## 1. What covers meetings and auth today, at every level

### `e2e/regression/auth-login/`

- `auth-login.api.cases.md` + `auth-login.api.spec.ts` — 11 cases (`AL-API-01…04,07,08,10,11,13,14,15`),
  project `api`. Asserts: 200 on login with `@HttpCode` (`AL-API-01`), identical 401 body text for a
  wrong password and an unknown email (`AL-API-02`, `AL-API-03`), 400 shapes for missing/empty/bad
  fields and `forbidNonWhitelisted` (`AL-API-04,07,08`), case-insensitive email (`AL-API-10`), no
  password/hash in the response text (`AL-API-11`), `GET /auth/me` profile shape and 401s
  (`AL-API-13,14,15`). All assertions read `SEED_USERS.teacher` from `e2e/fixtures/seed.ts` — no
  literal seed values in the spec itself.
- `auth-login.functional.cases.md` + `auth-login.functional.spec.ts` — 10 cases
  (`AL-FN-01…06,08,10,13,14`), project `web`. UI form rendering, successful login redirect and
  cookie, error states, sign-up link, console cleanliness, password masking, httpOnly cookie
  (`AL-FN-13`), invalid email format. Uses `SEED_USERS.teacher` only.
- `auth-login.unit.cases.md` — 28 cases (`AL-UT-01…11,13…15,17,19…31`), across
  `apps/api/src/auth/auth.service.spec.ts`, `apps/api/src/common/crypto/password.spec.ts`,
  `apps/api/src/auth/token.service.spec.ts`, `apps/api/src/users/users.service.spec.ts`,
  `apps/api/src/auth/jwt-auth.guard.spec.ts`, `apps/web/src/lib/session.spec.ts`,
  `apps/web/src/lib/api-client.spec.ts`, `apps/web/src/lib/login-credentials.spec.ts`. These are unit
  tests of `AuthService`, `UsersService`, `TokenService`, the crypto module and guard — none of them
  reads the seed; they build their own fixtures/mocks (`auth-login.unit.cases.md:80` "mocks, not a
  container").

### `e2e/regression/home-dashboard/`

- `home-dashboard.api.cases.md` + `home-dashboard.api.spec.ts` — 16 cases
  (`HD-API-01…10,13…17,20`), project `api`. Heavily seed-dependent: list/total/sorting/isolation for
  `teacher`/`student`, limit validation, and mutating `POST /meetings` cases run as `planner`
  (`home-dashboard.api.cases.md:10-16`). See the table in §2 for every seeded-value assertion.
- `home-dashboard.functional.cases.md` + `home-dashboard.functional.spec.ts` — 18 cases
  (`HD-FN-01…11,14,16…21`), project `web`. Dashboard rendering, counter text, ordering, create-meeting
  flow (mutates `organizer`), sign-out, empty state for `student`, BFF isolation check (`HD-FN-11`),
  nav rail (`HD-FN-17,18`), hero banner (`HD-FN-19`), overview tile (`HD-FN-20,21`).
- `home-dashboard.unit.cases.md` — 13 cases (`HD-UT-01…09` in
  `apps/api/src/meetings/meetings.service.spec.ts`, `HD-UT-10,11,15,16` in
  `apps/web/src/lib/format-date.spec.ts`). Unit data is created through `create()` under
  `usr-unit-*` owners rather than the seed (`home-dashboard.unit.cases.md:41-44`) — these do **not**
  depend on seed content, only on service behaviour.

### `e2e/regression/meetings-detail/`

- `meetings-detail.api.cases.md` + `meetings-detail.api.spec.ts` — 7 cases
  (`MD-API-01…07`), project `api`. By-id reads, 401/404 shapes (including the byte-identical
  unknown-vs-foreign-owner 404, `ADR-0018`), Express fallthrough on a malformed path, `participants`
  storage/normalization/rejection. Mutating cases run as `planner`. **No `.functional.*` pair exists
  — deliberate** per `e2e/README.md:197-198` ("meetings-detail is the worked example" of a feature
  with no UI-level pair).
- `meetings-detail.unit.cases.md` — 9 cases (`MD-UT-01…09`), all added into the _existing_
  `apps/api/src/meetings/meetings.service.spec.ts` (shared file with `HD-UT-*`). Data for
  `MD-UT-01…08` is created via `create()` under dedicated owners; `MD-UT-09` is the one case that
  reads the **seed array itself** (`SEED_MEETINGS`) to prove the constructor's copy is not a shared
  reference (`meetings-detail.unit.cases.md:36-41`).

### `e2e/smoke/`

- `health.api.cases.md` + `health.api.spec.ts` — `SM-API-01`, `GET /` → `Hello World!`. No seed
  dependency.
- `seed.api.cases.md` + `seed.api.spec.ts` — `SM-API-02` (all four seeded users log in),
  `SM-API-03` (teacher has `total=5`, all five titles present, each title's `participants` array
  matches `TEACHER_MEETINGS.participants[title]` verbatim; student has `total=0`). This file's
  **entire purpose** is to fail first and clearly when the seed drifts (`seed.api.cases.md:12-15`) —
  it is the smoke test that would go red first under a backing-store change that altered seed
  content, ordering, or shape.

### `e2e/security/`

- `security.api.cases.md` + `security.api.spec.ts` — 10 cases (`SEC-API-01…10`). `SEC-API-01` walks
  `PROTECTED_ROUTES` (verbatim list in §9 below); `SEC-API-09` compares `teacher`/`student` meeting id
  sets and relies on `teacher` having at least one meeting (`idsOf` + `expect(teacherIds.length)
.toBeGreaterThan(0)` at `security.api.spec.ts:321`) and cites `TEACHER_MEETINGS.total` indirectly
  through `HD-API-06` ("duplicates `HD-API-06` on purpose", `security.api.cases.md:129`).
- **`SEC-API-10` — "the repository holds no secrets and no .env"**
  (`e2e/security/security.api.spec.ts:350-354`). Added at the `FEAT-G1` review: the first version of
  this sweep enumerated `SEC-API-01…10` but never said what case 10 asserts, and scoping decision 2
  introduces a connection string and a database password. The case calls
  `collectSecretOffenders(findRepoRoot())` (`:351`) and asserts the result is empty. That helper
  (`:392`) walks the repository and pushes an offender when:
  - a path matches `/(^|\/)\.env($|\.)/` and does not end `.env.example` — message
    "`<rel>`: a .env file must not reach the repository" (`:413-414`). **So any `.env` committed to the
    repository fails `pnpm verify` at the `pnpm e2e` step.** `.env.example` is the only exempt form.
  - a scanned file contains `-----BEGIN [A-Z ]*PRIVATE KEY-----` (`:424`) or a string matching
    `\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}` — "looks like an issued JWT"
    (`:428-429`).
  - `SCANNED_EXTENSIONS` (`:389`) is `/\.(ts|tsx|js|mjs|cjs|json|md|yaml|yml|css|env|example|mts)$/`,
    so `.env`-extension files and `.yml` files are both scanned for those two patterns — a
    `docker-compose.yml` is in scope for the key/JWT checks.
  - `e2e/security/security.api.spec.ts` itself is skipped (`:408-410`) so the case does not catch
    itself.
- `security.functional.cases.md` + `security.functional.spec.ts` — 5 cases (`SEC-FN-01…05`), walks
  `PROTECTED_PAGES = ['/']` (verbatim, §9 below).

### `e2e/accessibility/`

- `accessibility.functional.cases.md` + `accessibility.functional.spec.ts` — 4 cases
  (`ACC-FN-01…04`), walks `AUDITED_PAGES` (`/auth/login`, `/auth/register`, `/` —
  `accessibility.functional.spec.ts:25-29`). `ACC-FN-02` requires the dashboard to actually render
  for a signed-in `teacher` before scanning.

---

## 2. Case IDs that assert seeded values or counts

Every row below would need re-verification (not necessarily rewriting) against whatever the
Postgres-backed seed produces, because each depends on an exact seeded email, title, count, id
shape, or ordering.

| Case ID               | File:line                                                                                     | The seeded value or count it asserts                                                                                                                                                                                                                                             |
| --------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AL-API-01`           | `e2e/regression/auth-login/auth-login.api.spec.ts:35-50`                                      | `SEED_USERS.teacher.email`/`.password` log in; token is 3 dot-separated segments                                                                                                                                                                                                 |
| `AL-API-02`           | `auth-login.api.spec.ts:52-77`                                                                | `TEACHER.email` with a wrong password                                                                                                                                                                                                                                            |
| `AL-API-03`           | `auth-login.api.spec.ts:79-100`                                                               | unknown email vs `TEACHER.email` + wrong password, identical message                                                                                                                                                                                                             |
| `AL-API-10`           | `auth-login.api.spec.ts:162-179`                                                              | `TEACHER.email.toUpperCase()`; `/auth/me` returns the canonical `TEACHER.email`                                                                                                                                                                                                  |
| `AL-API-11`           | `auth-login.api.spec.ts:181-195`                                                              | response text excludes `TEACHER.password` literal                                                                                                                                                                                                                                |
| `AL-API-13`           | `auth-login.api.spec.ts:197-210`                                                              | `body.email` equals `TEACHER.email`                                                                                                                                                                                                                                              |
| `SM-API-02`           | `e2e/smoke/seed.api.spec.ts:22-36`                                                            | all four `SEED_USER_KEYS` (`teacher`,`student`,`planner`,`organizer`) log in                                                                                                                                                                                                     |
| `SM-API-03`           | `e2e/smoke/seed.api.spec.ts:38-96`                                                            | `teacher.total = 5`; all 5 titles present (`TEACHER_MEETINGS.latestTitles` + `.omittedTitles`); per-title `participants` arrays (`TEACHER_MEETINGS.participants`) verbatim, order included; `student.total = 0`, `student.meetingsCount = 0`                                     |
| `HD-API-01`           | `e2e/regression/home-dashboard/home-dashboard.api.spec.ts:82-113`                             | `items.length > 0`; exact key set `['durationMinutes','id','participants','startsAt','title']`; no `ownerId`/`passwordHash`/`TEACHER.password` in text                                                                                                                           |
| `HD-API-03`           | `home-dashboard.api.spec.ts:130-135`                                                          | `limit=TEACHER_MEETINGS.latestLimit(3)` → `items.length === 3`                                                                                                                                                                                                                   |
| `HD-API-04`           | `home-dashboard.api.spec.ts:137-149`                                                          | DESC order; titles equal `TEACHER_MEETINGS.latestTitles` (`'Module wrap-up session'`, `'Pre-exam consultation'`, `'Geometry workshop'`); `TEACHER_MEETINGS.omittedTitles` (`'Homework review'`, `'Intro to algebra'`) absent                                                     |
| `HD-API-05`           | `home-dashboard.api.spec.ts:151-166`                                                          | `total === TEACHER_MEETINGS.total (5)`; `total !== items.length`                                                                                                                                                                                                                 |
| `HD-API-06`           | `home-dashboard.api.spec.ts:169-184`                                                          | `studentPage.total === SEED_USERS.student.meetingsCount (0)`; `teacherPage.total === TEACHER_MEETINGS.total (5)`; disjoint id sets                                                                                                                                               |
| `HD-API-07`           | `home-dashboard.api.spec.ts:186-197`                                                          | `student` → `items: []`, `total: 0`                                                                                                                                                                                                                                              |
| `HD-API-10`           | `home-dashboard.api.spec.ts:232-255`                                                          | default (no `limit`) → `items.length === TEACHER_MEETINGS.latestLimit (3)`, `total === TEACHER_MEETINGS.total (5)`; `limit=100` → `items.length === TEACHER_MEETINGS.total (5)`                                                                                                  |
| `HD-API-13`           | `home-dashboard.api.spec.ts:272-299`                                                          | created meeting's title appears in `planner`'s top-3 after insert dated `FUTURE_STARTS_AT_ISO` (2030)                                                                                                                                                                            |
| `HD-API-17`           | `home-dashboard.api.spec.ts:375-402`                                                          | `teacherPage.total === TEACHER_MEETINGS.total (5)` after a `planner`-owned insert (isolation)                                                                                                                                                                                    |
| `HD-FN-02`            | `home-dashboard.functional.spec.ts:131-142`                                                   | heading contains `TEACHER.email`                                                                                                                                                                                                                                                 |
| `HD-FN-03`            | `home-dashboard.functional.spec.ts:144-161`                                                   | counter text `Meetings total: <reference.total>`; `reference.total === TEACHER_MEETINGS.total (5)`; `reference.total !== reference.items.length`                                                                                                                                 |
| `HD-FN-04`            | `home-dashboard.functional.spec.ts:163-170`                                                   | list item count === `TEACHER_MEETINGS.latestLimit (3)`                                                                                                                                                                                                                           |
| `HD-FN-05`            | `home-dashboard.functional.spec.ts:172-194`                                                   | UI order equals API order equals `TEACHER_MEETINGS.latestTitles`; `omittedTitles` hidden on page                                                                                                                                                                                 |
| `HD-FN-09`            | `home-dashboard.functional.spec.ts:340-355`                                                   | `student`: heading contains `STUDENT.email`; `Meetings total: 0`; 0 list items                                                                                                                                                                                                   |
| `HD-FN-14`            | `home-dashboard.functional.spec.ts:220-233`                                                   | list item count === `TEACHER_MEETINGS.latestLimit (3)`                                                                                                                                                                                                                           |
| `HD-FN-18`            | `home-dashboard.functional.spec.ts:260-275`                                                   | exactly one `list` role on page; nav holds 0 listitems                                                                                                                                                                                                                           |
| `HD-FN-20`            | `home-dashboard.functional.spec.ts:316-335`                                                   | overview tile reads `<items.length> of <total> shown` — for the seed literally `3 of 5 shown`                                                                                                                                                                                    |
| `HD-FN-21`            | `home-dashboard.functional.spec.ts:357-367`                                                   | `student`: overview tile reads `0 of 0 shown`                                                                                                                                                                                                                                    |
| `HD-UT-03`            | `home-dashboard.unit.cases.md:49-51` (spec: `apps/api/src/meetings/meetings.service.spec.ts`) | `countByOwner` full count (5, via its own `usr-unit-*` fixture, not the seed) — count semantics only, not a seeded literal                                                                                                                                                       |
| `MD-API-01`           | `meetings-detail.api.spec.ts:82-102`                                                          | `teacher` has at least one seeded meeting (`expect(listItem).toBeDefined()`)                                                                                                                                                                                                     |
| `SEC-API-01`          | `e2e/security/security.api.spec.ts:62-87`                                                     | walks `PROTECTED_ROUTES` (verbatim in §9); body excludes `SEED_USERS.teacher.email`                                                                                                                                                                                              |
| `SEC-API-04`          | `security.api.spec.ts:128-151`                                                                | `SECRET_MARKERS` includes `SEED_USERS.teacher.password`                                                                                                                                                                                                                          |
| `SEC-API-05`          | `security.api.spec.ts:153-213`                                                                | `SEED_USERS.teacher.email` used for the "known email, wrong password" timing arm                                                                                                                                                                                                 |
| `SEC-API-07`          | `security.api.spec.ts:250-262`                                                                | `POST_ROUTES` valid bodies use `SEED_USERS.teacher.email`/`.password`                                                                                                                                                                                                            |
| `SEC-API-09`          | `security.api.spec.ts:278-347`                                                                | `teacherIds.length > 0`; `studentIds` empty; disjoint reachability                                                                                                                                                                                                               |
| `SM-API-03`'s mirrors | `e2e/fixtures/seed.ts:67-106`                                                                 | `TEACHER_MEETINGS` (`total: 5`, `latestLimit: 3`, 5 titles with dates, `participants` per title), `PLANNER_MEETING_PARTICIPANTS`, `ORGANIZER_MEETING_PARTICIPANTS`, `FUTURE_STARTS_AT_ISO = '2030-01-01T10:00:00.000Z'` — the fixture mirror itself, source of every value above |

Also id-shape dependent (not a seeded value per se, but depends on the current `usr-*`/`mtg-*` id
scheme that a Postgres migration might replace with UUIDs or serial ids):

- `HD-UT-07` (`home-dashboard.unit.cases.md:57-58`) — asserts a created id does **not** match the
  seeded `mtg-*` shape; a changed id scheme on the seed side does not break this one, but any
  assertion elsewhere relying on the literal prefix `usr-` or `mtg-` would (none found beyond this).
- `e2e/security/security.api.spec.ts:109-110` (`SEC-API-03`) hardcodes `sub: 'usr-teacher'` in a
  forged JWT payload — this is a literal id in a spec, tied to `apps/api/src/users/users.seed.ts:29`
  (`id: 'usr-teacher'`).
- `home-dashboard.api.spec.ts:362` (`HD-API-16`) and `security.api.spec.ts` `POST_ROUTES` also post
  `ownerId: 'usr-teacher'` as the rejected-spoofing literal.

---

## 3. `e2e/fixtures/seed.ts` and related fixtures

- `e2e/fixtures/seed.ts:1-9` states explicitly: "Mirror of the `apps/api` seed — the single source
  of truth for tests. Hard-coding a login, password or meeting title inside a spec is a review
  blocker… This file deliberately imports nothing from `apps/api`: the suite treats the server as a
  black box over HTTP, and an import would make the assertion a tautology."
- Exports: `SeedUserKey`, `SeedUser`, `SEED_USERS` (4 users: `teacher`, `student`, `planner`,
  `organizer`, each with `email`/`password`/`name`/`meetingsCount`), `SEED_USER_KEYS`,
  `TEACHER_MEETINGS` (`total`, `latestLimit`, `latestTitles`, `omittedTitles`, `participants`),
  `PLANNER_MEETING_PARTICIPANTS`, `ORGANIZER_MEETING_PARTICIPANTS`, `FUTURE_STARTS_AT_ISO`,
  `FUTURE_STARTS_AT_LOCAL`.
- Imported by (grep over all specs reading `fixtures/seed.js`): every `*.api.spec.ts` and
  `*.functional.spec.ts` under `e2e/regression/**`, `e2e/smoke/seed.api.spec.ts`,
  `e2e/security/security.api.spec.ts`, `e2e/security/security.functional.spec.ts`,
  `e2e/accessibility/accessibility.functional.spec.ts`.
- **The sync mechanism**: `e2e/smoke/seed.api.spec.ts` (`SM-API-02`, `SM-API-03`) is the _only_
  check that compares this mirror against the live server's actual seeded data over HTTP — it is not
  a static diff against `apps/api/src/users/users.seed.ts` / `meetings.seed.ts`, but a live
  assertion. The file headers of both `apps/api/src/users/users.seed.ts:1-9` and
  `apps/api/src/meetings/meetings.seed.ts:1-14` state "`e2e/fixtures/seed.ts` mirrors these values;
  any drift is caught by `SM-API-02`/`SM-API-03`." No generator and no second automated diff exists;
  the mirror is hand-kept in sync and the smoke spec is the enforcement.
- `e2e/fixtures/api.ts` — exports `ApiOptions` (`apiBaseURL`), `isNestRequest(url, apiBaseURL)`, and
  the `test`/`apiRequest` fixture: a Nest request context for `web`-project cases needing baseline
  data (`api.ts:44-64`). `apiBaseURL` has no default — an empty value throws naming the fix
  (`api.ts:24-33`), deliberately, to prevent a second copy of the port formula (FX-023 in comments).
- `e2e/fixtures/auth.api.ts` — `loginApi(request, user)` with a per-worker `tokenCache`
  (`auth.api.ts:19-56`), `authHeaders`, `authHeadersFor`. The 200 expectation is inside the helper so
  a seed failure names itself as a seed problem, not a case failure (`auth.api.ts:38-43`).
- `e2e/fixtures/auth.fixture.ts` — `authUser` (test option, default `'teacher'`), `authStateFor`
  (worker-scoped function caching `storageState` paths per user), `authedPage` (test fixture, fresh
  context per test from the cached state). UI login walks the real form path rather than forging a
  cookie (`auth.fixture.ts:9-13`).
- `e2e/fixtures/console.ts` — `collectConsoleProblems(page)` filtering `DEV_SERVER_NOISE` patterns
  (`/\/_next\/hmr/`, `/WebSocket connection to/`); used by `AL-FN-08`, `HD-FN-10`.

---

## 4. `playwright.config.ts` (full)

Read in full at `C:\GIT\PurpleSchool\playwright.config.ts` (99 lines). Key facts, with line numbers:

- `testDir: './e2e'` (line 22), `fullyParallel: true` (23), `forbidOnly: isCI` (24),
  `retries: isCI ? 2 : 0` (25), `workers: isCI ? 1 : undefined` (26), `timeout: 60_000` (28),
  `expect: { timeout: 10_000 }` (29), `reporter: [['list'], ['html', { open: 'never' }]]` (30).
- `use.apiBaseURL = API_URL` (line 37) — the **only** place the Nest address is set for the suite
  option mechanism.
- Three projects (lines 45-65): `api` (`testMatch: /.*\.api\.spec\.ts$/`, `baseURL: API_URL`), `web`
  (`testMatch: /.*\.functional\.spec\.ts$/`, Desktop Chrome, `baseURL: WEB_URL`), `integration`
  (`testMatch: /.*\.integration\.spec\.ts$/`, `baseURL: API_URL`, no browser). A file not matching
  any of the three `testMatch` patterns joins **no** project (comment at lines 52-54).
- `webServer` is an **array of exactly two entries** (lines 69-98):
  1. web: `command: pnpm dev --port ${WEB_PORT}`, `cwd: 'apps/web'`, `env: { API_URL }`,
     `url: WEB_URL`, `reuseExistingServer: !isCI`, `timeout: 180_000`.
  2. api: `command: 'pnpm dev'`, `cwd: 'apps/api'`, `env: { PORT: API_PORT, JWT_SECRET: 'e2e-secret' }`,
     `url: API_URL`, `reuseExistingServer: !isCI`, `timeout: 120_000`.
- **No `globalSetup` or `globalTeardown` field is present anywhere in the file.** The config has no
  hook that runs before either `webServer` entry comes up and no mechanism recorded here for
  ensuring a third process (e.g. a database container) is ready first — this is what the config
  supports today: two `webServer` entries, no dependency ordering between them beyond list order,
  and no setup/teardown hook of any kind.
- `E2E_WEB_PORT` / `E2E_API_PORT` are read once each, at lines 15-16: `process.env.E2E_WEB_PORT ??
'3100'`, `process.env.E2E_API_PORT ?? '3101'`, and used to build `WEB_URL`/`API_URL` consumed by
  both the project `use.baseURL`s and the `webServer` `url`/`env` fields. No other environment
  variables are read in this file.
- Comment at lines 67-68 explains `cwd: 'apps/web'` + `pnpm dev` rather than the root
  `pnpm dev:web`: "fewer process layers for Windows `taskkill /T /F` to orphan and leave a port
  occupied."

---

## 5. `pnpm verify`, pre-commit, and the supertest layer

`package.json:36` — the exact ordered `verify` script:

```
pnpm check:orientation && pnpm lint && pnpm typecheck && pnpm test && pnpm --filter @purpleschool/api test:e2e && pnpm format:check && pnpm e2e && pnpm audit --audit-level high
```

In order: `check:orientation` (`scripts/check-orientation.mjs`) → `lint` (`eslint . && pnpm -r
lint`) → `typecheck` (`tsc --noEmit -p tsconfig.json && pnpm -r typecheck`) → `test` (`pnpm -r
test`, i.e. Vitest units in both apps) → `pnpm --filter @purpleschool/api test:e2e` (the supertest
module-boot spec, see below) → `format:check` (`prettier --check .`) → `e2e` (`playwright test`,
all projects) → `audit` (`pnpm audit --audit-level high`).

`.husky/pre-commit` (25 lines): runs `check-orientation.mjs`, then `pnpm lint-staged`
(`eslint --fix` + `prettier --write` on staged files), then `pnpm test` (the whole unit suite) **unless**
the staged diff is `.md`-only, in which case units are skipped (lines 20-24). No Playwright, no
e2e, no docker step of any kind in the hook.

`apps/api/test/app.e2e-spec.ts` (29 lines) — boots `AppModule` through
`Test.createTestingModule({ imports: [AppModule] }).compile()`, creates a Nest application, and
asserts exactly one thing: `GET /` → `200` + body `'Hello World!'`. Run via
`apps/api/package.json:21`, `"test:e2e": "vitest run --config ./vitest.config.e2e.ts"`. Per
`e2e/README.md:291-295` / the monorepo CLAUDE.md, new HTTP contract checks go to
`e2e/regression/<feature>/<feature>.api.spec.ts`, not here — this file exists "to prove `AppModule`
boots in a test module," nothing more.

`apps/api/vitest.config.e2e.ts` (11 lines): `resolve.tsconfigPaths: true`, `test.globals: true`,
`test.root: './'`, `test.include: ['**/*.e2e-spec.ts']`. Entirely separate include pattern from the
regular `apps/api/vitest.config.ts` (`include: ['**/*.spec.ts']`), so a `.spec.ts` file never runs
under this config and vice versa.

---

## 6. Vitest configuration, both apps

- `apps/api/vitest.config.ts` (11 lines): `resolve.tsconfigPaths: true`, `test.globals: true`,
  `test.root: './'`, `test.include: ['**/*.spec.ts']`. No `environment` set (defaults to Node), no
  setup files.
- `apps/web/vitest.config.ts` (17 lines): `resolve.tsconfigPaths: true`; `test.environment: 'node'`
  (explicitly, not jsdom — comment: "React components are covered by Playwright… neither jsdom nor
  @testing-library is needed"); `test.include: ['src/**/*.spec.ts']`; `globals` is **off**
  (comment at lines 8-9: "enabling them would mean adding `types` to `apps/web/tsconfig.json` and
  arguing with eslint-config-next"). No setup files are configured in either config.
- **Invariant 14 handling**: neither config stubs or aliases `server-only`. The comment in
  `apps/web/vitest.config.ts:11-12` states the consequence directly: "files importing `server-only`
  (`session.ts`, `dal.ts`) have no units — Next aliases that import to a compiled module Vitest
  cannot resolve." There is no mock/alias mechanism anywhere in the config for it; the convention is
  instead to keep testable logic in modules that do not import `server-only` (`api-client.ts`,
  `session-cookie.ts`, `format-date.ts`, `login-credentials.ts`), confirmed by the file list in
  `auth-login.unit.cases.md:49-54`.

---

## 7. `e2e/suite-integrity.api.spec.ts` (full read, 609 lines)

Ten numbered rules, each its own test, plus two self-checks ("walk self-check", "ID prefixes are
registered"). Verbatim constants:

- `SELF_EXEMPT = ['suite-integrity.api.spec.ts']` (line 26).
- `UNIT_SPEC_EXEMPT = ['apps/api/src/app.controller.spec.ts']` (line 32).
- `KNOWN_CASE_PREFIXES = ['AL', 'HD', 'SM', 'SEC', 'LG', 'PR', 'AR', 'MD', 'ACC']` (line 43). **A
  `meeting-files` feature needs a new prefix added here before any case ID using it is recognized —
  otherwise rules 5-7 (below) go vacuously green** per the file's own comment at lines 38-42.
- `CASE_ID_SOURCE` pattern requires `<PREFIX>-(API|FN|UT|INT)-\d{2,3}` (line 51).
- `NOT_AUTOMATED_MARKER = /^\s*-\s*\*\*Not automated:\*\*/` (line 63) — the **only** recognized
  syntax for a deliberately unautomated case (rule 5, line 356).

Rules, by line:

1. (266-281) Every `.spec.ts` under `e2e/` ends in `.api.`/`.functional.`/`.integration.spec.ts`
   (except `SELF_EXEMPT`), or it joins no Playwright project.
2. (283-292) Every spec has a paired `.cases.md` of the same stem.
3. (294-303) Every `.cases.md` (except `*.unit.cases.md`) has a paired spec.
4. (305-321) Unit spec paths named in a `*.unit.cases.md` exist on disk.
5. (323-362) Every case ID declared (heading or summary-table row) in a `.cases.md` appears in its
   paired spec, unless marked `- **Not automated:**`.
6. (364-382) No duplicate case ID within a `.cases.md` (heading or table row).
7. (384-405) A unit case ID listed under a spec path actually appears in that spec file's text.
8. (407-422) Every unit spec under `apps/**/src/**` is mentioned in some `*.unit.cases.md`, except
   `UNIT_SPEC_EXEMPT`.
9. (424-459) No spec recomputes the server address (`process.env.E2E_` reads or a quoted
   `http://127.0.0.1` literal) outside the config.
10. (461-496) A level tag (`@api`/`@e2e`/`@integration`) present in a spec's text matches its
    filename suffix.

**Reframed at the `FEAT-G1` review.** This paragraph previously reasoned from a hypothesised `MF-`
prefix and an `e2e/regression/meeting-files/` directory. Neither exists, and presuming them is design.
The obligations themselves are facts about the rules above, so they are kept, stated without the
presumed shape:

- Any case-ID prefix not in `KNOWN_CASE_PREFIXES` (line 43) is invisible to rules 5-7 — the nine
  registered prefixes are listed in §7 above.
- Every `.cases.md` needs a `.spec.ts` of the same stem and the reverse (rules 2-3).
- Heading and table IDs must match the spec text (rules 5-6).
- A unit spec must be listed under some `.unit.cases.md` or be in `UNIT_SPEC_EXEMPT` (rules 4, 7, 8).
- No spec may recompute the server address (rule 9).
- A level tag in a spec's text must match its filename suffix (rule 10).

Which of those a new feature triggers depends on what it adds, which is not decided here.

---

## 8. Meta-tests touched by a change of this size

### `e2e/architecture/architecture.api.spec.ts` (full read, 1177 lines)

- `violationsContractDrift` (431-467, test `AR-API-05` at 1026-1031) compares every Nest
  `@Controller`/`@Get`/`@Post`/etc. route (scanned from `apps/api/src/**/*.controller.ts` source,
  not a running app — `codeRoutes`, 365-407) against the Routes table in `docs/api-contract.md`
  (`documentedRoutes`, 410-425), **in both directions**, and also compares the guard state
  (`guarded: boolean`) each side records. A new meeting-files upload/list endpoint needs a matching
  row in the `docs/api-contract.md` Routes table with the correct guard marker, or this test fails
  in one of two ways depending on which side is missing the route.
- `violationsProtectedList` (469-494, test `AR-API-06` at 1033-1038) checks every **guarded** route
  found in the controllers is listed in `PROTECTED_ROUTES` inside
  `e2e/security/security.api.spec.ts`. A new guarded upload/list-files route must be added there
  (invariant 16).
- `violationsCasesCitations` (607-624, test `AR-API-09` at 1062-1078) checks every case ID cited in
  the Routes table's Cases column exists in some `.cases.md` under `e2e/`.
- `AR-API-11`…`AR-API-14` (1096-1135) check `FACT-` key uniqueness within its document's numeric
  block, that every keyed fact names a source, that no key sits inside a `> **Rationale**` block, and
  that every `FACT-` reference resolves to a stated (non-retired) fact. A plan/design introducing new
  `FACT-NNNN` entries for the Prisma/docker-compose decision must take numbers via `pnpm fact:next`
  and place them inside the correct document's numeric block (checked by `AR-API-11`).
- `AR-API-01`…`AR-API-04` (998-1024) check ADR file naming/uniqueness, required sections
  (`## Context`/`## Decision`/`## Consequences`), the ADR index/table agreement in both directions,
  and supersession back-links. A new ADR for "move to Prisma/Postgres" must be created with
  `pnpm adr:new`, carry those three sections, and be indexed in `docs/adr/README.md`.
- `AR-API-15`, `AR-API-16` (1137-1155) check the fact lock (`pnpm fact:lock`) agrees with the corpus,
  and that a retired fact names an existing successor or an attributed withdrawal.

### `e2e/ledger/ledger.api.spec.ts` (full read, 373 lines)

- `LG-API-01` (273-283): `docs/CHANGELOG.md` and `docs/BACKLOG.md` exist and are non-empty.
- `LG-API-02` (285-300): entry IDs are unique and carry only the prefixes `FT`/`CH`/`FX` (changelog)
  or `BL` (backlog), three digits.
- `LG-API-03` (302-328): every changelog entry's **last** table column (the commit hash cell) is
  non-empty, and `pending` is only legitimate while the file is uncommitted or the entry was
  introduced by `HEAD` (`stalePendingEntries`, 259-270). A `meeting-files` feature needs a mandatory
  `FT-` entry (or `CH-` for the process-only parts) filled in with a real commit hash after landing.
- `LG-API-04` (330-341): every commit hash cited resolves via `git cat-file -e` (skipped in a
  shallow clone, `isShallowRepository`, 155-166).
- `LG-API-05` (343-357): every open backlog item has its last column ("Conflicts with") filled.
- `LG-API-06` (359-371): no dangling `FT-`/`CH-`/`FX-`/`BL-` reference anywhere under `docs`,
  `.claude/skills`, `e2e`, or `CLAUDE.md`.

### `e2e/process/process.api.spec.ts` (full read, 351 lines)

- `PR-API-01` (260-279): every `TEMPLATE*.md` under `docs/plans/` shares one set of five
  section-0 labels (`REQUIRED_LABELS`, line 57-63: `Duplicate`, `Conflicts with shipped`,
  `Conflicts with planned`, `Architecture impact`, `Open questions`).
- `PR-API-03` (294-299): every change folder under `docs/plans/<slug>/` holds `research/README.md`,
  `design.md`, and `<slug>.plan.md` — already satisfied by `docs/plans/meeting-files/` as scaffolded.
- `PR-API-04` (301-306): no scaffolded file still carries `<!-- fill this in -->` in prose (code
  spans/fences excluded).
- `PR-API-05` (308-320): the scaffolder's file list and `REQUIRED_STAGE_FILES` agree.
- `PR-API-06` (322-327): every file under `docs/plans/<slug>/research/` carries at least one
  evidence pattern (`EVIDENCE_PATTERNS`, 48-54: a file path with extension, an `FT|CH|FX|BL-NNN`, an
  `ADR-NNNN`, a case ID, or a `- **Not found:**` line) — **this file (`tests.md`) is itself checked
  by this rule** once committed.
- `PR-API-07` (343-349): `e2e/scenarios-index.md` must equal what
  `node scripts/scenarios-index.mjs check` regenerates — any new `.cases.md` requires running
  `pnpm scenarios:index` before commit.

---

## 9. `PROTECTED_ROUTES` and `PROTECTED_PAGES` (verbatim)

`e2e/security/security.api.spec.ts:22-32`:

```ts
const PROTECTED_ROUTES = [
  { method: 'GET' as const, path: '/auth/me' },
  { method: 'GET' as const, path: '/meetings?limit=3' },
  { method: 'POST' as const, path: '/meetings' },
  { method: 'GET' as const, path: '/meetings/:id' },
];
```

`e2e/security/security.functional.spec.ts:31`:

```ts
const PROTECTED_PAGES = ['/'];
```

Also relevant, same file, `POST_ROUTES` (lines 35-46) — POST endpoints checked for
`forbidNonWhitelisted` via `SEC-API-07`:

```ts
const POST_ROUTES = [
  { path: '/auth/login', valid: {...}, needsToken: false },
  { path: '/meetings', valid: {...}, needsToken: true },
];
```

And `e2e/accessibility/accessibility.functional.spec.ts:25-29`, `AUDITED_PAGES`:

```ts
const AUDITED_PAGES = [
  { path: '/auth/login', needsSession: false },
  { path: '/auth/register', needsSession: false },
  { path: '/', needsSession: true },
] as const;
```

A new meeting-files upload/list route and (if there is a UI) a new or modified page must be added
to `PROTECTED_ROUTES` and, if guarded, to `PROTECTED_PAGES`/`AUDITED_PAGES` per invariant 16 — these
three lists are hand-maintained; only `PROTECTED_ROUTES` vs. the guarded-route set is itself checked
(`AR-API-06`, §8 above). `PROTECTED_PAGES` and `AUDITED_PAGES` are not cross-checked by any meta-test
(`e2e/README.md:76-79`, "held by review alone").

---

## 10. `e2e/README.md` — suite index and run economics (as written)

Suite composition, measured 2026-09-29: **112 e2e in 13 files and 51 units** (38 in `apps/api`, 13 in
`apps/web`) plus one supertest module-boot check (`e2e/README.md:254`). Prior points in the same
paragraph: 110 e2e (`CH-019`'s run, `AR-API-10` added), 109 e2e (`meetings-detail`'s `MD-API-01…07`
plus `AR-API-09` added, in a 13th file with "deliberately no `.functional.` pair",
`e2e/README.md:260-262`).

Timing table (`e2e/README.md:273-278`):

| What                                             | Time    | How measured                      |
| ------------------------------------------------ | ------- | --------------------------------- |
| `pnpm e2e` — all 112                             | 26–45 s | timing the whole command          |
| `pnpm e2e --project=api --grep @auth-login` — 11 | 13.1 s  | ~12 s of it is starting servers   |
| `pnpm verify` end to end                         | 47–66 s | five measurements across two days |
| `pnpm verify` on a cold `.next`                  | ~137 s  | the first run of the day          |

Run commands given (`e2e/README.md:125-151`): `pnpm e2e`, `pnpm e2e:smoke`, `pnpm e2e:regression`,
`pnpm e2e:auth-login`, `pnpm e2e:home-dashboard`, `pnpm e2e:p0`,
`pnpm e2e --project=api --grep @auth-login`, `pnpm e2e --project=web --grep @auth-login`,
`pnpm e2e --grep "HD-FN-07"`, `pnpm e2e --grep-invert @mutating`,
`pnpm e2e e2e/suite-integrity.api.spec.ts`, `pnpm e2e e2e/architecture`, `pnpm e2e:report`,
`pnpm test`, `pnpm test:auth-login`, `pnpm test:home-dashboard`. Note: `pnpm test:meetings-detail`
exists in `package.json:24` but is not listed in this `e2e/README.md` run-commands block (the block
predates that script's addition, or the README was not updated — not re-derivable from the README
alone; see Not found below).

Explicit "What lives where" table rows (`e2e/README.md:44-61`) list one row per
`.cases.md`/spec pair for `auth-login`, `home-dashboard`, `meetings-detail` (API + unit only, no
functional), `smoke`, `ledger`, `process`, `architecture`, `suite-integrity` (no cases, in
`SELF_EXEMPT`), `security` (API + functional), `accessibility`. A `meeting-files` feature adding
`e2e/regression/meeting-files/` needs a new row here per rule 7 of "Adding a feature to the suite"
(`e2e/README.md:216`).

---

## 11. Where coverage stops — file upload / multipart / binary

Grepped `e2e/`, `apps/`, `docs/` (excluding `node_modules`) for `multipart`, `upload`,
`octet-stream`, `formdata`, `bytea`, `Bytes`, `prisma`, `docker-compose` (case-insensitive).

- **Not found: any test exercising a multipart request, a file upload, a binary (non-JSON) HTTP
  response, or a `Content-Type` other than `application/json`** — searched all of `e2e/**/*.spec.ts`
  and `e2e/**/*.cases.md` by grep; no match for `multipart`, `octet-stream`, or `upload` as a
  file-transfer concept. The only `FormData`/`formData` hits are `apps/web/src/lib/login-credentials.ts`
  and `apps/web/src/lib/actions/{auth,meetings}.ts`, which are Next.js Server Action form submissions
  (text fields only — `email`, `password`, `title`, `startsAt`), not file uploads.
- **Not found: `prisma` or `docker-compose` anywhere in the repository** — searched `apps/`, `e2e/`,
  `docs/`, root. No `schema.prisma`, no `docker-compose.yml`, no `@prisma/client` dependency in
  either `apps/api/package.json` or the root `package.json`.
- **Not found: `bytea` or a Prisma `Bytes` type anywhere** — only unrelated hits for `randomBytes`
  (crypto, `apps/api/src/auth/auth.service.ts:1`, `apps/api/src/common/crypto/password.ts`) and
  bundle-size "bytes" measurements in unrelated `docs/plans/design-language-rollout/` research files.
- Confirmed in-memory store, both sides, by source: `apps/api/src/meetings/meetings.service.ts:29-30`
  ("In-memory meeting store — no database; the seed is applied in the constructor… `nest start
--watch` restarts on every edit and wipes everything the tests created") and
  `apps/api/src/users/users.service.ts:19-20` ("In-memory user store — the project has no database.
  The seed is applied in the constructor…").

---

## Open questions

- `e2e/README.md`'s run-commands block (lines 125-151) does not list `pnpm e2e:meetings-detail` or
  `pnpm test:meetings-detail`, though `package.json:24` defines the latter and
  `meetings-detail.api.cases.md` exists with its own `pnpm e2e --project=api --grep @meetings-detail`
  run line (`meetings-detail.api.cases.md:6`) — whether this is a stale README block or an intentional
  omission is not determinable from the documents alone. **Narrowed at the `FEAT-G1` review:** the
  omission is specific to the fenced command block at `:141-142`. `pnpm test:meetings-detail` _is_
  present in the feature table at `e2e/README.md:53`, so the document is not uniformly silent on it —
  only the command block is.
- Whether a Prisma-backed seed would run through the same `UsersService`/`MeetingsService`
  constructor-time seeding path (so `SM-API-02`/`SM-API-03` keep working unmodified against a
  re-pointed implementation) or through a separate seed script/migration step is not stated anywhere
  in the test corpus — the corpus only establishes that _today_ the constructor seeds the store
  (`meetings.service.ts:34-36`, `users.service.ts:26-35`).

Added at the `FEAT-G1` review:

- **How a connection string reaches the suite.** `playwright.config.ts`'s two `webServer.env` blocks
  pass `API_URL` to web and `PORT`/`JWT_SECRET` to api, and `webServer.env` merges on top of
  `process.env` (comment in the config). Nothing records how a `DATABASE_URL` would reach those two
  processes, `pnpm dev`, the Vitest runs, or CI. `SEC-API-10` (§1 above) forbids a committed `.env`,
  so the shape that would be reached for first is the one the suite rejects. No file in `e2e/`
  addresses this.
- **Test isolation once the store survives a restart.** `FACT-3130` ("`--watch` restarts on every
  edit and wipes anything a test created") is the premise under `FACT-3125` (read-only `teacher`/
  `student` carrying absolute assertions), `FACT-3126` (`planner`/`organizer` as the two mutation
  sandboxes, "because Playwright runs both projects in parallel against one store") and `FACT-3131`
  (mutating cases use relative counters, never absolute). A database makes created data persist
  across restarts and across runs. The backlog's **Rejected** section and `FACT-3128` both reject "a
  test-only reset endpoint", each argued against the in-memory store. What replaces the restart as
  the isolation mechanism is not addressed anywhere in `e2e/`.

## Not found

- **Not found:** any `globalSetup`/`globalTeardown` entry in `playwright.config.ts`, or any third
  `webServer` entry — searched the full 99-line file.
- **Not found:** any existing mechanism (test, generator, or lint rule) that diffs
  `e2e/fixtures/seed.ts` against `apps/api/src/users/users.seed.ts` / `meetings.seed.ts` statically —
  searched `e2e/fixtures/`, `scripts/`, and `e2e/suite-integrity.api.spec.ts` in full. The only check
  is the live HTTP comparison in `SM-API-02`/`SM-API-03`.
- **Not found:** any reference to Prisma, PostgreSQL, `docker-compose`, `bytea`, or a `Bytes` column
  type anywhere in `apps/`, `e2e/`, `docs/`, or the root `package.json`/`pnpm-workspace.yaml` —
  searched by grep across the whole repository excluding `node_modules`.
- **Not found:** any test, fixture, or meta-test that exercises multipart form data, a file upload
  endpoint, a binary HTTP response body, or any `Content-Type` other than `application/json` —
  searched all `.spec.ts` and `.cases.md` files under `e2e/`.
- **Not found:** a `meetings-detail.functional.cases.md` or `.spec.ts` — confirmed absent by
  directory listing of `e2e/regression/meetings-detail/` (3 files only) and by the explicit statement
  in `e2e/README.md:197-198` that this is deliberate.
