# ADR-0021 — Every fact in the architecture corpus carries a key, and inference is marked as inference

- **Status:** accepted
- **Date:** 2026-09-29
- **Supersedes:** —
- **Superseded by:** —

## Context

The corpus is defined as the mandatory planning context and is read rather than re-derived
(`ADR-0015`; `CLAUDE.md`, "Architecture: the corpus every task starts from"). Four documents hold it:
`docs/architecture.md`, `docs/adr/`, `docs/data-model.md`, `docs/api-contract.md`.

The evidence rule those documents are written against already exists, but only one stage is bound by
it. `.claude/skills/research-protocol/SKILL.md:9-22` requires every statement in a research file to
carry a citation — a `path:line`, a document section, a case ID, an `FT-`/`CH-`/`FX-`/`BL-`/`ADR-`
entry or a commit — and `PR-API-06` (`e2e/process/process.api.spec.ts:322`) fails a research file
that cites nothing and marks nothing. No equivalent rule or check covers the corpus: the research
artifact is disciplined, and the durable document it feeds is not.

The existing corpus check states its own limit. `e2e/architecture/architecture.api.spec.ts:16-19`
records that it does not check "whether an ADR's reasoning is any good, or whether the prose in
`architecture.md` is true", and `e2e/architecture/architecture.api.cases.md` repeats it: "The
machine checks form, a human checks meaning". `docs/architecture.md`, "How this file is kept
honest", says the same of itself — the prose "is not machine-checkable".

In the corpus as written, a measured fact and a conclusion drawn from it occupy the same sentence
shape and are not distinguishable by a reader or by grep. Three examples, all from the current text:
`docs/data-model.md:41-42` states that `startsAt` is a string rather than a `Date` (a fact, checkable
against `apps/api/src/meetings/meetings.types.ts`) and, in the same sentence, that this is so because
"it survives JSON serialization unchanged and compares stably in assertions" (a rationale, checkable
against nothing). `docs/architecture.md`, "Patterns in use", carries a "Why here" column whose cells
are judgements — "each layer is testable without the one above it" — beside a "Where" column whose
cells are paths. `docs/api-contract.md` states, of the secondary sort key, that "with equal dates the
order would fall back to insertion and `HD-FN-05` would flake": the first half is a projection, the
second names a case.

The smallest addressable unit in the corpus today is a document section or a whole ADR. There is no
identifier for an individual statement, so nothing outside the repository — an agent's memory, a plan,
a review note — can reference one fact and later detect that it changed or was withdrawn.

The cost of a second copy of a fact is recorded twice in the ledger: `FX-023` and `FX-027` are both
entries about a rule written in more than one place and drifting. `docs/architecture.md:14-17` names
both. `ADR-0019` resolved one such case by ruling that the route listing lives in
`docs/api-contract.md` alone and other documents link to it.

## Decision

- `FACT-3460` Every statement of fact in the corpus carries a key, every keyed fact names its source,
  and anything that is not a fact is marked and carries no key. — this record
- `FACT-3461` A statement with no key is not a fact of this project and must not be relied on — by a
  person, by a role of the agent team, or by an agent's memory across sessions. — this record
- `FACT-3462` The key is `FACT-NNNN`, four digits, allocated from a block per document, never
  renumbered and never reused; a withdrawn fact retires its number the way `FEAT-S5` is retired
  rather than deleted. — `docs/process.md`, `FACT-3451`

**Source:** this record; `pnpm fact:next` reads the same blocks from `scripts/fact-next.mjs`.

| Key         | Block       | Document                                                    |
| ----------- | ----------- | ----------------------------------------------------------- |
| `FACT-3463` | `0001-0999` | [`docs/architecture.md`](../architecture.md)                |
| `FACT-3464` | `1000-1999` | [`docs/data-model.md`](../data-model.md)                    |
| `FACT-3465` | `2000-2999` | [`docs/api-contract.md`](../api-contract.md)                |
| `FACT-3466` | `3000-3999` | [`docs/adr/`](README.md) - every record, allocated in order |

- `FACT-3467` `pnpm fact:next` prints the next free number in each block. — `scripts/fact-next.mjs`
- `FACT-3468` A keyed fact carries at least one of the tokens the research protocol already accepts:
  a repository `path` or `path:line`, a case ID, an `ADR-NNNN`, an `FT-`/`CH-`/`FX-`/`BL-` entry,
  `invariant N`, or a commit hash. — `.claude/skills/research-protocol/SKILL.md`, `AR-API-12`
- `FACT-3469` In a table the key sits in a `Key` column, leading by default and trailing where a
  check already reads that table's columns by position, which is the case for the Routes table of
  `docs/api-contract.md`. — `AR-API-09`, `FACT-2004`
- `FACT-3470` In a list the key opens the line and the source closes it. — this record
- `FACT-3471` Where a whole table draws on one source, that source is declared once above it as
  `**Source:** ...` and the rows inherit it; a row may still override with its own. — `AR-API-12`
- `FACT-3472` Rationale, judgement and projection are not deleted: they move into a block opening
  with `> **Rationale - not a fact.**` and carry no key. — `AR-API-13`
- `FACT-3473` In an ADR, Context and Decision hold facts and are keyed; Consequences is mostly
  projection and is keyed only where a statement is checkable today. — this record
- `FACT-3474` Nothing here checks that a fact is true: a key and a source make a statement
  addressable and traceable, and whether the source says what the statement claims is review's
  job. — `ADR-0010`, `FACT-3190`

Rejected:

- `FACT-3475` A separate registry of facts (`docs/facts.md` listing every key, its statement and its
  source, with the corpus left as prose) - it puts every fact in two places, which is the failure
  `FX-023` and `FX-027` record and `ADR-0019` ruled against. - this record
- `FACT-3476` A per-document prefix (`AR-07`, `DM-12`, `AC-31`) - it collides visually with the
  case-ID grammar already in use, and a fact moving between corpus documents would have to be
  renumbered, breaking every reference held outside the repository. - this record
- `FACT-3477` Keys only in the ADRs - the ADRs are the one part of the corpus whose statements are
  already addressable by record and section; the documents that most need keys are the three prose
  ones, where a field format and the reason for it sit in one sentence. - this record
- `FACT-3478` Deleting unsourced prose instead of marking it - a large share of the corpus's value is
  reasoning that exists nowhere else, and an accepted ADR is not edited in substance. - this record,
  `docs/adr/README.md`
- `FACT-3479` Leaving the rule to review with no machine check - prose asking for citations is what
  the reviewer's own tool list replaced after a reviewer was found holding write access while the
  rules forbade it in words. - this record, `ADR-0010`, `FACT-3262`

> **Rationale - not a fact.** A block rather than one flat sequence, so that adding a fact to one
> document never renumbers another and so that a key names its home document on sight. Allocating by
> hand is how two `ADR-0007`s happened. The citation vocabulary is deliberately the same one the
> research protocol uses - a second citation grammar for the same purpose is the drift `FX-023`
> records. The key must live on the fact, not in a table pointing at it.

## Consequences

- Adding a fact to the corpus costs a key and a source. A change that states something new and can
  cite nothing for it has to say so as rationale, which makes the gap visible instead of settling it
  by confident wording.
- `AR-API-11`…`AR-API-14` (`e2e/architecture/architecture.api.spec.ts`) run on every `pnpm verify`:
  keys are well-formed and unique, every keyed fact carries a source token, no key appears inside a
  rationale block, and every `FACT-` reference anywhere in the repository resolves to a key the
  corpus defines.
- The check is one-directional across the repository boundary. An agent's memory lives outside git
  (`C:\Users\User\.claude\projects\<project>\memory\`), so nothing here can verify that a memory
  entry cites a real key — only that a key cited inside the repository exists. A memory entry
  pointing at a retired or renamed key is caught when it is read, not when it is written.
- Three documents change shape: statements that were flowing prose become keyed rows and lines, and
  the reasoning around them becomes marked rationale. The documents get longer and more scannable,
  and less pleasant to read end to end.
- The 21 existing records gain keys in their Context and Decision sections. That is an edit to their
  form and not to their substance, which is what `docs/adr/README.md` forbids — no decision, date,
  status or rejected alternative changes wording in this change.
- A retired key is never reused, so the corpus accumulates gaps in its numbering over time, the way
  `docs/process.md` carries a retired `FEAT-S5`.
