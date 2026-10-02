---
name: heroui-react
description: HeroUI v3 (React + Tailwind v4 + React Aria) in this repository — the stack apps/web actually uses since FT-004. Use when writing or reviewing any UI under apps/web, when reaching for a HeroUI component, when a form or a list is involved, and before applying any pattern from HeroUI's own documentation, four of which conflict with this repository's invariants.
---

Adapter for the external `heroui-react` skill. The original is in
`.agents/skills/heroui-react/` — a gitignored directory — and carries the component guide, the
v2-versus-v3 table and six `scripts/*.mjs` that fetch live documentation. **This file is
self-contained:** everything this repository needs to know about the set is here, so it keeps
working when `.agents/` is absent.

## Status here: adopted

`apps/web` is built on HeroUI v3 and Tailwind v4 (`FT-004`, `ADR-0023`). There is no
`*.module.css` file left; `globals.css` holds two imports and the app shell, and every component
styles itself with HeroUI components plus Tailwind utilities.

| Where                | What                                                                           |
| -------------------- | ------------------------------------------------------------------------------ |
| `globals.css`        | `@import 'tailwindcss'` then `@import '@heroui/styles'` — **in that order**    |
| `postcss.config.mjs` | `@tailwindcss/postcss`, the only plugin; v4 needs no `tailwind.config.js`      |
| `layout.tsx`         | `class="light" data-theme="light"` on `<html>`, semantic utilities on `<body>` |
| components           | `Button`, `TextField`, `Label`, `Input` from `@heroui/react`                   |

Import order is load-bearing. Reversed, HeroUI's layer declarations land before the ones they
override and the components render unstyled.

**There is no provider.** That was v2. Model knowledge of HeroUI is mostly v2 and will be wrong
here: the provider is gone, `framer-motion` is gone, components are compound, the packages changed.

## The four house rules, each bought with a real decision

These are what the set does not know about this repository. All four are in `ADR-0023`.

1. **The `<form>` element stays native wherever a Server Action is bound to it.** HeroUI's `Form` is
   a React Aria component that owns submission; `action={formAction}` is a Next.js binding, and the
   two do not compose. HeroUI supplies the controls _inside_ the form — which is where its styling
   and its label wiring actually live (`FACT-3510`).
2. **A submit control is `<Button type="submit">`, never an `onPress` handler.** HeroUI's docs show
   only `onPress`. `onPress` would force `'use client'` onto a server component and break the no-JS
   path a Server Action form otherwise keeps. That `type="submit"` submits a native form was proven
   by running the suite, not assumed (`FACT-3511`).
3. **Lists stay `ul`/`li`; `ListBox` is not used for them.** `ListBox` is React Aria's _selection_
   widget and renders `role="listbox"`/`role="option"` — a different accessibility contract from
   the `list`/`listitem` that `HD-FN-04` and `HD-FN-05` assert. Styling is never a reason to change
   what a screen reader is told the thing is (`FACT-3512`).
4. **The theme is pinned to light**, not following `prefers-color-scheme`: a theme that follows the
   machine makes the functional cases depend on the machine, which is the class of defect the
   `timeZone: 'UTC'` pin exists to prevent (`FACT-3513`).

## Where HeroUI's documentation is wrong for this repository

**Its form examples violate invariant 15 directly.** The `Form` and `TextField` docs show
`isRequired`, `type="email"` and a client-side `validate` on the same field. Each one, on its own,
makes the browser or React Aria refuse the submission — so the Server Action never runs, the Nest
validation branch never runs, and `AL-FN-05`/`AL-FN-14` end up testing the library instead of our
code.

Write every form here as: **no `isRequired`, no `required`, email as `type="text"`, `noValidate` on
the form, no `validate` prop.** Validation belongs to Nest and surfaces through `useActionState`.
Nothing mechanical catches a violation — that is why invariant 15 is in `CLAUDE.md` and read by
`implementer-web` and `tester-functional`.

The other invariants are untouched by the library and still hold: 9–14 and 19. The token never
reaches a client component, the password is never trimmed, dates stay pinned to `timeZone: 'UTC'`.

## Using the set's scripts

Fetch live documentation rather than recalling an API — model knowledge here is v2:

```bash
cd .agents/skills/heroui-react
node scripts/list_components.mjs                    # 40 components in v3.2.6
node scripts/get_component_docs.mjs Button
MSYS_NO_PATHCONV=1 node scripts/get_docs.mjs /docs/react/getting-started/theming
```

`MSYS_NO_PATHCONV=1` is not optional in Git Bash for any argument starting with `/`: without it the
shell rewrites `/docs/...` into a Windows path and the script answers `HTTP 404`.

**Ignore its install line** (`curl -fsSL https://heroui.com/install | bash -s heroui-react`): this
is a pnpm workspace, so a dependency is added with
`pnpm --filter @purpleschool/web add @heroui/react`, and piping a remote script into a shell is not
how anything gets installed here.

## What the adoption cost, so the next audit does not undo it

Six runtime dependencies and their transitive tree, watched by `pnpm audit --audit-level high`
inside `pnpm verify`. One ongoing cost that no check can see: every future form has to be written
against invariant 15 rather than against the library's documentation.

One thing it did **not** cost: no test changed. All 28 functional cases passed unmodified, which is
what proves the accessible names survived the migration (`FACT-3515`). A future HeroUI change that
needs the suite edited to stay green is the signal that the accessibility contract moved — treat it
as a defect to investigate, not a test to fix.

## Restoring the set

It is **not** in `heroui-inc/heroui` — verified against commit `46e1f1f`: 3155 paths, not one of
them a `SKILL.md`. The skills.sh registry publishes it, so `pnpm skills:sync` cannot sparse-checkout
it and prints the install command instead:

```bash
npx skills add https://github.com/heroui-inc/heroui --skill heroui-react
```

`skills-lock.json` records that command, the version (`3.0.1`) and the `treeHash`, so
`pnpm skills:check` still catches drift the same way as for the git-backed sets.
