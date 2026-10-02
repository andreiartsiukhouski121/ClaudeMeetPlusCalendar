# ADR-0025 — Accessibility is checked by a scanner in the suite, not by reading a guideline

- **Status:** accepted
- **Date:** 2026-10-02
- **Supersedes:** —
- **Superseded by:** —

## Context

- `FACT-3530` Before this record the only accessibility assertions in the repository were that a
  control has a role and a non-empty accessible name — a property every `getByRole` locator needs
  anyway — plus `HD-FN-14`, which counts a list, two buttons and one `h1`. Colour contrast, wrong
  ARIA, landmark structure and heading order were checked by nothing. —
  `e2e/regression/home-dashboard/home-dashboard.functional.spec.ts`,
  `e2e/regression/auth-login/auth-login.functional.spec.ts`
- `FACT-3531` The `ui-ux-pro-max` set ranks accessibility as its priority-1 category and names
  contrast of 4.5:1, alt text, keyboard navigation and aria-labels as its must-haves; it is a
  searchable reference and enforces nothing. — `.claude/skills/ui-ux-pro-max/SKILL.md`,
  `.agents/skills/ui-ux-pro-max/SKILL.md`
- `FACT-3532` `apps/web` renders HeroUI v3 components whose markup this repository does not write,
  so a defect in the library's own theme or ARIA arrives without a diff to review. — `ADR-0023`
- `FACT-3533` `ADR-0010` records this repository's position that a convention nobody can break
  silently beats one that asks nicely. — `docs/adr/ADR-0010-executable-conventions.md`

> **Rationale — not a fact.** The occasion was adopting a UI/UX reference set. A reference answers
> "what should this look like"; it cannot answer "is what we shipped usable", and the second
> question is the one a suite can hold.

## Decision

- `FACT-3534` `e2e/accessibility/accessibility.functional.spec.ts` runs `axe-core` through
  `@axe-core/playwright` against every page of the application, under the tags `wcag2a`, `wcag2aa`,
  `wcag21a` and `wcag21aa` — WCAG 2.0 and 2.1, levels A and AA. —
  `e2e/accessibility/accessibility.functional.spec.ts`
- `FACT-3535` It is part of `pnpm verify` by construction rather than by configuration: the file
  ends in `*.functional.spec.ts`, so it joins the `web` project and `pnpm e2e` runs it.
  `pnpm e2e:a11y` exists for localizing a failure, not for acceptance. — `playwright.config.ts`,
  `package.json`
- `FACT-3536` Every page is listed in `AUDITED_PAGES` in the spec, the same shape as
  `PROTECTED_ROUTES` and `PROTECTED_PAGES` under invariant 16: adding a page means adding a line. —
  `e2e/accessibility/accessibility.functional.spec.ts`
- `FACT-3537` Two things the scanner does not do are asserted separately in `ACC-FN-04`: `axe-core`
  fails no page for a missing or duplicated `h1`, nor for a missing `main` landmark. —
  `e2e/accessibility/accessibility.functional.cases.md`
- `FACT-3538` The case prefix `ACC` is registered in `KNOWN_CASE_PREFIXES`, without which
  `suite-integrity` rule 4 fails any ID carrying it. — `e2e/suite-integrity.api.spec.ts`

Rejected, each in one line:

- **Leaving accessibility to the `ui-ux-pro-max` reference and review** — that is the arrangement
  `ADR-0010` was written against, and it would not have caught `FX-039`.
- **Running the scan outside `pnpm verify`**, behind `pnpm e2e:a11y` only — a check outside
  acceptance is a check that stops being run.
- **Scanning at WCAG AAA** — it fails on contrast ratios the library's palette cannot reach without
  a design of our own, and a suite that is red by default teaches people to ignore it.
- **Suppressing the first violation with an allowlist** — the first thing a new check finds is the
  evidence that it works; `FX-039` is a one-line theme fix.
- **A separate `accessibility` Playwright project** — the scan needs a browser, which is what the
  `web` project is, and a new project would need its own `testMatch` and server wiring for nothing.

## Consequences

- `FACT-3539` One dev dependency, `@axe-core/playwright`, and roughly four seconds added to a
  `pnpm e2e` run. — `package.json`
- `FACT-3540` `axe-core` detects part of what makes an interface unusable and judges no flow: a page
  can pass every rule here and still be unusable by keyboard in practice. The suite is a floor, the
  way the pre-commit hook is a floor. — `e2e/accessibility/accessibility.functional.cases.md`
- `FACT-3541` A `@axe-core/playwright` or `axe-core` upgrade can turn a green run red without any
  change to this repository, because the rule set moves. That is the same bargain `pnpm audit`
  already makes inside `pnpm verify`. — `package.json`, `FX-029`, `FX-036`, `FX-037`

> **Rationale — not a fact.** The known weakness is `AUDITED_PAGES`: a page that is never added to
> the list is never scanned, and nothing fails. The API half of that problem is solved —
> `AR-API-06` builds the routes from the Nest decorators and compares them against
> `PROTECTED_ROUTES` — but pages are not derivable from decorators, and the equivalent check for
> `PROTECTED_PAGES` does not exist either. One hand-maintained list has become three, which is an
> argument for building that check and not an argument against the suite. `BL-030`.

What holds this in place: the spec runs inside `pnpm e2e` and therefore inside `pnpm verify` and
CI; `suite-integrity` pairs the cases doc with the spec and checks the IDs; `ACC-FN-04` covers two
gaps the scanner leaves; and `FX-039` is the ledger entry proving the check found something on the
day it was added.
