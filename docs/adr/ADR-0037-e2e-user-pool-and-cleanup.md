# ADR-0037 — Tests claim a pooled user, and every test deletes what it created

- **Status:** accepted
- **Date:** 2026-10-21
- **Supersedes:** —
- **Superseded by:** —
- **Note:** `FACT-3781` was revised before this record's first commit, because the change removed
  the global-setup warm-up it cited; `ADR-0022` applies from first commit.

## Context

- `FACT-3764` The seed holds five users — `teacher`, `student`, `planner`, `organizer`, `eraser` —
  sharing one password, and no route creates or deletes a user. —
  `apps/api/src/users/users.seed.ts`, `apps/api/src/auth/auth.controller.ts`
- `FACT-3765` Mutating cases share one owner per project, `planner` for `api` and `organizer` for
  `web`, so counts over that owner are relative, and a second spec writing to the same owner raced
  the first. — `FX-033`, `e2e/README.md`
- `FACT-3766` `HD-API-23` counts an owner's meetings while deleting them, so the seed gained a
  user, `eraser`, that no other case writes to. — `HD-API-23`, `FT-010`
- `FACT-3767` Every meeting and file a test can create has a `DELETE` route answering `204`, a
  file is removed with its meeting, and in probe P4 create, upload and delete returned the owner's
  `total` to its seed value. — `FACT-2128`, `FACT-2129`, `apps/api/prisma/schema.prisma`,
  `docs/plans/e2e-test-architecture/research/probes.md`
- `FACT-3768` The functional cases that create meetings through the UI (`HD-FN-07`, `MF-FN-05`,
  `MF-FN-06`, `MF-FN-15`) delete nothing, and the api cases older than `withCleanup` delete nothing
  either. — `e2e/README.md`, `docs/plans/e2e-test-architecture/research/tests.md`
- `FACT-3769` In probe P2, of 20 Node processes calling `mkdirSync` on one path on this Windows
  machine, exactly one succeeded and the others received `EEXIST`. A holder killed while holding was
  not probed. — `docs/plans/e2e-test-architecture/research/probes.md`
- `FACT-3770` In probe P3 a test-scoped fixture's code after `use()` ran for a failing and for a
  throwing test, and a storage state holding an `httpOnly` `ps_session` was accepted by
  `browser.newContext`. — `docs/plans/e2e-test-architecture/research/probes.md`
- `FACT-3771` The suite runs `fullyParallel: true` with `workers: isCI ? 1 : undefined`, which was
  14 workers on the 14-core machine where `FX-052` was reproduced. — `playwright.config.ts`,
  `FX-052`
- `FACT-3772` The JWT lives one hour by default, and two runs in one tree share their storage-state
  files by name. — `apps/api/src/config/auth.config.ts`, `FACT-3221`
- `FACT-3800` In probe P5, with Playwright 1.62.1, an error thrown in `globalTeardown` made the run
  exit 1 with every test passed; both `webServer`s answered from inside `globalSetup` and
  `globalTeardown`; teardown also ran after a failing test; and with a port already held and
  `reuseExistingServer: false` the run exited 1 before `globalSetup` ran — both when the held
  entry was the first and when it was the second, after a first entry that reuses an existing
  server, which is the order `playwright.config.ts` has outside CI. —
  `docs/plans/e2e-test-architecture/research/probes.md`, `playwright.config.ts`
- `FACT-3801` In probe P6 on this Windows machine, 20 processes renaming their own prepared
  directory onto one absent path left exactly one winner in each of five rounds, the others getting
  `EPERM`; a directory rename onto an existing directory failed even when it was empty; a directory
  holding a file another process had open could not be renamed (`EPERM`); and
  `process.kill(pid, 0)` threw `ESRCH` once the process was gone. —
  `docs/plans/e2e-test-architecture/research/probes.md`
- `FACT-3808` In probe P7, with Playwright 1.62.1, `fullyParallel` and three workers, one
  `describe`'s `beforeAll` ran once in each worker that ran one of its tests, and its `afterAll` ran
  in each of those workers, also after a failing test; a test-scoped fixture was one instance across
  `beforeEach`, the test and `afterEach`, and was torn down after `afterEach`, which ran after a
  failing test too; a test-scoped fixture taken by `beforeAll` was a separate instance set up and
  torn down around that hook alone; and an error thrown by a fixture's teardown after a failing test
  was reported in addition to the test's own error. —
  `docs/plans/e2e-test-architecture/research/probes.md`
- `FACT-3814` In probe P9, with Playwright 1.62.1, test-scoped fixtures were set up in the order
  of first use — the `beforeEach` hooks' parameters, then the test's — and torn down in the reverse
  of that order, each fixture's dependents before the fixture itself: three fixtures depending on a
  fourth were all torn down before it, whatever order the test named them in, on a pass, a failure
  and a timeout, while without that dependency the one set up last was torn down first. A test that
  exceeded its timeout did not run its body's `finally`; its `afterEach` and fixture teardowns ran.
  An `afterAll` ran in each worker after its `describe`'s `beforeAll` had thrown there. —
  `docs/plans/e2e-test-architecture/research/probes.md`,
  `node_modules/playwright/lib/worker/workerProcessEntry.js`
- `FACT-3815` The schema holds three models: `User`, which no route creates or deletes
  (`FACT-3764`); `Meeting`, each owned by one user (`FACT-1006`); and `MeetingFile`, each belonging
  to one meeting (`FACT-1057`). No row a test can create belongs to no user. —
  `apps/api/prisma/schema.prisma`, `FACT-1006`, `FACT-1057`, `FACT-3764`
- `FACT-3816` ESLint's `no-useless-catch` is an error for `e2e/**` through `@eslint/js`'s
  recommended set, and in probe P10 it reported a `catch` whose only statement rethrows its
  parameter, also when a `finally` follows; the same test without the `catch` gave no problem. —
  `packages/eslint-config/base.js`, `eslint.config.mjs`,
  `docs/plans/e2e-test-architecture/research/probes.md`
- `FACT-3820` In probe P11, with Playwright 1.62.1 on this Windows machine, a test whose worker
  process was killed was reported failed with `worker process exited unexpectedly`, and neither its
  `afterEach` nor its test-scoped fixture's teardown ran; later tests ran in a new worker with a new
  process id. After a test timeout, `afterEach` and fixture teardown ran, each fixture teardown
  with a budget equal to the test timeout — a teardown longer than that was cut and reported — and
  the worker was replaced. Across 40 worker replacements no process id was handed out twice, nor
  among the ids of 1500 spawned child processes, the only ones compared; Linux was not probed. —
  `docs/plans/e2e-test-architecture/research/probes.md`
- `FACT-3821` In probe P12, with Playwright 1.62.1, the built-in test-scoped `request` context was
  in no run D1–D3 a dependent of the lease fixture, and whether it was disposed before the lease's
  teardown followed setup order, as P9's `A1` shows for any two unrelated fixtures: with the lease
  set up first it was; with `request` set up first, or with a lease depending on `request`, the
  teardown ran with the context still alive and disposal followed 13–21 ms later. With `request`
  overridden as `async ({ lease, request }, use) => use(request)` — the lease named first in the
  override, the only order probed for it — disposal preceded the teardown whichever order the test
  named its parameters in. Disposal rejected the call a timed-out body still had pending and every
  later call on that context, and no late `POST` reached the server, though a request already sent
  was still answered by it. In run D4 a body waiting on a 3 s timer had not resumed when the worker
  exited after the teardown, and its `POST` never reached the server; a shorter wait was not
  probed. A browser `context` or `page` was not probed. —
  `docs/plans/e2e-test-architecture/research/probes.md`

## Decision

- `FACT-3773` The seed gains ten pool users, `usr-pool-01`…`usr-pool-10`, with emails
  `pool-01@purpleschool.test`…`pool-10@purpleschool.test`, names `Pool User 01`…`Pool User 10` and
  the seed's one password; each owns no meetings and no files. `organizer` with its meeting
  `mtg-organizer-1`, and `eraser`, leave the seed: the pool replaces the one role of each, the `web`
  sandbox and `HD-API-23`'s private owner. — this record, the owner's answer of 2026-10-23,
  `ADR-0031`, `docs/data-model.md`
- `FACT-3774` A test takes a pool user by writing its owner record — process id, worker index, test
  id, time — into a directory of its own under `.e2e-pool/claims/` at the repository root and
  renaming that directory to `.e2e-pool/claims/pool-NN`, trying `01` to `10` in order and keeping
  the first rename that succeeds, so a claim never exists without its owner record. The claim is a
  test-scoped fixture, taken when the test's `beforeEach` hooks or the test first ask for it, and
  released after its `afterEach` hooks. — this record, `FACT-3801`, `FACT-3808`, `FACT-3814`,
  `ADR-0012`
- `FACT-3775` A test that needs more than one user — a foreign owner — claims all of them or none:
  when a later claim fails it releases what it holds and tries again, so two tests can never each
  hold one user while waiting for the other's. — this record
- `FACT-3776` The claim is released in the teardown of a test-scoped lease fixture, which runs on a
  pass, a failure and a timeout. The claim fixture, the `cleanup` fixture and the `preconditions`
  fixture each depend on the lease and on the request context they call the API through, so
  Playwright tears all three down before either. Every test-scoped context a body or hook can call
  through is disposed before the release: `e2e/fixtures/suite.ts` overrides `request`, `apiRequest`
  and the browser `context` each in the form `async ({ lease, <name> }, use) => use(<name>)`, the
  lease named first: inside an override the lease and the built-in it wraps are unrelated, so the
  built-in is disposed first only because the lease is set up first, and that parameter order is
  not reordered. The page a claim builds from stored state opens its own context in a
  fixture that depends on the claim. The lease claims nothing unless the test asks for a claim.
  The lease first checks that the claim still holds its own test id, and when it does not, fails
  the test naming both tests. Otherwise it reads each held user's `total` through `GET /meetings`,
  on a request context it opens in its teardown and disposes there, and deletes nothing: when every
  `total` is 0 it renames the claim directory out of `pool-NN` and removes it, retrying the rename
  while it fails with `EPERM`; when one is not 0 it fails the test naming the user and the count,
  and marks the claim leaked, which keeps the slot occupied for the rest of the run. — this record,
  `FACT-2035`, `FACT-3801`, `FACT-3814`, `FACT-3821`
- `FACT-3777` When no slot is free, a claimant reads each holder's owner record and skips a slot
  marked leaked. For a slot whose holder process no longer exists, it tries to rename a directory of
  its own, holding its own owner record, to `pool-NN.takeover`; the one claimant that succeeds
  re-reads the slot's record. Only when the record still names the same dead process and test does
  it delete that user's meetings, through `GET /meetings` at the largest `limit` the route accepts
  and `DELETE /meetings/:id` until `total` is 0, then release the slot as `FACT-3776` releases it.
  It removes its marker after that release, and at once whenever the re-read names anything else.
  The slot stays occupied by the dead claim until its meetings are gone, so no claimant can be
  handed the user before the purge; a claimant that finds a marker leaves the slot alone. — this
  record, `FACT-2035`, `FACT-2128`, `FACT-3801`, `FACT-3820`
- `FACT-3778` A pool user's storage state is `.e2e-pool/state/pool-NN.json`, written and read only
  by that user's current holder, as a temporary file renamed into place. It is built on the user's
  first claim in a run from one `POST /auth/login`, reused by every later claim in that run, and
  rebuilt when its cookie would expire within 120 s; the same token is the test's Bearer token for
  that user. — this record, `ADR-0036`
- `FACT-3779` Global setup empties `.e2e-pool/` before any test runs, so claims and storage state
  live exactly one run: state is kept between the tests of one run and never across runs. A second
  run in the same tree cannot reach global setup while the first holds the api port, because the
  api `webServer` does not reuse an existing server. — this record, `FACT-3800`,
  `playwright.config.ts`
- `FACT-3809` Tests are grouped by module, one top-level `describe` per spec file; `describe`s
  nested inside it group tests whose preconditions differ, each with its own `beforeEach` and
  `afterEach`. A module's `beforeAll` creates, and its `afterAll` deletes, only system-level data the
  whole module uses — data that belongs to no user and cannot affect other users or other tests.
  Rows a test needs before it starts, on the pool user it holds or on `planner`, are created in
  `beforeEach` and deleted in `afterEach`; rows the test creates itself are deleted by its own body.
  The body is `try { … } finally { await cleanup.run(); }`, with no `catch`, so the deletion runs
  whether or not the test failed and the test's own error propagates unchanged. — the owner's
  answers of 2026-10-23, this record, `FACT-3808`, `FACT-3816`
- `FACT-3817` Because no such system-level data exists (`FACT-3815`), no module has `beforeAll` or
  `afterAll` rows; every precondition is a per-test row in `beforeEach`/`afterEach`, in both
  projects. — this record, `FACT-3815`, `FACT-3809`
- `FACT-3780` Every row a test creates is registered with a cleanup tracker: the test-scoped
  `cleanup` fixture for the body and the test-scoped `preconditions` fixture for `beforeEach`; a
  module whose `beforeAll` creates system-level data creates a tracker of its own there and runs it
  in `afterAll`, which throws its failures. A tracker deletes what it holds in reverse registration
  order, accepting a `404` only with the exact not-found body, and its `run()` does not throw: its
  failures are thrown by the fixture's teardown, after the test's own error. A fixture whose tracker
  still holds entries at teardown deletes them and fails the test, naming what had not been
  deleted; for a test that exceeded its timeout, whose `finally` does not run, this is the path that
  deletes its rows. — this record, `FACT-2016`, `FACT-2083`, `FACT-3808`, `FACT-3814`
- `FACT-3810` A test that holds a pool user and creates rows it cannot name by id — through the UI
  — registers the user's whole collection with its tracker, which deletes every meeting the user
  owns, through `GET /meetings` at the largest `limit` the route accepts and `DELETE` until `total`
  is 0. Only a claim the test holds can be registered this way, never a seeded owner, and the entry
  deletes nothing once that claim has been released: it records a failure naming the slot instead.
  Registering the collection records the claim on the test's lease; from then until the test ends,
  every row registered by id in any of that test's trackers — `cleanup` or `preconditions` — and
  deleted with that claim's token accepts the not-found `404`, whether it was registered before or
  after the collection, because the collection purge may already have removed it. The tracker sets
  this tolerance itself when it deletes the entry, reading the lease; the caller never passes it. —
  this record,
  `FACT-2016`, `FACT-2035`, `FACT-2128`
- `FACT-3811` A suite-integrity rule parses each `*.api.spec.ts`, `*.functional.spec.ts` and
  `*.integration.spec.ts` under `e2e/` with the TypeScript compiler API and fails on any `test`
  call whose function is not exactly one `try` statement with no `catch` clause and a `finally`
  holding only `await cleanup.run();`, naming the file and the test title. It also fails a file in
  its scope in which it finds no `test` call, or which imports or declares `test` under another
  name; every spec therefore takes the one `test` exported by `e2e/fixtures/suite.ts`, which
  composes the fixture sets, and no spec merges sets itself. Its scope is stated, not excepted: the four meta-test files —
  `e2e/suite-integrity.api.spec.ts` and the specs under `e2e/architecture/`, `e2e/ledger/` and
  `e2e/process/` — read the repository and create no data, so there is nothing for a cleanup to
  delete. It first runs over must-hit and must-miss sources and fails if either set misbehaves. —
  this record, the owner's answers of 2026-10-23, `ADR-0010`, `FACT-3816`,
  `docs/plans/e2e-test-architecture/research/probes.md`
- `FACT-3781` Global teardown compares every seeded owner with its seed through the API —
  `teacher` 5 meetings, `planner` 2, every other seeded user 0, and the file count of every seeded
  meeting — and fails the run listing every difference it found. It reads the api base URL from the
  `FullConfig` Playwright passes it, the `web` project's `apiBaseURL` (suite rule 9). — this record,
  `FACT-3800`, `FACT-1034`, `FACT-1035`, `FACT-1071`, `FACT-1072`, `FACT-1073`, `FACT-1074`,
  `e2e/fixtures/global-teardown.ts`
- `FACT-3782` Test isolation is achieved through data, not through resets: `teacher` and `student`
  are read-only and carry the `api` project's absolute assertions, and a pool user starts empty and
  is held by one test at a time, so a case may assert absolute counts over the user it holds. —
  this record
- `FACT-3783` `planner` is the mutation sandbox the `api` project's cases share, apart from
  `HD-API-23`, which needs an owner no other case writes to and claims a pool user. The `web`
  project has no shared sandbox: every browser case that needs a session claims a pool user. One
  pool serves both projects. — this record, the owner's answer of 2026-10-23
- `FACT-3784` Counts over a shared owner's whole collection are relative; absolute counts are
  allowed over an owner the case holds by claim, or over a meeting the case created itself.
  — this record, `ADR-0007`
- `FACT-3785` The per-run reset of `FACT-3579` stays, and per-test cleanup through the public
  `DELETE` routes, checked by the teardown comparison, is what returns each owner to its seed
  between tests. — this record, `FACT-3579`
- `FACT-3786` `playwright.config.ts` sets `workers` to 7 outside CI and leaves CI at 1. — this
  record, `FX-052`
- `FACT-3799` Meetings a case creates under a shared owner are dated 2030. A case holding a pool
  user may create meetings with the seed's own dates and titles, and uploads a copied meeting's
  files oldest first, each returned `uploadedAt` strictly later than the one before, so a copy of
  seeded data renders exactly what the seed renders. — this record, `MF-FN-02`, `FACT-2110`

Rejected:

- `FACT-3787` One user per worker by `parallelIndex` — it needs no lock, but a case holding a
  second user needs one that is no worker's own, and a `--workers` value above the number of users
  breaks it. — this record
- `FACT-3788` Seeding each pool user with a copy of `teacher`'s meetings — the empty-state cases
  need an owner with nothing, cleanup would have to tell seeded rows from created ones, and the seed
  would grow by fifty meetings and twenty files a case can create for itself. — this record
- `FACT-3789` Tracking each row a browser case creates through the UI by id — the case would read
  the new id off the page for every create, while on an owner it holds alone and whose seed is
  empty, registering the whole collection restores the seed exactly. — this record
- `FACT-3790` Deleting a pool user's meetings when it is claimed rather than when it is released —
  it would erase what an earlier test failed to clean, so the teardown comparison could never go
  red for a skipped cleanup. — this record
- `FACT-3812` Deleting a pool user's meetings on every release — a test that skipped its cleanup
  would hand back an empty user, and neither the test nor the teardown comparison would see the
  rows it left. — this record, the owner's answer of 2026-10-23
- `FACT-3813` A claim held for a whole module, taken in `beforeAll` and released in `afterAll`, so
  a module's tests could share rows on a pool user — rows on a pool user belong to that user, so
  they are per-test preconditions and not the system-level data `beforeAll` is for; and a
  test-scoped claim taken there is released when the hook ends, while a worker-scoped one holds the
  user across every test the worker runs from the module. — this record, `FACT-3808`, `FACT-3809`,
  the owner's answers of 2026-10-23
- `FACT-3818` Keeping the `try`/`catch`/`finally` body with a `catch` that only rethrows and turning
  `no-useless-catch` off for `e2e/**` — the `catch` changes nothing a test does, and a recommended
  rule would be switched off to admit it. — this record, `FACT-3816`, the owner's answer of
  2026-10-23
- `FACT-3819` Releasing the claim in the claim fixture's own teardown — without a dependency
  between them, a claim set up after `cleanup` is torn down before it, so the release check could
  run before `cleanup`'s fallback deleted the test's rows. — this record, `FACT-3814`
- `FACT-3791` A test-only reset or user-creation endpoint — the back door the store's own record
  already refuses. — `FACT-3584`
- `FACT-3792` The baseline comparison as a fourth Playwright project depending on `api` and `web` —
  one check would add a filename suffix to the convention every spec is held to, and global
  teardown already fails the run with both servers up. — `e2e/suite-integrity.api.spec.ts`,
  `FACT-3800`
- `FACT-3804` Taking a dead holder's slot by renaming its claim aside before purging — the slot is
  free from the rename on, so an ordinary claim can be handed the user with the dead test's rows
  still in it. — this record
- `FACT-3805` Claiming by `mkdir` and then writing the owner record inside — between the two a live
  claim carries no process id, and a claimant reading it then would judge it dead. — this record,
  `FACT-3769`

## Consequences

- The isolation facts `ADR-0007` still states — read-only users, the two sandboxes, relative
  counters, the 2030 dating — and the `ADR-0027` fact that carries them forward are retired into
  those records' `## Retired facts` registers, with `FACT-3782`, `FACT-3783`, `FACT-3784`,
  `FACT-3799` and `FACT-3785` as their successors. The seed-user facts of `docs/data-model.md` move
  the same way, and `eraser`'s row is withdrawn with `FACT-3773` named.
- `FACT-3803` `ADR-0007` is superseded by `ADR-0027`; the facts `ADR-0027` or this record
  falsifies are retired in `ADR-0007`'s own register, each naming its successor, and the facts it
  still states remain true under PostgreSQL and are cited from `ADR-0027` rather than repeated. No
  record states how many remain. — `docs/adr/ADR-0007-in-memory-store.md`, `ADR-0022`
- The `api` cases that today share rows on `planner` create their own in `beforeEach` and address
  them by id, as browser cases do on the user each holds; every module creates its preconditions
  once per test rather than once per worker, at a cost measured at acceptance. Should system-level
  data ever exist, a module's `beforeAll` creates it once in every worker that runs one of its
  tests, and its `afterAll` runs there even when the `beforeAll` failed partway (`FACT-3808`,
  `FACT-3814`).
- Rule 12 cannot see a second test object built under another name in a file that also calls
  `test`; such a file is checked only through the tests named `test`.
- `HD-FN-07`/`HD-FN-08` and `MF-FN-05`/`MF-FN-06`/`MF-FN-15` no longer need a serial block: no
  other test can hold their owner.
- A skipped cleanup on a pool user fails the test that skipped it and leaves the user out of the
  pool for the rest of the run, so the teardown comparison lists it as well. Every leaked slot
  shrinks the pool; ten of them starve every later claim into a timeout naming the holders, in a
  run already red.
- A worker that dies mid-test cannot run its `finally` or its `afterEach`; its rows are deleted by
  the takeover, so the teardown comparison does not list them, and the run is red for the test the
  worker died in. A claimant that dies while holding a takeover marker leaves that slot out of the
  pool for the rest of the run.
- `.e2e-pool/` is ignored by git and sits outside `e2e/`, `docs/`, `.claude/` and `scripts/`, the
  roots the meta-tests walk; `SEC-API-10` (`e2e/security/security.api.spec.ts`) walks the
  repository root and skips `.e2e-pool`, so a claim created mid-walk cannot fail a meta-test or
  the secret scan.
- A storage-state file holds a JWT signed with the suite's own secret for the suite's own database,
  as the per-worker state files in `test-results/` did before it.
- On Linux, where CI runs at one worker, the rename primitive was not probed; with one worker no
  two claimants exist there. Process-id reuse was not probed there either: a reused id makes a
  dead holder look alive, so its slot is not taken over and a claimant short of slots times out
  naming that holder — a red run, never a silent one.
- Whether the browser `context` override disposes the context before the release, as `FACT-3821`
  shows for `request`, was unprobed until the suite's fixtures existed. A red "contexts close
  before the release" check would have sent this record back, while proposed, for revision of
  `FACT-3776`.
- Probe P13 (plan task T4, `docs/plans/e2e-test-architecture/research/probes.md`) ran that check:
  with the suite's overrides, `apiRequest` and the browser `context` closed before the release in
  both parameter orders whenever the timed-out body was parked on a call or a locator wait. A body
  parked on an in-flight `page.goto` takes another path: Chromium's context close does not return
  until the navigation answers, so the context's teardown overruns its budget and is cut
  (`FACT-3820`), the lease's teardown never runs, and the claim stays on disk naming the replaced
  worker's pid. The same happened with plain `@playwright/test` and no suite fixture, so the
  override is not its cause. That is the cut-release path `FACT-3820` already describes — a cut
  release is the crashed-worker case — and the takeover of `FACT-3777` purges the slot, so
  `FACT-3776` stands unrevised. A navigation that never answers was not tested, nor was a body
  parked in `page.click` or `page.waitForURL`, nor more than one worker.
- A body waiting on something other than a request can resume before the worker exits — D4 showed
  only a 3 s timer that did not. A write it sends while the tracker fallbacks still hold a live
  context lands before the release reads `total`, which then fails the test naming the user and the
  count; one that commits after the read is the residue below.
- A request a timed-out body had already sent reaches the API (`FACT-3821`) and may commit after
  the release has read `total`; the next holder's release check or the teardown comparison then
  goes red naming that holder's test rather than the one that timed out.

> **Rationale — not a fact.** Absolute counts are the strongest assertions the suite can make, and
> they were forbidden only because owners were shared. A claim makes the owner the test's alone for
> exactly as long as the test runs, so the reason for the ban is gone for every case that holds
> one. Release deletes nothing because a deletion at release is indistinguishable from a cleanup
> the test performed: the check that the user came back empty is what makes a skipped cleanup
> visible. The takeover still deletes, because a dead holder never reached its cleanup, the run is
> already red for it, and leaving the slot dirty would let one crash starve the rest of the run.
> The takeover marker is not itself taken over when its claimant dies: Node offers no
> compare-and-swap on a directory, and freeing a marker another claimant may have just re-created is
> the race `FACT-3804` rejects, one level up.
