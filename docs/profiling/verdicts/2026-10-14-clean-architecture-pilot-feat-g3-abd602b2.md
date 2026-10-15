<!-- agent: plan-reviewer; session: f097de28-2cfd-4a00-a282-3957c798d492; captured: 2026-10-14T13:32:30.510Z (restored from the transcript, FX-050) -->

VERDICT
Change: clean-architecture-pilot
Gate: FEAT-G3
Pass: first
Verdict: accept-after-blockers
Findings:
- blocker | correction | task-order | Dependency column assumes the owner accepts first: T5 waits on "owner" and T8 on T7, so on the lead's path (ADR proposed) T5 and T8–T15 cannot start; T7 and its second verify have no row of their own
- blocker | correction | doc-drift | §5 says the acceptance window covers three facts, but five are false of the code after T5 (FACT-3386, FACT-3572 too); T14 records neither the window nor the deferred T7, and no BL- row tracks T7
- blocker | correction | dod-passes-when-broken | T5 "test:meeting-files non-zero count" is met by apps/web MF-UT-04…07 alone; no new MF-UT-11+ case is ever seen failing for its own reason
- blocker | correction | unreachable-dod | T4: AR-API-18 is one case, so if the self-check fails first the fixture assertions never run and "fixture already green" cannot be observed; risk 3's separate assertion is not in the DoD
- blocker | correction | other | T8 has tester-api edit a domain/ product file; its definition forbids that, and the control experiment belongs to tester-acceptance
- blocker | correction | dod-passes-when-broken | T8 controls only path-independent forms; the path-dependent relative and spec-only branches are untested on real (Windows) paths; "git status clean" cannot be met with nothing committed
- nit | - | other | 4a misses suite-integrity rule 5, which is red between T2 (AR-API-18 in the cases doc) and T4 (in the spec)
- nit | - | other | T0 may leave its ruling on ADR-0007:56 "in a hand-back"; re-pointing an accepted record's successor changes recorded history and should land in ADR-0034 for the owner
- nit | - | stale-fact | T6/T11/T14 outputs carry no rule against citing the five keys T7 retires, so T7 would turn AR-API-14 red in files implementer-api does not own
- nit | - | tool-gap | T1's DoD needs `git diff`, which test-designer (Write only) cannot run; name lead as the checker
END VERDICT

## Strengths

- **Spike, §1.** It ran the repository's own checkers instead of guessing. It found two real corpus failures the design missed: ADR-0034 citing keys it retires (AR-API-14), and the ADR-0007:56 successor chain (AR-API-16). It handed both back as T0 rather than quietly fixing them.
- **Orientation, §0.** It cites BL-044, BL-040, BL-043, BL-046, BL-047, FT-007, CH-033 and the ADR-0006/0010/0014/0018/0021/0027 records, and all of them exist. It calls BL-043's new conflict with the `domain/` boundary a conflict.
- **§3a** puts each key change on one task: rewordings (T0, T6) are kept apart from retirements (T7), and every retirement names its successor, including the new register in ADR-0018.
- **Faithful to the design.** No case expectation is edited, no route or `PROTECTED_ROUTES` change, and no lint rule. The AR-API-05/06 survival under `@UseFilters` was spiked.
- **Pre-commit window** ("nothing from T1 on is committed until T5 is green") is consistent with T3's intended red and with the lead's no-commit instruction.
- **Security.** No new entry point. The guard stays class-level (spike row 3), `PROTECTED_ROUTES` and `PROTECTED_PAGES` are unchanged (invariant 16), `apps/web` is untouched (invariants 17–19), and ownerId still comes from `@CurrentUser()` (invariant 5, design §7). Nothing to block.

## Blockers

1. **§4 dependency column vs the lead's path (task-order, correction).**
   - What is wrong: T5 "Depends on: owner, T3, T4" and T8 "Depends on: T7". §5 says T7 "detaches", but the table does not. Taken literally, nothing from T5 onward can start while ADR-0034 stays proposed.
   - What T1–T6 and T8–T15 actually need from T7: nothing. T13's verify does not read the five facts against code. `ADR_STATUSES` accepts `proposed` (`e2e/architecture/architecture.api.spec.ts:58`). AR-API-14 and AR-API-16 only go red if T7 runs before T0.
   - Fix:
     - T5 depends on T3 and T4.
     - T8 depends on T6.
     - Add a row after T15, owned by lead, depending on owner, T0 and T7: a second `pnpm verify`, then a ledger addendum by tester-acceptance.
     - Drop "T5-T7 land in one commit" for this path.

2. **The window is under-stated and goes unrecorded (doc-drift, correction).**
   - §5 says "those three" (FACT-3589/0026/0059). After T5 two more are also false of the code until T7:
     - FACT-3386 (ADR-0018:59, "the controller throws and the service returns `undefined`"): meeting-files now throws in a filter.
     - FACT-3572 (ADR-0027:48, "the services read and write"): the adapter does that now.
   - During the window the owner will see these mismatches:
     - T6's `apps/api/CLAUDE.md` Map and T11's skill teach the four-layer layout.
     - `docs/architecture.md:157` still lists the repository layer as **refused** (FACT-0059).
     - `implementer-api` is told to follow a record that is only proposed.
   - No check goes red. The gap is real but invisible.
   - Fix:
     - Name all five keys in §5.
     - Add to T14's DoD that the FT- entry states ADR-0034 is proposed, that T7 is pending, and lists the five keys still describing the old layout.
     - Have T14 file a BL- row for T7 plus the second verify, so it is not lost.
     - Have T11's skill state that the pattern governs `meeting-files` only, under a proposed ADR-0034.

3. **T5 DoD can pass while broken, and the new units are never shown red (dod-passes-when-broken, correction).**
   - `pnpm test:meeting-files` is `pnpm -r test -t "MF-UT-"` (unit cases doc :5). It runs apps/web's MF-UT-04…07 as well. "Non-zero count" is therefore met even if every apps/api spec ran zero tests, for example with a title that misses the filter. Rule 7 only checks that the ID appears in the file's text, not that it ran.
   - On your T3 question: a red from a module that does not exist is not "red for the reason it was written for". By §5a it is the broken-test kind. Accepting it is right here, because tests of a module that does not exist cannot fail any other way. The plan says so in §5 and does not claim the red as proof.
   - But the proof it puts in its place ("T5 passes them unedited") shows only that the new cases pass. That proves nothing for MF-UT-11+, which never had a green history. The six moved cases are fine: byte-identical bodies carry their history.
   - Fix — make the DoD say three things:
     - T3: the only failures are one module-resolution error per spec, naming exactly the planned specifiers, and no other apps/api test fails.
     - T5: the apps/api count equals 6 plus the number of new IDs T1 adds.
     - After T13, a control for each new MF-UT-11+ case: break the rule in `domain/`, see that case go red, revert. This is tester-acceptance's control experiment; tester-unit's own definition also asks for it.
   - Record the §5a deviation in §6 as deliberate.

4. **T4: the "fixture already green" DoD cannot be observed (unreachable-dod, correction).**
   - Design §2 and T2 make AR-API-18 one case holding the walk, the self-check and the fixture. If the self-check is asserted first, which is its natural place (FACT-3702, "opening with a self-check"), the run stops there. The fixture assertions never execute at T4, so "already green" cannot be seen.
   - Risk 3 ("assert the walk's file list and the fixture's verdicts separately") is in no DoD.
   - Fix — put this in T2's case text and T4's DoD: the fixture assertions run before the walk's self-check, or as separate `test.step`s, with the walk's file list asserted as a separate step. The T4 report should show the fixture step passed.

5. **T8 role (other, correction).**
   - Adding an import to a `domain/` file is editing product code. `tester-api.md:50` says "You never edit product code". The control experiment is tester-acceptance's (team-roles table; `tester-acceptance.md:35-42`).
   - Fix: move the real-file control to tester-acceptance after T13. T8 stays a plain run.

6. **T8 control coverage and an unreachable DoD (dod-passes-when-broken, correction).**
   - The permanent fixture already proves the extractor for all twelve forms. A real-file control has to prove what the fixture's made-up paths cannot: that the walk finds real files, and that the path-dependent allow-list branches work on real paths. Those branches are relative resolution "inside the same module's `domain/`" and "`vitest` only in `*.spec.ts`".
   - `Injectable` and `import('express')` are both path-independent, so a scanner that resolves Windows `\` paths wrongly could still pass both.
   - Fix — add three controls:
     - from a real `domain/` file: `import … from '../infrastructure/prisma-meeting-file.repository.js'`;
     - from a real `application/` file: `import … from '../meeting-files.module.js'`;
     - `import { it } from 'vitest'` in a real non-spec `domain/` file.
   - Also: "`git status` clean after" cannot be met while T1–T6 are uncommitted, and the lead is not committing. Replace it with "the control file's diff is empty after the revert".

## Findings

- **§4a** is missing suite-integrity rule 5 ("every ID from a `.cases.md` appears in the paired spec"). It is red from T2 until T4. Add a row, closed by T4.
- **T0** may record its ruling on ADR-0007:56 "in a hand-back". That makes a design decision after the design gate and stores it nowhere durable. Re-pointing the successor in an accepted record's register ("retired by FACT-3572" → FACT-3716) rewrites what ADR-0027 actually did. The ruling should land in ADR-0034, which is proposed and editable, so the owner sees it when accepting.
- **T6, T11 and T14** each need a line in the DoD: "cites none of FACT-3589/3572/3386/0026/0059". Otherwise T7 turns AR-API-14 red in `apps/api/CLAUDE.md`, the skill or the CHANGELOG, files implementer-api does not own. Also, `ledger.api.spec.ts:40` resolves ledger references under `.claude/skills`, so T11's skill cannot cite this change's FT- entry, which T14 only writes later.
- **T1** DoD "`git diff` touches no Expected line": test-designer holds only Write. Name lead as the checker.
- **Tool fit otherwise holds:**
  - test-designer: whole-file write, as T1 and T2 already say.
  - tester-unit: `pnpm scenarios:index` and `e2e/README.md:55`; it has Write, Edit and Bash, and `e2e/**` belongs to testers.
  - tester-security: comments in `e2e/security/**`, its own directory.
  - pipeline-implementer: the skill, with Write, Edit and Bash.

## Minor

- T8, T9 and T10 start the servers three times before T13 starts them again. That is legitimate for this stage, but T8's API run largely repeats T13.
- T7 has implementer-api flip ADR-0034's status and edit ADR registers, which are designer files under team-roles. It is defensible under implementer-api's own "Facts in the corpus" section; say so in T7.
- T14's 413-text row describes a possible defect (a case text with no matching source). If confirmed, it is an FX- entry, not a BL- row.

## Verdict

**Accept after blockers.** The plan's decisions are right and the spike is real work. All six blockers are corrections: dependency wiring for the lead's chosen path, the window and how it is recorded, and DoDs that either pass while broken or cannot be observed. None changes the shape.

Files: `C:\GIT\PurpleSchool\docs\plans\clean-architecture-pilot\clean-architecture-pilot.plan.md`, `C:\GIT\PurpleSchool\docs\adr\ADR-0034-meeting-files-ports-and-adapters.md`, `C:\GIT\PurpleSchool\docs\adr\ADR-0007-in-memory-store.md` (:56), `C:\GIT\PurpleSchool\docs\adr\ADR-0018-not-found-over-forbidden.md` (:59), `C:\GIT\PurpleSchool\docs\adr\ADR-0027-postgres-prisma-store.md` (:48, :94), `C:\GIT\PurpleSchool\docs\architecture.md` (:115, :157), `C:\GIT\PurpleSchool\e2e\regression\meeting-files\meeting-files.unit.cases.md` (:5, :16), `C:\GIT\PurpleSchool\.claude\agents\tester-api.md` (:50), `C:\GIT\PurpleSchool\.claude\agents\tester-acceptance.md` (:35-42), `C:\GIT\PurpleSchool\e2e\ledger\ledger.api.spec.ts` (:40).
