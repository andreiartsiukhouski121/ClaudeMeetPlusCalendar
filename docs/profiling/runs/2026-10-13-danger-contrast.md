# Run 2026-10-13 — `danger-contrast`

- **Flow:** `FIX`, full path (above `bugfix-pipeline` §4's threshold; `FIX-S8`…`FIX-S11` run)
- **Change folder:** `docs/plans/danger-contrast/`
- **Ledger:** `FX-049`, `BL-048`; same class as `FX-039` and `CH-029` (verdict at `FIX-S1`: a new
  defect)
- **Commit:** `pending` (an uncommitted working-tree diff at the time of this record)
- **Decisions taken:** `ADR-0033` (proposed; error and hover tokens measured). Corpus: `FACT-3684`
  to `FACT-3692`; `FACT-3558` retired by `FACT-3691`.
- **Recorded at:** `FIX-S11`, from the dispatch log `lead` kept; nothing was read from transcripts.

**Reading note.** First dispatch 2026-10-13 18:26:51 (+02:00), `FIX-S7` dispatch 19:01:50, last green
`pnpm verify` ended 19:10:55. Per-row figures are the completion notices `lead` logged. `lead`'s own
token use is **not measured** and is not in any total. The `FIX-S8` row has a nested `researcher`
history sweep on `haiku` whose cost is not visible to `lead`; it may or may not be inside that row's
figure, so the total is a floor.

## Per stage

Agent-time is the harness duration per dispatch, summed per row. `#` is the order in `lead`'s log.

| #   | ID        | Stage              | Role                   | Model    | Pass       |        Tokens |   Calls |               Agent-time | Outcome                                                                                                                               |
| --- | --------- | ------------------ | ---------------------- | -------- | ---------- | ------------: | ------: | -----------------------: | ------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `FIX-S1`  | Orientation        | `planner`              | `opus`   | first      |        50,856 |      11 |                   61.6 s | change folder and section 0; a new defect, same class as `FX-039` / `CH-029`                                                          |
| 2   | `FIX-S2`  | Reproduction       | `tester-functional`    | `sonnet` | first      |        68,136 |      11 |                  219.0 s | found the route-announcer race: probe 3/5 with a bare wait, 5/5 with a text wait                                                      |
| 3   | `FIX-S3`  | Cause              | `implementer-web`      | `sonnet` | first      |        52,474 |      12 |                   72.5 s | cause, both layers                                                                                                                    |
| 4   | `FIX-S4`  | Impact             | `planner`              | `opus`   | first      |        63,509 |      13 |                   96.2 s | P1; criteria 1, 2, 4 hold; corrected section 0's `ADR-0026` premise                                                                   |
| 5   | `FIX-S8`  | Research           | `researcher`           | `opus`   | first      |       117,409 |      45 |                  340.9 s | nested history sweep on `haiku` (cost not visible); researcher rewrote its output (cited the folder's own plan, misplaced a citation) |
| 6   | `FIX-S9`  | Design             | `designer`             | `opus`   | first      |       127,968 |      36 |                  376.4 s | `design.md`, `ADR-0033` (proposed), `FACT-3684`…`FACT-3692`                                                                           |
| 7   | `FIX-S10` | Plan               | `planner`              | `opus`   | first      |       119,504 |      28 |                  312.7 s | plan, 100 lines                                                                                                                       |
| 8   | `FIX-S5`  | Red test           | `test-designer`        | `opus`   | first      |        60,124 |      18 |                  113.4 s | `ACC-FN-03`, `ACC-FN-05` written; upload case sent back (see rework 1)                                                                |
| 9   | `FIX-S9`  | Design             | `designer`             | `opus`   | correction |        41,491 |      10 |                   28.1 s | **rework** — wrong upload error text, from row 8                                                                                      |
| 10  | `FIX-S10` | Plan               | `planner`              | `opus`   | correction |        51,168 |      10 |                   44.4 s | **rework** — same cause; ran in parallel with row 9                                                                                   |
| 11  | `FIX-S5`  | Red test           | `test-designer`        | `opus`   | correction |        40,998 |       9 |                   45.1 s | **rework** — `ACC-FN-06` written                                                                                                      |
| 12  | `FIX-S5`  | Red test           | `tester-functional`    | `sonnet` | first      |        59,789 |      14 |                  103.8 s | specs and a T3 doc correction; 15/15 red; one T3 line left in a `test-designer`-owned file                                            |
| 13  | `FIX-S5`  | Red test           | `test-designer`        | `opus`   | correction |        21,877 |       4 |                   16.1 s | **rework, failed** — see rework 2; ran in parallel with row 15                                                                        |
| 14  | `FIX-S5`  | Red test           | `test-designer`        | `opus`   | retry      |        25,488 |       3 |                   25.3 s | **rework** — one-sentence edit, verified by `git diff`                                                                                |
| 15  | `FIX-S6`  | Fix                | `implementer-web`      | `sonnet` | first      |        68,445 |      22 |                   85.6 s | 15/15 green; `FACT-3558` retired by `FACT-3691`                                                                                       |
| 16  | `FIX-S7`  | Acceptance + entry | `tester-acceptance`    | `sonnet` | first      |        59,492 |      14 |                  220.9 s | control experiment (leg 1 15/15 red; leg 2 5/15 red, all `ACC-FN-03`), `FX-049`, `BL-048`                                             |
| 17  | `FIX-S9`  | Design             | `designer`             | `opus`   | correction |        33,894 |       2 |                   10.4 s | **rework** — verify run 1 failed `format:check` on `docs/adr/README.md`                                                               |
| 18  | `FIX-S7`  | Acceptance + entry | `tester-acceptance`    | `sonnet` | correction |        35,137 |       4 |                   13.4 s | **rework** — verify run 2 failed `AR-API-14`: `FX-049` cited the retired `FACT-3558`                                                  |
|     | **Total** |                    | 7 roles, 18 dispatches |          |            | **1,097,759** | **266** | **2,185.8 s (36.4 min)** | excludes `lead`'s own cost and the nested `haiku` sweep if it is outside row 5                                                        |

### By stage

| Stage     | Dispatches |        Tokens | Share |   Calls |    Agent-time |
| --------- | ---------: | ------------: | ----: | ------: | ------------: |
| `FIX-S1`  |          1 |        50,856 |  4.6% |      11 |        61.6 s |
| `FIX-S2`  |          1 |        68,136 |  6.2% |      11 |       219.0 s |
| `FIX-S3`  |          1 |        52,474 |  4.8% |      12 |        72.5 s |
| `FIX-S4`  |          1 |        63,509 |  5.8% |      13 |        96.2 s |
| `FIX-S8`  |          1 |       117,409 | 10.7% |      45 |       340.9 s |
| `FIX-S9`  |          3 |       203,353 | 18.5% |      48 |       414.9 s |
| `FIX-S10` |          2 |       170,672 | 15.5% |      38 |       357.1 s |
| `FIX-S5`  |          5 |       208,276 | 19.0% |      48 |       303.7 s |
| `FIX-S6`  |          1 |        68,445 |  6.2% |      22 |        85.6 s |
| `FIX-S7`  |          2 |        94,629 |  8.6% |      18 |       234.3 s |
| **Total** |     **18** | **1,097,759** |  100% | **266** | **2,185.8 s** |

`FIX-S11` (this record) is written by the dispatch that produces it; its own cost is not measured
inside the record.

## Totals

| Figure                                     | Value                                                                                                                                                                                      |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tokens (sub-agents, measured)              | 1,097,759                                                                                                                                                                                  |
| Tool calls                                 | 266                                                                                                                                                                                        |
| Agent-time (sum of 18 dispatches)          | 2,185.8 s = 36.4 min                                                                                                                                                                       |
| Wall-clock, first dispatch to last green   | 18:26:51 to 19:10:55 = 44 min 04 s (2,644 s)                                                                                                                                               |
| Dispatches / roles                         | 18 dispatches across 7 roles (`planner`, `tester-functional`, `implementer-web`, `researcher`, `designer`, `test-designer`, `tester-acceptance`); plus one unmeasured nested `haiku` sweep |
| `lead`'s own `pnpm verify` runs (`FIX-S7`) | 3 runs, 249 s (40 + 85 + 124); no tokens, no dispatch (`CH-025`); not in the agent-time above                                                                                              |

The wall-clock is not a sum of rows: rows 9 and 10 ran in parallel, as did rows 13 and 15. Agent-time
(36.4 min) is below wall-clock (44.1 min) because `lead`'s own verify runs (4.2 min) and the gaps
between dispatches are not agent-time.

## The four numbers

### 1. Discovery vs implementation

The frozen `discovery` boundary is defined by `FEAT` IDs and is not reused for a `FIX` record.
Split here by stage ID instead: everything before the red test (`FIX-S1`…`FIX-S4`, `FIX-S8`…`FIX-S10`)
against `FIX-S5`…`FIX-S7`.

| Half                                                        |  Tokens | Share |
| ----------------------------------------------------------- | ------: | ----: |
| Before the red test (`FIX-S1`…`FIX-S4`, `FIX-S8`…`FIX-S10`) | 726,409 | 66.2% |
| Red test, fix, acceptance (`FIX-S5`…`FIX-S7`)               | 371,350 | 33.8% |

The fix itself (`FIX-S6`) is 68,445 tokens, 6.2%. The short path would have run `FIX-S1`…`FIX-S7`
only; the three added stages (`FIX-S8`, `FIX-S9`, `FIX-S10`, first passes only) are 364,881 tokens, 33.2% of the cycle, for a defect
whose fix was a token change plus a wait on the route announcer.

### 2. Rework share — 250,053 tokens, 22.8%

Every pass that is not `first`: rows 9, 10, 11, 13, 14, 17, 18 — 7 of 18 dispatches, 42 calls,
182.8 s (8.4% of agent-time). Rework is recorded against the stage reworked, not the catcher.

| Reworked stage | Rows | Rework tokens | Cause                                                                                                                                                                                             |
| -------------- | ---- | ------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FIX-S9`       | 9    |        41,491 | design and plan named an upload error text, "Choose a file to upload", unreachable from the UI (`MF-FN-15` says `file is required`); found by `test-designer` at `FIX-S5` writing the case        |
| `FIX-S10`      | 10   |        51,168 | the same wrong text, in the plan; run in parallel with row 9                                                                                                                                      |
| `FIX-S5`       | 11   |        40,998 | resumption of the upload case once the text was corrected: `ACC-FN-06` written                                                                                                                    |
| `FIX-S5`       | 13   |        21,877 | **tool gap**: `test-designer` holds `Write` and no `Edit`; asked for a one-line edit, it overwrote `auth-login.functional.cases.md` with a placeholder. `lead` restored it with `git checkout --` |
| `FIX-S5`       | 14   |        25,488 | the retry of row 13: one sentence, verified by `git diff`                                                                                                                                         |
| `FIX-S9`       | 17   |        33,894 | verify run 1 failed `format:check` on `docs/adr/README.md`: the row `pnpm adr:new` added was not formatted by prettier                                                                            |
| `FIX-S7`       | 18   |        35,137 | verify run 2 failed `AR-API-14`: `FX-049` cited `FACT-3558`, which `FACT-3691` had retired                                                                                                        |

Grouped by cause:

| Cause                                                     | Rows      |  Tokens | Share |
| --------------------------------------------------------- | --------- | ------: | ----: |
| Wrong fact carried from design into plan (upload text)    | 9, 10, 11 | 133,657 | 12.2% |
| Tool gap: Write-only role cannot make a one-line edit     | 13, 14    |  47,365 |  4.3% |
| Caught only by the whole-suite run (format, retired fact) | 17, 18    |  69,031 |  6.3% |

**Verify reruns.** Two of `lead`'s three `pnpm verify` runs were red: run 1 at `format:check`
(40 s, before any e2e) and run 2 at `AR-API-14` (85 s, 1 failed, 169 passed). They cost 125 s of
`lead`'s time and no measured tokens; the dispatches they triggered are rows 17 and 18, already
counted above. Run 3 was green: 124 s, exit 0, 170 e2e passed, units 17 web + 27 api + 1 supertest,
the audit gate passed (one high advisory ignored, pre-existing).

No rework was sent back by a gate: the defect flow has none. Three of the seven rework dispatches
(13, 17, 18) were caught mechanically (`git diff`, `format:check`, `AR-API-14`); rows 9, 10 and 11
were caught by a stage's own writer reading the plan against the UI.

### 3. Gate yield

Zero blockers at zero gates, by design: the defect flow carries no review gate (`docs/process.md`'s
`FIX` table). The cost of a gate's absence is visible in the rework table: the wrong upload text went
through `FIX-S8`, `FIX-S9` and `FIX-S10` uncontested and was found by the next stage that had to
write a case against it.

### 4. What found each defect

| Defect                                               | Found by                                                                                      |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| The defect itself, same class as `FX-039` / `CH-029` | `FIX-S1` orientation (class) and `FIX-S2` reproduction (the route-announcer race, 3/5 vs 5/5) |
| Wrong upload error text in design and plan           | `FIX-S5`, `test-designer` writing the case against `MF-FN-15`                                 |
| A cases file overwritten with a placeholder          | `lead`, noticing the result of the dispatch; restored with `git checkout --`                  |
| Unformatted `docs/adr/README.md` row                 | `pnpm verify` run 1, `format:check`                                                           |
| `FX-049` citing a retired fact                       | `pnpm verify` run 2, `AR-API-14`                                                              |

Control experiment (`FIX-S7`): leg 1 reverted the fix, 15/15 red; leg 2 5/15 red, all `ACC-FN-03`.

## Observations

Recorded as facts, not as proposals.

- The defect flow has no review gate; the three late reworks (rows 13, 17, 18) were caught
  mechanically.
- `test-designer`'s tool list (`Write`, no `Edit`) cannot make a one-line edit safely; the one time it
  was asked to, it destroyed a file. Category: tool gap, per `team-roles`.
- The added stages `FIX-S8`, `FIX-S9` and `FIX-S10` are a third of the cycle's tokens (364,881 on
  first passes alone) and are where the wrong upload text entered.
- Rework was 22.8% of tokens, against 29.3% and 31.8% in the two earlier measured `FEAT` records;
  the flows differ, so the figures are not a trend.
- The nested `haiku` sweep inside `FIX-S8` rewrote its output once (own plan cited, a citation
  misplaced), and its cost is not visible to `lead`.
