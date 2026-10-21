# Research: delete-meetings-and-files

> **No research stage was run.** The owner chose the trimmed path on 2026-10-16, the shape of
> `docs/plans/meetings-clean-architecture` (`FT-009`): no research sweeps, no design stage, no
> research or design review, one plan review. This file holds only the citations the plan relies on,
> gathered by the `planner` while writing it, so `PR-API-06` and a later reader can trace every
> load-bearing statement. It records what is in the project, not conclusions.

## Requirement, as received

The owner, via `lead`, 2026-10-16: `DELETE /meetings/:id` (the owner's meeting with its files, 204)
and `DELETE /meetings/:id/files/:fileId` (one file, 204); absent and foreign ids answer the existing
404s; 401 without a token; both guarded and listed in `PROTECTED_ROUTES`; laid out per `ADR-0035`;
API only; every new test deletes what it creates; the e2e-suite reshaping is a follow-up.

## Questions asked of the project

| #   | Question                                               | Area   | Answered in | Outcome |
| --- | ------------------------------------------------------ | ------ | ----------- | ------- |
| 1   | Which routes do `meetings` and `meeting-files` expose? | code   | below       | found   |
| 2   | Does deleting a `Meeting` row cascade to its files?    | schema | below       | yes     |
| 3   | Which 404 bodies and filters exist?                    | code   | below       | found   |
| 4   | How is the ten-file cap counted?                       | code   | below       | found   |
| 5   | What must a new guarded route touch?                   | checks | below       | found   |
| 6   | Does `ADR-0018` reach a by-id write?                   | corpus | below       | found   |
| 7   | Is a test-only cleanup endpoint allowed?               | corpus | below       | refused |
| 8   | Is deletion already planned, shipped or rejected?      | ledger | below       | planned |

- Routes: `docs/api-contract.md:34-42` (Routes table, nine rows, no `DELETE`);
  `meetings.controller.ts:22-24` (class-level `@UseGuards(JwtAuthGuard)`, `@UseFilters(MeetingsErrorFilter)`),
  `:32`, `:43`, `:58`; `meeting-files.controller.ts:35-37`, `:58`, `:83`, `:95`.
- Schema: `apps/api/prisma/schema.prisma:49` — `MeetingFile.meeting` carries `onDelete: Cascade`
  (`FACT-1057`, `docs/data-model.md:63`); `:34` — `Meeting.owner` likewise. Probe in §1 of the plan.
- 404s: `FACT-2016` / `FACT-2065` "Meeting not found" (`MEETING_NOT_FOUND_MESSAGE`,
  `meetings.error-filter.ts:12`, mapped at `:23-24`); `FACT-2083` / `FACT-2117` "File not found"
  (`FILE_NOT_FOUND_MESSAGE`, `meeting-files.error-filter.ts:17`, mapped at `:41-42`). Error kinds:
  `meeting.errors.ts:6`, `meeting-file.errors.ts:6-12`.
- One owner-scoped lookup: `prisma-meeting.repository.ts:39-43` (`findOwnedById`, `ADR-0018`
  `FACT-3381`); `meeting-files` reaches it through `GetMeetingAccess`
  (`infrastructure/get-meeting.access.ts:14-29`, `FACT-2124`); a file outside the meeting is
  `undefined` at `prisma-meeting-file.repository.ts:54-58` (`FACT-2117`).
- Ten-file cap: `meeting-files/domain/limits.ts:6`; counted per upload by
  `upload-meeting-file.ts:42` → `countForMeeting` (`prisma-meeting-file.repository.ts:16-18`),
  count-then-insert (`FACT-2096`, `FACT-3642`).
- Guarded routes: `e2e/security/security.api.spec.ts:28-48` (`PROTECTED_ROUTES`, seven rows);
  `callRoute` at `:74-82` types `method` as `'GET' | 'POST'` only; `AR-API-06`'s parser accepts
  `DELETE` (`e2e/architecture/architecture.api.spec.ts:86`, `:89`); `FACT-2077`, `FACT-2078`.
- `ADR-0018`: `FACT-3380` speaks of "an owner-scoped read"; `FACT-3392` (`:76`) extends the 404 to
  "every future owner-scoped by-id route" with no new decision; `BL-007` (`docs/BACKLOG.md:86`)
  "inherits `ADR-0018` for its own 404 branches".
- `ADR-0027`: `FACT-3584` (`:79`) refuses a test-only reset endpoint; `FACT-3580` (`:69`) keeps
  isolation through data.
- `ADR-0035`: `FACT-3739` — use cases are exercised over HTTP, entities by units, no port doubles;
  skill `clean-architecture` "Tests" says the same.
- Suite rules: `e2e/README.md` "Robustness rules" — `planner` is the `api` sandbox (`FACT-1071`),
  a mutating case creates its own meeting (`FACT-1076`), absolute counters in `@mutating` cases are
  forbidden; `meetings-detail.api.cases.md` preamble: no case there reads `total`.
- Ledger: `BL-007` "Editing and deleting a meeting" (open, P2). No `FT-`/`CH-`/`FX-` row adds a
  `DELETE`. **Not found:** deletion in the backlog's Rejected section.
- **Not found:** any test in `e2e/` that queries the database directly; every check is HTTP.

## Sweeps

| Subagent | Model | Scope                                | File      | Converged after |
| -------- | ----- | ------------------------------------ | --------- | --------------- |
| none     | —     | trimmed path; `planner` read in-line | this file | one pass        |

## Contradictions found

- `FACT-3642` (`ADR-0029:109`) and `docs/security.md:92` justify the cap with "a feature with no
  delete"; this change adds one. Named, not resolved (plan §6).
- `FACT-1068` (`docs/data-model.md:138`) lists only volume removal and `db:reset` as how a meeting
  or a file dies.

## Still unknown

- **Not found:** a seeded owner whose `total` no other case mutates under `fullyParallel: true`;
  the owner's "list totals after delete" requirement needs one (plan §6, question 1).
