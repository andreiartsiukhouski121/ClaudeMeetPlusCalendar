# Plan: work-flows

Two named workflows instead of one: **feature** (exists, but its phases are unnamed) and **bugfix**
(does not exist at all). A process task — it touches no product code.

## 0. Orientation: what the project already has

- **Duplicate:** partly. The feature flow is closed by `CH-004` (the `feature-pipeline` skill and
  the plan template) and refined by `CH-012`; it needs finishing rather than inventing — naming the
  phases and adding an explicit requirements-and-architecture step. The bugfix flow has no ledger
  entry at all: the closest are `FX-014` (three mutually exclusive prescriptions about runs) and
  `regression-verify` §5 "found a problem — file a separate task", but that is a rule inside
  acceptance, not a workflow. Nothing closes the task in full.
- **Conflicts with shipped:** touches `scripts/new-plan.mjs` and `scripts/check-orientation.mjs`.
  The second one critically: it takes the "field left untouched" baseline **only** from
  `docs/plans/TEMPLATE.md`, so the second template must join that list or an untouched bugfix plan
  passes — that is, `CH-007` stops working precisely for new plans. No invariant changes. Cases are
  untouched apart from `LG-API-*`, which sees a new entry.
- **Conflicts with planned:** no matches. `BL-013` (worktree tooling) and `BL-014`
  (`.claude/agents/*.md`) are adjacent but independent: both concern executors rather than phases.
  `BL-001` (rate limiting) will be the first candidate to travel the new bugfix flow, but this task
  does not close it.
- **Architecture impact:** confirms `ADR-0011` (a ledger plus an orientation gate) and `ADR-0010` — the bugfix flow reuses the same section 0 form so one checker covers both templates, and the template list in `check-orientation.mjs` became a checked fact rather than a promise. Recorded retrospectively in `CH-015`.
- **Open questions:** "bug" and "defect" are used as synonyms here, and the `FX-` column records
  both what was found before release (a process defect such as the vacuous meta-test) and what
  broke at runtime. The flow must handle both, so no distinction is introduced; instead there is a
  threshold beyond which a bug needs a written plan, and below which a red test and an `FX-` entry
  suffice.

The Rejected section of the backlog contains neither flow.

## 1. Spike: how the risky assumptions were proven

| Assumption                                               | How it was proven                   | Fact                                                          |
| -------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------- |
| `check-orientation` compares brush-offs to one template  | reading `templateAnswers`           | Yes, a single `TEMPLATE` constant → the second must be added  |
| The checker finds plans by suffix, not by content        | reading `activePlans`               | `*.plan.md`; `TEMPLATE*.md` files do not match — no conflict  |
| A section 0 answer may span several lines                | reading `answerFor` + `ci-pipeline` | Yes, a paragraph up to a blank line or the next `- **`        |
| `plan:new` supports only one template                    | reading `new-plan.mjs`              | A single `copyFileSync` of one `TEMPLATE`; a choice is needed |
| An untouched bugfix plan really would pass without a fix | control experiment (see §6)         | Verified before and after: before it passes, after it fails   |

## 2. Contract

Not applicable: no HTTP endpoints are added.

## 3. Data

Not applicable.

## 4. Tasks

| ID  | What to do                                                                                     | Files                                                               | Done when                                                            | Depends on |
| --- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------- |
| W1  | A bugfix plan template: reproduction, cause, impact, "why it was not caught", fix plan, checks | `docs/plans/TEMPLATE-BUGFIX.md`                                     | Section 0 matches `TEMPLATE.md` in form                              | —          |
| W2  | `pnpm plan:new <slug> --bug` picks the bugfix template                                         | `scripts/new-plan.mjs`                                              | Both commands create `<slug>.plan.md` from their own template        | W1         |
| W3  | `check-orientation` compares brush-offs against **every** template                             | `scripts/check-orientation.mjs`                                     | The control experiment in §6 fails an untouched bugfix plan          | W1         |
| W4  | The `bugfix-pipeline` skill: seven steps, the "is a plan needed" threshold, red test first     | `.claude/skills/bugfix-pipeline/SKILL.md`                           | Steps named with an input and an output; triggers do not overlap     | W1         |
| W5  | An explicit phase table in `feature-pipeline` plus the requirements step                       | `.claude/skills/feature-pipeline/SKILL.md`                          | The phases read off the first screen; no new duplication             | —          |
| W6  | The "feature or bug" fork in the project rules                                                 | `CLAUDE.md`, `README.md`, `docs/plans/README.md`                    | One short section with references, no restating of the skills        | W4, W5     |
| W9  | Machine protection of the templates ↔ checker link: cases `PR-API-01`/`PR-API-02`              | `e2e/process/*`, `e2e/suite-integrity.api.spec.ts`, `e2e/README.md` | Both cases fail if a label is renamed or a template is left unlisted | W3         |
| W7  | The `CH-013` ledger entry                                                                      | `docs/CHANGELOG.md`                                                 | `pnpm e2e e2e/ledger` green                                          | W1–W6      |
| W8  | Acceptance: the W3 control experiment, `pnpm format`, one `pnpm verify`                        | —                                                                   | `pnpm verify` green end to end                                       | W7         |

Parallelism is unnecessary: W2 and W3 edit neighbouring scripts but both depend on the template
shape from W1, and W6 ties the result together.

## 5. Risks

- **A second template is a second source of drift.** Section 0 must stay identical in form: the
  checker parses it by the `- **Duplicate:**` label and three others. Editing the form in one
  template without the other breaks the check silently. Mitigation: W3 makes the template list
  shared, and the W9 cases verify exactly that.
- **One more mandatory document per bug is the straight road back** to what `CH-004` moved away
  from (100 minutes of planning against 85 of code). Mitigation: the threshold in §4 of the skill —
  a plan is needed only for a non-obvious cause, a touched contract or invariant, security, or more
  than one module. Otherwise the flow is a red test, a fix and an `FX-` entry.

## 6. Assumptions and deliberate omissions

- **The control experiment is mandatory and part of acceptance:** create a bugfix plan with the
  command, fill nothing, confirm `pnpm check:orientation` **fails**, delete it. Without that, W3 is
  an unverified claim — and a vacuously passing check has happened here before (`FX-001`).
- **W9 was added along the way and was not in the original list.** The §5 risk ("editing the form
  in one template without the other breaks the check silently") was originally covered by prose and
  discipline alone. Since this repository already has a class of defects called "the check silently
  stopped checking", the risk is now closed by mechanism: cases `PR-API-01`/`PR-API-02`, both
  verified by control experiment.
- **No separate ledger entry type for bugs:** `FX-` already means defect, and the "Found by" column
  already answers which check fired. No second "why it was not caught earlier" column is added —
  that answer lives in the bugfix plan and in a new `BL-` item when the check itself needs fixing.
- **Triage and bug prioritization are not automated.** Urgency is the "Impact" section of the plan
  plus the backlog's `P1`/`P2`/`P3`; no separate severity scale is introduced.
