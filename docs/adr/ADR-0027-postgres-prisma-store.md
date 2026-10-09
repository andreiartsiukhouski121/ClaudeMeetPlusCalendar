# ADR-0027 — PostgreSQL via Prisma, run by docker-compose, replaces the in-memory store

- **Status:** accepted
- **Date:** 2026-10-05
- **Supersedes:** [ADR-0007](ADR-0007-in-memory-store.md)
- **Superseded by:** —

## Context

- `FACT-3562` The owner settled four scoping decisions before any research ran: users and meetings
  both move to Prisma, PostgreSQL is run by docker-compose, file bytes live in the database, and
  both the API and `apps/web` are in scope. —
  `docs/plans/meeting-files/research/README.md`
- `FACT-3563` Docker `29.8.2` and Docker Compose `v5.5.1` run on the development machine, and a
  `postgres:18-alpine` compose service with a `pg_isready` healthcheck answered `select version()`
  with PostgreSQL `18.6`. — `docs/plans/meeting-files/research/probes.md`
- `FACT-3564` `docker compose up -d --wait` blocks until the healthcheck passes and then exits `0`.
  — `docs/plans/meeting-files/research/probes.md`
- `FACT-3565` Both CI jobs run on `ubuntu-latest`, and the workflow declares no `services:` block
  and no container. — `.github/workflows/ci.yml`
- `FACT-3566` `SEC-API-10` fails `pnpm verify` for any `.env` file in the repository that does not
  end `.env.example`. — `e2e/security/security.api.spec.ts`
- `FACT-3567` Neither `dotenv` nor `@nestjs/config` is installed; `apps/api/src/config/auth.config.ts`
  reads `process.env` directly and falls back to an in-code constant with a `Logger.warn`. —
  `apps/api/src/config/auth.config.ts`
- `FACT-3568` `playwright.config.ts`'s `webServer` is a list: one plugin is constructed per entry,
  and the entries are awaited one at a time in array order, each until its `url` answers. —
  `docs/plans/meeting-files/research/probes.md`
- `FACT-3569` Constructing a Prisma client does not connect; the connection is attempted at the
  first query, which rejects with `P1001` when nothing is listening. —
  `docs/plans/meeting-files/research/probes.md`
- `FACT-3570` No commit, ledger entry, backlog item or ADR in this repository's history has ever
  proposed a database, an ORM, Docker or file storage; `ADR-0007` refused a database outright and
  was never superseded. — `docs/plans/meeting-files/research/history.md`

> **Rationale — not a fact.** `ADR-0007` argued that a database "would add a container, migrations,
> a connection lifecycle and a reset story for tests, none of which teaches anything the project is
> about — while costing every contributor a working Docker." Every one of those costs is real and is
> paid here. What changed is not the arithmetic but the requirement: the owner asked for file
> attachments persisted in a database, and a store that dies with the process cannot hold them. This
> record does not claim `ADR-0007` was wrong; it records that its premise no longer matches what the
> project is asked to do.

## Decision

- `FACT-3571` Persistence is PostgreSQL, run from a `docker-compose.yml` at the repository root
  holding one service, `db`, with a `pg_isready` healthcheck. — this record
- `FACT-3572` `User`, `Meeting` and `MeetingFile` are tables. The services read and write through
  one injected Prisma client and keep no in-process copy of the data. — this record
- `FACT-3573` Two databases live on that one server: `purpleschool` for `pnpm dev` and
  `purpleschool_e2e` for the suite, so a development session and a Playwright run never share rows.
  — this record
- `FACT-3574` The connection string reaches the API through `process.env.DATABASE_URL` only.
  `apps/api/src/config/database.config.ts` falls back to the compose service's development URL and
  warns, in exactly the shape `auth.config.ts` already uses for `JWT_SECRET`; no `.env` file is
  added. — this record, `apps/api/src/config/auth.config.ts`
- `FACT-3575` Playwright passes the suite's `DATABASE_URL` in the api `webServer.env` block, beside
  the `JWT_SECRET` that block already carries. — this record, `playwright.config.ts`
- `FACT-3576` `docker compose up -d --wait` runs as the first step of `apps/api`'s own `dev` script,
  and reaches a Playwright run two levels down — `pnpm e2e` starts the api `webServer`, which runs
  `start:e2e`, which runs `db:reset`, which runs it — so CI needs no `services:` block and no
  workflow-specific database definition. — this record, `playwright.config.ts`,
  `.github/workflows/ci.yml`
- `FACT-3577` The seed is applied by a standalone script, `pnpm --filter @purpleschool/api db:seed`.
  No service constructor and no lifecycle hook touches the database. — this record
- `FACT-3578` The seed source keeps plaintext passwords and the seed script hashes them with
  `scrypt` before the row is written, so the database never holds a plaintext password. — this
  record, `docs/BACKLOG.md`, `BL-004`
- `FACT-3579` The suite's database is dropped, re-pushed and re-seeded once per run, before the API
  starts, by the command Playwright's api `webServer` entry runs. — this record
- `FACT-3580` Test isolation stays isolation-through-data: `FACT-3125`, `FACT-3126` and `FACT-3131`
  are carried forward unchanged, and the per-run reset replaces only the restart that used to clear
  the store. — this record
- `FACT-3581` The Prisma client is never connected eagerly: no `$connect()`, no `OnModuleInit` and
  no `enableShutdownHooks()`, so the connection opens at the first query. — this record, `FACT-3569`
- `FACT-3582` `startsAt` and `uploadedAt` are `String` columns holding ISO 8601 UTC, not `DateTime`
  columns, so what is stored is byte-identical to what the wire carries. — this record, `FACT-1018`

Rejected:

- `FACT-3584` A test-only reset endpoint — still a back door in a production API; the rejection
  recorded at `FACT-3128` is carried forward and the reset happens outside the running application.
  — this record, `FACT-3128`
- `FACT-3585` Seeding from a service constructor on every boot — every API start would write to a
  shared database, two starts would race, and seeding is not a thing a service knows about once the
  rows outlive the process. — this record
- `FACT-3586` A committed `.env` holding the compose credentials — the obvious move is the one the
  suite rejects. — `FACT-3566`
- `FACT-3587` `@nestjs/config` or `dotenv` — reading `process.env` with an in-code development
  fallback is what this API already does for its only other secret. — `FACT-3567`
- `FACT-3588` A GitHub Actions `services:` block for PostgreSQL — it would be a second definition of
  the database beside `docker-compose.yml`, and two copies of one fact drift silently. —
  `docs/CHANGELOG.md`, `FX-023`
- `FACT-3589` A repository or data-access layer between the service and Prisma — the service already
  owns the store, and an interface whose only second implementation is a hand-written fake moves the
  unit tests from testing the code to testing the fake. — this record, `FACT-0013`
- `FACT-3590` `DateTime` columns — Prisma maps `DateTime` to `timestamp without time zone`, and a
  zone-less column is what every UTC pin in this project exists to avoid. —
  `docs/plans/meeting-files/research/probes.md`
- `FACT-3591` Schema-issued identifiers (`@default(uuid())`) — the format divergence this repository
  already tracks is `BL-024`, and settling it is that item's job, not a side effect of changing
  where rows live. — `docs/BACKLOG.md`, `BL-024`
- `FACT-3592` Making `participants` a relation to `User` — no scoping decision asks for it;
  `ADR-0017`'s stated premise is now stale, which is a reason to revisit that record deliberately
  rather than to change it in passing. — `ADR-0017`

## Consequences

- `FACT-3593` `ADR-0007` is superseded by this record, and the four facts it stated that this
  decision falsifies are retired in its own `## Retired facts` register, each naming its successor
  above. The ten it still states remain true under PostgreSQL and are cited from here rather than
  repeated. — `docs/adr/ADR-0007-in-memory-store.md`, `ADR-0022`
- `FACT-3594` `BL-004`'s "Depends on: a database" is satisfied by this record, and `BL-004` stays
  open: the seed source still holds plaintext rather than pre-computed hashes. — `docs/BACKLOG.md`,
  `BL-004`
- `FACT-3595` Every contributor and every CI run now needs a working Docker to run `pnpm e2e` or
  `pnpm verify`. — this record

> **Rationale — not a fact.** The costs are the ones `ADR-0007` listed, and naming them again is the
> point of this section. The intent behind the lazy connection is that a contributor without Docker
> can still run `pnpm lint`, `pnpm typecheck` and `pnpm test`. That holds for the unit layer, which
> probe 7 measured; that the supertest spec also boots `AppModule` through Nest DI and exits cleanly
> with an undisposed adapter pool is an inference and is recorded as one in the design's open
> questions, not asserted here. What they cannot do is accept a change, and that is the real
> price. The reset story is the other one: it is now a command that must run before the servers, and
> if someone reuses a server that is already up, the reset silently does not happen. The same
> property already applies to `JWT_SECRET` under `reuseExistingServer`, so it is a known shape rather
> than a new one — but it is a shape that bites in exactly the moment a run goes mysteriously red.

## Retired facts

The register of the keys this record has allocated and no longer states (`ADR-0022`). The decision
itself stands; the row below is a consequence that a later record changed.

| Key         | Stated                                                                                                                                                                               | Status                 | Recorded in |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- | ----------- |
| `FACT-3583` | Identifiers go on being issued by the application exactly as today: the seed supplies the prefixed literals and the create path a `randomUUID()`; the schema declares no `@default`. | `retired by FACT-3670` | `ADR-0031`  |
