<!-- agent: code-reviewer; session: b988267e-c081-447a-abcb-7f7b884c5b13; captured: 2026-10-16T11:24:43.095Z -->

VERDICT
Change: meetings-clean-architecture
Gate: FEAT-G4
Pass: first
Verdict: accept-after-blockers
Findings:
- blocker | correction | stale-fact | ADR-0018 FACT-3381 still sources the deleted meetings.service.ts; plan §3a requires it re-pointed to the repository adapter at T7a, and that was not done
- blocker | correction | stale-fact | The diff deleted meeting.types.ts and meetings.service.ts, but data-model.md:83/86 (block source, FACT-1012), :132 (FACT-1067) and ADR-0017 FACT-3345 still name them as sources
- blocker | correction | other | ADR-0034 register row FACT-3704 paraphrases "FACT 2112 (since retired)" where ADR-0022 requires the statement exactly as it stood; the root cause is a real AR-API-14 defect: its register-row skip only matches list form, and registers are tables
- blocker | correction | stale-fact | list-meetings-query.dto.ts:17-19, a line this diff rewrote, still cites retired HD-UT-06 and claims a direct-call test that does not exist
- nit | - | doc-drift | FACT-0074 says ADR-0035 is "(proposed)", so it goes false at T7b, and T7b does not list it; FACT-0073 leaves out "(proposed)", against the T7a wording but more durable
- nit | - | other | FACT-0026/0059 re-points replace "Recorded in" instead of keeping the original recorder beside the new one, as the FACT-3714 precedent did
- nit | - | stale-fact | FACT-2041's source is now a deleted file; BL-061 records only the milliseconds problem
- nit | - | doc-drift | The clean-architecture skill's dependency paragraph (lines 21-26) leaves out the shared-kernel prefixes that its own table row 38, FACT-3732 and the code admit
- nit | - | stale-fact | ADR-0030 FACT-3659 (present tense) lists meetings.service.ts and meeting.types.ts as the code touching participants; neither retired nor named in the ledger
- nit | - | assertion-scope | The rethrow branch in GetMeetingAccess is exercised by no case (by design, FACT-3739); FT-009 should say so
- nit | - | task-order | FT-009 is cited in 32 places but is not in the ledger until T10, so ledger.api.spec's dangling-reference check fails on the T7a tree
- nit | - | other | Imports of the moved shared files sit among the sibling imports in meeting-files.module.ts and upload-meeting-file.ts
END VERDICT

Read in several passes, myself: the plan; every file under `apps/api/src/meetings/**` and `apps/api/src/shared/**`; the changed `meeting-files` files (the module, the error filter, `upload-meeting-file.ts`, `get-meeting.access.ts`, the tokens, `meeting-access.ts`); `meeting.spec.ts` and the moved uuid spec; the `AR-API-14`, `AR-API-18` and `AR-API-19` sections of `architecture.api.spec.ts` and its cases file; both unit cases files; `scripts/facts-parse.mjs`; the changed sections and registers of the three corpus documents; `ADR-0017`, `ADR-0018`, `ADR-0022`, `ADR-0034` and `ADR-0035`; the lock entries for every key this change touches; the skill; `implementer-api.md`; `apps/api/CLAUDE.md`; and the backlog and changelog rows. Nothing was run.

## Code

**Strengths**
- `apps/api/src/meetings/application/get-meeting.ts:14-25` and `infrastructure/prisma-meeting.repository.ts:39-43`: one lookup with one `undefined` path, and one thrown error, which `meeting-files` reuses through `get-meeting.access.ts:17-29`. Own/foreign/absent gives true/false/false, and only `MeetingNotFoundError` is caught. `ADR-0018` is kept by construction.
- Invariant 4 at `prisma-meeting.repository.ts:31-33` and `list-meetings.ts:19-24`. Invariant 7 at `:23`, in the adapter only. Invariant 5 at `meetings.controller.ts:37,48,63`, with `CreateMeetingInput` (`create-meeting.ts:9-14`) carrying no `ownerId` and fields copied one by one. Invariant 8 at `meetings.error-filter.ts:24`. Invariant 2 is kept in both DTOs. The guard stays on the class (`meetings.controller.ts:23`).
- `domain/` and `application/` read no clock and no randomness. `Meeting.create` composes `mtg-` from the uuid it is given (`meeting.ts:48-57`), and `new Date(value)` is the allowed form. `node:crypto` appears only in `shared/infrastructure/crypto-uuid-source.ts`. The literal `'Meeting not found'` exists once (`meetings.error-filter.ts:12`).
- The shared kernel matches `FACT-3734`: interfaces only, no token, no Nest module, and each module binds the adapter under its own `Symbol` (`meetings.module.ts:27`, `meeting-files.module.ts:38`).
- `meeting.spec.ts` matches `HD-UT-17`…`21` step for step, including the `null` inputs and the non-canonical `restore` row. The `AR-API-18` fixture (`architecture.api.spec.ts:1343-1412`) and the walk-reach steps (`:1678-1683`, `:1716-1721`) match the cases file, with counts 16/7 and 8/4.
- No plan-folder citations and no other-file line numbers in code comments.

**Blocker 4 — `apps/api/src/meetings/dto/list-meetings-query.dto.ts:17-19`** (correction). This diff reworded the line to say `ListMeetings` but kept "(`HD-UT-06`)". That case was retired with the in-memory store, and no case calls `ListMeetings` directly. The comment points at a case that does not exist. Fix: drop the "direct calls" clause and the ID, or cite `HD-API-10`. Owner: implementer-api.

**Findings**
- `GetMeetingAccess`: the `MF-API-*` cases cover own, foreign and absent over HTTP. The rethrow branch has no case, and cannot have one without a fake (`FACT-3739`). Fine, but the FT-009 entry should say so (tester-acceptance).
- Import order in `meeting-files.module.ts:8,12,13,16` and `upload-meeting-file.ts:5,8`: the `../shared/...` imports sit among the `./...` ones. Cosmetic (implementer-api).

## Corpus

**Retirements, successors and the lock.** Each register row has exactly one live successor, and none of the successors is itself retired:
- 0026/0060 → 0072; 0059/0061 → 0073; 0062 → 0074; 0066 → 0075; 0067 → 0077; 0068 → 0076
- 3720 → 0078; 2037 → 2125; 2046 → 2126; 2047/3350 → 2127; 2112/3704 → 2124; 1046 → 1083

The lock has the right status, `supersededBy` and `recordedIn` for every one. Outside registers, the lock and history folders, nothing cites a retired key. The successors are true of the code, apart from the "(proposed)" note below. The `FACT-0026`/`FACT-0059` re-points keep their statements verbatim. Every source-only fix §3a lists was made except `FACT-3381`. The eight `ADR-0034` keys staying cited is the declared T7b window.

**Blocker 1 — `docs/adr/ADR-0018-not-found-over-forbidden.md:49-51`** (correction). `FACT-3381` still names `apps/api/src/meetings/meetings.service.ts`. Plan §3a lists it as a T7a source fix ("→ repository adapter"), and the file no longer exists. The statement itself still holds. Fix: change the source to `apps/api/src/meetings/infrastructure/prisma-meeting.repository.ts`, then `pnpm fact:lock`. Owner: implementer-api.

**Blocker 2 — sources naming files this diff deleted** (correction). The plan's list missed these, but this change created the problem, so it is fixed here (`FACT-3501`: a wording fix plus a re-lock). The same document was already edited for `FACT-3348`, so "accepted ADRs are immutable" does not excuse it.
- `docs/data-model.md:83`: the Response-wrappers block source names `meetings.types.ts`.
- `:85-86`: `FACT-1012`'s source names the same file. `MeetingsPageDto` now lives in `meetings.mapper.ts`.
- `:130-132`: `FACT-1067` names `meetings.service.ts`. Drop that path; `prisma.service.ts` and `users.service.ts` keep the statement true.
- `ADR-0017:54-56`: `FACT-3345` names `meetings.types.ts`. Change it to `apps/api/src/meetings/domain/meeting.ts`.

Then `pnpm fact:lock`. Owner: implementer-api.

**Blocker 3 — `docs/adr/ADR-0034-…md:186`, the `FACT-3704` row** (correction; the lead may escalate it because it touches a meta-test). Known item 2 is **not acceptable**. `ADR-0022` fixes the register cell as "the statement exactly as it last stood", and `FACT-3490` makes the register the only place the statement survives. The paraphrase silently rewrites what a key held outside the repository resolves to.

The implementer's diagnosis is right, but the cause is a defect in `AR-API-14`, not in the rule. `architecture.api.spec.ts:861-863` says "A register row is the record of a retired key, not a reference to it", but it tests `FACT_DEFINITION_LIST`, which matches only list items (`scripts/facts-parse.mjs:23`). Every register is a table, so the skip never fires. A row that names a key retired in another document's register then fails.

Fix:
1. tester-api makes the skip match a table row whose first cell is a key in a retired register (as `parseRetiredRegister` does), and adds a fixture line for it.
2. test-designer adds one line to the `AR-API-14` cases text saying register rows are exempt.
3. implementer-api restores `FACT-2112` verbatim in the row, then `pnpm fact:lock`.
4. tester-acceptance logs an `FX-`, found by code review at FEAT-G4.

Fallback if the lead keeps the meta-test out of this change: keep the paraphrase, name it as a deliberate exception in FT-009, and file the `AR-API-14` defect as its own `FX-`/`BL-`. Do not leave it unrecorded.

**Known item 3, item by item:**
- Must be fixed here: `data-model.md` ~83/86/132, `ADR-0017` `FACT-3345`, `ADR-0018` `FACT-3381` (blockers 1–2), and the `HD-UT-06` comment (blocker 4).
- Not here:
  - `api-contract.md:144` (`FACT-2041`) is deliberately deferred, per §6 and the FEAT-G3 advice. But BL-061 should add that its source is now a deleted file.
  - `apps/web/src/lib/dal.ts:27`: web files are out of scope, and it is filed in BL-061.
  - `ADR-0031:16` (`FACT-3665`), `ADR-0006:11` and `ADR-0021:30` are history; FT-008 set the precedent with `FACT-3665`.
  - `ADR-0030` `FACT-3659`, though, is present tense and now false. Leave it as context, but name it in FT-009 so leaving it is a decision, not an omission.

**Known item 4.** FT-009 is acceptable. It is the next free number, and `ledger.api.spec.ts`'s dangling-reference check (`danglingReferences`) holds it mechanically: the tree is red on that check until T10 writes exactly FT-009. T10 must therefore come before the acceptance `pnpm verify`.

**Findings**
- `FACT-0073` (`architecture.md:141`) does not say "proposed", against the T7a wording. I would accept that: it stays true at T7b. `FACT-0074` (`:76-78`) does say "(proposed)" and goes false when the owner accepts `ADR-0035`. T7b's list does not include it, so the planner should add retiring it (or, if the lead calls it a wording fix, re-locking it). The same goes for the "proposed" wording in `apps/api/CLAUDE.md` and the skill (pipeline-implementer).
- `FACT-0026`/`FACT-0059` "Recorded in" now holds only `ADR-0035`, `FT-009`. The `FACT-3714` precedent kept the original recorder beside the new one. Lead's call; this is not a blocker.
- BL-061 should add the now-dangling sources of `FACT-2041` and `FACT-2035`. It could also add `FACT-0042`/`FACT-2076` ("controller + service + DTO + mapper"), which have not held for migrated modules since FT-008 (tester-acceptance).
- `.claude/skills/clean-architecture/SKILL.md:21-26` lists the allowed imports without `shared/application/` and `shared/domain/`, which contradicts its own row 38 and `create-meeting.ts:2`. It can ride T7b's `FACT-3701`→`3732` re-point (pipeline-implementer).

**Minor**
- `home-dashboard.unit.cases.md:19-20` still cites "design §5 and §7 of docs/plans/meeting-files/design.md". This predates the change and is a cases doc, not a code comment.

**Verdict — accept after blockers.** The code matches the plan, the invariants and `ADR-0018`. All four blockers are statements that are stale or not verbatim, and each is fixed by a narrow dispatch. Blocker 3 also fixes a latent `AR-API-14` defect that T7b would otherwise hit again.

Files:
- C:\GIT\PurpleSchool\docs\adr\ADR-0018-not-found-over-forbidden.md
- C:\GIT\PurpleSchool\docs\data-model.md
- C:\GIT\PurpleSchool\docs\adr\ADR-0017-meeting-participants-strings.md
- C:\GIT\PurpleSchool\docs\adr\ADR-0034-meeting-files-ports-and-adapters.md
- C:\GIT\PurpleSchool\e2e\architecture\architecture.api.spec.ts
- C:\GIT\PurpleSchool\scripts\facts-parse.mjs
- C:\GIT\PurpleSchool\apps\api\src\meetings\dto\list-meetings-query.dto.ts
- C:\GIT\PurpleSchool\docs\architecture.md
- C:\GIT\PurpleSchool\docs\BACKLOG.md
- C:\GIT\PurpleSchool\.claude\skills\clean-architecture\SKILL.md
- C:\GIT\PurpleSchool\docs\adr\ADR-0030-participants-strings-reaffirmed.md
