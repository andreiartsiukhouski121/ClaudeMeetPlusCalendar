# ADR-0015 — The architecture corpus is the mandatory planning context

- **Status:** accepted
- **Date:** 2026-09-25
- **Supersedes:** —
- **Superseded by:** —

## Context

Architecture, data shapes and the API contract were spread across `CLAUDE.md`, two package
`CLAUDE.md` files, `apps/api/README.md`, `e2e/README.md` and two archived plans — about 250k tokens of
documentation. Every planning pass re-derived the same facts by reading code, and the pipeline audit
measured the result: agents reading half the corpus accounted for roughly 29% of an iteration's spend,
and four of the five most expensive review findings were facts that were written down somewhere
nobody looked.

Re-deriving is also unreliable. A fact read out of code is the current behaviour, not the decision —
it cannot tell you that CORS is off **on purpose**, or that the third session check is not redundant.

## Decision

Four documents, disjoint by subject, are the context every role starts from:

| Document               | Owns                                                                |
| ---------------------- | ------------------------------------------------------------------- |
| `docs/architecture.md` | the shape of the system, layers, patterns used and patterns refused |
| `docs/adr/`            | why each of those choices was made, one immutable file per decision |
| `docs/data-model.md`   | entities, field formats, lifetimes, and the flows between layers    |
| `docs/api-contract.md` | every endpoint: request, response, errors, and the logic behind it  |

Three rules make it stay useful:

1. **Disjoint, never duplicated.** A fact lives in exactly one of them; the others link. Two copies
   of a rule drift silently — that is `FX-023` and `FX-027`.
2. **Read, not rebuilt.** Roles are told which documents to open, and are not expected to reconstruct
   the same facts from code each time.
3. **Kept honest by a gate.** Section 0 of every plan gains a fifth question — **Architecture
   impact** — which must cite ADR IDs or say "no matches"; `pnpm check:orientation` fails the commit
   otherwise. `AR-API-05` compares the routes in `api-contract.md` against the Nest controllers in
   both directions, and `AR-API-06` compares the guarded ones against `PROTECTED_ROUTES`.

Rejected: a generated API reference (Swagger/OpenAPI from decorators would describe shapes but not
logic or reasons, and would be a second source of truth beside the suite); one large architecture
document (the four subjects change at different rates and have different readers); leaving the facts
where they were and pointing at them (measured cost above).

## Consequences

- A change that adds or renames a route now fails `pnpm verify` until `api-contract.md` is updated.
  That is intended friction at the exact place where documentation usually rots.
- An architectural decision writes its ADR **before** its code, and the plan cites the ID. An ADR
  written after the fact is a justification, not a decision.
- Prose that cannot be machine-checked — layers, patterns, refusals — is held only by review. The
  corpus does not pretend otherwise.
