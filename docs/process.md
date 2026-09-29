# The development process: stages, gates and their order

**This file owns the inventory** — which stages exist, in what order, behind which gates, and under
which identifiers (`ADR-0020`). It does not own the procedure: how a stage is run, what it costs to
skip it and what it produces live in the skills, and each row below links to the one that owns it.
A second table of stages anywhere else is drift, and this repository has four ledger entries about
that class (`FX-023`, `FX-027`, `FX-031`, `FX-032`).

The identifiers are the join key. `docs/profiling/**` cites them, a tuning proposal cites them, and
`AR-API-10` fails if a record names a stage this file does not define. **IDs are never renumbered
and never reused**: a retired stage keeps its number, the way a deleted case ID does.

Which of the three flows you are in is decided before anything else — the rule is in `CLAUDE.md`,
"Two workflows", and turns on one question: has this behaviour already been promised?

## `FEAT` — new functionality

Procedure: the `feature-pipeline` skill. Ten active stages, four of them behind a gate, plus one
retired.

| ID         | Stage                             | Role                                                 | Output                                                        |
| ---------- | --------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------- |
| `FEAT-S1`  | Research                          | `researcher` + four sweeps                           | `research/**` — cited findings, gaps named                    |
| `FEAT-G1`  | **Research review**               | `research-reviewer`                                  | blockers, or the verdict `accept`                             |
| `FEAT-S2`  | Design                            | `designer`                                           | `design.md`, and any ADR the shape needs                      |
| `FEAT-G2`  | **Design review**                 | `design-reviewer`                                    | blockers, or the verdict `accept`                             |
| `FEAT-S3`  | Plan                              | `planner`                                            | `<slug>.plan.md`: orientation, tasks, DoD                     |
| `FEAT-G3`  | **Plan review**                   | `plan-reviewer`                                      | blockers, or the verdict `accept`                             |
| `FEAT-S9`  | Test design                       | `test-designer`                                      | scenarios for every level touched, in their `.cases.md` homes |
| `FEAT-S10` | Red tests (unit, API)             | `tester-unit`, `tester-api`                          | failing specs, each red for the reason it was written for     |
| `FEAT-S4`  | Implementation                    | `implementer-api`, `implementer-web`                 | product code                                                  |
| `FEAT-S11` | Integration and end-to-end tests  | `tester-functional`, `tester-api`, `tester-security` | green specs at the integration and end-to-end levels          |
| `FEAT-S5`  | ~~Tests per level~~ — **retired** | —                                                    | folded into `FEAT-S10` and `FEAT-S11` above                   |
| `FEAT-G4`  | **Code review**                   | `code-reviewer`                                      | blockers, or the verdict `accept`                             |
| `FEAT-S6`  | Acceptance                        | `tester-acceptance`                                  | one green `pnpm verify`, reported with numbers                |
| `FEAT-S7`  | Ledger                            | `tester-acceptance`                                  | an `FT-`/`CH-` row, closed `BL-` items                        |
| `FEAT-S8`  | Profiling record                  | `tester-acceptance`                                  | `docs/profiling/runs/<date>-<slug>.md`                        |

`FEAT-S8` is new with `ADR-0020` and is part of finishing, like the ledger entry: the numbers only
exist while the hand-backs are still in front of you. Both belong to `tester-acceptance` rather than
to `lead`, because `lead` has no `Write` (`ADR-0014`) — a stage assigned to a role that cannot
perform it is a paragraph, not an assignment.

`FEAT-S9`, `FEAT-S10` and `FEAT-S11` are new with the second tuning round (`TUNE-S3`, 2026-09-29):
scenarios are designed before any test or product code exists, the unit and API tests go red first,
then the implementation, then integration and end-to-end. **`FEAT-S5` is not renumbered or
deleted** — the existing profiling record cites it, and `AR-API-10` fails a record naming a stage
this file does not define. The row order above carries the real sequence of a run; the ID is only a
name, and a retired one is never reused.

## `FIX` — a defect

Procedure: the `bugfix-pipeline` skill. Two paths, named explicitly rather than left to judgement:
below `bugfix-pipeline` §4's threshold the short path runs `FIX-S1`-`FIX-S7` only, by one fixer, with
no change folder and no team; above it the full path runs the same seven steps plus the three
discovery stages below and the profiling record at the end, in the row order of the table. The Role
column names the full path's team roles; on the short path one agent performs all of them.

| ID        | Step               | Role                                                | Output                                                                                                                                       |
| --------- | ------------------ | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `FIX-S1`  | Orientation        | `planner`, or the fixer if short                    | new, known (`BL-`) or a regression (`FX-`)                                                                                                   |
| `FIX-S2`  | Reproduction       | the `tester-*` for that level                       | a command that goes red **now**, or — where no test touches the area — a written, repeatable procedure with its observed and expected result |
| `FIX-S3`  | Cause              | `implementer-api` / `-web`                          | the cause plus what proved it                                                                                                                |
| `FIX-S4`  | Impact             | `planner`                                           | what rests on it, urgency, is a plan needed                                                                                                  |
| `FIX-S8`  | Research           | `researcher` + the sweeps the defect needs          | `research/**`: steps `FIX-S1`-`FIX-S3` written down with citations; the history sweep is always one of them                                  |
| `FIX-S9`  | Design             | `designer`, or `planner` when the fix has no shape  | `design.md`, and any ADR the fix's shape needs                                                                                               |
| `FIX-S10` | Plan               | `planner`                                           | `<slug>.plan.md` from `TEMPLATE-BUGFIX.md`                                                                                                   |
| `FIX-S5`  | Red test           | `test-designer`, then the `tester-*` for that level | a scenario row in the paired `.cases.md`, then a spec red on current code — the first case there when the area had none                      |
| `FIX-S6`  | Fix                | `implementer-api` / `-web`                          | a minimal edit at the cause; the test goes green                                                                                             |
| `FIX-S7`  | Acceptance + entry | `tester-acceptance`                                 | a green `pnpm verify`, an `FX-` entry                                                                                                        |
| `FIX-S11` | Profiling record   | `tester-acceptance`                                 | `docs/profiling/runs/<date>-<slug>.md` — above the §4 threshold only                                                                         |

`FIX-S8`, `FIX-S9` and `FIX-S10` are new with the third tuning round (`TUNE-S3`, 2026-09-29): the
defect flow stops borrowing `FEAT-S1`…`FEAT-S3` by reference and gets its own stages, placed after
impact rather than before reproduction, because the §4 threshold's first condition — "the cause was
not found in about 15 minutes" — cannot be judged before the cause is looked for. `FIX-S11` is new
with the same round, for the same reason `FEAT-S8` exists: the numbers only exist while the
hand-backs are still in front of you, and it belongs to `tester-acceptance` rather than to `lead`,
because `lead` has no `Write`. `FIX-S7` drops its second role (`lead`) for the same reason —
identical to the defect `FX-034` fixed for `FEAT-S7`/`FEAT-S8`. **The row order above carries the
real sequence of a run; the IDs are out of sequence on purpose** — `ADR-0020` forbids renumbering and
reuse.

The defect flow carries **no review gate**, above the threshold or below it — zero against the
feature flow's four. What stands in for one is mechanical instead, and specific to this flow: the red
test at `FIX-S5` must fail on current code, and the control experiment at `FIX-S7` reverts the fix and
requires the test to go red again. A wrong cause fails both.

## `TUNE` — changing the pipeline itself

Procedure: the `pipeline-tuning` skill. It runs against the profiling records rather than against
the code, and it is the only flow with a **human** gate.

| ID        | Stage                | Role                   | Output                                            |
| --------- | -------------------- | ---------------------- | ------------------------------------------------- |
| `TUNE-S1` | Pipeline review      | `pipeline-reviewer`    | observations with citations; no recommendations   |
| `TUNE-S2` | Tuning plan          | `pipeline-planner`     | numbered proposals, each with its expected saving |
| `TUNE-G1` | **Owner's approval** | the repository owner   | which proposals are approved, in their own words  |
| `TUNE-S3` | Implementation       | `pipeline-implementer` | the approved edits, and only those                |

`TUNE-G1` is not a formality and cannot be delegated to an agent. A pipeline change alters how every
later change is built; `CH-004` is the entry for a process that grew heavier than the work it
guarded, and it was a human who noticed.

## Why the gates sit where they do

Each is placed where a blocker is still cheap. A wrong shape caught at `FEAT-G2` costs a paragraph;
the same blocker found during implementation costs an iteration, and found at acceptance it costs a
full suite run. The evidence that this is not theory is in the ledger: `FX-031`, `FX-032` and
`FX-033` were all found by this pipeline's own gates and runs during a single change, and the diff
review found none of them.

The counter-evidence is in the same ledger. `CH-004` records 100 minutes of planning against 85 of
code, and the discovery half of `FT-003` cost 1.47M tokens before any product code existed. Both
numbers are arguments for tuning the stages, not for removing the gates — which is what
`docs/profiling/` exists to settle with measurements instead of impressions.
