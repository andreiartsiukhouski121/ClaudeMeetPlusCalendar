# ADR-0019 — The route listing lives in the API contract alone; other documents link

- **Status:** accepted
- **Date:** 2026-09-28
- **Supersedes:** — (extends `ADR-0015`; contradicts nothing in it)
- **Superseded by:** —

## Context

There were two lists of this API's endpoints, and only one of them was checked.

- `FACT-3400` `docs/api-contract.md` holds the Routes table; `AR-API-05` diffs it against the Nest
  controllers in both directions, and `AR-API-06` matches its guarded rows against
  `PROTECTED_ROUTES`. — `e2e/architecture/architecture.api.spec.ts:615-627`
- `FACT-3401` `apps/api/README.md:12-20` held a second Endpoints table that nothing read:
  `grep -rn "api/README" e2e/` returned nothing, and the architecture spec's file constants do not
  name it. — `e2e/architecture/architecture.api.spec.ts:23-28`
- `FACT-3402` It had already drifted: neither meetings row in `apps/api/README.md` mentioned `401`,
  which `docs/api-contract.md` lists for both, while the same file's own `/auth/*` rows did. —
  `docs/plans/meetings-detail-participants/research/README.md`, contradiction C3
- `FACT-3403` The backlog already expected the copy to need hand-editing again: `BL-007` says
  "`PROTECTED_ROUTES` and the endpoint list in `apps/api/README.md` will need extending". —
  `docs/BACKLOG.md:43`
- `FACT-3404` In `FX-027` the run-measurement paragraph existed in four copies with three different
  number sets, and all four were wrong. — `docs/CHANGELOG.md`, `FX-027`
- `FACT-3405` `ADR-0015` rule 1 states the principle for the corpus, its Context names
  `apps/api/README.md` among the places facts were scattered, but its decision scope is the four
  corpus documents and it never says what a package README may hold. — `ADR-0015`, Decision

> **Rationale — not a fact.** This record extends the same rule outward to a document outside the
> corpus. It supersedes nothing and contradicts nothing; it would be perverse for a record about
> single sources to restate a rule instead of citing the record that owns it. Adding
> `GET /meetings/:id` forced the question then rather than later.

## Decision

- `FACT-3406` The enumerable facts of the HTTP contract — the routes, their guard, their status codes
  and their error bodies — are written in `docs/api-contract.md` and nowhere else; any other document
  that wants to show them links to it. — `docs/api-contract.md`, `AR-API-05`
- `FACT-3407` The Endpoints table at `apps/api/README.md:12-20` and the error-shapes paragraph below
  it are removed and replaced by a link. — `apps/api/README.md`
- `FACT-3408` The README keeps what is genuinely local to the package: what it is, how to run it,
  where its tests live. — `apps/api/README.md`
- `FACT-3409` The boundary is enumeration versus explanation: a table or list of routes, statuses or
  error bodies is an enumeration and has one home; prose that explains a decision and names a fact in
  passing while linking to its owner is not a copy. — this record
- `FACT-3410` An explanation that only restates an invariant follows the enumeration it is attached
  to: the paragraph removed at `apps/api/README.md:31-34` was both the 400-array/401-string
  enumeration and the `APP_PIPE`-not-`useGlobalPipes` rationale, which is a verbatim restatement of
  invariant 3. — `apps/api/README.md`, `FACT-0029`
- `FACT-3411` Explanations that stand on their own stay, and the residual duplication is recorded
  rather than silently tolerated. — `docs/plans/meetings-detail-participants/design.md` §8

Rejected:

- `FACT-3412` Patch the missing `401`s into `apps/api/README.md` and leave the table — it fixes this
  divergence and guarantees the next one. — this record
- `FACT-3413` Make the second table machine-checked too — two checked copies are still two copies,
  and the check would have to normalize two deliberately different wordings to compare them. —
  this record
- `FACT-3414` Delete `apps/api/README.md` entirely — the package-local run commands and the storage
  note have no other home. — this record
- `FACT-3415` Move the Routes table into the README and link from the contract instead — the
  meta-tests, `ADR-0015` and every existing citation point at `docs/api-contract.md`. — this record

> **Rationale — not a fact.** The table drifted precisely because nothing makes it move, and a
> correct unchecked copy is the state it was already in before `FT-002` shipped a second route. A
> parser written to preserve a duplicate no one needs is not worth having, and a missing README is a
> worse first stop for a newcomer than a short one.

## Consequences

- `FACT-3416` `BL-007`'s "Conflicts with" cell is partly void: editing and deleting a meeting needs a
  `PROTECTED_ROUTES` line and a Routes-table row, but no longer an edit to `apps/api/README.md`. —
  `docs/BACKLOG.md`
- `FACT-3417` A reader of `apps/api/README.md` needs one hop to see the endpoints. —
  `apps/api/README.md`
- `FACT-3418` Nothing mechanically prevents a third copy appearing in a future README; this record is
  the rule a reviewer cites. — this record
- `FACT-3419` The Cases column of the Routes table is the contract's own index into the suite, in the
  one document that owns it. — `FACT-2004`, `AR-API-09`

> **Rationale — not a fact.** The one hop buys the guarantee that what the reader sees is the version
> `pnpm verify` checks. Making "no route table outside the contract" machine-checkable is not
> attempted, because a grep for markdown tables that look like routes has no honest false-positive
> rate.
