# The Playwright regression suite

One directory per feature, holding both the case descriptions and the executable specs. Working on
a feature, you open **one** directory and see every level of checks: the API contract, the UI, and
the units with exact paths to them.

**This file is the canonical source of the suite convention**: names, tags, robustness rules, case
composition, run commands and run economics. The plans in [`docs/plans/`](../docs/plans/) are an
archive of the first iteration; they must not be cited for conventions, as their numbers already
diverge from reality (`FX-013`, `FX-027`).

## Naming convention

| Role                                | Pattern                                                       | Playwright project    |
| ----------------------------------- | ------------------------------------------------------------- | --------------------- |
| API contract cases                  | `<feature>.api.cases.md`                                      | —                     |
| API contract spec                   | `<feature>.api.spec.ts`                                       | `api` (:3101)         |
| UI cases                            | `<feature>.functional.cases.md`                               | —                     |
| UI spec                             | `<feature>.functional.spec.ts`                                | `web` (:3100)         |
| Module-level cases, no browser      | `<feature>.integration.cases.md`                              | —                     |
| Module-level spec, no browser       | `<feature>.integration.spec.ts`                               | `integration` (:3101) |
| Cross-feature journey (2+ features) | `e2e/journeys/<area>/<area>.functional.cases.md` + `.spec.ts` | `web` (:3100)         |
| Unit cases (specs live in `apps/`)  | `<feature>.unit.cases.md`                                     | vitest                |

**The filename suffix is the only source of truth about which project executes a test.**
`playwright.config.ts` routes by `testMatch` rather than by directory: `*.api.spec.ts` → project
`api` (the `request` fixture, no browser), `*.functional.spec.ts` → project `web` (Desktop Chrome),
`*.integration.spec.ts` → project `integration` (the `request` fixture, no browser — several modules
exercised together). A file with any other name **joins no project and silently never runs** — that
is what `suite-integrity.api.spec.ts` guards against.

**Scenarios (`.cases.md`) are written by `test-designer` at `FEAT-S9`**, before the paired spec
exists; the spec and the run stay with the `tester-*` roles (`feature-pipeline` §5a, second tuning
round). An integration ID is typed `-INT-`; a new area or feature prefix goes into
`KNOWN_CASE_PREFIXES` in `suite-integrity.api.spec.ts` first, or the unregistered-prefix guard goes
red.

A test title must start with its case ID (`SM-API-01 — …`): that gives `--grep "HD-FN-07"`, a
readable report, and an automatic pairing check. The same goes for units — `it('AL-UT-09 — …')`, or
`pnpm test:auth-login` cannot filter the feature.

## What lives where

| Feature                        | Slug              | Cases (md)                                                     | Specs                                                                                                                                                                                                                                    | Project | Run                                              |
| ------------------------------ | ----------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------ |
| Login `/auth/login`            | `auth-login`      | `regression/auth-login/auth-login.api.cases.md`                | `regression/auth-login/auth-login.api.spec.ts`                                                                                                                                                                                           | api     | `pnpm e2e --project=api --grep @auth-login`      |
| Login `/auth/login`            | `auth-login`      | `regression/auth-login/auth-login.functional.cases.md`         | `regression/auth-login/auth-login.functional.spec.ts`                                                                                                                                                                                    | web     | `pnpm e2e --project=web --grep @auth-login`      |
| Login `/auth/login`            | `auth-login`      | `regression/auth-login/auth-login.unit.cases.md`               | `apps/api/src/auth/*.spec.ts`, `apps/api/src/common/crypto/password.spec.ts`, `apps/api/src/users/users.service.spec.ts`, `apps/web/src/lib/session.spec.ts`, `apps/web/src/lib/api-client.spec.ts`                                      | vitest  | `pnpm test:auth-login`                           |
| Home `/`                       | `home-dashboard`  | `regression/home-dashboard/home-dashboard.api.cases.md`        | `regression/home-dashboard/home-dashboard.api.spec.ts`                                                                                                                                                                                   | api     | `pnpm e2e --project=api --grep @home-dashboard`  |
| Home `/`                       | `home-dashboard`  | `regression/home-dashboard/home-dashboard.functional.cases.md` | `regression/home-dashboard/home-dashboard.functional.spec.ts`                                                                                                                                                                            | web     | `pnpm e2e --project=web --grep @home-dashboard`  |
| Home `/`                       | `home-dashboard`  | `regression/home-dashboard/home-dashboard.unit.cases.md`       | `apps/web/src/lib/format-date.spec.ts`                                                                                                                                                                                                   | vitest  | `pnpm test:home-dashboard`                       |
| Meeting detail `/meetings/:id` | `meetings-detail` | `regression/meetings-detail/meetings-detail.api.cases.md`      | `regression/meetings-detail/meetings-detail.api.spec.ts`                                                                                                                                                                                 | api     | `pnpm e2e --project=api --grep @meetings-detail` |
| Meeting files                  | `meeting-files`   | `regression/meeting-files/meeting-files.api.cases.md`          | `regression/meeting-files/meeting-files.api.spec.ts`                                                                                                                                                                                     | api     | `pnpm e2e --project=api --grep @meeting-files`   |
| Meeting files                  | `meeting-files`   | `regression/meeting-files/meeting-files.functional.cases.md`   | `regression/meeting-files/meeting-files.functional.spec.ts`                                                                                                                                                                              | web     | `pnpm e2e --project=web --grep @meeting-files`   |
| Meeting files                  | `meeting-files`   | `regression/meeting-files/meeting-files.unit.cases.md`         | `apps/api/src/meeting-files/domain/value-objects.spec.ts`, `apps/api/src/meeting-files/domain/meeting-file.spec.ts`, `apps/api/src/meeting-files/meeting-files.content-disposition.spec.ts`, `apps/web/src/lib/format-file-size.spec.ts` | vitest  | `pnpm test:meeting-files`                        |
| Infrastructure                 | `smoke`           | `smoke/health.api.cases.md`, `smoke/seed.api.cases.md`         | `smoke/health.api.spec.ts`, `smoke/seed.api.spec.ts`                                                                                                                                                                                     | api     | `pnpm e2e e2e/smoke`                             |
| Ledger                         | `ledger`          | `ledger/ledger.api.cases.md`                                   | `ledger/ledger.api.spec.ts`                                                                                                                                                                                                              | api     | `pnpm e2e e2e/ledger`                            |
| Planning process               | `process`         | `process/process.api.cases.md`                                 | `process/process.api.spec.ts`                                                                                                                                                                                                            | api     | `pnpm e2e e2e/process`                           |
| Architecture corpus            | `architecture`    | `architecture/architecture.api.cases.md`                       | `architecture/architecture.api.spec.ts`                                                                                                                                                                                                  | api     | `pnpm e2e e2e/architecture`                      |
| Suite convention               | —                 | none (in `SELF_EXEMPT`)                                        | `suite-integrity.api.spec.ts`                                                                                                                                                                                                            | api     | `pnpm e2e e2e/suite-integrity.api.spec.ts`       |
| Security                       | `security`        | `security/security.api.cases.md`                               | `security/security.api.spec.ts`                                                                                                                                                                                                          | api     | `pnpm e2e:security`                              |
| Security                       | `security`        | `security/security.functional.cases.md`                        | `security/security.functional.spec.ts`                                                                                                                                                                                                   | web     | `pnpm e2e:security`                              |
| Accessibility                  | `accessibility`   | `accessibility/accessibility.functional.cases.md`              | `accessibility/accessibility.functional.spec.ts`                                                                                                                                                                                         | web     | `pnpm e2e:a11y`                                  |

`meetings-detail` deliberately has no `.functional.*` pair and, since `meeting-files` landed, no
`.unit.*` one either: its nine units lived in `apps/api/src/meetings/meetings.service.spec.ts`,
which the move to Prisma deleted (`ADR-0027`). Four of them were **withdrawn** — they guarded the
in-memory store's copy semantics, and Prisma builds a fresh object per query — and the rest are
covered by `MD-API-01`…`07`. There is no `pnpm test:meetings-detail` script any more.

`smoke/seed.api.spec.ts` was filled in stages: `SM-API-02` (seeded user logins) arrived with
`POST /auth/login`, `SM-API-03` (seeded meetings) with the `/meetings` controller. Earlier than
that, each would have been knowingly red, and a red test in a commit is a blocker.

## Security — the cross-feature suite

`e2e/security/` sits next to `regression/` rather than inside a feature because it checks
**invariants that must hold for every new endpoint and every new page**. Both specs walk routes and
pages from a list (`PROTECTED_ROUTES`, `POST_ROUTES`, `PROTECTED_PAGES`): add a protected route, add
a line, and the check picks it up without a new case.

`e2e/accessibility/` is there for the same reason and works the same way (`ADR-0025`): `axe-core` at
WCAG 2.1 AA over every entry of `AUDITED_PAGES`. **Three hand-maintained lists now connect the
cross-feature suites to a growing application.** Only one of them is itself checked — `AR-API-06`
builds the routes from the Nest decorators and compares them against `PROTECTED_ROUTES`. Pages are
not derivable from decorators, so `PROTECTED_PAGES` and `AUDITED_PAGES` are held by review alone
(`BL-030`).

Some cases deliberately duplicate checks inside features. `AL-API-14` pins that `GET /auth/me`
without a token gives 401 — that is the login contract; `SEC-API-01` pins that **no** protected
route answers without a token. The first breaks when login is edited, the second when an endpoint
is added without a guard. Those are different failures.

What this suite has already found in live code:

- **`SEC-FN-05`** — `ERR_TOO_MANY_REDIRECTS` on a cookie holding an invalid token. `proxy.ts` by
  design only sees that a cookie exists and let the request through to `/`; the page got a 401 and
  redirected to `/auth/login`; the proxy saw the cookie again and sent the user back to `/`. The
  user was locked out and could not reach the form to sign in again. Fixed with the
  `/auth/session-expired` Route Handler, which erases the cookie first.
- **`SEC-API-05`** — an unknown email answered in 52 ms, a wrong password in 86–114 ms: an identical
  message was not enough, and accounts were enumerable by response time. Fixed by verifying the
  password against a dummy hash when the user does not exist.
- **`SEC-API-08`** — `X-Powered-By: Express` on every response.
- **`SEC-API-11`** — the file download interpolated the stored filename into `Content-Disposition`,
  and two seeded rows holding a CR LF pair answered 500. Nothing injected ever reached the wire,
  but only because Node's own `setHeader` throws — a defence this code does not own. The header is now
  **built** from the stored value instead. The transferable lesson is the asymmetry: the `filename`
  column has more than one writer, so a read path validates its own output rather than inheriting
  the write path's guarantees.

The `SEC-API-05` threshold is deliberately loose: the goal is to catch a return of the early exit
without password verification, not to measure microseconds under the load of a test run.

## Fixtures

Every spec takes `test` and `expect` from **one** module, `fixtures/suite.ts`, and never aliases,
re-exports or merges fixture sets itself (suite rules 11 and 12, `FACT-3811`). API helpers live in
`e2e/api/`, apart from the fixtures, so the seed-password rule can bound what reads a password
(`ADR-0036`, `FACT-3763`).

| File                          | What it provides                                                                                                                                                                                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `fixtures/suite.ts`           | **The one `test`.** The `lease`, `claim`, `sessionPage`, `cleanup` and `preconditions` fixtures, the pool's claim and release, and `buildSessionCookie`. Details below.                                                                                |
| `fixtures/api.ts`             | The `apiBaseURL` option (its value comes from `playwright.config.ts`), the `apiRequest` fixture and `isNestRequest` — the Nest request context that `claim`, `cleanup` and `preconditions` call through in both projects, not only the `web` baseline. |
| `fixtures/seed.ts`            | `SEED_USERS`, `TEACHER_MEETINGS`, `TEACHER_MEETING_FILES`, `HEADER_SAFETY_MEETING`, the dates of created meetings. The **only** source of logins, passwords, titles and file names.                                                                    |
| `fixtures/global-setup.ts`    | Empties `.e2e-pool/` before any test runs (`FACT-3779`). It does nothing else: the warm-up is gone (see "Run economics").                                                                                                                              |
| `fixtures/global-teardown.ts` | The end-of-run baseline check (`FACT-3781`).                                                                                                                                                                                                           |
| `fixtures/console.ts`         | `collectConsoleProblems(page)` plus a filter for `next dev` HMR noise. Without the filter the console cases flake.                                                                                                                                     |
| `api/auth.api.ts`             | `loginApi(request, user)` → `accessToken`, `loginPoolUser`, `authHeaders(token)`. For project `api` and for the pool's own logins.                                                                                                                     |
| `api/meetings.api.ts`         | `createMeeting`, `createSeededShapeMeetings`, `fetchMeetingsPage`, the meeting body types and `MEETING_NOT_FOUND_BODY`.                                                                                                                                |
| `api/meeting-files.api.ts`    | `uploadMeetingFile`, `uploadSeededFiles`, `createSeededShapeCopy`, the multipart builders (a file part, a wrong field name, an extra text field, an empty filename), `FILE_NOT_FOUND_BODY`.                                                            |
| `api/cleanup.api.ts`          | The `Tracker` class behind the `cleanup` and `preconditions` fixtures, and `deleteAllMeetings`.                                                                                                                                                        |

### The user pool

A test that needs a signed-in user takes one from the pool rather than sharing a seeded owner
(`ADR-0037`). The mechanics are in the ADR and the code, not restated here:

- **Claim per test.** `.e2e-pool/` at the repository root holds `claims/pool-NN/owner.json`, one
  directory per held user, renamed onto its slot so there is exactly one winner (`FACT-3774`,
  `FACT-3801`). A test needing more than one user takes all of them or none (`FACT-3775`). The lease
  releases the claim after the test's `afterEach` hooks, on a pass, a failure and a timeout
  (`FACT-3776`); a holder that died is taken over by the next claimant (`FACT-3777`).
- **Storage state per run.** `.e2e-pool/state/pool-NN.json` is built from one `POST /auth/login` on
  a user's first claim in a run and reused after (`FACT-3778`); global setup empties the directory,
  so state never outlives its run (`FACT-3779`). `.e2e-pool/` is untracked.
- **Users.** `fixtures/seed.ts` holds thirteen: `teacher`, `student`, `planner` and
  `pool-01`…`pool-10` (`FACT-3773`). `organizer` and `eraser` are gone — the pool replaces the one
  role of each.
- **`sessionPage`** is a browser page whose context carries the claim's storage state, so a UI case
  does not sign in (`FACT-3756`). `claim` is the one pool user a test holds.

### Signing in through the form: once

The browser signs in through the form in as few tests as possible, and the rest get a session from
the pool (`ADR-0036`):

- `AL-FN-13` is the one successful sign-in inside `e2e/regression/auth-login/` (`FACT-3755`), and it
  also guards the cookie builder against the cookie the application sets (`FACT-3757`).
- Outside it exactly two tests sign in through the form, `MF-FN-09` and `SEC-FN-01`, and carry the
  `@ui-login` tag; no other test carries it (`FACT-3806`). Suite rule 11 (`FACT-3759`) fails a read
  of the seed password anywhere else in `*.functional.spec.ts` and `e2e/fixtures/`.

### Cleanup

The rules are `FACT-3809`, `FACT-3817`, `FACT-3780` and `FACT-3810`; in short:

- **System-level data** — rows that belong to no user — is created in a module's `beforeAll` and
  deleted in its `afterAll`. **There is none today** (`FACT-3817`), so no module has either hook.
- **Per-test preconditions** are created in `beforeEach` through the `preconditions` tracker and
  deleted in `afterEach`.
- **The test body** is exactly `try { … } finally { await cleanup.run(); }`, with no `catch`: suite
  rule 12 (`FACT-3811`) parses every spec and fails any other shape, so the deletion runs whether or
  not the test failed and its own error propagates unchanged. A row the tracker still holds at
  teardown is deleted by the fixture and fails the test, which is also how a timed-out test cleans up.
- **The end-of-run baseline check** (`global-teardown.ts`, `FACT-3781`) compares every seeded owner
  with its seed through the API and fails the run listing each difference.

## Tags and running

Tags are set with the `tag` option on `test.describe` rather than as text in the title:
`@regression`, `@smoke`, `@auth-login`, `@home-dashboard`, `@mutating` (the case changes data),
`@p0` (the critical minimum), `@ui-login` (the test signs in through the form: `MF-FN-09` and
`SEC-FN-01` only, `FACT-3806`). The service suites carry their own: `@security`, `@accessibility`,
`@ledger`, `@process`, `@architecture`.

**Level tags**, second tuning round: `@unit`, `@api`, `@e2e`, `@integration` — reusing the vocabulary
above rather than adding synonyms (`@smoke` stays `@smoke`, `@p0` stays `@p0`). Vitest units carry
none; the case ID already encodes the level. A meta-test (`suite-integrity.api.spec.ts` rule 10)
fails if a level tag disagrees with the file's own suffix, so the tag cannot drift from the project
that actually runs the spec. Selective running by level is not built — every commit still runs the
whole suite; the tags exist for when the suite is large enough that changes.

```bash
pnpm e2e                                    # everything
pnpm e2e:smoke                              # infrastructure: servers up, seed in place
pnpm e2e:regression                         # the whole regression
pnpm e2e:auth-login                         # one feature end to end (API + UI)
pnpm e2e:home-dashboard
pnpm e2e:p0                                 # the critical minimum before a push
pnpm e2e --project=api --grep @auth-login   # the contract only, no browser
pnpm e2e --project=web --grep @auth-login   # the UI only
pnpm e2e --grep "HD-FN-07"                  # one case by ID
pnpm e2e --grep-invert @mutating            # flake diagnosis
pnpm e2e e2e/suite-integrity.api.spec.ts    # the convention meta-check
pnpm e2e e2e/architecture                   # the ADR log and the API contract against the code
pnpm e2e:report                             # the report after a failure

pnpm test                                   # every package's units
pnpm test:auth-login                        # one feature's units (filtered by case ID)
pnpm test:home-dashboard
pnpm test:meeting-files
```

`pnpm e2e` needs a running Docker: the api `webServer` entry runs `start:e2e`, which drops,
re-pushes and re-seeds the suite's database before Nest starts (`ADR-0027`). `pnpm test` does not —
no unit touches the database and the Prisma client connects lazily.

`test:auth-login` / `test:home-dashboard` filter units by case ID (`vitest run -t "AL-UT-"`), so
they only work together with the "a unit test title starts with its ID" rule. A double `--` between
`pnpm -r test` and `-t` must **not** be written: `vitest` then stops treating `-t` as an option and
runs everything. `--passWithNoTests` must not appear in these two scripts either: `apps/web` carries
that flag in its own `test`, and `vitest@4.1.11` fails on a second occurrence —
`Error: Expected a single value for option "--passWithNoTests", received [true, true]`. The flag
stays exactly in `apps/web/package.json`.

The ports are **3100 (web) and 3101 (api)**, and Playwright starts the servers itself. Do not move
a run to 3000/3001: a `next start` with a stale build may be sitting there and give a false green.

If a previous run failed, orphaned servers may remain on the ports:

```bash
netstat -ano | grep :3100   # take the PID from the LISTENING row
netstat -ano | grep :3101
# then Stop-Process -Id <pid> — do not kill every node at once, the user has their own dev servers
```

## Robustness rules

This is the full list — the `playwright-verify` and `regression-verify` skills reference it rather
than repeating it.

- **Locators** — by role, label and text only (`getByRole`, `getByLabel`, `getByText`). CSS and
  class selectors are a blocker.
- **Scope a role locator under `main` whenever the framework injects one of its own.** Three
  framework-injected sources live outside our markup and none of them is visible in a component, so
  each is found by a run rather than by review:
  1. **App Router's route announcer** — an empty `role="alert"` element outside `<main>`, so a bare
     `getByRole('alert')` can fail with a strict-mode violation or pass with no form alert at all,
     depending on when the announcer mounts (CI run `37930853945`). Locate a form error as
     `getByRole('main').getByRole('alert')`, and when the error text is known, wait for it.
  2. **`next dev`'s "Open Next.js Dev Tools" control** — a button outside the application's
     rendered tree on every page of every Next 16 app, absent from `grep -r` over this repository
     and absent from a production build. Playwright's `webServer` is `next dev`, so it is always
     there: a page-wide `getByRole('button')` count is never the application's own. `HD-FN-19`
     counts over the union of `navigation`, `banner`, `main` and `complementary` instead.
  3. **Chromium's unconditional `404` console error** on any non-2xx navigation —
     `Failed to load resource: the server responded with a status of 404`, logged by the browser for
     the top-level document rather than by the application. A blanket "zero console errors"
     assertion is therefore red on every correctly working 404 page. `MF-FN-11` filters down to
     `pageerror:` entries; the blanket check stays on pages expected to answer 200 (`HD-FN-10`,
     `MF-FN-14`).

  The rule is about the class, not the three instances: anything the framework renders outside our
  tree is reachable by a bare role locator, and the fix is always to scope rather than to loosen the
  assertion.

- **A precondition states a count by naming the mirror constant, never a number.** "The two seeded
  files" goes stale the moment the seed grows and nothing fails;
  `TEACHER_MEETING_FILES` cannot. The same goes for the spec: derive the expected count from the
  fixture rather than typing it.
- **Waiting** — web-first assertions only (`await expect(...).toBeVisible()`). `waitForTimeout` and
  any fixed pause is a blocker; `eslint-plugin-playwright` keeps that rule at `error`.
- **`await` on an async matcher is mandatory.** `expect(response).toBeOK()` without it passes,
  having checked nothing.
- **Data comes only from `fixtures/seed.ts`.** Hard-coding a login, a password or a meeting title is
  a blocker.
- **`teacher` and `student` are never mutated** — the `api` project's absolute numbers are checked
  against them (`FACT-3782`). `planner` is the shared mutation sandbox of project `api`, and counts
  over its whole collection are relative; any case needing an absolute count over a collection, or
  an owner no other case writes to, claims a pool user (`FACT-3783`, `FACT-3784`). Project `web` has
  no shared sandbox: a browser case that needs a session claims a pool user.
- **A mutating file case creates its own meeting** and uploads into that: the case proving the
  ten-file refusal consumes every slot of whatever meeting it uses, and every later upload into a
  shared one would fail for a reason that has nothing to do with what it tests. A listing over a
  meeting the case made itself has an exact expected count. `mtg-planner-2` is the one exception —
  `SEC-API-11`'s fixture, never uploaded into, never counted.
- **Meetings created under a shared owner are dated 2030** (`FUTURE_STARTS_AT_ISO`); a case holding
  a pool user may use the seed's own dates (`FACT-3799`). `Date.now()` instead of the constant is a
  blocker.
- **Absolute counter assertions over a shared owner are forbidden** — a new meeting is found by its
  unique generated title rather than by `total` (`FACT-3784`).
- **Every row a test creates is deleted by its own tracker, also on failure** — see "Cleanup" above.
  A deletion tolerates a `404` only when the body is exactly the contract's `Meeting not found` or
  `File not found`; any other `404`, Express's `Cannot DELETE …` included, fails the test. No seeded
  meeting or file is ever a delete target.
- **The browser never reaches `:3101`.** All page traffic goes to Next; `HD-FN-11` checks it.
  Baseline data from Nest comes through the `apiRequest` fixture — from the test's Node process, not
  from the browser.
- **A knowingly red test is not committed.** If a check is impossible at the current stage, the spec
  is not created until the stage where it goes green.

## Adding a feature to the suite

1. Create `e2e/regression/<slug>/` (slug in kebab-case).
2. Add a `.cases.md` and a `.spec.ts` for **each level the change actually touches**:
   `<slug>.api.*`, `<slug>.functional.*`, `<slug>.integration.*`, plus `<slug>.unit.cases.md` if the
   feature has units. Rules 1-3 are **pairing** rules, not existence rules — a change with no UI has
   no `.functional.*` pair, and that is legitimate rather than a gap (`meetings-detail` is the worked
   example). A `.cases.md` is a header, a summary table and a Cases section with steps and expected
   results; the nearest model is `regression/auth-login/auth-login.api.cases.md`. The scenario text
   is written at `FEAT-S9` by `test-designer`; the specs below it are the testers'.
   A spec imports `test` and `expect` from `e2e/fixtures/suite.ts` and nothing else, and every test
   body is `try { … } finally { await cleanup.run(); }` (suite rules 11 and 12); a spec that creates
   rows registers them with `cleanup`, and one that needs a session claims a pool user.
3. Assign case IDs: `<FEATURE>-<TYPE>-<NN>`, where TYPE is `API` | `FN` | `UT` | `INT`. Numbers are
   **never reused** after a case is deleted. The four type codes are the ones `ANY_PREFIX_CASE_ID` in
   `suite-integrity.api.spec.ts` recognises; an ID carrying any other code is invisible to rules 5-7
   **without failing the prefix guard**, so the case would exist and the convention would not see it.
4. Start every test title with its case ID. A case deliberately left unautomated is marked in the
   `.cases.md` with `- **Not automated:** <reason + task link>` — the meta-test recognizes **only**
   that syntax.
5. Set tags with the `tag` option on `test.describe`: `['@regression', '@<slug>']`, plus the level
   tag — `@unit`, `@api`, `@e2e` or `@integration` — and `@p0` and `@mutating` where they apply. Rule
   10 checks a level tag against the filename suffix, so `@api` belongs on `*.api.spec.ts`, `@e2e` on
   `*.functional.spec.ts` and `@integration` on `*.integration.spec.ts`. `@p0` and `[CriticalPass]`
   are the same thing under two names; `@p0` is the one the suite reads (`pnpm e2e:p0`).
6. Put unit specs next to the code in `apps/**/src/**` and list their paths and case IDs in
   `<slug>.unit.cases.md`, grouped by spec: the meta-test checks both that the paths exist and that
   each ID appears in the spec it is listed under.
7. Add a row to the "What lives where" table above.
8. Run `pnpm e2e e2e/suite-integrity.api.spec.ts` — it must be green. Then **one** `pnpm verify`
   rather than a series of `--grep` calls.
9. If a `.cases.md` changed, run `pnpm scenarios:index` and commit the refreshed
   `e2e/scenarios-index.md` — `PR-API-07` fails `pnpm verify` on a stale one.

## How many cases to write

**In the first pass, only `@p0`, and no more than eight cases per file.** The rest is added when a
bug actually slipped through, not "just in case".

The rule comes from this suite's own experience rather than from thrift: the first draft of the plan
held 69 e2e cases, review reasonably cut them to 53 — but writing, reviewing and cutting still
happened, so the same scope was paid for three times.

Signs of a case that should not exist:

- **it tests the framework rather than our code** — "broken JSON → 400" is `body-parser`, "unknown
  method → 404" is the Express router, "login on Enter" is HTML form behaviour;
- **a degenerate version of its neighbour** — "a header without the `Bearer` scheme" and "a forged
  signature" exercise the same guard branch as "a junk token";
- **an arithmetic consequence of two others** — "the counter exceeds the list length" follows from
  "the counter equals `total`" and "the list holds three items";
- **phrased with an "or"** ("404 or 405", "200 or 400"): both behaviours go green, including a
  regression from one into the other. The behaviour is deterministic — pin it.

What **should** be duplicated, and is not redundancy: `total` against the length of `items` is
checked at the API and the UI level, because each catches a substitution at its own seam; and the
indistinguishability of a wrong password from an unknown email is a security requirement rather than
a check. (`total` used to be checked at the unit level as well. That unit went with the in-memory
store; the two that remain are still deliberate rather than leftover.)

## Run economics

**This is the only place in the repository where measurement numbers live.** Other documents
reference it: four diverging copies of this paragraph already produced `FX-027`. When the numbers
change, change them here and set a new measurement date.

**The current row.** Measured **2026-10-23**, Windows 11, Docker up on a reset-and-reseeded
database, after `e2e-test-architecture` (`CH-037`: the user pool, the removed warm-up, `next`
16.4.1), on three consecutive green `pnpm verify` runs:

| Date       | e2e tests | e2e files | Units | `pnpm verify` end to end | e2e alone (Playwright)       |
| ---------- | --------- | --------- | ----- | ------------------------ | ---------------------------- |
| 2026-10-23 | 195       | 17        | 60    | **84 s / 85 s / 85 s**   | **47.5 s / 46.9 s / 47.4 s** |

Units are 43 in `apps/api` and 17 in `apps/web`, plus one supertest module-boot check. These counts are taken from the verify run's own output rather than recounted file by file. The 195 e2e tests are 142 in project `api` and 53 in project `web`, at 7 workers (`FACT-3786`). The run before this change measured 185 tests and 91 s / 97 s / 99 s. Run at `--workers=14` instead of 7 the web project is not reliably green (two runs, 4 then 2 failures in cases through cold routes): 7 is a limit, not a default to raise.
**This is the only row.** When the numbers change, replace it and set a new date; the earlier counts
are in git history (`git log -p -- e2e/README.md`), and a running narrative of them here is how the
count came to disagree across four documents (`FX-027`, `FX-035`).

**What the process costs is measured elsewhere.** `docs/profiling/` holds one record per development
cycle — stage by stage, in tokens and wall-clock (`ADR-0020`, closing what `BL-022` asked for). The
figures on this page are run economics only, and the two are kept apart deliberately: one paragraph
carrying two subjects is how `FX-027` happened.

| What                                             | Time            | How measured                                                                           |
| ------------------------------------------------ | --------------- | -------------------------------------------------------------------------------------- |
| `pnpm e2e` — all 195                             | **46.9–47.5 s** | Playwright's own total, Docker up on a reset database; the three runs of the row above |
| `pnpm e2e --project=api --grep @auth-login` — 11 | **13.1 s**      | the same; ~12 s of it is starting servers                                              |
| `pnpm verify` end to end                         | **84–85 s**     | the three runs of the row above; the figure other documents link to                    |
| `pnpm verify` on a cold `.next`                  | ~137 s          | the first run of the day                                                               |

The two rows for one feature's filter and for a cold `.next` predate the pool and were not re-measured on 2026-10-23.

The spread is the cold-start state and the database: `.next`, Nest's `tsc` and the `prisma generate`
prefix (~2 s per process, about five calls per `pnpm verify`) are each warm to a
different degree between runs. The order of magnitude is stable, and that is what the rule below
rests on.

The second row is where the one-call rule comes from: **every additional `pnpm e2e …` costs about
12 s regardless of how many tests are filtered**, because it restarts **both** servers, `next dev`
included, even for `--project=api`. Seven calls with different `--grep` values come to a minute and
a half against forty seconds for one full run. The saving shows not because one call is expensive
but because acceptance runs after **every** fix.

Hence:

- acceptance is **one** `pnpm verify`, not five `--grep` calls;
- the per-feature split (`--project=api --grep @<feature>`) is for debugging and localizing a
  failure;
- repeating the full run for another green result adds almost nothing. A **targeted control
  experiment** says more: break the behaviour, confirm the expected IDs go red, revert. That is
  seconds and one filtered run;
- **stop `pnpm dev` before a run**: Next 16 will not start a second dev server for the same
  directory on any port, and Playwright's `webServer` never comes up — the run fails with zero tests
  executed (verified by experience);
- two agents at once means **separate git worktrees**; different ports
  (`E2E_WEB_PORT=3200 E2E_API_PORT=3201`) matter only inside a worktree, since on their own they
  isolate neither `.next` nor the reports and state files.
