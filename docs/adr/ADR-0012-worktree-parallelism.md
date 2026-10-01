# ADR-0012 — Parallel agents are isolated by git worktree, never by port

- **Status:** accepted
- **Date:** 2026-09-08
- **Supersedes:** —
- **Superseded by:** —

## Context

- `FACT-3220` Next 16 registers its dev server per project directory, not per port. Reproduced:
  while one `next dev` runs in `apps/web`, a second starts on no port at all — `Another next dev
server is already running` — Playwright's `webServer` never comes up, and the run ends with
  `Exit code: 1` and zero tests executed. — `CLAUDE.md`, "Isolating parallel agents"
- `FACT-3221` In one tree, two runs share `test-results/`, `playwright-report/` and the
  `storageState` files by name. — `playwright.config.ts`
- `FACT-3222` Two runs in one tree share `JWT_SECRET: 'e2e-secret'`, so one run's token is accepted
  by the other's server, and that divergence is silent. — `playwright.config.ts`
- `FACT-3223` Two runs in one tree collide on `.git/index.lock` and `node_modules`. — reproduced on
  this machine

> **Rationale — not a fact.** The obvious way to run two agents on one repository is to give each its
> own ports. Ports are not even the whole problem — and the `next dev` failure was reproduced rather
> than reasoned about.

## Decision

- `FACT-3224` A parallel stage means one git worktree per agent. — `CLAUDE.md`, "Isolating parallel
  agents"
- `FACT-3225` Different ports (`E2E_WEB_PORT=3200 E2E_API_PORT=3201 pnpm e2e`) matter only afterwards,
  so two worktrees do not collide on 3100/3101. — `playwright.config.ts`, `FACT-3144`
- `FACT-3226` How the worktree is created is a property of the machine, not of the project: this
  machine has a machine-wide `agent-team` skill; a fresh clone has nothing and uses
  `git worktree add` by hand. — `CLAUDE.md`, "Isolating parallel agents"

Rejected:

- `FACT-3227` Ports alone — the reproduced failure above. — this record
- `FACT-3228` A shared tree with a task lock — it serializes the work the parallelism was for. —
  this record
- `FACT-3229` One agent per application in one tree — `next dev` is the blocker, and it is per
  directory. — this record

> **Rationale — not a fact.** The requirement is the worktree; the tooling is one way to satisfy it.

## Consequences

- `FACT-3230` Before `pnpm e2e`, a running `pnpm dev` must be stopped, or there is no run at all. —
  `FACT-3149`
- `FACT-3231` Tasks are split so they do not overlap by file; shared files are either assigned to one
  agent or edited after the merge, which is what the "files" column in a plan's task table is for. —
  `docs/plans/TEMPLATE.md`
- `FACT-3232` An agent in its own worktree is a separate process with no shared context: its brief
  must be self-contained, its progress is invisible from here, and merging its branch is a separate
  deliberate step. — `ADR-0014`, `.claude/skills/team-roles/SKILL.md`
- `FACT-3233` Tooling for worktree creation, ports and teardown is `BL-013`. — `docs/BACKLOG.md`

> **Rationale — not a fact.** Claiming to know what an agent in another worktree is doing is a
> reporting error.
