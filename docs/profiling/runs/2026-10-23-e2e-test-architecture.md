# Run 2026-10-23 — `e2e-test-architecture`

- **Flow:** `FEAT`, full path (`FEAT-S1`…`FEAT-S11`, all four gates ran)
- **Change folder:** `docs/plans/e2e-test-architecture/`
- **Ledger:** `CH-037` (closes `BL-068`). Post-acceptance, unrelated to the change: `CH-038` (`next` bump) and `FX-053`; `BL-074` opened by `FX-053`
- **Commit:** `pending` (an uncommitted working-tree diff at the time of this record)
- **Decisions taken:** `ADR-0036` (browser cases take a session from a pool user instead of signing in through the form) and `ADR-0037` (a pool of ten users claimed per test through `e2e/fixtures/suite.ts`). Cited from `CH-037`.
- **Shipped:** a rework of the e2e suite's test architecture: the pool, the claim and cleanup fixtures, the `e2e/api/` helper directory, the meta-test rules for the convention. The seed gained ten pool users and lost two. The one product-code row is `FEAT-S4` (T6+T7, the seed). No user-visible behaviour.
- **Recorded at:** `FEAT-S8`, from the dispatch log `lead` kept; nothing was read from transcripts. The gate figures are checked against the saved verdicts (below).

## Reading note

**Wall-clock.** First dispatch 2026-10-21 17:42; this dispatch (`FEAT-S8`) 2026-10-23 20:57. The
cycle was paused twice for the owner, so the calendar span says almost nothing about the work:

| Segment                                       | From → to                 |                                 Minutes |
| --------------------------------------------- | ------------------------- | --------------------------------------: |
| Active, first                                 | 10-21 17:42 → 18:47       |                                      65 |
| Paused for the owner (Q1, Q5)                 | 10-21 18:47 → 10-23 17:25 | 2,798 (46 h 38 min, overnight included) |
| Active, second                                | 10-23 17:25 → 17:42       |                                      17 |
| Paused for the owner (three questions, below) | 10-23 17:42 → 17:45       |                                       3 |
| Active, third (`FEAT-S7` dispatched at 20:34) | 10-23 17:45 → 20:57       |                                     192 |
| **Elapsed, first dispatch to this dispatch**  |                           |                 **3,075 (51 h 15 min)** |
| **Active wall-clock** (65 + 17 + 192)         |                           |                    **274 (4 h 34 min)** |
| **Owner wait** (2,798 + 3)                    |                           |                                   2,801 |

Agent-time below is the sum of the per-dispatch durations: **16,981 s = 283.0 min** over 55 rows. It
is 9 minutes above the active wall-clock, so the dispatches did not all run one after another: the
four `FEAT-S1` sweeps (rows 2–5) carry durations of their own, and the log does not say how much of
the researcher's 445 s they overlap. Agent-time is therefore a sum, not a timeline.

**What is not in the totals**, stated rather than estimated:

- `lead`'s own orchestration: no token figure.
- `lead`'s own `FEAT-S6` runs of `pnpm verify` (below): wall-clock only, no dispatch and no tokens.
- This dispatch (`FEAT-S8`): **not known at writing.**
- The sweeps' cost is in the rows (2–5), as separate completion notices; row 1 is the researcher
  itself.

Totals as written: **55 agents (51 dispatched by `lead`, 4 sweeps by `researcher`), ≈5,667.4k
tokens, 1,566 tool calls, 16,981 s.** The rows below sum to exactly these figures.

## Per stage

`#` is the row number in `lead`'s log. Tokens are in thousands as `lead` logged them. `r` = re-run,
`c` = correction, `f` = first pass.

| #   | ID                                        | Role                  | Model    | Pass       |           Tokens (k) | Calls | Seconds | Outcome / reason                                                       |
| --- | ----------------------------------------- | --------------------- | -------- | ---------- | -------------------: | ----: | ------: | ---------------------------------------------------------------------- |
| 1   | `FEAT-S1`                                 | `researcher`          | `opus`   | first      |                 84.0 |    16 |     445 |                                                                        |
| 2   | `FEAT-S1` sweep                           | `researcher-code`     | `sonnet` | first      |                100.8 |    23 |     256 |                                                                        |
| 3   | `FEAT-S1` sweep                           | `researcher-contract` | `sonnet` | first      |                 91.7 |    23 |     137 |                                                                        |
| 4   | `FEAT-S1` sweep                           | `researcher-tests`    | `sonnet` | first      |                127.0 |    31 |     191 |                                                                        |
| 5   | `FEAT-S1` sweep                           | `researcher-history`  | `haiku`  | first      |                107.7 |    25 |     152 |                                                                        |
| 6   | `FEAT-G1`                                 | `research-reviewer`   | `opus`   | first      |                123.9 |    42 |     205 | accept-after-blockers (1 shape, 3 correction)                          |
| 7   | `FEAT-S1`                                 | `researcher`          | `opus`   | re-run     |                167.9 |    60 |     482 | `FEAT-G1` shape blocker                                                |
| 8   | `FEAT-G1`                                 | `research-reviewer`   | `opus`   | re-run     |                100.1 |    28 |     116 | accept                                                                 |
| 9   | `FEAT-S2`                                 | `designer`            | `opus`   | first      |                251.2 |    57 |   1,128 |                                                                        |
| 10  | `FEAT-G2`                                 | `design-reviewer`     | `opus`   | first      |                139.4 |    48 |     435 | accept-after-blockers (4 shape, 2 correction; 2 owner questions)       |
| 11  | `FEAT-S2`                                 | `designer`            | `opus`   | re-run     |                183.9 |    60 |     751 | `FEAT-G2` shape blockers                                               |
| 12  | `FEAT-G2`                                 | `design-reviewer`     | `opus`   | re-run     |                 77.4 |    18 |     162 | accept (owner questions pending)                                       |
| 13  | `FEAT-S2`                                 | `designer`            | `opus`   | correction |                174.7 |    35 |     669 | owner answers Q1/Q5 and the cleanup rules                              |
| 14  | `FEAT-G2`                                 | `design-reviewer`     | `opus`   | re-run     |                 88.0 |    23 |     227 | accept-after-blockers (3 shape; 2 owner questions)                     |
| 15  | `FEAT-S2`                                 | `designer`            | `opus`   | correction |                145.4 |    56 |     491 | owner answers and a teardown-order blocker                             |
| 16  | `FEAT-G2`                                 | `design-reviewer`     | `opus`   | re-run     |                 73.7 |    17 |     123 | accept-after-blockers (1 correction)                                   |
| 17  | `FEAT-S2`                                 | `designer`            | `opus`   | correction |                 64.9 |    23 |     114 | `FEAT-G2` correction                                                   |
| 18  | `FEAT-S3`                                 | `planner`             | `opus`   | first      |                193.3 |    44 |     489 |                                                                        |
| 19  | `FEAT-G3`                                 | `plan-reviewer`       | `opus`   | first      |                138.3 |    46 |     414 | accept-after-blockers (1 shape, 3 correction)                          |
| 20  | `FEAT-S2`                                 | `designer`            | `opus`   | correction |                 52.7 |    12 |      50 | `FEAT-G3` finding: `architecture.md` rows                              |
| 21  | `FEAT-S3`                                 | `planner`             | `opus`   | re-run     |                 82.9 |    17 |     184 | `FEAT-G3` shape blocker                                                |
| 22  | `FEAT-G3`                                 | `plan-reviewer`       | `opus`   | re-run     |                 42.5 |     8 |      55 | accept                                                                 |
| 23  | `FEAT-S9` (T1)                            | `test-designer`       | `opus`   | first      |                237.1 |   116 |     591 |                                                                        |
| 24  | `FEAT-S10` (T2 probes)                    | `tester-api`          | `sonnet` | first      |                 86.2 |    23 |     349 |                                                                        |
| 25  | `FEAT-S2`                                 | `designer`            | `opus`   | correction |                 77.2 |    30 |     163 | T2 probe found a fixture-order gap                                     |
| 26  | `FEAT-S3`                                 | `planner`             | `opus`   | correction |                 56.4 |    10 |      69 | carry the T4 check                                                     |
| 27  | `FEAT-G2`                                 | `design-reviewer`     | `opus`   | re-run     |                 56.8 |    14 |     116 | accept (narrow)                                                        |
| 28  | `FEAT-S10` (T3)                           | `tester-api`          | `sonnet` | first      |                120.5 |    25 |     368 |                                                                        |
| 29  | `FEAT-S2`                                 | `designer`            | `opus`   | correction |                 53.4 |     9 |      67 | `FEAT-G2` narrow nits                                                  |
| 30  | `FEAT-S10` (T4)                           | `tester-api`          | `sonnet` | first      |                198.4 |    41 |     667 |                                                                        |
| 31  | `FEAT-S2`                                 | `designer`            | `opus`   | correction |                 53.7 |    15 |      83 | `AR-API-11`/`AR-API-12` found at T4                                    |
| 32  | `FEAT-S10` (T5)                           | `tester-api`          | `sonnet` | first      |                144.1 |    37 |     317 |                                                                        |
| 33  | `FEAT-S4` (T6+T7)                         | `implementer-api`     | `sonnet` | first      |                133.8 |    52 |     265 |                                                                        |
| 34  | `FEAT-S11` (T8)                           | `tester-functional`   | `sonnet` | first      |                135.9 |    40 |     239 |                                                                        |
| 35  | `FEAT-S11` (T9)                           | `tester-functional`   | `sonnet` | first      |                175.7 |    36 |     283 |                                                                        |
| 36  | `FEAT-S11` (T10)                          | `tester-security`     | `opus`   | first      |                181.1 |    48 |     433 |                                                                        |
| 37  | `FEAT-S11` (T11)                          | `tester-api`          | `sonnet` | first      |                192.7 |    42 |     287 |                                                                        |
| 38  | `FEAT-S11` (T11b)                         | `tester-api`          | `sonnet` | first      |                 76.2 |    18 |     133 |                                                                        |
| 39  | `FEAT-S11` (T12 warm-up measurement)      | `tester-api`          | `sonnet` | first      |                 85.0 |    37 |   2,479 | the longest row of the cycle                                           |
| 40  | `FEAT-S11` (ECONNRESET cause, not proven) | `implementer-api`     | `sonnet` | first      |                 51.8 |    18 |     527 | found at T12                                                           |
| 41  | `FEAT-S11` (T14 README)                   | `tester-acceptance`   | `sonnet` | first      |                 92.4 |    18 |      96 |                                                                        |
| 42  | `FEAT-S9`                                 | `test-designer`       | `opus`   | correction |                 23.3 |     5 |      22 | stale pointer                                                          |
| 43  | `FEAT-G4`                                 | `code-reviewer`       | `opus`   | first      |                242.1 |    81 |     422 | accept-after-blockers (3 correction, 10 nits per the log)              |
| 44  | `FEAT-S2`                                 | `designer`            | `opus`   | correction |                 40.8 |     4 |      34 | `FEAT-G4` correction (ADR facts)                                       |
| 45  | `FEAT-S7`                                 | `tester-acceptance`   | `sonnet` | correction |                 41.7 |     6 |      28 | `FEAT-G4` correction (backlog)                                         |
| 46  | `FEAT-S11`                                | `tester-security`     | `opus`   | correction |                 38.4 |     6 |      37 | `FEAT-G4` nit                                                          |
| 47  | `FEAT-S11`                                | `tester-functional`   | `sonnet` | correction |                 41.3 |     9 |      24 | `FEAT-G4` nit                                                          |
| 48  | `FEAT-S11`                                | `tester-api`          | `sonnet` | correction |                 43.6 |    20 |      42 | `FEAT-G4` nits                                                         |
| 49  | `FEAT-S9`                                 | `test-designer`       | `opus`   | correction |                 25.9 |     8 |      22 | `FEAT-G4` nits                                                         |
| 50  | `FEAT-S2`                                 | `designer`            | `opus`   | correction |                 37.1 |     7 |      24 | `FEAT-G4` follow-on                                                    |
| 51  | `FEAT-S6` fix                             | `tester-acceptance`   | `sonnet` | correction |                 40.9 |     4 |      29 | verify run 1: `format:check`                                           |
| 52  | `FEAT-S6` fix (`CH-038` `next` bump)      | `implementer-web`     | `sonnet` | first      |                 36.6 |     5 |      76 | verify run 2: audit, `next` advisory, **unrelated to the change**      |
| 53  | `FEAT-S6` fix (`FX-053`)                  | `implementer-web`     | `sonnet` | first      |                 47.4 |     8 |     115 | verify run 3: `MF-FN-15`/`ACC-FN-06` red after the bump, **unrelated** |
| 54  | `FEAT-S6` fix                             | `implementer-web`     | `sonnet` | correction |                 34.3 |     3 |      19 | verify run 4: `format:check`                                           |
| 55  | `FEAT-S7`                                 | `tester-acceptance`   | `sonnet` | first      |                154.2 |    59 |   1,279 | controls C1–C9, two verify runs, the ledger                            |
| —   | `FEAT-S8`                                 | `tester-acceptance`   | `sonnet` | first      | not known at writing |     — |       — | this dispatch                                                          |

Rows 1–55 total **≈5,667.4k tokens, 1,566 tool calls, 16,981 s (283.0 min)**.

### `lead`'s own `FEAT-S6` runs (no dispatch, no tokens)

| Run | Exit | Seconds | What it showed                                            |
| --- | ---: | ------: | --------------------------------------------------------- |
| #1  |    1 |      37 | `format:check`                                            |
| #2  |    1 |      83 | every test green; audit red on a `next` advisory (`GHSA`) |
| #3  |    1 |      96 | 193 of 195 e2e passed; `FX-053`                           |
| #4  |    1 |      34 | `format:check`                                            |
| #5  |    0 |      84 | green; 195 e2e in 47.5 s                                  |

`FEAT-S7`'s three runs: 117 s (red: `LG-API-07`, the entry's own ledger row), 85 s green, 85 s green.
Before the change: 91 / 97 / 99 s with 185 e2e tests. These figures belong to `e2e/README.md`, "Run
economics".

### By stage

Shares are of the all-rows total, 5,667.4k.

| Stage      | Dispatches |  Tokens (k) | Share |     Calls |   Agent-time |
| ---------- | ---------: | ----------: | ----: | --------: | -----------: |
| `FEAT-S1`  |          6 |       679.1 | 12.0% |       178 |      1,663 s |
| `FEAT-G1`  |          2 |       224.0 |  4.0% |        70 |        321 s |
| `FEAT-S2`  |         11 |     1,135.0 | 20.0% |       308 |      3,574 s |
| `FEAT-G2`  |          5 |       435.3 |  7.7% |       120 |      1,063 s |
| `FEAT-S3`  |          3 |       332.6 |  5.9% |        71 |        742 s |
| `FEAT-G3`  |          2 |       180.8 |  3.2% |        54 |        469 s |
| `FEAT-S9`  |          3 |       286.3 |  5.1% |       129 |        635 s |
| `FEAT-S10` |          4 |       549.2 |  9.7% |       126 |      1,701 s |
| `FEAT-S4`  |          1 |       133.8 |  2.4% |        52 |        265 s |
| `FEAT-S11` |         11 |     1,114.1 | 19.7% |       292 |      4,580 s |
| `FEAT-G4`  |          1 |       242.1 |  4.3% |        81 |        422 s |
| `FEAT-S7`  |          2 |       195.9 |  3.5% |        65 |      1,307 s |
| `FEAT-S6`  |          4 |       159.2 |  2.8% |        20 |        239 s |
| **Total**  |     **55** | **5,667.4** |  100% | **1,566** | **16,981 s** |

(The shares sum to 100.3% by rounding.) `FEAT-S5` is retired and has no row; `FEAT-S8` is written by
this dispatch.

## The post-acceptance work, separated from the change's own cost

Rows 52 and 53 are not this change's work. The audit went red on a `next` advisory
(`GHSA-673q-mjm6-r5xr`) that no line of this change touched, and the bump then broke two cases
(`MF-FN-15`, `ACC-FN-06`). Their entries are `CH-038` and `FX-053`.

| Block                                    |  Tokens (k) |     Calls |                  Seconds |
| ---------------------------------------- | ----------: | --------: | -----------------------: |
| Unrelated: rows 52 + 53                  |        84.0 |        13 |                      191 |
| The change's own cost: rows 1–51, 54, 55 | **5,583.4** | **1,553** | **16,790 s (279.8 min)** |

Rows 52 and 53 are **1.5% of all tokens** (84.0 / 5,667.4). They also caused `lead`'s verify runs #2
and #3 (83 s and 96 s). Row 54 is a correction (`format:check`, verify run 4) listed by the log under
`FEAT-S6 fix`; the log does not say which of the two sets of files it formatted, so it stays in the
change's own block here. Moving it to the unrelated block would take the rework share below from
34.4% to about 34.0%.

**The change's own cost is the denominator for every share below** unless it says "of all tokens".

## The four numbers

### 1. Discovery vs implementation

Denominator: the change's own 5,583.4k.

- **Discovery** (`FEAT-S1`…`FEAT-G3`, the frozen boundary): 679.1 + 224.0 + 1,135.0 + 435.3 + 332.6 +
  180.8 = **2,986.8k, 53.5%** (52.7% of all tokens).
- **Pre-implementation** (discovery plus `FEAT-S9` and `FEAT-S10`; the two overlap, `discovery` is
  the frozen one): 2,986.8 + 286.3 + 549.2 = **3,822.3k, 68.5%** (67.4% of all tokens).
- **Product code** (`FEAT-S4`, row 33, T6+T7): **133.8k, 2.4%** of the change's own cost (2.4% of all
  tokens). It is the seed change only.
- **Test work** (`FEAT-S9` + `FEAT-S10` + `FEAT-S11`): 286.3 + 549.2 + 1,114.1 = **1,949.6k, 34.9%**.
  `FEAT-S11` holds one product-role row (40, `implementer-api`, 51.8k, the ECONNRESET cause); without
  it test work is 1,897.8k, 34.0%.
- **Gates** (`FEAT-G1`…`FEAT-G4`): 224.0 + 435.3 + 180.8 + 242.1 = **1,082.2k, 19.4%**, 2,275 s.

### 2. Rework share

**Which rows count**, stated so the arithmetic can be redone: every row whose pass is re-run or
correction (27 rows), grouped by what triggered it. Recorded against the stage reworked, with the
re-review rows shown on their own line because they carry the gate's ID.

| Bucket                                                                      | Rows                                              |  Count |  Tokens (k) |   Seconds |
| --------------------------------------------------------------------------- | ------------------------------------------------- | -----: | ----------: | --------: |
| Stage re-run or correction **after a review gate**                          | 7, 11, 17, 20, 21, 29, 44, 45, 46, 47, 48, 49, 50 |     13 |       874.5 |     1,859 |
| Correction after **owner answers** (row 15 also a `FEAT-G2` blocker)        | 13, 15                                            |      2 |       320.1 |     1,160 |
| Correction after a finding **in test work** (T2 probe, T4 meta-test, carry) | 25, 26, 31                                        |      3 |       187.3 |       315 |
| Correction, trigger not stated in the log ("stale pointer")                 | 42                                                |      1 |        23.3 |        22 |
| **Re-reviews** (gate re-runs)                                               | 8, 12, 14, 16, 22, 27                             |      6 |       438.5 |       799 |
| **Fixes after acceptance runs** (`format:check`)                            | 51, 54                                            |      2 |        75.2 |        48 |
| **Total**                                                                   |                                                   | **27** | **1,918.9** | **4,203** |

Arithmetic: 874.5 + 320.1 + 187.3 + 23.3 + 438.5 + 75.2 = **1,918.9k**. 1,918.9 / 5,583.4 =
**34.4% of the change's own cost** (33.9% of all tokens). Without the re-reviews, as a narrower
figure: 1,480.4k, **26.5%**. Rows 52 and 53 are first passes of unrelated work and are not rework.

Of the re-reviews, `FEAT-G2` carries four of six (rows 12, 14, 16, 27: 295.9k). `FEAT-S2` carries **10 of the 27** rework rows by itself (rows 11, 13, 15, 17, 20, 25, 29, 31, 44, 50: one re-run and nine corrections, 883.8k); its first pass (row 9) is 251.2k.

### 3. Gate yield

From the saved verdicts in `docs/profiling/verdicts/`. **There are 10 verdict files, one per gate
dispatch (rows 6, 8, 10, 12, 14, 16, 19, 22, 27, 43), not 11** as the brief for this record stated;
the log has 10 gate rows and the directory has 10 files.

| Gate      | Pass (row)  | Verdict               | Shape | Correction |   Nits | File (`2026-10-2*-e2e-test-architecture-`) |
| --------- | ----------- | --------------------- | ----: | ---------: | -----: | ------------------------------------------ |
| `FEAT-G1` | first (6)   | accept-after-blockers |     1 |          3 |      6 | `feat-g1-a9600313`                         |
| `FEAT-G1` | re-run (8)  | accept                |     0 |          0 |      2 | `feat-g1-ace5ad69`                         |
| `FEAT-G2` | first (10)  | accept-after-blockers |     4 |          2 |      9 | `feat-g2-aee513ec`                         |
| `FEAT-G2` | re-run (12) | accept                |     0 |          0 |      5 | `feat-g2-a3d18a5e`                         |
| `FEAT-G2` | re-run (14) | accept-after-blockers |     3 |          0 |      4 | `feat-g2-ad90fecf`                         |
| `FEAT-G2` | re-run (16) | accept-after-blockers |     0 |          1 |      3 | `feat-g2-a97b7178`                         |
| `FEAT-G2` | re-run (27) | accept                |     0 |          0 |      5 | `feat-g2-ae6e0321`                         |
| `FEAT-G3` | first (19)  | accept-after-blockers |     1 |          3 |      7 | `feat-g3-a263bf99`                         |
| `FEAT-G3` | re-run (22) | accept                |     0 |          0 |      2 | `feat-g3-a26070e3`                         |
| `FEAT-G4` | first (43)  | accept-after-blockers |     0 |          3 |      7 | `feat-g4-a07f0005`                         |
| **Total** |             |                       | **9** |     **12** | **50** |                                            |

21 blockers, 9 of which changed the shape rather than the prose. By gate: `FEAT-G1` 1 shape + 3
correction; `FEAT-G2` 7 shape + 3 correction; `FEAT-G3` 1 shape + 3 correction; `FEAT-G4` 0 shape + 3
correction. Counts are of the `- blocker` and `- nit` lines in each file's verdict block. The log
recorded 10 nits for `FEAT-G4` (row 43); its verdict block lists 7, and this record carries the file's
figure.

Every gate's first pass returned accept-after-blockers. `FEAT-G2` took five passes, the most of any
gate; passes 3 and 4 (rows 14 and 16) each raised new blockers after an accept. Two of the shape
blockers there were findings about the design's own rules, not about prose:
`feat-g2-ad90fecf` (the rule-12 test shape `catch (e) { throw e; } finally {...}` is an ESLint
`no-useless-catch` error, which would turn `pnpm lint`, and so `pnpm verify`, red) and
`feat-g2-a97b7178` (rules 11 and 12 as written would fail three specs the design keeps).

### 4. What found each defect

| What found it                     | Rows / defects                                                                                                                                  |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| A review gate, by reading         | `FEAT-G1`…`FEAT-G4`: 21 blockers, 50 nits (above); `FEAT-G4` also found stale `ADR-0036`/`ADR-0037` facts (`feat-g4-a07f0005`)                  |
| A red-test probe (T2)             | row 25: a fixture-order gap in the design                                                                                                       |
| A meta-test at T4                 | row 31: `AR-API-11`/`AR-API-12` found the design's corpus facts                                                                                 |
| A measurement run (T12)           | row 40: ECONNRESET cause not proven, from the warm-up measurement in row 39; `FEAT-G4` then found the backlog item missing (`feat-g4-a07f0005`) |
| `pnpm verify` (`lead`, `FEAT-S6`) | run 1 and run 4: `format:check` (rows 51, 54); run 2: the `next` advisory (`CH-038`); run 3: `MF-FN-15`/`ACC-FN-06` red, `FX-053`               |
| `pnpm verify` (`FEAT-S7`)         | `LG-API-07`, the ledger row of the entry being written, red in the first of three runs (117 s)                                                  |
| An owner question                 | `FEAT-G2` first pass raised Q1 and Q5; the second pause raised three more (below)                                                               |

## Owner-question pauses

Four sets of owner questions and two pauses, per the log:

- **Pause 1**, 10-21 18:47 → 10-23 17:25 (2,798 min): the Q1 and Q5 set, raised by `FEAT-G2`'s first
  pass (row 10, "2 owner questions", `feat-g2-aee513ec`; Q1 and Q5 set settled decisions against each
  other). Row 12 accepted with the questions pending. Row 13 carries the answers.
- **Pause 2**, 10-23 17:42 → 17:45 (3 min): three questions: shared preconditions against the claim,
  the lint/`catch` shape, and the scope of rule 12. Rows 14 and 16 (`feat-g2-ad90fecf`,
  `feat-g2-a97b7178`) hold the findings behind them.

The two corrections that carry owner answers (rows 13 and 15) are **320.1k tokens, 1,160 s**, counted
in the rework table above and not removed from it. The owner's wait is not agent time: the 2,801 minutes
of waiting are in the elapsed figure and in none of the 16,981 s.

## Acceptance numbers

`lead`'s `FEAT-S6`: five `pnpm verify` runs, four red and one green (84 s, 195 e2e in 47.5 s); the
four reds are listed above. `FEAT-S7`'s three runs: 117 s (red), 85 s, 85 s (both green). Before the
change the verify runs took 91 / 97 / 99 s with 185 e2e tests; after, 85 s with 195. These figures are
in `e2e/README.md`, "Run economics", which owns them.

## Observations, as facts rather than proposals

- `FEAT-S2` is the largest single stage (1,135.0k, 20.0% of all tokens) and holds 11 of the 55 rows,
  ten of them corrections or re-runs after the first pass. `FEAT-S11` is next at 1,114.1k (19.7%)
  across 11 rows.
- Product code (`FEAT-S4`) is one row, 133.8k, 2.4%; discovery is 53.5% and test work 34.9% of the
  change's own cost.
- `FEAT-G2` raised new blockers on two of its four passes after the first (rows 14 and 16), after an accept at row 12; the saved verdicts name `no-useless-catch` and the three specs that import `test as apiTest`.
- Every gate's first pass returned accept-after-blockers; `FEAT-G4` raised only corrections, three of
  them stale facts or a missing backlog item in documents (`feat-g4-a07f0005`), and its nit count in the
  log (10) differs from its file (7).
- The longest row is 2,479 s (row 39, the T12 warm-up measurement); the cause row 40 chased was not
  proven.
- `FEAT-S6` lost four of five runs: two to `format:check` (rows 51, 54), two to causes outside the
  change (the `next` advisory, `FX-053`), 84.0k tokens and two verify runs of 179 s together.
- `FEAT-S7`'s first `pnpm verify` was red on `LG-API-07`, the entry's own ledger row (117 s).
- Not stated by the log and therefore not in this record: the sweeps' overlap with the researcher's
  row, `lead`'s orchestration cost, and this dispatch's own cost.
- Corpus and interactive check: whether the corpus moved, whether any fact was reworded and locked
  with `pnpm fact:lock` rather than retired, and whether an interactive browser check ran, are
  `FEAT-S6`/`FEAT-S7` facts that the dispatch log does not carry; this record does not state them.
