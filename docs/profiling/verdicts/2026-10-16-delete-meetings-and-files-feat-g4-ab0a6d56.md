<!-- agent: code-reviewer; session: b988267e-c081-447a-abcb-7f7b884c5b13; captured: 2026-10-16T16:16:39.314Z -->

VERDICT
Change: delete-meetings-and-files
Gate: FEAT-G4
Pass: first
Verdict: accept-after-blockers
Findings:
- blocker | correction | doc-drift | apps/api/README.md:49-58 seed table still lists four users; eraser is missing, so a second copy of the seed now disagrees with users.seed.ts and FACT-1085
- blocker | correction | doc-drift | SEC-API-12 cleanup text (security.api.cases.md:250-255) tolerates a FACT-2083/FACT-2016 404 that the spec never accepts; the spec is right and the case text is wrong (MD-API-11's cleanup text has the same gap)
- nit | - | stale-fact | meeting-files.controller.ts:34 says "Three routes", and the cases preamble :29 says "these three routes"; there are now four
- nit | - | stale-fact | spec header comments meetings-detail.api.spec.ts:8 and meeting-files.api.spec.ts:19-21 still list only the pre-delete routes
- nit | - | other | e2e/README.md:239 states the cleanup rule for every case that creates a meeting, but the plan scoped it to new cases and most existing mutating cases do not clean up
- nit | - | other | MF-API-24 is P1 in a first pass, against e2e/README.md:284 "only @p0"; it is the only case proving FACT-2132
- nit | - | tool-gap | T9 gives the control experiments (a)-(d), which edit apps/api and schema.prisma, to tester-acceptance, whose tools cannot touch product code; it also gives pnpm verify to tester-acceptance, but process.md:35 gives FEAT-S6 to lead
- nit | - | stale-fact | data-model.md:134 Source line for the lifetime table (ADR-0027 only) does not source FACT-1084's new DELETE clause
- nit | - | other | data-model.md:196 rationale says "One password for all five would add noise", which is the opposite of what it means
- nit | - | other | home-dashboard.api.cases.md:20 says eraser is a user "no other case signs in as", but SM-API-02 signs in as eraser
END VERDICT

# FEAT-G4 code review, first pass: delete-meetings-and-files (T1–T7)

**Verdict: accept after blockers.** The product code matches the plan and every invariant it touches. The two blockers are both `correction`: one stale seed table and one case text that disagrees with its spec. Neither changes a decision, so a narrow dispatch can fix them without re-running a stage.

**How I read it.** I am read-only and could not run `git diff`. I read every changed and new file in full, or by the changed region for the large specs, and compared each against the plan and `design.md`. I did not run any check. The status of `AR-API-*` and of the Playwright run is whatever the team reported, not something I confirmed. I could not confirm `FACT-3126`'s lock hash against the previous one.

## Strengths
- **Plan followed (§2a).** Both use cases come out exactly as planned:
  - `apps/api/src/meetings/application/delete-meeting.ts:17-21`: one port call, the existing `MeetingNotFoundError`.
  - `apps/api/src/meeting-files/application/delete-meeting-file.ts:21-29`: ownership first, then the file (`FACT-2124`).
  - No package imports in `application/` (`AR-API-18`).
- **Owner-scoped deletes.** One statement each, with the owner or meeting in the `where`:
  - `prisma-meeting.repository.ts:49-53`
  - `prisma-meeting-file.repository.ts:61-67`
  - So a foreign id deletes nothing, and absent and foreign share one `false` (`ADR-0018`).
- **Thin controllers.** `@HttpCode(HttpStatus.NO_CONTENT)` on both handlers, `ownerId` only from `@CurrentUser()` (invariant 5), no pipe on params, no rules in the handler:
  - `meetings.controller.ts:84-88`
  - `meeting-files.controller.ts:129-137`
- **Wiring.** `useFactory` providers in both modules; `meetings` does not export `DeleteMeeting` (`meetings.module.ts:45-51`).
- **Invariant 16.** Two `PROTECTED_ROUTES` rows with literal params, plus a `DELETE` branch in `callRoute` (`security.api.spec.ts:54-55`, `:92-93`).
- **`e2e/fixtures/cleanup.api.ts`.**
  - A tolerated 404 is matched by exact body, so Express's `Cannot DELETE …` fails.
  - The case's own failure is reported before a cleanup failure.
  - Cleanup runs in reverse order (`:37-100`).
- **Tests that tell a broken build from a working one.**
  - MD-API-10 (`meetings-detail.api.spec.ts:398-433`) compares the foreign and absent 404 bodies in one assertion and has the owner's own 204 as the control.
  - MF-API-22 (`meeting-files.api.spec.ts:1060-1109`) proves ownership is checked before the file.
  - MF-API-25 (`:1191-1226`) paired with MD-API-09 is a real proof of the cascade.
  - HD-API-23 (`home-dashboard.api.spec.ts:510-569`) reads totals against a baseline on an isolated owner, and `limit=1` against `total ≥ 2` rules out invariant 4's failure.
- **Corpus.**
  - Routes rows and keyed sections, `FACT-2128`…`2132` (`api-contract.md:43-44`, `:241-258`, `:302-303`).
  - Three retirements, each naming a live successor (`data-model.md:331-333`).
  - `FACT-1084` keeps "no route deletes a user", which answers the earlier gate's nit.
  - `docs/security.md:92` is left untouched, as the plan's Q2 says.

## Blockers
1. **`apps/api/README.md:49-58`.**
   - **What is wrong:** the seeded-user table still has four rows; `eraser` is missing. `apps/api/CLAUDE.md` names this README as the home of "the seeded user table", so it is a second copy of the seed and it now disagrees with `users.seed.ts:54-59` and `FACT-1085`. The plan's T5 file list missed it.
   - **Risk:** the `FX-023` pattern — a reader of the package README never learns about the fifth account or that it must not be touched.
   - **Label:** `correction`, category `doc-drift`. **Owner: `implementer-api`.**
2. **SEC-API-12 cleanup text (`e2e/security/security.api.cases.md:250-255`).**
   - **What is wrong:** the case says that when the case has already failed, a cleanup 404 is tolerated with `FACT-2083` (file) or `FACT-2016` (meeting). The spec (`security.api.spec.ts:588-593`) tracks both paths with `null`, so only 204 is accepted.
   - **Decision on team point 2: the spec stays; the case text changes.** Three reasons:
     - The tolerance branch never shows in a result: `withCleanup` reports the steps' error and drops any cleanup error once a step has failed.
     - When the steps pass, `null` is exactly the control the case text itself asks for.
     - Naming `FACT-2083` for the file path is wrong whenever the meeting is already gone, because ownership is checked first (`FACT-2124`) and gives `FACT-2016`.
   - **Fix:** the text should say both cleanup deletes must answer 204; on an already-failed case, cleanup removes what is left and its errors give way to the case's own failure.
   - **Same gap in MD-API-11:** its cleanup line (`meetings-detail.api.cases.md:177`) does not say 204 is required, while the spec requires it (`meetings-detail.api.spec.ts:447`). Align it with MD-API-10's wording (`:165-166`).
   - **Risk:** the case text describes behaviour that no code implements.
   - **Label:** `correction`, category `doc-drift`. **Owner: `test-designer`.**

## Findings
- **ADR-0007 and FACT-1027 edits (team point 1): both are acceptable under `ADR-0022`.**
  - **ADR-0007 citation.** Only the source citation of `FACT-3126` moved (`ADR-0007-in-memory-store.md:27`). Its statement is untouched and still true: `planner`/`organizer` remain the two per-project sandboxes, and `FACT-1087` repeats that and adds `eraser`. `FACT-3501` allows a wording fix that regenerates the lock. The alternative, citing a retired key from a living document, fails `AR-API-14` by design. This is not an edit in substance to an ADR.
  - **FACT-1027 status.** Only the Status column moved (`data-model.md:323`), never the Stated column. `FACT-3494` makes a retired successor illegal, so repointing the forwarding address to the live end of the chain is the only conforming move.
  - **Optional polish:** add this change's `FT-` ID to that row's "Recorded in" once T9 assigns it, so the skipped `FACT-1068` hop stays traceable. The three new rows' `ADR-0022` "Recorded in" would read better as that `FT-` too (the `FACT-1068` row is the precedent for the current form).
- **"Three routes" text (team point 3b), now four.** Three places, each with its own owner:
  - `meeting-files.controller.ts:34` (product comment, `implementer-api`)
  - `meeting-files.api.cases.md:29` preamble (`test-designer`)
  - spec headers `meetings-detail.api.spec.ts:8` and `meeting-files.api.spec.ts:19-21` (`tester-api`)
- **Case-count limit (team point 3c).** Read as "what a first pass adds", the count is within the limit: MD +3, MF +6, HD +1, SEC +1, each at most eight per file. The real deviation is MF-API-24 being P1 in a first pass (`e2e/README.md:284`). It is the only case proving `FACT-2132`; either make it `@p0` or record the deviation. The plan required it, so this is not a blocker.
- **Plan T9 (team point 3a).** Two problems:
  - `docs/process.md:35` gives `FEAT-S6` (one `pnpm verify`) to `lead`, while T9 gives it to `tester-acceptance`. `lead` should run it per the inventory; `tester-acceptance` keeps the ledger step (`FEAT-S7`).
  - More important: controls (a)–(d) edit `prisma-*.repository.ts`, `schema.prisma` and the controller decorators, and no `tester-*` role can touch product code. They need an `implementer-api` dispatch, or the lead should re-assign them before T9.
- **Cleanup rule too broad.** `e2e/README.md:239` states it for every case that creates a meeting. The plan scoped it to new cases, and MD-API-05…08, HD-API-13…, MF-API-01/07…19 create meetings and do not clean up. Scope it to cases added from this change on, or name the older ones as predating it.
- **Unsourced clause.** `docs/data-model.md:134`: the lifetime table's Source (`ADR-0027`, the cookie module) does not cover `FACT-1084`'s new "a meeting or file: its `DELETE`" clause. Add `FACT-2130`/`FACT-2131` or the two controllers.
- **Ledger.** No `FT-` row yet. That is correct for this gate, since T9 owns it, but acceptance must not close without it and without `BL-007` reworded.

## Minor
- `data-model.md:196`: the rationale reads backwards ("One password for all five would add noise"); it should say different passwords would.
- `home-dashboard.api.cases.md:20` "no other case signs in as": SM-API-02 signs in as `eraser`. Say "reads or mutates" instead.
- `delete-meeting-file.ts`: if the meeting is deleted between the ownership check and `deleteMany`, the answer is `FACT-2083` rather than `FACT-2016`. That is harmless and allowed by `FACT-2131`; noted only for completeness.
- `prisma-meeting.repository.ts:46-47`: "the count tells absent-or-foreign from deleted" is ambiguous, because "deleted" here means "deleted now". Consider "from a row actually removed".

## Invariants touched
- **1** (by analogy, `@HttpCode` for 204), **4** (HD-API-23), **5**, **8** (string 404s through the existing filters), **16** (`PROTECTED_ROUTES` rows): all hold.
- **2** and **7**: not engaged; there is no new DTO and no new sort.
- **17–19**: not touched; this is API only, no `apps/web` change, so the UI checks do not apply.

## Files
- C:\GIT\PurpleSchool\apps\api\README.md
- C:\GIT\PurpleSchool\e2e\security\security.api.cases.md
- C:\GIT\PurpleSchool\e2e\regression\meetings-detail\meetings-detail.api.cases.md
- C:\GIT\PurpleSchool\e2e\regression\meeting-files\meeting-files.api.cases.md
- C:\GIT\PurpleSchool\apps\api\src\meeting-files\meeting-files.controller.ts
- C:\GIT\PurpleSchool\e2e\README.md
- C:\GIT\PurpleSchool\docs\data-model.md
- C:\GIT\PurpleSchool\docs\plans\delete-meetings-and-files\delete-meetings-and-files.plan.md
