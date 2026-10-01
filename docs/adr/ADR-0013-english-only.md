# ADR-0013 — The project is English-only

- **Status:** accepted
- **Date:** 2026-09-25
- **Supersedes:** —
- **Superseded by:** —

## Context

- `FACT-3240` The repository was written in Russian: documents, comments, test titles, UI strings,
  API messages and the seed. — commits before `CH-014`
- `FACT-3241` Several of those strings are machine-readable contracts rather than prose: the
  section-0 labels the orientation checker parses, the `Not automated` marker the suite meta-test
  matches, the `Rejected` heading the ledger test splits on, and every UI label a
  `getByRole({ name })` locator addresses. — `scripts/check-orientation.mjs`,
  `e2e/suite-integrity.api.spec.ts`, `e2e/ledger/ledger.api.spec.ts`

> **Rationale — not a fact.** Russian is workable for one author and costs something the moment
> anyone or anything else reads it.

## Decision

- `FACT-3242` Everything is English: documents, skills, code comments, test titles, `.cases.md`
  files, UI strings, API error messages and the seed data. — `CH-014`, `CLAUDE.md`
- `FACT-3243` Commits made before this decision are not rewritten. — `CH-014`, `LG-API-04`
- `FACT-3244` The migration moved prose and contracts in lockstep. — `CH-014`

> **Rationale — not a fact.** The ledger references the old commit hashes, so rewriting history to
> translate a subject line would break every reference for nothing. A half-translated contract passes
> vacuously rather than failing, which is why prose and contracts moved together.

## Consequences

- `FACT-3245` A Russian string anywhere is a defect, not a style choice. — `CH-014`
- `FACT-3246` Changing a UI label is a contract change: the functional locators address labels by
  name, so the spec moves in the same commit. — `e2e/regression/**/*.functional.spec.ts`
- `FACT-3247` Changing a seed value changes two files — `apps/api/src/**/*.seed.ts` and its mirror
  `e2e/fixtures/seed.ts` — or `SM-API-02` goes red. — `FACT-1033`
- `FACT-3248` The six historical documents in `docs/` were translated and condensed but keep an
  archive banner: they record why, and must not be cited for conventions. — `docs/`
