# ADR-0011 — A ledger, and an orientation gate before any planning

- **Status:** accepted
- **Date:** 2026-09-08
- **Supersedes:** —
- **Superseded by:** —

## Context

Without a written history every task starts with a guess — "have we done this already?" — and the
project grows a second `format:check`, a second way to check the session, a second timing fix.
Half the defects in this repository are invisible in a diff: a vacuously passing meta-test, lint
rules at `warn`, a login timing oracle, an endless redirect on a broken cookie. Nothing in the code
records that they happened.

An index alone does not help, though: it only works if reading it is unavoidable.

## Decision

Two files, and one gate that forces them open.

- **`docs/CHANGELOG.md`** — shipped features (`FT-`), process changes (`CH-`) and **every defect
  found** (`FX-`) with a "Found by" column. That column is the only way to learn which checks
  actually work; today it says control experiments and the security suite found three defects each,
  and diff review found none.
- **`docs/BACKLOG.md`** — what is ahead, with a mandatory "Conflicts with" column, and a **Rejected**
  section with reasons, so the same idea is not proposed again every other week. A closed item is
  marked closed with a reference and **never deleted**.
- **The orientation gate** — section 0 of every plan holds written answers about duplication,
  conflicts with shipped work, conflicts with planned work, architecture impact and open questions.
  `pnpm check:orientation` runs in `.husky/pre-commit` and in `pnpm verify`: an empty answer, a
  brush-off, an answer under 20 characters, untouched template text or a citation of a non-existent
  entry fails the commit.

Rejected: trusting git history (it records what changed, not what was decided or rejected); a single
"notes" file (a defect log and a plan queue have different lifetimes and different readers).

## Consequences

- Every task ends with a ledger entry. A task is not done until the row exists — and the commit hash
  goes in the **next** commit via `pnpm ledger:fill`, since a hash cannot be known before the commit
  and `--amend` would change it again.
- Finding that a task is a duplicate is a **complete result**: "already done in `FX-007`" ends the
  work, it does not refuse it.
- The gate proves orientation was _written_, never that it was _right_. Judging the answers is
  review's job, deliberately (`ADR-0010`).
