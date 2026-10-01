# ADR-0023 — HeroUI v3 replaces CSS Modules in `apps/web`

- **Status:** accepted
- **Date:** 2026-10-01
- **Supersedes:** —
- **Superseded by:** —

## Context

- `FACT-3505` Before this record `apps/web` depended on `next`, `react` and `react-dom` and nothing
  else, and styled seven components with five `*.module.css` files plus `globals.css`. —
  `apps/web/package.json`, `CH-025` commit `d5334d3`
- `FACT-3506` The `heroui-react` skill set was installed for work that was expected rather than
  done, and `BL-023` tracked the open question of whether to adopt it. — `docs/BACKLOG.md`
  `BL-023`, `.claude/skills/heroui-react/SKILL.md`
- `FACT-3507` HeroUI v3 requires Tailwind CSS v4 and does not work with v3, and builds its
  components on React Aria. — `.agents/skills/heroui-react/SKILL.md`, "Critical Setup
  Requirements"
- `FACT-3508` The functional suite holds 28 cases addressing controls through 49 `getByRole`, 24
  `getByLabel` and 13 `getByText` calls, so a markup change is a suite change unless the
  accessibility contract is preserved. — `e2e/regression/**/*.functional.spec.ts`,
  `e2e/security/security.functional.spec.ts`

> **Rationale — not a fact.** The adapter's warning that adoption "replaces the styling approach of
> `apps/web`, not adds a library beside it" is what made this an ADR rather than an install. The
> repository owner directed the adoption; this record states what was decided and what it costs,
> not whether it was worth it.

## Decision

- `FACT-3509` `apps/web` styles its components with HeroUI v3 and Tailwind v4 utilities. No
  `*.module.css` file remains; `globals.css` holds `@import 'tailwindcss'` followed by
  `@import '@heroui/styles'`, in that order, and the app-shell rules that have no component to hang
  on. — `apps/web/src/app/globals.css`, `apps/web/postcss.config.mjs`
- `FACT-3510` The `<form>` element stays native wherever a Next.js Server Action is bound to it:
  HeroUI's `Form` is a React Aria component that owns submission, and the two do not compose.
  HeroUI supplies the controls inside — `Button`, `TextField`, `Label`, `Input`. —
  `apps/web/src/app/auth/login/login-form.tsx`, `apps/web/src/components/create-meeting-form.tsx`
- `FACT-3511` A submit control is `<Button type="submit">` and never an `onPress` handler: `onPress`
  would require `'use client'` on a server component and would break the no-JS path that a Server
  Action form otherwise keeps. — `apps/web/src/components/logout-button.tsx`
- `FACT-3512` Lists keep plain `ul`/`li`; HeroUI's `ListBox` is not used for them. `ListBox` renders
  `role="listbox"`/`role="option"`, a different accessibility contract from the `list`/`listitem`
  the cases assert. — `apps/web/src/components/meeting-list.tsx`, `HD-FN-04`, `HD-FN-05`
- `FACT-3513` The theme is pinned to light on `<html>` (`class="light"`, `data-theme="light"`)
  rather than following `prefers-color-scheme`. — `apps/web/src/app/layout.tsx`

Rejected, each in one line:

- **Keeping CSS Modules and adding HeroUI beside them** — two styling systems in seven components,
  and HeroUI's own styles need Tailwind v4 regardless, so the cost is paid without the benefit.
- **Adopting HeroUI's `Form` and `FieldError`** — they own submission and validation, which belong
  to the Server Action and to Nest; see `FACT-3510` and invariant 15.
- **`next-themes` for a light/dark switch** — the theming doc offers it, nothing asks for it, and a
  theme that follows the machine makes the functional cases depend on the machine.
- **The upstream installer** (`curl -fsSL https://heroui.com/install | bash`) — this is a pnpm
  workspace; dependencies are added with `pnpm --filter @purpleschool/web add`.

## Consequences

- `FACT-3514` Invariant 15 outranks HeroUI's documented form patterns, which show `isRequired`,
  `type="email"` and a client-side `validate` on `TextField`. None of the three is used here: all
  would block submission in the browser and the server validation branch would never run. —
  `CLAUDE.md` invariant 15, `.claude/skills/heroui-react/SKILL.md`
- `FACT-3515` The migration changed no test: all 28 functional cases passed unmodified, which is the
  evidence that the accessibility contract was preserved rather than the assertion that it was. —
  `e2e/regression/auth-login/auth-login.functional.spec.ts`,
  `e2e/regression/home-dashboard/home-dashboard.functional.spec.ts`,
  `e2e/security/security.functional.spec.ts`
- `FACT-3516` `apps/web` now carries six runtime dependencies it did not have — `@heroui/react`,
  `@heroui/styles`, `tailwind-variants`, `tailwindcss`, `@tailwindcss/postcss`, `postcss` — and
  their transitive tree, which `pnpm audit --audit-level high` inside `pnpm verify` is what watches.
  — `apps/web/package.json`
- `FACT-3517` Class names are now utility classes in the markup rather than hashed module names, so
  a class selector in a test would survive a build and start looking usable. Tests still address by
  role, label and text only. — `e2e/README.md`, locator rules

> **Rationale — not a fact.** The largest ongoing cost is that HeroUI's examples disagree with this
> repository's invariants on exactly the forms that matter, so every future form has to be written
> against invariant 15 rather than against the library's documentation. The `heroui-react` adapter
> is where that disagreement is recorded; nothing mechanical catches it, which is why invariant 15
> is stated in `CLAUDE.md` and read by `implementer-web` and `tester-functional`.

What holds this in place: invariant 15 and invariants 9–14 and 19 are unchanged and still read by
the web roles; the 28 functional cases are the regression; `AR-API-11`…`AR-API-17` hold these facts;
`pnpm audit --audit-level high` inside `pnpm verify` watches the new dependency tree.
