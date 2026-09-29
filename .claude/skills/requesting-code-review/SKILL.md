---
name: requesting-code-review
description: The four review gates in this repository — research, design, plan and code — when to call each, when not to, and what to hand over. Use before accepting a feature, when asked "do we need a review", "call a reviewer", "review this", or when tempted to dispatch a review subagent after every task.
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

## Four gates, not one review

| Gate            | Agent               | Subject                   | Passed before         |
| --------------- | ------------------- | ------------------------- | --------------------- |
| Research review | `research-reviewer` | the cited findings        | design starts         |
| Design review   | `design-reviewer`   | the shape of the change   | planning starts       |
| Plan review     | `plan-reviewer`     | the task breakdown        | implementation starts |
| Code review     | `code-reviewer`     | the diff, after the tests | acceptance starts     |

Four reviews with four different failure modes, which is why they are not one reviewer with four
checklists. The research review catches a claim nothing supports and an area nobody swept — believed
by three stages downstream if it survives. The design review catches a shape that contradicts an
accepted ADR, or a contract too vague to build against. The plan review catches a definition of done
that is unreachable and a task that needs a later feature's artifacts. The code review catches a
silent redesign, a broken invariant, a document left behind.

**A blocker costs more the later it is found**, which is the whole argument for the order: an
unsourced fact caught in research costs a sentence, and the same fact caught during implementation
costs an iteration.

## When to call one

- **One review per artifact**: research, design, plan, code. A second pass on the same artifact
  happens only if the first found a blocker that changes it structurally — and a blocker that changes
  the **shape** goes back to the design stage rather than round again in the plan review. The "fixed
  it → rechecked → fixed it again" loop on paper costs more than the same edits on live code, where
  a run catches them.
- **One code review per feature**, after the testers and before acceptance — not after every task.
- An architectural decision that is hard to undo later: the session scheme, module boundaries, the
  contract format. Those get an ADR, and the plan review checks the code plan against it.
- A change touching security: new endpoints, work with cookies and tokens. Diff-level security review
  also goes through the built-in `security-review` skill, which looks at the branch's changes.

## When not to

- A change the size of "a page plus two endpoints", documentation, config, renames — a code review is
  enough. Stages shrink with the task; they are not skipped by that alone (`docs/process.md`,
  `feature-pipeline` §"Phases"). The one place stages **are** skipped by design is the below-threshold
  short path for a defect (`bugfix-pipeline` §4).
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
