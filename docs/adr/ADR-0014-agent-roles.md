# ADR-0014 — Roles are fixed agent definitions with their own tools and model

- **Status:** accepted
- **Date:** 2026-09-25
- **Supersedes:** —
- **Superseded by:** —

## Context

Work here was being done by whichever agent happened to be dispatched, with whatever permissions and
model it inherited. That produced two measured failures.

**Cost.** In the first iteration all ten agents inherited the parent's model because the `model`
parameter was never passed: a mechanical markdown edit (288k tokens) and a proofreading pass ran on
the most expensive model available. Plan review with its follow-ups reached 1,005,347 tokens — 46% of
the whole spend — without producing a line of product code.

**Boundaries in prose do not hold.** `regression-verify` §5 forbids "fixed it while I was there" in
words; the pipeline audit found the reviewer had nonetheless been granted write access to any file
and the ability to run any command. A rule that only exists in a prompt is a request. A tool list is
a mechanism.

The frontmatter schema was unverified, which is why `BL-014` stayed open. It has now been checked on
this machine (Claude Code 2.1.273): a file in `.claude/agents/` with `name`, `description`, `tools`
and `model` registers as a `subagent_type`, and the declared tool list is what the agent gets.

## Decision

Every role is a file in `.claude/agents/`, and the role's limits are its **tool list**, not its
prompt:

| Role                                                             | Does                                                | Cannot, by tools              |
| ---------------------------------------------------------------- | --------------------------------------------------- | ----------------------------- |
| `lead`                                                           | orchestrates: dispatches, sequences, gates, reports | write files                   |
| `planner`                                                        | writes the plan from the corpus                     | run the app, review, dispatch |
| `implementer-api`, `implementer-web`                             | write product code                                  | write tests, dispatch         |
| `plan-reviewer`, `code-reviewer`                                 | judge and report in text                            | edit anything, run anything   |
| `tester-unit`, `-api`, `-functional`, `-security`, `-acceptance` | write and run tests, report results                 | touch product code, dispatch  |

Two boundaries are worth naming because they are choices rather than consequences:

1. **Test artifacts belong to the testers, product code to the implementers.** `e2e/**`,
   `**/*.spec.ts` and `*.cases.md` are the testers' files; `apps/**/src/**` that is not a spec is the
   implementers'. A file-level split is checkable and reviewable; "the implementer writes tests too,
   responsibly" is not. It follows that the red test before a fix (`bugfix-pipeline` §5) is written
   by a tester, not by whoever is fixing.
2. **Reviewers are read-only in the literal sense** — `Read`, `Grep`, `Glob`. They describe fixes;
   they never apply them.

Models are assigned per role rather than inherited: `opus` where a mistake costs an iteration
(planning, review, security), `sonnet` where the work is bounded by an accepted plan or is mechanical
(implementation, unit and functional testing).

Rejected: one general-purpose agent with a role in its prompt (the boundary is unenforced, and the
model is whatever the parent had); a reviewer with `Edit` "for small fixes" (the audit finding above);
letting the lead implement when it is faster (then nothing gates the work, and the lead's judgement is
about its own code).

## Consequences

- Role definitions are code: `AR-API-07` checks that every file in `.claude/agents/` has the four
  frontmatter fields, that `name` matches the filename, and that every role the `team-roles` skill
  names exists on disk.
- The flow costs more calls than one agent doing everything. That is the point — the gates are where
  the defects were found — but it means small changes take the short path (`bugfix-pipeline` §4), not
  the full team.
- An agent in a separate worktree is still a separate process with no shared context (`ADR-0012`);
  role definitions change what it is allowed to do, not what it can see.
- `BL-014` is closed by this decision.
