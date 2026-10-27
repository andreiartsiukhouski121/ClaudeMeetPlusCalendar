---
name: change-router
description: Sizing a task before the first dispatch — decide the depth (small, medium or large) of a feature or a defect from checkable criteria, each answered with a citation, and state the result as one line. Use at the start of every task the `lead` receives, when asked "how much process does this need", "does this need the full team", "is this small", or when a criterion appears mid-work and the depth may have to rise.
---

Which stages a change runs is decided by its **depth**, and the depth is decided here, before the
first dispatch, from questions that can be answered with a path, a Routes row, a `FACT-` key, an
invariant number or an ADR ID. It replaces six differently worded statements of "when to go light"
that contradicted each other (`TUNE-S1` review of 2026-10-27, section 7).

**This skill owns the procedure of choosing, not the stages.** Which stage IDs run at each depth is
inventory and lives in [`docs/process.md`](../../../docs/process.md), section "Depth" (`ADR-0020`,
`ADR-0039`). A stage list here would be the drift class of `FX-023`, `FX-027`, `FX-031` and `FX-032`.

## 1. The flow, then the exit

The first question stays in `CLAUDE.md`, "Two workflows": has this behaviour already been promised?
It picks `feature-pipeline` or `bugfix-pipeline`. It is not restated here.

**The no-behaviour exit.** Documentation, config or a rename that changes no runtime behaviour gets
no depth and no stages: a ledger row, and nothing else. Adding stages here makes `CH-004`'s failure
cheaper to repeat, not harder.

## 2. The criteria

Each is answered yes or no. **A yes or no without its citation is not an answer.**

| ID  | Question                                                                                                                                                                                                   |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Does the change alter an endpoint, a request, response or error body (a Routes row or a body in `docs/api-contract.md`), one of the nineteen invariants, or behaviour that another feature's cases assert? |
| C2  | Does it change the schema, an entity or a format in `docs/data-model.md`, or the seed?                                                                                                                     |
| C3  | Does it add or change a protected route or page, the session, a cookie, a token, an authentication branch, or touch invariants 16 to 19?                                                                   |
| C4  | Does it touch more than one module of `apps/api`, or both applications?                                                                                                                                    |
| C5  | Does it need a new ADR or supersede one, by the list in `feature-pipeline` section 2 (session scheme, module boundaries, contract format, storage, a refused dependency, a process rule)?                  |
| C6  | Defects only: was the cause found and proven within about fifteen minutes? It is answered at `FIX-S4`, not at the start, because it cannot be judged before the cause is looked for.                       |

## 3. Criteria to depth

This is a mapping of answers, not a stage table.

| Depth  | A feature, when                         | A defect, when                                                             |
| ------ | --------------------------------------- | -------------------------------------------------------------------------- |
| small  | none of C1 to C5 holds                  | C1, C3 and C4 do not hold, and C6 is met                                   |
| medium | any of C1 to C4 holds, and C5 does not  | C6 is not met, and C1, C3 and C4 do not hold (projected: one record, `R7`) |
| large  | C5 holds; or the owner raises the depth | any of C1, C3 or C4 holds                                                  |

- **The defect threshold is exactly four criteria**: C6 (here, "the cause was not found in about
  fifteen minutes"), C1, C3 and C4. C2 and C5 are not part of it, so which defects take the short or
  the full path does not change. The strictness rule and the `Path:` marker stay in
  `bugfix-pipeline` section 4.
- **C3 alone puts a feature in medium**, not large. `tester-security` and `pnpm e2e:security` still
  run at `FEAT-S11`.
- **C5 is normally a design output**, judged here before design exists. That is the risk of this
  table, and escalation (section 5) is its mitigation.

## 4. The line the `lead` states

One line, before the first dispatch, in the report to the owner, in every brief and in the profiling
log:

```
Tier: medium — C1 yes (Routes row DELETE /meetings/:id), C2 yes (seed), C3 yes (PROTECTED_ROUTES), C4 yes, C5 no
```

`FEAT-G3` reads this line for a medium change, and the profiling record's Size block copies it
(`docs/profiling/README.md`). A new `FT-`/`CH-` ledger row carries it as `Tier: small|medium|large;
criteria: <ids or none>`.

## 5. Overrides and escalation

- **The owner may raise a depth at any time.** A depth is lowered only explicitly, and the question
  put to the owner names every criterion that holds. A lower depth is never labelled "recommended"
  against a higher one. This is `bugfix-pipeline` section 4's strictness rule (`CH-033`, option A)
  applied to features.
- **A depth never goes down during a run.** A criterion that appears mid-work raises it. The `lead`
  stops dispatching, reports the criterion with its citation, and resumes at the earliest stage the
  new depth adds:
  - small to medium or large: `pnpm change:new <slug>`; the red test already written stays;
  - medium to large before `FEAT-G3` accepts: `FEAT-S2` and `FEAT-G2` run, with the thin files as
    their input;
  - medium to large after `FEAT-G3`: the same, then `FEAT-S3` and `FEAT-G3` re-run, and code already
    written is kept and read at `FEAT-G4`.
- The escalation is logged with the stage and the criterion, in the Size block of the record.

## 6. Who does the work at each depth

- **Small.** No plan, no reviewer, no change folder. The `lead` dispatches the `tester-*` role of
  the level for the red test and the `implementer-*` role for the code; the case row is written with
  the spec, as `team-roles` describes for the short path. When no `lead` is running, the main
  session does the same steps itself. One green `pnpm verify` and a ledger row close it. The row
  carries a `Cost:` clause, built from the completion notices already kept: total tokens, dispatches
  and elapsed minutes. Without it the small tier never gets a data point (`TUNE-S2` plan, item 2c).
- **Medium, a feature.** `planner` writes the three thin files (`research/README.md`, `design.md`,
  `<slug>.plan.md`) with no sweeps and no `designer`; the one gate before code is `FEAT-G3`, and for
  a medium change `plan-reviewer` also opens every citation in the thin research file and confirms
  this skill's line (`.claude/agents/plan-reviewer.md`). Everything after `FEAT-G3` runs as on the
  large tier.
- **Medium, a defect.** `planner` writes the research section of `FIX-S8` itself, with no sweeps,
  and `FIX-S9` and `FIX-S10`; the history sweep is not mandatory here. No gate stands behind them, as
  on every `FIX` path. The ledger row carries `Path: medium (docs/plans/<slug>)`.
- **Large.** Every row of the inventory, in row order.
