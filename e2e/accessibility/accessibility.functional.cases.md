# Accessibility — functional tests

- **Spec:** `e2e/accessibility/accessibility.functional.spec.ts`
- **Playwright project:** `web`
- **Tags:** `@accessibility`
- **Run:** `pnpm e2e:a11y` (or `pnpm e2e --project=web --grep @accessibility`)
- **Preconditions:** the seed is applied; Playwright starts 3100/3101.

This file checks what no other suite looks at: whether the rendered page is usable by someone who
is not reading it with their eyes and a mouse. The functional cases already assert that a control
has a **role and an accessible name** — a locator finds nothing otherwise — so that ground is
covered. What they cannot see is colour contrast, ARIA that is present but wrong, a landmark
structure that does not nest, a heading order that skips, or a form control whose label is visual
only.

The engine is `axe-core` through `@axe-core/playwright`, run against **WCAG 2.0 A/AA and 2.1 A/AA**
(`ADR-0025`). It is a scanner, not a verdict: it catches roughly a third of real barriers and says
nothing about whether a flow makes sense. A green run here is a floor, the same way the pre-commit
hook is.

**Every page reachable in the application is listed in `AUDITED_PAGES` in the spec.** That list is
the only thing connecting this suite to a growing application — the same shape, and the same
weakness, as `PROTECTED_ROUTES` and `PROTECTED_PAGES` under invariant 16: forget a line and the
check silently stops covering what is new.

## Summary

| ID        | Title                                                         | Priority | Tag   |
| --------- | ------------------------------------------------------------- | -------- | ----- |
| ACC-FN-01 | every public page passes WCAG 2.1 AA                          | P0       | `@p0` |
| ACC-FN-02 | the dashboard passes WCAG 2.1 AA for a signed-in user         | P0       | `@p0` |
| ACC-FN-03 | the login form in its error state passes WCAG 2.1 AA          | P1       | —     |
| ACC-FN-04 | every audited page has exactly one `h1` and a `main` landmark | P1       | —     |

## Cases

### ACC-FN-01 — every public page passes WCAG 2.1 AA

- **Priority:** P0
- **Steps:** for each entry of `AUDITED_PAGES` marked as not needing a session, open it and run
  `AxeBuilder` with the tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`.
- **Expected:** zero violations. The failure message names the rule, the impact and the offending
  markup, because "the page has an accessibility problem" is not actionable.
- **Note:** this case is what found `FX-039` — HeroUI's own default `--accent` put its own
  foreground on it at 3.58:1, against the 4.5:1 that 14px text needs.

### ACC-FN-02 — the dashboard passes WCAG 2.1 AA for a signed-in user

- **Priority:** P0
- **Steps:** sign in as `teacher` through `authedPage`, open `/`, run the same scan.
- **Expected:** zero violations. Separate from `ACC-FN-01` because the dashboard only exists behind
  a session, and its markup — the meeting list, the counter, the create form — is the larger half
  of the application's surface.

### ACC-FN-03 — the login form in its error state passes WCAG 2.1 AA

- **Priority:** P1
- **Steps:** open `/auth/login`, submit a wrong password, wait for the `role="alert"` container,
  then run the scan.
- **Expected:** zero violations. The error state is a **different DOM** from the one `ACC-FN-01`
  scans: a live region appears, and that is exactly the kind of markup a scanner is good at judging
  and a human reviewer forgets to look at.

### ACC-FN-04 — every audited page has exactly one `h1` and a `main` landmark

- **Priority:** P1
- **Steps:** for each entry of `AUDITED_PAGES`, open it and count `h1` headings and `main`
  landmarks.
- **Expected:** exactly one of each. `axe-core` does **not** fail a page for having zero or several
  `h1` elements, so this is asserted here rather than assumed to be covered — the gap is the reason
  the case exists.
