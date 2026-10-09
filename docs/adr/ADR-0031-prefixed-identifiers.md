# ADR-0031 — Every identifier carries its type prefix, including the ones issued at runtime

- **Status:** accepted
- **Date:** 2026-10-09
- **Supersedes:** —
- **Superseded by:** —

## Context

- `FACT-3664` The data model's identifier rule required identifiers to be opaque strings with a
  type prefix (`usr-`, `mtg-`), never guessable by increment. — `docs/data-model.md`, its retired
  register
- `FACT-3665` `POST /meetings` and `POST /meetings/:id/files` issued a bare `randomUUID()`, and
  three facts — the `POST /meetings` logic, the file `id` row and `ADR-0027`'s identifier
  consequence — documented exactly that, so the corpus contradicted itself and the database held
  two id shapes. — `BL-024`, `apps/api/src/meetings/meetings.service.ts`,
  `apps/api/src/meeting-files/meeting-files.service.ts`
- `FACT-3666` Every seeded id is a readable prefixed literal (`usr-teacher`, `mtg-teacher-3`,
  `fil-teacher-3-1`), and the cases cite them by literal through `e2e/fixtures/seed.ts`. —
  `apps/api/src/**/*.seed.ts`, `e2e/fixtures/seed.ts`
- `FACT-3667` No runtime path creates a user: the only `POST` handlers are `/auth/login`,
  `/meetings` and `/meetings/:id/files`. — `apps/api/src/**/*.controller.ts`
- `FACT-3668` `GET /meetings/:id` validates no id shape, so an id of either shape already in a
  database is still served. — `FACT-2062`

## Decision

- `FACT-3669` Every identifier is `<prefix><body>`, the prefix naming the entity: `usr-`, `mtg-`,
  `fil-`. — this record
- `FACT-3670` The seed supplies readable literals as the body; a runtime create path issues the
  prefix followed by `randomUUID()` — `mtg-<uuid>` from `POST /meetings`, `fil-<uuid>` from an
  upload. Ids stay application-issued and the schema declares no `@default`. — this record,
  `FACT-3591`

Rejected:

- `FACT-3671` A bare UUID everywhere — every seed file, the fixture mirror and the cases that cite
  `mtg-teacher-3` by literal would be rewritten, and an id would stop saying what it identifies. —
  this record, `FACT-3666`
- `FACT-3672` A shorter random body (`nanoid` and the like) — a new runtime dependency for no
  requirement; `randomUUID()` is in `node:crypto` and already unguessable. — this record
- `FACT-3673` Rewriting bare-UUID rows already in a development database — the e2e database is
  reset on every run, `pnpm --filter @purpleschool/api db:reset` clears a development one, and such
  rows stay readable meanwhile. — this record, `FACT-3668`

> **Rationale — not a fact.** The prefix rule was the older and the more deliberate of the two
> statements; the bare UUID was what a create path happened to write. Settling on the prefix moves
> two lines of code and two cases, where the alternative moves every seed literal in the suite.

## Consequences

- `FACT-3674` `HD-API-21` asserts `mtg-` followed by a UUID for a created meeting, and `MF-API-01`
  `fil-` followed by a UUID for an uploaded file; both replace a bare-UUID assertion. —
  `e2e/regression/home-dashboard/`, `e2e/regression/meeting-files/`
- `FACT-3675` A seeded id and a runtime id now share a prefix, so telling them apart is by the body
  — a UUID or a readable name — which is what `HD-API-21` checks. — this record
- `FACT-3676` `HD-API-22`'s ordering by `id` is unaffected: ids that share a prefix compare by their
  bodies. — `e2e/regression/home-dashboard/home-dashboard.api.cases.md`
- `FACT-3677` Five facts that stated the bare UUID or the two-prefix rule are retired in their
  documents' registers, each naming its successor: `FACT-1080`, `FACT-1081` and `FACT-1082` in
  `docs/data-model.md`, `FACT-2123` in `docs/api-contract.md`, `FACT-3670` here. Closes `BL-024`
  and `BL-038`. — this record
