# ADR-0007 — An in-memory store with a code seed instead of a database

- **Status:** accepted
- **Date:** 2026-09-07
- **Supersedes:** —
- **Superseded by:** —

## Context

- `FACT-3120` The subject of this project is the contract, the suite and the development process. —
  `docs/architecture.md`, `docs/process.md`

> **Rationale — not a fact.** A database would add a container, migrations, a connection lifecycle
> and a reset story for tests, none of which teaches anything the project is about — while costing
> every contributor a working Docker.

## Decision

- `FACT-3121` Services own plain arrays, seeded at module init from `*.seed.ts`. — `FACT-1026`
- `FACT-3122` Passwords sit in `users.seed.ts` as plaintext and are hashed with `scrypt` at startup,
  so the store itself never holds a plaintext password. — `FACT-1028`,
  `apps/api/src/users/users.service.ts`
- `FACT-3123` The suite gets a mirror of the seed in `e2e/fixtures/seed.ts`, the single source of
  logins, passwords and meeting titles for tests. — `FACT-1032`
- `FACT-3124` Drift between the seed and its mirror fails `SM-API-02` / `SM-API-03`. — `FACT-1033`
- `FACT-3125` Test isolation is achieved through data, not through resets: `teacher` (5 meetings) and
  `student` (0 meetings) are read-only and carry the absolute assertions. — `FACT-1034`,
  `FACT-1035`, `FACT-1039`
- `FACT-3126` `planner` and `organizer` are the mutation sandboxes for the API and UI suites
  respectively, because Playwright runs both projects in parallel against one store. — `FACT-1036`,
  `FACT-1037`, `FACT-1040`

Rejected:

- `FACT-3127` A database — see Context. — this record
- `FACT-3128` A test-only reset endpoint — a back door in a production API. —
  `docs/BACKLOG.md`, Rejected
- `FACT-3129` One shared user for everything — parallel projects would race. — this record

## Consequences

- `FACT-3130` `nest start --watch` restarts on every edit and wipes anything a test created, so no
  test may depend on data created by another. — `FACT-1027`, `FACT-1030`
- `FACT-3131` Mutating cases use relative counters, never absolute ones. — `e2e/README.md`,
  `FACT-1031`
- `FACT-3132` Created meetings are dated 2030. — `FACT-1023`
- `FACT-3133` Replacing the seed with a migration is `BL-004`, marked as conflicting with
  `e2e/fixtures/seed.ts`. — `docs/BACKLOG.md`, `BL-004`

> **Rationale — not a fact.** The store's contents depend on what ran before, which is why counters
> are relative. The 2030 dating makes created meetings sort predictably against the seed and never
> collide with "recent" assertions. `BL-004` and the fixture change together or `SM-API-02` goes red.
