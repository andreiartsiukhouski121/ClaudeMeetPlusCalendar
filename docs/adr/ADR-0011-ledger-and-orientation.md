# ADR-0011 — A ledger, and an orientation gate before any planning

- **Status:** accepted
- **Date:** 2026-09-08
- **Supersedes:** —
- **Superseded by:** —

## Context

- `FACT-3200` Half the defects in this repository are invisible in a diff: a vacuously passing
  meta-test, lint rules at `warn`, a login timing oracle, an endless redirect on a broken cookie. —
  `docs/CHANGELOG.md`, "Found by"
- `FACT-3201` Nothing in the code records that those defects happened. — `docs/CHANGELOG.md`

> **Rationale — not a fact.** Without a written history every task starts with a guess — "have we
> done this already?" — and the project grows a second `format:check`, a second way to check the
> session, a second timing fix. An index alone does not help: it only works if reading it is
> unavoidable.

## Decision

Two files, and one gate that forces them open.

- `FACT-3202` `docs/CHANGELOG.md` holds shipped features (`FT-`), process changes (`CH-`) and every
  defect found (`FX-`), with a "Found by" column. — `docs/CHANGELOG.md`,
  `e2e/ledger/ledger.api.spec.ts`
- `FACT-3203` The "Found by" column today records that control experiments and the security suite
  found three defects each, and that diff review found none. — `docs/CHANGELOG.md`
- `FACT-3204` `docs/BACKLOG.md` holds what is ahead with a mandatory "Conflicts with" column, and a
  Rejected section with reasons. — `docs/BACKLOG.md`, `e2e/ledger/ledger.api.spec.ts`
- `FACT-3205` A closed backlog item is marked closed with a reference and never deleted. —
  `docs/BACKLOG.md`
- `FACT-3206` Section 0 of every plan holds written answers about duplication, conflicts with shipped
  work, conflicts with planned work, architecture impact and open questions. —
  `docs/plans/TEMPLATE.md`
- `FACT-3207` `pnpm check:orientation` runs in `.husky/pre-commit` and in `pnpm verify`, and fails
  the commit on an empty answer, a brush-off, an answer under 20 characters, untouched template text
  or a citation of a non-existent entry. — `scripts/check-orientation.mjs`, `.husky/pre-commit`

Rejected:

- `FACT-3208` Trusting git history — it records what changed, not what was decided or rejected. —
  this record
- `FACT-3209` A single "notes" file — a defect log and a plan queue have different lifetimes and
  different readers. — this record

> **Rationale — not a fact.** The "Found by" column is the only way to learn which checks actually
> work, and the Rejected section exists so the same idea is not proposed again every other week.

## Consequences

- `FACT-3210` Every task ends with a ledger entry, and the commit hash goes in the next commit via
  `pnpm ledger:fill`. — `scripts/fill-ledger-hash.mjs`, `.claude/skills/git-commit/SKILL.md`
- `FACT-3211` Finding that a task is a duplicate is a complete result: "already done in `FX-007`"
  ends the work rather than refusing it. — `CLAUDE.md`, "What has been done"
- `FACT-3212` The gate proves orientation was written, never that it was right. — `ADR-0010`,
  `FACT-3190`

> **Rationale — not a fact.** A hash cannot be known before the commit, and `--amend` would change it
> again — hence the follow-up commit. Judging the orientation answers is review's job, deliberately.
