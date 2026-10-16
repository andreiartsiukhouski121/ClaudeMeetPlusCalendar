<!-- agent: plan-reviewer; session: b988267e-c081-447a-abcb-7f7b884c5b13; captured: 2026-10-16T10:51:35.018Z -->

VERDICT
Change: meetings-clean-architecture
Gate: FEAT-G3
Pass: re-run
Verdict: accept-after-blockers
Findings:
- blocker | correction | dod-passes-when-broken | FACT-3733 / T2b / §4a fixture has no row for domain/→src/shared/domain/ (allowed) or application/→src/shared/domain/ (forbidden), and src/shared/domain/ is empty, so that resolver exception is never exercised
- blocker | correction | doc-drift | FACT-3745 says FACT-0066/0068 retire with successors in ADR-0035, but §3a row K/L gives them new architecture.md successors, so T7 makes FACT-3745 false as soon as it lands
- blocker | correction | stale-fact | FACT-3746 (successor of FACT-3715) and §0 say ADR-0018/ADR-0027 govern only unmigrated modules, but the 404-over-403 rule and the Prisma store also govern meetings and meeting-files after this change
- nit | - | other | FACT-3734 (no kernel token or Nest module), FACT-3738 (every entity composes its own prefixed id) and FACT-3744 (ADR-0034's rejections incl. FACT-3712/3722 extended to all modules) go beyond the owner's 2026-10-16 list
- nit | - | stale-fact | FACT-3740 ("the rest of its layout is unchanged") and FACT-3733 ("its permanent fixture gains") lean on the retired FACT-3700/3702 text, so the pilot's specific layout and the walk self-check / every-form fixture lose their live statement
- nit | - | stale-fact | §0 "a shared issueId cannot reach it from domain/" is false under FACT-3732, which lets domain/ import src/shared/domain/; T9's BL-043 rewording should update its conflict text too
- nit | - | doc-drift | apps/api/CLAUDE.md:31 already defines src/common/ as "code shared by two or more features"; T7's src/shared/ map row must say how the two differ
- nit | - | other | §5 has "or T7 waits" but no fallback if the owner does not accept before T10 (the pilot's split T6/T7 shape with a declared window)
- nit | - | stale-fact | FACT-3727 says "directly under apps/api/src"; boundedFiles walks apps/api/src/*/domain and apps/api/src/*/application
- nit | - | other | plan is 180 lines against a 100-150 target
END VERDICT

**What the four checks found.**
1. **Retirements.** Each of the eight ADR-0034 keys has one live successor: 3699→3729, 3700→3740, 3701→3732, 3702→3733, 3709→3739, 3715→3746, 3718→3734, 3719→3738. Rows A–L are new keys. No retired key is a successor anywhere. I grepped `retired by FACT-` across `docs/`: the only rows pointing at keys being retired are FACT-0026 and FACT-0059 (architecture.md:248-249), and §3a already re-points them.
   - **Re-pointing list.** I grepped every retired key in `.md` files under the four directories AR-API-14 scans (docs, e2e, .claude, scripts), leaving out the files that define the keys and `docs/plans` and `docs/profiling`. The plan's list is complete: SKILL.md:21,51,62 (T8); architecture.api.cases.md:289,293,331,353 and meeting-files.unit.cases.md:199 (T1); CHANGELOG.md:38,75 and BACKLOG.md:45 (T9); ADR-0017:63, which is FACT-3348 citing 2047, and architecture.md:106, which is FACT-0071 (both T7).
   - **Code comments.** The `.ts` comment list is complete too (spec :980,1034,1106,1643,1676; the four moved files; meeting-file.ts:13,15; meetings-service.access.ts:9). AR-API-14 does not check `.ts` files, so this is hygiene only.
   - **Same-file citations.** Facts that stay in ADR-0034 and cite retired keys (FACT-3721→3719, FACT-3724→3718) are allowed by the `file === row.file` rule (spec:883).
2. **Roles.** Every role fits its tools and ownership. tester-api owns `*.api.spec.ts`. tester-unit owns the moved spec and has Bash for `git mv`. implementer-api has Bash and Edit (implementer-api.md:4); the pilot's T7 already gave it the status change and ADR register edits. pipeline-implementer does T8. tester-acceptance owns the ledger.
3. **Task order.** No task needs a later task's artifact. The red stretches (T2 until T3/T3a, the walk-reach step until T3a, AR-API-14 from T7 until T8) are stated and all close before T10.
4. **T7's dependency on the owner accepting ADR-0035.** My reading is that it is needed for the eight retirements and the status change, but not for the rest of T7.
   - **Why it is needed.** `docs/adr/README.md:18` defines `proposed` as "written, not yet agreed", and FACT-3745 itself says "When this record is accepted, ten facts retire".
   - **The check would not catch it.** `violationsRetirement` (spec:949) only asks that a successor be stated somewhere. Retiring into a proposed record would pass mechanically, so this rule is held by review, not by the check.
   - **The rest of T7.** Rows A–L and the rewordings have successors in the living corpus, and the code itself makes them true. The same goes for the falsity of FACT-3699/3701/3718 once T3a lands. Holding them back would reopen the stale window `BL-049` recorded.
   - **Effect.** As planned, the change cannot be accepted (T10) until the owner accepts ADR-0035. That is coherent, but there is no fallback. The pilot's precedent is to split corpus edits that are "true regardless of acceptance" (pilot T6) from those made "on acceptance" (pilot T7). This is open for the owner, not resolved.
5. **Flags.** On the designer's flag (b): the owner's "exactly … nothing else" does settle the literal allow-list, so the ADR follows it. The other flags are in the blockers and nits.

**Blocker 1 (correction): the shared-domain fixture rows.** The owner asked for fixture forms for the new allowed and forbidden paths. FACT-3733 and T2b add three (+1 allowed, +2 forbidden) but leave out the other new admitted path, domain/→`src/shared/domain/`, and its literal counterpart, application/→`src/shared/domain/`. The plan's own spike probed the second as objected. Nothing lives in `src/shared/domain/`, so the walk cannot test that branch either. A resolver that drops the domain prefix, or admits it from application/ too, would stay green. ADR-0035's own rationale names this as the vacuous-pass risk. **Fix:** add both rows to FACT-3733 and T2b. The counts in §4a and T2b become 13→16 forbidden and 5→7 allowed. Re-lock the ADR; it is still an untracked file.

**Blocker 2 (correction): FACT-3745 against rows K/L.** This is the planner's flag 3. ADR-0035's consequence and plan §3a name different successors for FACT-0066 and FACT-0068, and whichever is applied makes the other false. **Fix:** settle it before T7, either way:
- (a) reword FACT-3745 to "eight facts, from ADR-0034" and drop the architecture.md clause, leaving K/L as planned (the layer table stays in its own document); or
- (b) point the two register rows at FACT-3730 and FACT-3734 and keep K/L as new rows.

The owner's answer picks one; until then T7 cannot start.

**Blocker 3 (correction): FACT-3746.** ADR-0018 (not-found-over-forbidden) is the rule GetMeeting and meeting-files keep (§2a). ADR-0027 (the Postgres/Prisma store) governs every Prisma adapter. Neither is a layout record, so "govern the modules not yet migrated" is false the day FACT-3746 replaces FACT-3715. **Fix:** reword it to say ADR-0006 governs the modules not yet migrated, while ADR-0018 and ADR-0027 stay accepted and govern every module, apart from the single facts that ADR-0034 and this change retire. Re-lock, and make the same correction to §0's "ADR-0006 and ADR-0027 stay accepted for users and auth".

**Strengths.**
- §1 row 4 tested the walk reach and the two prefixes with a throwaway copy of the code and makes it permanent through T2b, rather than asserting it.
- §3a's "same-commit" list matches the grep exactly.
- §4's note under the table states every red stretch and what closes it.
- T10's control experiment targets the rejected FACT-3743 path.
- Section 0 cites real IDs (FT-008, CH-034, BL-043, BL-050…053, ADR-0006/0017/0018/0027/0031/0034/0035).
- There is no new entry point, so invariants 16–19 are untouched.

**Minor.**
- T8 could run before T7, because the skill can cite ADR-0035 keys now. That would shorten the time AR-API-14 is red.
- design.md §1–7 still describes a `UuidSource` port and adapter inside meetings, and §8 says "three items open". The "Style ADR" section supersedes both; the file is history, so this is a note only.
- ADR-0035's title says "Every apps/api module", while FACT-3729 limits it to migrated modules.

**Verdict: accept after blockers.** The delta follows the owner's decisions and its retirement mechanics hold. The three blockers are wrong or missing statements in the proposed ADR and the plan, not changes to the plan's shape.

Files:
- C:\GIT\PurpleSchool\docs\plans\meetings-clean-architecture\meetings-clean-architecture.plan.md
- C:\GIT\PurpleSchool\docs\adr\ADR-0035-api-ports-and-adapters-style.md
- C:\GIT\PurpleSchool\docs\adr\ADR-0034-meeting-files-ports-and-adapters.md
- C:\GIT\PurpleSchool\docs\plans\meetings-clean-architecture\design.md
- C:\GIT\PurpleSchool\e2e\architecture\architecture.api.spec.ts
- C:\GIT\PurpleSchool\docs\adr\README.md
- C:\GIT\PurpleSchool\apps\api\CLAUDE.md
- C:\GIT\PurpleSchool\docs\BACKLOG.md
