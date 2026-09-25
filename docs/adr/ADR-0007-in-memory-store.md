# ADR-0007 — An in-memory store with a code seed instead of a database

- **Status:** accepted
- **Date:** 2026-09-07
- **Supersedes:** —
- **Superseded by:** —

## Context

The subject of this project is the contract, the suite and the development process. A database would
add a container, migrations, a connection lifecycle and a reset story for tests, none of which
teaches anything the project is about — while costing every contributor a working Docker.

## Decision

Services own plain arrays, seeded at module init from `*.seed.ts`. Passwords sit in `users.seed.ts`
as plaintext and are hashed with `scrypt` at startup, so the store itself never holds a plaintext
password.

The suite gets a **mirror** of the seed in `e2e/fixtures/seed.ts` — the single source of logins,
passwords and meeting titles for tests. Drift between the two fails `SM-API-02`/`SM-API-03`.

Test isolation is achieved **through data, not through resets**: `teacher` (5 meetings) and
`student` (0 meetings) are read-only and carry the absolute assertions; `planner` and `organizer` are
the mutation sandboxes for the API and UI suites respectively, because Playwright runs both projects
in parallel against one store.

Rejected: a database (see Context); a test-only reset endpoint (a back door in a production API,
rejected in `BACKLOG.md`); one shared user for everything (parallel projects would race).

## Consequences

- `nest start --watch` restarts on every edit and wipes anything a test created. Hence the suite
  rule: no test may depend on data created by another.
- Mutating cases use **relative** counters, never absolute ones — the store's contents depend on
  what ran before.
- Created meetings are dated 2030 so they sort predictably against the seed and never collide with
  "recent" assertions.
- Replacing the seed with a migration is `BL-004`, and it is marked as conflicting with
  `e2e/fixtures/seed.ts`: the two change together or `SM-API-02` goes red.
