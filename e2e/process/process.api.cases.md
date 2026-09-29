# Planning process — template integrity checks

- **Spec:** `e2e/process/process.api.spec.ts`
- **Playwright project:** `api` (no browser, plain `node:fs`)
- **Tags:** `@process`
- **Run:** `pnpm e2e e2e/process` (part of `pnpm verify`)

Checks the link between **the plan templates and `scripts/check-orientation.mjs`**. There are two
templates, one per workflow: [`TEMPLATE.md`](../../docs/plans/TEMPLATE.md) for a feature (skill
`feature-pipeline`) and [`TEMPLATE-BUGFIX.md`](../../docs/plans/TEMPLATE-BUGFIX.md) for a defect
(skill `bugfix-pipeline`).

Why a machine check. Section 0 "Orientation" has the same shape in both templates, and
`check-orientation` parses it by five labels. That gives two ways to break the check silently, and
neither shows up in a diff or in review:

1. **rename a label in one template** — plans of that workflow stop being checked, because the
   checker finds no line and decides there is no question;
2. **add a third template and forget it in the `TEMPLATES` list** — that list supplies the "field
   left untouched" baseline, so an empty plan of such a template passes as filled.

The second failure was reproduced by control experiment when `TEMPLATE-BUGFIX.md` was added: before
the fix, a bugfix plan without a single answer was declared passed. The rule used to rest on
discipline; these cases hold it by mechanism.

What the cases do **not** check: the meaning of the answers in section 0. That is review's job.

## Summary

| ID        | Title                                                        | Priority |
| --------- | ------------------------------------------------------------ | -------- |
| PR-API-01 | every plan template shares one set of section 0 labels       | P0       |
| PR-API-02 | every plan template is registered in `check-orientation.mjs` | P0       |
| PR-API-03 | every change folder holds the three discovery stages         | P0       |
| PR-API-04 | no scaffolded stage file is left unfilled                    | P1       |
| PR-API-05 | the scaffolder creates the files the stage check requires    | P1       |
| PR-API-06 | every research file cites something or says what it missed   | P0       |
| PR-API-07 | the scenario index is regenerated, never hand-edited         | P1       |

## Cases

### PR-API-01 — every plan template shares one set of section 0 labels

- **Priority:** P0
- **Steps:** find every `docs/plans/TEMPLATE*.md`; in each, read the `## 0. Orientation` heading and
  the `- **<label>:**` lines up to the end of the section.
- **Expected:** at least two files; each has section 0; the label set in each matches the five
  `check-orientation` reads: "Duplicate", "Conflicts with shipped", "Conflicts with planned",
  "Architecture impact", "Open questions". A mismatch means plans of one workflow stopped being
  checked.

### PR-API-02 — every plan template is registered in check-orientation.mjs

- **Priority:** P0
- **Steps:** find every `docs/plans/TEMPLATE*.md`; read `scripts/check-orientation.mjs`.
- **Expected:** each template's path appears in the script's `TEMPLATES` list. A template missing
  from the list makes its own plans unverifiable: an empty section 0 passes because there is
  nothing to compare it to.

### PR-API-03 — every change folder holds the three discovery stages

- **Priority:** P0
- **Steps:** list the directories under `docs/plans/`; in each, look for `research/README.md`,
  `design.md` and a `<slug>.plan.md` named after the folder.
- **Expected:** all three exist in every change folder.
- **Why:** each stage is the next one's context (`ADR-0016`). A plan with no research is a stage
  somebody skipped without declaring it, and the design that should have sat between them was never
  written down — so nobody can tell what the plan rests on.

### PR-API-04 — no scaffolded stage file is left unfilled

- **Priority:** P1
- **Steps:** read every `.md` under each change folder, with fenced blocks and code spans removed,
  and look for the literal unfilled marker.
- **Expected:** none remain.
- **Why:** an untouched scaffold passes every check that only looks for presence — exactly how an
  empty section 0 used to pass `check-orientation`. The marker is what makes "not written yet"
  visible.
- **Note:** code spans are stripped first, so a document explaining the convention may quote the
  marker. Found the first time this case ran against a real change folder: the design document of
  `CH-017` describes the marker, and quoting a rule must not count as breaking it.

### PR-API-05 — the scaffolder creates the files the stage check requires

- **Priority:** P1
- **Steps:** parse the `SCAFFOLD` list out of `scripts/new-change.mjs`; compare it with the required
  stage files in the spec, in both directions.
- **Expected:** the two sets are identical.
- **Why:** the same drift `PR-API-02` guards for the template list. A required file the scaffolder
  does not create must be made by hand every time and will be forgotten; a file it creates that
  nothing requires can be deleted without anything noticing.

### PR-API-06 — every research file cites something or says what it missed

- **Priority:** P0
- **Steps:** for every `.md` under a change folder's `research/`, look for at least one citation — a
  quoted file path, a `FT-`/`CH-`/`FX-`/`BL-` ID, an `ADR-` ID or a case ID — or a `Not found` line
  in the marked syntax.
- **Expected:** every file has one.
- **Why:** research records what is in the project, never what somebody concluded from it. A file of
  pure prose is a conclusion wearing the clothes of a finding, and the two stages downstream will
  treat it as fact. The marker syntax deliberately mirrors the "not automated" marker in the suite
  meta-test: fixed, because free prose would let any paragraph switch the check off.
- **Known gap:** the machine checks only that **something** is cited, never that the citation
  supports the claim or that the sweep was honest. That is `research-reviewer`'s job — the same line
  between form and meaning the other meta-tests draw (`ADR-0010`).

### PR-API-07 — the scenario index is regenerated, never hand-edited

- **Priority:** P1
- **Steps:** run `node scripts/scenarios-index.mjs check`, which regenerates `e2e/scenarios-index.md`
  in memory from every `.cases.md` Summary table under `e2e/` and compares it with the file on disk.
- **Expected:** the two are identical.
- **Why:** the index exists so a designer can read every scenario across every level and module from
  one file (second tuning round, `TUNE-S3` 2026-09-29). A hand-maintained copy is exactly the defect
  `FX-031` is the ledger entry for — a list of case IDs that drifted from what actually exists. The
  fix for a stale index is always `pnpm scenarios:index`, never an edit to the file itself.
