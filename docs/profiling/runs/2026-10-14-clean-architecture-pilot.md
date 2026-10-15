# Run 2026-10-14 — `clean-architecture-pilot`

- **Flow:** `FEAT` · **Ledger:** `FT-008`; `BL-044` closed, `BL-049`…`BL-059` opened
- **Change folder:** `docs/plans/clean-architecture-pilot/`
- **Commit:** `pending` (an uncommitted working-tree diff at the time of this record)
- **Decisions taken:** `ADR-0034` (ports and adapters for `meeting-files`) — **proposed, not accepted**;
  plan task T7 (the status flip and the corpus retirements) waits for the owner
- **Shipped:** `meeting-files` in `apps/api` moved to `domain/` + `application/` + `infrastructure/`; a pure
  refactor with no HTTP contract change. New: `AR-API-18` and `MF-UT-11`…`20`; the `clean-architecture` skill.
- **Recorded at:** `FEAT-S8`, from the dispatch log `lead` kept; nothing was read from transcripts.

## Reading note

First dispatch 2026-10-14 14:40; the first `FEAT-S7` dispatch 2026-10-14 16:18; this re-run
2026-10-15 09:59. **Elapsed wall-clock for the whole cycle is not a clean figure**: first dispatch to this
re-run is about 19 h 19 min, but that span contains an overnight gap and a session restart, so it measures
the calendar, not the work. The agent-time below is the sum of per-dispatch durations (5,362 s = 89.4
min over the 27 measured dispatches); dispatches ran in parallel in places (#10 with #11, #13 with #14,
#16 with #17, #19 with #20), so it exceeds the elapsed time of the busy periods.

**What is not in the totals**, stated rather than estimated:

- Dispatch 30 (the first `FEAT-S7`/`FEAT-S8` dispatch) was interrupted by a session restart; its cost was
  not reported.
- Dispatch 31 (this one): cost unknown at writing.
- `FEAT-S6`: `lead`'s own runs, no token figure. Four runs, 84 s, 138 s, 155 s, 143 s wall-clock. A fifth,
  final `pnpm verify` runs after this dispatch over the finished tree; **its result is not known at writing**.
- Nested research sweeps inside `FEAT-S1` are not counted.

## Per stage

Tokens / tool calls / seconds are from the completion notices. `#` is the dispatch number in `lead`'s log.
Plan tasks with no stage ID of their own sit under the nearest defined stage with the task named: T0 (the
`ADR-0034` rewording) under `FEAT-S2`; T11 (the skill and `implementer-api` edit, a pipeline change) under
`FEAT-S4`; the two format fixes under the stage that owns the document; T16 (the control experiment) under
`FEAT-S7`.

| ID                  | Pass                                    | #   | Role / model                  | Tokens  | Calls   | Seconds     | Outcome                                                                    |
| ------------------- | --------------------------------------- | --- | ----------------------------- | ------- | ------- | ----------- | -------------------------------------------------------------------------- |
| `FEAT-S1`           | first                                   | 1   | researcher / opus             | 82,905  | 19      | 357         | shape blocker at `FEAT-G1` (history sweep incomplete)                      |
| `FEAT-G1`           | first                                   | 2   | research-reviewer / opus      | 151,560 | 73      | 285         | accept-after-blockers: 1 shape, 4 correction                               |
| `FEAT-S1`           | re-run (history sweep re-run on sonnet) | 3   | researcher / opus             | 116,067 | 46      | 340         | rework                                                                     |
| `FEAT-G1`           | re-run                                  | 4   | research-reviewer / opus      | 83,601  | 39      | 91          | accept                                                                     |
| `FEAT-S2`           | first                                   | 5   | designer / opus               | 190,651 | 26      | 641         | `design.md` ran to 423 lines against the design budget                     |
| `FEAT-G2`           | first                                   | 6   | design-reviewer / opus        | 151,183 | 38      | 308         | accept-after-blockers: 5 correction                                        |
| `FEAT-S2`           | correction                              | 7   | designer / opus               | 95,700  | 49      | 319         | rework                                                                     |
| `FEAT-S3`           | first                                   | 8   | planner / opus                | 137,524 | 31      | 361         |                                                                            |
| `FEAT-G3`           | first                                   | 9   | plan-reviewer / opus          | 111,939 | 29      | 262         | accept-after-blockers: 6 correction                                        |
| `FEAT-S3`           | correction                              | 10  | planner / opus                | 55,495  | 9       | 99          | rework                                                                     |
| `FEAT-S2`           | plan T0, `ADR-0034` rewording           | 11  | designer / opus               | 80,388  | 23      | 174         | caught a live `AR-API-14` failure in the ADR; parallel with #10            |
| `FEAT-S9`           | first (T1+T2)                           | 12  | test-designer / opus          | 138,766 | 23      | 451         |                                                                            |
| `FEAT-S10`          | first, units (T3)                       | 13  | tester-unit / sonnet          | 86,152  | 23      | 146         | parallel with #14                                                          |
| `FEAT-S10`          | first, api (T4)                         | 14  | tester-api / sonnet           | 73,498  | 11      | 153         |                                                                            |
| `FEAT-S4`           | first (T5+T6)                           | 15  | implementer-api / sonnet      | 138,821 | 53      | 242         | product code                                                               |
| `FEAT-S11`          | first (T8)                              | 16  | tester-api / sonnet           | 39,348  | 4       | 46          | parallel with #17                                                          |
| `FEAT-S4`           | plan T11 (skill + `implementer-api`)    | 17  | pipeline-implementer / sonnet | 76,088  | 10      | 82          | owner-approved pipeline edit                                               |
| `FEAT-S11`          | first (T9)                              | 18  | tester-security / opus        | 56,843  | 11      | 102         |                                                                            |
| `FEAT-S11`          | first (T10)                             | 19  | tester-functional / sonnet    | 42,594  | 3       | 43          | parallel with #20                                                          |
| `FEAT-G4`           | first                                   | 20  | code-reviewer / opus          | 161,640 | 73      | 322         | accept-after-blockers: 2 correction + 7 nits                               |
| `FEAT-S4`           | plan T11 correction (G4 nits)           | 21  | pipeline-implementer / sonnet | 40,358  | 6       | 21          | rework                                                                     |
| `FEAT-S4`           | correction (G4 blocker + nits)          | 22  | implementer-api / sonnet      | 43,068  | 13      | 66          | rework, product code                                                       |
| `FEAT-S9`           | correction (G4 blocker + nit)           | 23  | test-designer / opus          | 53,989  | 5       | 141         | rework                                                                     |
| `FEAT-S10`          | correction (G4 nit, `AR-API-18` Step 3) | 24  | tester-api / sonnet           | 40,874  | 7       | 75          | rework; assertion bite-checked                                             |
| `FEAT-S6`           | verify run 1                            | 25  | lead                          | n/a     | n/a     | 84          | exit 1: `format:check`, 4 docs                                             |
| `FEAT-S2`           | format fix                              | 26  | designer / opus               | 34,105  | 2       | 11          | rework                                                                     |
| `FEAT-S1`           | format fix                              | 27  | researcher / opus             | 39,996  | 2       | 16          | rework                                                                     |
| `FEAT-S6`           | verify runs 2, 3, 4                     | 28  | lead                          | n/a     | n/a     | 138/155/143 | run 2: 168 passed, 3 failed; run 3: 169 passed, 2 failed; **run 4 exit 0** |
| `FEAT-S7`           | T16 control experiment                  | 29  | tester-acceptance / sonnet    | 57,369  | 12      | 208         | `MF-UT-11`…`20` each red alone; `AR-API-18` real-file controls named       |
| `FEAT-S7`           | ledger + profiling, first               | 30  | tester-acceptance / sonnet    | n/a     | n/a     | n/a         | interrupted by a session restart; wrote `FT-008`, `BL-049`…`059`           |
| `FEAT-S7`/`FEAT-S8` | check + this record, re-run             | 31  | tester-acceptance / sonnet    | unknown | unknown | unknown     | this dispatch                                                              |
| `FEAT-S6`           | final verify over the finished tree     | 32  | lead                          | n/a     | n/a     | n/a         | result not known at writing                                                |

## Per-stage totals, summed by script

27 measured dispatches (#1–#24, #26, #27, #29). Summed by a script over the table's own figures, then
checked against `lead`'s sums for #1–#29, which agree exactly: **2,380,522 tokens, 640 tool calls, 5,362 s**.

| Stage      | Tokens  | Calls | Seconds |
| ---------- | ------- | ----- | ------- |
| `FEAT-S1`  | 238,968 | 67    | 713     |
| `FEAT-G1`  | 235,161 | 112   | 376     |
| `FEAT-S2`  | 400,844 | 100   | 1,145   |
| `FEAT-G2`  | 151,183 | 38    | 308     |
| `FEAT-S3`  | 193,019 | 40    | 460     |
| `FEAT-G3`  | 111,939 | 29    | 262     |
| `FEAT-S9`  | 192,755 | 28    | 592     |
| `FEAT-S10` | 200,524 | 41    | 374     |
| `FEAT-S4`  | 298,335 | 82    | 411     |
| `FEAT-S11` | 138,785 | 18    | 191     |
| `FEAT-G4`  | 161,640 | 73    | 322     |
| `FEAT-S7`  | 57,369  | 12    | 208     |

## The four numbers

1. **Discovery vs implementation.** Discovery (`FEAT-S1`…`FEAT-G3`, the frozen boundary):
   **1,331,114 tokens, 55.9%**. Pre-implementation (discovery plus `FEAT-S9` and `FEAT-S10`):
   **1,724,393, 72.4%**; the two figures overlap. The remainder (`FEAT-S4`, `FEAT-S11`, `FEAT-G4`,
   `FEAT-S7`): **656,129, 27.6%**. Of that, product code (#15, #22) is **181,889, 7.6%** of the total
   (`FT-003` measured 2.4%); `FEAT-S4` as a stage is larger (298,335) because it carries the T11 pipeline
   edit (#17, #21: 116,446).
2. **Rework share.** Dispatches #3, #4, #7, #10, #21, #22, #23, #24, #26, #27 (the set `lead` counted):
   **603,253 tokens, 25.3%** of 2,380,522. Two judgement calls: #4 is a gate re-run, counted as rework
   because `lead` counted it; #11 (T0) is not counted although it followed a correction, because it was
   new work, an ADR rewording rather than a redo of a stage. The set is not a clean "after a gate" split.
3. **Gate yield.** `FEAT-G1` 5 blockers (**1 shape**, 4 correction), accepted on re-run; `FEAT-G2` 5
   correction; `FEAT-G3` 6 correction; `FEAT-G4` 2 correction and 7 nits. 18 blockers and 7 nits over four
   gates, one of them a change of shape. Every gate returned accept-after-blockers on its first pass. Gate
   cost: 659,923 tokens (`#2`, `#4`, `#6`, `#9`, `#20`), 27.7% of the total. The verdict hook stored the
   gate verdicts as header-only files (`BL-057`), so `FEAT-G1`'s "Gaps to carry forward" reached the
   designer only through `lead`'s brief to the design reviewer. The counts above are from `lead`'s notes,
   not from stored verdicts.
4. **What found each defect.** No defect shipped, so no `FX-`. What caught what:
   - `FEAT-G1`: the incomplete history sweep (the only shape blocker).
   - Plan T0 (dispatch #11): a live `AR-API-14` failure inside `ADR-0034`.
   - `FEAT-G4`: the blocker fixed at #22/#23, and the `AR-API-18` Step 3 assertion (#24).
   - `FEAT-S6` run 1: `format:check` on four docs.
   - `FEAT-S6` runs 2 and 3: a web-project load or first-compile flake, failures moving between
     `MF-FN-07`/`09`/`12` and `AL-FN-02`/`04` while `apps/web` and `auth` were untouched; filed as `BL-058`,
     not a defect of this change.
   - The control experiment (#29): found one leg not exercised, `MF-UT-20`'s `instanceof Error` break was a
     SyntaxError and never ran.

## Acceptance numbers

`pnpm verify` run 4: exit 0 in 143 s on fresh servers; units api 37 / web 17; api boot 1/1; prettier clean;
**171 e2e passed**; audit passed (1 high ignored by config, 2 moderate). Four runs to get there: three red,
none a defect of this change. Three of four suite runs lost time to red results that were not defects
(one format, two flake).

## Observations, as facts rather than proposals

- Every gate returned accept-after-blockers on its first pass; only `FEAT-G1` had a shape blocker.
- Product code was 7.6% of the cycle; documents and the checks on them were the rest.
- `design.md` ran to 423 lines against the design budget.
- Three suite runs were lost: one to formatting, two to the web-project flake (`BL-058`).
- A session restart interrupted dispatch #30, which wrote the ledger rows and no profiling record; the record
  was written by the re-run. The cost of #30 and #31 is unrecorded.
- The verdict hook stored header-only verdict files (`BL-057`), so gate findings were carried by `lead`'s
  briefs rather than by the files.
- Not exercised in the cycle: the interactive browser check (no `apps/web` change).

## Addendum 2026-10-15 — the owner's decisions and the acceptance of `ADR-0034`

Appended by dispatch #45 (`FEAT-S7`/`FEAT-S8`, re-run after the owner's decisions of 2026-10-15). Append-only:
nothing above is changed, including the statements that were true at its writing (`ADR-0034` proposed, a
final verify not yet known). What this pass did: the owner accepted `ADR-0034` after the `Clock` and
`UuidSource` ports were added, plan task T7 was applied, the code review was re-run, and a second `pnpm verify`
went green. Session wall-clock about 10:10 to 13:30 on 2026-10-15 including waits; agent-time below is the sum
of dispatch durations, not elapsed time.

| ID                  | Pass                                         | #   | Role / model                  | Tokens  | Calls   | Seconds | Outcome                                                            |
| ------------------- | -------------------------------------------- | --- | ----------------------------- | ------- | ------- | ------- | ------------------------------------------------------------------ |
| `FEAT-S7`/`FEAT-S8` | check + record, re-run after session restart | 31  | tester-acceptance / sonnet    | 68,414  | 12      | 192     | its own cost, unknown when it wrote the record above; now reported |
| `FEAT-S6`           | verify, 2026-10-15                           | 32  | lead                          | n/a     | n/a     | 177     | exit 0, 172 e2e                                                    |
| `FEAT-S2`           | correction (owner decisions)                 | 33  | designer / opus               | 87,960  | 31      | 211     | rework                                                             |
| `FEAT-S9`           | correction (`MF-UT-15`/`16`)                 | 34  | test-designer / opus          | 42,391  | 5       | 86      | rework                                                             |
| `FEAT-S10`          | correction (`MF-UT-16` red)                  | 35  | tester-unit / sonnet          | 43,837  | 4       | 68      | rework                                                             |
| `FEAT-S4`           | correction + plan T7                         | 36  | implementer-api / sonnet      | 75,678  | 22      | 369     | rework, product code and corpus                                    |
| `FEAT-S4`           | plan T11 correction (skill)                  | 37  | pipeline-implementer / sonnet | 43,874  | 9       | 28      | rework                                                             |
| `FEAT-G4`           | code review, re-run                          | 38  | code-reviewer / opus          | 71,171  | 34      | 109     | accept-after-blockers: 3 correction                                |
| `FEAT-S4`           | correction                                   | 39  | implementer-api / sonnet      | 35,523  | 4       | 34      | rework, product code                                               |
| `FEAT-S4`           | plan T11 correction                          | 40  | pipeline-implementer / sonnet | 38,153  | 5       | 18      | rework                                                             |
| `FEAT-S2`           | correction                                   | 41  | designer / opus               | 51,559  | 13      | 55      | rework                                                             |
| `FEAT-S6`           | verify, red                                  | 42  | lead                          | n/a     | n/a     | 144     | exit 1: suite-integrity rule 7 only                                |
| `FEAT-S9`           | correction (rule 7)                          | 43  | test-designer / opus          | 36,872  | 3       | 70      | rework                                                             |
| `FEAT-S6`           | verify, green                                | 44  | lead                          | n/a     | n/a     | 107     | exit 0, 172 e2e                                                    |
| `FEAT-S7`/`FEAT-S8` | ledger addendum + this addendum              | 45  | tester-acceptance / sonnet    | unknown | unknown | unknown | this dispatch; cost unknown at writing                             |

**Arithmetic, summed by script.** Measured dispatches #33…#43 are 10 (#32, #42 and #44 are `lead`'s own
`pnpm verify` runs with no token figure): 527,018 tokens, 130 tool calls, 1,048 s, which agrees with
`lead`'s sums. Adding #31 (68,414 / 12 / 192): **595,432 tokens, 142 calls, 1,240 s** for this pass's 11
measured dispatches. Added to the 27 measured dispatches above (2,380,522 / 640 / 5,362): **new cycle total
2,975,954 tokens, 782 tool calls, 6,602 s (110.0 min) over 38 measured dispatches**. Not in the total: #30
(interrupted, unreported), #45 (unknown), and `lead`'s four verify runs of this pass (#32 177 s, #42 144 s,
#44 107 s are `lead` wall-clock; the earlier four are as stated above).

Pass by stage (tokens / calls / seconds, measured dispatches only): `FEAT-S2` 139,519 / 44 / 266 (#33, #41);
`FEAT-S9` 79,263 / 8 / 156 (#34, #43); `FEAT-S10` 43,837 / 4 / 68 (#35); `FEAT-S4` 193,228 / 40 / 449
(#36, #37, #39, #40); `FEAT-G4` 71,171 / 34 / 109 (#38); `FEAT-S7` 68,414 / 12 / 192 (#31, counted under
`FEAT-S7`/`FEAT-S8`).

**Facts of this pass.**

- Every measured dispatch of #33…#43 other than the gate re-run (#38) is a correction: 455,847 tokens, 76.6%
  of the pass's 595,432 and 15.3% of the new cycle total. The new cycle's rework share is therefore higher than
  the 25.3% stated above only if the whole pass is counted as rework, which would be a different set than
  `lead` used; the earlier figure is left as it was.
- Product code in this pass is #36 and #39 (111,201 tokens), plus #36's plan T7 corpus edits under the same
  dispatch.
- The final run before green was red on suite-integrity rule 7 alone: a unit case text naming an API case ID.
  One more `FEAT-S6` run, a `FEAT-S9` correction (#43) and 70 s were spent on it.
- The id uniqueness has no API case: `MF-API-01`'s `FILE_ID_PATTERN` covers the 8-4-4-4-12 shape, not the v4
  digits. Recorded in `FT-008`.
- Acceptance: `pnpm verify` of 2026-10-15 13:28, exit 0 in 107 s; units api 37 / web 17; boot 1/1; prettier
  clean; **e2e 172 passed**; audit passed (1 high ignored by config, 2 moderate).
