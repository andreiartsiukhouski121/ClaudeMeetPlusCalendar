---
name: requesting-code-review
description: The two review gates in this repository — the plan review before implementation and the code review before acceptance — when to call each, when not to, and what to hand over. Use before accepting a feature, when asked "do we need a review", "call a reviewer", "review this", or when tempted to dispatch a review subagent after every task.
---

Adapter for the external `requesting-code-review` skill (`obra/superpowers`). The original is in
`.agents/skills/requesting-code-review/`, restored with `pnpm skills:sync`. **This file is
self-contained:** the call policy is replaced entirely, and the reviewers themselves are agent
definitions in `.claude/agents/`, which is in git — so nothing here loses its subject when the
gitignored directory is absent.

## Why the policy differs

The original demands a review after every task. For this repository that is a measured mistake: in
the first pipeline iteration plan review consumed **1,005,347 tokens — 46% of the entire spend** —
without producing a line of product code, and the pipeline audit separately recorded that the
reviewer had been granted write access to any file and the ability to run any command.

## Two gates, not one review

| Gate        | Agent           | Subject                   | Passed before         |
| ----------- | --------------- | ------------------------- | --------------------- |
| Plan review | `plan-reviewer` | the plan, before any code | implementation starts |
| Code review | `code-reviewer` | the diff, after the tests | acceptance starts     |

They are different reviews with different failure modes. The plan review catches a task whose
definition of done is unreachable, a dependency on a later feature, a contradiction with an accepted
ADR — all of which cost an iteration if they reach code. The code review catches a silent redesign, a
broken invariant, a document left behind. Neither finds what the other does.

## When to call one

- **One plan review per feature**, before implementation. A second happens only if the first found an
  architecture-changing blocker: the "fixed it → rechecked → fixed it again" loop on paper costs more
  than the same edits on live code, where a run catches them.
- **One code review per feature**, after the testers and before acceptance — not after every task.
- An architectural decision that is hard to undo later: the session scheme, module boundaries, the
  contract format. Those get an ADR, and the plan review checks the code plan against it.
- A change touching security: new endpoints, work with cookies and tokens. Diff-level security review
  also goes through the built-in `security-review` skill, which looks at the branch's changes.

## When not to

- A change the size of "a page plus two endpoints", documentation, config, renames — a code review is
  enough; the plan review is skipped along with the plan.
- After every task inside one feature. Use a control experiment instead: break the behaviour, confirm
  the expected IDs go red, revert.
- Instead of a run. A review does not replace `regression-verify` and `pnpm verify`: the ledger shows
  the control experiments and the security suite found three defects each, and diff review found
  none.

## How to call one

- **The reviewers are read-only** — `Read`, `Grep`, `Glob`, and nothing else. This is not a
  preference: `regression-verify` §5 forbids "fixed it while I was there" in words, and only a tool
  restriction makes it a mechanism. The reviewer returns its report as text, never as an edit.
- **Use the agent definitions rather than an ad-hoc prompt.** `.claude/agents/plan-reviewer.md` and
  `.claude/agents/code-reviewer.md` hold the checklist, the report shape and the model, so nothing
  depends on the orchestrator remembering a parameter (`ADR-0014`). Both files are in git — this
  skill keeps working with `.agents/` absent.
- Hand over **the subject, not the session history**: paths and the diff, the plan section, and which
  documents to read (`CLAUDE.md`, the corpus). The brief must not retell a document.
- The diff base is the **working tree** when the work is not committed. `BASE_SHA..HEAD` applies only
  once everything is in git, and **not** while a second agent is working in the tree in parallel.
- A verdict comes back `accept`, `accept after blockers` or `rework`. It is relayed unedited; the lead
  does not soften it, and blockers go back to the role that owns the artifact.

## After the review

Blockers get fixed before acceptance. Anything contentious is not silently ignored: it becomes an
item in `docs/BACKLOG.md` with a status, or a row in the Rejected section with a reason. That
section exists so the same idea is not proposed again.
