# ADR-0014 — Roles are fixed agent definitions with their own tools and model

- **Status:** accepted
- **Date:** 2026-09-25
- **Supersedes:** —
- **Superseded by:** —

## Context

- `FACT-3260` In the first iteration all ten agents inherited the parent's model because the `model`
  parameter was never passed: a mechanical markdown edit (288k tokens) and a proofreading pass ran on
  the most expensive model available. — `docs/pipeline-audit.md`, `docs/profiling/`
- `FACT-3261` Plan review with its follow-ups reached 1,005,347 tokens — 46% of the whole spend —
  without producing a line of product code. — `docs/pipeline-audit.md`
- `FACT-3262` `regression-verify` §5 forbids "fixed it while I was there" in words, and the pipeline
  audit nonetheless found the reviewer had been granted write access to any file and the ability to
  run any command. — `docs/pipeline-audit.md`
- `FACT-3263` The frontmatter schema was verified on this machine (Claude Code 2.1.273): a file in
  `.claude/agents/` with `name`, `description`, `tools` and `model` registers as a `subagent_type`,
  and the declared tool list is what the agent gets. — `BL-014`, `.claude/agents/`

> **Rationale — not a fact.** A rule that only exists in a prompt is a request. A tool list is a
> mechanism.

## Decision

Every role is a file in `.claude/agents/`, and the role's limits are its tool list, not its prompt.

**Source:** `.claude/agents/`, checked by `AR-API-07` and `AR-API-08`.

| Key         | Role                                                             | Does                                                | Cannot, by tools              |
| ----------- | ---------------------------------------------------------------- | --------------------------------------------------- | ----------------------------- |
| `FACT-3264` | `lead`                                                           | orchestrates: dispatches, sequences, gates, reports | write files                   |
| `FACT-3265` | `planner`                                                        | writes the plan from the corpus                     | run the app, review, dispatch |
| `FACT-3266` | `implementer-api`, `implementer-web`                             | write product code                                  | write tests, dispatch         |
| `FACT-3267` | `plan-reviewer`, `code-reviewer`                                 | judge and report in text                            | edit anything, run anything   |
| `FACT-3268` | `tester-unit`, `-api`, `-functional`, `-security`, `-acceptance` | write and run tests, report results                 | touch product code, dispatch  |

Two boundaries are choices rather than consequences:

- `FACT-3269` Test artifacts belong to the testers and product code to the implementers: `e2e/**`,
  `**/*.spec.ts` and `*.cases.md` are the testers' files; `apps/**/src/**` that is not a spec is the
  implementers'. — `.claude/agents/`, `.claude/skills/team-roles/SKILL.md`
- `FACT-3270` The red test before a fix is written by a tester, not by whoever is fixing. —
  `.claude/skills/bugfix-pipeline/SKILL.md` §5
- `FACT-3271` Reviewers hold `Read`, `Grep` and `Glob` only: they describe fixes and never apply
  them. — `.claude/agents/code-reviewer.md`, `.claude/agents/plan-reviewer.md`
- `FACT-3272` Models are assigned per role rather than inherited: `opus` where a mistake costs an
  iteration, `sonnet` where the work is bounded by an accepted plan or is mechanical. —
  `.claude/agents/`, `.claude/skills/team-roles/SKILL.md`

Rejected:

- `FACT-3273` One general-purpose agent with a role in its prompt — the boundary is unenforced, and
  the model is whatever the parent had. — this record
- `FACT-3274` A reviewer with `Edit` "for small fixes" — the audit finding above. — this record
- `FACT-3275` Letting the lead implement when it is faster — then nothing gates the work, and the
  lead's judgement is about its own code. — this record

> **Rationale — not a fact.** A file-level split is checkable and reviewable; "the implementer writes
> tests too, responsibly" is not.

## Consequences

- `FACT-3276` `AR-API-07` checks that every file in `.claude/agents/` has the four frontmatter
  fields and that `name` matches the filename; `AR-API-08` checks that every role the `team-roles`
  skill names exists on disk. — `e2e/architecture/architecture.api.spec.ts`
- `FACT-3277` Small changes take the short path rather than the full team. —
  `.claude/skills/bugfix-pipeline/SKILL.md` §4
- `FACT-3278` An agent in a separate worktree is still a separate process with no shared context;
  role definitions change what it is allowed to do, not what it can see. — `ADR-0012`, `FACT-3232`
- `FACT-3279` `BL-014` is closed by this decision. — `docs/BACKLOG.md`

> **Rationale — not a fact.** The flow costs more calls than one agent doing everything. That is the
> point: the gates are where the defects were found.
