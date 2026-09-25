# ADR-0013 — The project is English-only

- **Status:** accepted
- **Date:** 2026-09-25
- **Supersedes:** —
- **Superseded by:** —

## Context

The repository was written in Russian: documents, comments, test titles, UI strings, API messages and
the seed. That is workable for one author and costs something the moment anyone or anything else
reads it — and several of the strings are not prose at all but **machine-readable contracts**: the
section-0 labels the orientation checker parses, the `Not automated` marker the suite meta-test
matches, the `Rejected` heading the ledger test splits on, and every UI label a `getByRole({ name })`
locator addresses.

## Decision

Everything is English: documents, skills, code comments, test titles, `.cases.md` files, UI strings,
API error messages and the seed data. Commits made before this decision are **not** rewritten — the
ledger references their hashes (`LG-API-04`), and rewriting history to translate a subject line would
break every reference for nothing.

The migration moved prose and contracts in lockstep, because a half-translated contract passes
vacuously rather than failing.

## Consequences

- New text is written in English by default; a Russian string anywhere is a defect, not a style
  choice.
- Changing a UI label is a contract change: the functional locators address labels by name, so the
  spec moves in the same commit.
- Changing a seed value changes two files — `apps/api/src/**/*.seed.ts` and its mirror
  `e2e/fixtures/seed.ts` — or `SM-API-02` goes red.
- The six historical documents in `docs/` were translated and condensed, but keep an archive banner:
  they record _why_, and must not be cited for conventions.
