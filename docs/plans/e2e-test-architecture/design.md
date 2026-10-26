# Design: e2e-test-architecture

> Stage `FEAT-S2`, second correction pass of 2026-10-23, after the third `FEAT-G2` verdict
> (`docs/profiling/verdicts/2026-10-23-e2e-test-architecture-feat-g2-ad90fecf.md`, accept after
> three blockers) and the owner's three answers of the same day: `beforeAll` is for system-level
> data only; the body is `try { … } finally { await cleanup.run(); }`; the meta-test specs are out
> of the shape's scope. Probes P9 and P10 added to `research/probes.md`. Decisions
> `ADR-0036`…`ADR-0038`, all `proposed`, none pending. Their keys exist in no commit (`HEAD`'s lock
> ends at `FACT-3746`), so the drafts were revised in place, not retired; `ADR-0022` applies from
> the first commit.

## 1. What the research established

- The cookie: name, flags, raw-JWT value, who sets it — `research/code.md` §1 (`contract.md` §1
  carries stale lines). A cookie built from the API token is accepted today — `probes.md` P1.
- Every functional spec logs in through the UI; positive UI logins by case — `tests.md` §1–2.
  Creation without cleanup; users and exact counts by case — `tests.md` §4–5. No spec uses
  `beforeAll`, `afterAll`, `beforeEach` or `afterEach` today (grep over `e2e/**/*.spec.ts`).
- `mkdirSync` is atomic across processes; teardown runs on failure; in-memory storage state works —
  P2, P3. DELETEs return `total` to the seed — P4.
- Global teardown fails the run when it throws, sees both `webServer`s up, runs after a failing
  test; a held api port stops a run before global setup, also when it is the second entry after a
  reusing first one, as in the real config — **P5**, run 6. Renaming a prepared directory onto an
  absent path has exactly one winner; a held file blocks a directory rename; `process.kill(pid, 0)`
  throws `ESRCH` for a gone process — **P6**.
- `beforeAll` runs once per worker that runs a test of the `describe`, `afterAll` in each such
  worker even after a failure; a test-scoped fixture is one instance across `beforeEach`, body and
  `afterEach` and is torn down after `afterEach`; taken by `beforeAll` it is a separate instance
  living for that hook only; a fixture-teardown error is reported beside the test's own — **P7**.
- The TypeScript compiler API (`typescript` 6.0.3, root devDependency) bounds a `test` call and
  its tag, so a password read can be judged inside or outside a tagged test, and the
  body shape can be checked per test — **P8**.
- Test-scoped fixtures are torn down in reverse order of first use, each one's dependents first, so
  fixtures that depend on a common one are always torn down before it; a timed-out body does not
  run its `finally`, while `afterEach` and fixture teardown do; `afterAll` runs after a failed
  `beforeAll` — **P9** (`FACT-3814`). `try { … } finally { await cleanup.run(); }` passes the
  repository's ESLint, a rethrow-only `catch` is `no-useless-catch`; the compiler-API check finds
  eight broken shapes, a file with no `test` call and an aliased `test` — **P10** (`FACT-3816`).
- The schema has three models, and no row a test can create belongs to no user (`FACT-3815`).
- Facts to retire and their citers — `contract.md` §1, §7; contradictions 1–8 — `research/README.md`;
  the `FX-052` reproduction — `tests.md` §8; meta-test rules a new directory meets — `tests.md` §6.

Read from code for the range gap carried forward: `AR-API-14` treats only `docs/plans` and
`docs/profiling` as historical, matches each `FACT-NNNN` token, and fails a living document citing
a retired key (`architecture.api.spec.ts:751,755,869,893-906`); a range hides its inner keys.

## 2. The shape

**`apps/api`** — the seed only (§4). **`apps/web`** — nothing; the proxy, `dal.ts` and the cookie
code are what the suite now targets from outside.

### 2.1 The API layer, `e2e/api/` (`FACT-3758`)

| Today                                                                                                                 | Becomes                                                                          |
| --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `fixtures/auth.api.ts`: `loginApi`, `authHeaders`, `authHeadersFor`                                                   | `api/auth.api.ts`, unchanged in behaviour (per-worker token cache, 200 asserted) |
| `fixtures/cleanup.api.ts`: the two not-found bodies                                                                   | `api/meetings.api.ts` / `api/meeting-files.api.ts`                               |
| `fixtures/cleanup.api.ts`: `withCleanup`, `Track`                                                                     | `api/cleanup.api.ts`, the tracker (§2.4); `withCleanup` goes                     |
| `fixtures/multipart.ts`                                                                                               | `api/meeting-files.api.ts` (the upload encoder)                                  |
| spec-local `createMeeting`, `createTrackedMeeting`, `createOrganizerMeeting`, `createOwnMeeting`, `fetchMeetingsPage` | `api/meetings.api.ts`; every create takes a tracker                              |

`fixtures/api.ts`, `seed.ts`, `console.ts` stay; `auth.fixture.ts` goes, its reason (`FACT-3749`)
answered by the guard (`FACT-3757`). The meta-tests accept the directory as is (`tests.md` §6).

**One `test` for every spec.** The fixture sets are composed in one module, `e2e/fixtures/suite.ts`,
which extends `fixtures/api.ts`'s `test` (`api.ts:54`) with the lease, `claim`, the session page,
`cleanup` and `preconditions`, and exports the result as `test` with `expect`. Every spec in rule 11's
or rule 12's scope imports `test` from it by that name; no spec imports a fixture set under an alias
or composes sets itself with `mergeTests`. Aliasing happens only inside `e2e/fixtures/` (the
`test as base` of `api.ts:1`), which neither rule's alias check reads (`FACT-3759`, `FACT-3811` bound
it to spec files). Other named exports — `isNestRequest` — are imported from `fixtures/api.ts` as
today. The name is not `test.ts`, so no `testMatch` glob can mistake it for a spec.

### 2.2 The session (`FACT-3756`, `FACT-3757`, `FACT-3806`)

One builder turns an `accessToken` into a cookie with exactly `FACT-3756`'s fields, used by the
pool and by `AL-FN-13`, so the guard tests the code the pool runs. `AL-FN-13` is the one positive
UI login in `auth-login` (`FACT-3755`): it absorbs `AL-FN-02` (URL `/`, one `ps_session`, `Sign in`
gone, invariant 11), keeps its own (httpOnly, path, sameSite, three JWT segments, `document.cookie`
blind), and gains the guard comparison and the sign-in traffic check of `HD-FN-11`/`SEC-FN-03` (no
browser request to the Nest port, none carrying `Authorization`, list non-empty).

**Q5, owner's option B.** `MF-FN-09` and `SEC-FN-01` keep a form sign-in as the pool user they hold,
with unchanged expectations, and carry the tag `@ui-login` (`FACT-3806`). They hold a claim but
take a page with **no** built state — a fresh context — so `SEC-FN-01` reads the cookie the
application set, and `MF-FN-09`'s first session is the one it signs in for (its forged-cookie step
and the session-expired hop are unchanged). `FACT-3042` keeps `SEC-FN-01` as its source.

### 2.3 The pool (`ADR-0037`, `FACT-3773`…`FACT-3779`)

The ADR states each rule; this adds only what it leaves to the design.

- **Who:** both projects (`FACT-3783`). `web` cases with a session claim one user; `HD-API-23`
  claims one and takes no page. A claim is a test-scoped fixture, taken when a `beforeEach` or the
  test first asks for it — a browser module's `beforeEach` does, since it creates the preconditions
  on that user — and released after its `afterEach` (P7, P9, `FACT-3774`).
- **The lease** (`FACT-3776`): a test-scoped fixture that `claim`, `cleanup` and `preconditions`
  all depend on, and whose teardown is the release. It claims nothing until `claim` asks, so an
  `api` test that uses only `cleanup` gets a lease and no user. By P9, Playwright tears down a
  fixture's dependents before the fixture whatever order the test names them in, on a pass, a
  failure and a timeout (`FACT-3814`; P9's `A1` shows the opposite order without the dependency,
  `FACT-3819`). Built-in contexts are no exception to that rule: in P12's D1–D3 the built-in
  `request` was never a dependent of the lease, and its disposal followed setup order exactly as
  P9's `A1` shows for any two unrelated fixtures — with `request` set up before the lease the
  release ran on a live context and disposal came 13–21 ms later (`FACT-3821`). So each context is
  made a dependent of the lease in `suite.ts`, and the one link that still rests on setup order is
  named:
  - **`request`, `apiRequest` and `context`** are overridden as
    `async ({ lease, <name> }, use) => use(<name>)`, the lease named first — the form P12 probed
    for `request`, which disposed the context before the release whatever order the test named
    its parameters in. The override itself is a dependent of the lease by P9. Its parent built-in
    is not: inside the override the lease and the parent are two unrelated dependencies, and the
    parent is disposed before the release only because the lease, named first, is set up first —
    setup order, P9's `A1`. **The parameter order `({ lease, <name> }, use)` is therefore
    load-bearing and must not be reordered**; P12 never ran the override with the built-in named
    first. `page` follows `context`, which it depends on. `apiRequest` (`code.md`, the `api.ts`
    row; `api.ts:57`) is the `web` project's Nest context and is the same case as `request`.
  - **The session page** opens its own context from the claim's stored state in a fixture that
    depends on `claim`, so it is a dependent of the lease by P9.
  - **`claim`, `cleanup` and `preconditions`** depend on the lease and on the request context they
    call through (`request` in `api`, `apiRequest` in `web`), so their teardowns — the trackers'
    fallback deletions included — run while that context is alive and before the release.
  - **The release** therefore cannot use the test's contexts, which are gone by then: it reads
    `total` on a request context it opens in its own teardown against the API base URL, as
    `apiRequest` does today, and disposes it there.

  What is proven: the `request` link (P12) and the suite-defined links (P9). What is not: that the
  `context` and `apiRequest` overrides behave as the `request` one did — P12 had no browser and
  probed only the built-in. That is **a T4 check, "contexts close before the release"**: with the suite's own fixtures, a `@ui-login`
  test and a `web` test calling through `apiRequest` each time out mid-`await` with the lease set up
  last and first, and the log shows each context closed before `RELEASE start`. A red T4 check
  sends `ADR-0037`, still proposed, back for revision of `FACT-3776` before any further task
  builds on the release order.

- **Where:** `.e2e-pool/` at the root, git-ignored, outside every meta-test walk root:
  `claims/pool-NN/owner.json`, `state/pool-NN.json`. Not `test-results/`: Playwright owns its wipe
  timing, which the research does not record. One run per tree holds because the api `webServer`
  has `reuseExistingServer: false` (`playwright.config.ts:113`, `code.md` §4): a second run dies
  before its global setup could wipe a live run's claims (P5 runs 5 and 6).
- **Claim** (`FACT-3774`): the record `{ pid, workerIndex, testId, claimedAt }` is written into
  `claims/.tmp-<pid>-<n>/`, then renamed onto `pool-01` … `pool-10` in order. Any rename failure
  counts as "taken": `EPERM` is both a loser's code and a held file's (P6). A reader getting
  `ENOENT` skips the slot (it is being released).
- **Release** (`FACT-3776`), in the lease's teardown: the contexts, the claim and the trackers are
  already torn down (above), then the `testId` check, then `GET /meetings?limit=1` per held user on
  the lease's own context. Its budget is the test timeout, apart from every other teardown's
  (`FACT-3820`), so the 2 s `EPERM` retry and the read fit whenever the test timeout exceeds them;
  a release cut by its budget leaves the claim held by a worker that is then replaced, which is
  the takeover's case. All `total` 0 → rename to
  `claims/.released-<pid>-<n>` (retried every 10 ms while `EPERM`, failing the test after 2 s naming
  the slot), then removal. Any `total` above 0 → the test fails with `pool-NN holds N meetings after
the test's cleanup`, `claims/pool-NN/leaked.json` is written (a plain write inside a directory
  only the holder owns), and the claim stays: the slot is out of the pool for the run, the rows stay
  for the teardown comparison. **Release deletes nothing** — decision (b), §2.4.
- **Takeover** (`FACT-3777`): a holder is dead when `process.kill(pid, 0)` throws `ESRCH` (P6); a
  slot with `leaked.json` is never taken over, though its holder worker is replaced after the failure
  (P7's restarted worker) and is therefore dead. The claimant renames its own record directory to
  `pool-NN.takeover`, re-reads, purges and releases only when the record still names the same dead
  pid and test, and removes its marker after the release — **or at once when the re-read names
  anything else** (nit 2). With nothing free, the claimant waits 100 ms with jitter and rescans inside
  the test's own timeout, which on expiry fails naming every holder's `testId`.
- **Two users:** all-or-nothing (`FACT-3775`); a `--workers` value above the pool slows a run but
  cannot deadlock it. The second user gets a page only if the case asks for one.
- **State** (`FACT-3778`, `FACT-3779`): kept between the tests of one run and never across runs,
  because global setup empties `.e2e-pool/`. The 1 h JWT (`auth.config.ts:13`) matters only to a
  run over 58 minutes, which the 120 s rebuild covers. Signing out (`HD-FN-08`) deletes one
  context's cookie; the JWT is stateless (`FACT-0024`).

### 2.4 Cleanup (`FACT-3780`, `FACT-3781`, `FACT-3809`…`FACT-3812`, `FACT-3817`)

**The owner's three places** (`FACT-3809`), each with its tracker (`FACT-3780`):

| Rows                                                     | Created in   | Registered with                | Deleted by                                                 |
| -------------------------------------------------------- | ------------ | ------------------------------ | ---------------------------------------------------------- |
| system-level data the whole module uses — **none today** | `beforeAll`  | a tracker the hook creates     | `afterAll`: `run(request)`, then its failures thrown       |
| one test's precondition (held pool user, or `planner`)   | `beforeEach` | the `preconditions` fixture    | `afterEach`: `await preconditions.run()`                   |
| created by the test body (API or the UI)                 | the body     | the `cleanup` fixture          | the body's `finally`: `await cleanup.run()`                |
| anything still registered at teardown                    | —            | the fixture's leftover entries | the fixture's teardown deletes them **and fails the test** |

**Where system-level data exists today: nowhere.** The schema has `User`, which no route creates
or deletes; `Meeting`, owned by one user; and `MeetingFile`, belonging to one meeting
(`FACT-3815`). Every row a test can create is therefore some user's, can change that user's counts
and lists, and is a per-test precondition under the owner's rule. So no module, browser or `api`,
has `beforeAll`/`afterAll` rows (`FACT-3817`) — the rule applied, not an exception to it. The first
row of the table stays as the rule's place for data that may exist later; no tracker or fixture is
built for it now (§8).

- **The tracker** (`api/cleanup.api.ts`): `track(path, as, tolerated)` — `as` is the token the
  row is deleted with, so one test can clean rows of two owners; `trackAllOf(claim)` (`FACT-3810`)
  — every meeting of a held pool user, the loop `GET /meetings?limit=100` (the route's ceiling,
  `FACT-2035`; `LIMIT_MAX`, `limits.ts:21`), `DELETE` each, until `total` is 0; it takes the claim
  object, so no seeded owner can be passed, and deletes nothing once the claim is released (it
  records a failure naming the slot) — a second guard behind the lease order; `run()` deletes in
  reverse registration order, empties itself, **records failures and never throws**. The `cleanup`
  and `preconditions` fixtures throw the recorded failures from their teardown, which P7 shows is
  reported beside the body's own error rather than in its place. A throwing `finally` would replace the
  body's error in plain JavaScript, and with no `catch` the `finally` cannot know whether the body
  failed, so `run()` must not throw.
- **Body shape** (the owner's answer 2, `FACT-3809`): `try { …the test… } finally { await
cleanup.run(); }` — no `catch`, so `no-useless-catch` stays on and the body's own error
  propagates untouched (P10, `FACT-3816`); the whole body, every test in rule 12's scope, also those
  that create nothing (their `run()` is a no-op). Checked statically by suite rule 12 (§2.7).
- **The fallback** catches what no static rule can: a test that timed out — its `finally` does not
  run (P9, `B3`), its fixture teardowns do — and a `beforeEach` registration with no `afterEach`.
  The rows are deleted and the test is red naming them, so the fallback hides nothing. Because the
  trackers depend on the lease, the fallback has finished before the release check (§2.3), so a
  timed-out test whose rows the fallback removed releases a clean user rather than a leaked one.
- **`trackAllOf` beside id-tracked rows.** Any id entry deleted with the token of a claim whose
  collection is also registered accepts the not-found `404` (`FACT-2016`, `FACT-2083`), whichever
  was registered first (`FACT-3810`): `run()` goes in reverse order, so an id registered before
  `trackAllOf` is deleted after the purge removed it. Precondition rows a body's `trackAllOf` purges
  are the same case across two trackers: `preconditions.run()` in `afterEach` follows the body's
  `finally`, by which time `cleanup` has purged and emptied itself. **Who sets the tolerance, and
  when:** neither the caller nor the registration. `trackAllOf(claim)` records the claim on the
  test's lease, which both trackers depend on; every tracker of that test, when it deletes an id
  entry, accepts the not-found `404` if the entry's token is that of a claim the lease has recorded
  at any point in the test — so `preconditions` entries registered in `beforeEach`, before the body
  called `trackAllOf`, are covered when `afterEach` deletes them. An entry deleted with any other
  token, including `planner`'s, is unaffected. `track`'s own `tolerated` argument stays for a
  caller whose body may delete the row itself (`HD-API-23`'s explicit `DELETE`s) and is never how
  this tolerance is set.
- **Browser cases** create their preconditions per test on the user they hold, in `beforeEach`; a
  case that creates through the UI (`HD-FN-07`, `MF-FN-05`, `MF-FN-06`, `MF-FN-15`) registers
  `cleanup.trackAllOf(claim)` before its first UI create.
- **Seeded shape.** A case that reads `teacher`'s shape (5 meetings, the last 3, `Geometry
workshop` with two files, `15 Jan 2026, 14:00`) creates a copy in `beforeEach` with the seed's
  titles, dates, durations, participants, file names, sizes and byte rule (`FACT-1075`,
  `FACT-3799`). Files list `uploadedAt` descending, then `id` (`FACT-2110`), and `MF-FN-02` expects
  `notes.txt` first, so the copy uploads `syllabus.pdf`, then `notes.txt` once the clock is past the
  first's returned `uploadedAt`, and asserts the two differ — a tie would fall to the random id
  (`ADR-0031`, invariant 7). `e2e/fixtures/seed.ts` gains the values it lacks; `SM-API-03` extends
  `FACT-1033`'s drift check over them.
- **`api` cases on `planner`** register every create (`FACT-3780`): the 22 non-cleaning cases of
  `tests.md` §4 gain it, `withCleanup` users move to the `cleanup` fixture, relative counts stay
  (`FACT-3784`). A row several cases of one module used to share is `planner`'s, so it is not
  system-level data: each case creates its own in `beforeEach`, registers it with `preconditions`,
  and addresses it by id; `afterEach` deletes it. No `api` module gets a `beforeAll` row.
- **`HD-API-23`** (Q1, owner's option A) claims a pool user instead of `eraser`, keeps its tracker
  and its explicit `DELETE`s, and its counts may stay relative (`FACT-3784` allows absolute ones over
  a held user; the case text decides at test design).
- **The comparison** (`FACT-3781`) is Playwright's global teardown: it logs in each seeded user —
  the ten pool users included — through `e2e/api/` and compares `GET /meetings` `total` and each
  seeded meeting's file list with §4's baseline. P5 settles that a throw fails the run and both
  servers are up, so it needs no fallback and `FACT-3792` stands. Its api base URL comes from the
  `FullConfig` Playwright passes — the `web` project's `apiBaseURL` option, as `warm-up.ts:47-50`
  reads it — so suite rule 9 (no `E2E_` env, no quoted address, `suite-integrity.api.spec.ts:441-458`)
  holds.

**Decision (a) — where shared rows live: the owner's answer 1.** The two rules do not conflict,
because they govern different data. `beforeAll`/`afterAll` is for system-level data the whole
module uses — data that belongs to no user and cannot affect other users or tests; per-user
preconditions belong in `beforeEach`/`afterEach` for the user the test holds (`FACT-3809`). This
application has no system-level data (`FACT-3815`), so neither project has `beforeAll` rows
(`FACT-3817`): browser cases create theirs on the held pool user, `api` cases theirs on `planner`
or, for `HD-API-23`, on the held pool user. No claim spans a module (`FACT-3813`): a pool user is
taken by one test and returned when it ends. The cost is per-test preconditions where a module
used to share rows, measured at acceptance (§8).

**Decision (b) — release-time purge: dropped.** Normal release deletes nothing (`FACT-3776`,
`FACT-3812`): it checks the held user is back to 0 and, when not, fails the holding test and leaves
the user leaked, so the teardown comparison lists it too. **The takeover keeps its purge**
(`FACT-3777`): a dead holder never reached its `finally` or `afterEach`, so its rows are a crash's,
not a skipped cleanup's; the crashed test is already red; and leaving the slot dirty would let one
crash loop starve every later claim into timeouts that hide the crash. The cost is that the
teardown does not list a crashed test's rows (ADR-0037, Consequences).

### 2.5 Configuration

`playwright.config.ts`: `workers: isCI ? 1 : 7` (`FACT-3786`; CI unchanged — decision 1 concerns the
14-core local machine); `globalSetup` empties `.e2e-pool/`, then runs the warm-up if §2.6 keeps one;
`globalTeardown` is the comparison. Ports, projects, suffixes, `fullyParallel`, retries, timeouts
unchanged. `.gitignore` gains `.e2e-pool/`.

### 2.6 The warm-up decision (owner decision 8)

Run after the change is otherwise accepted, with the `FX-052` procedure (`tests.md` §8): no listener
on 3100/3101, warm `.next`, seven CPU busy-loops, `pnpm e2e --project=web --reporter=list`. Per run:
exit code, failing IDs, each failure's first line. The **`FX-052` signature** is Next's own HTML 404
for an existing route (`BL-063`) or a first navigation stuck on its source page; any other failure
is diagnosed separately and the arm re-run.

- **Arm A — no warm-up, 10 runs.** 10/10 green → `warm-up.ts` removed, `BL-067` closed as moot, the
  6.2 s line leaves "Run economics", and rule 11's warm-up allowance is removed (it would match no
  read and go red, `FACT-3759`).
- **Arm B — only if A shows the signature: minimal warm-up, 10 runs.** A serial `GET` of every page
  and Route Handler, protected ones with a `teacher` cookie from the builder; no form submit; the
  allowance is removed the same way.
- **Arm C — only if B shows the signature:** today's warm-up unchanged, including its UI login,
  which the allowance already covers.

Until the measurement, `warm-up.ts:58` is covered by that allowance, so rule 11 is green at
acceptance (nit 3).

> **Rationale — not a fact.** Ten runs, not five: at 7 workers the failure rate is unknown and
> probably lower than the 3 of 5 measured at 14; if a 25 % rate survived, ten greens in a row would
> still happen about 6 % of the time.

### 2.7 Conventions and meta-tests

- **Suite rule 11** (`FACT-3759`) scans `*.functional.spec.ts` outside `auth-login/` and
  `e2e/fixtures/*.ts` except `seed.ts`. Patterns: `\.password\b`; a destructuring binding
  (`\{[^}]*\bpassword\b[^}]*\}\s*=`, the `warm-up.ts:58` form); `SEED_PASSWORD`; `Passw0rd!`. Each
  file is parsed with `ts.createSourceFile`; the `test` calls (`test`, `test.only|fixme|fail|slow|skip`
  with a function argument) and their `tag` literal are collected; a match is allowed only when its
  offset lies inside the function argument of a call tagged `@ui-login` (P8). Further failures: the
  tag in a non-functional file; the set of case IDs opening tagged titles ≠ the IDs in
  `FACT-3806`'s line of `ADR-0036`, which the rule reads by its key; the `warm-up.ts` allowance
  matching nothing. A read in a module-level helper called from a tagged test is a hit (P8 source C)
  — the exception does not spread through shared code. **Self-check** (`ADR-0010`, the `AR-API-17`
  pattern): must-hit sources — each pattern in an untagged test, the helper read, the tag in an
  `.api.spec.ts`, a tagged set one ID short, a functional spec with no matched `test` call (P10
  `G`), one importing `test as it` (P10 `G`) and one declaring `const it = test` (P10 `H`) —
  without these three, an aliased `test` would leave the rule nothing to bound and it would pass
  having checked nothing (nit 2); must-miss — the reads inside tagged tests, the four API
  lines (`security.api.spec.ts:69,80,171`, `home-dashboard.api.spec.ts:111`) under an `.api.spec.ts`
  path, the wrong-password literal (`accessibility.functional.spec.ts:79`) under a functional path.
  Known gap: a page-driving helper in `e2e/api/` is unscanned; `FACT-3758` keeps it to API calls.
- **Suite rule 12** (`FACT-3811`) parses `*.api.spec.ts`, `*.functional.spec.ts`,
  `*.integration.spec.ts` under `e2e/` and fails on any `test` call whose function is not exactly
  `try { … } finally { await cleanup.run(); }`, naming file and title. It goes red on: any `catch`
  clause, rethrowing or not; a statement before or after the `try`; no `try`; a `finally` that is
  empty, lacks `await cleanup.run();`, holds it unawaited, or holds anything more. It also fails a
  file in its scope with no matched `test` call, or one that imports or declares `test` under
  another name (nit 2) — which the single `e2e/fixtures/suite.ts` export (§2.1) makes satisfiable:
  `security.functional.spec.ts`, `home-dashboard.functional.spec.ts` and
  `meeting-files.functional.spec.ts` drop their `test as apiTest` / `test as authTest` imports and
  their `mergeTests` line for it (§7). **Scope, stated** (the owner's answer 3): the four meta-test specs —
  `suite-integrity.api.spec.ts`, `architecture/`, `ledger/`, `process/` — create no data, so they
  are outside the shape's scope by definition, not by exception. **Self-check:** must-hit — P10
  source `F`'s eight broken shapes (`X-FN-01`…`08`), source `G` (no `test` call, aliased import)
  and source `H` (`const it = test`); must-miss — the full shape at top level, in a nested
  `describe` (P10 `J`) and under `test.skip` (`X-FN-10`). What it cannot see — a create registered
  with nothing — the teardown comparison catches (C3); a second test object built by `base.extend`
  under another name beside a `test`-named one is a known gap (ADR-0037, Consequences).
- **One top-level `describe` per spec** (`FACT-3809`, nit 1): nested `describe`s stay allowed and
  are how a module groups tests whose preconditions differ — `'without a session'`, `'user without
meetings'`, a seeded-shape group — each with its own `beforeEach`/`afterEach`. Not enforced by a
  rule; the three `api` specs with several top-level `describe`s are restructured (§7).
- The header's "Ten rules" becomes twelve (`FACT-3184` retired into `FACT-3802`, §4).
- **`e2e/README.md`:** the fixture table (`:117-124`) is rewritten for `e2e/api/`, the pool, the lease and the
  two trackers; the mutating-case rules (`:224-246`) are replaced by `FACT-3782`…`FACT-3784` and
  the owner's three places, ending contradiction 3; the non-cleaning list (`:239-241`) goes; `:246`
  stays; a UI-once paragraph names the two `@ui-login` tests; "Run economics" gets a measured row at
  acceptance (contradiction 7's 167/173 is replaced).
- **`CLAUDE.md`** names `e2e/api/`; `e2e/scenarios-index.md` regenerates (`PR-API-07`).

### 2.8 Control experiments for acceptance

Each is a temporary edit, a run, the expected red, a revert, a green run.

| #   | Edit                                                                                                                                                                                    | Expected red                                                                                                                                                                                                                                                                                                                                           |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C1  | the claim treats a failed rename as success                                                                                                                                             | the collision detector fails a test naming two test ids                                                                                                                                                                                                                                                                                                |
| C2  | the builder sets `sameSite: 'Strict'`; separately, `httpOnly: false`                                                                                                                    | `AL-FN-13`, naming the field; `SEC-FN-01` stays green — it reads the application's cookie (option B)                                                                                                                                                                                                                                                   |
| C3  | (i) drop the registration of one `planner` create; (ii) drop `cleanup.trackAllOf(claim)` in `HD-FN-07`                                                                                  | (i) teardown lists `planner` (3 vs 2); (ii) `HD-FN-07` fails at release naming `pool-NN` and 1, teardown lists it                                                                                                                                                                                                                                      |
| C4a | a functional spec outside `auth-login` with `const { email, password } = SEED_USERS.teacher` in an untagged test                                                                        | rule 11, naming file and line; then the same with `TEACHER.password`                                                                                                                                                                                                                                                                                   |
| C4b | none                                                                                                                                                                                    | none: rule 11 green with the four API lines and both tagged tests present                                                                                                                                                                                                                                                                              |
| C4c | remove `@ui-login` from `MF-FN-09`                                                                                                                                                      | rule 11: the read at its line, and the tagged set missing `MF-FN-09`                                                                                                                                                                                                                                                                                   |
| C4d | add `@ui-login` to `MF-FN-01`                                                                                                                                                           | rule 11: the tagged set has `MF-FN-01`, which `FACT-3806` does not name                                                                                                                                                                                                                                                                                |
| C4e | move `MF-FN-09`'s password read into a module-level helper it calls                                                                                                                     | rule 11, naming the helper's line                                                                                                                                                                                                                                                                                                                      |
| C5  | a throwaway test kills its own worker while holding a claim and after creating a meeting, at `--workers=10`                                                                             | the throwaway alone: the slot is taken over, purged, the run finishes, teardown green                                                                                                                                                                                                                                                                  |
| C6  | none; run at `--workers=14`                                                                                                                                                             | none: slower, green, no deadlock                                                                                                                                                                                                                                                                                                                       |
| C7  | in one test, `catch (e) { throw e; }` before the `finally`; separately, an empty `finally`; separately, `import { test as it }` in one spec                                             | rule 12, naming file and title (the alias: naming the file), each time; with the `catch`, `pnpm lint` also red (`no-useless-catch`)                                                                                                                                                                                                                    |
| C8  | a throwaway test registers a row with `preconditions` in `beforeEach` and its module has no `afterEach`                                                                                 | that test fails naming the undeleted row; teardown green (the fallback deleted it)                                                                                                                                                                                                                                                                     |
| C9  | `cleanup` stops depending on the lease; a throwaway test takes `({ cleanup, claim })`, registers `trackAllOf(claim)`, creates a meeting through the API and then waits past its timeout | the release runs first (P9 `A1`): the test fails naming `pool-NN` and 1, and `leaked.json` is written; the claim is kept, not released, so the `cleanup` fallback that runs after it still deletes the meeting and adds its own error naming that deletion; reverted, the same test fails only naming the fallback's deletion and the slot is released |

C3 (ii) stays red because release deletes nothing (decision b); under the old release purge it would
have been green. C9 shows the lease dependency is what orders the fallback before the release.

## 3. Contract

**No HTTP route, body, status or error shape changes.** The suite uses `POST /auth/login`
(`FACT-2021`, `FACT-2022`), `GET /meetings` (`FACT-2035`, `FACT-2038`), `POST`/`DELETE` meetings
and files (`FACT-2128`, `FACT-2129`, `FACT-2130`, `FACT-2131`) as they stand. A tracker accepts a
`404` only with `FACT-2016`'s body (`{"message": "Meeting not found", "error": "Not Found",
"statusCode": 404}`) or `FACT-2083`'s (`"File not found"`); `trackAllOf` and the takeover purge
accept `204` only, since a held user's meetings cannot vanish under it. `PROTECTED_ROUTES` is
unchanged. The suite-side contract is the cookie (`FACT-3756`) and its guard (`FACT-3757`). No UI
changes, so no HeroUI components or accessible names are introduced.

## 4. Data

**Seed** (`users.seed.ts`, `meetings.seed.ts`, mirrored in `e2e/fixtures/seed.ts`):

| Id                            | Email                                                     | Name                            | Meetings | Files     | Role                                     |
| ----------------------------- | --------------------------------------------------------- | ------------------------------- | -------- | --------- | ---------------------------------------- |
| `usr-teacher`                 | `teacher@purpleschool.test`                               | Anna Teacher                    | 5        | 2 on `-3` | unchanged (`FACT-1034`)                  |
| `usr-student`                 | `student@purpleschool.test`                               | Ivan Student                    | 0        | —         | unchanged (`FACT-1035`)                  |
| `usr-planner`                 | `planner@purpleschool.test`                               | Maria Planner                   | 2        | 5 on `-2` | `api` sandbox, module rows (`FACT-3809`) |
| `usr-pool-01` … `usr-pool-10` | `pool-01@purpleschool.test` … `pool-10@purpleschool.test` | `Pool User 01` … `Pool User 10` | 0        | —         | one test at a time, both projects        |
| ~~`usr-organizer`~~           | removed with `mtg-organizer-1`                            |                                 |          |           | `FACT-3773`                              |
| ~~`usr-eraser`~~              | removed                                                   |                                 |          |           | `FACT-3773` (Q1 A)                       |

Thirteen users, password `Passw0rd!`; eight more scrypt hashes per `db:reset` (`FACT-3578`),
unmeasured. `SM-API-02` logs in every key of `SEED_USER_KEYS` (+10, −2). Mutating cases: `api` →
`planner`, except `HD-API-23` → a claimed pool user; `web` → a claimed pool user. Created dates:
2030 on `planner`; seed dates allowed on a held pool user (`FACT-3799`). **Baseline:** `teacher` 5,
`mtg-teacher-3` 2 files, other teacher meetings 0; `planner` 2, `mtg-planner-2` 5 files,
`mtg-planner-1` 0; `student` and every pool user 0 meetings.

**Keys that move at implementation** (never edited in place, `ADR-0022`); `data-model.md`
successors take fresh numbers from `pnpm fact:next data` then:

| Key         | Home       | Becomes                                                                                                                                  |
| ----------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `FACT-3125` | `ADR-0007` | retired by `FACT-3782`                                                                                                                   |
| `FACT-3126` | `ADR-0007` | retired by `FACT-3783`                                                                                                                   |
| `FACT-3131` | `ADR-0007` | retired by `FACT-3784`                                                                                                                   |
| `FACT-3132` | `ADR-0007` | retired by `FACT-3799`; the register intro's "The ten keys this record still states" (`ADR-0007:50-52`) loses its count in the same edit |
| `FACT-3593` | `ADR-0027` | retired by `FACT-3803`: its "ten it still states" becomes six with the four above                                                        |
| `FACT-3580` | `ADR-0027` | retired by `FACT-3785`; `ADR-0027` stays accepted                                                                                        |
| `FACT-3642` | `ADR-0029` | retired by `FACT-3795`; `ADR-0029` stays accepted, gains a register                                                                      |
| `FACT-3184` | `ADR-0010` | retired by `FACT-3802` (no count); `ADR-0010` stays accepted, gains a register                                                           |
| `FACT-1023` | data-model | retired by a new key: 2030 for a shared owner, seed dates allowed on a held pool user                                                    |
| `FACT-1031` | data-model | retired by a new key scoping the robustness rules to a shared owner                                                                      |
| `FACT-1076` | data-model | retired by a new key: same text, citing `FACT-3784` instead of the retired key                                                           |
| `FACT-1086` | data-model | retired by a new key: "Every seeded user shares one password, `Passw0rd!`." (no count)                                                   |
| `FACT-1087` | data-model | retired by a new key: `planner` shared by `api`; every other mutated owner is a pool user one test holds, in either project              |
| `FACT-1037` | data-model | withdrawn, the register row naming `FACT-3773`                                                                                           |
| `FACT-1085` | data-model | withdrawn, the register row naming `FACT-3773` (Q1 A)                                                                                    |
| (new)       | data-model | the pool-user row, sourced `ADR-0037`                                                                                                    |

Source-only re-points (a wording fix plus `pnpm fact:lock`, `FACT-3501`): `FACT-2096` (`FACT-3642` →
`FACT-3795`). `FACT-3042` is **not** re-pointed (Q5 B: `SEC-FN-01` still reads the application's
flags); `FACT-0010` and `FACT-3048` keep `SEC-FN-01` too. Living citers to re-point: those of
`contract.md` §7, with `docs/CHANGELOG.md:38`'s range rewritten so `FACT-1085`/`FACT-1086` are not
hidden in it. The ledger and backlog are re-pointed in place: `AR-API-14` treats them as living, and
changing its historical directories is a corpus-rule change outside this change. Lines in the moved
keys' own documents become register rows, which `AR-API-14` exempts. `docs/security.md:92` becomes
"A cap of ten files per meeting, so one meeting cannot hold files without bound; deleting a file
frees a slot." `BL-068` closes. Unchanged and checked: `FACT-1030`, `1033`, `1034`, `1035`, `1039`,
`1071`…`1075`, `3221`, `3579`, `3584`, `3042`; `ADR-0003`, `ADR-0008`.

**`docs/architecture.md`, "Patterns in use"** (added at the plan review's first pass): the table
already lists two test patterns, and an architectural choice updates its tables as well as writing
the ADR (`project-context`, "what must be updated"). Two rows are added; each takes a fresh key from
`pnpm fact:next` (the architecture block) at implementation, and its source is the ADR in its row.
They name the pattern and where it is applied. The decision itself stays in the ADR and is not
restated:

| Key   | Pattern                                                          | Where                                                                                                 | ADR        |
| ----- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------- |
| (new) | UI exercised once; every other precondition through an API layer | `e2e/api/`, the `test` exported by `e2e/fixtures/suite.ts`; `AL-FN-13` and the `@ui-login` exceptions | `ADR-0036` |
| (new) | A claimed pool user per test; each test deletes what it created  | `.e2e-pool/`, the `claim` and `cleanup` fixtures, `usr-pool-01` … `usr-pool-10`                       | `ADR-0037` |

The rationale block under the table gains one unkeyed sentence per row (why, not what), in the
same `> **Rationale — not a fact.**` block. `ADR-0038` adds no row: a cap is a product rule, not a
pattern. **Unchanged:** `FACT-0031` states the pattern and its file, not the user list. The pool
users join `e2e/fixtures/seed.ts` under that same pattern, and the user list is owned by
`data-model.md` (the table above). Its `ADR-0007` cite predates this change and is not this change's
to move. `FACT-0032` is also unchanged: suite rules 11 and 12 are added inside
`suite-integrity.api.spec.ts`, which its "Where" already names, and no new meta-test spec is added
(§2.7).

## 5. Alternatives rejected

Structural ones are in the ADRs with reasons: `FACT-3760`…`FACT-3763`, `FACT-3787`…`FACT-3792`,
`FACT-3797`, `FACT-3798`, `FACT-3804`, `FACT-3805`, and at this pass `FACT-3807` (exempting by file,
line or comment), `FACT-3812` (deleting on every release), `FACT-3813` (a claim held for a
module), and at the second correction pass `FACT-3818` (a rethrow-only `catch` with
`no-useless-catch` off) and `FACT-3819` (the release in the claim fixture's own teardown).
Design-level:

| Alternative                                                        | Why not                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| every mutating `api` case claims a pool user, not only `HD-API-23` | weighed at the owner's invitation and **not recommended**: `planner` stays for `mtg-planner-2` (`FACT-1073`), 22 cases would contend for ten users with every browser worker, and tracker cleanup plus `FACT-3784` makes `planner` safe |
| keeping `withCleanup` (a try/finally wrapper)                      | the owner asked for an explicit `try`/`finally` in each test; the wrapper's one merit — the body's error wins over a cleanup error — is kept by `run()` never throwing (§2.4)                                                           |
| `run()` throws on a failed delete                                  | thrown from `finally`, it would replace the body's error, and with no `catch` nothing in the body could prefer it                                                                                                                       |
| static bounding by brace counting or regex                         | a regex cannot tell a tagged test's function from a helper defined beside it, nor a template literal from code; the compiler is already a root devDependency (P8)                                                                       |
| release-time check of only the slot, no `leaked` marker            | a leaked user would go back to the pool and the next holder's absolute counts would fail in a test that did nothing wrong                                                                                                               |
| `openSync(…, 'wx')` lock files instead of directories              | equally atomic in P2, but a lock file is born empty, so its owner record is a second write — the record-less window `FACT-3805` rejects                                                                                                 |
| A takeover marker taken over when its claimant dies                | there is no compare-and-swap on a directory in Node; freeing a marker another claimant just re-created is `FACT-3804`'s race one level up. A double crash costs one slot for the rest of an already red run                             |
| Ignoring stale claims (the run is red anyway)                      | one crash costs a slot for the rest of the run, and a crash loop starves every later browser case into timeouts that hide the original failure                                                                                          |
| `AL-FN-02` as the surviving positive case                          | the natural name, but `FACT-0010` and `FACT-3048` cite `AL-FN-13` as a source and nothing cites `AL-FN-02`                                                                                                                              |
| Merging `HD-FN-11`, `SEC-FN-01` into `AL-FN-13` too                | they are sources of `FACT-0009`, `FACT-0010`, `FACT-3022`, `FACT-3029`, `FACT-3042`, `FACT-3048`; `HD-FN-11`'s page traffic still holds on a built session, and `SEC-FN-01` is an owner-named exception                                 |
| Read-only browser cases on `teacher` without a claim               | cheaper, but decision 3 has every browser test take a pool user, and the empty-state cases would need a second exception for `student`                                                                                                  |
| Static rule that every create is tracked                           | not decidable from source (a raw `request.post` is legitimate in a contract case); the teardown comparison and the release check catch the omission at run time, which C3 proves                                                        |
| `cleanup` and `preconditions` depending on `claim` directly        | orders the teardown just as well, but every `api` test using `cleanup` would then claim a pool user and contend with the browser workers                                                                                                |
| `trackAllOf` refusing a released claim as the only guard           | it stops the deletion of a next holder's rows, but not the release check running first and marking a slot leaked whose rows the fallback was about to delete; it stays as the second guard (§2.4)                                       |
| `planner` rows shared through a module's `beforeAll`               | they are a user's rows, which the owner's answer 1 puts in `beforeEach`/`afterEach`; `beforeAll` is for system-level data, of which there is none (`FACT-3815`)                                                                         |

## 6. Decisions and ADRs

- **`ADR-0036`** (`FACT-3747`…`FACT-3763`, `FACT-3802`, `FACT-3806`, `FACT-3807`) — UI once;
  `e2e/api/`; the builder and its guard; the two `@ui-login` exceptions; suite rule 11.
- **`ADR-0037`** (`FACT-3764`…`FACT-3792`, `FACT-3799`…`FACT-3801`, `FACT-3803`…`FACT-3805`,
  `FACT-3808`…`FACT-3819`) — the pool for both projects, rename claim, guarded takeover with purge,
  release in the lease's teardown without purge and the leaked mark, state, the owner's three
  cleanup places and the absence of system-level data, the trackers, `trackAllOf` and its `404`
  rule, the `try`/`finally` body, suite rule 12 with its stated scope, teardown comparison, isolation successors, workers 7. Retitled
  "Tests claim a pooled user, and every test deletes what it created" (`docs/adr/README.md`).
- **`ADR-0038`** (`FACT-3793`…`FACT-3798`) — the cap without the no-delete premise. Unchanged.

No accepted ADR is superseded whole: `ADR-0007` (already superseded), `ADR-0010`, `ADR-0027`,
`ADR-0029` gain register rows. No new record cites a key it retires (`AR-API-14`, §1). Nits 4 and 5
of the re-run verdict: `FACT-3800` now records P5 run 6; `FACT-3750` no longer restates the cookie's
name; `FACT-3803` names `ADR-0027` and this record.

## 7. Impact on what already exists

| Artifact family                      | Grep or command run                                                                                                                                                        | IDs returned                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Removed / merged cases               | `git grep -nE "AL-FN-02\b" -- . ':!docs/plans' ':!docs/profiling'`                                                                                                         | `AL-FN-02` → merged into `AL-FN-13`; cited in `CHANGELOG.md:39`, `:40`, `:125`, `BACKLOG.md:39` (history text), `warm-up.ts:14`, its own cases/spec, the scenarios index. No other case removed or merged                                                                                                                                                                                                                                                                                                                                                                                 |
| Every test's body                    | `grep -cE "^\s*test\(" ` over the 12 app-facing specs                                                                                                                      | 136 `test(` calls (loops count once): each becomes `try`/`finally` with `cleanup` (rule 12). The four meta-test specs are outside rule 12's stated scope and untouched                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Top-level `describe`s                | `grep -cE "^test\.describe"` per spec (P10's file list)                                                                                                                    | three `api` specs have several: `home-dashboard.api.spec.ts:82,267,506`, `meeting-files.api.spec.ts:194,430`, `meetings-detail.api.spec.ts:98,192` — each folds into one top-level `describe` with the others nested (the `:267` group keeps its serial mode inside its nested `describe` if the test designer keeps it). Nested groups already present stay: `home-dashboard.functional.spec.ts:88,344,386`, `meeting-files.functional.spec.ts:178,290`, `security.functional.spec.ts:156` (the `organizer` groups are renamed for the held user). The other nine specs already have one |
| Aliased `test` imports               | `grep -rn "mergeTests\|test as " --include=*.ts e2e`                                                                                                                       | `security.functional.spec.ts:5-6,26`, `home-dashboard.functional.spec.ts:9,11,31`, `meeting-files.functional.spec.ts:9,11,43`: the `test as apiTest` / `test as authTest` imports and the `mergeTests` line go; each imports `test` from `fixtures/suite.ts` (§2.1) and keeps `isNestRequest` from `fixtures/api.ts`. `fixtures/api.ts:1` and `auth.fixture.ts:2` (`test as base`) are outside both rules' alias check; `auth.fixture.ts` goes anyway                                                                                                                                     |
| Hooks                                | `grep -nE "beforeAll\|afterAll"` over `e2e/**/*.spec.ts`                                                                                                                   | none today, none after: no system-level data exists (`FACT-3817`). `beforeEach`/`afterEach` appear wherever a module has per-test preconditions                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Steps change, expectations kept      | `tests.md` §1; `grep -oE "as .(teacher\|student\|organizer)."` over `*.functional.cases.md`                                                                                | every `ACC-FN`, `HD-FN`, `MF-FN`, `SEC-FN` case with a session (teacher ×17, student ×2, organizer ×7 step lines); `HD-FN-11`, `SEC-FN-02`, `-03` lose the sign-in; `MF-FN-09`, `SEC-FN-01` keep it as a held pool user, tagged; serial blocks of `HD-FN-07/08`, `MF-FN-05/06/15` go                                                                                                                                                                                                                                                                                                      |
| Scoped counts                        | `grep -cE "toHaveCount\|toBeHidden\|not\.toBeVisible"` per functional spec                                                                                                 | accessibility 4, auth-login 3, home-dashboard 20, meeting-files 13, security 2 — hold only if the copy is exact (§2.4)                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Literal seed values in browser cases | `grep -nE "2026\|Jan"` over functional specs and cases                                                                                                                     | `MF-FN-02` (`15 Jan 2026, 14:00`, file order) → copies carry seed dates and upload order (`FACT-3799`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Seed password reads                  | `grep -rn "password\|Passw0rd" e2e --include=*.ts`, minus `auth-login/`, `seed.ts`                                                                                         | functional: `home-dashboard.functional.spec.ts:114` (`HD-FN-11`, goes), `meeting-files.functional.spec.ts:357` (`MF-FN-09`, stays inside its tagged test); fixtures: `auth.api.ts:36` (moves), `auth.fixture.ts:58` (goes), `warm-up.ts:58` (allowance, §2.6)                                                                                                                                                                                                                                                                                                                             |
| API cases                            | `tests.md` §3–4; `grep -rn "eraser\|organizer" --include=*.api.spec.ts e2e`                                                                                                | `HD-API-23` → a claimed pool user; cleanup added to the 22 cases of §2.4; `home-dashboard.api.spec.ts:16,502` comments; `HD-API-13`…`22`'s serial block (`:271`) is the test designer's to keep or drop                                                                                                                                                                                                                                                                                                                                                                                   |
| Case preconditions                   | `git grep -il` for `organizer`/`eraser` in `.cases.md`                                                                                                                     | `home-dashboard.{api,functional}.cases.md` (incl. `HD-API-23`'s data line and the `:18-21` exception note), `meeting-files.functional.cases.md`, `security.api.cases.md`, `smoke/seed.api.cases.md`                                                                                                                                                                                                                                                                                                                                                                                       |
| Corpus keys                          | §4 tables; counting words near users and rules: "five users", "two … sandboxes … third", "Mutating cases", "never absolute", "nine suite rules", "The ten it still states" | as §4; `FACT-3184` and `FACT-3593` are retired in this change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Architecture tables                  | `docs/architecture.md` "Patterns in use" read against `ADR-0036`…`ADR-0038`; `project-context` "what must be updated"                                                      | two new rows (keys at implementation) for `ADR-0036` and `ADR-0037` (§4); `FACT-0031`, `FACT-0032` unchanged and checked; no row for `ADR-0038`; "Patterns deliberately refused" untouched (its rows are product and tooling refusals; the alternatives these ADRs reject stay keyed in the ADRs, §5)                                                                                                                                                                                                                                                                                     |
| Hand-kept lists                      | `grep -n "PROTECTED_PAGES =\|AUDITED_PAGES ="`                                                                                                                             | both hold `/meetings/${GEOMETRY_WORKSHOP_MEETING_ID}`; the session walks resolve it per case to a meeting the held user created, `SEC-FN-04` (no session) keeps the seeded id. `PROTECTED_ROUTES`, `KNOWN_CASE_PREFIXES` unchanged                                                                                                                                                                                                                                                                                                                                                        |
| Module maps and agent docs           | `git grep -il "organizer\|eraser"` outside plans/profiling                                                                                                                 | `apps/api/README.md`, `e2e/README.md`, `.claude/agents/tester-functional.md` (`HD-FN-07` example still valid), `docs/pipeline-audit.md` (history), `CLAUDE.md` tests section                                                                                                                                                                                                                                                                                                                                                                                                              |
| Invariants                           | `CLAUDE.md` invariants read against §2                                                                                                                                     | 10, 12, 17, 19 proven over a built session (`SEC-FN-05`, `SEC-FN-02`) and over a form session (`MF-FN-09`, `SEC-FN-01`); 11 moves into `AL-FN-13`; 16: lists change shape, not coverage; 18 untouched (`SEC-API` timing case out of rule 11's scope)                                                                                                                                                                                                                                                                                                                                      |
| Framework output                     | written line                                                                                                                                                               | a broken baseline appears as "1 error was not a part of any test" with the teardown's message (P5); a tracker failure appears as a second error on the test (P7); nothing new in Chromium's console or `next dev`'s log                                                                                                                                                                                                                                                                                                                                                                   |

Security (16–19): no new endpoint or page; storage-state files hold a suite-secret JWT, as the
per-worker files in `test-results/` did; `pnpm e2e:security` records the sign-in traffic of
`SEC-FN-01`'s form sign-in as today, and `AL-FN-13` asserts it as well.

## 8. Open questions and deliberate omissions

- **Settled by probe:** P5 run 6, P7, P8; at the second correction pass P9 (teardown order by
  dependency; a timed-out body's `finally` does **not** run, so the fixture fallback is the path
  that deletes its rows; `afterAll` after a failed `beforeAll`) and P10 (the `try`/`finally` shape,
  ESLint, aliases). At plan task T2, P11 and P12 (`FACT-3820`, `FACT-3821`) closed C5's three items
  and the late-writes question:
  - **A crashed worker's test** is reported failed (`worker process exited unexpectedly`); its
    `afterEach` and the lease's release never run, so the slot stays held by a dead pid until the
    takeover purges it — the path `FACT-3777` already describes.
  - **Teardown time after a timeout:** each fixture teardown gets its own budget equal to the test
    timeout, one over it is cut and reported, and the worker is always replaced afterwards. The
    tracker fallbacks and the release each fit inside one test timeout; a cut release is the
    crashed-worker case.
  - **Pid reuse:** none across 40 worker replacements and 1500 spawned child processes on this
    Windows machine (only the spawned children's pids were compared). On Linux it is not probed; a reused pid would make a dead holder look alive,
    so the slot is not taken over and a claimant short of slots times out naming the holder — red,
    not silent (ADR-0037, Consequences).
  - **An abandoned body's late writes:** with the overrides of §2.3, the test's request contexts are
    disposed before the release; disposal rejects the pending call and every later call on that
    context, and no late `POST` reached the server (P12). What `D4` showed is one run: a body
    parked on a 3 s timer had not resumed when the worker exited after the release, and its `POST`
    never reached the server. A shorter timer can fire earlier — during the tracker fallbacks,
    while the contexts are still alive — and its write then lands; that outcome is still covered:
    the release sees `total` > 0 and fails the test naming the user, or the write commits after
    the read and is the residue below. Body and hook calls go through the
    test-scoped `request`/`apiRequest`, never a per-worker context (the per-worker part of
    `auth.api.ts` is a token cache, not a context).

  **Not probed:** the rename primitive and pid reuse on Linux, where CI's one worker means no two
  claimants; the browser `context` and `apiRequest` overrides — the T4 check named in §2.3.

  **Settled at plan task T4 by P13:** the `context` and `apiRequest` overrides close before the
  release when the timed-out body is parked on a call or a locator wait. A body parked on an
  in-flight `page.goto` makes Chromium's context close overrun its teardown budget, so the lease's
  teardown never runs and the claim stays naming the replaced worker's pid — the cut-release,
  crashed-worker path above, purged by the takeover (`FACT-3777`); `FACT-3776` needs no revision.
  **Not tested:** a navigation that never answers, a body in `page.click` or `page.waitForURL`,
  several workers.

- **Residue — a request already sent.** P12's stub still answered every call that had left before
  disposal: the abandoned request reaches the API, only its response is dropped. A write sent just
  before a timeout can therefore commit after the release has read `total`. It is not silent but
  misattributed: the next holder's release check or the teardown comparison goes red, naming that
  holder's test rather than the one that timed out. Closing it would need the release to wait for
  the API to drain the user's requests, which nothing in the research offers; it is left open on
  purpose.
- **Cost, unmeasured:** eight scrypt hashes per reset, at most ten API logins per run, per-test
  preconditions in `beforeEach` where modules used to share rows, in both projects (decision a), one `GET` per release, one teardown login per seeded user —
  measured at acceptance into "Run economics".
- **Omitted on purpose:** comparing rows the API does not expose (ids are random, `ADR-0031`; the
  database resets per run, `FACT-3579`); a static rule for tracked cleanup (§5); a stale takeover
  marker (§5); a tracker or fixture for `beforeAll` system-level data, since none exists
  (`FACT-3817`) — the module that first creates such data builds it; a rule enforcing one top-level
  `describe` (review holds it);
  `BL-063`, `BL-064`, `BL-066`; `BL-030` (the per-case path form is compatible with it);
  `contract.md` §1's stale lines. `FACT-3150` and `FACT-3002` were not read; nothing here changes
  the contract they describe.

## 9. Owner questions

**None open.** Answered on 2026-10-23 and applied: **Q1 — option A** (`HD-API-23` claims a pool
user, `eraser` leaves, `FACT-1085` withdrawn, one pool for both projects; `FACT-3773`,
`FACT-3783`); **Q5 — option B** (`MF-FN-09`, `SEC-FN-01` keep a form sign-in under `@ui-login`;
`FACT-3806`, `FACT-3759`); **the cleanup rules** (`FACT-3809`, `FACT-3780`, `FACT-3811`); and the
three answers to the third verdict's questions:

1. **`beforeAll` versus a test's claim** — the rules do not conflict: `beforeAll` is for
   system-level data, per-user preconditions go in `beforeEach`/`afterEach`. None exists today, so
   no module has `beforeAll` rows, and `planner`'s shared rows become per-test preconditions
   (decision (a), `FACT-3809`, `FACT-3815`, `FACT-3817`).
2. **The shape against lint** — `try { … } finally { await cleanup.run(); }`, no `catch`,
   `no-useless-catch` stays on (`FACT-3809`, `FACT-3811`, `FACT-3816`, `FACT-3818`).
3. **Rule 12's scope** — the four meta-test specs create no data and are outside the shape's scope
   as a stated scope, not a deviation (`FACT-3811`).

**Moving the other mutating `api` cases to pool claims** was weighed as invited and not recommended
(§5, first row); it is not adopted and not raised as a question.
