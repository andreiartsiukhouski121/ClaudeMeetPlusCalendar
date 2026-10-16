# Plan: meetings-clean-architecture

Closes `BL-050`. Trimmed path chosen by the owner on 2026-10-15: [`research/README.md`](research/README.md)
is a citation list and [`design.md`](design.md) one paragraph plus its "Style ADR" section. A refactor
behind a fixed contract: no HTTP response or web file changes. Amended to the owner's answers of
2026-10-16; the delta is §0a.

## 0. Orientation: what the project already has

- **Duplicate:** no matches — `FT-008` migrated `meeting-files` only and names `meetings` as a
  follow-up (`BL-050`); `CH-034` added `AR-API-19` over every module's `domain/` and `application/`,
  which this change must satisfy, and migrated nothing. No `FT-`/`CH-`/`FX-` row touches the
  `meetings` layout.
- **Conflicts with shipped:** invariants 4, 5, 7 and 8 move from `MeetingsService` and
  `MeetingsController` into the repository adapter, the use cases and an error filter (§2a);
  `FT-008`'s `MeetingsServiceAccess` loses its subject and is re-pointed (T6); `FT-008`'s `Clock`,
  `UuidSource` and their adapters move into the shared kernel, behaviour unchanged (`FACT-3740`, T3a);
  the `FT-008` and `CH-034` ledger rows cite keys this change retires (T9). Unedited and green:
  `HD-API-*`, `MD-API-*`, `MF-API-*`, `SEC-API-*`, `SM-API-03`, `HD-FN-*`, `MF-FN-*`, `MF-UT-11`…`20`;
  `MF-UT-21`'s assertion is kept under a successor ID; `AR-API-18`/`19` gain fixture rows (owner, Q2).
- **Conflicts with planned:** `BL-043` — the `mtg-` literal moves into `Meeting.create`, beside
  `fil-` in `MeetingFile.upload`; a shared `issueId` in `src/shared/domain/` would be importable from
  `domain/` (`FACT-3732`), so T9 rewords `BL-043`'s conflict text. `BL-053` item (3) — this is the
  second migrated module its trigger names, and no harness is added (owner, 2026-10-15);
  `BL-051`/`BL-052` follow this shape. Two new rows are filed (T9).
- **Architecture impact:** applies `ADR-0035` (proposed; the owner accepts it before T7b) to
  `meetings` and moves `meeting-files`' time and randomness ports into its shared kernel; `ADR-0034`
  stays accepted as the pilot's record and, at T7b, retires eight facts to `ADR-0035` successors;
  `FACT-3704` and `FACT-3720` retire at T7a to this plan's F and E. `ADR-0006` governs the modules
  not yet migrated (`users`, `auth`); `ADR-0018` (one code path) and `ADR-0027` stay accepted and
  govern every module; `ADR-0031`'s `mtg-` format is kept; `ADR-0017`'s `FACT-3350` retires
  (attribution). Corpus edits in `docs/architecture.md`, `docs/api-contract.md`,
  `docs/data-model.md` and three ADRs (§3a).
- **Open questions:** the four of 2026-10-15 are answered (§6); the designer's two flags on
  `ADR-0035` remain for the owner, verbatim in §6.

## 0a. Delta of 2026-10-16

- First pass: §0; §1 row 4 (probed); §2a uuid bullet; §3a rows B, C, K, L, the eight successors,
  `FACT-0071`; §4 T1–T10 amended, T2b and T3a new; §4a, §5, §6 rewritten.
- Second pass (plan review re-run): §0 `ADR-0006`/`0018`/`0027` and `BL-043`; `AR-API-18` fixture
  16 forbidden / 7 allowed (T1, T2b, §4a); K/L settled (§3a); T7 split into T7a/T7b (`BL-049`),
  every re-pointing of the eight keys moved into T7b; §4a `AR-API-14` row dropped; §5, §6.

## 1. Spike: how the risky assumptions were proven

| Assumption                                                                                                                                                                         | How it was proven                                                                                                                                                                                        | Fact                                                                                                                                                                                                             |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A `useFactory` use case exported by one module injects into another module's `@Injectable()` adapter, and a `try`/`instanceof` access adapter answers own/foreign/absent correctly | throwaway Node probe against `apps/api`'s `@nestjs/core` 12.0.1, two modules, `createApplicationContext`; deleted                                                                                        | own `true`, foreign `false`, absent `false`; the use case is not visible beyond the export                                                                                                                       |
| A domain error mapped by a `BaseExceptionFilter` subclass replies byte-identically to a thrown `NotFoundException`                                                                 | not re-probed: `FACT-3717` (probe of 2026-10-14, five routes, headers compared)                                                                                                                          | holds for `@UseFilters` on the class                                                                                                                                                                             |
| Moving the DTO's literals to `domain/limits.ts` constants leaves every 400 message unchanged                                                                                       | throwaway probe, `class-validator` 0.15.1, `@Length`/`@ArrayMaxSize` with literals vs constants                                                                                                          | message arrays identical                                                                                                                                                                                         |
| `boundedFiles` reaches `src/shared/application/`, and `importObjection` with exactly `FACT-3732`'s two prefixes admits and objects as `FACT-3733` says (2026-10-16)                | throwaway Node copy of `walk`, `boundedFiles` and `importObjection` at `37d462a` plus the two prefixes, over a temp tree outside the repo; deleted. Made permanent by T2b's walk-reach step, not assumed | walk lists `src/shared/application/uuid-source.ts`; `application/`→`shared/application/` admitted; →`shared/infrastructure/`, `domain/`→`shared/application/`, `application/`→`shared/domain/` objected (flag b) |
| `new Date(input.startsAt).toISOString()` may sit in `domain/`                                                                                                                      | `AR-API-19`'s pattern matches only the empty call (`architecture.api.spec.ts:1110`)                                                                                                                      | allowed (`FACT-0071`)                                                                                                                                                                                            |
| Use cases need no decorator under `useFactory`                                                                                                                                     | `FACT-3696`                                                                                                                                                                                              | holds on `@nestjs/core` 12.0.1                                                                                                                                                                                   |

## 2. Contract

Unchanged: `GET /meetings`, `POST /meetings`, `GET /meetings/:id` exactly as `FACT-2034`…`FACT-2063`
and the error-shapes table (`FACT-2016`). The 404 body stays
`{"message":"Meeting not found","error":"Not Found","statusCode":404}` (`FACT-3382`), now built by
`MeetingsErrorFilter` from `MeetingNotFoundError`; the `ValidationPipe` 400s (`FACT-2055`…`2058`) and
the guard's 401 are raised before the handler and untouched (`FACT-3707`). No route added, so
`PROTECTED_ROUTES` and the Routes table do not change (invariant 16).

### 2a. Where the invariants land

- **4** — `PrismaMeetingRepository.countByOwner`; `ListMeetings` returns it as `total`.
- **5** — controller reads `@CurrentUser()`; `ownerId` is a separate use-case argument, never a DTO field.
- **7** — `orderBy: [{ startsAt: 'desc' }, { id: 'asc' }]` in the repository adapter only.
- **8** — filter: string `message` on the 404; the pipe's array 400s never reach it.
- **`ADR-0018`** — one lookup, `findOwnedById` (`findUnique` then owner compare, as today), returns
  `undefined` for absent and foreign; `GetMeeting` throws the one error; `meeting-files` reuses it.
- **`ADR-0031`** — `Meeting.create` composes `mtg-` + the uuid it is given (as `MeetingFile.upload`).
- **`FACT-3738`/`FACT-0071`** — `CreateMeeting` takes the uuid from the shared `UuidSource`; `meetings`
  binds it under its own `Symbol` token with `useClass: CryptoUuidSource` (`FACT-3734`, flag a);
  `node:crypto` only in `src/shared/infrastructure/`. No `Clock`: `meetings` reads no instant.

## 3. Data

Seed rows unchanged (`meetings.seed.ts`; `SM-API-03` compares them). Only the element type changes,
from `Meeting` to the entity file's `StoredMeeting`. Values for the unit cases (T1), no store needed:
`startsAt: '2026-01-12T10:00:00+01:00'` → `'2026-01-12T09:00:00.000Z'`; uuid
`'3f2b8c1e-4d5a-4e6f-8a7b-9c0d1e2f3a4b'` → id `'mtg-3f2b8c1e-4d5a-4e6f-8a7b-9c0d1e2f3a4b'`; absent
`durationMinutes` → `60`; absent or `null` `participants` → `[]`; `['Nina Cole', 'Nina Cole']` kept
verbatim (`FACT-3351`).

## 3a. Corpus facts this change adds or retires

All retirements go to their own document's register naming one successor (`ADR-0022`), with
`supersededBy` in the lock; new keys from `pnpm fact:next` at writing time; then `pnpm fact:lock`.

| Fact                                                                                                                                                                                | Adds; retires                                                                        | Where                                          | Task |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------- | ---- |
| new A — "Layered modules, controller → service → store, in `users` and `auth`"                                                                                                      | adds; retires `FACT-0060`                                                            | `docs/architecture.md` patterns                | 7a   |
| new B — "Ports and adapters (`ADR-0035`, proposed): `meeting-files` and `meetings`"                                                                                                 | adds; retires `FACT-0061`                                                            | `docs/architecture.md` patterns                | 7a   |
| `FACT-0026` → A, `FACT-0059` → B: register rows re-pointed, statement verbatim, "Recorded in" `ADR-0035` + this `FT-`; `supersededBy` in the lock (as `FACT-3714`)                  | re-points                                                                            | `docs/architecture.md`; `docs/facts-lock.json` | 7a   |
| new C — the `ADR-0006` table governs `users`, `auth`; the `ADR-0035` table governs `meeting-files`, `meetings`                                                                      | adds; retires `FACT-0062`                                                            | `docs/architecture.md` layers                  | 7a   |
| `FACT-3699`→`3729`, `3700`→`3740`, `3701`→`3732`, `3702`→`3733`, `3709`→`3739`, `3715`→`3746`, `3718`→`3734`, `3719`→`3738` (successors already keyed in `ADR-0035`)                | retires                                                                              | `ADR-0034` register                            | 7b   |
| new K, L — layer-table rows: Port (module ports in `application/`; `Clock`, `UuidSource` in `src/shared/application/`); Clock / UUID adapter in `src/shared/infrastructure/`        | adds; retire `FACT-0066`, `FACT-0068`                                                | `docs/architecture.md` layer table             | 7a   |
| new D — access adapter implements a port over `PrismaService`, another module's service or another module's exported use case                                                       | adds; retires `FACT-0067`                                                            | `docs/architecture.md` layer table             | 7a   |
| new E — `MeetingFile` still stores primitives, not value objects, and `upload` still takes the file count as a number after `meetings` migrated — owner, 2026-10-15; T9's `BL-` row | adds; retires `FACT-3720` (`ADR-0034` register)                                      | `docs/architecture.md`                         | 7a   |
| new F — `FACT-2112`'s 404 resolved through `meetings`' exported `GetMeeting`, the lookup `GET /meetings/:id` uses                                                                   | adds; retires `FACT-2112`, `FACT-3704` (`ADR-0034` register)                         | `docs/api-contract.md`                         | 7a   |
| new G — default `limit` 3 supplied by `ListMeetings`, not the DTO                                                                                                                   | adds; retires `FACT-2037`                                                            | `docs/api-contract.md`                         | 7a   |
| new H, I — table rows: the `Meeting` entity defaults `durationMinutes` to 60 / absent or `null` `participants` to `[]`                                                              | adds; H retires `FACT-2046`, I `FACT-2047` and `FACT-3350` (`ADR-0017` new register) | `docs/api-contract.md`                         | 7a   |
| new J — the three most recent are chosen by the repository adapter's query                                                                                                          | adds; retires `FACT-1046`                                                            | `docs/data-model.md`                           | 7a   |

K and L are this plan's successors in `docs/architecture.md`: `ADR-0035`'s `FACT-3745` is being
reworded by the designer to "eight facts, from `ADR-0034`", so no `ADR-0035` key succeeds
`FACT-0066`/`FACT-0068`. Reworded or source-only, re-locked, not retired (`FACT-3501`), at T7a:
`FACT-2039`, `FACT-2123`, `FACT-1011`, the table sources at `data-model.md:37`, `:48`,
`api-contract.md:159` (→ mapper, entity, adapter files), `FACT-3381` (→ repository adapter),
`FACT-3348` (cites I, not `FACT-2047`); the rationale at `api-contract.md:147-148` ("the service
supplies it") reworded to `ListMeetings`. Reviewed and kept: `FACT-3105`, `FACT-0027`, `FACT-1006`
(`toMeetingDto` keeps its name), `FACT-3382`, `FACT-3706`, `FACT-3716`, `FACT-3724`, `FACT-1067`.
At T7b: `FACT-0071` cites `FACT-3738`, not `FACT-3719`.

**Living citations of a key retired at T7a, gone before it (`AR-API-14`):** `3704` in
`meetings-service.access.ts` (deleted, T6); `3720` in the skill (reworded to a name, T8); `FACT-0060`
and `3720` in the `FT-008` row (T9). **Of the eight, re-pointed only in T7b's commit:** the skill
(`3701`, `3718`, `3719`); `architecture.api.cases.md`, `meeting-files.unit.cases.md`; the comments and
messages of `architecture.api.spec.ts` (`3701`, `3702`, `3719`); comments in `meeting-file.ts` and the
four moved files (`3718`, `3719`); the `FT-008` (`3718`, `3719`), `CH-034` (`3719`) and `BL-043`
(`3718`) rows.

## 4. Tasks

| ID  | What to do                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Files                                                                                                                                                                                                                                    | Done when                                                                                                                                                                                                      | Depends on                    |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| T1  | `test-designer`: unit cases for `Meeting.create`/`restore` (§3 values), next free `HD-UT-`; rehome `MF-UT-21` (assertion verbatim, new ID, §6); `AR-API-18` cases for `FACT-3733`'s five fixture forms — allowed `application/`→`src/shared/application/`, `domain/`→`src/shared/domain/`; forbidden `application/`→`src/shared/infrastructure/`, `domain/`→`src/shared/application/`, `application/`→`src/shared/domain/` — and a walk-reach step (a file under `src/shared/application/` is walked), the same step for `AR-API-19`; the eight keys stay cited until T7b                                | `e2e/regression/home-dashboard/home-dashboard.unit.cases.md`, `e2e/regression/meeting-files/meeting-files.unit.cases.md`, `e2e/architecture/architecture.api.cases.md`                                                                   | cases written; pairing for the moved spec named                                                                                                                                                                | —                             |
| T2  | `tester-unit`: `meeting.spec.ts`, red first; `git mv` the uuid spec to the shared kernel, title to the successor ID, body unchanged                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `apps/api/src/meetings/domain/meeting.spec.ts`, `apps/api/src/{meeting-files→shared}/infrastructure/crypto-uuid-source.spec.ts`                                                                                                          | each case red for its stated reason; the moved spec red only on its unresolved import                                                                                                                          | T1                            |
| T2b | `tester-api`: `AR-API-18` resolver admits exactly `FACT-3732`'s prefixes — `src/shared/domain/` from `domain/`, `src/shared/application/` from `application/`; fixture +2 allowed, +3 forbidden (T1's five forms; the fixture is a temp tree, so the empty `src/shared/domain/` is still exercised); walk-reach step in `AR-API-18` and `AR-API-19`                                                                                                                                                                                                                                                      | `e2e/architecture/architecture.api.spec.ts`                                                                                                                                                                                              | fixture steps green; walk-reach step red until T3a, naming `src/shared/application/`                                                                                                                           | T1                            |
| T3a | `implementer-api`: shared kernel — `git mv` `clock.ts`, `uuid-source.ts` to `src/shared/application/`, `system-clock.ts`, `crypto-uuid-source.ts` to `src/shared/infrastructure/`, bodies unchanged; re-point `meeting-files`' imports; comment keys unchanged until T7b; tokens stay in `meeting-files.tokens.ts`                                                                                                                                                                                                                                                                                       | `apps/api/src/shared/**`, `meeting-files/application/{clock,uuid-source,upload-meeting-file}.ts`, `meeting-files/infrastructure/{system-clock,crypto-uuid-source}.ts`, `meeting-files.module.ts`, `meeting-files/domain/meeting-file.ts` | moved spec and `MF-UT-11`…`20` green; `AR-API-18`/`19` green incl. walk-reach; `pnpm typecheck`                                                                                                                | T2, T2b                       |
| T3  | `implementer-api`: domain — `Meeting` (private ctor, `create`, `restore`, `StoredMeeting`), `limits.ts` (DTO numbers, defaults 3 and 60), `MeetingError` base + `MeetingNotFoundError`; DTOs import the limits                                                                                                                                                                                                                                                                                                                                                                                           | `meetings/domain/{meeting,limits,meeting.errors}.ts`, `meetings/dto/*.ts`                                                                                                                                                                | `domain/meeting.spec.ts` green; `pnpm typecheck`                                                                                                                                                               | T2                            |
| T4  | `implementer-api`: application — `MeetingRepository` (`findRecentByOwner`, `countByOwner`, `findOwnedById`, `save`), `ListMeetings`, `CreateMeeting` (shared `UuidSource`), `GetMeeting`; no port of its own for the uuid                                                                                                                                                                                                                                                                                                                                                                                | `meetings/application/*.ts`                                                                                                                                                                                                              | no decorator; imports only own layers and `src/shared/application/`; `AR-API-18` green; `pnpm typecheck`                                                                                                       | T3, T3a                       |
| T5  | `implementer-api`: adapters and root — `PrismaMeetingRepository`, `MeetingsErrorFilter` (owns `MEETING_NOT_FOUND_MESSAGE`, exhaustive `kind` switch), `meetings.tokens.ts` (own `UUID_SOURCE`), controller on use cases with `@UseFilters`, `toMeetingDto(Meeting)`, module (`useClass: CryptoUuidSource` from the kernel, `useFactory`, exports `GetMeeting`), seed type; class-level `@UseGuards(JwtAuthGuard)` stays (`FACT-2034`); `MeetingDto`/`MeetingsPageDto` to `meetings.mapper.ts`, `CreateMeetingInput` to `application/create-meeting.ts`; delete `meetings.service.ts`, `meeting.types.ts` | `meetings/infrastructure/*.ts`, `meetings/meetings.{controller,mapper,module,seed,tokens,error-filter}.ts`                                                                                                                               | lands with T6; T6's lint and typecheck cover it                                                                                                                                                                | T4                            |
| T6  | `implementer-api`: re-point `meeting-files` — rename the adapter to `GetMeetingAccess` in `infrastructure/get-meeting.access.ts`; `ownsMeeting` calls `GetMeeting.execute({ ownerId, id: meetingId })`, returns `true`, returns `false` on `instanceof MeetingNotFoundError`, rethrows anything else; filter imports the message from `meetings.error-filter.ts`                                                                                                                                                                                                                                         | `meeting-files/infrastructure/{meetings-service,get-meeting}.access.ts`, `meeting-files.module.ts`, `meeting-files.error-filter.ts`                                                                                                      | `pnpm lint`, `pnpm typecheck` green; no `MeetingsService` left in `apps/api/src`                                                                                                                               | T5, T3a                       |
| T7a | `implementer-api`: every §3a row marked 7a — A–L, the `FACT-0026`/`0059` re-points, rewordings and source fixes, `pnpm fact:lock`; B/C name `ADR-0035` as proposed; `apps/api/CLAUDE.md` rows for `meetings` and `src/shared/` (the `ADR-0035` shared kernel, layered and held by `AR-API-18`/`19`, unlike `src/common/`'s unlayered cross-feature helpers)                                                                                                                                                                                                                                              | `docs/architecture.md`, `docs/api-contract.md`, `docs/data-model.md`, `docs/adr/ADR-00{17,34}-*.md`, `docs/facts-lock.json`, `apps/api/CLAUDE.md`                                                                                        | before writing, a grep for each key it retires finds no hit outside registers, the lock and `docs/plans/` (§3a's first list); each retirement names a successor keyed in the same edit; `AR-API-11`…`17` green | T6, T8, T9                    |
| T7b | `implementer-api`, on the owner's acceptance relayed by the lead: `ADR-0035` status → accepted; the eight `ADR-0034` retirements; `FACT-0071` → `FACT-3738`; `pnpm fact:lock`. Paired, same commit, each by its file's role: `test-designer` the two cases docs, `tester-api` the spec's comments and messages, `implementer-api` the code comments, `pipeline-implementer` the skill, `tester-acceptance` the ledger rows (§3a's second list)                                                                                                                                                           | `docs/adr/ADR-00{34,35}-*.md`, `docs/adr/README.md`, `docs/architecture.md`, `docs/facts-lock.json`, plus §3a's second list                                                                                                              | `tester-acceptance`: a second `pnpm verify` exit 0; the `FT-` entry's window closed                                                                                                                            | T10, owner accepts `ADR-0035` |
| T8  | `pipeline-implementer`, approved (Q3): the skill cites `ADR-0035` as the style, `meeting-files` and `meetings` as examples, the shared kernel, the access adapter over an exported use case; its `FACT-3720` citation becomes a name; `implementer-api.md:28-29`. The eight keys stay until T7b                                                                                                                                                                                                                                                                                                          | `.claude/skills/clean-architecture/SKILL.md`, `.claude/agents/implementer-api.md`                                                                                                                                                        | no `FACT-3720` in either file; `AR-API-14` green                                                                                                                                                               | —                             |
| T9  | `tester-acceptance`: file the two rows in §6; reword `FT-008`'s `FACT-0060`/`3720` citations to names (Q4) and `BL-043`'s conflict text (§0)                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `docs/BACKLOG.md`, `docs/CHANGELOG.md`                                                                                                                                                                                                   | rows present, `ledger.api.spec.ts` green                                                                                                                                                                       | —                             |
| T10 | `tester-acceptance`: `regression-verify` — one `pnpm verify`; control experiment includes a `meetings/application/` file importing `src/shared/infrastructure/` (red on `AR-API-18`, reverted); `FT-` entry declaring the window (the eight keys describe per-module ports until T7b, as `FT-008` did); `BL-050` closed; run economics                                                                                                                                                                                                                                                                   | `docs/CHANGELOG.md`, `docs/BACKLOG.md`, `e2e/README.md`                                                                                                                                                                                  | `pnpm verify` exit 0 on the T7a state, no existing case weakened                                                                                                                                               | T2b, T7a, T8, T9              |
| F1… | fix tasks, numbered when found                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | —                                                                                                                                                                                                                                        | —                                                                                                                                                                                                              | —                             |

T2 and T2b run in parallel (different files and roles); T8 and T9 are parallel to T1–T6 and precede
T7a, whose fact E cites T9's row. T3a and T6 share `meeting-files.module.ts`; T9, T10 and T7b the
ledger files: sequential. The tree is red from T2 until T3/T3a and on the walk-reach step from T2b
until T3a; T1–T10 land in one feature commit, T7b in its own.

## 4a. Tests this change is expected to break

No existing expectation is weakened; T3a changes only imports and comments in the files
`MF-UT-11`…`20` test.

| Case ID     | Why it goes red                                                                     | Closed by task |
| ----------- | ----------------------------------------------------------------------------------- | -------------- |
| `AR-API-18` | fixture counts rise 13→16 forbidden, 5→7 allowed (owner, Q2); walk-reach step added | T2b, T3a       |
| `AR-API-19` | walk-reach step added; red until `src/shared/application/` exists                   | T3a            |

## 5. Risks

- `GetMeetingAccess` swallowing a non-domain error would turn a database fault into a 404; it
  rethrows everything but `MeetingNotFoundError` (T6).
- `MEETING_NOT_FOUND_MESSAGE` moving files: one copy only, or `ADR-0018`'s "byte-identical" splits.
- A string-prefix check would admit `src/shared/application-x/`; T2b compares on the directory plus
  `/`, as the existing resolver does.
- The owner declines `ADR-0035`: T7b never runs and the eight keys stay describing per-module ports
  while the code follows the shared kernel; that is a design revision, not a plan fix.

## 6. Assumptions, deliberate omissions and open questions

- Out of scope: the ten-file cap in a `Meeting` aggregate. **Row 1 for T9:** "Move the
  ten-file-per-meeting cap from `MeetingFile.upload`'s count argument into the `Meeting` aggregate
  now that both modules follow `ADR-0035`; couples `meetings` and `meeting-files`, needs its own
  ADR. Conflicts with: `ADR-0034` (`MeetingFile` thin by decision), `BL-043`."
- **Row 2 for T9**, pre-existing corpus defects not fixed here: "`FACT-2041` states milliseconds
  where the column is a `String`; `FACT-2035` names a wrong source path; `FACT-3100` cites a spec
  that does not exist; `apps/web/src/lib/dal.ts:27` comments on a `MeetingsService` default that no
  longer exists. Conflicts with: none."
- `MF-UT-21` handling (assumed; `test-designer` may choose otherwise): the line stays in
  `meeting-files.unit.cases.md` marked "moved to `MF-UT-22`", never reused; `MF-UT-22` holds the
  assertion verbatim for `apps/api/src/shared/infrastructure/crypto-uuid-source.spec.ts`, so
  `pnpm test:meeting-files` still runs it. A shared prefix would need a new `test:` script.
- Answered 2026-10-16: Q1 → `ADR-0035`; Q2 → shared kernel; Q3 → T8 approved; Q4 → T9 rewords.
- **Open questions for the owner:**
  1. (designer) `FACT-3734` binding: each module binds the shared adapter under its own `Symbol` token with `useClass`, and no shared Nest module exists. Is that the intended wiring?
  2. (designer) The literal allow-list of `FACT-3732` does not let `application/` import `src/shared/domain/`. Intended, or should `application/` reach it as `domain/` does?
     (T2b's fixture pins today's answer, forbidden; a yes flips that row and the counts.)
