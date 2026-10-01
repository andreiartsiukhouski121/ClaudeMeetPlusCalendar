# ADR-0016 — Discovery runs as three reviewed stages in a folder per change

- **Status:** accepted
- **Date:** 2026-09-28
- **Supersedes:** —
- **Superseded by:** —

## Context

- `FACT-3300` Work used to start at the plan, and whoever planned also gathered the facts they
  planned from, so nothing independent checked whether those facts were real. —
  `docs/pipeline-audit.md`
- `FACT-3301` Four of the five most expensive findings in the first iteration's plan review were
  library behaviour nobody had verified. — `docs/pipeline-audit.md`, `FACT-3282`
- `FACT-3302` `FX-013`, `FX-023` and `FX-027` are all documents that drifted from the thing they
  described and were believed anyway. — `docs/CHANGELOG.md`
- `FACT-3303` Before this record a change had exactly one artifact, `docs/plans/<slug>.plan.md`, and
  nowhere to put what was learned about the project while preparing it. — `docs/plans/`
- `FACT-3304` `CH-004` exists because planning once took 100 minutes against 85 of code. —
  `docs/CHANGELOG.md`, `CH-004`
- `FACT-3305` `docs/plans/README.md` records two plans that reached about 2000 lines, where three of
  nine blockers in one review and both in the next were bookkeeping created by editing the documents
  themselves. — `docs/plans/README.md`

> **Rationale — not a fact.** `ADR-0015` fixed the durable half — the corpus is read rather than
> re-derived — and left the per-change half open: what was learned while preparing a change was
> learned again by each later role, or not at all. The opposite failure is equally documented, so any
> added stage has to be worth more than `CH-004` cost.

## Decision

Three stages run before implementation, in this order, each producing an artifact that is the next
one's context, and each behind its own review gate:

- `FACT-3306` **Research** — `researcher`, dispatching `researcher-code`, `researcher-contract`,
  `researcher-tests` and `researcher-history`. Gate: `research-reviewer`. — `.claude/agents/`,
  `docs/process.md`
- `FACT-3307` **Design** — `designer`, from the accepted research. Gate: `design-reviewer`. —
  `.claude/agents/`, `docs/process.md`
- `FACT-3308` **Plan** — `planner`, from the accepted research and design. Gate: `plan-reviewer`. —
  `.claude/agents/`, `docs/process.md`
- `FACT-3309` All of it lives in one folder per change, `docs/plans/<slug>/`, created by
  `pnpm change:new <slug>`, which replaces `plan:new`: `research/README.md` plus one file per sweep,
  `design.md`, and `<slug>.plan.md`. — `scripts/new-change.mjs`, `PR-API-03`
- `FACT-3310` Research records only what is in the project, never what was concluded from it, and
  every statement carries a citation — a path and line, a document section, a case ID, a ledger or
  ADR entry, a commit. — `.claude/skills/research-protocol/SKILL.md`, `PR-API-06`
- `FACT-3311` What cannot be cited is an open question or a `- **Not found:**` line. —
  `.claude/skills/research-protocol/SKILL.md`, `PR-API-06`
- `FACT-3312` The `researcher` overrides the sweep model per sweep and records which model ran each
  sweep. — `.claude/agents/researcher.md`
- `FACT-3313` The `researcher` is the only role besides `lead` that holds `Agent`; the sweeps do not,
  so the dispatch tree stays one level deep. Nested dispatch was verified by probe on this machine
  rather than assumed. — `.claude/agents/researcher.md`, `.claude/agents/lead.md`

Rejected:

- `FACT-3314` Folding research into the `planner` — nothing independent then checks the facts. —
  this record
- `FACT-3315` A separate top-level `research/` tree — it splits one change across two places, which
  is the shape of `FX-023` and `FX-027`. — this record
- `FACT-3316` One reviewer for all three artifacts — they fail differently. — this record
- `FACT-3317` Keeping `plan:new` beside `change:new` — two shapes on disk forever. — this record
- `FACT-3318` Machine-checking that research contains no speculation — undecidable by regex; the gate
  judges it and the machine only checks that something is cited. — this record, `PR-API-06`

> **Rationale — not a fact.** A sweep that quietly designs makes the design unreviewable, because its
> reasoning arrives already wrapped in a conclusion. A thin file from a cheap model is a different
> fact from a thin file from an expensive one, which is why the model is recorded.

## Consequences

- `FACT-3319` `bugfix-pipeline` §4 keeps its threshold: below it, a red test, the fix and an `FX-`
  entry — no folder, no stages. — `.claude/skills/bugfix-pipeline/SKILL.md`
- `FACT-3320` `pnpm verify` is unreachable while a stage is unwritten: `PR-API-04` fails on the
  `<!-- fill this in -->` markers a scaffold carries, and the pre-commit hook is unaffected. —
  `e2e/process/process.api.spec.ts`, `.husky/pre-commit`
- `FACT-3321` Four checks hold the shape: `PR-API-03` (every change folder has the three stages),
  `PR-API-04` (nothing left unfilled), `PR-API-05` (the scaffolder and the requirement cannot drift
  apart), `PR-API-06` (every research file cites something or says what it did not find). —
  `e2e/process/process.api.spec.ts`
- `FACT-3322` ADR authorship sits with `designer`, not `planner`. — `.claude/agents/designer.md`
- `FACT-3323` `docs/` is durable and project-wide; `docs/plans/<slug>/` is per-change and retained as
  history. — `ADR-0011`, `ADR-0015`

> **Rationale — not a fact.** Small changes must stay on the short path or this costs more than it
> saves. Acceptance should not be available before the work is described, which is why an unwritten
> stage blocks `pnpm verify`. A structural decision is made while the shape is decided, not while the
> order of work is written. What the added stages cost in wall-clock was not known when this record
> was written; no estimate was invented here, and the first real use of the flow was the measurement
> (`ADR-0020`).
