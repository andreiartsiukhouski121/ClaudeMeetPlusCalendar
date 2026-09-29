# @purpleschool/api

Nest.js 12, pure ESM (`"type": "module"`, imports carry the `.js` extension). The port comes from
`PORT`, defaulting to 3001. Playwright starts its own instance on 3101.

```bash
pnpm dev:api                              # from the root, watch mode
pnpm --filter @purpleschool/api test      # units
pnpm --filter @purpleschool/api test:e2e  # supertest: AppModule boots in a test module
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

## Storage and the seed

There is no database — the repositories are in-memory and the seed is applied when the services
initialize. The consequence: `nest start --watch` restarts on every edit and wipes whatever the
tests created, so no test may depend on data created by another.

User passwords sit in `users.seed.ts` as plaintext and are hashed with `scrypt` at startup — a
deliberate concession of a demo without a database: the store itself holds no plaintext. In a real
project the seed file would be replaced by a migration with pre-computed hashes.

| User                          | Password    | Meetings | Role in the tests                                  |
| ----------------------------- | ----------- | -------- | -------------------------------------------------- |
| `teacher@purpleschool.test`   | `Passw0rd!` | 5        | read-only; exact numbers and the "last 3" ordering |
| `student@purpleschool.test`   | `Passw0rd!` | 0        | read-only; the "no meetings" edge case             |
| `planner@purpleschool.test`   | `Passw0rd!` | 1        | mutation sandbox for the API tests                 |
| `organizer@purpleschool.test` | `Passw0rd!` | 1        | mutation sandbox for the functional tests          |

`teacher` and `student` **must never be mutated**: absolute assertions depend on them. Separate
owners for the API and UI tests are needed because Playwright runs the projects in parallel against
a shared store.

The test-side mirror of the seed is `e2e/fixtures/seed.ts`; drift is caught by
`e2e/smoke/seed.api.spec.ts`.

## Configuration

`.env` is **not read** — neither dotenv nor `@nestjs/config` is wired in. Variables come from the
process environment; `.env.example` documents the contract.

| Variable         | Default                   | Note                                         |
| ---------------- | ------------------------- | -------------------------------------------- |
| `PORT`           | `3001`                    | Playwright passes `3101`                     |
| `JWT_SECRET`     | `purpleschool-dev-secret` | a `Logger.warn` is emitted when it is absent |
| `JWT_EXPIRES_IN` | `1h`                      | must match the cookie lifetime in `apps/web` |

The secret is a stable constant rather than a random string at startup: with `--watch`, a random
secret would invalidate issued tokens on every edit.

CORS is off and there is no global prefix, deliberately: the only clients are Next.js's server-side
`fetch` and Playwright's `request` fixture — no browser reaches here. A bare `enableCors()` would
open the API to any site for zero benefit.
