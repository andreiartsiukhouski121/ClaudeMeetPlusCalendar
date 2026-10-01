# ADR-0020 — Stage inventory and profiling

- **Status:** accepted
- **Date:** 2026-09-29
- **Supersedes:** —
- **Superseded by:** —

## Context

- `FACT-3430` `feature-pipeline` §10 budgets about 60 minutes for the implementation half and states
  that the discovery half is not measured. — `.claude/skills/feature-pipeline/SKILL.md` §10
- `FACT-3431` `BL-022` has asked for that measurement since `CH-017` and nothing produced it. —
  `docs/BACKLOG.md`, `BL-022`
- `FACT-3432` The only figures that existed were run times in `e2e/README.md`, which measure the
  suite rather than the process. — `e2e/README.md`, "Run economics"
- `FACT-3433` The first change to run the full nine stages, `meetings-detail-participants`, cost
  about 3.48M tokens across 21 distinct agents and 29 dispatches, of which 1.47M went to discovery
  and its three gates before a line of product code existed. — `docs/profiling/runs/`
- `FACT-3434` The shape of that spend was invisible until it was added up by hand afterwards, from
  twenty-one separate hand-backs. — `docs/profiling/runs/`
- `FACT-3435` The stages already had a home: the `feature-pipeline` and `bugfix-pipeline` skills each
  carried a table of them. — `.claude/skills/feature-pipeline/SKILL.md`,
  `.claude/skills/bugfix-pipeline/SKILL.md`
- `FACT-3436` A rule living in more than one copy has cost this repository four ledger entries:
  `FX-023`, `FX-027`, `FX-031`, `FX-032`. — `docs/CHANGELOG.md`
- `FACT-3437` The stages had no stable identifiers, so a measurement could not name what it
  measured. — `docs/process.md`

> **Correction, 2026-09-29 (pipeline-tuning proposal 10).** `FACT-3433` first read "21 agent
> dispatches", conflating two distinct facts the record carries: 21 distinct agents and 29
> dispatches. Corrected rather than superseded, on the same footing as the `FX-034` correction below:
> a factual correction of a figure, not a change of the decision.

> **Rationale — not a fact.** The pipeline was slow and nobody could say where. A second stage table
> in a document would have been a third copy of a rule already paid for twice; "the design stage" is
> prose, and prose drifts against a renamed heading without anything noticing.

## Decision

- `FACT-3438` `docs/process.md` owns the inventory of stages and gates, their order, and their
  identifiers. — `docs/process.md`
- `FACT-3439` The skills own the procedure — what a stage does, how to run it, what it costs to skip
  — and link to the inventory instead of restating it; the phase tables in `feature-pipeline` and
  `bugfix-pipeline` are replaced by that link. — `.claude/skills/feature-pipeline/SKILL.md`,
  `.claude/skills/bugfix-pipeline/SKILL.md`
- `FACT-3441` The IDs are the join key: a profiling record cites them, a tuning proposal cites them,
  and a renamed heading no longer silently breaks the link between a measurement and the thing
  measured. — `docs/process.md`, `AR-API-10`
- `FACT-3442` `docs/profiling/` owns the measurements: `README.md` holds the protocol and the index,
  and `runs/<date>-<slug>.md` is one record per cycle with a row per stage and gate carrying its ID,
  role, model, wall-clock, tokens, tool calls and outcome. — `docs/profiling/README.md`
- `FACT-3443` Records are append-only. — `docs/profiling/README.md`

Rejected:

- `FACT-3444` Put the inventory in `CLAUDE.md` — it is already the longest file an agent reads, and
  its job is invariants and entry points, not procedure. — this record
- `FACT-3445` Put profiling in `e2e/README.md` beside the run economics — that paragraph measures the
  suite, and `FX-027` is the entry for what happens when one paragraph carries two subjects. —
  this record
- `FACT-3446` Derive the numbers automatically from transcripts — no such artifact is available to an
  agent at run time. — this record
- `FACT-3447` Skip the IDs and cite headings — a heading reword leaves every prior record pointing at
  nothing, silently. — this record

> **Correction, 2026-09-29 (`FX-034`).** `FACT-3440` first read `FEAT-S1`…`FEAT-S6` while the
> inventory it created defines `FEAT-S1`…`FEAT-S8`. The range was wrong when written; the decision
> was not. Corrected rather than superseded, and recorded here so the edit is visible — an accepted
> ADR is not revised in substance, and this is the boundary of what that allows.

> **Rationale — not a fact.** A run is evidence of what happened, not a document to be tidied, which
> is why records are append-only.

## Consequences

- `FACT-3448` A profiling record is part of finishing a cycle, like the ledger entry. —
  `docs/process.md`, `FEAT-S8`
- `FACT-3449` The orchestrator collects numbers from hand-backs and writes a record, so every agent's
  hand-back reports its own cost. — `.claude/skills/team-roles/SKILL.md`,
  `docs/profiling/README.md`
- `FACT-3450` A stage table anywhere but `docs/process.md` is forbidden. — `ADR-0015`, `FACT-3288`
- `FACT-3451` The IDs are not renumbered: a stage that is removed keeps its ID retired. —
  `docs/process.md`, `FEAT-S5`
- `FACT-3452` `AR-API-10` checks that every stage and gate ID cited in `docs/profiling/**` exists in
  `docs/process.md`. — `e2e/architecture/architecture.api.spec.ts`

> **Rationale — not a fact.** A cycle that ships without a record leaves the next tuning round
> guessing, which is the state this ADR exists to end. The overhead is justified only while the
> records are actually read — if two tuning rounds pass without one changing a decision, this ADR
> should be superseded rather than obeyed out of habit. The disjointness itself is held by review, as
> prose always is.

## Retired facts

| Key         | Stated                                                                                                                                                                                                               | Status      | Recorded in |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ----------- |
| `FACT-3440` | Every stage and gate has a stable ID: `FEAT-S1`…`FEAT-S8` and `FEAT-G1`…`FEAT-G4` for a feature, `FIX-S1`…`FIX-S7` for a defect, `TUNE-S1`…`TUNE-S3` and `TUNE-G1` for the pipeline-tuning loop. — `docs/process.md` | `withdrawn` | `CH-025`    |

Withdrawn rather than retired with a successor: `FACT-3438` already assigns the inventory to
`docs/process.md`, and `FACT-3441`/`FACT-3451` already carry the ID rules, so `FACT-3440`'s concrete
range was a second copy of the inventory — drifted twice (first corrected by `FX-034`, then wrong
again against `FEAT-S9`…`FEAT-S11` and `FIX-S8`…`FIX-S11`) and withdrawn rather than corrected a
third time, per `ADR-0022`.
