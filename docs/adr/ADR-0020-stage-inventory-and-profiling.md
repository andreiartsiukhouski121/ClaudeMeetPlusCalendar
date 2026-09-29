# ADR-0020 — Stage inventory and profiling

- **Status:** accepted
- **Date:** 2026-09-29
- **Supersedes:** —
- **Superseded by:** —

## Context

The pipeline is slow and nobody can say where. `feature-pipeline` §10 budgets "about 60 minutes" for
the implementation half and states outright that the discovery half **is not measured**; `BL-022`
has asked for that measurement since `CH-017` and nothing has produced it. The only figures that
exist are run times in `e2e/README.md`, which measure the suite rather than the process.

The first change to run the full nine stages, `meetings-detail-participants`, cost **≈3.48M tokens
across 21 distinct agents and 29 dispatches**, of which 1.47M went to discovery and its three gates
before a line of product code existed. `FT-003` shipped, but the shape of the spend was invisible
until it was added up by hand afterwards, from twenty-one separate hand-backs. There is no artifact
that would let the next person do that without re-reading the whole transcript.

> **Correction, 2026-09-29 (pipeline-tuning proposal 10).** This paragraph first read "21 agent
> dispatches", conflating two distinct facts the record carries: 21 distinct agents and 29
> dispatches. Corrected rather than superseded, on the same footing as the `FX-034` correction
> below: a factual correction of a figure, not a change of the decision.

Two facts make a naive fix wrong. First, the stages already have a home: the `feature-pipeline` and
`bugfix-pipeline` skills each carry a table of them. A second table in a document would be a third
copy of a rule this repository has already paid for twice — `FX-023` and `FX-027` — and, in the
change that produced this ADR, twice more (`FX-031`, `FX-032`). Second, the stages have **no stable
identifiers**, so a measurement cannot name what it measured: "the design stage" is prose, and prose
drifts against a renamed heading without anything noticing.

## Decision

**`docs/process.md` owns the inventory of stages and gates, their order, and their identifiers.**
The skills keep owning the **procedure** — what a stage does, how to run it, what it costs to skip —
and link to the inventory instead of restating it. The phase tables in `feature-pipeline` and
`bugfix-pipeline` are replaced by that link.

Every stage and gate gets a stable ID: `FEAT-S1`…`FEAT-S8` and `FEAT-G1`…`FEAT-G4` for a feature,
`FIX-S1`…`FIX-S7` for a defect, `TUNE-S1`…`TUNE-S3` and `TUNE-G1` for the pipeline-tuning loop. The
IDs are the join key: a profiling record cites them, a tuning proposal cites them, and a renamed
heading no longer silently breaks the link between a measurement and the thing measured.

**`docs/profiling/` owns the measurements.** `README.md` holds the protocol and the index;
`runs/<date>-<slug>.md` is one record per cycle, with a row per stage and gate carrying its ID,
role, model, wall-clock, tokens, tool calls and outcome. Records are append-only: a run is evidence
of what happened, not a document to be tidied.

Rejected alternatives:

- **Put the inventory in `CLAUDE.md`.** It is already the longest file an agent reads, and its job
  is invariants and entry points, not procedure.
- **Put profiling in `e2e/README.md` beside the run economics.** That paragraph measures the suite;
  mixing process timings into it makes both harder to keep exact, and `FX-027` is the entry for what
  happens when one paragraph carries two subjects.
- **Derive the numbers automatically from transcripts.** No such artifact is available to an agent
  at run time; the numbers arrive in hand-backs and are recorded by the orchestrator as they arrive.
- **Skip the IDs and cite headings.** Cheaper to write, and it is exactly the coupling that decays:
  a heading reword leaves every prior record pointing at nothing, silently.

> **Correction, 2026-09-29 (`FX-034`).** This paragraph first read `FEAT-S1`…`FEAT-S6` while the
> inventory it created defines `FEAT-S1`…`FEAT-S8`. The range was wrong when written; the decision
> was not. Corrected rather than superseded, and recorded here so the edit is visible — an accepted
> ADR is not revised in substance, and this is the boundary of what that allows.

## Consequences

**A profiling record is part of finishing a cycle**, like the ledger entry. A cycle that ships
without one leaves the next tuning round guessing, which is the state this ADR exists to end.

**The cost is real and is paid on every run**: the orchestrator collects numbers from hand-backs and
writes a record, and every agent's hand-back must therefore report its own cost. That overhead is
justified only while the records are actually read — if two tuning rounds pass without one changing
a decision, this ADR should be superseded rather than obeyed out of habit.

**It forbids a stage table anywhere but `docs/process.md`.** A skill that grows one back has
re-created the drift; `ADR-0015` rule 1 already says a fact lives in exactly one document, and this
is that rule applied to the process itself.

**The IDs are load-bearing and are not renumbered.** A stage that is removed keeps its ID retired,
the way a deleted case number is never reused (`home-dashboard.api.cases.md`, and the blocker in
`plan-review-3.md:147` about reusing one).

**What enforces it:** `AR-API-10` checks that every stage and gate ID cited in `docs/profiling/**`
exists in `docs/process.md`, in the same shape as `AR-API-09` for the Cases column — a record citing
a stage nobody defined is the failure mode, and it is invisible to review. The disjointness itself
is held by review, as prose always is.
