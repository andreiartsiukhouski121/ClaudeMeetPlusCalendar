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
