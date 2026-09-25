---
name: team-roles
description: The agent team contract for this repository — who does what, what each role is forbidden to do, how work is handed between them, and which agent definition and model to use. Use when orchestrating a feature or a fix across several agents, when dispatching a planner, implementer, reviewer or tester, when asked "who should do this", or before deciding the team is needed at all.
---

Eleven roles, each a file in `.claude/agents/`. A role's limits are its **tool list**, not its
prompt: `regression-verify` §5 has forbidden "fixed it while I was there" in words for a long time,
and an audit still found the reviewer holding write access to every file. Prose is a request; a tool
list is a mechanism (`ADR-0014`).

This file is the contract. The order of stages is in `feature-pipeline` or `bugfix-pipeline`; the
documents every role reads are in `project-context`.

## The roles

| Role                | Owns                                                 | Tools                        | Model    |
| ------------------- | ---------------------------------------------------- | ---------------------------- | -------- |
| `lead`              | sequencing, dispatch, gates, reporting, git          | no `Write`/`Edit`            | `opus`   |
| `planner`           | `docs/plans/**`, `docs/adr/**`                       | `Write`, no `Agent`          | `opus`   |
| `implementer-api`   | `apps/api/src/**` that is not a spec                 | `Write`, no `Agent`          | `sonnet` |
| `implementer-web`   | `apps/web/src/**` that is not a spec                 | `Write`, no `Agent`          | `sonnet` |
| `plan-reviewer`     | a verdict on the plan                                | `Read`, `Grep`, `Glob`       | `opus`   |
| `code-reviewer`     | a verdict on the diff                                | `Read`, `Grep`, `Glob`       | `opus`   |
| `tester-unit`       | `**/src/**/*.spec.ts`, `*.unit.cases.md`             | `Write`, `Bash`              | `sonnet` |
| `tester-api`        | `*.api.spec.ts`, `*.api.cases.md`                    | `Write`, `Bash`              | `sonnet` |
| `tester-functional` | `*.functional.spec.ts`, `*.functional.cases.md`, MCP | `Write`, `Bash`, `browser_*` | `sonnet` |
| `tester-security`   | `e2e/security/**`, the two route lists, `pnpm audit` | `Write`, `Bash`              | `opus`   |
| `tester-acceptance` | the `pnpm verify` gate and the acceptance report     | `Write`, `Bash`              | `sonnet` |

`opus` is for the roles where one mistake costs an iteration — planning, judging, and security.
`sonnet` is for work bounded by an accepted plan or by a convention. In the first iteration every
agent inherited the parent's model because the parameter was never passed, and a mechanical markdown
edit ran on the most expensive model available; role definitions remove that choice from the
orchestrator's memory.

## The two boundaries worth stating

**Test artifacts belong to testers, product code to implementers.** `e2e/**`, `**/*.spec.ts` and
`*.cases.md` are the testers'; `apps/**/src/**` that is not a spec is the implementers'. A file-level
split is checkable; "the implementer writes tests too, responsibly" is not. Two consequences:

- the red test that reproduces a defect (`bugfix-pipeline` §5) is written by `tester-api`,
  `tester-functional` or `tester-unit` — not by whoever will fix it;
- an implementer who finds a missing case reports it. They do not add it.

**Reviewers are read-only in the literal sense.** They hold `Read`, `Grep` and `Glob`, describe
fixes in words, and never touch the tree. The same rule is why acceptance may not fix anything.

## Handoff

Every dispatch is **self-contained**. The receiving agent is a fresh process: it cannot see this
conversation, the previous agent's reasoning, or anything not in its brief.

A brief has five parts and nothing else:

1. **Task** — one or two sentences of what to produce.
2. **Where** — paths, the plan section (`T2.3`), the case IDs.
3. **Read** — which documents, by name. Never retell them: the corpus is ~250k tokens, and agents
   re-reading it was measured at roughly 29% of an iteration's spend.
4. **Constraints** — what must not change, and anything the user said that still applies.
5. **Report back** — the artifact and the facts wanted (commands and numbers, not "done").

A returned artifact is accepted or sent back **whole**. The lead does not edit a reviewer's blockers,
soften a verdict, or merge two roles' outputs into one story.

## When the team is the wrong tool

The flow has real cost: more dispatches, more context, more wall-clock. Use the short path when:

- the fix is one line and its cause is known — `bugfix-pipeline` §4 says a red test, the fix, an
  `FX-` entry, no plan and no team;
- the change is documentation, config or a rename;
- the work is smaller than the brief needed to hand it over.

For a feature the size of "a page plus two endpoints" the full flow is right, and the budget is in
`feature-pipeline` §8.

## Parallel work

Two agents editing one tree are not parallel, whatever ports they get: Next 16 registers its dev
server per project directory, `test-results/` and `storageState` collide by name, and
`.git/index.lock` does the rest. **A parallel stage means one git worktree per agent** (`ADR-0012`).

An agent in its own worktree is invisible from here. Do not report its progress — you have none. Its
result lives in that worktree's `git log` and `git diff`, and merging is a separate deliberate step.

Split parallel tasks so they **do not overlap by file**; that is what the "files" column in a plan's
task table is for. `implementer-api` and `implementer-web` are the natural split, since the two
applications share no runtime code.
