# Design: web-e2e-flake

## 1. What the research established

- Red only under CPU load with default workers (14 on this box): 7 busy-loops red 3 of 5, 14 loops red 1 of 1, unloaded green 3 of 3; `--workers=2` under 7 loops green 2 of 2 (84–90 s); cold vs warm `.next` did not separate outcomes — `probes.md`, FIX-S2 table.
- Two failure modes. **(A)** the file route answers Next's ~13 KB HTML 404 before our handler runs (`code.md` §6: the handler builds no HTML); reproduced without Playwright with 8 concurrent _first-time_ requests under 14 loops, 3 of 4 runs, and the 404 then **sticks for the life of that `next dev`**; a lone cold request is 200 — `probes.md` (b). **(B)** `uiLogin`'s `toHaveURL('/')` exceeds `expect.timeout` 10 s (`code.md` §1, §5); login application-code in green suite runs is 3.3–5.5 s, against 133–143 ms for one browser login on a compiled `next dev` and 1.9–2.7 s for 14 concurrent — `probes.md` (a), FIX-S2 verbatim.
- scrypt is not the bulk: 68 ms per login at Nest, 726–752 ms for 14 concurrent, 1056 ms for 14 under 14 loops — `probes.md` (a).
- The web server is `next dev` with `reuseExistingServer: !isCI`; `workers: isCI ? 1 : undefined`; no warm-up, no build step — `code.md` §1–3. No ADR or Rejected row decides server mode, workers or warm-up; one Rejected row refuses a global `fullyParallel: false` for slowing the suite — `history.md`, Decisions / Rejected.

## 2. The shape

**Where the cause sits.** Inside Next 16.3.8/Turbopack: concurrent first compiles under CPU pressure can yield a sticky HTML 404 (mechanism unproven, `probes.md` "Not proven"). In our config: the suite fires up to 14 workers' first requests at routes `next dev` has never compiled, so every first compile happens concurrently and under the suite's own load, and the first logins pay that compile inside a 10 s expect. Nothing in `apps/api` or `apps/web` product code is at fault.

**The fix: compile every web route once, serially, before the first web-project test.** A Playwright warm-up step in the root config, after both `webServer` entries answer, requests each route of `apps/web/src/app` (pages, the two Route Handlers, and the login form's Server Action path) one at a time. It addresses (A) by removing concurrent first compiles — the one condition the lone-request probe shows Next handles — and (B) by taking the compile out of the first login, leaving the measured post-compile cost (≤ 2.7 s at 14-way concurrency) inside the 10 s budget. Its rules:

- requests carry a `ps_session` cookie so `proxy.ts` (matcher `'/', '/auth/login', '/meetings/:path*'`) does not bounce them before the route module compiles (invariant 10: the proxy sees only that a cookie exists);
- each response is checked against its expected status; an HTML 404 from Next **aborts the run** naming the route and "restart next dev", because the 404 sticks and a reused dev server would otherwise turn it into dozens of unrelated reds;
- it lives in the config as `globalSetup`, not as a setup project: no new project, no spec to pair with a `.cases.md` (`FACT-3145`, `FACT-3146`).

Unchanged: `apps/api`, `apps/web`, ports 3100/3101 (`FACT-3143`), `next dev` as the web server, `workers`, `fullyParallel`, `expect.timeout`, CI.

**Red reproduction and control** (the `probes.md` procedure, no server left on 3100 before each run so `next dev` starts fresh): 7 busy-loops, `pnpm e2e --project=web --reporter=list`, default workers. Red on current code (3 of 5 recorded); after the fix, 5 consecutive runs green; control — the warm-up disabled, same load — red again within 5 runs. There is no deterministic spec that is red on current code; the load procedure is the reproduction.

## 3. Contract

No HTTP change. No endpoint, body or status of `apps/api` or `apps/web` is altered.

## 4. Data

None. No entity, seed or fixture data changes; the warm-up uses seeded IDs already in `e2e/fixtures/seed.ts`.

## 5. Alternatives rejected

| Alternative                            | Why not                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `next build` + `next start` on 3100    | Removes compiles entirely, but `reuseExistingServer: !isCI` on a production server is the stale-build false green the config comment and `FACT-3141` warn about, so it forces reuse off and a full build per `pnpm e2e`; build time is unmeasured against "Run economics"; it loses hot reload for local loops; and it changes what the web project tests (dev-only console output, `allowedDevOrigins`). Larger than the cause needs; would need an ADR. |
| Cap local workers (e.g. 2)             | The only measured green under load (2 of 2), but it treats load, not first compiles: the suite slows for every run (84–90 s vs 58 s warm unloaded, different loads) — the same objection as the Rejected global `fullyParallel: false` — and the sticky 404 can still occur on any concurrent first compile. Kept as the fallback if the control fails (§8).                                                                                              |
| Async `scrypt` instead of `scryptSync` | Product code for a test-harness defect; scrypt is ≤ ~1 s of a 10 s budget even 14-way under load, and it does nothing for (A); a change near invariant 18's timing equality needs its own case.                                                                                                                                                                                                                                                           |
| Raise `expect.timeout`                 | A symptom fix, and the cause is partly ours (concurrent first compiles), so §3 of `bugfix-pipeline` does not allow it; it cannot fix (A) at all — a sticky 404 is not slow, it is wrong.                                                                                                                                                                                                                                                                  |
| Retries locally (`retries: 0` today)   | A sticky 404 fails every retry on the same process; retries hide (B) without removing it.                                                                                                                                                                                                                                                                                                                                                                 |

## 6. Decisions and ADRs

No ADR: the web server stays `next dev`, ports and ownership (`ADR-0008`, `ADR-0012`, `ADR-0027`) are untouched. Choosing the production-server alternative instead would need one ("needs ADR: the e2e web server runs a production build"); this design does not.

## 7. Impact on what already exists

| Artifact family                       | Grep or command run                                                                                                                 | IDs returned                                                                                                                    |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Existing specs and case preconditions | `tests.md` §3, §6: `test.setTimeout\|test.slow\|timeout:` in `*.functional.spec.ts`; `warm\|first compile\|retries` in `*.cases.md` | none hold a timeout or warm-up; cases made stable: AL-FN-02/03/04/08, ACC-FN-02/04/05/06, MF-FN-07/09/12 — assertions unchanged |
| Corpus keys                           | `grep -n "next dev\|webServer\|globalSetup\|warm\|workers" docs/{architecture,data-model,api-contract}.md docs/adr/*.md`            | `FACT-3229`, `FACT-3568`, `FACT-3575` — none contradicted; no fact retired or added                                             |
| Hand-kept lists                       | `find apps/web/src/app -name page.tsx -o -name route.ts`                                                                            | the warm-up's route list is a **new** hand-kept list (6 routes today); `PROTECTED_PAGES`, `AUDITED_PAGES` unchanged             |
| Framework output                      | written line                                                                                                                        | Next's dev log gains one compile line per route before the suite; the HTML 404 page is Next's, not ours                         |

`e2e/README.md` "Run economics" will need a re-measurement (it already disagrees: 171 vs 173 tests).

## 8. Open questions and deliberate omissions

1. Playwright 1.62.1 must start `webServer` before `globalSetup`; not in the research. If not, the warm-up becomes a setup project the `web` project depends on (which then needs a `.cases.md` pair).
2. Whether a GET of `/auth/login` compiles its Server Action, or the warm-up must submit the form once — unmeasured.
3. The warm-up's cost, including on `--project=api` runs that do not need it — unmeasured.
4. Whether warm-up alone clears (B) under load is inferred, not measured; if the control is not green 5 of 5, the next step is the workers cap, not a timeout.
5. Omitted on purpose: the Next-internal sticky-404 bug (outside our code; not reported upstream here), the `FACT-3141` source contradiction and the CI `CI` variable question (`README.md` "Contradictions", "Still unknown") — separate items.
