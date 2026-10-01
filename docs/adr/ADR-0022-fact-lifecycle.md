# ADR-0022 — A fact is appended and retired, never deleted or rewritten in place

- **Status:** accepted
- **Date:** 2026-09-30
- **Supersedes:** —
- **Superseded by:** —

## Context

- `FACT-3480` `ADR-0021` states that a key is never renumbered and never reused, and that a withdrawn
  fact retires its number the way `FEAT-S5` is retired rather than deleted. — `ADR-0021`, Decision
  and Consequences
- `FACT-3481` Nothing enforces that. `AR-API-11`…`AR-API-14` check that keys are unique, sourced,
  outside rationale blocks and resolvable; none of them looks at what a key said yesterday. —
  `e2e/architecture/architecture.api.spec.ts`
- `FACT-3482` A fact can therefore be deleted outright, and every reference to it held outside this
  repository — in a plan, a review note, an agent's memory — keeps pointing at a key that silently
  stopped existing. Only `AR-API-14` would notice, and only for references inside the repository. —
  `AR-API-14`, `ADR-0021`, Consequences
- `FACT-3483` A fact's statement can also be rewritten to say something different under the same key,
  which is worse than deletion: every reference still resolves, and every reader believes the new
  statement was what they cited. — `e2e/architecture/architecture.api.spec.ts`
- `FACT-3484` This repository already solves the same problem for an external dependency by pinning a
  hash per entry in a committed lock file and comparing disk against it offline. —
  `skills-lock.json`, `scripts/skills-sync.mjs`
- `FACT-3485` The two flows the repository already treats as append-only are the decision log — a
  changed decision is a new record whose `Supersedes` names the old one — and the stage inventory,
  where a removed stage keeps its ID retired because a profiling record cites it. —
  `docs/adr/README.md`, "Rules"; `ADR-0020`, `FACT-3451`
- `FACT-3486` A closed backlog item is marked closed with a reference and never deleted, for the same
  reason. — `FACT-3205`

> **Rationale — not a fact.** A key is an address, and the whole value of `ADR-0021` is that
> something outside this repository can hold that address and later find out what became of it.
> An address that can be deleted, or silently repointed at different content, is not an address.

## Decision

**A fact is appended and retired. It is never deleted, and its statement is never rewritten to say
something else under the same key.**

- `FACT-3487` When reality changes, the old fact is **retired** and a new fact with a fresh key
  states what is true now; the retirement names the successor key. — this record
- `FACT-3488` A fact that stops being true with no replacement is **withdrawn**, and the withdrawal
  names what withdrew it: a ledger entry, an ADR, or a commit. — this record
- `FACT-3489` Retired and withdrawn facts leave the body of the document and are listed in a
  `## Retired facts` table at its end, which is the register of every key that document has ever
  allocated and no longer states. — this record
- `FACT-3490` That table is the only place a retired statement survives, so it is not a duplicate of
  anything. — this record, `ADR-0019`, `FACT-3409`

The register's form, one row per retired key — shown fenced, because a live table here would be
parsed as two real facts in the wrong block:

```
| Key         | Stated                                 | Status                 | Recorded in |
| ----------- | -------------------------------------- | ---------------------- | ----------- |
| `FACT-1042` | the statement exactly as it last stood | `retired by FACT-1073` | `CH-0NN`    |
| `FACT-2019` | the statement exactly as it last stood | `withdrawn`            | `FX-0NN`    |
```

- `FACT-3491` `docs/facts-lock.json` pins every key ever allocated, its status, its successor where
  it has one, and a SHA-256 of its statement — the shape `skills-lock.json` already uses. —
  `docs/facts-lock.json`, `FACT-3484`
- `FACT-3492` `pnpm fact:lock` regenerates the lock from the corpus; `pnpm fact:check` compares the
  corpus against it offline. — `scripts/facts-lock.mjs`
- `FACT-3493` `AR-API-15` fails when a key the lock knows is absent from the corpus altogether —
  neither stated nor in a Retired facts register. — `e2e/architecture/architecture.api.spec.ts`
- `FACT-3494` `AR-API-16` fails when a retirement names no successor, names one that does not exist,
  names one that is itself retired, or when a withdrawal names no source. —
  `e2e/architecture/architecture.api.spec.ts`
- `FACT-3495` `AR-API-17` fails when a stated fact's text no longer matches the hash the lock holds
  for it. — `e2e/architecture/architecture.api.spec.ts`

**What `AR-API-17` is and is not.** It is a tripwire, not a prohibition: `pnpm fact:lock` will
happily bless a rewrite. What it removes is _silence_ — a changed statement can no longer reach a
commit without the lock's diff sitting beside it, which is what a reviewer reads. That is the same
bargain `skills:check` makes, and the same one the ledger's "Found by" column makes.

Rejected:

- `FACT-3496` Leaving the lifecycle to git history — it records that a line changed, never that a
  fact was retired or by what; this is the argument `ADR-0011` already made against trusting git as
  the ledger. — this record, `FACT-3208`
- `FACT-3497` Striking retired facts through in place — the corpus is read before every task, and a
  document that accumulates dead statements among live ones costs every future reader to keep them
  apart. — this record
- `FACT-3498` A status field on every fact (`active` in 522 places) — it would put a word on every
  line to carry information that is only ever interesting for the few that are not active. —
  this record
- `FACT-3499` Recording only the set of keys, without hashing the statements — it catches deletion
  and misses rewriting, and rewriting is the failure that leaves every reference resolving while
  meaning something else. — this record, `FACT-3483`
- `FACT-3500` A separate register file for all retirements across the corpus — the register belongs
  to the document whose numbers it accounts for, and one shared file would be edited by every change
  at once. — this record

## Consequences

- `FACT-3501` Correcting a fact costs a decision: a wording fix regenerates the lock, and a change of
  meaning retires and replaces. — this record
- `FACT-3502` The corpus grows monotonically: each document accumulates a register that is never
  pruned, the way `docs/process.md` carries a retired `FEAT-S5`. — `FACT-3451`
- `FACT-3503` `pnpm fact:lock` is not wired into `pnpm verify`, because a command that regenerates
  the thing being checked cannot run inside its own check. — `package.json`
- `FACT-3504` The retirement path is exercised by a fixture in the meta-test rather than by a real
  retirement, because there are none yet; without it the rules would pass having parsed nothing,
  which is the vacuous-green class `ADR-0010` exists to close. —
  `e2e/architecture/architecture.api.spec.ts`, `FACT-3189`

> **Rationale — not a fact.** The cost is real and falls on exactly the moment a document is being
> corrected, which is the moment the temptation to overwrite is strongest. That is where the brake
> belongs.
