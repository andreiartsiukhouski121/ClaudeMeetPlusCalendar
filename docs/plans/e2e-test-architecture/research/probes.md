# Probes — e2e-test-architecture (FEAT-S1)

Scripts live in the session scratchpad (`...\scratchpad\p1.cjs`, `p2.cjs`, `p2-child.cjs`, `p3\`). Nothing was written in the repo except this folder. Date 2026-10-21, Windows 11, Docker daemon up (`docker ps` showed `purpleschool-db-1` healthy on 5433).

## P1 + P4 — cookie and cleanup, against live servers

Servers started the way `playwright.config.ts` does: `cd apps/api && PORT=3101 JWT_SECRET=e2e-secret DATABASE_URL=postgres://…:5433/purpleschool_e2e pnpm start:e2e` and `cd apps/web && API_URL=http://127.0.0.1:3101 pnpm dev --port 3100`. Then `node p1.cjs` (Playwright chromium, repo's `@playwright/test` 1.62.1). Both servers were killed afterwards by PID (`taskkill //T //F` on the listeners of 3100/3101); no listener remained.

Output lines the facts rest on:

```
UI cookies [{"name":"ps_session","valueShape":"3 dot-parts, len 208, starts eyJh","domain":"127.0.0.1","path":"/","httpOnly":true,"secure":false,"sameSite":"Lax","expiresInSec":3600}]
login status 200 body keys [ 'accessToken', 'user' ] user keys [ 'id', 'email', 'name' ]
jwt payload {"sub":"usr-organizer","email":"organizer@purpleschool.test","iat":...,"exp":...} exp-iat 3600 header {"alg":"HS256","typ":"JWT"}
UI cookie value is raw accessToken form (3 parts)? true
built cookie [{"name":"ps_session","valueShape":"3 dot-parts, len 208, starts eyJh","domain":"127.0.0.1","path":"/","httpOnly":true,"secure":false,"sameSite":"Lax","expiresInSec":3600}]
built cookie goto / -> http://127.0.0.1:3100/ heading: Hello, organizer@purpleschool.test
document.cookie sees ps_session? false
storageState keys [ 'cookies', 'origins' ] [{"name":"ps_session",...,"httpOnly":true,"secure":false,"sameSite":"Lax","expiresInSec":3599}]
```

- The cookie built with `ctx.addCookies([{ name:'ps_session', value: <accessToken from POST :3101/auth/login>, url: 'http://127.0.0.1:3100', httpOnly:true, secure:false, sameSite:'Lax', expires: now+3600 }])` has the same name, domain, path, httpOnly, secure, sameSite and lifetime as the one the UI login set, and the same value shape. `GET /` with it rendered the dashboard and did not redirect.
- Note on "expires": the UI cookie was set with `maxAge` 3600; Playwright reports it as an absolute `expires` (about 3600 s ahead).

P4 (same session, organizer, API only):

```
create meeting 201 [ 'id', 'title', 'startsAt', 'durationMinutes', 'participants' ]
upload 201 [ 'contentType', 'filename', 'id', 'sizeBytes', 'uploadedAt' ]
totals before/mid/after 1 2 1 delete file 204 delete meeting 204 files of deleted meeting 404
delete meeting with file only 204 total 1
```

- `GET /meetings?limit=1` `total` was 1 (seed baseline for `organizer`) before, 2 with the new meeting, 1 after the DELETEs. Deleting a meeting that still had a file answered 204 and total returned to 1. This compares `total` only; rows of other tables were not counted (the probe did not query the database).

## P2 — atomic claim primitive (pure Node, Windows)

`node p2.cjs`: 20 child processes (`child_process.spawn(process.execPath, …)`) each try `fs.mkdirSync(dir+'/mk-s1')` and `fs.openSync(dir+'/wx-s1','wx')` on one slot.

```
mkdir winners 1 wx winners 1 losers sample 1 lose:EEXIST lose:EEXIST
after rmdir release, re-claim: WIN
```

Exactly one of 20 processes won each primitive; the others got `EEXIST`; after `rmdirSync` the slot could be claimed again. Not tested: a process killed mid-hold (a stale lock), more than one slot, `fs.openSync` file removal timing.

## P3 — test-scoped fixture claim/release and storageState

Config `p3\p3.config.cjs`: `workers: 3`, `fullyParallel: true`, no `webServer`, no `use.baseURL`. Run: `npx playwright test --config <scratchpad>\p3\p3.config.cjs` from the repo root. The fixture `claimed` appends `claim`/`release` lines to a file around `await use(...)` inside `try/finally`; the four tests: one passes (with a `browser.newContext({ storageState: <object> })` fixture and `page.setContent`), one `expect(1).toBe(2)`, one `throw`, one under `test.use({ storageState: <object> })` reading `context.cookies()`.

```
claim u0 for "passes"
claim u2 for "throws"
release u2 for "throws" status=failed
claim u1 for "fails"
release u1 for "fails" status=failed
release u0 for "passes" status=passed
claim u2 for "page fixture has cookie"
release u2 for "page fixture has cookie" status=passed
2 failed / 2 passed
```

- A test-scoped fixture's code after `use()` ran for the failing and the throwing test, with `testInfo.status` equal to `failed`.
- `storageState` given as an in-memory object (not a file) was accepted by both `browser.newContext({ storageState })` and `test.use({ storageState })`; the cookie `ps_session` with `httpOnly: true` was present in `context.cookies()` in both.
- The slot name here was derived from `testInfo.parallelIndex` (`u0`…`u2`); no real lock was used in P3.

## Not found

- **Not found:** behaviour of a lock when a worker process is killed mid-test (stale claim) — not probed; P2 only covers the live race and release.
- **Not found:** the full `pnpm e2e` behaviour with 7 workers — not run (one Playwright/`next dev` at a time; no workers change made in the repo).
- **Not found:** the data left in the database beyond `GET /meetings` `total` after the P4 deletes — the probe queried the API only.

## P5 — global teardown: exit code, server liveness, setup order (added at the FEAT-S2 re-run)

Added by `designer` at the design re-run, 2026-10-21, to answer blocker 2 of the design review verdict (`docs/profiling/verdicts/2026-10-21-e2e-test-architecture-feat-g2-aee513ec.md`). No app servers: scratchpad `...\scratchpad\p5\` holds `p5.config.cjs` (two projects `a`/`b` with `use.baseURL` `http://127.0.0.1:3190`/`:3191`; two `webServer` entries `node server.cjs 3190`/`3191`, both `reuseExistingServer: false`; `globalSetup: setup.cjs`, `globalTeardown: teardown.cjs`), a one-test spec, a trivial HTTP server, a setup and a teardown that each `fetch` every project's `config.projects[i].use.baseURL` read from `FullConfig`. The teardown throws when `P5_THROW` is set; the test fails when `P5_FAIL` is set. Run from the repo root as `npx playwright test --config <scratchpad>\p5\p5.config.cjs`, Playwright `1.62.1`; exit code read with `echo $?` after redirecting output to a file. Ports 3100/3101/3190/3191 had no listener before and after (`netstat -ano`).

```
run 1 (teardown returns)       EXIT=0  TEARDOWN sees: a http://127.0.0.1:3190 -> 200 alive 3190 | b http://127.0.0.1:3191 -> 200 alive 3191   2 passed
run 2 (P5_THROW=1)             EXIT=1  TEARDOWN sees: a ... -> 200 | b ... -> 200
                                       Error: P5 baseline differs: planner 3 vs 2   at teardown.cjs:9
                                       2 passed   1 error was not a part of any test, see above for details
run 3 (P5_FAIL=1)              EXIT=1  TEARDOWN sees: a ... -> 200 | b ... -> 200   2 failed
run 4 (globalSetup added)      EXIT=0  SETUP sees server a -> 200   TEARDOWN sees: a ... -> 200 | b ... -> 200
run 5 (3190 already held by    EXIT=1  Error: http://127.0.0.1:3190 is already used, make sure that nothing is running on the port/url
       another process)                or set reuseExistingServer:true in config.webServer.   setup-ran.txt: No such file or directory
```

- An error thrown in `globalTeardown` made the run exit `1` with every test passed, reported as "1 error was not a part of any test".
- Both `webServer`s answered `200` from inside `globalTeardown` (and from inside `globalSetup`): they start before global setup and stop after global teardown.
- Global teardown ran after a failing test as well.
- With a port already held and `reuseExistingServer: false`, the run exited `1` before `globalSetup` ran (its marker file was never written).
- Not tested: the real `apps/api`/`apps/web` servers; a teardown that outlives a Playwright timeout; the HTML reporter's rendering of the teardown error.

## P6 — rename as the claim primitive; `process.kill(pid, 0)` (added at the FEAT-S2 re-run)

Added by `designer` at the design re-run, 2026-10-21, for blocker 3 of the same verdict. Pure Node on this Windows 11 machine, scratchpad `...\scratchpad\p6\p6.cjs` + `child.cjs`. Each of 20 child processes creates its own `claims/.tmp-<pid>/owner.json` holding its pid, spins to a common start time, then calls `fs.renameSync(<own tmp>, claims/pool-0N)`; five rounds, a fresh target each. Then single-process checks.

```
round 1: target pool-01 winners 1/20 loser codes EPERM owner.json pid==winner true leftover tmp dirs 0
round 2: target pool-02 winners 1/20 loser codes EPERM owner.json pid==winner true leftover tmp dirs 0
round 3: target pool-03 winners 1/20 loser codes EPERM owner.json pid==winner true leftover tmp dirs 0
round 4: target pool-04 winners 1/20 loser codes EPERM owner.json pid==winner true leftover tmp dirs 0
round 5: target pool-05 winners 1/20 loser codes EPERM owner.json pid==winner true leftover tmp dirs 0
rename onto existing EMPTY dir: EPERM
dir rename while a file inside is open (same proc): EPERM
dir rename while other process has a file inside open: EPERM
file rename over a file another process has open: EPERM
kill(pid,0) on running child: alive
kill(pid,0) after child killed: ESRCH
```

- Renaming a prepared directory onto one absent path: exactly one of 20 processes succeeded in each of five rounds; the other 19 got `EPERM`, and the winning directory held the winner's own pid.
- A directory rename onto an existing directory failed with `EPERM` even when the target was empty.
- A directory could not be renamed while any process held a file inside it open, and a file could not be renamed over a file another process held open: both `EPERM`, the same code a losing claimant gets.
- `process.kill(pid, 0)` returned for a running child and threw `ESRCH` after it was killed.
- Not tested: Linux (CI), where `rename(2)` onto a non-empty directory fails differently; pid reuse; a holder killed mid-rename.

## P5 run 6 — the second `webServer` entry held (added at the FEAT-S2 correction pass)

Added by `designer`, 2026-10-23, for nit 4 of the design re-run verdict (`docs/profiling/verdicts/2026-10-21-e2e-test-architecture-feat-g2-a3d18a5e.md`). Scratchpad `...\scratchpad\p5\p5b.config.cjs` is `p5.config.cjs` with the **first** entry set to `reuseExistingServer: true` and the **second** to `false`, the order and settings `playwright.config.ts:87,113` have outside CI. Port 3191 (the second entry) held by `node server.cjs 3191` started beforehand; 3190 free. Same Playwright `1.62.1`.

```
run 6  EXIT=1  [WebServer] listening 3190
               Error: http://127.0.0.1:3191 is already used, make sure that nothing is running on the port/url or set reuseExistingServer:true in config.webServer.
               setup-ran.txt: No such file or directory
```

- The first entry started its server; the held second entry stopped the run with exit `1`, and `globalSetup` did not run. The squatter was killed by PID afterwards; `netstat` showed no listener on 3190/3191.

## P7 — hook and fixture scope (added at the FEAT-S2 correction pass)

Added by `designer`, 2026-10-23, for the owner's cleanup rules (`beforeAll`/`afterAll`, `beforeEach`/`afterEach`, try/catch/finally). Scratchpad `...\scratchpad\p7\`: `p7.config.cjs` (`workers: 3`, `fullyParallel: true`, `retries: 0`, `use.baseURL` `http://127.0.0.1:3199`, no `webServer`), `hooks.p7.cjs` and `scope.p7.cjs`. A test-scoped fixture `res` logs its setup and teardown with a fresh id; hooks and bodies log the id they see; every line carries the process id. Run from the repo root as `npx playwright test --config <scratchpad>\p7\p7.config.cjs`, Playwright `1.62.1`.

`hooks.p7.cjs` — one `describe` with `beforeAll`/`afterAll`/`beforeEach({ res })`/`afterEach({ res })`, four passing tests, `t5` failing inside `try { … } catch (e) { throw e; } finally { log }`, `t6` the same plus a fixture teardown that throws; a second `describe` whose `beforeAll` takes `{ request }`. Exit `1`, 5 passed, 2 failed. The log, abridged:

```
32664 beforeAll worker=0 baseURL=http://127.0.0.1:3199 hasRequestFactory=function
32664 fixture-setup res1 for "t1" / beforeEach res1 / body res1 t1 / afterEach res1 status=passed / fixture-teardown res1 status=passed
 8880 beforeAll got request object
32664 afterAll worker=0
17508 beforeAll worker=1 …
17508 fixture-setup res2 for "t5 fails" / beforeEach res2 / body res2 t5 / finally res2 t5 / afterEach res2 status=failed / fixture-teardown res2 status=failed
17508 afterAll worker=1
30748 beforeAll worker=3 …
30748 fixture-setup res1 for "t6 …" / beforeEach res1 / finally res1 t6 / afterEach res1 status=failed / fixture-teardown res1 status=failed
30748 afterAll worker=3
```

and the report for `t6` listed two errors: `Error: P7 body assertion` and `Error: P7 fixture teardown error`.

`scope.p7.cjs` — a serial `describe` whose `beforeAll` takes the custom test-scoped fixture `res`. Exit `0`:

```
37808 setup res1 for "a" / beforeAll got res1 / teardown res1 for "a"
37808 setup res2 for "a" / body a res2 / teardown res2 for "a"
37808 setup res3 for "b" / body b res3 / teardown res3 for "b"
37808 afterAll
```

- With `fullyParallel` and three workers, one `describe`'s `beforeAll` ran once in **each worker** that ran one of its tests — three times here, worker 3 being the replacement started after `t5` failed — and `afterAll` ran in each of those workers, including the two whose test had just failed.
- `testInfo.project.use.baseURL` and `playwright.request.newContext` were available inside `beforeAll`; so was the built-in `request` fixture.
- A test-scoped fixture is **one instance** across `beforeEach`, the body and `afterEach`; its teardown runs **after** `afterEach`; `afterEach` ran after a failing test, with `testInfo.status` `failed`. A body's `finally` ran before `afterEach`.
- A custom test-scoped fixture taken by `beforeAll` is **a separate instance, set up and torn down around that hook alone**; the tests got fresh instances.
- An error thrown by a fixture's teardown after a failing test was reported **in addition to** the test's own error, not instead of it.
- Not tested: a test that exceeds its timeout (whether its `finally` runs); a worker killed mid-test.

## P8 — bounding "inside a tagged test" with the TypeScript compiler API (added at the FEAT-S2 correction pass)

Added by `designer`, 2026-10-23, for the owner's Q5 answer (an explicit tag on each excepted test) and the try/catch/finally shape. `typescript` is a root devDependency (`package.json:65`, `catalog:`), `6.0.3` in `node_modules`. Scratchpad `...\scratchpad\p8\p8.cjs` loads it through `createRequire` on the repo's `package.json`, parses in-memory sources with `ts.createSourceFile`, collects every call whose callee is `test` or `test.<only|fixme|fail|slow|skip>`, reads its `tag` (string or array literal), and treats a password match (the four patterns of `FACT-3759`, run over the raw text) as allowed only when its offset lies inside the function argument of a call tagged `@ui-login`. The same walk checks each test's function: exactly one statement, a `try` whose `catch (e)` holds only `throw e;` and whose `finally` holds only `await cleanup.run();`.

```
typescript 6.0.3
A tagged-read     | rule11 hits outside tagged tests: none            | tagged ids: MF-FN-09  | rule12: MF-FN-09 ok, MF-FN-01 ok
B untagged-read   | rule11 hits outside tagged tests: 3:.password     | tagged ids: none      | rule12: ok
C helper-read     | rule11 hits outside tagged tests: 1:SEED_PASSWORD | tagged ids: MF-FN-09  | rule12: ok
D destructure-tag | rule11 hits outside tagged tests: none            | tagged ids: SEC-FN-01 | rule12: ok
E shapes          | rule11: none | rule12: no-try BAD, swallowing catch BAD, finally without run BAD, statement outside try BAD, catch throwing another error BAD, the full shape ok
```

- A read inside a tagged test was allowed; the same read in an untagged test, and a read in a module-level helper called from a tagged test, were hits with their line.
- The tagged-test case IDs were read off the titles.
- Each of the five broken shapes was flagged and the full shape passed.
- Not tested: real spec files of the repository; a `test` imported under another name.

## P9 — fixture teardown order, a timed-out body, `afterAll` after a failed `beforeAll` (added at the FEAT-S2 correction pass of 2026-10-23)

Added by `designer`, 2026-10-23, for blocker 3 and nit 3 of the third `FEAT-G2` verdict. Scratchpad `...\scratchpad\p9\`: `p9.config.cjs` (`workers: 2`, `fullyParallel: true`, `retries: 0`, `timeout: 3000`, no `webServer`, no port), `order.p9.cjs`, `hooks.p9.cjs`; every fixture and hook appends `<pid> <event> [<test title>]` to `log.txt`. Run from the repo root as `npx playwright test --config <scratchpad>\p9\p9.config.cjs`, Playwright `1.62.1`. No listener on 3100, 3101 or 3199 before or after. Exit `1`: 3 passed, 4 failed (the two `C` tests, `B2`, `B3`), all as intended.

- `A1` — `claim`, `cleanup`, `preconditions` independent; the test takes `({ cleanup, claim })`. Log: `setup cleanup / setup claim / body / teardown claim / teardown cleanup` — without a dependency, a fixture set up later is torn down earlier, so `claim` went first.
- `B1`…`B4` — `claim`, `cleanup`, `preconditions` each depend on a test-scoped `lease`, whose teardown logs `RELEASE`; `beforeEach`/`afterEach` take `preconditions`. In every test the last line was `RELEASE lease`, after `teardown claim`, `teardown cleanup` and `teardown preconditions`:
  - `B1` (`({ cleanup, claim })`, passes): `… afterEach / teardown claim / teardown cleanup / teardown preconditions / RELEASE lease`;
  - `B2` (`({ claim, cleanup })`, fails): `… finally B2 / afterEach / teardown cleanup / teardown claim / teardown preconditions / RELEASE lease`;
  - `B3` (times out inside `try { await new Promise(() => {}) } finally { log }`): `body B3 / afterEach B / teardown claim / teardown cleanup / teardown preconditions / RELEASE lease` — **`finally B3` never appears**: a body that times out does not run its `finally`; `afterEach` and fixture teardown do run;
  - `B4` (no `claim`): `lease` set up and released with nothing claimed.
- Fixture setup order followed first use: `lease` and `preconditions` for `beforeEach`, then the body's parameters in order. This matches `teardownScope` in `playwright/lib/worker/workerProcessEntry.js` (1.62.1): fixtures are visited in reverse setup order and each one's dependents are collected before it.
- `C` — a `describe` whose `beforeAll` logs a created row and throws, with an `afterAll` and two tests. Both tests were reported failed with `Error: P9 beforeAll failure`; the two workers each ran `beforeAll` once, and **`afterAll` ran in each**, after the failure.
- Not tested: a `beforeAll` failure with `retries` above 0; a worker killed mid-test.

## P10 — the body shape without `catch`: the compiler-API check and ESLint (added at the FEAT-S2 correction pass of 2026-10-23)

Added by `designer`, 2026-10-23, for the owner's answer 2 (`try { … } finally { await cleanup.run(); }`, no `catch`) and nit 2 (an aliased `test`). Scratchpad `...\scratchpad\p10\p10.cjs` uses P8's walk with the shape changed to: the function body is exactly one `try`, it has no `catch` clause, and its `finally` is exactly `await cleanup.run();`. It also counts the matched `test` calls (callee `test` or `test.<only|fixme|fail|slow|skip>` with a function argument) and reports an import `test as <x>` or a declaration `<x> = test`.

```
typescript 6.0.3
F shapes.functional.spec.ts | test calls: 10 | rule12: X-FN-01..08 BAD, X-FN-09 ok, X-FN-10 (test.skip, full shape) ok | file: ok
G import-alias.api.spec.ts  | test calls: 0  | rule12: -            | file: zero test calls; alias: import test as it
H const-alias.api.spec.ts   | test calls: 1  | rule12: X-API-02:ok  | file: alias: const it = test
I describe-and-hooks-only   | test calls: 0  | rule12: -            | file: zero test calls
J nested.api.spec.ts        | test calls: 1  | rule12: X-API-04:ok  | file: ok
```

The eight broken shapes of `F`: no `try`; a rethrow-only `catch`; a swallowing `catch`; a `finally` without `cleanup.run()`; `cleanup.run()` plus another statement; `cleanup.run()` not awaited; a statement before the `try`; an empty `finally`. A `test` inside a nested `describe` (`J`) is found like a top-level one.

ESLint, the repository's config, through stdin as `e2e/regression/auth-login/probe-<x>.api.spec.ts` (`npx eslint --stdin --stdin-filename …`): the `try { … } finally { await cleanup.run(); }` source gave no problem; the same source with `catch (e) { throw e; }` gave `8:7 error Unnecessary catch clause no-useless-catch`.

- Not tested: real spec files of the repository; a second test object built by `base.extend` under another name in a file that also calls `test`.

## P11 — a killed worker, teardown time after a timeout, pid reuse (plan task T2, first pass, 2026-10-23)

Added by `tester-api` for design §8's "left to a probe" items. No app, no `next dev`: scratchpad `...\scratchpad\p11\` holds `p11.config.cjs` (`workers: 1`, `fullyParallel: true`, `retries: 0`, `timeout: 2000`, list + json reporters, no `webServer`), `kill.p11.cjs`, `timeout.p11.cjs`, `reuse.p11.cjs`, `reuse2.cjs`. Every fixture and hook appends `<ms> pid=<pid> <event>` to a log. Run from the repo root as `npx playwright test --config <scratchpad>\p11\p11.config.cjs <kill|timeout|reuse>.p11`, Playwright `1.62.1`, Node `24.14.0`. `netstat -ano` showed no listener on 3100/3101 before or after.

**Killed worker** (`kill.p11.cjs`): `K1` calls `process.kill(process.pid, 'SIGKILL')` inside a test that holds a test-scoped `lease` fixture; `K2`, `K3` follow. `EXIT=1`, JSON report:

```
K1 kills its own worker | status failed | Error: worker process exited unexpectedly (code=1, signal=null)
K2 runs after | status passed |      K3 runs after | status passed |      "unexpected":1 "expected":2
log:  pid=37924 setup lease [K1] / body K1            (no afterEach, no RELEASE for K1)
      pid=37632 setup lease [K2] / body K2 / afterEach status=passed / RELEASE lease    (a new pid, 380 ms later)
```

**Teardown time after a timeout** (`timeout.p11.cjs`, test timeout 2000 ms): bodies hang on a never-resolving promise; a test-scoped fixture's teardown sleeps 1 s / 4 s / 12 s. Times are ms from the first line:

```
T1 +0 body, +2015 afterEach status=timedOut, +2017 teardown START, +3028 teardown DONE (1 s sleep ran to the end), next test on a NEW pid at +3418
T2 +5424 afterEach status=timedOut, +5425 teardown START, no DONE; next pid at +7822 (2.4 s later)
T3 +9834 afterEach, +9835 teardown START, no DONE; next pid at +12230
JSON: T1 timedOut "Test timeout of 2000ms exceeded."
      T2 timedOut + "Tearing down "s4" exceeded the test timeout of 2000ms."     T3 the same for "s12"
```

**Pid reuse**: `reuse.p11.cjs`, 40 tests each killing its worker (`workers: 1`): 40 `body R<n>` lines, 40 distinct pids, none repeated. `reuse2.cjs`: 1500 `node -e` children spawned and killed in a loop (3000 processes counting the helper `spawnSync` per round): `{"spawned":1500,"distinctPids":1500,"firstReuse":null,"ms":95024}`.

- A test whose worker was killed is reported **failed** with `worker process exited unexpectedly (code=1, signal=null)`; its `afterEach` and fixture teardown (the lease release) never ran; later tests ran in a new worker with a new pid.
- After a timeout, `afterEach` and fixture teardown run, each fixture teardown with its own budget **equal to the test timeout** (a 1 s teardown finished after the timeout, a 4 s one was cut at 2 s, a 12 s one the same); after a timeout the worker is always replaced (next test on a new pid).
- Within 40 worker replacements on this Windows machine no pid was handed out twice, nor among the 1500 spawned children of `reuse2.cjs` — only those children's pids were compared, not the helper processes.
- Not tested: Linux; a run of many hours; the pid-reuse window on a machine with a small pid space.

## P12 — disposal of the test-scoped `request` context against the lease release (plan task T2, first pass, 2026-10-23)

Added by `tester-api` for design §8's "Open — an abandoned body's late writes". Scratchpad `...\scratchpad\p12\`: `stub.cjs` (HTTP server on `127.0.0.1:3192`, logs `ARRIVE`/`RESPOND` with the `x-test` header; `/slow` answers after 4 s, `POST /meetings` records arrival), `p12.config.cjs` (`workers: 1`, `timeout: 2000`, `use.baseURL` the stub, `webServer` the stub with `reuseExistingServer: false`), `ctx.p12.cjs`, `ovr.p12.cjs`. Fixtures: `lease` (no dependency), `leaseDep` (depends on `request`), each logs `RELEASE start` and then **probes** with a context object the body captured (`GET /ping`); the body awaits `request.get('/slow')`, then issues `request.post('/meetings')`. `D4`'s body instead awaits a 3 s timer, then posts. Run as `npx playwright test --config <scratchpad>\p12\p12.config.cjs [ovr.p12]`; every test times out by design (`EXIT=1`). Ports 3100/3101 free before and after; 3192 had only `TIME_WAIT` sockets after.

```
D1 params (lease, request):  +2424 RELEASE start status=timedOut | +2425 pending slow call REJECTED: apiRequestContext.get: Request context disposed.
                             +2427 RELEASE probe rejected: ... Target page, context or browser has been closed | +2429 late POST REJECTED (same text)
D2 params (request, lease):  +4810 RELEASE start | +4813 server ARRIVE GET /ping test=lease-release-probe | RELEASE probe ok (context alive)
                             +4823 pending slow call REJECTED: ... Request context disposed. (13 ms AFTER the release) | +4824 late POST REJECTED
D3 leaseDep (depends on request): +7195 RELEASE start | probe ok (context alive) | +7216 pending slow call REJECTED (21 ms after) | +7219 late POST REJECTED
D4 timer 3 s then POST:      +9618 RELEASE start | probe ok | +9640 "worker process exit event" | "timer fired" never logged; no POST at the server
server.log: no `POST /meetings` line for D1…D4; every `/slow` call that had started was still answered by the stub (the abandoned request reaches the server, only its response is dropped)
ovr.p12.cjs  request: async ({ lease, request }, use) => use(request)   (E1 params (request, lease), E2 (lease, request), E3 (request only)):
             in all three: pending call REJECTED at RELEASE start +1 ms, then RELEASE probe rejected ("Target page, context or browser has been closed")
```

- The pending call is **rejected** with `Request context disposed`, and a call issued afterwards on the same context is rejected too: no late `POST` reached the stub in D1-D3.
- Whether disposal precedes the lease release **depends on fixture setup order, not on the lease's dependents**: with the `lease` set up before `request` (D1) the context is disposed first; with `request` set up first (D2) or a lease that depends on `request` (D3) the release runs first with a live context, and disposal follows 13-21 ms later. Overriding `request` to depend on `lease` (`ovr.p12.cjs`) makes disposal precede the release in all three parameter orders.
- A body parked on a non-request `await` (a timer, D4) never resumed: the worker process exits about 10 ms after the release, before the timer fired.
- Not tested: a `page`/`context` browser fixture against the lease (no browser here); a call in flight with a request body already half sent; several workers.

## T2 baseline — `playwright test --list` at HEAD (plan task T2(b), for T11b)

HEAD `548195c`; no spec or config file modified in the working tree (`git status --short | grep -E 'spec|playwright'` empty). `--list` starts no server; 3100/3101 free before and after.

```
pnpm exec playwright test --list --project=api          Total: 131 tests in 11 files
pnpm exec playwright test --list --project=web          Total: 54 tests in 5 files
pnpm exec playwright test --list --project=integration  Error: No tests found ... Total: 0 tests in 0 files
pnpm exec playwright test --list                        Total: 185 tests in 16 files
pnpm exec playwright test --list | grep -c AL-FN-02     1
```

- 131 + 54 + 0 = 185. T11b's per-project target is these counts, minus 1 on `web` for `AL-FN-02`, plus T3's and T5's new tests.

## P13 — "contexts close before the release", on the suite's own fixtures (plan task T4, first pass, 2026-10-23)

Added by `tester-api`, for `FACT-3776` and `FACT-3821`'s unprobed browser `context`. Scratchpad `...\scratchpad\t4\`: `stub.cjs` (HTTP server on `127.0.0.1:3193`; logs `ARRIVE <method> <url>`; `POST /auth/login` → `{accessToken}`, `GET /meetings*` → `{items:[],total:0}`, `GET /slow` answers after 4 s), `t4.config.cjs` (project `web` on Chromium, `workers: 1`, `timeout: 2000`, `use.apiBaseURL` and `baseURL` the stub, `webServer` the stub with `reuseExistingServer: false`), `order.t4.ts` importing `test` and `expect` from `e2e/fixtures/suite.ts` and `test.use({ poolDir })` of a scratch directory, `base.t4.ts` (plain `@playwright/test`, no suite). Each test takes `claim`, so the lease holds a claim and its teardown's first call is `GET /meetings?limit=1` on the release's own context: that `ARRIVE` line is `RELEASE start`. The body logs when its pending call rejects or the context's `close` event fires. Run from the repo root, one test per invocation: `npx playwright test --config <scratchpad>\t4\t4.config.cjs -g "<name>"`, Playwright `1.62.1`. `netstat -ano` showed no listener on 3100/3101 before; 3193 had only `TIME_WAIT` after. Every test times out by design (`EXIT=1`).

Parameter lists: `first` = `({ lease, claim, <page|apiRequest> })`, `last` = `({ <page|apiRequest>, claim, lease })`.

```
API-first  (apiRequest, pending GET /slow)       +0 body | +1994 pending call REJECTED "Request context disposed" | +1998 server ARRIVE GET /meetings?limit=1   (release 4 ms after)
API-last                                          +0 body | +1985 pending call REJECTED "Request context disposed" | +1988 server ARRIVE GET /meetings?limit=1   (release 3 ms after)
UIW-first  (@ui-login, page, locator wait)       +0 body | +1918 pending expect REJECTED | +1919 CONTEXT CLOSED | +1925 server ARRIVE GET /meetings?limit=1        (release 6 ms after)
UIW-last                                          +0 body | +1920 pending expect REJECTED | +1921 CONTEXT CLOSED | +1927 server ARRIVE GET /meetings?limit=1        (release 6 ms after)
```

Second pair, the body parked on `page.goto('/slow')` (a navigation the server answers after 4 s):

```
UI-first   Tearing down "context" exceeded the test timeout of 2000ms; CONTEXT CLOSED at +5071 (after the 4 s answer + ~1 s); the stub saw no GET /meetings at all
UI-last    the same: CONTEXT CLOSED at +5068; no GET /meetings
after UI-first: the scratch pool directory still holds claims/pool-01/owner.json naming the dead worker's pid (the claim was not released)
BASE-goto  (plain @playwright/test, no suite fixtures): the same "Tearing down "context" exceeded", CONTEXT CLOSED at +5080
BASE-wait  (plain, locator wait): rejected and CONTEXT CLOSED in the same millisecond
```

- With the suite's overrides, `apiRequest` and the browser `context` were each closed before the release started in all four runs, in both parameter orders, when the body was parked on a call or a locator wait.
- A body parked on a **navigation to a server that has not answered** is a different path: Chromium's context close did not return until that navigation finished, the context's teardown ran past its budget (`FACT-3820`) and was cut, and the lease's teardown never ran, leaving the claim held by a worker that was then replaced. The same happened without any suite fixture (`BASE-goto`), so the override is not its cause; the slot is the takeover's case (`FACT-3777`).
- Not tested: a navigation that never answers (whether the close ever returns); a body in `page.click` or `page.waitForURL`; several workers.

## P14 — the warm-up decision, design §2.6 (plan task T12, first pass, 2026-10-23)

Added by `tester-api`. Machine: 14 logical CPUs, 7 workers. Per run, from `arm.sh` (scratchpad `t12/`): `.next` removed (a fresh `next dev` compiles every route cold), seven `node` busy-loops of 280 s, then `pnpm e2e --project=web --reporter=list`, loops killed after. Ports 3100/3101 were verified free before each arm. Duration is wall time of the whole command (servers, db reset and teardown included). The `FX-052` signature (Next's own HTML 404 for an existing route, or a first navigation stuck on its source page) is judged from the log. One deviation from §2.6's text: `.next` was cleared per run (the owner's brief) where §2.6 says warm; `web-e2e-flake` P-FIX-S2 found cold and warm did not separate outcomes, and cold is the harsher case.

Arm A (`globalSetup` calls no warm-up; `warm-up.ts` still on disk but unused). First 10 runs, A1:

| Run | Result | Duration | Failure (first line)                                                                                                   |
| --- | ------ | -------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1   | pass   | 75 s     | -                                                                                                                      |
| 2   | pass   | 74 s     | -                                                                                                                      |
| 3   | pass   | 68 s     | -                                                                                                                      |
| 4   | pass   | 64 s     | -                                                                                                                      |
| 5   | pass   | 64 s     | -                                                                                                                      |
| 6   | pass   | 67 s     | -                                                                                                                      |
| 7   | pass   | 76 s     | -                                                                                                                      |
| 8   | FAIL   | 76 s     | `HD-FN-10` `Error: apiRequestContext.post: read ECONNRESET` (`POST http://127.0.0.1:3101/auth/login`, `loginPoolUser`) |
| 9   | pass   | 80 s     | -                                                                                                                      |
| 10  | pass   | 86 s     | -                                                                                                                      |

Run 8's failure is not the signature: the request is the pool fixture's login against Nest, no Next page was involved. By §2.6 it is diagnosed separately and the arm re-run, so A2 repeats arm A in full:

| Run | Result | Duration | Failure (first line)                                                                                                    |
| --- | ------ | -------- | ----------------------------------------------------------------------------------------------------------------------- |
| 1   | pass   | 66 s     | -                                                                                                                       |
| 2   | FAIL   | 77 s     | `MF-FN-15` `Error: apiRequestContext.get: read ECONNRESET`                                                              |
| 3   | FAIL   | 66 s     | `MF-FN-15` `Error: apiRequestContext.get: read ECONNRESET` (`GET http://127.0.0.1:3101/meetings?limit=50`, `fetchMeetingsPage` from `createHeldMeeting`) |
| 4   | pass   | 79 s     | -                                                                                                                       |
| 5   | pass   | 75 s     | -                                                                                                                       |
| 6   | pass   | 64 s     | -                                                                                                                       |
| 7   | pass   | 63 s     | -                                                                                                                       |
| 8   | pass   | 76 s     | -                                                                                                                       |
| 9   | pass   | 68 s     | -                                                                                                                       |
| 10  | pass   | 76 s     | -                                                                                                                       |

Arm A total: 17 of 20 green. The three reds are one failure kind, `read ECONNRESET` on a `request` fixture call to the api (:3101), once on a login and twice on a `GET /meetings`. In 20 runs: no Next HTML 404, no stuck navigation, no `Expected: 200 Received: 404`, no `toHaveURL` timeout on `/auth/login` (the `FX-052` texts, P-FIX-S2 above). A browser-side symptom did not appear once.

Control, today's warm-up restored (`globalSetup` calls `warmUp`), same procedure, 10 runs: 10 of 10 green, 66, 67, 67, 73, 73, 79, 71, 81, 84, 80 s. 0 of 10 `ECONNRESET` against 3 of 20 in arm A: with these counts the difference is not significant (Fisher exact, one-sided, about 0.2), so the control neither ties the `ECONNRESET` to the warm-up nor clears it.

Reading. The design's criterion is the signature, and it did not appear in arm A, so arm B and arm C were not needed: the outcome is A. What arm A did not give is the literal "10/10 green" of the plan's `BL-067` line: 17/20, all three reds the api-side reset. Not proven: why Nest resets a connection (candidates, none tested: a pooled keep-alive socket that Nest's HTTP server closed first, or the api event loop blocked by synchronous `scryptSync` under 7 busy-loops); whether it can happen without load (the unloaded green runs say it is rare at best); whether it is a defect in the suite's `request` fixtures or in `apps/api`. It is reported as an open finding, not fixed here.

Edits made for outcome A: `e2e/fixtures/warm-up.ts` deleted; `e2e/fixtures/global-setup.ts` empties the pool only; `playwright.config.ts` comment; `e2e/fixtures/global-teardown.ts` comment; `e2e/suite-integrity.api.spec.ts` rule 11 loses the warm-up allowance (the `allowance` kind, the `warmUpAllowance` parameter, the must-hit scenario and the must-miss entry). Final run without load after the edits: `pnpm e2e`, 195 passed, 46.8 s.
