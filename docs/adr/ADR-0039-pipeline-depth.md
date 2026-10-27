# ADR-0039 — Pipeline depth

- **Status:** accepted
- **Date:** 2026-10-27
- **Supersedes:** — (in part: `ADR-0016`; see Consequences)
- **Superseded by:** —

## Context

- `FACT-3822` `ADR-0016` rejected folding research into the `planner` and one reviewer for all three
  discovery artifacts, and fixed the same discovery half for every
  `FEAT` change above the defect threshold. — `docs/adr/ADR-0016-discovery-stages.md`
- `FACT-3823` Two profiling records, `2026-10-16-meetings-clean-architecture` and
  `2026-10-16-delete-meetings-and-files`, ran a trimmed path on the owner's choice, with no criteria
  recorded; the inventory named no such path. — `docs/profiling/reviews/2026-10-27-review.md`,
  section 7
- `FACT-3824` Six places worded when to go light differently: `lead.md`, `team-roles`, `CLAUDE.md`,
  `requesting-code-review`, `docs/process.md` and `feature-pipeline`. — `docs/profiling/reviews/2026-10-27-review.md`,
  section 6
- `FACT-3825` All 15 `shape` blockers on record fell in records that carry a new ADR. —
  `docs/profiling/reviews/2026-10-27-review.md`, sections 1 and 3

## Decision

- `FACT-3826` A change runs at one of three depths, small, medium or large, chosen before the first
  dispatch by the `change-router` skill from criteria answered with a citation each; the mapping of
  a depth to stage IDs lives in `docs/process.md`, section "Depth", and nowhere else. —
  `.claude/skills/change-router/SKILL.md`, `docs/process.md`
- `FACT-3827` In the medium tier the `planner` writes research, design and plan as three thin files,
  with no research sweeps and no `designer` unless a new ADR is needed; for that tier this
  replaces `ADR-0016`'s rejection of folding research into the `planner`. — `docs/process.md`, `.claude/skills/change-router/SKILL.md`
- `FACT-3828` In the medium tier `plan-reviewer` is the one gate before code (`FEAT-G3`), and it also
  opens every citation in the thin research file and confirms the tier line; for that tier this
  replaces `ADR-0016`'s rejection of one reviewer for all three artifacts. — `.claude/agents/plan-reviewer.md`, `docs/process.md`
- `FACT-3829` `FACT-3306`…`FACT-3309` and `FACT-3317` describe the large tier. —
  `docs/adr/ADR-0016-discovery-stages.md`
- `FACT-3830` `bugfix-pipeline` §4 keeps the criterion that the cause was not found in about fifteen
  minutes and the strictness and path-marker rules; the other three criteria of the defect threshold
  (a contract, an invariant or another feature's cases; security; more than one module or both
  applications) are `C1`, `C3` and `C4` of `change-router`, and which defects take which path does
  not change. This replaces `ADR-0016`'s statement that §4 keeps its threshold. — `.claude/skills/bugfix-pipeline/SKILL.md`,
  `.claude/skills/change-router/SKILL.md`

Rejected:

- `FACT-3831` One combined file for the medium tier, scaffolded by `pnpm change:new <slug> --medium`
  — it changes `PR-API-03`…`PR-API-06` and the scaffolder, and the records show no saving over
  three thin files. — this record, `docs/profiling/plans/2026-10-27-tuning-6.plan.md`, item 5
- `FACT-3832` Superseding `ADR-0016` as a whole — every other fact it states still holds for the
  large tier. — this record, `ADR-0022`

## Consequences

- `ADR-0016` stays accepted. The three facts above that it no longer holds are retired into a
  `## Retired facts` register in that record, which names `FACT-3827`, `FACT-3828` and `FACT-3830`
  as their successors (`ADR-0022`; `ADR-0038` is the precedent for a partial supersession).
- The medium tier drops the research and design reviews. Its effect is projected from two records
  and one confounded pair, and the next profiling records are what confirm or falsify it.

> **Rationale — not a fact.** `FACT-3825` is the reason the tier criteria keep every change that
> needs a new ADR on the large path: the shape yield of the dropped gates was concentrated there. The
> medium tier is a bet that the remaining gates are enough elsewhere, and the Size block of each
> profiling record is what tests it.
