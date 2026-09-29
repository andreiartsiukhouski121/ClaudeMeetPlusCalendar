# ADR-0019 — The route listing lives in the API contract alone; other documents link

- **Status:** accepted
- **Date:** 2026-09-28
- **Supersedes:** — (extends `ADR-0015`; contradicts nothing in it)
- **Superseded by:** —

## Context

There are two lists of this API's endpoints, and only one of them is checked.

- `docs/api-contract.md:22-27` — the Routes table. `AR-API-05` diffs it against the Nest controllers
  in both directions, and `AR-API-06` matches its guarded rows against `PROTECTED_ROUTES`
  (`e2e/architecture/architecture.api.spec.ts:615-627`).
- `apps/api/README.md:12-20` — a second Endpoints table. Nothing reads it:
  `grep -rn "api/README" e2e/` returns nothing, and the architecture spec's file constants name
  `docs/adr/README.md`, `docs/api-contract.md`, `e2e/security/security.api.spec.ts`,
  `.claude/agents`, `apps/api/src` and the `team-roles` skill — not this file
  (`e2e/architecture/architecture.api.spec.ts:23-28`).

It has already drifted. Neither meetings row in `apps/api/README.md` mentions `401`, which
`docs/api-contract.md` lists for both, while the same file's own `/auth/*` rows do mention it
(`docs/plans/meetings-detail-participants/research/README.md`, contradiction C3). The backlog
already expects the copy to need hand-editing again: `BL-007` says
"`PROTECTED_ROUTES` and the endpoint list in `apps/api/README.md` will need extending"
(`docs/BACKLOG.md:43`).

This is the failure mode the ledger records twice. `FX-023` and `FX-027` are both entries about a
rule living in more than one copy — in `FX-027` the run-measurement paragraph existed in four copies
with three different number sets, and all four were wrong.

**Relation to `ADR-0015`.** Its rule 1 already states the principle, and states it for the corpus:
"**Disjoint, never duplicated.** A fact lives in exactly one of them; the others link. Two copies of
a rule drift silently — that is `FX-023` and `FX-027`"
(`docs/adr/ADR-0015-architecture-corpus.md`, Decision). Its Context even names `apps/api/README.md`
among the places facts were scattered before the corpus existed — but its **decision** scope is the
four corpus documents, and it never says what a package README may hold. This record extends the
same rule outward to a document outside the corpus. It **supersedes nothing** and contradicts
nothing; it would be perverse for a record about single sources to restate a rule instead of citing
the record that owns it.

Adding `GET /meetings/:id` forces the question now rather than later: a third route would otherwise
be written into two tables, one of which no run would ever check.

## Decision

**The enumerable facts of the HTTP contract — the routes, their guard, their status codes and their
error bodies — are written in `docs/api-contract.md` and nowhere else.** Any other document that
wants to show them links to it instead of restating them.

Concretely: the Endpoints table at `apps/api/README.md:12-20` and the error-shapes paragraph below
it are removed and replaced by a link to `docs/api-contract.md`. The README keeps what is genuinely
local to the package — what it is, how to run it, where its tests live.

The boundary is **enumeration versus explanation**. A table or list of routes, statuses or error
bodies is an enumeration and has one home. Prose that explains a decision, and names a fact in
passing while linking to its owner, is not a copy; `docs/architecture.md` and `docs/data-model.md`
mention routes this way today and stay as they are.

Two clarifications the boundary needs to survive contact with the file it is applied to:

- **An explanation that only restates an invariant follows the enumeration it is attached to.** The
  paragraph being removed at `apps/api/README.md:31-34` is both things at once: the
  400-array/401-string enumeration, and the `APP_PIPE`-not-`useGlobalPipes` rationale. The rationale
  is a verbatim restatement of invariant 3 that also lives in `docs/architecture.md`'s patterns
  table; it goes with the enumeration rather than being stranded above a link.
- **Explanations that stand on their own stay** — in this file, the three "easy to break unnoticed"
  bullets and the storage-and-seed note. They are copies of a weaker kind and this record does not
  reach them; they are recorded as residual duplication in the design that cites this ADR
  (`docs/plans/meetings-detail-participants/design.md` §8), rather than silently tolerated.

Rejected:

- **Patch the missing `401`s into `apps/api/README.md` and leave the table** — it fixes this
  divergence and guarantees the next one. The table drifted precisely because nothing makes it
  move, and a correct unchecked copy is the state it was already in before `FT-002` shipped a
  second route.
- **Make the second table machine-checked too** — two checked copies are still two copies, and the
  check would have to normalize two deliberately different wordings ("`400` when `limit` is outside
  `1..100`" against `400`,`401` in a column) to compare them. That is a parser written to preserve
  a duplicate no one needs.
- **Delete `apps/api/README.md` entirely** — the package-local run commands and the storage note
  have no other home, and a missing README is a worse first stop for a newcomer than a short one.
- **Move the Routes table into the README and link from the contract instead** — the meta-tests, the
  corpus rule (`ADR-0015`) and every existing citation point at `docs/api-contract.md`; inverting
  that would rewrite more than it fixes.

## Consequences

- `BL-007`'s "Conflicts with" cell is partly void once this lands: editing and deleting a meeting
  will need a `PROTECTED_ROUTES` line and a Routes-table row, but no longer an edit to
  `apps/api/README.md`. The row is updated rather than silently left wrong.
- A reader of `apps/api/README.md` now needs one hop to see the endpoints. That is the cost, and it
  buys the guarantee that what they read is the version `pnpm verify` checks.
- Nothing mechanically prevents a third copy appearing in a future README. This record is the rule a
  reviewer cites; making "no route table outside the contract" machine-checkable is not attempted
  here, because a grep for markdown tables that look like routes has no honest false-positive rate.
- The same rule explains why the Cases column of the Routes table is worth checking rather than
  deleting: it is the contract's own index into the suite, and it is in the one document that owns
  it.
