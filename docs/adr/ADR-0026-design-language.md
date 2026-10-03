# ADR-0026 — One design language for `apps/web`, declared as tokens

- **Status:** accepted
- **Date:** 2026-10-02
- **Supersedes:** —
- **Superseded by:** —

## Context

- `FACT-3543` HeroUI v3 declares its whole visual surface as CSS custom properties on `:root` and
  maps them into Tailwind through `@theme inline`, so changing the look of every component is a
  variable declaration rather than a component edit. — `@heroui/styles@3.2.6`
  `dist/themes/default/variables.css`, `dist/themes/shared/theme.css`
- `FACT-3545` A palette value here is settled by the suite, not by taste: HeroUI's default accent
  put its own foreground on it at 3.58:1, below the 4.5:1 of WCAG AA, and was darkened until
  `ACC-FN-01` passed. — `FX-039`, `apps/web/src/app/globals.css`
- `FACT-3546` The `ui-ux-pro-max` set profiles this product as an LMS — primary style "Flat Design +
  Accessible & Ethical", dashboard style "Education Analytics Dashboard" — and both of its font
  pairings for that mood are single-family Plus Jakarta Sans. —
  `.agents/skills/ui-ux-pro-max/data/products.csv`, `data/typography.csv`, queried through
  `scripts/search.py`
- `FACT-3547` The same set names Phosphor as its primary icon library and Heroicons as the fallback,
  and requires one visual family per surface, `aria-hidden="true"` on a decorative icon and an
  accessible name on an icon-only control. — `.agents/skills/ui-ux-pro-max/data/icons.csv`, row
  `icon-context-accessibility`

> **Rationale — not a fact.** The occasion was a reference screenshot the repository owner picked:
> a violet-accented course dashboard — flat cards, soft radii, one saturated colour against a cool
> grey canvas, pastel category chips. This record states what was taken from it and what the values
> are; whether that look is the right one for the product is the owner's call and was made.

## Decision

- `FACT-3548` The design language lives in `apps/web/src/app/globals.css` as custom properties that
  override HeroUI's defaults, plus one `@theme inline` block for the tokens HeroUI has no equivalent
  for. A component never carries a raw colour, radius, shadow or font value — it carries the utility
  that resolves to a token. — `apps/web/src/app/globals.css`,
  `.claude/skills/design-system/references/tokens.css`
- `FACT-3549` The brand accent is `oklch(0.55 0.21 285)` (`#6B53E4`). Against HeroUI's
  `--accent-foreground` (`--snow`) it measures 5.15:1, above the 4.5:1 of WCAG AA for normal text. —
  `.claude/skills/design-system/SKILL.md`, "Colour: the measured table"
- `FACT-3550` The page canvas is `oklch(0.969 0.004 286)` (`#F4F4F7`) and cards keep HeroUI's white
  `--surface`, so a raised surface reads as a lightness step rather than as a shadow. Secondary text
  is `--muted` redefined to `oklch(0.52 0.014 286)` (`#686871`): HeroUI's own `--muted` measures
  4.41:1 on that canvas and fails AA, while the redefined value measures 5.05:1 on the canvas and
  5.53:1 on a card. — `.claude/skills/design-system/SKILL.md`, "Colour: the measured table"
- `FACT-3551` Five category tints exist as project-owned tokens — violet, blue, pink, green, amber —
  each a tinted surface with its own ink, every pair measured between 5.36:1 and 6.93:1. They label
  a category and never carry meaning alone: the text inside the chip is what says what it means. —
  `.claude/skills/design-system/references/tokens.css`
- `FACT-3552` `--radius` is `0.75rem`, which moves HeroUI's whole derived scale at once: `rounded-lg`
  becomes 12px, `rounded-xl` 18px, `rounded-2xl` 24px, `rounded-3xl` 36px, and a form field
  (`calc(var(--radius) * 1.5)`) 18px. — `@heroui/styles@3.2.6` `dist/themes/shared/theme.css`,
  `.claude/skills/design-system/references/tokens.css`
- `FACT-3553` Type is one family, Plus Jakarta Sans, loaded through `next/font/google` and bound to
  `--font-sans`. There is no second family and no mono face until something needs one. —
  `.claude/skills/design-system/SKILL.md`, "Type"
- `FACT-3554` Icons are Phosphor (`@phosphor-icons/react`) at `weight="regular"`, 20px inside rows
  and navigation and 24px in headers. An icon beside visible text carries `aria-hidden="true"`; an
  icon-only control carries an accessible name. — `.claude/skills/design-system/SKILL.md`, "Icons"
- `FACT-3555` Elevation has one raised level — `shadow-surface` on `bg-surface`. A container is
  either bordered or raised, never both, and `shadow-overlay` belongs to overlays only. —
  `.claude/skills/design-system/references/patterns.md`
- `FACT-3556` The application shell is a three-track grid — a 16rem navigation rail, a fluid main
  column, a 20rem side rail — collapsing to one column below the `lg` breakpoint. —
  `.claude/skills/design-system/references/patterns.md`
- `FACT-3557` The language is written down for the implementers in `.claude/skills/design-system/`,
  which is a skill of ours rather than an adapter: it has no external set behind it, and it cites
  `heroui-react` and `ui-ux-pro-max` instead of repeating them. — `.claude/skills/design-system/SKILL.md`,
  `CLAUDE.md`

Rejected, each in one line:

- **A second theme, or following `prefers-color-scheme`** — `FACT-3513` pins the theme to light for
  the same reason dates are pinned to UTC, and a dark palette doubles every contrast measurement
  below for a switch nothing asks for.
- **Literal colours in utilities** (`bg-[#6B53E4]`) — a value in markup cannot be re-measured or
  re-themed, and `ui-ux-pro-max` lists raw hex in components among its anti-patterns.
- **Taking the `ui-ux-pro-max` LMS palette verbatim** (teal primary, amber accent) — it is another
  product's colour story and is not the reference the owner chose; the set's _style profile_, its
  _stack-independent rules_ and its _font pairing_ were taken, its hexes were not.
- **A tint generated per category** from a hash of the category name — the set of categories is small
  and fixed, and a colour generated at render time cannot be contrast-checked before it ships.
- **Overriding `--radius` per component instead of globally** — HeroUI derives eight radius steps and
  the field radius from that one value, so a per-component override reintroduces exactly the drift
  tokens exist to stop.

## Consequences

- `FACT-3558` Every contrast number in this record and in the skill is computed from the OKLCH
  values, and `ACC-FN-01` is what decides: a token change is accepted by a green
  `pnpm e2e:a11y` inside a green `pnpm verify`, the same gate that caught `FX-039`. — `ADR-0025`,
  `e2e/accessibility/accessibility.functional.spec.ts`
- `FACT-3559` Restyling changes no accessible name. All 28 functional cases passed unmodified across
  the HeroUI migration, and that is the standing bar: a visual change that needs a functional case
  edited is a defect to investigate, not a test to update. — `FACT-3515`,
  `e2e/regression/auth-login/auth-login.functional.spec.ts`,
  `e2e/regression/home-dashboard/home-dashboard.functional.spec.ts`
- `FACT-3561` Nothing mechanical catches a component that hard-codes a colour or spells a token the
  way HeroUI v2 did. `FACT-3544` is what that failure looks like, and it survived a code review, an
  accessibility scan and 28 functional cases, because a class that generates no CSS produces no
  violation, no failure and no diff. Review against the skill is the only thing holding it. —
  `FACT-3544`, `docs/CHANGELOG.md` `FX-039`

> **Rationale — not a fact.** The largest ongoing cost is the one `ADR-0023` already named: the
> library's documentation and a model's recall both describe a different visual system, so every new
> surface has to be written against this record rather than against what a HeroUI example looks
> like. The cheapest lesson is the dead class names — invisible to every automated check this
> repository owns, and found only by compiling the stylesheet and looking.

## Retired facts

Facts this record no longer states, each naming the key that replaced it (`ADR-0022`). The
statement is quoted exactly as it last stood in the body above; the citation path that followed it
is not part of the statement and is not repeated here.

| Key         | Stated                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Status                 | Recorded in |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ----------- |
| `FACT-3542` | Before this record `apps/web` had no visual language of its own. `globals.css` holds the two imports, the app-shell rules and exactly one project-owned value — the `--accent` override from `FX-039`; everything else is HeroUI's untouched default theme plus utilities chosen per component.                                                                                                                                                            | `retired by FACT-0055` | `BL-031`    |
| `FACT-3544` | Two utility classes in use across `apps/web` generate no CSS at all: `text-foreground-500` (seven occurrences) and `border-default-200` (two) name tokens HeroUI v3 does not define, so the secondary text renders at the full foreground colour and the borders fall back to `currentColor`. Verified by compiling `@import 'tailwindcss'` plus `@import '@heroui/styles'` through `@tailwindcss/postcss` and searching the output for the two selectors. | `retired by FACT-0057` | `BL-032`    |
| `FACT-3560` | The language is not free to apply: it needs Plus Jakarta Sans through `next/font`, `@phosphor-icons/react` as a new runtime dependency watched by `pnpm audit --audit-level high`, and a rework of the four existing pages. That work is `BL-031`, not this record.                                                                                                                                                                                        | `retired by FACT-0056` | `BL-031`    |

> **Rationale — not a fact.** `FACT-3542` retires whole rather than being partly edited: only its
> second clause went false (`globals.css` now holds the whole token block from
> `.claude/skills/design-system/references/tokens.css`), but a fact retires as the statement it was,
> not clause by clause. `FACT-3544`'s count is zero once `BL-031`/`BL-032` land, and its successor
> lives in **Patterns deliberately refused** rather than **Patterns in use** because the thing worth
> keeping citable is the failure class, not the fix. `FACT-3560` named work that is now done and
> miscounted the pages besides (three `page.tsx`, two layouts, three components — never four). The
> `FT-`/`FX-` entries for this rollout are minted after this record lands (`docs/process.md`
> `FEAT-S7`/`FEAT-S8`); `BL-031` and `BL-032` are the stable reference available at the time of
> retirement and are closed, never deleted, once those entries exist.
