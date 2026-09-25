# apps/api — Nest.js 12

An addition to the root [`CLAUDE.md`](../../CLAUDE.md), not a copy of it. The Nest invariants
(rules 1–8), the split of runs ("Who runs what") and the ledger process are described **there** and
deliberately not restated here: a copied rule drifts from the original silently, which is how this
repository earned `FX-023`. The endpoint contract, the seeded user table and the environment
variables are in the neighbouring [`README.md`](README.md). This file holds only what you need to
know **before** editing the code.

Before changing behaviour, read the corpus for this side of the system:
[`docs/api-contract.md`](../../docs/api-contract.md) (every endpoint and its logic),
[`docs/data-model.md`](../../docs/data-model.md) (shapes, formats, seed) and the layer rules in
[`docs/architecture.md`](../../docs/architecture.md). A route added or renamed without its row in
the contract document fails `AR-API-05`; a guarded one missing from `PROTECTED_ROUTES` fails
`AR-API-06`.

## Map

| Path                   | What is there                                                               |
| ---------------------- | --------------------------------------------------------------------------- |
| `src/main.ts`          | bootstrap; `x-powered-by` off, no CORS and no prefix — see the file head    |
| `src/app.module.ts`    | module wiring and **`ValidationPipe` as an `APP_PIPE` provider**            |
| `src/auth/`            | controller, `AuthService`, `TokenService`, `JwtAuthGuard`, `@CurrentUser()` |
| `src/meetings/`        | controller, the in-memory service, DTOs, mapper, seed                       |
| `src/users/`           | user service and seed (plaintext passwords → `scrypt` at startup)           |
| `src/common/crypto/`   | `scrypt` hashing and constant-time comparison                               |
| `src/config/`          | reads `JWT_SECRET` / `JWT_EXPIRES_IN` from the environment                  |
| `test/app.e2e-spec.ts` | supertest, for exactly one thing: `AppModule` boots in a test module        |

## How this package differs from ordinary Nest

- **Pure ESM.** `"type": "module"`, so every relative import carries a `.js` extension —
  `import { AppService } from './app.service.js'` — even though the file next to it is `.ts`. An
  import without the extension type-checks and fails at runtime.
- **No database, in-memory repositories.** `nest start --watch` restarts on every edit and wipes
  anything the tests created. Hence the suite rule: no test relies on data created by another, and
  each mutating spec file has its own owner.
- **`.env` is not read** — neither `dotenv` nor `@nestjs/config` is wired in. Variables come from
  the process environment, and `.env.example` documents the contract.
- **The JWT secret has a stable constant default** rather than a random string at startup: with
  `--watch`, a random secret would invalidate issued tokens on every edit.

## Where tests go

- **Units** — next to the code, `*.spec.ts`, with the title starting with the case ID
  (`AL-UT-09 — …`), or neither `pnpm test:<feature>` nor the meta-test pairing check works.
- **HTTP contract** — in the root `e2e/regression/<feature>/<feature>.api.spec.ts`, **not** in
  `test/app.e2e-spec.ts`, or coverage spreads across two sets of differing freshness.
- **A new protected endpoint** — a line in `PROTECTED_ROUTES` (`e2e/security/security.api.spec.ts`),
  or the cross-feature security suite silently stops covering what is new.

## Commands

```bash
pnpm dev:api                              # from the root, watch mode on 3001
pnpm --filter @purpleschool/api test      # this package's units
pnpm --filter @purpleschool/api test:e2e  # the supertest module-boot check
```

The units usually need no manual run: they are part of `pnpm verify` and of the `pre-commit` hook —
see "Who runs what" in the root `CLAUDE.md`.
