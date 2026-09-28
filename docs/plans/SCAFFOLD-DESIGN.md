# Design: &lt;slug&gt;

> The shape of the change. Created by `pnpm change:new <slug>`, written by the `designer` agent from
> the accepted `research/` folder, and reviewed before any plan is written.
>
> **This is not a plan.** No tasks, no order of work, no dependencies, no estimates, no file list —
> those come next, from the `planner`. It is also not a restatement of the research: cite it.
>
> Every load-bearing fact traces to `research/`. A fact appearing for the first time here is an
> assumption, and the review will treat it as one.

## 1. What the research established

The findings this design rests on, each as a link into `research/`. Short — the point is
traceability, not a second copy.

<!-- fill this in -->

## 2. The shape

Layer by layer: what changes in `apps/api` (controller, service, DTO, mapper, guard) and in
`apps/web` (proxy, page, Server Action, DAL, client component) — and what deliberately does not.

<!-- fill this in -->

## 3. Contract

Method, path, auth, request body, success response, and the **exact error bodies**. Shapes come from
the framework's behaviour rather than memory: invariants 1 and 8 were both learned the hard way. If
nothing in the HTTP contract changes, say that explicitly.

<!-- fill this in -->

## 4. Data

Entities and fields with formats, what the mapper strips, what the seed gains, and which owner
mutating cases may use. Absolute dates, never `Date.now()`.

<!-- fill this in -->

## 5. Alternatives rejected

One option plus two straw men is not a comparison. Each rejected alternative gets a reason that
would still make sense to someone who preferred it — this section is what stops the same option
being re-proposed at every later gate.

| Alternative | Why not |
| ----------- | ------- |

<!-- fill this in -->

## 6. Decisions and ADRs

Anything structural gets an ADR **before** the code (`pnpm adr:new <slug>`), and this section cites
the ID. An ADR written afterwards is a justification, not a decision. A design that contradicts an
accepted ADR supersedes it properly or does not contradict it.

<!-- fill this in -->

## 7. Impact on what already exists

Which cases (by ID), invariants (by number) and behaviours the change disturbs. Silence here becomes
a red run somebody else has to diagnose.

<!-- fill this in -->

## 8. Open questions and deliberate omissions

What this design does not settle, and what it leaves undone on purpose. An omission not stated is
not an omission — it is a misreported result.

<!-- fill this in -->
