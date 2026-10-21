<!-- agent: plan-reviewer; session: b988267e-c081-447a-abcb-7f7b884c5b13; captured: 2026-10-16T15:47:23.189Z -->

VERDICT
Change: delete-meetings-and-files
Gate: FEAT-G3
Pass: first
Verdict: accept-after-blockers
Findings:
- blocker | correction | task-order | T4 (MF cascade case, MF cleanup) and T5 (HD-API-23) need DELETE /meetings/:id from T3, but depend only on T2 and are marked parallel with T3
- blocker | correction | assertion-scope | HD-API-23 asserts absolute totals (0→2→1→0) in a mutating case, which breaks FACT-3131 (kept in force by FACT-3580), the FACT-1076 carve-out and the e2e/README rule the plan cites itself
- blocker | correction | stale-fact | the new user `eraser` makes FACT-1038 ("All four users share one password") false and strains FACT-1040 ("two separate mutation sandboxes"); §3a retires neither
- nit | - | doc-drift | Q2's default keeps FACT-3642's "a feature with no delete" in force while T6 removes the same words from docs/security.md:92, so the keyed copy and the prose copy end up disagreeing on purpose; this is in tension with FACT-3487
- nit | - | other | T3/T4/T5 "may run in parallel" in one worktree, yet each DoD needs a Playwright run; a second `next dev` gives zero tests (CLAUDE.md, ADR-0012)
- nit | - | dod-passes-when-broken | the cleanup rule "a cleanup 404 is not an error" also accepts Express's `Cannot DELETE` 404, so a missing route would leak meetings without anyone noticing
- nit | - | contract-gap | T1 has no case for an absent meeting id on the file-delete route (only a foreign one), and no case for a file id that never existed
- nit | - | stale-fact | the "four users" text in seed.api.cases.md:30-34, users.seed.ts:23, e2e/fixtures/seed.ts:25 and config/seed-guard.ts:2 goes stale, and no task's files cover it
- nit | - | other | §3a successor of FACT-1068 reads "users … also die by DELETE"; no user route deletes
END VERDICT

## Strengths

- **§0 orientation is real.** It cites BL-007/060/061, FT-003/008/009 (all present in BACKLOG/CHANGELOG), ADR-0018 FACT-3392 (ADR-0018:76), ADR-0027 FACT-3584 (:79) and ADR-0035. It also names the FACT-3642 contradiction instead of hiding it.
- **The contract matches the code.** §2/§2a match the tree:
  - `MeetingAccess.ownsMeeting` (meeting-files/application/meeting-access.ts:3) and the existing `MeetingNotFound`/`MeetingFileNotFound` kinds (meeting-file.errors.ts:10-12), so no new filter row is needed.
  - The evaluation order copies `GetMeetingFileContent`.
  - `deleteOwned` and `deleteByIdForMeeting` sit next to the existing ports. The tokens file needs no change, because the use cases are `useFactory` providers keyed by class (meetings.module.ts:28-43).
  - FACT-2016 and FACT-2083 are the right error rows (api-contract.md:55-56).
- **The spike settles the risky points with running code.** It shows the cascade (`confdeltype = c`) and that `@Delete` without `@HttpCode` is 200. That second result is why control (c) exists and why §0 compares it to invariant 1.
- **Every requirement point has a task.** Controls (a), (b) and (d) together cover ownership, the cascade and the file scope. §5's note that an orphaned file cannot be seen over HTTP is honest, and it explains why (b) is paired with the empty-meeting 204 case.
- **Security wiring is complete** (invariant 16). It has two `PROTECTED_ROUTES` rows with literal parameters, plus the `callRoute` gap at security.api.spec.ts:74-82. That function really is typed `'GET' | 'POST'`. The routes are class-guarded, with no DTO and `ownerId` taken only from `@CurrentUser()` (invariant 5).
- **4a is right.** SM-API-02, AR-API-05 and AR-API-06 each name a task that closes them.
- **The next free IDs are correct:** MD-API-09, MF-API-20, HD-API-23 and SEC-API-12.

## Blockers

1. **§4, "Depends on" for T4 and T5.** Label `correction`, category task-order / unreachable-dod.
   - **T4:** its DoD is "T2's MF- cases green". That includes the cascade case, which deletes a meeting through `DELETE /meetings/:id`, and the MF cleanups, which run through the same route. That route is built by T3.
   - **T5:** its DoD is "HD-API-23 green", and that case creates and deletes meetings through T3's route.
   - Both depend only on T2 and are declared parallel with T3. Run in that order, both DoDs are unreachable. This is the same class of failure as the first iteration's login cases.
   - **Fix:** add T3 to the Depends column of T4 and T5. Alternatively, move "cascade case green" and "HD-API-23 green" into a later DoD (T6 or T7) that depends on T3, T4 and T5.

2. **§3, the `eraser` totals case (HD-API-23).** Label `correction`, category assertion-scope.
   - The case asserts absolute `total` values (0 → 2 → 1 → 0) in a `@mutating` case.
   - That breaks FACT-3131 ("Mutating cases use relative counters", ADR-0007:37), which ADR-0027 FACT-3580 keeps in force. It also breaks FACT-1076, which only allows exact counts over a meeting the case made itself and says "FACT-3131 still governs anything counted across an owner's whole collection". And it breaks the e2e/README.md:237 rule that the plan itself cites in §6 Q1.
   - It is also fragile: a retry after a failed cleanup starts at a total other than 0.
   - **Fix:** read a baseline `total` at the start of the case, then assert baseline+2, baseline+1 and baseline. With a user that only this case touches, that is still exact, and it complies with the rule. The other option is to state the exception as a new keyed fact. The relative form is cheaper.

3. **§3a omits retirements forced by the new seed user.** Label `correction`, category stale-fact.
   - FACT-1038 (data-model.md:186, "All four users share one password") becomes false the moment `eraser` is seeded.
   - FACT-1040 (data-model.md:188, "two separate mutation sandboxes") stops describing the seed: `eraser` is a third owner that a case mutates.
   - Under ADR-0022 FACT-3487 both are retired and replaced by successors, not left in place. Nothing mechanical will catch it: AR-API-17 hashes text, not truth.
   - **Fix:** add both to §3a with their successors, and put them in T6's scope.

## Findings

- **Q2 default (keep FACT-3642, file a BL row): acceptable as a deferral, but inconsistent as written.**
  - The decision itself (refuse the eleventh file) stands. The ten citations in code and cases cite it for the cap and for count-then-insert, and both stay true, so not retiring now is cheap and low-risk.
  - But T6 rewords docs/security.md:92 to drop "with no delete", while the keyed FACT-3642 (ADR-0029:109) keeps saying it. The prose and the fact would then disagree on purpose. That is the FX-023 pattern, and it is in tension with FACT-3487.
  - **Fix:** either leave security.md:92 alone until the BL row is done, so both copies change together, or have the BL row name both locations and FACT-3487 explicitly.
- **Q1 default (dedicated seed user): sound.**
  - `planner` is shared under `fullyParallel`, so no count over its whole collection is stable. Dropping the totals case would leave a requirement uncovered.
  - It is sound only once Blockers 2 and 3 are fixed, and once §5's `SEED_USERS` risk is extended to the items in the next finding.
- **"Four users" text that goes stale and is in no task's Files column:**
  - seed.api.cases.md:30-34 (the SM-API-02 case text names the four users);
  - users.seed.ts:23 and e2e/fixtures/seed.ts:25 (the comments "Four users rather than two");
  - apps/api/src/config/seed-guard.ts:2 ("four accounts");
  - auth-login.api.cases.md:138 and auth-login.unit.cases.md:37 ("all four users").
  - **Fix:** add these to T1, T2 or T5.
- **Parallel implementers in one worktree.** "T3, T4, T5 … may run in parallel" holds for files, but each DoD needs a Playwright run. Two in one worktree give zero tests (CLAUDE.md, ADR-0012). State a worktree per task or run them sequentially.
- **The cleanup rule is too tolerant.** It accepts any 404. It should accept only the FACT-2016 / FACT-2083 body. Otherwise Express's `Cannot DELETE` 404 (a route that is missing or unwired) passes cleanup silently and the meetings it should have removed are left behind.
- **T1 file-delete coverage is missing two cases:**
  - an absent meeting id on `DELETE /meetings/:id/files/:fileId`, which should be FACT-2016 and byte-identical to the foreign one, as the requirement's "missing id and foreign id get the same 404" says;
  - a file id that never existed, which should be FACT-2083. Today only the second delete covers that, a case that tells nothing apart if the first delete never happened.

## Minor

- §3a's successor of FACT-1068: "users, meetings and files also die by DELETE" should keep users' lifetime unchanged. No route deletes a user.
- T2's Files column gives spec names without their `e2e/regression/<feature>/` paths.
- SEC-API-12 should say it uses a meeting freshly created by `planner` with cleanup (§3 implies this). Control (a) wipes whatever it targets.
- A 401 with an invalid token on the new routes is covered only by SEC-API-01's empty `Bearer` variant. That is enough because the guard is shared, but the case text could say so.

## Verdict

**Accept after blockers.** The shape (cascade through the FK, a single owner-scoped `deleteMany`, a 204 through `@HttpCode`, no new ADR) is right and conforms to ADR-0018, ADR-0027 and ADR-0035. All three blockers are narrow corrections: two missing dependencies, a totals assertion that must be relative, and two seed facts the plan must retire.

Files reviewed:
- C:\GIT\PurpleSchool\docs\plans\delete-meetings-and-files\delete-meetings-and-files.plan.md
- C:\GIT\PurpleSchool\docs\plans\delete-meetings-and-files\design.md
- C:\GIT\PurpleSchool\docs\plans\delete-meetings-and-files\research\README.md
- C:\GIT\PurpleSchool\docs\data-model.md (lines 158-188)
- C:\GIT\PurpleSchool\docs\adr\ADR-0007-in-memory-store.md (line 37, FACT-3131)
- C:\GIT\PurpleSchool\docs\adr\ADR-0029-file-bytes-in-the-database.md (line 109)
- C:\GIT\PurpleSchool\e2e\README.md (lines 224-238)
- C:\GIT\PurpleSchool\e2e\smoke\seed.api.cases.md
