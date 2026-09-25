# ADR-0001 — A pnpm monorepo with two applications and shared config packages

- **Status:** accepted
- **Date:** 2026-09-07
- **Supersedes:** —
- **Superseded by:** —

## Context

The product needs a Next.js front end and a Nest.js API that share a contract, a lint baseline and a
TypeScript baseline. Two repositories would mean the contract lives in neither and drifts in both:
every contract change would need two pull requests, and nothing would fail when only one landed.

## Decision

One pnpm workspace: `apps/web`, `apps/api`, and `packages/eslint-config` + `packages/tsconfig` as
the shared baselines each application extends.

The Playwright suite sits at the **repository root**, not inside an application: the root is outside
the `pnpm-workspace.yaml` globs, so `pnpm -r` never touches it and one `playwright.config.ts` serves
both applications. That is also what makes the e2e suite able to assert on the contract _between_
them (`ADR-0008`).

Rejected: a single application with API routes in Next (the Nest contract is the teaching subject
here); two repositories (see Context); a `packages/shared-types` package (the contract is asserted by
the suite, and a shared type would let both sides drift together without a test noticing).

## Consequences

- A change spanning both applications is one commit, one review and one `pnpm verify`.
- `pnpm -r` addresses packages, so anything at the root needs its own script in the root
  `package.json`. That is deliberate and is why `verify` lives there.
- The two applications do **not** share runtime code. The only shared artifacts are configs and the
  test suite; a type duplicated on both sides is held together by a case, never by an import.
