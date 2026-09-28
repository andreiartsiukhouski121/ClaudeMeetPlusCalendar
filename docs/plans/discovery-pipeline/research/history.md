# Research — history

What the written record already says about staged discovery, up-front documents and who writes what.

## Has this been proposed before?

- **No matches.** No `FT-`, `CH-` or `FX-` entry mentions research, discovery or design as a stage —
  searched `docs/CHANGELOG.md`. No `BL-` item covers it — searched `docs/BACKLOG.md`, both the Open
  and Closed tables. Nothing in the **Rejected** section covers it either.
- The nearest neighbours are `CH-013` (two named workflows: feature and bugfix) and `CH-016` (the
  agent team with fixed roles). Both add structure to the same flow; neither adds a stage before
  planning.

## What the record says about up-front documents

- `CH-004` moved the process away from "100 minutes of planning against 85 of code" — quoted in
  `.claude/skills/bugfix-pipeline/SKILL.md` §4 as the reason a one-line fix gets no plan.
- `FX-013`: a hand-maintained table of expected test counts drifted from reality and made an
  acceptance blocker impossible to satisfy.
- `FX-027`: the same measurement paragraph lived in four files and all four copies went stale.
- `FX-023`: a rule copied between files drifted from its original silently.
- `docs/plans/README.md` records that the first two plans reached ~2000 lines, and that three of the
  nine blockers in the second review and both blockers in the third were bookkeeping introduced by
  editing the documents themselves.

## Prior decisions that constrain this change

- `ADR-0014` — roles are fixed agent definitions whose limits are their tool list; it names the
  measured reasons (everything inheriting the parent's model; a reviewer found holding write
  access).
- `ADR-0015` — the corpus is the mandatory planning context, disjoint by subject, read rather than
  rebuilt.
- `ADR-0010` — a convention that matters is written as a test that fails when it is broken, with two
  rules: a meta-test must prove it found something, and machines check form while humans check
  meaning.
- `ADR-0011` — the ledger plus the orientation gate; a step that cannot be skipped technically.

## Recent changes to the area

- `ec70ad6` — merge of `feat/architecture-corpus`: added `docs/adr/`, the corpus, the eleven roles
  and `e2e/architecture/`.
- `0b1aa85` — merge of `chore/english-migration`.
- `git log --oneline -- scripts/check-orientation.mjs` shows it has been edited in every process
  change since it was introduced, most recently to add the fifth orientation label.

## Open backlog items that touch the same machinery

- `BL-013` — tooling for a worktree per agent: creation, ports, teardown. Still open.
- `BL-020` — enforce the role file-ownership split mechanically rather than by tool list and review.
  Still open; a new role family makes it slightly larger.
- **Not found:** any item about research, discovery or design stages. Searched `docs/BACKLOG.md`.
