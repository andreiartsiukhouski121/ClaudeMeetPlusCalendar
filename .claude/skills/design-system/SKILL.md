---
name: design-system
description: The visual language of apps/web — the measured palette, the type scale, radii, elevation, icons, motion and the page shell, all expressed as HeroUI v3 tokens. Use before designing or implementing any page, component or style under apps/web, when picking a colour, a size, a radius or an icon, and when reviewing a UI change. It is the local answer that heroui-react and ui-ux-pro-max deliberately do not give.
---

The design language of `apps/web`, decided in `ADR-0026`. **This file is self-contained**: every
value below is here, so it keeps working when `.agents/` is absent.

Three skills, no overlap. `heroui-react` says **how the library works** — compound components, no
provider, the four house rules. `ui-ux-pro-max` says **what good UI is** in general — contrast,
touch targets, line length. This one says **what our product looks like**: the actual numbers. When
they meet, `CLAUDE.md` outranks all three.

## What was taken from the reference, and what was not

The owner picked a violet-accented course dashboard: flat white cards on a cool grey canvas, one
saturated colour, soft radii, pastel category chips, a left navigation rail and a right side rail.

**Taken:** the colour story, the radius feel, the density, the shell, the chip-per-category idea.
**Not taken:** its gradients and decorative illustrations, its 12px labels, and its pill-shaped
icon-only buttons without names. Each of those loses to a rule below.

## Colour: the measured table

Every value is OKLCH and every pair was computed, not eyeballed. WCAG AA for normal text is 4.5:1;
the suite is what decides (`ACC-FN-01`, see "The gate").

| Token               | Value                      | Hex       | Against               | Ratio |
| ------------------- | -------------------------- | --------- | --------------------- | ----- |
| `--accent`          | `oklch(0.55 0.21 285)`     | `#6B53E4` | `--accent-foreground` | 5.15  |
| `--accent` as text  | the same                   | `#6B53E4` | a white card          | 5.28  |
| `--background`      | `oklch(0.969 0.004 286)`   | `#F4F4F7` | `--foreground`        | 16.19 |
| `--muted`           | `oklch(0.52 0.014 286)`    | `#686871` | the canvas            | 5.05  |
| `--muted`           | the same                   | `#686871` | a white card          | 5.53  |
| `--category-violet` | ink `oklch(0.45 0.16 285)` | `#5040A8` | its tint `#EEEEFF`    | 6.93  |
| `--category-blue`   | ink `oklch(0.47 0.11 245)` | `#125F94` | its tint `#E4F2FE`    | 5.96  |
| `--category-pink`   | ink `oklch(0.48 0.15 350)` | `#973069` | its tint `#FDEAF2`    | 6.19  |
| `--category-green`  | ink `oklch(0.47 0.10 155)` | `#1F6B41` | its tint `#E4F5E9`    | 5.75  |
| `--category-amber`  | ink `oklch(0.50 0.10 75)`  | `#845A0F` | its tint `#F9EFDA`    | 5.36  |

Everything else — `--foreground`, `--surface`, `--border`, `--separator`, `--danger`, `--success`,
`--warning` and the whole `*-soft` family — is **HeroUI's default and stays that way**. The palette
is three overrides and five additions, not a fork of the theme.

Rules that hold the table up:

- **A component never names a colour.** `bg-accent`, `text-muted`, `border-border`, never
  `bg-[#6B53E4]` and never `bg-violet-500`. Tailwind's own palette is not our palette.
- **`--muted` is redefined on purpose.** HeroUI's own value measures 4.41:1 on our canvas and fails
  AA. Do not restore it, and do not use `text-muted` on anything darker than `--surface`.
- **A category tint is decoration.** The chip's text says what it means; the colour only helps you
  find it again. Nothing is conveyed by hue alone — that is `ui-ux-pro-max`'s priority-1 rule and
  an `axe` failure waiting to happen.
- **The accent is for one thing per screen.** The primary action, the active navigation item, a
  progress bar. A page with four violet things has no primary action.

## Type

**One family: Plus Jakarta Sans**, through `next/font/google`, bound to `--font-sans`. It is the
pairing `ui-ux-pro-max` returns for this product's mood twice over ("Enterprise SaaS", "Friendly
SaaS"), both single-family. No second family. No mono face until something needs one.

| Role                | Size / leading       | Weight | Utility                               |
| ------------------- | -------------------- | ------ | ------------------------------------- |
| Page title (`h1`)   | 24px / 1.25          | 700    | `text-2xl font-bold tracking-tight`   |
| Section (`h2`)      | 18px / 1.35          | 600    | `text-lg font-semibold`               |
| Card title (`h3`)   | 16px / 1.4           | 600    | `text-base font-semibold`             |
| Body                | 16px / 1.5           | 400    | `text-base`                           |
| Secondary, metadata | 14px / 1.5           | 400    | `text-sm text-muted`                  |
| Chip, eyebrow label | 12px / 1.4, `0.04em` | 600    | `text-xs font-semibold tracking-wide` |

- **12px is the floor and it is for labels only.** `ui-ux-pro-max` calls body text under 12px an
  anti-pattern; a chip or an uppercase eyebrow is not body text.
- **Prose is capped at `max-w-[65ch]`.** Two of the existing components already carry a width cap
  for exactly this reason, in `apps/web/src/app/auth/layout.tsx` and `apps/web/src/app/page.tsx`.
- **Line height stays unitless** so a user's text-spacing override still reflows.

## Shape and density

`--radius: 0.75rem`. HeroUI derives the rest, so this one declaration moves everything:

| Utility       | Resolves to | Used for                                |
| ------------- | ----------- | --------------------------------------- |
| `rounded-md`  | 9px         | chips, small badges                     |
| `rounded-lg`  | 12px        | buttons, inputs' inner elements         |
| `rounded-xl`  | 18px        | form fields (`--field-radius`), tiles   |
| `rounded-2xl` | 24px        | cards, panels                           |
| `rounded-3xl` | 36px        | the hero banner, the page shell corners |

Spacing is Tailwind's 4px step and only these rungs: **4, 8, 12, 16, 20, 24, 32, 40**
(`gap-1`…`gap-10`). Card padding is `p-5` or `p-6`; the gap between cards is `gap-4`; the gap
between page sections is `gap-8`. Adjacent interactive elements keep **at least 8px** between them
and a touch target is at least **44×44px** — both are `ui-ux-pro-max` critical rules.

## Elevation

One raised level, and it is HeroUI's own shadow token.

- A raised surface: `bg-surface shadow-surface rounded-2xl`.
- A quiet surface: `bg-surface border border-border rounded-2xl`.
- **Never both.** A bordered card that also casts a shadow is the single most common way this
  language goes blurry.
- `shadow-overlay` belongs to popovers, menus, modals and tooltips. Nothing on the page uses it.
- Depth otherwise comes from the lightness step: the canvas is `#F4F4F7`, a card is white. That is
  why `--background` is not pure white.

## Icons

**Phosphor** (`@phosphor-icons/react`) at `weight="regular"` — the library `ui-ux-pro-max` names
primary, with Heroicons as its fallback. One family per surface; never mix.

```tsx
<House size={20} weight="regular" aria-hidden="true" />   // beside visible text
<Button aria-label="Notifications"><Bell size={20} /></Button>  // icon-only control
```

- 20px inside navigation items, list rows and buttons; 24px in page headers.
- Decorative icon beside text → `aria-hidden="true"`. Icon-only control → an accessible name on the
  **control**, which is what the functional cases address it by.
- **No emoji as icons.** That is a named anti-pattern and an `axe`-invisible one.
- The dependency is not installed yet (`BL-031`). Until it is, a surface ships without icons rather
  than with inline SVG pasted per component.

## Motion

150–200ms, `ease-out`, and only on colour, opacity and transform. Animating `width` or `height`
causes layout work per frame. Every animated surface honours `prefers-reduced-motion: reduce` — it
is the last line of the `ui-ux-pro-max` pre-delivery checklist and the one most often skipped.

HeroUI ships the curves: `ease-out-fluid`, `ease-out-cubic`, `ease-out-quart`.

## Where this language stops: the invariants outrank it

None of the following bends for a visual reason. All of them have already been broken once.

| Want                                                      | Not allowed, because                                                                 |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| HeroUI's `Form`, `isRequired`, `type="email"`, `validate` | Invariant 15: the browser then refuses the submission and the Nest branch never runs |
| `ListBox` for a prettier list                             | `FACT-3512`: it renders `listbox`/`option`, a different contract from `HD-FN-04`     |
| `onPress` on a submit control                             | `FACT-3511`: it forces `'use client'` and breaks the no-JS Server Action path        |
| A dark mode toggle                                        | `FACT-3513`: the theme is pinned to light, like dates are pinned to UTC              |
| Splitting `Meetings total: 5` across elements for styling | `HD-FN-03` matches it as one text node                                               |
| A second `h1`, or none                                    | `ACC-FN-04` asserts exactly one, because `axe` does not                              |
| Passing the token into a client component to style it     | Invariant 19: it would travel in the RSC stream                                      |

## Traps this repository has actually hit

- **`text-foreground-500` and `border-default-200` generate no CSS.** They are HeroUI v2 token
  names; v3 has `--muted` and `--border` and no numeric scale. Seven and two occurrences of them
  are live in `apps/web` right now, rendering secondary text at full foreground and borders at
  `currentColor` (`FACT-3544`, `BL-032`). A class that compiles to nothing produces no violation, no
  failed case and no diff — grep for `-500`, `-200`, `-700` in `apps/web/src` before believing a
  colour utility exists.
- **Model recall of HeroUI is v2.** `HeroUIProvider`, `framer-motion`, flat component names and
  `color="primary"` are all v2. Read `heroui-react` first; fetch live docs rather than recalling.
- **A colour that looks right can be outside sRGB.** `oklch(0.50 0.195 253.83)` — the current
  `--accent` from `FX-039` — clips on conversion, so the rendered colour is not the declared one.
  Every value in the table above was checked in-gamut.

## The gate

A change to any token is accepted by **`pnpm verify`**, whose `@accessibility` cases run `axe-core`
at WCAG 2.0/2.1 AA over every page (`ADR-0025`). `pnpm e2e:a11y` is for localizing a failure, not
for acceptance.

The standing bar from the HeroUI migration holds: **restyling changes no accessible name**
(`FACT-3559`). If a visual change needs a functional case edited, the accessibility contract moved —
that is a defect to investigate, not a test to update.

## Where it belongs in the flow

- **`FEAT-S2` design** (`designer`) — the values come from here; the set searches in
  `ui-ux-pro-max` are for questions this file does not answer.
- **`FEAT-S4` implementation** (`implementer-web`) — read before the first class name, alongside
  `heroui-react`.
- **UI review and `tester-functional`** — the tables above are the checklist a change is pressed
  against.

It is **not** a gate and adds no stage. Nothing requires reading it and nothing checks that it was
read; making it a step is the shape `CH-004` is the ledger entry for.

## Files

| File                     | Holds                                                               |
| ------------------------ | ------------------------------------------------------------------- |
| `references/tokens.css`  | the exact block to put in `apps/web/src/app/globals.css`            |
| `references/patterns.md` | the shell grid and the recurring components, written against HeroUI |

`ADR-0026` is the decision itself and carries the facts; this file is how to apply it. Applying it
to the four existing pages is `BL-031`.
