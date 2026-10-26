<!-- agent: plan-reviewer; session: b988267e-c081-447a-abcb-7f7b884c5b13; captured: 2026-10-23T16:19:30.574Z -->

VERDICT
Change: e2e-test-architecture
Gate: FEAT-G3
Pass: re-run
Verdict: accept
Findings:
- nit | - | other | §4a's row "the four T5 pool cases that log in" disagrees with T5's Done-when and line 116, which name four cases in total including SM-API-02, so three are pool cases (or four, if "release check and leaked mark" counts as two). The count should be stated one way
- nit | - | doc-drift | §3a says each new "Patterns in use" row gets "one rationale sentence each". Design §4 says the decision "is not restated". Fine if the sentence sits in a `> **Rationale — not a fact.**` block, but the T6 brief should say so
END VERDICT

Plan re-reviewed: `C:\GIT\PurpleSchool\docs\plans\e2e-test-architecture\e2e-test-architecture.plan.md`. I checked it against the first-pass verdict at `C:\GIT\PurpleSchool\docs\profiling\verdicts\2026-10-23-e2e-test-architecture-feat-g3-a263bf99.md`. I did not re-review the parts that did not change.

## The four first-pass blockers: all resolved

1. **T13: scope, order and condition (was shape).** Resolved, and it matches the lead's ruling.
   - T13 is a planned task, not an optional one. It depends on T1 and must be "done before T8" (row T13). T8 depends on "T7, T13 or §6 override".
   - Its scope now covers all five stale lines plus `CLAUDE.md`'s naming of `e2e/api/`. Each line is written as a pointer to its successor key (`FACT-3756`/`3757`, `FACT-3783`/`3784`, `FACT-3799`). I confirmed those lines exist at HEAD: `tester-functional.md:43-44`, `tester-api.md:30` and `regression-verify/SKILL.md:141-142`.
   - "Runs no app" overrides `pipeline-implementer`'s `pnpm verify` step (`ADR-0012`).
   - The owner go-ahead is in section 0, open questions, and the lead requests it.
   - §6 is the fallback: if the go-ahead has not arrived, the briefs for T8–T11, FEAT-G4 and FEAT-S6 name those lines as superseded. T15 does not wait for T13, so acceptance no longer depends on the owner's answer.
2. **T13's Done-when could not be met (correction).** Resolved.
   - The grep is now scoped to the four edited files and uses `-e organizer -e eraser`, so there is no pipe and the row has five cells.
   - Over those four files, the only current hit is `tester-functional.md:44`, which is inside T13's scope. The Done-when can be met.
3. **Seed spec never brought into rule 12's shape (correction).** Resolved.
   - T11 now names `seed.api.spec.ts`'s bodies and says "the four `regression/*/*.api.spec.ts`".
   - Coverage of the 12 files in rule 12's scope is complete: T8 has auth-login and accessibility; T9 has home-dashboard and meeting-files functional; T10 has both security specs; T11 has the four regression api specs, health and seed.
   - T5 creates `pool.api.spec.ts` in that shape from the start.
4. **T5's red reason too broad (correction).** Resolved.
   - T5's Done-when now names only the cases that need a login: `SM-API-02`, release check and leaked mark, takeover purge, `trackAllOf` tolerance. It also adds "nothing else newly red".
   - Lines 117–118 list the cases that cannot be red first and name the control that proves each one: C1 for the claim winner, all-or-nothing and testId cases; C5/C9 for the takeover guard on a dead pid and `run()` never throws; C2 for `AL-FN-13`'s guard.

## First-pass nits: all addressed

- **withCleanup:** T4 keeps it in `e2e/api/cleanup.api.ts` with re-exports from the old paths until T11b. T11b deletes it and lists that file.
- **Baseline:** T11b's count is now against T2(b)'s per-project `--list` baseline.
- **Pool cases holding a user** run on a scratch pool directory (T1, T5, §6).
- **FEAT-G4 placement and the §2.6 reading** are written down (lines 110–111).
- **architecture.md:**
  - The design (§4, lines 400–410) now has the two "Patterns in use" rows. They sit next to `FACT-0031`/`0032` at `docs/architecture.md:146-147`.
  - The plan carries them in section 0, in a §3a row (two new keys sourced `ADR-0036`/`0037`), and in T6's file list.
- **warm-up.ts:14:** arm C re-points it, and T12's Done-when "no `AL-FN-02` left in `e2e/`" covers every arm.
- **T4's Done-when** excludes rules 11/12 and checks `git check-ignore .e2e-pool/`.
- **T6/T7** run as one sequential dispatch.
- **T7** now has a typecheck in its Done-when.
- **T6's hand-back** lists the new keys.

## New blockers

None. The changes add no new entry point. The tasks that can run side by side, T13 with T2–T7, share no files: T13 touches `CLAUDE.md` and `.claude/**`, and no other task does.

## Can implementation start (FEAT-S9 onward)?

Yes. T1 (test-designer, writing the scenarios) and T2 (tester-api, probes and the baseline count) can start now and run side by side. The lead should request the owner's one-line go-ahead for T13 now, so it can finish before T8. If the go-ahead has not come by T8, the §6 override goes into the briefs. The two nits are worth fixing, but neither blocks the start.

Files referenced:
- C:\GIT\PurpleSchool\docs\plans\e2e-test-architecture\e2e-test-architecture.plan.md
- C:\GIT\PurpleSchool\docs\plans\e2e-test-architecture\design.md
- C:\GIT\PurpleSchool\docs\architecture.md
- C:\GIT\PurpleSchool\.claude\agents\tester-functional.md
- C:\GIT\PurpleSchool\.claude\agents\tester-api.md
- C:\GIT\PurpleSchool\.claude\skills\regression-verify\SKILL.md
