# @purpleschool/api

Nest.js 12, pure ESM (`"type": "module"`, imports carry the `.js` extension). The port comes from
`PORT`, defaulting to 3001. Playwright starts its own instance on 3101.

```bash
pnpm dev:api                              # from the root, watch mode (starts the container first)
pnpm --filter @purpleschool/api test      # units — no database needed
pnpm --filter @purpleschool/api test:e2e  # supertest: AppModule boots in a test module
pnpm --filter @purpleschool/api db:up     # the Postgres container alone
pnpm --filter @purpleschool/api db:reset  # drop + db push + seed; refuses without DATABASE_URL
```

## Endpoints

Every route, its request, response and error bodies:
[`docs/api-contract.md`](../../docs/api-contract.md) (`ADR-0019`) — the route listing lives there
alone, so this file keeps no copy of its own.

Three things that are easy to break unnoticed:

- **`POST /auth/login` answers `200`, not `201`.** Nest defaults POST to 201, so the method carries
  `@HttpCode(HttpStatus.OK)`. Remove the decorator and the contract breaks silently.
- **`total` is the owner's full meeting count, not the length of `items`.** `items` is cut by the
  limit.
- **`ownerId` comes from the token, never from the request body.** `CreateMeetingDto` has no owner
  field, and `forbidNonWhitelisted` rejects any attempt to send one.
- **The file download builds its `Content-Disposition` header, never interpolates it.** The
  `filename` column has more than one writer, so the read path validates its own output
  (`ADR-0029`, `SEC-API-11`).

## Storage and the seed

PostgreSQL through Prisma, run by the repository's `docker-compose.yml` (`ADR-0027`). Two databases
live on that one server: `purpleschool` for `pnpm dev` and `purpleschool_e2e` for the suite, so a
development session and a Playwright run never share rows. The suite's database is dropped,
re-pushed and re-seeded once per run by `start:e2e`, before Nest starts — so no test may depend on
data created by another, and each mutating spec file has its own owner.

The seed is **not** applied at startup: no service constructor and no lifecycle hook touches the
database. `pnpm db:seed` runs the standalone `prisma/seed.ts`, which applies the rows declared in
`src/users/users.seed.ts`, `src/meetings/meetings.seed.ts` and
`src/meeting-files/meeting-files.seed.ts`.

User passwords sit in `users.seed.ts` as plaintext and the seed script hashes them with `scrypt`
before the row is written, so the database never holds a plaintext password. In a real project the
seed file would be replaced by a migration with pre-computed hashes (`BL-004`).

| User                          | Password    | Meetings | Files | Role in the tests                                                                     |
| ----------------------------- | ----------- | -------- | ----- | ------------------------------------------------------------------------------------- |
| `teacher@purpleschool.test`   | `Passw0rd!` | 5        | 2     | read-only; exact numbers and the "last 3" ordering                                    |
| `student@purpleschool.test`   | `Passw0rd!` | 0        | 0     | read-only; the "no meetings" edge case                                                |
| `planner@purpleschool.test`   | `Passw0rd!` | 2        | 5     | mutation sandbox for the API tests, plus `SEC-API-11`'s never-mutated fixture meeting |
| `organizer@purpleschool.test` | `Passw0rd!` | 1        | 0     | mutation sandbox for the functional tests                                             |
| `eraser@purpleschool.test`    | `Passw0rd!` | 0        | 0     | used only by `HD-API-23` and `SM-API-02`; nothing else moves its total                |

`teacher` and `student` **must never be mutated**: absolute assertions depend on them. Separate
owners for the API and UI tests are needed because Playwright runs the projects in parallel against
one database.

The test-side mirror of the seed is `e2e/fixtures/seed.ts`; drift is caught by
`e2e/smoke/seed.api.spec.ts`.

## Configuration

`.env` is **not read** — neither dotenv nor `@nestjs/config` is wired in. Variables come from the
process environment; `.env.example` documents the contract.

| Variable         | Default                   | Note                                              |
| ---------------- | ------------------------- | ------------------------------------------------- |
| `PORT`           | `3001`                    | Playwright passes `3101`                          |
| `JWT_SECRET`     | `purpleschool-dev-secret` | a `Logger.warn` is emitted when it is absent      |
| `JWT_EXPIRES_IN` | `1h`                      | must match the cookie lifetime in `apps/web`      |
| `DATABASE_URL`   | the compose dev URL       | same shape; Playwright passes the `_e2e` database |

The secret is a stable constant rather than a random string at startup: with `--watch`, a random
secret would invalidate issued tokens on every edit.

CORS is off and there is no global prefix, deliberately: the only clients are Next.js's server-side
`fetch` and Playwright's `request` fixture — no browser reaches here. A bare `enableCors()` would
open the API to any site for zero benefit.
