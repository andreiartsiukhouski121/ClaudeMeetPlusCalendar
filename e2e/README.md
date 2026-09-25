# The Playwright regression suite

One directory per feature, holding both the case descriptions and the executable specs. Working on
a feature, you open **one** directory and see every level of checks: the API contract, the UI, and
the units with exact paths to them.

**This file is the canonical source of the suite convention**: names, tags, robustness rules, case
composition, run commands and run economics. The plans in [`docs/plans/`](../docs/plans/) are an
archive of the first iteration; they must not be cited for conventions, as their numbers already
diverge from reality (`FX-013`, `FX-027`).

## Naming convention

| Role                               | Pattern                         | Playwright project |
| ---------------------------------- | ------------------------------- | ------------------ |
| API contract cases                 | `<feature>.api.cases.md`        | —                  |
| API contract spec                  | `<feature>.api.spec.ts`         | `api` (:3101)      |
| UI cases                           | `<feature>.functional.cases.md` | —                  |
| UI spec                            | `<feature>.functional.spec.ts`  | `web` (:3100)      |
| Unit cases (specs live in `apps/`) | `<feature>.unit.cases.md`       | vitest             |

**The filename suffix is the only source of truth about which project executes a test.**
`playwright.config.ts` routes by `testMatch` rather than by directory: `*.api.spec.ts` → project
`api` (the `request` fixture, no browser), `*.functional.spec.ts` → project `web` (Desktop Chrome).
A file with any other name **joins no project and silently never runs** — that is what
`suite-integrity.api.spec.ts` guards against.

A test title must start with its case ID (`SM-API-01 — …`): that gives `--grep "HD-FN-07"`, a
readable report, and an automatic pairing check. The same goes for units — `it('AL-UT-09 — …')`, or
`pnpm test:auth-login` cannot filter the feature.

## What lives where

| Feature             | Slug             | Cases (md)                                                     | Specs                                                                                                                                                                                               | Project | Run                                             |
| ------------------- | ---------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------- |
| Login `/auth/login` | `auth-login`     | `regression/auth-login/auth-login.api.cases.md`                | `regression/auth-login/auth-login.api.spec.ts`                                                                                                                                                      | api     | `pnpm e2e --project=api --grep @auth-login`     |
| Login `/auth/login` | `auth-login`     | `regression/auth-login/auth-login.functional.cases.md`         | `regression/auth-login/auth-login.functional.spec.ts`                                                                                                                                               | web     | `pnpm e2e --project=web --grep @auth-login`     |
| Login `/auth/login` | `auth-login`     | `regression/auth-login/auth-login.unit.cases.md`               | `apps/api/src/auth/*.spec.ts`, `apps/api/src/common/crypto/password.spec.ts`, `apps/api/src/users/users.service.spec.ts`, `apps/web/src/lib/session.spec.ts`, `apps/web/src/lib/api-client.spec.ts` | vitest  | `pnpm test:auth-login`                          |
| Home `/`            | `home-dashboard` | `regression/home-dashboard/home-dashboard.api.cases.md`        | `regression/home-dashboard/home-dashboard.api.spec.ts`                                                                                                                                              | api     | `pnpm e2e --project=api --grep @home-dashboard` |
| Home `/`            | `home-dashboard` | `regression/home-dashboard/home-dashboard.functional.cases.md` | `regression/home-dashboard/home-dashboard.functional.spec.ts`                                                                                                                                       | web     | `pnpm e2e --project=web --grep @home-dashboard` |
| Home `/`            | `home-dashboard` | `regression/home-dashboard/home-dashboard.unit.cases.md`       | `apps/api/src/meetings/*.spec.ts`, `apps/web/src/lib/format-date.spec.ts`                                                                                                                           | vitest  | `pnpm test:home-dashboard`                      |
| Infrastructure      | `smoke`          | `smoke/health.api.cases.md`, `smoke/seed.api.cases.md`         | `smoke/health.api.spec.ts`, `smoke/seed.api.spec.ts`                                                                                                                                                | api     | `pnpm e2e e2e/smoke`                            |
| Ledger              | `ledger`         | `ledger/ledger.api.cases.md`                                   | `ledger/ledger.api.spec.ts`                                                                                                                                                                         | api     | `pnpm e2e e2e/ledger`                           |
| Planning process    | `process`        | `process/process.api.cases.md`                                 | `process/process.api.spec.ts`                                                                                                                                                                       | api     | `pnpm e2e e2e/process`                          |
| Suite convention    | —                | none (in `SELF_EXEMPT`)                                        | `suite-integrity.api.spec.ts`                                                                                                                                                                       | api     | `pnpm e2e e2e/suite-integrity.api.spec.ts`      |
| Security            | `security`       | `security/security.api.cases.md`                               | `security/security.api.spec.ts`                                                                                                                                                                     | api     | `pnpm e2e:security`                             |
| Security            | `security`       | `security/security.functional.cases.md`                        | `security/security.functional.spec.ts`                                                                                                                                                              | web     | `pnpm e2e:security`                             |

`smoke/seed.api.spec.ts` was filled in stages: `SM-API-02` (seeded user logins) arrived with
`POST /auth/login`, `SM-API-03` (seeded meetings) with the `/meetings` controller. Earlier than
that, each would have been knowingly red, and a red test in a commit is a blocker.

## Security — the cross-feature suite

`e2e/security/` sits next to `regression/` rather than inside a feature because it checks
**invariants that must hold for every new endpoint and every new page**. Both specs walk routes and
pages from a list (`PROTECTED_ROUTES`, `POST_ROUTES`, `PROTECTED_PAGES`): add a protected route, add
a line, and the check picks it up without a new case.

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

The `SEC-API-05` threshold is deliberately loose: the goal is to catch a return of the early exit
without password verification, not to measure microseconds under the load of a test run.

## Fixtures

| File                       | What it provides                                                                                                                                                                    |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fixtures/seed.ts`         | `SEED_USERS`, `TEACHER_MEETINGS`, the dates of created meetings. The **only** source of logins, passwords and meeting titles.                                                       |
| `fixtures/auth.api.ts`     | `loginApi(request, user)` → `accessToken`, `authHeaders(token)`. For project `api`, cached per worker.                                                                              |
| `fixtures/api.ts`          | The `apiBaseURL` option (its value comes from `playwright.config.ts`), the `apiRequest` fixture and `isNestRequest` — a Nest request context for `web` cases needing baseline data. |
| `fixtures/auth.fixture.ts` | The `authUser` option (test), `authStateFor` (worker), `authedPage` (test) — a session for UI cases through a real UI login on `/auth/login`.                                       |
| `fixtures/console.ts`      | `collectConsoleProblems(page)` plus a filter for `next dev` HMR noise. Without the filter the console cases flake.                                                                  |

## Tags and running

Tags are set with the `tag` option on `test.describe` rather than as text in the title:
`@regression`, `@smoke`, `@auth-login`, `@home-dashboard`, `@mutating` (the case changes data),
`@p0` (the critical minimum). The service suites carry their own: `@security`, `@ledger`,
`@process`.

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
pnpm e2e:report                             # the report after a failure

pnpm test                                   # units of both features
pnpm test:auth-login                        # one feature's units (filtered by case ID)
pnpm test:home-dashboard
```

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
- **Waiting** — web-first assertions only (`await expect(...).toBeVisible()`). `waitForTimeout` and
  any fixed pause is a blocker; `eslint-plugin-playwright` keeps that rule at `error`.
- **`await` on an async matcher is mandatory.** `expect(response).toBeOK()` without it passes,
  having checked nothing.
- **Data comes only from `fixtures/seed.ts`.** Hard-coding a login, a password or a meeting title is
  a blocker.
- **`teacher` and `student` are never mutated** — exact numbers are only checked against them.
  Mutating cases run as `planner` (project `api`) or `organizer` (project `web`), because
  `fullyParallel: true` and Nest's store is shared.
- **Created meetings are dated 2030** (`FUTURE_STARTS_AT_ISO`). DESC sorting plus the top-three
  slice mean "the new meeting is first" only holds when the date is later than any seeded meeting of
  that owner. `Date.now()` instead of the constant is a blocker.
- **Absolute counter assertions in `@mutating` cases are forbidden** — a new meeting is found by its
  unique generated title rather than by `total`.
- **The browser never reaches `:3101`.** All page traffic goes to Next; `HD-FN-11` checks it.
  Baseline data from Nest comes through the `apiRequest` fixture — from the test's Node process, not
  from the browser.
- **A knowingly red test is not committed.** If a check is impossible at the current stage, the spec
  is not created until the stage where it goes green.

## Adding a feature to the suite

1. Create `e2e/regression/<slug>/` (slug in kebab-case).
2. Add four files: `<slug>.api.cases.md`, `<slug>.api.spec.ts`, `<slug>.functional.cases.md`,
   `<slug>.functional.spec.ts` — plus `<slug>.unit.cases.md` if the feature has units. A
   `.cases.md` is a header, a summary table and a Cases section with steps and expected results; the
   nearest model is `regression/auth-login/auth-login.api.cases.md`.
3. Assign case IDs: `<FEATURE>-<TYPE>-<NN>`, where TYPE is `API` | `FN` | `UT`. Numbers are **never
   reused** after a case is deleted.
4. Start every test title with its case ID. A case deliberately left unautomated is marked in the
   `.cases.md` with `- **Not automated:** <reason + task link>` — the meta-test recognizes **only**
   that syntax.
5. Set tags with the `tag` option on `test.describe`: `['@regression', '@<slug>']`, plus `@p0` and
   `@mutating` where they apply.
6. Put unit specs next to the code in `apps/**/src/**` and list their paths and case IDs in
   `<slug>.unit.cases.md`, grouped by spec: the meta-test checks both that the paths exist and that
   each ID appears in the spec it is listed under.
7. Add a row to the "What lives where" table above.
8. Run `pnpm e2e e2e/suite-integrity.api.spec.ts` — it must be green. Then **one** `pnpm verify`
   rather than a series of `--grep` calls.

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
checked at all three levels (unit, API, UI), because each catches a substitution at its own seam;
and the indistinguishability of a wrong password from an unknown email is a security requirement
rather than a check.

## Run economics

**This is the only place in the repository where measurement numbers live.** Other documents
reference it: four diverging copies of this paragraph already produced `FX-027`. When the numbers
change, change them here and set a new measurement date.

Measured **2026-09-16**, Windows 11, warm `.next`. Suite composition — **87 e2e in 11 files and 42
units** (29 in `apps/api`, 13 in `apps/web`) plus one supertest module-boot check.

| What                                             | Time        | How measured                              |
| ------------------------------------------------ | ----------- | ----------------------------------------- |
| `pnpm e2e` — all 87                              | **26–40 s** | timing the whole command                  |
| `pnpm e2e --project=api --grep @auth-login` — 11 | **13.1 s**  | the same; ~12 s of it is starting servers |
| `pnpm verify` end to end                         | **47–66 s** | four measurements across a day            |
| `pnpm verify` on a cold `.next`                  | ~137 s      | the first run of the day                  |

The spread is warm-up: `.next` and Nest's `tsc` are warm to different degrees. The order of
magnitude is stable, and that is what the rule below rests on.

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
