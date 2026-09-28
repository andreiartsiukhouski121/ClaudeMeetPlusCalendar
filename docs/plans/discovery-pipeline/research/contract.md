# Research — contract

The promises a new stage would have to respect. This change touches no HTTP contract; the contracts
here are the string-level ones the process machinery matches on.

## Section 0 of a plan

- Five labels, in this order, in `scripts/check-orientation.mjs`: `Duplicate`,
  `Conflicts with shipped`, `Conflicts with planned`, `Architecture impact`, `Open questions`.
- `Duplicate` and `Conflicts with planned` demand a `FT-`/`CH-`/`FX-`/`BL-` ID or one of the fixed
  phrases in `EXPLICIT_NO_MATCH`; `Architecture impact` demands an `ADR-` ID on the same terms.
- The same list is duplicated on purpose in `e2e/process/process.api.spec.ts` as
  `REQUIRED_LABELS`, and `PR-API-01` fails when the templates and that list disagree.
- The templates themselves supply the "field left untouched" baseline —
  `templateAnswers()` in `scripts/check-orientation.mjs`, whose comment records that an untouched
  plan used to pass because the prompt text was long enough and contained "no matches".

## Template discovery

- `e2e/process/process.api.spec.ts` finds templates by the glob `^TEMPLATE.*\.md$` and **requires
  each match to carry section 0 with all five labels**. Any new file in `docs/plans/` named
  `TEMPLATE…` inherits that requirement.
- `scripts/check-orientation.mjs` carries the template list explicitly as `TEMPLATES`, and
  `PR-API-02` checks every discovered template appears in it.

## An existing "evidence or say so" convention

- `e2e/suite-integrity.api.spec.ts` recognises exactly one syntax for a declared-but-unautomated
  case: `NOT_AUTOMATED_MARKER = /^\s*-\s*\*\*Not automated:\*\*/`, with the comment that free prose
  "would mean any paragraph containing the words could switch the check off".
- So the repository already has the shape "either the thing, or an explicit marked exception" — and
  already knows why it must be a fixed syntax rather than prose.

## The corpus, and what it says about context

- `docs/architecture.md` lists the four corpus documents and states they are disjoint by subject.
- `.claude/skills/project-context/SKILL.md` maps each role to the documents it opens first.
- `ADR-0015` records that the corpus is "read, not rebuilt", with the measured reason: agents
  re-deriving the same facts were roughly 29% of an iteration's spend.
- **Not found:** any notion of _per-change_ context in the corpus. `ADR-0015` is entirely about
  durable, project-wide documents. Searched `docs/adr/`, `docs/architecture.md`, the skills.

## Invariants and data

- **Not found:** anything in invariants 1–19 that constrains process documents; all nineteen are
  about `apps/api`, `apps/web` and security. Searched `CLAUDE.md`.
- No entity, DTO, seed value or endpoint is in scope: `docs/api-contract.md` and
  `docs/data-model.md` describe nothing this change alters.
