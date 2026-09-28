---
name: design-protocol
description: How the design stage is run in this repository — what a design must contain, what belongs to the plan instead, the rule that every load-bearing fact traces to the research, and when a decision needs an ADR first. Use after the research review passes and before any plan is written, or when asked "how should we build this".
---

Design decides **what the change looks like**. The plan decides in what order to build it. Keeping
those separate is the point: a document that does both gets edited for both reasons and drifts from
itself by the second revision (`ADR-0016`).

## Your context is the change folder

`docs/plans/<slug>/research/` — the record of what the project actually contains, gathered and
reviewed for this change. Read it in full, along with the research review's **Gaps to carry
forward**.

**Every load-bearing fact in the design traces to the research.** You may read the corpus or the code
to _confirm_ something the research cites. You may not build on a fact that appears in neither: if
you need something the research does not have, say so and send the question back. A design resting
on an unrecorded assumption is exactly what the stage before it exists to prevent, and
`design-reviewer`'s first question is this one.

## What a design contains

The scaffold is `docs/plans/SCAFFOLD-DESIGN.md`, created by `pnpm change:new`. Its sections and why
each is there:

1. **What the research established** — links into `research/`, not a second copy of it.
2. **The shape** — layer by layer, what changes in `apps/api` (controller, service, DTO, mapper,
   guard) and `apps/web` (proxy, page, Server Action, DAL, client component), and what deliberately
   does not.
3. **Contract** — method, path, auth, body, success, and the **exact error bodies**. From the
   framework's behaviour, not from memory: this repository broke on that twice (invariants 1 and 8).
   If the HTTP contract does not change, say so explicitly rather than omitting the section.
4. **Data** — entities and fields with formats, what the mapper strips, what the seed gains, which
   owner mutating cases may use. Absolute dates, never `Date.now()`.
5. **Alternatives rejected** — one option plus two straw men is not a comparison. Each rejected
   alternative needs a reason that would still make sense to someone who preferred it. This is the
   section that stops the same option being re-proposed at every later gate, and the one most often
   skipped.
6. **Decisions and ADRs** — see below.
7. **Impact** — which cases (by ID), invariants (by number) and behaviours the change disturbs.
   Silence here becomes a red run somebody else has to diagnose.
8. **Open questions and deliberate omissions** — an omission not stated is a misreported result.

## ADRs are written here, before the code

A choice that constrains later work gets an ADR **first**: `pnpm adr:new <slug>`, then the design
cites the ID. Written afterwards it is a justification, not a decision.

What counts as structural: module boundaries, the session scheme, the storage model, the contract
format, a refused dependency, a process rule everyone must follow. What does not: how a function is
written, a naming preference, anything a code comment settles.

A design that contradicts an accepted ADR **supersedes it properly** — a new record whose
`Supersedes` names the old one, and the old one's status set to `superseded` with a link back. It
never works around one silently; `AR-API-04` checks the links resolve, and the reviewer checks the
reasoning.

ADR authorship belongs to this stage rather than the plan because the decision is made while the
shape is chosen, not while the order of work is written.

## What a design is not

- **Not a plan.** No tasks, no dependencies, no file list, no estimates — that is the `planner`'s,
  and duplicating it here produces two documents that disagree by the second edit.
- **Not test cases.** They are written once, by the tester roles, into `e2e/regression/<feature>/`.
- **Not code**, not even a sketch that "just needs typing up".
- **Not a restatement of the research.** Cite it.

## The gate

`design-reviewer` — read-only, `opus` — asks five questions: does it follow from the research, does
it fit the architecture and the ADRs, are the contract and the data exact, were the alternatives
real, and is anything new secure (invariants 16–19). Its verdict comes back unedited.

This is the last gate before the shape becomes expensive to change: a blocker here costs a
paragraph, the same blocker found during implementation costs an iteration.
