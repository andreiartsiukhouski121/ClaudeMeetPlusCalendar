# Plan: <feature>

> Feature plan template. Scaffolded by `pnpm change:new <slug>`, alongside the research and the
> design it is written from. **Target: 100–150 lines.**
>
> Do not delete the sections below — they are the minimum whose absence had to be made up for
> later. Nothing else belongs here: **test cases are written once, straight into
> `e2e/regression/<feature>/*.cases.md`**, and the coverage matrix is the job of
> `e2e/suite-integrity.api.spec.ts`. The first two plans in this directory grew to ~2000 lines, and
> that cost more than it saved: three of the nine blockers in the second review and both blockers
> in the third were bookkeeping introduced by edits to the document itself.

## 0. Orientation: what the project already has

Filled in **first**, before the spike. Sources: [`docs/CHANGELOG.md`](../CHANGELOG.md) (what was
done, defects included), [`docs/BACKLOG.md`](../BACKLOG.md) (planned and rejected), the architecture
corpus ([`architecture.md`](../architecture.md), [`adr/`](../adr/README.md),
[`data-model.md`](../data-model.md), [`api-contract.md`](../api-contract.md)), then the code.

Five answers. **Do not change the form** — `pnpm check:orientation` reads it and sits in
`.husky/pre-commit`: an empty or brush-off answer fails the commit.

- **Duplicate:** has this been done already? Cite `FT-`/`CH-`/`FX-` entries that close the task in
  whole or in part, or say "no matches" and why.
- **Conflicts with shipped:** which existing invariants (`CLAUDE.md`), cases and files the task
  changes.
- **Conflicts with planned:** which `BL-` items the task overlaps, blocks or makes redundant, or
  "no matches".
- **Architecture impact:** which `ADR-` decisions the task touches, confirms or would change, and
  which of the four corpus documents must be updated. Cite ADR IDs, or say "no matches" and why.
- **Open questions:** terms already used in this project with a different meaning; what to confirm
  with the customer.

Also check the **Rejected** section of the backlog: if the task is there, it was already weighed.
Either name the new reason, or do not take it.

Rejected by the check: emptiness, `—`, `TODO`, `no`, answers under 20 characters, references to
non-existent ledger entries or non-existent ADRs, and — for the duplicate, planned and architecture
questions — any answer without an ID and without an explicit "no matches".

**A decision that changes an ADR is written as a new ADR first** (`pnpm adr:new <slug>`), and this
section cites it. An ADR written after the code is a justification, not a decision.

**If orientation shows a duplicate or a conflict, stop and say so.** "Already done in `FX-007`" is
a result, not a refusal.

## 1. Spike: how the risky assumptions were proven

Filled in **before** the rest of the plan, with throwaway code rather than reasoning. Five to seven
rows.

| Assumption | How it was proven | Fact |
| ---------- | ----------------- | ---- |
|            |                   |      |

Why this comes first: in the first iteration four of the five most expensive review findings were
library behaviour (`@IsOptional()` on two fields, `@Max` against a case boundary, Playwright
refusing a spec with a worker-scoped option) — each provable by a twenty-line probe in minutes.
Instead they were described in the plan, then two agents spent 25 minutes each re-deriving them.

Worth probing almost always: validation behaviour on missing and extra fields, a framework's
default response code, test fixture scopes, whether special imports resolve in the test runner, how
subprocess environments merge.

## 2. Contract

Method, path, authorization, request body, success response, codes and **exact error bodies**.
Error shapes come from the framework's source, not from memory — invariants 1 and 8 were both
learned that way.

## 3. Data

Seed types and contents as concrete values that tests can rely on. Absolute dates, no `Date.now()`.
Separate owners for mutating tests, since the store is shared.

## 4. Tasks

Numbered, with dependencies, **files** and a verifiable definition of done. Verification tasks and
**separate fix tasks** are part of the numbering: the plan is not rewritten when something is
found.

| ID  | What to do | Files | Done when | Depends on |
| --- | ---------- | ----- | --------- | ---------- |

The "files" column is not decoration: tasks that overlap on a file are not marked parallel, and a
shared file (`app.module.ts`, `e2e/README.md`, the unit cases doc) becomes its own merge task.
Parallel work needs **one git worktree per agent** — different ports are not enough, since Next 16
registers a dev server per project directory.

## 5. Risks

Only what is specific to this feature and not covered by "Project invariants" in `CLAUDE.md`.

## 6. Assumptions and deliberate omissions

Everything outside the literal specification or deliberately left undone. An omission not stated is
not an omission — it is a misreported result.

---

## How to use this

1. **Orientation** (~5 min, `planner`) — read the ledger, the backlog and the corpus, fill
   section 0. Duplicate or conflict: stop and say so.
2. **Spike** (~7 min, `planner`) — prove the assumptions with throwaway code.
3. **Plan** (~10 min, `planner`) — this template, on top of the spike's facts.
4. **Plan review — gate** (~12 min, `plan-reviewer`) — completeness against the spec, task
   dependencies, conformance to the ADRs, and whether the plan contradicts the spike. Library
   behaviour is not reviewed; the spike settled it. A second review happens only if the first found
   an architecture-changing blocker.
5. **Implementation** (`implementer-api` / `implementer-web`) — parallel only where files do not
   overlap, each agent in its own worktree. Tests come from the `tester-*` roles.
6. **Code review — gate** (`code-reviewer`) — the diff against the plan, the invariants and the
   corpus.
7. **Acceptance** (`tester-acceptance`) — skill `regression-verify`, one `pnpm verify`, then the
   ledger entry.

Baseline for a "page plus two endpoints" feature: about 70 minutes, and that is the floor. Twice
that usually means the plan grew or the review iterated, not that the code was hard. The full order
of work is the `feature-pipeline` skill.
