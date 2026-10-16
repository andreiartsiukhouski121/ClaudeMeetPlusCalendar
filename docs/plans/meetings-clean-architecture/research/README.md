# Research: meetings-clean-architecture

> **No research stage was run.** The owner chose the trimmed path ("Variant B") on 2026-10-15: no
> research sweeps, no design stage, no research or design review. This file holds only the citations
> the plan relies on, gathered by the `planner` while writing it, so `PR-API-06` and a later reader
> can trace every load-bearing statement. It records what is in the project, not conclusions.

## Requirement, as received

Migrate `apps/api/src/meetings/` to the ports-and-adapters layout of the accepted `ADR-0034`
(`BL-050`), behind a fixed HTTP contract, keeping `meeting-files`' access adapter working. Moving the
ten-file cap into a `Meeting` aggregate is out of scope (the owner, 2026-10-15, via `lead`).

## Questions asked of the project

| #   | Question                                         | Area   | Answered in | Outcome |
| --- | ------------------------------------------------ | ------ | ----------- | ------- |
| 1   | What does `meetings` contain today?              | code   | below       | found   |
| 2   | Who outside the module depends on it?            | code   | below       | found   |
| 3   | Which units cover it?                            | tests  | below       | none    |
| 4   | Which keyed facts name its service or its scope? | corpus | below       | found   |
| 5   | Can `meetings` reuse `meeting-files`' ports?     | checks | below       | no      |

- `apps/api/src/meetings/`: `meetings.controller.ts`, `meetings.service.ts`, `meetings.mapper.ts`,
  `meetings.module.ts`, `meetings.seed.ts`, `meeting.types.ts`, `dto/create-meeting.dto.ts`,
  `dto/list-meetings-query.dto.ts`; no `domain/`, `application/` or `infrastructure/` directory.
- `meetings.service.ts:1` imports `randomUUID` from `node:crypto`; `:59` composes `mtg-${randomUUID()}`
  (`ADR-0031`, `FACT-2123`); `:62` normalizes `startsAt` with `new Date(input.startsAt).toISOString()`;
  `:63` defaults the duration to `DEFAULT_DURATION_MINUTES` (60, `:11`); `:66` defaults `participants`
  to `[]`; `:27` defaults `limit` to `DEFAULT_MEETINGS_LIMIT` (3, `:8`); `:30` orders
  `[{ startsAt: 'desc' }, { id: 'asc' }]` (invariant 7); `:42` counts by owner (invariant 4); `:80-83`
  is the one owner-scoped lookup returning `undefined` for absent and foreign alike (`ADR-0018`).
- `meetings.controller.ts:27` exports `MEETING_NOT_FOUND_MESSAGE`; `:84` throws
  `new NotFoundException(MEETING_NOT_FOUND_MESSAGE)`; `:40` injects `MeetingsService`.
- `meetings.module.ts:17` exports `MeetingsService`.
- Outside dependants: `meeting-files/infrastructure/meetings-service.access.ts:3,13,16` (calls
  `MeetingsService.findById`), `meeting-files/meeting-files.error-filter.ts:11` (imports
  `MEETING_NOT_FOUND_MESSAGE` from `meetings.controller.ts`), `meeting-files/meeting-files.module.ts:4,32`
  (imports `MeetingsModule`), `apps/api/prisma/seed.ts:46` (imports `SEED_MEETINGS`),
  `e2e/smoke/seed.api.spec.ts:105` and `e2e/fixtures/seed.ts:86,101` (name `meetings.seed.ts` by path).
- **Not found:** any `*.spec.ts` under `apps/api/src/meetings/`. `HD-UT-01`…`09` are retired
  (`e2e/regression/home-dashboard/home-dashboard.unit.cases.md:16-21`); the live `HD-UT-*` cases are
  all `apps/web` (`format-date`). `e2e/regression/meetings-detail/` has no `*.unit.cases.md`.
- `AR-API-18`'s resolver admits a relative import only inside the same module's `domain/` (and
  `application/` from `application/`) — `e2e/architecture/architecture.api.spec.ts:1055-1090`, with
  the forbidden fixture "relative import into another module's domain/" at `:1311`. `AR-API-19`
  objects only to the empty `new Date()` form — `:1110`.
- `FACT-3699` (`ADR-0034`) scopes the record to `meeting-files` alone; `FACT-3704` names
  `MeetingsService.findById`; `FACT-3715` says `ADR-0006`/`0018`/`0027` still govern `meetings`;
  `FACT-3720` calls `meetings` "unmigrated".
- `docs/architecture.md:76` `FACT-0062`, `:135` `FACT-0060`, `:136` `FACT-0061`, `:101` `FACT-0067`.
- `docs/api-contract.md:134` `FACT-2037`, `:165` `FACT-2046`, `:166` `FACT-2047`, `:335` `FACT-2112`;
  sources naming `meetings.service.ts` at `:140`, `:144`, `:198` (`FACT-2039`, `FACT-2041`, `FACT-2123`).
- `docs/data-model.md:234` `FACT-1046` ("chosen by the service"); `:130-132` `FACT-1067` source.
- `docs/adr/ADR-0017-meeting-participants-strings.md:66` `FACT-3350` ("The service normalizes…");
  `:63` cites `FACT-2047`. `docs/adr/ADR-0018-not-found-over-forbidden.md:51` `FACT-3381` source.
- Living files citing keys above, which `AR-API-14` scans (`architecture.api.spec.ts:752-755,850-895`):
  `.claude/skills/clean-architecture/SKILL.md:62` (`FACT-3720`), `docs/CHANGELOG.md:38` (`FT-008` row:
  `FACT-0060`, `FACT-3720`), `docs/adr/ADR-0017-meeting-participants-strings.md:63` (`FACT-2047`).
- `.claude/skills/clean-architecture/SKILL.md:3,7-9` say the skill does not apply to `meetings`.
- `BL-050` (`docs/BACKLOG.md:38`) conflicts with `BL-043`, `BL-053`; `BL-053` item (3) defers a
  database-backed harness until a second migrated module (`docs/BACKLOG.md:35`).
- Precedent for retiring an attribution-only fact: `FACT-3386` retired by `FACT-3706`
  (`ADR-0018` register, `docs/adr/ADR-0018-not-found-over-forbidden.md:102`).

## Sweeps

| Subagent | Model | Scope                                | File      | Converged after |
| -------- | ----- | ------------------------------------ | --------- | --------------- |
| none     | —     | trimmed path; `planner` read in-line | this file | one pass        |

## Contradictions found

- `FACT-2041` says the list compares parsed milliseconds; `apps/api/prisma/schema.prisma:30` types
  `startsAt` as `String` and `meetings.service.ts:30` orders on that column. Named, not resolved.
- `FACT-2035`'s source is `dto/list-meetings.dto.ts`; the file is `dto/list-meetings-query.dto.ts`.
- `FACT-3100`'s source `apps/api/src/meetings/meetings.service.spec.ts` does not exist.

## Still unknown

- **Not found:** an `ADR-` record deciding whether extending `ADR-0034` from `meeting-files` to a
  second module needs a record of its own; see the plan's §6 open questions.
