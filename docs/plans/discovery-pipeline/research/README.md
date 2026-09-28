# Research: discovery-pipeline

> The index of the research stage for adding three stages — research, design, plan — in front of
> implementation, with their own agents and review gates.
>
> **One rule governs this whole folder: record only what is in the project, never what you concluded
> from it.** Every statement carries a citation. Anything uncitable is an open question or a
> `- **Not found:**` line.

## Requirement, as received

Add stages to the development flow. When requirements arrive, research the project from the
perspective of those requirements first — gather everything that already exists and bears on the
change, from the code, the architecture, the patterns, the stack, the data schemas and the API
contracts. No speculation and no conclusions: only what is actually in the project. A dedicated
agent runs this and may dispatch subagents, which may switch to cheaper or more expensive models,
and does nothing but research. The result lands in a folder belonging to that change. That folder is
the context for the design stage, run by its own agents; the design lands in the same folder and
becomes the context for the implementation plan, run by its own agents. Each of the three stages
gets its own reviewer. Then the existing flow continues.

## Questions asked of the project

| #   | Question                                                            | Area     | Answered in                | Outcome                                                         |
| --- | ------------------------------------------------------------------- | -------- | -------------------------- | --------------------------------------------------------------- |
| Q1  | Where does a change's paperwork live today?                         | code     | [code.md](code.md)         | one flat file per change, `docs/plans/<slug>.plan.md`           |
| Q2  | What creates it, and what validates it?                             | code     | [code.md](code.md)         | `scripts/new-plan.mjs`; `scripts/check-orientation.mjs`         |
| Q3  | Which roles exist and what may each touch?                          | code     | [code.md](code.md)         | eleven, in `.claude/agents/`; limits are the tool lists         |
| Q4  | Can a subagent dispatch subagents on this machine?                  | code     | [code.md](code.md)         | yes — verified by probe                                         |
| Q5  | What string contracts would new stages have to respect?             | contract | [contract.md](contract.md) | five section-0 labels, template list, `TEMPLATE*` glob          |
| Q6  | Is there an existing "evidence" or "not found" convention to reuse? | contract | [contract.md](contract.md) | yes — `- **Not automated:**` in the suite meta-test             |
| Q7  | Which meta-tests would a folder-per-change disturb?                 | tests    | [tests.md](tests.md)       | `PR-API-01`/`02`, `AR-API-07`/`08`, suite rules 1–3             |
| Q8  | Has a research or design stage been proposed or rejected before?    | history  | [history.md](history.md)   | **no matches** in the ledger, the backlog or the Rejected table |
| Q9  | What does the record say about oversized up-front documents?        | history  | [history.md](history.md)   | `CH-004`, `FX-013`, `FX-027` — the failure mode is real         |
| Q10 | Is there a prior decision about who may write which files?          | history  | [history.md](history.md)   | `ADR-0014`                                                      |

## Sweeps

| Subagent | Model  | Scope                                                            | File                       | Converged after |
| -------- | ------ | ---------------------------------------------------------------- | -------------------------- | --------------- |
| code     | `opus` | `scripts/`, `.claude/agents/`, `.claude/skills/`, `package.json` | [code.md](code.md)         | 9 files         |
| contract | `opus` | `check-orientation.mjs`, `process.api.spec.ts`, the corpus       | [contract.md](contract.md) | 6 files         |
| tests    | `opus` | `e2e/process/`, `e2e/architecture/`, `e2e/suite-integrity...`    | [tests.md](tests.md)       | 5 files         |
| history  | `opus` | `CHANGELOG.md`, `BACKLOG.md`, `docs/adr/`, `git log`             | [history.md](history.md)   | 3 files + git   |

**Deviation, stated rather than hidden:** the sweeps were run by the session that also wrote the
design and the plan, not by the `researcher` subagents this change introduces — the agents did not
exist yet. That is the one thing the separation is meant to prevent, so it is recorded here, and the
next change is the first real exercise of the flow.

## Contradictions found

- `scripts/new-plan.mjs` creates `docs/plans/<slug>.plan.md` while `docs/plans/README.md` describes
  `docs/plans/` as holding templates and archives; neither document says where a change's working
  material belongs, because until now there was none. Named, not resolved.
- `e2e/process/process.api.cases.md` says section 0 is "parsed by five labels" and
  `docs/plans/TEMPLATE.md` says "Five answers" — these agree; no contradiction, recorded because Q5
  asked.

## Still unknown

- Whether nested dispatch is limited in depth beyond one level. The probe proved depth 2
  (`researcher` → `researcher-history`); depth 3 was not tested and nothing in the flow needs it.
- How much wall-clock the three added stages cost for a real feature. No measurement exists — the
  only figures in the repository are for runs, in `e2e/README.md` "Run economics". Left open rather
  than estimated.
