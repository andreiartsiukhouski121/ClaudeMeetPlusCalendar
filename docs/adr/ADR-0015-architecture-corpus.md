# ADR-0015 — The architecture corpus is the mandatory planning context

- **Status:** accepted
- **Date:** 2026-09-25
- **Supersedes:** —
- **Superseded by:** —

## Context

- `FACT-3280` Architecture, data shapes and the API contract were spread across `CLAUDE.md`, two
  package `CLAUDE.md` files, `apps/api/README.md`, `e2e/README.md` and two archived plans — about
  250k tokens of documentation. — `docs/pipeline-audit.md`
- `FACT-3281` Agents reading half the corpus accounted for roughly 29% of an iteration's spend. —
  `docs/pipeline-audit.md`
- `FACT-3282` Four of the five most expensive review findings were facts already written down
  somewhere nobody looked. — `docs/pipeline-audit.md`
- `FACT-3283` A fact read out of code is the current behaviour, not the decision: it cannot tell you
  that CORS is off on purpose, or that the third session check is not redundant. — `ADR-0005`,
  `ADR-0004`

## Decision

Four documents, disjoint by subject, are the context every role starts from.

**Source:** `CLAUDE.md`, "Architecture: the corpus every task starts from".

| Key         | Document               | Owns                                                                |
| ----------- | ---------------------- | ------------------------------------------------------------------- |
| `FACT-3284` | `docs/architecture.md` | the shape of the system, layers, patterns used and patterns refused |
| `FACT-3285` | `docs/adr/`            | why each of those choices was made, one immutable file per decision |
| `FACT-3286` | `docs/data-model.md`   | entities, field formats, lifetimes, and the flows between layers    |
| `FACT-3287` | `docs/api-contract.md` | every endpoint: request, response, errors, and the logic behind it  |

Three rules make it stay useful:

- `FACT-3288` Disjoint, never duplicated: a fact lives in exactly one of them and the others link. —
  `FX-023`, `FX-027`, `ADR-0019`, `FACT-0007`
- `FACT-3289` Read, not rebuilt: roles are told which documents to open and are not expected to
  reconstruct the same facts from code each time. — `.claude/skills/project-context/SKILL.md`
- `FACT-3290` Section 0 of every plan carries an **Architecture impact** question which must cite ADR
  IDs or say "no matches", and `pnpm check:orientation` fails the commit otherwise. —
  `scripts/check-orientation.mjs`, `docs/plans/TEMPLATE.md`
- `FACT-3291` `AR-API-05` compares the routes in `api-contract.md` against the Nest controllers in
  both directions, and `AR-API-06` compares the guarded ones against `PROTECTED_ROUTES`. —
  `e2e/architecture/architecture.api.spec.ts`

Rejected:

- `FACT-3292` A generated API reference — Swagger/OpenAPI from decorators would describe shapes but
  not logic or reasons, and would be a second source of truth beside the suite. — this record,
  `ADR-0008`
- `FACT-3293` One large architecture document — the four subjects change at different rates and have
  different readers. — this record
- `FACT-3294` Leaving the facts where they were and pointing at them — the measured cost above. —
  this record

## Consequences

- `FACT-3295` A change that adds or renames a route fails `pnpm verify` until `api-contract.md` is
  updated. — `AR-API-05`
- `FACT-3296` An architectural decision writes its ADR before its code, and the plan cites the ID. —
  `docs/adr/README.md`, "Rules"
- `FACT-3297` Prose that cannot be machine-checked is held only by review. — `ADR-0010`,
  `FACT-3190`, `ADR-0021`

> **Rationale — not a fact.** The friction at `api-contract.md` is intended, and it sits at the exact
> place where documentation usually rots. An ADR written after the fact is a justification, not a
> decision.
