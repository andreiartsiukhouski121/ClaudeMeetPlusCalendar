# ADR-0001 — A pnpm monorepo with two applications and shared config packages

- **Status:** accepted
- **Date:** 2026-09-07
- **Supersedes:** —
- **Superseded by:** —

## Context

- `FACT-3000` The product needs a Next.js front end and a Nest.js API that share a contract, a lint
  baseline and a TypeScript baseline. — `apps/web`, `apps/api`, `packages/eslint-config`,
  `packages/tsconfig`

> **Rationale — not a fact.** Two repositories would mean the contract lives in neither and drifts in
> both: every contract change would need two pull requests, and nothing would fail when only one
> landed.

## Decision

- `FACT-3001` One pnpm workspace: `apps/web`, `apps/api`, and `packages/eslint-config` +
  `packages/tsconfig` as the shared baselines each application extends. — `pnpm-workspace.yaml`
- `FACT-3002` The Playwright suite sits at the repository root, outside the `pnpm-workspace.yaml`
  globs, so `pnpm -r` never touches it and one `playwright.config.ts` serves both applications. —
  `playwright.config.ts`, `pnpm-workspace.yaml`

Rejected:

- `FACT-3003` A single application with API routes in Next — the Nest contract is the teaching
  subject here. — this record
- `FACT-3004` Two repositories — see Context. — this record
- `FACT-3005` A `packages/shared-types` package — the contract is asserted by the suite, and a shared
  type would let both sides drift together without a test noticing. — this record, `ADR-0008`

> **Rationale — not a fact.** The root placement is also what makes the e2e suite able to assert on
> the contract _between_ the two applications (`ADR-0008`).

## Consequences

- `FACT-3006` `pnpm -r` addresses packages, so anything at the root needs its own script in the root
  `package.json` — which is why `verify` lives there. — `package.json`
- `FACT-3007` The two applications share no runtime code: the only shared artifacts are configs and
  the test suite, and a type duplicated on both sides is held together by a case, never by an
  import. — `apps/web/src/lib/types.ts`, `ADR-0008`

> **Rationale — not a fact.** A change spanning both applications is then one commit, one review and
> one `pnpm verify`.
