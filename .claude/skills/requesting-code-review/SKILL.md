---
name: requesting-code-review
description: When to call a separate reviewer in this repository and when not to, how to restrict it to reading, and what to hand it. Use before accepting a feature, when asked "do we need a review", "call a reviewer", "review this", or when tempted to dispatch a review subagent after every task.
---

Adapter for the external `requesting-code-review` skill (`obra/superpowers`). The original is in
`.agents/skills/requesting-code-review/`, restored with `pnpm skills:sync`. **This file is
self-contained:** the call policy is replaced entirely, and the reviewer prompt is reproduced
locally below — otherwise the skill would lose its subject whenever the gitignored directory is
absent.

## Why the policy differs

The original demands a review after every task. For this repository that is a measured mistake: in
the first pipeline iteration plan review consumed **1,005,347 tokens — 46% of the entire spend** —
without producing a line of product code, and the pipeline audit separately recorded that the
reviewer had been granted write access to any file and the ability to run any command.

## When to call one

- **One review per feature**, before acceptance — not after every task.
- An architectural decision that is hard to undo later: the session scheme, module boundaries, the
  contract format.
- A change touching security: new endpoints, work with cookies and tokens. Diff-level security
  review goes through the built-in `security-review` skill, which looks at the branch's changes.

## When not to

- A change the size of "a page plus two endpoints", documentation, config, renames.
- After every task inside one feature — use a control experiment instead: break the behaviour,
  confirm the expected IDs go red, revert.
- Instead of a run. A review does not replace `regression-verify` and `pnpm verify`: the ledger
  shows the control experiments and the security suite found three defects each, and diff review
  found none.

## How to call one

- **The reviewer is read-only** — `Read`, `Grep`, `Glob`, and nothing else. This is not a
  preference: `regression-verify` §5 forbids "fixed it while I was there" in words, and only a tool
  restriction makes it a mechanism. The reviewer returns its report as text, never as an edit in
  the tree.
- **Set the model explicitly** with the `model` parameter rather than inheriting the parent's
  (`feature-pipeline` §5).
- Hand over **the subject, not the session history**: paths and the diff, the plan section, a
  reference to the invariants in `CLAUDE.md`. The prompt must not retell documents — "read
  `CLAUDE.md` and section `T1` of the plan".
- The diff base is the **working tree** when the work is not committed. The `BASE_SHA..HEAD` from
  the original applies only once everything is in git, and **not** when a second agent is working
  in the tree in parallel.

## The reviewer prompt

```
You are a reviewer for this monorepo. You read and judge; you change nothing: you have only Read,
Grep and Glob. Describe fixes in words, never apply them to the tree. Do not spawn subagents — if
the diff is large, read it in several passes yourself and say so in the report.

What was built: <one or two sentences>
Requirement: <plan section or task text>
Diff: <paths or BASE_SHA..HEAD>
Context: read CLAUDE.md (invariants 1–19) and e2e/README.md (the suite convention).

Check:
1. Conformance to the requirement: is all of it done; are deviations justified improvements or
   problems.
2. The CLAUDE.md invariants: which are touched and whether any is broken. There are nineteen and
   they are numbered — cite them by number.
3. Security of new entry points: a guard and a DTO without owner or role fields on an endpoint;
   a session check both in proxy.ts and in the server layer for a page; a check inside a Server
   Action; no token passed as a prop into a client component.
4. Tests: do they check behaviour rather than themselves; is there a paired .cases.md; do its
   steps match what the spec does; any CSS locators, waitForTimeout, expect without await.
5. The ledger: is there an FT-/CH-/FX- entry and is "Found by" filled for defects.

Report:
- Strengths — specific, with paths.
- Blockers — what makes the feature unacceptable. Each: file:line, what is wrong, what it risks.
- Findings — worth fixing but not blocking acceptance.
- Minor — style and polish, as one list.
- Verdict: accept / accept after blockers / rework, and one sentence why.

Do not write "looks good" about anything you did not read. Do not mark a nitpick a blocker. Do not
dodge the verdict.
```

## After the review

Blockers get fixed before acceptance. Anything contentious is not silently ignored: it becomes an
item in `docs/BACKLOG.md` with a status, or a row in the Rejected section with a reason. That
section exists so the same idea is not proposed again.
