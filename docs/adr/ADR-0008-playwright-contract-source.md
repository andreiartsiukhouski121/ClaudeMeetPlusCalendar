# ADR-0008 — Playwright at the root, on dedicated ports, owns the contract

- **Status:** accepted
- **Date:** 2026-09-07
- **Supersedes:** —
- **Superseded by:** —

## Context

- `FACT-3140` `apps/api/test/app.e2e-spec.ts` (supertest) asserts against a test module rather than
  the running server, and cannot see the browser side at all. — `apps/api/test/app.e2e-spec.ts`
- `FACT-3141` A `next start` sitting on 3000 serves a stale build, so a Playwright run reusing it
  goes green on code that does not work. — `FX-013`, `CLAUDE.md`, "Playwright runs on dedicated
  ports"

> **Rationale — not a fact.** The HTTP contract is the thing both applications must agree on, so the
> checks that hold it cannot live inside either one of them. The stale-build failure is silent and
> total, which is why ports matter more than they look.

## Decision

- `FACT-3142` The Playwright config, the suite and the fixtures live at the repository root, outside
  the workspace globs, so one config serves both applications and `pnpm -r` never touches it. —
  `playwright.config.ts`, `FACT-3002`
- `FACT-3143` Playwright starts its own servers on 3100 (web) and 3101 (api) and owns them. —
  `playwright.config.ts`
- `FACT-3144` `E2E_WEB_PORT` / `E2E_API_PORT` shift that pair for a second worktree. —
  `playwright.config.ts`, `ADR-0012`
- `FACT-3145` The Playwright project is chosen by filename suffix: `*.api.spec.ts` → `api` (the
  `request` fixture, no browser), `*.functional.spec.ts` → `web` (Chrome). —
  `playwright.config.ts`, `e2e/suite-integrity.api.spec.ts`
- `FACT-3146` A spec named anything else joins no project and silently never runs; `suite-integrity`
  rule 1 exists for that. — `e2e/suite-integrity.api.spec.ts`
- `FACT-3147` `apps/api/test/app.e2e-spec.ts` keeps exactly one job: proving the module boots. New
  HTTP contract checks go to `e2e/regression/<feature>/<feature>.api.spec.ts`. —
  `apps/api/test/app.e2e-spec.ts`, `CLAUDE.md`, "Tests: what lives where"
- `FACT-3148` The server address is set in `playwright.config.ts` and reaches a test through a
  fixture or an option; it is never recomputed inside the suite. — `suite-integrity` rule 9,
  `FX-023`

## Consequences

- `FACT-3149` `pnpm dev` and `pnpm e2e` are mutually exclusive in one working tree: Next 16 registers
  its dev server per project directory, so the dev server must be stopped before a run. — `ADR-0012`,
  `CLAUDE.md`
- `FACT-3150` The suite is the canonical description of the contract and `docs/api-contract.md` is
  its prose companion; `AR-API-05` keeps the two from drifting apart on routes. — `FACT-2000`,
  `AR-API-05`

> **Rationale — not a fact.** Every contract fact has exactly one home. A test asserting the contract
> in two places is a defect, not extra safety: the copies rot at different speeds.
