# Bugfix: web-e2e-flake

Defect `BL-058`, taken by the owner 2026-10-16. Full path: `bugfix-pipeline` §4 criterion 1 (cause
not found in ~15 min; `BL-058` records "Cause not found"). Shape from `design.md`, not reopened.

## 0. Orientation: what the project already has

- **Duplicate:** no matches among `FX-` entries. The flake is known only as `BL-058` (Open, P2,
  `docs/BACKLOG.md:33`). Its neighbours `FX-030` (hung `@playwright/test`), `FX-033` (count race
  under `fullyParallel`), `FX-011` (timing threshold) and `FX-049` have different causes
  (`research/history.md`), so this is not a regression of an earlier fix.
- **Conflicts with shipped:** no product code is touched and no invariant moves. Ports 3100/3101 stay
  (`CLAUDE.md`, `FACT-3143`). The cases this stabilises keep their assertions unchanged:
  AL-FN-02/03/04/08, ACC-FN-02/04/05/06, MF-FN-07/09/12. The Rejected row "A global
  `fullyParallel: false`" (`docs/BACKLOG.md:116`) is respected: workers and `fullyParallel` stay.
- **Conflicts with planned:** this closes `BL-058`, which is marked closed with the `FX-` reference.
  `BL-013` (worktree tooling) is untouched. No other matches.
- **Architecture impact:** `ADR-0008` (`FACT-3143`, `FACT-3145`, `FACT-3146`), `ADR-0012`
  (`FACT-3220`) and `ADR-0027` (`FACT-3568`: `webServer` entries are awaited in array order) are
  restored, not changed. The web server stays `next dev`, so no new ADR is needed (design §6). If
  T1 forces a setup project, `FACT-3145`'s project list changes, and that is a design gap that goes
  back to the lead.
- **Open questions:** the Next-internal sticky-404 mechanism is unproven (`research/probes.md`); that
  a warm-up alone clears failure (B) under load is inferred, not measured; T1 measures the rest.

## 1. Reproduction

| What        | Value                                                                                                                                                                                                                                                                                          |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Procedure   | 1. Nothing listening on 3100, so `next dev` starts fresh. 2. Start 7 CPU busy-loops: `for i in $(seq 1 7); do node -e "const e=Date.now()+280000;while(Date.now()<e){}" & done`. 3. Run `pnpm e2e --project=web --reporter=list` with default workers (14 on this machine). 4. Kill the loops. |
| Expected    | the cases as written: AL-FN-02 URL becomes `/`; MF-FN-07 gives 200; MF-FN-12 gives 404 with an empty body (`research/tests.md` §3)                                                                                                                                                             |
| Actual      | `Expected: "http://127.0.0.1:3100/" Received: ".../auth/login" Timeout: 10000ms`; `Expected: 200 Received: 404`; a 13,156-byte HTML 404 body (`research/probes.md`)                                                                                                                            |
| Stability   | red 3 of 5 at 7 loops; red 1 of 1 at 14 loops; green 3 of 3 with no load; green 2 of 2 at `--workers=2`                                                                                                                                                                                        |
| Environment | Next 16.3.8 (Turbopack), `next dev` on 3100, `reuseExistingServer: !isCI`, 14 logical CPUs                                                                                                                                                                                                     |

## 2. Cause

- **Cause:** up to 14 workers send their first requests to routes `next dev` has never compiled, so
  every first compile runs concurrently and under the suite's own load. This produces two failures.
  (A) Next answers its own HTML 404 before our handler runs, and the 404 sticks for the life of that
  process. (B) The first logins pay for compilation inside the 10 s `expect.timeout`.
- **How it was localized:** without Playwright, 8 concurrent first-time requests under 14 loops gave
  the HTML 404 in 3 of 4 runs, while a lone cold request gave 200. scrypt was measured at ≤ 1056 ms
  for 14 concurrent logins under load (`research/probes.md` (a), (b)).
- **When it appeared:** always there; `next dev` and `fullyParallel` date from `fe07cfe`.

## 3. Impact

- **What else rests on it:** every web-project case's first visit to a route; no API, data or invariant. **User-visible:** no — test infrastructure only, and it costs lost `pnpm verify` runs.
- **Security:** none. The warm-up's `ps_session` cookie only passes the optimistic `proxy.ts` check (invariant 10) and grants nothing. **Urgency:** `P2`.

## 3a. Corpus facts this fix adds or retires

None. The design names `FACT-3229`, `FACT-3568` and `FACT-3575` as not contradicted, and no fact
moves. This holds only on the `globalSetup` path. A setup project would change `FACT-3145` (see §0),
and that would stop this plan.

## 4. Why it was not caught earlier

- **Which check should have caught it:** nothing should have. No test holds the `workers` or
  `webServer` settings, and none covers warm-up or behaviour under load (`research/tests.md` §5–6).
  Unloaded runs are green 3 of 3. Found by: `pnpm verify` load flake on `clean-architecture-pilot`
  (`BL-058`). The reproduction is a procedure, not a red spec.
- **What we do about it:** the warm-up's route list is new and hand-kept; a meta-check is proposed in §7.

## 5. Fix plan

| ID  | What to do                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Files                                                                                                            | Done when                                                                                                                                                                                                                | Depends on |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| T1  | **Spike** (`tester-functional`, throwaway code outside the repo). It answers four questions with measurements on `@playwright/test` ^1.62.1: (a) does `webServer` answer before `globalSetup` runs, both entries in array order (`FACT-3568`), or is a setup project the `web` project depends on needed instead; (b) does a GET of `/auth/login` compile the login Server Action, or must the warm-up submit once, comparing the first `POST /auth/login` application-code time after a GET-only warm-up with the time after a wrong-password submit; (c) the expected status of each route under the warm-up cookie; (d) warm-up wall time, and the `--project=api` and `--project=integration` time with and without it. | none in the repo                                                                                                 | a hand-back to the lead with one measured fact per question. If (a) is "setup project", **stop**: it goes back to the lead and designer (`FACT-3145`, a `.cases.md` pair written first by `test-designer`)               | —          |
| T2  | Warm-up (`tester-functional`). It requests each route of `apps/web/src/app` serially (`/`, `/auth/login`, `/auth/register`, `/auth/session-expired`, `/meetings/<seeded id>`, `/meetings/<seeded id>/files/<seeded id>`), plus the Server Action if T1(b) requires it, carrying a `ps_session` cookie. It checks each status against T1(c) and aborts on Next's HTML 404, naming the route and "restart next dev". Seeded IDs come from `e2e/fixtures/seed.ts`. URLs come from the config, never a literal (`suite-integrity` rule 9). It is wired as `globalSetup`, with a why-comment citing `BL-058`.                                                                                                                    | `e2e/fixtures/warm-up.ts` (new), `playwright.config.ts`                                                          | the unloaded `pnpm e2e --project=web` is green. A throwaway wrong route aborts the run with the route named. The `api`/`integration` slowdown is within T1(d)                                                            | T1         |
| T3  | Green and control (`tester-functional`). Run the §1 procedure 5 times with the fix. Then disable the `globalSetup` line under the same load, run until red (at most 5 runs), and restore the line.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | none (runs only)                                                                                                 | 5 of 5 green, then red within 5 runs with the warm-up disabled, then restored. If green is not 5 of 5, **stop and report to the lead**: the fallback is a local workers cap, decided by the lead, never a longer timeout | T2         |
| T4  | Acceptance (`lead`): `pnpm verify`, ideally 3 consecutive runs                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | none                                                                                                             | green; the run times are handed to T5                                                                                                                                                                                    | T3         |
| T5  | Ledger and close (`tester-acceptance`). Add an `FX-` row with `Path: full (docs/plans/web-e2e-flake)` and Found by "`pnpm verify` load flake (`BL-058`); reproduced by a load procedure, no spec covered it". Mark `BL-058` closed with the `FX-` reference (not deleted). Re-measure "Run economics" if the timings changed (nowhere else). Write the profiling record (`FIX-S11`). Run `pnpm scenarios:index` only if a `.cases.md` changed (none is expected).                                                                                                                                                                                                                                                           | `docs/CHANGELOG.md`, `docs/BACKLOG.md`, `e2e/README.md`, `docs/profiling/runs/2026-10-16-web-e2e-flake.md` (new) | the ledger meta-test is green, and `BL-058` reads Closed → `FX-`                                                                                                                                                         | T4         |

- **What we do NOT touch:** `apps/api`, `apps/web`, `workers`, `fullyParallel`, `expect.timeout`,
  `retries`, ports, CI, the `next dev` server mode — the design's rejected alternatives stay rejected.

## 5a. Tests this fix is expected to break

None. No assertion changes, and the warm-up runs before every test.

## 6. Verification

- **Red test before the fix:** the §1 procedure is the reproduction (`bugfix-pipeline` §2, "a
  written, repeatable procedure"), already red 3 of 5 on current code. There is no new case ID. A
  `.cases.md` row would be needed only on the setup-project path that T1 can force.
- **Control experiment:** T3 (warm-up disabled, red within 5 loaded runs, restored). **Acceptance:** T4.

## 7. Risks and deliberate omissions

- The warm-up may clear (A) but not (B) under load. T3 detects this, and the lead decides the workers
  cap. The `reuseExistingServer` dev server may already hold a sticky 404, so the abort message tells
  the user to restart it.
- The route list drifts when a route is added. Proposed `BL-`: a `suite-integrity` rule comparing the
  warm-up list with `apps/web/src/app`'s `page.tsx`/`route.ts` files.
- Proposed separate `BL-` lines, out of scope: (1) the Next 16.3.8/Turbopack sticky HTML 404 on
  concurrent first compiles, outside our code and not reported upstream; (2) `FACT-3141` cites
  `FX-013`, which says nothing about `next start`; (3) whether the CI runner sets `CI`, which
  `playwright.config.ts` branches on while `ci.yml` sets no `CI=`.
