# ADR-0012 — Parallel agents are isolated by git worktree, never by port

- **Status:** accepted
- **Date:** 2026-09-08
- **Supersedes:** —
- **Superseded by:** —

## Context

The obvious way to run two agents on one repository is to give each its own ports. It does not work,
and the failure was reproduced rather than reasoned about: **Next 16 registers its dev server per
project directory, not per port.** While one `next dev` is running in `apps/web`, a second starts on
no port at all — `Another next dev server is already running` — Playwright's `webServer` never comes
up, and the run ends with `Exit code: 1` and **zero tests executed**.

Ports are not even the whole problem. In one tree, two runs share `test-results/`,
`playwright-report/` and the `storageState` files by name; they share `JWT_SECRET: 'e2e-secret'`, so
one run's token is accepted by the other's server — and that divergence is silent; and they collide
on `.git/index.lock` and `node_modules`.

## Decision

**A parallel stage means one git worktree per agent.** Different ports
(`E2E_WEB_PORT=3200 E2E_API_PORT=3201 pnpm e2e`) matter only afterwards, so two worktrees do not
collide on 3100/3101.

How the worktree is created is a property of the machine, not of the project: this machine has a
machine-wide `agent-team` skill (the `claude-team` CLI, one worktree and one terminal window per
agent); a fresh clone has nothing, and there it is `git worktree add` by hand. The **requirement** is
the worktree; the tooling is one way to satisfy it.

Rejected: ports alone (reproduced failure above); a shared tree with a task lock (serializes the work
the parallelism was for); one agent per application in one tree (`next dev` is the blocker, and it is
per directory).

## Consequences

- Before `pnpm e2e`, a running `pnpm dev` must be stopped — otherwise there is no run at all.
- Tasks are split so they do not overlap by file. Shared files (`app.module.ts`, `e2e/README.md`, a
  `*.unit.cases.md`) are either assigned to one agent or edited after the merge; that is what the
  "files" column in a plan's task table is for.
- An agent in its own worktree is a separate process with **no shared context**: its brief must be
  self-contained, its progress is invisible from here, and merging its branch is a separate
  deliberate step. Claiming to know what such an agent is doing is a reporting error.
- Tooling for worktree creation, ports and teardown is `BL-013`.
