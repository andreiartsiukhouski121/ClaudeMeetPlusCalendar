# ADR-0010 — Conventions are executable: meta-tests instead of a style guide

- **Status:** accepted
- **Date:** 2026-09-08
- **Supersedes:** —
- **Superseded by:** —

## Context

- `FACT-3180` A spec without the `.api.`/`.functional.` suffix joined no project and never ran. —
  `e2e/suite-integrity.api.spec.ts`, `FACT-3146`
- `FACT-3181` A meta-test scanned the wrong directory, found zero files and therefore passed under
  any violation. — `docs/CHANGELOG.md`, "Found by"
- `FACT-3182` Lint rules sat at `warn` and nobody read the output. — `FX-018`
- `FACT-3183` A hand-maintained table of expected test counts drifted from reality and made
  acceptance impossible to satisfy. — `FX-013`

> **Rationale — not a fact.** Every convention in this repository that depended on care has been
> broken at least once, and the breakages were invisible. None of those is catchable by review: a
> reviewer sees a green run and a plausible diff.

## Decision

A convention that matters is written as a test that fails when it is broken.

**Source:** the file named in each row.

| Key         | Meta-test                                   | Holds                                                          |
| ----------- | ------------------------------------------- | -------------------------------------------------------------- |
| `FACT-3184` | `e2e/suite-integrity.api.spec.ts`           | nine suite rules: suffixes, `.cases.md` pairing, ID uniqueness |
| `FACT-3185` | `e2e/ledger/ledger.api.spec.ts`             | the shape of `CHANGELOG.md` and `BACKLOG.md`                   |
| `FACT-3186` | `e2e/process/process.api.spec.ts`           | the plan templates against `check-orientation.mjs`             |
| `FACT-3187` | `e2e/architecture/architecture.api.spec.ts` | the ADR log, the API contract doc, the agent definitions       |
| `FACT-3188` | `scripts/check-orientation.mjs`             | section 0 of every active plan (also in `pre-commit`)          |

Two rules keep them from becoming decorative:

- `FACT-3189` A meta-test must prove it found something: each one starts with a self-check that the
  walk returned a non-empty set. — `e2e/suite-integrity.api.spec.ts`,
  `e2e/architecture/architecture.api.spec.ts`
- `FACT-3190` Machines check form, humans check meaning. No meta-test judges whether a task
  duplicates another, whether an ADR's reasoning holds, or whether a case is worth having. —
  `e2e/architecture/architecture.api.cases.md`

Rejected:

- `FACT-3191` A written style guide — unenforced, therefore optional. — this record
- `FACT-3192` Lint rules at `warn`. — `FX-018`
- `FACT-3193` Comparing the live test count against a number in a document. — `FX-013`

> **Rationale — not a fact.** Without the non-empty self-check, a moved directory turns every rule
> vacuously green — which happened, and is why the rule exists. A check pretending to be smarter than
> it is does more harm than no check.

## Consequences

- `FACT-3194` Adding a feature means registering its case prefix in `KNOWN_CASE_PREFIXES`; an
  unregistered prefix fails its own test with instructions. — `e2e/suite-integrity.api.spec.ts`
- `FACT-3195` The meta-tests run inside `pnpm verify` and CI, so a convention violation blocks a
  merge the same way a failing feature test does. — `package.json`, `.github/workflows`

> **Rationale — not a fact.** New conventions cost more to introduce — each needs its check — which
> is the intended brake.
