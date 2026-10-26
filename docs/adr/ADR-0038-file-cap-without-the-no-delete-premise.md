# ADR-0038 — The ten-file cap stands on its own, not on a missing delete

- **Status:** accepted
- **Date:** 2026-10-21
- **Supersedes:** —
- **Superseded by:** —

## Context

- `FACT-3793` `ADR-0029` states the ten-file cap with the reason that "a feature with no delete
  cannot grow the database without bound", and `docs/security.md` repeats that reason without a
  key. — `docs/adr/ADR-0029-file-bytes-in-the-database.md`, `docs/security.md`, `BL-068`
- `FACT-3794` A file can be deleted since `FT-010`, and deleting one frees exactly one slot. —
  `FACT-2129`, `FACT-2132`, `MF-API-24`

## Decision

- `FACT-3795` An upload is refused when the meeting already holds ten files; the check is a count
  before the insert rather than a transaction, so the rule is stated as a refusal rather than as an
  exact ceiling. — this record, `FACT-3629`, `MF-API-15`
- `FACT-3796` The cap bounds what one meeting holds at any moment. Deleting a file frees a slot,
  and nothing requires an owner to delete. — this record, `FACT-2132`

Rejected:

- `FACT-3797` Dropping the cap because delete exists — nothing obliges an owner to delete, so the
  bound on a meeting would go with it. — this record
- `FACT-3798` Superseding `ADR-0029` as a whole — every other fact it states still holds; only the
  cap's premise changed. — this record, `ADR-0022`

## Consequences

- `ADR-0029`'s cap fact is retired into a `## Retired facts` register in that record, with
  `FACT-3795` as its successor; `ADR-0029` stays accepted.
- The source of `FACT-2096` in `docs/api-contract.md` is re-pointed to the successor, which this
  record cites rather than restates; the living files that cite the cap fact name the successor, `docs/security.md` drops the premise, and `BL-068` closes.

> **Rationale — not a fact.** The cap was always doing two jobs, bounding storage and bounding one
> meeting. Delete removed the first premise, not the second job.
