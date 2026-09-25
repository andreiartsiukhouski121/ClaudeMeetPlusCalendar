---
name: nestjs-best-practices
description: NestJS rules from an external skill, corrected against this repository's invariants — four of the forty are wrong here. Use when writing, reviewing or refactoring anything under apps/api, and before applying any "NestJS best practice" to this codebase.
---

Adapter for the external `nestjs-best-practices` skill (40 rules, `kadajett/agent-nestjs-skills`).
The rules live in `.agents/skills/nestjs-best-practices/rules/`; the directory is in `.gitignore`
and the set is restored with `pnpm skills:sync`. **If the directory is missing, everything below
still works:** the conflict table and the applicability limits are self-contained — only the texts
of the rules themselves are missing.

**Read it as recommendations, not as law.** The law is invariants 1–8 of the root `CLAUDE.md`: each
has already broken an implementation here and is now held by a test.

## The four rules that are wrong in this repository

| Rule of the skill                                                              | Why not here                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `security-validate-all-input.md`, `api-use-pipes.md` → `app.useGlobalPipes(…)` | Invariant 3: `ValidationPipe` is registered as an `APP_PIPE` provider in `AppModule`. With `useGlobalPipes` the test modules boot the app **without** validation and the 400 checks disagree with the real server |
| `security-auth-jwt.md` → `UnauthorizedException('User not found or inactive')` | Invariants 6 and 18: a wrong password and an unknown email give the same message **and** the same response time. A different text is account enumeration, already found as `FX-007`                               |
| `devops-use-config-module.md` → `@nestjs/config` / `ConfigModule.forRoot()`    | `apps/api` deliberately does not read `.env`: neither dotenv nor `@nestjs/config` is wired in, variables come from the process environment, and the contract is documented in `.env.example`                      |
| `test-e2e-supertest.md` → endpoint contracts through supertest                 | The canonical source of the HTTP contract is `e2e/regression/<feature>/<feature>.api.spec.ts` on Playwright. `apps/api/test/app.e2e-spec.ts` exists for exactly one thing: "`AppModule` boots"                    |

The TypeORM examples (`db-use-migrations.md`, `arch-feature-modules.md`, `db-avoid-n-plus-one.md`)
do not apply to this code: there is no database, the repositories are in-memory, and moving to
migrations is backlog item `BL-004`.

## What is useful in the skill

- `security-rate-limiting.md` — this is the open `BL-001` (P1, the only production blocker: brute
  force on `POST /auth/login` is unlimited). If you take it on, those rules are on point.
- `arch-single-responsibility`, `di-prefer-constructor-injection`, `error-handle-async-errors`,
  `arch-avoid-circular-deps` — they conflict with nothing and match how the code is already written.

## Before applying any rule

1. Check it against invariants 1–8 and `apps/api/CLAUDE.md`.
2. A behavioural change means a new or updated case in `e2e/regression/`; a new protected endpoint
   means a line in `PROTECTED_ROUTES`.
3. A discrepancy between the skill and the code where the **skill** turns out to be right is a
   defect: an `FX-` entry with the "Found by" column.
