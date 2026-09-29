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

Procedure: the `feature-pipeline` skill. Eight stages, four of them behind a gate.

| ID        | Stage               | Role                                 | Output                                         |
| --------- | ------------------- | ------------------------------------ | ---------------------------------------------- |
| `FEAT-S1` | Research            | `researcher` + four sweeps           | `research/**` — cited findings, gaps named     |
| `FEAT-G1` | **Research review** | `research-reviewer`                  | blockers, or the verdict `accept`              |
| `FEAT-S2` | Design              | `designer`                           | `design.md`, and any ADR the shape needs       |
| `FEAT-G2` | **Design review**   | `design-reviewer`                    | blockers, or the verdict `accept`              |
| `FEAT-S3` | Plan                | `planner`                            | `<slug>.plan.md`: orientation, tasks, DoD      |
| `FEAT-G3` | **Plan review**     | `plan-reviewer`                      | blockers, or the verdict `accept`              |
| `FEAT-S4` | Implementation      | `implementer-api`, `implementer-web` | product code                                   |
| `FEAT-S5` | Tests per level     | the `tester-*` roles                 | cases plus a green run at each level touched   |
| `FEAT-G4` | **Code review**     | `code-reviewer`                      | blockers, or the verdict `accept`              |
| `FEAT-S6` | Acceptance          | `tester-acceptance`                  | one green `pnpm verify`, reported with numbers |
| `FEAT-S7` | Ledger              | `tester-acceptance`                  | an `FT-`/`CH-` row, closed `BL-` items         |
| `FEAT-S8` | Profiling record    | `tester-acceptance`                  | `docs/profiling/runs/<date>-<slug>.md`         |

`FEAT-S8` is new with `ADR-0020` and is part of finishing, like the ledger entry: the numbers only
exist while the hand-backs are still in front of you. Both belong to `tester-acceptance` rather than
to `lead`, because `lead` has no `Write` (`ADR-0014`) — a stage assigned to a role that cannot
perform it is a paragraph, not an assignment.

**A gate is passed by an artifact, not by an assurance.** Stages are never reordered or skipped, but
they shrink with the task; a skipped stage is named out loud rather than assumed.

## `FIX` — a defect

Procedure: the `bugfix-pipeline` skill. The discovery stages `FEAT-S1`…`FEAT-S3` apply above that
skill's §4 threshold and are skipped by design below it.

| ID       | Step               | Role                             | Output                                           |
| -------- | ------------------ | -------------------------------- | ------------------------------------------------ |
| `FIX-S1` | Orientation        | `planner`, or the fixer if short | new, known (`BL-`) or a regression (`FX-`)       |
| `FIX-S2` | Reproduction       | the `tester-*` for that level    | a command that goes red **now**                  |
| `FIX-S3` | Cause              | `implementer-api` / `-web`       | the cause plus what proved it                    |
| `FIX-S4` | Impact             | `planner`                        | what rests on it, urgency, is a plan needed      |
| `FIX-S5` | Red test           | the `tester-*` for that level    | a case in the suite, red on current code         |
| `FIX-S6` | Fix                | `implementer-api` / `-web`       | a minimal edit at the cause; the test goes green |
| `FIX-S7` | Acceptance + entry | `tester-acceptance`, then `lead` | a green `pnpm verify`, an `FX-` entry            |

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
