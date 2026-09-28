---
name: heroui-react
description: HeroUI v3 (React + Tailwind v4 + React Aria) in this repository — the set is installed for future work and nothing uses it yet. Use when asked to build UI with HeroUI, to install @heroui/react, or to decide whether to adopt it here; and read it before applying any HeroUI pattern to apps/web, whose styling stack is different.
---

Adapter for the external `heroui-react` skill. The original is in
`.agents/skills/heroui-react/` — a gitignored directory — and carries the component guide, the
v2-versus-v3 table and six `scripts/*.mjs` that fetch live documentation. **This file is self-contained:**
everything this repository needs to know about the set is here, so it keeps working when `.agents/`
is absent.

## Status here: installed, not adopted

**No code in this repository uses HeroUI.** `apps/web` depends on `next`, `react` and `react-dom`
and nothing else; its styling is plain CSS Modules (`globals.css` plus `*.module.css` next to each
component). There is no Tailwind, no `@heroui/react`, no `@heroui/styles`.

The set was installed deliberately, for work that is expected rather than done. It was briefly
removed during the skill audit (`CH-012`, task S8) precisely because an unused set without an
adapter cannot be loaded and looks like debris; it is back with this adapter and that reason
recorded, so the next audit does not delete it again.

## Adopting it is an architecture decision, not an install

HeroUI v3 is built on **Tailwind CSS v4** and **React Aria Components**. Bringing it in means
replacing the styling approach of `apps/web`, not adding a library beside it:

| Today                                         | HeroUI v3 needs                                    |
| --------------------------------------------- | -------------------------------------------------- |
| CSS Modules, one `*.module.css` per component | Tailwind v4 plus `@heroui/styles`                  |
| No design-token layer                         | CSS variables in the `oklch` colour space          |
| Hand-written form and list markup             | React Aria compound components (`<Card.Header>` …) |

That is exactly the kind of choice `ADR-0015` says gets an **ADR before the code**. It also touches
the functional suite directly: those cases address controls by accessible name (`getByRole`), so
swapping the markup for React Aria components changes what the locators see — the tester roles move
in the same change or the suite goes red for the wrong reason. `BL-023` tracks the decision.

## What the set is right about, and what to ignore

- **Follow it on v3 versus v2.** The guide is emphatic that the provider is gone, `framer-motion` is
  gone, components are compound, and the packages changed. Model knowledge of HeroUI is mostly v2 and
  will be wrong here.
- **Use its scripts instead of recalling APIs.** `node scripts/list_components.mjs`,
  `get_component_docs.mjs <Component>`, `get_source.mjs`, `get_styles.mjs`, `get_theme.mjs` fetch
  live documentation. They live in `.agents/skills/heroui-react/scripts/` and need the network.
- **Ignore its install line** (`curl -fsSL https://heroui.com/install | bash -s heroui-react`): this
  is a pnpm workspace, so a dependency is added with
  `pnpm --filter @purpleschool/web add @heroui/react`, and piping a remote script into a shell is not
  how anything gets installed here.
- **The invariants in `CLAUDE.md` outrank it.** Rules 9–15 and 19 still hold whatever the component
  library is: no `required` on form fields and email as `type="text"` (or the server branch never
  runs), the password is never trimmed, dates stay pinned to `timeZone: 'UTC'`, and no token reaches
  a client component.

## Restoring the set

It is **not** in `heroui-inc/heroui` — verified against commit `46e1f1f`: 3155 paths, not one of
them a `SKILL.md`. The skills.sh registry publishes it, so `pnpm skills:sync` cannot sparse-checkout
it and prints the install command instead:

```bash
npx skills add https://github.com/heroui-inc/heroui --skill heroui-react
```

`skills-lock.json` records that command, the version (`3.0.1`) and the `treeHash`, so
`pnpm skills:check` still catches drift the same way as for the git-backed sets.
