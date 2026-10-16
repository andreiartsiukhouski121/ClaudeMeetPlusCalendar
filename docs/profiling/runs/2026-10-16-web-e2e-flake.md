# Run 2026-10-16 — `web-e2e-flake`

- **Flow:** `FIX`, full path (`bugfix-pipeline` §4 criterion 1: the cause was not found in about 15 minutes; `FIX-S8`…`FIX-S11` ran)
- **Change folder:** `docs/plans/web-e2e-flake/`
- **Ledger:** `FX-052`; `BL-058` closed, `BL-063`…`BL-067` opened. Verdict at `FIX-S1`: known as `BL-058`, not a regression of an earlier `FX-` fix
- **Commit:** `pending` (an uncommitted working-tree diff at the time of this record)
- **Decisions taken:** none. No ADR (the web server stays `next dev`), and no fact moves in the corpus: stated by the designer and the planner.
- **Shipped:** a serial `globalSetup` warm-up, `e2e/fixtures/warm-up.ts`, wired in `playwright.config.ts`. No product code, no spec, no `.cases.md`.
- **Recorded at:** `FIX-S11`, from the dispatch log `lead` kept; nothing was read from transcripts.

## Reading note

First dispatch 2026-10-16 15:16:42; this dispatch 16:52:12. **Elapsed wall-clock for the cycle: 95 min
30 s.** Agent-time below is the sum of the per-dispatch durations: **5,195 s = 86.6 min** over 7
measured dispatches, so the two figures are close because the dispatches ran one after another.

**What is not in the totals**, stated rather than estimated:

- The `FIX-S8` row (#3) ran three nested sweeps (history on `haiku`, code on `sonnet`, tests on
  `sonnet`). Their cost is not in `lead`'s completion notice, so the total is a floor.
- Dispatch #2 (`FIX-S3`) resumed once on its own background work; its interim notice read 63,954
  tokens / 27 calls / 715 s, and the row carries the later one. Dispatch #6 (`FIX-S6`) was an interim
  notice, because that agent had background work. Both rows are lower bounds.
- `lead`'s own orchestration and its four `pnpm verify` runs (below): no token figure.
- This dispatch (`FIX-S7` writing part and `FIX-S11`): **not known at writing.**

`FIX-S1` and `FIX-S4` were folded into the plan by `lead` (no separate dispatch), so they have no row.
The flow carries no review gate, so there is no gate row: the red procedure and the control experiment
stood in.

## Per stage

`#` is the dispatch number in `lead`'s log.

| #   | ID        | Stage              | Role                | Model    | Pass       |               Tokens | Calls |           Seconds | Outcome                                                                                                                                                                                           |
| --- | --------- | ------------------ | ------------------- | -------- | ---------- | -------------------: | ----: | ----------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `FIX-S2`  | Reproduction       | `tester-functional` | `sonnet` | first      |               75,657 |    31 |             1,808 | 11 Playwright runs and 6 probe bursts; red 3 of 5 under 7 busy-loops at default workers, unloaded green 3 of 3                                                                                    |
| 2   | `FIX-S3`  | Cause              | `implementer-web`   | `sonnet` | first      |               65,682 |    30 |               748 | direct probes, no Playwright runs; resumed once                                                                                                                                                   |
| 3   | `FIX-S8`  | Research           | `researcher`        | `opus`   | first      |               71,285 |    18 |               206 | three nested sweeps, cost not in the notice                                                                                                                                                       |
| 4   | `FIX-S9`  | Design             | `designer`          | `opus`   | first      |               70,231 |    11 |               150 | about 70 lines against a 50-line budget; no ADR                                                                                                                                                   |
| 5   | `FIX-S10` | Plan               | `planner`           | `opus`   | first      |               78,922 |    13 |               154 | `FIX-S1` and `FIX-S4` folded in by `lead`                                                                                                                                                         |
| 6   | `FIX-S6`  | Fix                | `tester-functional` | `sonnet` | first      |              103,481 |    40 |             2,118 | plan tasks T1–T3 merged into one dispatch by `lead`; carries the `FIX-S5` red evidence (the load procedure, no new case ID) and the `FIX-S7` control experiment; interim notice (background work) |
| 7   | `FIX-S9`  | Design             | `designer`          | `opus`   | correction |               33,212 |     2 |                11 | **rework** — verify run 1 failed `format:check` on `docs/plans/web-e2e-flake/design.md`                                                                                                           |
| 8   | `FIX-S7`  | Acceptance + entry | `tester-acceptance` | `sonnet` | first      | not known at writing |     — |                 — | this dispatch: `FX-052`, backlog rows, "Run economics", this record                                                                                                                               |
| —   | `FIX-S7`  | Acceptance runs    | `lead`, no dispatch | —        | —          |                  n/a |   n/a | 68 / 91 / 97 / 99 | verify run 1 red at `format:check` (68 s); runs 2–4 green, 173 passed each                                                                                                                        |

Rows #1–#7 total **498,470 tokens, 145 tool calls, 5,195 s (86.6 min)**.

### By stage

| Stage     | Dispatches |      Tokens | Share |   Calls |  Agent-time |
| --------- | ---------: | ----------: | ----: | ------: | ----------: |
| `FIX-S2`  |          1 |      75,657 | 15.2% |      31 |     1,808 s |
| `FIX-S3`  |          1 |      65,682 | 13.2% |      30 |       748 s |
| `FIX-S8`  |          1 |      71,285 | 14.3% |      18 |       206 s |
| `FIX-S9`  |          2 |     103,443 | 20.8% |      13 |       161 s |
| `FIX-S10` |          1 |      78,922 | 15.8% |      13 |       154 s |
| `FIX-S6`  |          1 |     103,481 | 20.8% |      40 |     2,118 s |
| **Total** |      **7** | **498,470** |  100% | **145** | **5,195 s** |

`FIX-S1`, `FIX-S4` and `FIX-S5` have no row of their own (folded or carried, above); `FIX-S7` and
`FIX-S11` are written by the dispatch that produces them.

## The four numbers

1. **Discovery vs implementation.** The frozen `discovery` boundary is a `FEAT` definition and is not
   applied to a `FIX` record. By stage: everything before the fix (`FIX-S2`, `FIX-S3`, `FIX-S8`,
   `FIX-S9` both passes, `FIX-S10`) is **394,989 tokens, 79.2%**; the fix with its red evidence and
   control experiment (`FIX-S6`) is **103,481, 20.8%**. The fix itself is 3 lines in
   `playwright.config.ts` and one new fixture file. By time the shares differ: reproduction and the
   fix dispatch are 3,926 s of 5,195 s, 75.6% of agent-time, because both were long run loops.
2. **Rework share.** One dispatch, #7 (`FIX-S9` correction): **33,212 tokens, 6.7%** of 498,470. It was
   a correction after an acceptance run, not after a review gate. `FIX-S6`'s control experiment ran
   red once in three, on purpose, and is not rework.
3. **Gate yield.** Zero, by design: the defect flow carries no review gate (`docs/process.md`'s `FIX`
   table). Gate cost: none.
4. **What found each defect.**
   - The cause itself: `pnpm verify` during the unrelated acceptance runs of `clean-architecture-pilot`
     and `meetings-clean-architecture`; reproduced by a CPU-load procedure, since no test covered
     concurrent first compiles under `next dev`.
   - The only defect introduced during the cycle: `design.md` unformatted, found by `pnpm verify` run 1
     at `format:check`.
   - The control experiment (`globalSetup` commented out) went red on run 3 of 3 (`AL-FN-13`, stayed on
     `/auth/login` for 10 s), so the warm-up is exercised by the load procedure.
   - `lead` found 7 busy-loop processes still running after the `FIX-S6` hand-back said none remained,
     and stopped them before acceptance.

## Acceptance numbers

Fix under load (7 busy-loops, `pnpm e2e --project=web`), 5 of 5 green, run times 121 / 179 / 129 / 156 /
99 s. `pnpm verify`: run 1 red at `format:check` (68 s), runs 2, 3 and 4 green at **91 s / 97 s / 99 s**,
each `173 passed` with the e2e step at 53.8 s / 1.0 min / 57.8 s. The warm-up costs about 6.2 s per run on
an unloaded, fresh `.next`. These figures are in `e2e/README.md`, "Run economics", which owns them.

## Observations, as facts rather than proposals

- One of four verify runs was lost to formatting of a change-folder document, not to the flake.
- The cycle's largest agent-time rows are the two that ran Playwright in loops: reproduction (1,808 s)
  and the fix dispatch (2,118 s).
- Dispatches #2 and #6 resumed or carried background work, and their notices are interim; the cause of
  the sticky 404 inside Next remains unproven (`BL-063`).
- Not exercised in the cycle: the interactive browser check (no `apps/web` change).
- Corpus: untouched by this change; no fact was reworded, locked with `pnpm fact:lock`, or retired.
