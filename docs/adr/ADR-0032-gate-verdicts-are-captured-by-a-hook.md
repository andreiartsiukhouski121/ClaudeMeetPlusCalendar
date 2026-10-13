# ADR-0032 — Gate verdicts are captured by a hook, not written by the reviewers

- **Status:** accepted
- **Date:** 2026-10-13
- **Supersedes:** —
- **Superseded by:** —

## Context

- `FACT-3678` No file in the repository holds a gate verdict: the fifth tuning round's review found
  none, one verdict lost with an interrupted session cost 153,750 tokens to re-run, and the third
  record's verdicts never arrived. — `docs/profiling/reviews/2026-10-12-review.md` §4, §10;
  `docs/profiling/plans/2026-10-12-tuning-5.plan.md`, item 11, Q3
- `FACT-3679` The four gate reviewers hold `Read`, `Grep` and `Glob` only, so they cannot save
  anything, and `ADR-0014` makes that tool list the boundary. — `.claude/agents/plan-reviewer.md`,
  `docs/adr/ADR-0014-agent-roles.md`
- `FACT-3680` At `TUNE-G1` on 2026-10-13 the owner approved persisting every gate verdict and asked
  to analyse the stored verdicts from time to time for frequent errors. — `docs/profiling/plans/2026-10-12-tuning-5.plan.md`,
  "Owner's decision"

> **Rationale — not a fact.** Every file-based fix hands `Write` to a read-only role or to `lead`.
> A hook runs outside the agent, so the capture needs no tool the agent lacks.

## Decision

- `FACT-3681` Each gate reviewer opens its final report with a fixed verdict block (change slug,
  gate, pass, verdict, findings labelled `shape`/`correction` with a category from a fixed list);
  the format and the list have one home. — `.claude/skills/team-roles/SKILL.md`, "The verdict block"
- `FACT-3682` A `SubagentStop` hook runs `scripts/save-verdict.mjs`, which saves the reviewer's whole
  final message to `docs/profiling/verdicts/`, marks a missing or malformed block `UNPARSED` in the
  file name, and always exits 0. — `scripts/save-verdict.mjs`
- `FACT-3683` `pnpm verdicts:report` reads the files and prints verdicts per gate and findings by
  category; it writes nothing. — `scripts/verdicts-report.mjs`

Rejected: giving a reviewer `Write` (breaks `ADR-0014`); having `lead` write the verdict (`lead` has
no `Write`, and it would retell a verdict it must relay unedited); reading transcripts (`FACT-3446`).

## Consequences

- The hook is registered in `.claude/settings.json`, outside the repository's checked files. A clone
  without it saves nothing and loses no review; the cost is a gap in the evidence.
- The directory is excluded from Prettier, like `probes.md`, because a reformatted record is a
  paraphrase. Files are append-only and never hand-edited.
- Nothing checks that the model writes the block faithfully; `UNPARSED` files are listed by the
  report so a drift in the format is visible.
- The category list is the part most likely to change; it is revised in `team-roles` from the
  report's output.
