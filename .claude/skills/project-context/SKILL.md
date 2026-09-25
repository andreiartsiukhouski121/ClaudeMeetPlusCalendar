---
name: project-context
description: The architecture corpus of this repository — which document owns which facts, which role reads which, how to record an architecture decision as an ADR, and what must be updated when behaviour changes. Use before planning or implementing anything, when asked "how does this project work", "where is X documented", "do we have an ADR for this", or when a change touches the contract, the data or the architecture.
---

Four documents hold the facts this project runs on. They are **read, not rebuilt**: re-deriving
architecture from code gives you the current behaviour, never the decision — it cannot tell you that
CORS is off on purpose, or that the third session check is not redundant (`ADR-0015`).

## Who owns what

| Document               | Owns                                                                  | Never holds                      |
| ---------------------- | --------------------------------------------------------------------- | -------------------------------- |
| `docs/architecture.md` | the shape of the system, layer rules, patterns used, patterns refused | why a choice was made; endpoints |
| `docs/adr/`            | one immutable file per decision: context, decision, consequences      | current state; how-to            |
| `docs/data-model.md`   | entities, field formats, lifetimes, seed, the flows between layers    | endpoint signatures              |
| `docs/api-contract.md` | every endpoint: request, response, error bodies, internal logic       | data formats in detail           |
| `CLAUDE.md`            | the nineteen invariants and the process rules                         | architecture rationale           |
| `docs/security.md`     | the threat model and the deliberate gaps                              | —                                |
| `e2e/README.md`        | the suite convention and run economics                                | —                                |

**Disjoint on purpose.** A fact lives in exactly one place and the others link to it. Two copies of a
rule drift silently — this repository earned `FX-023` (an address formula in four files) and `FX-027`
(a measurement paragraph in four files) that way. If you are about to write a sentence that already
exists elsewhere, link instead.

## What each role reads

| Role                | Opens first                                                                    |
| ------------------- | ------------------------------------------------------------------------------ |
| `planner`           | all four, plus `CHANGELOG.md` and `BACKLOG.md` for orientation                 |
| `implementer-api`   | `api-contract.md`, `data-model.md`, `architecture.md` (layers), invariants 1–8 |
| `implementer-web`   | `data-model.md` (flows), `architecture.md` (BFF), invariants 9–15, 19          |
| `plan-reviewer`     | all four — its third question is conformance to them                           |
| `code-reviewer`     | all four, plus the plan section that was implemented                           |
| `tester-api`        | `api-contract.md`, `data-model.md`, `e2e/README.md`                            |
| `tester-functional` | `data-model.md` (flows), `e2e/README.md`, `playwright-verify`                  |
| `tester-security`   | `security.md`, `architecture.md`, `ADR-0002`/`0003`/`0004`/`0009`              |

## Recording a decision

A choice that constrains later work gets an ADR **before** the code:

```bash
pnpm adr:new <slug>      # takes the next free number, fills the template
```

Rules that matter more than the format:

- **An accepted ADR is never edited in substance.** A changed decision is a **new** ADR whose
  `Supersedes` names the old one; the old one's status becomes `superseded` with a link back.
  Rewriting it destroys the only reason the file exists.
- Statuses: `proposed`, `accepted`, `superseded`, `rejected`. A `rejected` ADR is kept — that is what
  stops the idea coming back every other week.
- An ADR written after the code is a justification, not a decision.
- The four sections are mandatory and machine-checked (`AR-API-01`…`AR-API-04`). What the reasoning
  is _worth_ is review's job — no meta-test judges that.

What does **not** become an ADR: how a function is written, a naming preference, anything a code
comment settles.

## What a behaviour change must update

| You changed                     | Also update                                                 | Or this fails             |
| ------------------------------- | ----------------------------------------------------------- | ------------------------- |
| A route (added/renamed/removed) | the Routes table in `api-contract.md`                       | `AR-API-05`               |
| A guard on a route              | `PROTECTED_ROUTES` in `e2e/security/security.api.spec.ts`   | `AR-API-06`, `SEC-API-01` |
| A protected page                | `PROTECTED_PAGES` in `security.functional.spec.ts`          | invariant 16              |
| An entity or a response shape   | `data-model.md`, the mapper, the cases asserting by key set | `HD-API-01`, `AL-API-11`  |
| Seed values                     | `e2e/fixtures/seed.ts`                                      | `SM-API-02`/`03`          |
| A UI label                      | the functional locators that address it by name             | the functional suite      |
| An architectural choice         | a new ADR, and the tables in `architecture.md`              | plan review               |

## The gate that makes this real

Section 0 of every plan answers **Architecture impact** by citing ADR IDs or saying "no matches".
`pnpm check:orientation` runs in `.husky/pre-commit` and in `pnpm verify` and fails the commit on a
brush-off. The routes and the ADR log are checked by `e2e/architecture/architecture.api.spec.ts` on
every run.

The prose — layers, patterns, refusals — is **not** machine-checkable and is held only by review. The
corpus does not pretend otherwise: a check that pretends to be smarter than it is does more harm than
no check at all.
