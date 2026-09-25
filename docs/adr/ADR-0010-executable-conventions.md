# ADR-0010 — Conventions are executable: meta-tests instead of a style guide

- **Status:** accepted
- **Date:** 2026-09-08
- **Supersedes:** —
- **Superseded by:** —

## Context

Every convention in this repository that depended on care has been broken at least once, and the
breakages were invisible: a spec without the `.api.`/`.functional.` suffix joined no project and
never ran; a meta-test scanned the wrong directory, found zero files and therefore passed under any
violation; lint rules sat at `warn` and nobody read the output; a hand-maintained table of expected
test counts drifted from reality and made acceptance impossible to satisfy (`FX-013`).

None of those is catchable by review. A reviewer sees a green run and a plausible diff.

## Decision

A convention that matters is written as a test that fails when it is broken:

| Meta-test                                   | Holds                                                          |
| ------------------------------------------- | -------------------------------------------------------------- |
| `e2e/suite-integrity.api.spec.ts`           | nine suite rules: suffixes, `.cases.md` pairing, ID uniqueness |
| `e2e/ledger/ledger.api.spec.ts`             | the shape of `CHANGELOG.md` and `BACKLOG.md`                   |
| `e2e/process/process.api.spec.ts`           | the plan templates against `check-orientation.mjs`             |
| `e2e/architecture/architecture.api.spec.ts` | the ADR log, the API contract doc, the agent definitions       |
| `scripts/check-orientation.mjs`             | section 0 of every active plan (also in `pre-commit`)          |

Two rules keep them from becoming decorative:

1. **A meta-test must prove it found something.** Each one starts with a self-check that the walk
   returned a non-empty set. Without it, a moved directory turns every rule vacuously green — which
   happened, and is why the rule exists.
2. **Machines check form, humans check meaning.** No meta-test judges whether a task duplicates
   another, whether an ADR's reasoning holds, or whether a case is worth having. A check pretending
   to be smarter than it is does more harm than no check.

Rejected: a written style guide (unenforced, therefore optional); lint rules at `warn` (`FX-018`);
comparing the live test count against a number in a document (`FX-013`).

## Consequences

- Adding a feature means registering its case prefix in `KNOWN_CASE_PREFIXES`; forgetting is
  impossible, because an unregistered prefix fails its own test with instructions.
- The meta-tests run inside `pnpm verify` and CI, so a convention violation blocks a merge the same
  way a failing feature test does.
- New conventions cost more to introduce — each needs its check — which is the intended brake.
