---
name: team-roles
description: The agent team contract for this repository — the twenty-three roles, what each is forbidden to do, how work is handed between them, which model each runs on, and when the team is the wrong tool. Use when orchestrating a feature or a fix across several agents, when dispatching a researcher, designer, planner, implementer, reviewer or tester, when asked "who should do this", or before deciding the full flow is needed at all.
---

Twenty-three roles, each a file in `.claude/agents/`. A role's limits are its **tool list**, not its
prompt: `regression-verify` §5 has forbidden "fixed it while I was there" in words for a long time,
and an audit still found the reviewer holding write access to every file. Prose is a request; a tool
list is a mechanism (`ADR-0014`).

This file is the contract. The order of stages is in `feature-pipeline` or `bugfix-pipeline`; how
research is gathered is in `research-protocol`; what a design must contain is in `design-protocol`;
the documents every role works from are in `project-context`.

## The roles

| Role                   | Owns                                                 | Tools                             | Model    |
| ---------------------- | ---------------------------------------------------- | --------------------------------- | -------- |
| `lead`                 | sequencing, dispatch, gates, reporting, git          | no `Write`/`Edit`                 | `opus`   |
| `researcher`           | `research/README.md`; dispatches the sweeps          | `Write`, `Agent`                  | `opus`   |
| `researcher-code`      | `research/code.md`                                   | `Write`, `Bash`, no `Agent`       | `sonnet` |
| `researcher-contract`  | `research/contract.md`                               | `Write`, `Bash`, no `Agent`       | `sonnet` |
| `researcher-tests`     | `research/tests.md`                                  | `Write`, `Bash`, no `Agent`       | `sonnet` |
| `researcher-history`   | `research/history.md`                                | `Write`, `Bash`, no `Agent`       | `haiku`  |
| `research-reviewer`    | a verdict on the research                            | `Read`, `Grep`, `Glob`            | `opus`   |
| `designer`             | `design.md`, `docs/adr/**`                           | `Write`, no `Agent`               | `opus`   |
| `design-reviewer`      | a verdict on the design                              | `Read`, `Grep`, `Glob`            | `opus`   |
| `planner`              | `<slug>.plan.md`                                     | `Write`, no `Agent`               | `opus`   |
| `plan-reviewer`        | a verdict on the plan                                | `Read`, `Grep`, `Glob`            | `opus`   |
| `test-designer`        | `*.cases.md` — the scenario text, every level        | `Write`, no `Edit`/`Bash`/`Agent` | `opus`   |
| `implementer-api`      | `apps/api/src/**` that is not a spec                 | `Write`, no `Agent`               | `sonnet` |
| `implementer-web`      | `apps/web/src/**` that is not a spec                 | `Write`, no `Agent`               | `sonnet` |
| `code-reviewer`        | a verdict on the diff                                | `Read`, `Grep`, `Glob`            | `opus`   |
| `tester-unit`          | `**/src/**/*.spec.ts`                                | `Write`, `Bash`                   | `sonnet` |
| `tester-api`           | `*.api.spec.ts`, `*.integration.spec.ts`             | `Write`, `Bash`                   | `sonnet` |
| `tester-functional`    | `*.functional.spec.ts`, MCP                          | `Write`, `Bash`, `browser_*`      | `sonnet` |
| `tester-security`      | `e2e/security/**`, the two route lists, `pnpm audit` | `Write`, `Bash`                   | `opus`   |
| `tester-acceptance`    | the `pnpm verify` gate and the acceptance report     | `Write`, `Bash`                   | `sonnet` |
| `pipeline-reviewer`    | `docs/profiling/reviews/**`; evidence, no verdicts   | `Write`, no `Edit`/`Bash`         | `opus`   |
| `pipeline-planner`     | `docs/profiling/plans/**`; proposals for the owner   | `Write`, no `Edit`/`Bash`         | `opus`   |
| `pipeline-implementer` | the approved pipeline edits, and only those          | `Write`, `Edit`, `Bash`           | `sonnet` |

`FIX-S9`, a defect's design stage, is the one place `design.md` does not always belong to `designer`:
when the fix has no shape, `planner` writes it — one line, at `FIX-S10` — instead of a `designer`
being dispatched for a document `bugfix-pipeline` itself calls "usually short, and often one line".
The file still belongs to whichever role touches it; only the choice of role is conditional, and it
is named here rather than left to judgement.

`AR-API-08` compares this table against `.claude/agents/` **in both directions**: a role named here
without a definition cannot be dispatched, and a definition nobody names here is unreachable.

`opus` is for the roles where one mistake costs an iteration — deciding, judging, and security.
`sonnet` is for work bounded by an accepted artifact or by a convention. `haiku` is for retrieval.
In the first iteration every agent inherited the parent's model because the parameter was never
passed, and a mechanical markdown edit ran on the most expensive model available; role definitions
take that choice out of the orchestrator's memory.

**The `researcher` overrides its sweeps' models per dispatch** with the `model` parameter — raising a
thin sweep, dropping pure retrieval — and records which model ran each one in `research/README.md`.
That is the only place in the flow where model choice is a per-run decision rather than a fixed
property of the role.

## Only two roles dispatch

`lead` and `researcher` hold `Agent`. Nothing else does, so the dispatch tree is at most two levels
deep and its cost stays legible. Nested dispatch was verified by probe on this machine rather than
assumed (`ADR-0016`).

## The three boundaries worth stating

**Research records, it does not conclude.** Every statement in `research/` carries a citation;
anything uncitable is an open question or a `Not found` line. A sweep that quietly designs makes the
design unreviewable, because its reasoning arrives already wrapped in a conclusion.

**Scenarios belong to the test designer, specs and runs to testers, product code to implementers.**
`*.cases.md` — the scenario text, at every level — is `test-designer`'s; `e2e/**` specs and
`**/*.spec.ts` are the testers'; `apps/**/src/**` that is not a spec is the implementers'. A
file-level split is checkable; "the implementer writes tests too, responsibly" is not. The point of
the split survives moving `*.cases.md` off the testers: no agent grades its own homework, and
separating "what must be true" from "the code that asserts it" is what keeps that property, not
which specific role holds the pen. So the red test that reproduces a defect (`bugfix-pipeline` §5)
is written by a tester against a scenario it did not author, not by whoever will fix it, and an
implementer who spots a missing case reports it rather than adding it. This ownership rule governs
**team dispatches**; below `bugfix-pipeline` §4's threshold there is no team ("When the team is the
wrong tool", below), and the fixer writes the case row with the spec, one agent doing what two would
otherwise split.

**A failing test the plan did not mark as expected to break is not edited by the agent that finds
it.** If an agent believes the test, not the application, is wrong — once the ordinary
infrastructure causes are ruled out first (an orphaned server, a hung `@playwright/test`, a
parallel `pnpm dev`, a measurement-order flake) — it reports rather than fixes: `lead` files a `BL-`
row in `docs/BACKLOG.md` with the case ID, the exact command and verbatim output, why the test is
believed wrong, what would have to change, and the argument that the implementation is right. The
owner decides; acceptance does not proceed on a disputed test in the meantime.

**Reviewers are read-only in the literal sense.** They hold `Read`, `Grep` and `Glob`, describe
fixes in words, and never touch the tree. The same rule is why acceptance may not fix anything.

## Handoff

Every dispatch is **self-contained**. The receiving agent is a fresh process: it cannot see this
conversation, the previous agent's reasoning, or anything not in its brief.

A brief has five parts and nothing else:

1. **Task** — one or two sentences of what to produce.
2. **Where** — paths, the change folder, the plan section (`T2.3`), the case IDs.
3. **Read** — which documents, by name. Never retell them: the corpus is ~250k tokens, and agents
   re-reading it was measured at roughly 29% of an iteration's spend.
4. **Constraints** — what must not change, and anything the user said that still applies.
5. **Report back** — the artifact and the facts wanted (commands and numbers, not "done").

From the design stage onward the brief names the **change folder** rather than restating its
contents: `docs/plans/<slug>/` is the context, and it is read, not summarized into the prompt.

A returned artifact is accepted or sent back **whole**. The lead does not edit a reviewer's blockers,
soften a verdict, or merge two roles' outputs into one story.

## When the team is the wrong tool

The flow has real cost: the stages and gates in `docs/process.md`, more context and more
wall-clock. Use the short path when:

- the fix is one line and its cause is known — `bugfix-pipeline` §4 says a red test, the fix, an
  `FX-` entry, no folder, no stages, no team;
- the change is documentation, config or a rename;
- the work is smaller than the brief needed to hand it over.

This is not a loophole. `CH-004` exists because planning once took 100 minutes against 85 of code,
and adding stages makes that failure cheaper to repeat, not harder.

## Parallel work

Two agents editing one tree are not parallel, whatever ports they get: Next 16 registers its dev
server per project directory, `test-results/` and `storageState` collide by name, and
`.git/index.lock` does the rest. **A parallel stage means one git worktree per agent** (`ADR-0012`).

The research sweeps are the exception that proves it: they only read, and each writes one file of
its own, so they run in parallel in one tree without colliding.

An agent in its own worktree is invisible from here. Do not report its progress — you have none. Its
result lives in that worktree's `git log` and `git diff`, and merging is a separate deliberate step.
