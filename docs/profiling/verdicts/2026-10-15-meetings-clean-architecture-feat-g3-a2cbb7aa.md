<!-- agent: plan-reviewer; session: b988267e-c081-447a-abcb-7f7b884c5b13; captured: 2026-10-15T14:31:59.218Z -->

VERDICT
Change: meetings-clean-architecture
Gate: FEAT-G3
Pass: first
Verdict: accept-after-blockers
Findings:
- blocker | correction | unreachable-dod | Retiring FACT-0060 and FACT-0061 leaves the register rows FACT-0026 and FACT-0059 (architecture.md:248-249, facts-lock.json:133,304) pointing at retired successors, so AR-API-16 fails and T7's done-condition cannot be met
- blocker | correction | unreachable-dod | T3's done-condition "T2 green" includes crypto-uuid-source.spec.ts (the Q2 default), but that adapter only exists after T5
- blocker | correction | task-order | New fact E points at "the T9 row", but T7 does not depend on T9; E also restates only the count half of FACT-3720, so the primitives-not-value-objects half disappears with no successor
- nit | - | stale-fact | FACT-2041 gets a new source (the repository adapter) even though research says it is contradicted by the String column; re-locking it under a new source re-confirms a known-false fact
- nit | - | stale-fact | The deleted meeting.types.ts is still named as a source by FACT-1011 and the Meeting table (data-model.md:37,48), and api-contract.md:159 names meetings.service.ts; the plan does not say where MeetingDto, MeetingsPageDto and CreateMeetingInput move
- nit | - | doc-drift | .claude/agents/implementer-api.md:28-29 says the pattern covers "today meeting-files only" and that meetings stays on ADR-0006; this is not in T8 or Q3
- nit | - | other | FACT-3706, FACT-3716 and FACT-1067 still hold but describe only meeting-files or "services"; the plan should list them as reviewed and kept
- nit | - | stale-fact | Unkeyed stale wording is left behind: the apps/web/src/lib/dal.ts:27 comment and the api-contract.md:147-148 rationale both say "MeetingsService" or "the service"
END VERDICT

**Strengths.** Every research citation I checked matches the code: `meetings.service.ts:1,8,11,27,30,42,59,62,63,66,80-83`, the controller at `:27,40,84`, and the outside dependants. Section 0 cites real ledger entries (`FT-008`, `CH-034`), backlog rows (`BL-043`, `BL-050`…`053`) and ADRs. Section 2a gives a named place to invariants 4, 5, 7 and 8, to `ADR-0018`, to `ADR-0031` and to `FACT-0071`, as the owner required. The cross-module access design is sound: one lookup (`findOwnedById`), only `MeetingNotFoundError` is caught, everything else is rethrown (section 5), and the message string stays a single copy. No endpoint is added, so invariants 16–19 are not touched, and the files columns do not collide: T7 then T10 share `CHANGELOG.md`, T9 then T10 share `BACKLOG.md`. Section 4a correctly predicts the one expected red test, `AR-API-14`, and which task closes it.

**Blocker 1 (correction): the successor chain.** `AR-API-16` (`violationsRetirement`, `architecture.api.spec.ts:949-955`) fails any retired row whose successor is itself retired. Two existing rows in `docs/architecture.md` will be in that state after T7:
- `FACT-0026` is "retired by FACT-0060".
- `FACT-0059` is "retired by FACT-0061".

T7 retires both successors, so its done-condition ("`AR-API-11`…`17` green") is unreachable as written. **Fix:** add two rows to section 3a.
- Point `FACT-0026` at new A and `FACT-0059` at new B.
- Keep each statement word for word. Set "Recorded in" to `ADR-0034` plus this change's `FT-` entry.
- Update the two `supersededBy` entries in `facts-lock.json`.

This is the same re-pointing `FACT-3714` did for `ADR-0007`'s row.

**Blocker 2 (correction): T3's done-condition.** With Q2's default (each module keeps its own uuid adapter), T2 writes `meetings/infrastructure/crypto-uuid-source.spec.ts`, but `CryptoUuidSource` is only created in T5. T3 can therefore never reach "T2 green". **Fix:** make T3 done when `domain/meeting.spec.ts` is green, and move "the uuid adapter spec green" into T5's done-condition. In practice that check runs at the T5+T6 commit.

**Blocker 3 (correction): new fact E.** Two problems:
- **Ordering.** E says the cap stays put "pending the T9 row". T9 runs in parallel and T7 does not depend on it, so T7 may run before that backlog ID exists. **Fix:** either add T9 to T7's dependencies, or source E to the owner's decision of 2026-10-15 and cite the backlog row only once it exists.
- **Missing half.** `FACT-3720` states two things: `MeetingFile` stores primitives rather than its value objects, and `upload` takes the file count as a number. E restates only the second, so the first would be retired with nothing replacing it. **Fix:** make E restate both, now that `meetings` has migrated.

**Findings.**
- **`FACT-2041`.** Do not give it a new source. Leave it out of T7 for the lead to route, as section 6 already says. Re-locking it under the adapter would re-confirm a contradiction the research found.
- **Missing source corrections and type homes.** Add `FACT-1011` and the table sources at `data-model.md:37` and `api-contract.md:159` to the source-only corrections. T5 should say where the types from `meeting.types.ts` go; `meeting-files.mapper.ts`, which defines its DTO type, is the precedent.
- **The implementer-api agent file.** Fold `.claude/agents/implementer-api.md:28-29` into Q3 and T8. It is a pipeline file, it cites no fact key so `AR-API-14` will not catch it, and it goes stale the moment T5 lands.
- **Open questions** are framed correctly and are not blocking:
  - Q1: the skill's own line 102 ("A migration is its own change under ADR-0034: it retires the facts it falsifies") supports the plan's default. Worth telling the owner.
  - Q2: the "shared home" option conflicts with `FACT-0068`, which places uuid adapters in `infrastructure/`. It does not lack an ADR, because `apps/api/CLAUDE.md` already maps `src/common/` as the home for code shared by two features.
  - Q3 and Q4 are correct.

**Minor.**
- T5's done-condition ("lands with T6") cannot be checked on its own; say that T6's lint and typecheck cover it.
- T5 should state that the class-level `@UseGuards(JwtAuthGuard)` stays (`FACT-2034`).
- The stale `dal.ts:27` comment and the `api-contract.md:147-148` rationale wording should be swept, or deliberately left out and the omission noted.

**Verdict: accept after blockers.** The plan's decisions are right and every owner constraint has a place in it. The three blockers are corrections to the fact registers, one done-condition and one task ordering, and none of them changes the plan's shape.

Relevant files:
- C:\GIT\PurpleSchool\docs\plans\meetings-clean-architecture\meetings-clean-architecture.plan.md
- C:\GIT\PurpleSchool\docs\architecture.md
- C:\GIT\PurpleSchool\docs\facts-lock.json
- C:\GIT\PurpleSchool\e2e\architecture\architecture.api.spec.ts
- C:\GIT\PurpleSchool\docs\adr\ADR-0034-meeting-files-ports-and-adapters.md
- C:\GIT\PurpleSchool\docs\data-model.md
- C:\GIT\PurpleSchool\docs\api-contract.md
- C:\GIT\PurpleSchool\.claude\agents\implementer-api.md
- C:\GIT\PurpleSchool\.claude\skills\clean-architecture\SKILL.md
