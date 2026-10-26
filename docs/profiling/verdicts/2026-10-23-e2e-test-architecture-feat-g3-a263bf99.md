<!-- agent: plan-reviewer; session: b988267e-c081-447a-abcb-7f7b884c5b13; captured: 2026-10-23T16:14:11.905Z -->

VERDICT
Change: e2e-test-architecture
Gate: FEAT-G3
Pass: first
Verdict: accept-after-blockers
Findings:
- blocker | shape | task-order | T13 is optional, waits on the owner and runs late, but the lines it fixes (tester-functional.md:43-44, tester-api.md:29-30, regression-verify SKILL.md:141-142) are what T8/T9/T11, FEAT-G4 and FEAT-S6 will read, and they say the opposite of ADR-0036/0037
- blocker | correction | unreachable-dod | T13's Done-when greps the whole tree for organizer|eraser, which ADR-0037, the retired-fact registers and the not-yet-migrated specs will always match; the regex's `|` also breaks the table row and garbles the Depends column
- blocker | correction | unreachable-dod | no task puts e2e/smoke/seed.api.spec.ts into rule 12's try/finally shape, and T11 says "five" regression api specs where there are four, so T11b's "rules 11/12 green" cannot be met as written
- blocker | correction | unreachable-dod | T5 expects "every pool case red on the 401 login of pool-01", but some listed cases never log a pool user in (run() never throws, claim winner, takeover guard on a dead pid)
- nit | - | task-order | withCleanup has to live through T4–T11 for the unmigrated specs, but no task says where; T11b's file list leaves out e2e/api/cleanup.api.ts; T4 says the shims stay "until T11" while T11b removes them
- nit | - | dod-passes-when-broken | T11b's "test count = before − 1 + …" compares against a "before" count no task records
- nit | - | other | pool cases that check the leaked mark, the release check or the takeover purge would leave a held user dirty in the live run and turn T11b's teardown comparison red unless they run on a separate pool directory
- nit | - | task-order | FEAT-G4 is not placed relative to T12–T14; reading design §2.6 "after the change is otherwise accepted" as "after T11b" is not written down
- nit | - | doc-drift | architecture.md "Patterns in use" stays unchanged although it already lists test patterns (FACT-0031, FACT-0032) and this change adds two
- nit | - | stale-fact | warm-up.ts:14 cites AL-FN-02 (design §7); no task re-points it if arm C keeps the warm-up
- nit | - | other | T4's Done-when "existing specs … green" should exclude rules 11/12 (§4a) and check that .gitignore now ignores .e2e-pool/
END VERDICT

Plan reviewed: `C:\GIT\PurpleSchool\docs\plans\e2e-test-architecture\e2e-test-architecture.plan.md`, Gate FEAT-G3, first pass.

## Strengths

- **The fact table (§3a) and its list of living citers hold up.** I searched the tree outside plans/profiling for every key the plan retires. Every living citer it names is real and is assigned:
  - the cases docs (`meeting-files.{api,functional,unit}.cases.md`, `home-dashboard.api.cases.md:21`) go to T1;
  - `CHANGELOG.md:38`, `BACKLOG.md:29`, `api-contract.md:301` and the four meeting-files source comments go to T6.
  - Everything else sits in registers, in the fact being retired, or in the lock.
  - T1 runs before T6, so the citing lines are re-pointed before the retirement trips `AR-API-14`.
  - Re-pointing only `FACT-2096`'s source follows `FACT-3501`, with precedent in the clean-architecture-pilot work.
- **Every part of the design has a task:** §2.1 and §2.2 go to T4/T8, §2.3 and §2.4 to T4/T5/T9–T11b, §2.5 to T4, §2.6 to T12, §2.7 to T3/T13/T14, §2.8's controls C1–C9 all to T16, §4 to T6/T7. Every key move in design §4 is in §3a, including dropping the count from ADR-0007's register intro.
- **Running one Playwright run at a time is stated and enforced** (lines 107–112). `playwright.config.ts` and `suite-integrity.api.spec.ts` each have a single owner, and the pairs allowed to run side by side share no files.
- **The expected-red reasons are honest.** §4a matches the tree: no security spec mentions organizer, so no SEC-FN case belongs there. Line 117 admits that `AL-FN-13`'s guard cannot be shown red first and leaves that to control C2.
- **T2 has a real stop condition:** a probe result against design §2.3 or §8 sends the work back to the design stage.
- **Section 0 cites real ledger, backlog and ADR IDs.**
- **Security (invariants 16–19):** there is no new endpoint, page or Server Action. Storage state now sits in `.e2e-pool/state/` (`FACT-3778`), which T4 adds to `.gitignore`. The cookie builder is checked against the cookie the app itself sets (`AL-FN-13`, C2). `PROTECTED_PAGES` changes form, not coverage, and T10's Done-when is `pnpm e2e:security`. Invariant 17's session-expired hop is kept in `MF-FN-09`. I found no security blocker.

## Blockers

**1. T13: scope, order and condition (shape — but it changes only the plan's ordering, not the design).**
- **Where:** row T13, lines 31, 101 and 146–148; the dependency graph.
- **What is wrong:**
  - `.claude/agents/tester-functional.md:43-44` says "Sessions come from the `authUser` option and the `authedPage` fixture — a real login through the form, not a forged cookie. Mutating cases use the `organizer` sandbox and **relative** counters." ADR-0036 deletes `auth.fixture.ts` and replaces that with a built cookie. T13 covers only "no organizer".
  - `regression-verify/SKILL.md:141` makes "absolute counters in `@mutating` cases" a blocker, but `FACT-3784` now allows absolute counts on a held pool user. `:142` is the 2030 dating line.
  - `tester-api.md:29-30` states "planner sandbox and relative counters" without the `HD-API-23` pool-user exception.
- **What it risks:** T8 and T9 dispatch `tester-functional` and T11 dispatches `tester-api` while their own definitions contradict the plan. The code review and the lead's acceptance check (the `regression-verify` skill) would then flag compliant code. Separately, T15 depends on T13, so if the owner refuses, acceptance has no path.
- **Fix:**
  - T13 becomes unconditional, depends on T1, and must finish before T8.
  - Its scope is those five lines plus `CLAUDE.md`'s naming of `e2e/api/`, written as pointers to the successor keys (`FACT-3756`/`3757`, `FACT-3783`/`3784`, `FACT-3799`) rather than restated rules.
  - `pipeline-implementer`'s definition requires `pnpm verify` before it reports done. The brief must override that ("runs no app"), or that run collides with T7–T12's runs (`ADR-0012`).

**2. T13's Done-when cannot be met, and its row is broken (correction).**
- **What is wrong:** `git grep -iE "organizer|eraser"` "finds no hit outside history" can never pass. ADR-0037 names organizer six times, the retired-fact registers in `data-model.md` and `ADR-0007` keep the text, and while T13 runs alongside T2–T12, `e2e/README.md` and the specs still contain it. The `|` inside the regex also splits the markdown cell: the Depends column ends up reading `eraser"` finds no hit…, and a sixth cell `T1 (∥ T2…T12)` appears.
- **Fix:** scope the grep to the three edited files, and escape the pipe or reword so the row has five cells.

**3. seed.api.spec.ts is never brought into rule 12's shape (correction).**
- **What is wrong:**
  - The test files in rule 12's scope are 12: health, seed, four regression api specs (auth-login, home-dashboard, meetings-detail, meeting-files), security api and functional, three regression functional specs, and accessibility.
  - T8–T11 cover every one except `e2e/smoke/seed.api.spec.ts`. T5 edits that file but does not mention the try/finally body shape.
  - T11 also says "the five `*.api.spec.ts` in `regression/`" when there are four.
- **What it risks:** T11b's "rules 11/12 green" and its single `pnpm e2e` exit 0 cannot be reached.
- **Fix:** give the seed spec's migration to T5 or T11 by name, and correct "five" to four.

**4. T5's red reason is too broad (correction).**
- **What is wrong:** "`SM-API-02` and every pool case red on the 401 login of pool-01." `SM-API-02` will be, since it loops `SEED_USER_KEYS` and reaches pool-01. But T1's list includes cases that never log a pool user in: "`run()` never throws", the rename "claim winner", and a takeover guard over a dead pid. Those are green at T5.
- **Fix:** list which pool cases are red at the test-writing stage for the 401, and mark the rest as "cannot be red first; proven by C1/C9", the way line 117 handles `AL-FN-13`'s guard.

## Findings

- **withCleanup's lifetime.** The specs not yet migrated still import `withCleanup` from `fixtures/cleanup.api.ts` until T9–T11. The design (§2.1) says it "goes", but nothing says it survives in `e2e/api/cleanup.api.ts` or the shim until then, and T11b's file list does not include `e2e/api/cleanup.api.ts` to delete it. Line 91 says the shims stay "until T11" while T11b is the task that deletes them.
- **No baseline for T11b's count.** "before − 1 + …" needs a per-project `playwright test --list` count recorded before T3. The 167/173 in `e2e/README.md` is design contradiction 7 and is no baseline.
- **Pool cases and the live run.** A case that checks "release check and leaked mark", or a purge on takeover, holds a user in the real run. As designed, release then fails the test, writes `leaked.json`, removes the slot from the pool and leaves rows that the global teardown reports. The plan should require such cases to run on a scratch pool directory, or T11b's exit 0 is at risk. T1 should carry that constraint; the scenario text itself is test-designer's.
- **When the code review happens.** State that FEAT-G4 follows T12, T13 and T14, so the warm-up edits and the README are reviewed. Also record that design §2.6's "after the change is otherwise accepted" is read as "after T11b green", not as after FEAT-S6.
- **architecture.md.** It is declared unchanged, yet "Patterns in use" already lists test patterns (`FACT-0031` seed mirror, `FACT-0032` meta-tests), and the project-context skill's table says an architectural choice also updates `architecture.md`'s tables. The design was accepted without this. It is a question for the owner or designer, not a planning fix.
- **warm-up.ts:14** still cites `AL-FN-02` (design §7). If arm C keeps the warm-up, T12 should re-point it.
- **T6 alongside T7.** Both are `implementer-api`. If they are two dispatches in one tree, T6's comment edits under `apps/api/src/meeting-files` land while T7's run starts Nest. Say it is one dispatch, or run them in sequence.

## Minor

- T4's Done-when should exclude rules 11/12 (§4a) and add a check that `.gitignore` ignores `.e2e-pool/`.
- The five new `data-model.md` keys in §3a have no numbers. That is acceptable at implementation, but T6's hand-back should list them.
- T7 edits `apps/api` source but its Done-when has no typecheck. The commit hook's unit run catches units only.

## The planner's flagged choices

- **Pool cases in `e2e/smoke/pool.api.cases.md` under `SM-API-`:** accept. `SM` is a registered prefix (`suite-integrity.api.spec.ts:43`), `@smoke` means "e2e/smoke/**", and the pool is suite infrastructure. The `integration` project has its own open problem (`BL-064`).
- **Probe results in `research/probes.md`:** accept. It is append-only, numbered P11–P13, sits next to P9/P10 (which the design stage appended the same way), and T2's results may send the work back to the design stage, which reads that file.
- **T12 before the code review:** accept, provided FEAT-G4 is placed explicitly after it (finding above). T12's outcome edits `warm-up.ts`, `global-setup.ts` and rule 11, and those must be reviewed and covered by the one `pnpm verify`.
- **T13 is ordinary documentation this change must carry, not a pipeline-tuning change.**
  - `pipeline-tuning` covers stages, gates and roles changed from measured evidence (`SKILL.md:3,17-22`).
  - T13 changes no stage, gate, role or tool list. It re-points data claims this change makes false, the same class as re-pointing a citer of a retired fact.
  - A real pipeline change would also need a `CH-` entry (`pipeline-implementer.md:64-68`), which the plan rightly does not plan.
  - Two practical points remain. `pipeline-implementer`'s definition binds it to edits the owner approved, and no other role owns `.claude/**`. So the lead should get the owner's one-line go-ahead at this hand-back rather than leave it open. The plan must not make acceptance depend on that answer: if it is refused, the briefs for T8/T9/T11, FEAT-G4 and FEAT-S6 must explicitly override the stale lines.

## Verdict

Accept after blockers. The plan follows the accepted design, covers every part of its shape, the fact moves and controls C1–C9, and adds no security risk. But T13's order, scope and Done-when, the unassigned seed-spec migration, and T5's over-broad red reason make parts of it impossible to complete as written. Blocker 1 is `shape` only in that it changes the plan's dependency graph: a fresh planner dispatch fixes it without going back to the design.
