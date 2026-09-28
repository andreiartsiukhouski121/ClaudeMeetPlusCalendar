# Plan: discovery-pipeline

> The task breakdown for the shape settled in [design.md](design.md), from the facts in
> [research/](research/README.md). No runtime code changes.

## 0. Orientation: what the project already has

- **Duplicate:** no matches — nothing in `docs/CHANGELOG.md` adds a stage before planning. The
  nearest entries are `CH-013` (two named workflows) and `CH-016` (the agent team), both of which
  structure the same flow without preceding it; see [research/history.md](research/history.md).
- **Conflicts with shipped:** touches `scripts/check-orientation.mjs` (nested plan discovery),
  `e2e/process/process.api.spec.ts` (four new cases), `e2e/architecture/architecture.api.spec.ts`
  (`AR-API-08` must stop filtering role names by prefix), `package.json` (`plan:new` → `change:new`),
  five skills, the root and package rules files. No invariant changes; no case in
  `e2e/regression/**` or `e2e/security/**` is affected.
- **Conflicts with planned:** no matches that block it. `BL-020` (enforce the role file-ownership
  split mechanically) grows slightly, since there are now eight more roles, and `BL-013` (worktree
  tooling) is unaffected — this change adds roles, not isolation.
- **Architecture impact:** adds `ADR-0016` (discovery as three reviewed stages in a folder per
  change). Extends `ADR-0014` — eight further roles under the same rule that a role's limits are its
  tool list — and `ADR-0015`, by distinguishing the durable corpus from the per-change folder.
  `ADR-0010` supplies the requirement that each new convention ships with its own check. Nothing is
  superseded.
- **Open questions:** "research" could have meant a one-off sweep or a retained artifact; the design
  settles it as retained, because the next two stages read it. What the stages cost in wall-clock is
  genuinely unknown and is left unmeasured rather than estimated.

## 1. Spike: how the risky assumptions were proven

| Assumption                                             | How it was proven                                                       | Fact                                                                 |
| ------------------------------------------------------ | ----------------------------------------------------------------------- | -------------------------------------------------------------------- |
| a subagent can itself dispatch subagents               | probe: `researcher` dispatched `researcher-history` through `claude -p` | works — the probe returned `NESTED-OK PING`                          |
| `check-orientation.mjs` misses plans in subdirectories | created a scaffolded folder and ran the checker before changing it      | confirmed: the nested plan was invisible until `activePlans` changed |
| the changed checker rejects an unfilled nested plan    | ran it against a freshly scaffolded folder                              | all five section-0 answers rejected as template text                 |
| a `SCAFFOLD-*.md` name avoids the `TEMPLATE*` glob     | read `TEMPLATE_NAME` in `process.api.spec.ts`, then ran `PR-API-01`     | green — the scaffolds are not treated as plan templates              |
| the scaffolder and the stage check can be kept in step | parsed the `SCAFFOLD` list out of the script's source in `PR-API-05`    | both directions compare; drift fails the case                        |

## 2. Contract

No HTTP contract change. The string-level contracts and their checkers are listed in
[design.md](design.md) §3; each moves with its check in the same task.

## 3. Data

No entity, seed or format change. The data added is one folder per change, retained like plans.

## 4. Tasks

| ID  | What to do                                                 | Files                                                                                            | Done when                                                     | Depends on |
| --- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- | ---------- |
| T1  | Write the eight role definitions                           | `.claude/agents/researcher*.md`, `research-reviewer.md`, `designer.md`, `design-reviewer.md`     | all eight register as `subagent_type`                         | —          |
| T2  | Move ADR authorship to the designer                        | `.claude/agents/planner.md`                                                                      | the planner cites ADRs and creates none                       | T1         |
| T3  | Add the stage scaffolds                                    | `docs/plans/SCAFFOLD-RESEARCH.md`, `SCAFFOLD-DESIGN.md`                                          | `PR-API-01` still green (the glob is not matched)             | —          |
| T4  | Replace `plan:new` with `change:new`                       | `scripts/new-change.mjs`, `package.json`, delete `scripts/new-plan.mjs`                          | the command creates the folder and the three files            | T3         |
| T5  | Teach the checker about nested plans                       | `scripts/check-orientation.mjs`                                                                  | a nested unfilled plan fails; the five flat plans still pass  | T4         |
| T6  | Add `PR-API-03`…`PR-API-06`                                | `e2e/process/process.api.{spec.ts,cases.md}`                                                     | four cases green, and red under the control experiment        | T4, T5     |
| T7  | Widen `AR-API-08` to every role                            | `e2e/architecture/architecture.api.spec.ts`, `.cases.md`                                         | the roles table is parsed, not a prefix list                  | T1         |
| T8  | Write the `research-protocol` and `design-protocol` skills | `.claude/skills/*/SKILL.md`                                                                      | both load; they match the agents and the scaffolds            | T1, T3     |
| T9  | Rewire the existing skills to the new stages               | `feature-pipeline`, `bugfix-pipeline`, `team-roles`, `project-context`, `requesting-code-review` | every stage names its role and its gate                       | T8         |
| T10 | Write `ADR-0016`                                           | `docs/adr/ADR-0016-*.md`, `docs/adr/README.md`                                                   | `AR-API-01`…`04` green                                        | —          |
| T11 | Update the rules files                                     | `CLAUDE.md`, `apps/*/CLAUDE.md`, `README.md`, `docs/plans/README.md`                             | the stages and the folder are findable from the root          | T1–T10     |
| T12 | Dogfood this change through the new shape                  | `docs/plans/discovery-pipeline/**`                                                               | the folder holds all three stages and passes `PR-API-03`…`06` | T6         |
| T13 | Ledger and acceptance                                      | `docs/CHANGELOG.md`, `docs/BACKLOG.md`                                                           | `CH-017`, the `BL-` items, green `pnpm verify`                | T1–T12     |

T1, T3 and T10 do not overlap by file and could run in parallel. Everything from T4 onward shares
files with its predecessors and is sequential.

## 5. Risks

- **The flow costs more than it saves on small changes.** Mitigated by leaving the short path intact
  (`bugfix-pipeline` §4) and by saying in `team-roles` when the team is the wrong tool. The record
  shows this is the real risk: `CH-004` exists because planning once outweighed the code.
- **The research folder becomes another place a rule lives.** Mitigated by the rule that research
  cites and never restates, and by `PR-API-06`, which demands a citation or an explicit gap.
- **`PR-API-04` blocks a green `verify` mid-flight**, since a scaffolded file is unfilled by
  definition. Accepted deliberately: acceptance is meant to be unreachable until the stages exist,
  and the pre-commit hook is unaffected.

## 6. Assumptions and deliberate omissions

- The machine checks **form only**: that a citation exists, that a stage file exists, that no marker
  is left. Whether the research is honest and complete is the reviewer's judgment — `ADR-0010`'s
  line, held on purpose.
- The sweeps for this change were run by the session that also wrote the design and the plan,
  because the agents did not exist yet. Recorded in
  [research/README.md](research/README.md) rather than hidden; the next change is the first real
  exercise.
- No wall-clock budget is given for the new stages. `feature-pipeline` §10's budget is left as it was
  and marked as covering the implementation half only.
