# ADR-0016 — Discovery runs as three reviewed stages in a folder per change

- **Status:** accepted
- **Date:** 2026-09-28
- **Supersedes:** —
- **Superseded by:** —

## Context

Work used to start at the plan. Whoever planned also gathered the facts they planned from, so
nothing independent checked whether those facts were real — and the record says that is where this
project loses time. Four of the five most expensive findings in the first iteration's plan review
were library behaviour nobody had verified; `FX-013`, `FX-023` and `FX-027` are all documents that
drifted from the thing they described and were believed anyway.

`ADR-0015` fixed the durable half of that: the corpus is read rather than re-derived. It left the
per-change half open. A change still had exactly one artifact, `docs/plans/<slug>.plan.md`, and
nowhere to put what was learned about the project while preparing it — so it was learned again by
each later role, or not at all.

The opposite failure is equally documented: `CH-004` exists because planning once took 100 minutes
against 85 of code, and `docs/plans/README.md` records two plans that reached ~2000 lines, where
three of nine blockers in one review and both in the next were bookkeeping created by editing the
documents themselves. Any added stage has to be worth more than that.

## Decision

Three stages run before implementation, in this order, each producing an artifact that is the next
one's context, and each behind its own review gate:

1. **Research** — `researcher`, which dispatches `researcher-code`, `researcher-contract`,
   `researcher-tests` and `researcher-history`. Gate: `research-reviewer`.
2. **Design** — `designer`, from the accepted research. Gate: `design-reviewer`.
3. **Plan** — `planner`, from the accepted research and design. Gate: `plan-reviewer`.

All of it lives in **one folder per change**, `docs/plans/<slug>/`, created by
`pnpm change:new <slug>` (which replaces `plan:new`): `research/README.md` plus one file per sweep,
`design.md`, and `<slug>.plan.md`.

**The rule that makes research worth having: record only what is in the project, never what you
concluded from it.** Every statement carries a citation — a path and line, a document section, a
case ID, a ledger or ADR entry, a commit. What cannot be cited is an open question or a
`- **Not found:**` line, and "nothing here covers X" is a finding rather than a failure. A sweep that
quietly designs makes the design unreviewable, because its reasoning arrives already wrapped in a
conclusion.

Research subagents carry a default model and the `researcher` overrides it per sweep — raising a thin
sweep, dropping pure retrieval to the cheapest model — and records which model ran each sweep,
because a thin file from a cheap model is a different fact from a thin file from an expensive one.

The `researcher` is the only role besides `lead` that holds `Agent`; the sweeps do not, so the
dispatch tree stays one level deep. Nested dispatch was verified by probe on this machine rather
than assumed.

Rejected: folding research into the `planner` (nothing independent then checks the facts); a
separate top-level `research/` tree (it splits one change across two places, which is the shape of
`FX-023` and `FX-027`); one reviewer for all three artifacts (they fail differently); keeping
`plan:new` beside `change:new` (two shapes on disk forever); machine-checking that research contains
no speculation (undecidable by regex — the gate judges it, the machine only checks that something is
cited).

## Consequences

- Small changes must stay on the short path or this costs more than it saves. `bugfix-pipeline` §4
  keeps its threshold: below it, a red test, the fix and an `FX-` entry — no folder, no stages.
- `pnpm verify` is unreachable while a stage is unwritten: `PR-API-04` fails on the
  `<!-- fill this in -->` markers a scaffold carries. That is intended — acceptance should not be
  available before the work is described — and the pre-commit hook is unaffected.
- Four checks hold the shape: `PR-API-03` (every change folder has the three stages), `PR-API-04`
  (nothing left unfilled), `PR-API-05` (the scaffolder and the requirement cannot drift apart),
  `PR-API-06` (every research file cites something or says what it did not find).
- ADR authorship moves from `planner` to `designer`: a structural decision is made while the shape
  is decided, not while the order of work is written.
- The corpus and the change folder are now two kinds of context: `docs/` is durable and
  project-wide, `docs/plans/<slug>/` is per-change and retained as history, like plans and ledger
  entries (`ADR-0011`).
- What the added stages cost in wall-clock is not yet known. No estimate is invented here; the first
  real use of the flow is the measurement.
