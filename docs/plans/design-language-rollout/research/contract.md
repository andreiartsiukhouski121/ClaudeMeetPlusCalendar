# Research: design-language-rollout — contract sweep (promises)

> Evidence rule: every statement below cites a `FACT-NNNN` key, a `path:line`, an ADR ID, an
> invariant number, or a case ID. An unkeyed sentence in the corpus is reasoning, not fact, and is
> reported as such. No value, field or markup is proposed here — only what the project already
> commits to.

## 1. What `ADR-0026` binds

Status: `accepted`, 2026-10-02, supersedes nothing (`docs/adr/ADR-0026-design-language.md:3-6`).

**Context facts** (what the record observed before deciding):

- `FACT-3542` — before the record, `globals.css` held two imports, the app-shell rules and one
  project-owned value (`--accent` from `FX-039`); everything else was HeroUI's untouched default
  plus per-component utilities.
- `FACT-3543` — HeroUI v3 declares its whole visual surface as CSS custom properties mapped through
  `@theme inline`, so a look change is a variable declaration.
- `FACT-3544` — `text-foreground-500` (7 occurrences) and `border-default-200` (2) generate no CSS;
  they are HeroUI v2 names, verified by compiling the stylesheet and grepping the output. Cited
  again as `BL-032`.
- `FACT-3545` — the darkened `--accent` is settled by the suite (`ACC-FN-01`), not by taste.
- `FACT-3546` — `ui-ux-pro-max` profiles the product as an LMS (styles "Flat Design + Accessible &
  Ethical", "Education Analytics Dashboard") and both its font pairings for that mood are
  single-family Plus Jakarta Sans.
- `FACT-3547` — the same set names Phosphor primary / Heroicons fallback, one visual family per
  surface, `aria-hidden="true"` on a decorative icon, an accessible name on an icon-only control.

**Decision facts, with whether each names an exact value:**

| Key         | Fixes                                                                                                                                       | Exact value named?                                                                                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `FACT-3548` | Where the language lives: `globals.css` as overrides + one `@theme inline` block; a component never carries a raw colour/radius/shadow/font | No exact value — a placement rule                                                                                                                                  |
| `FACT-3549` | `--accent`                                                                                                                                  | Yes — `oklch(0.55 0.21 285)` / `#6B53E4`, measured 5.15:1                                                                                                          |
| `FACT-3550` | `--background`, `--muted`                                                                                                                   | Yes — `oklch(0.969 0.004 286)` / `#F4F4F7`; `--muted` `oklch(0.52 0.014 286)` / `#686871`                                                                          |
| `FACT-3551` | Five category tints (violet, blue, pink, green, amber)                                                                                      | Named as existing (ink + tint, 5.36–6.93:1) but the per-token OKLCH values are not restated in the ADR body — they are in `tokens.css` (see §2)                    |
| `FACT-3552` | `--radius` and the derived scale                                                                                                            | Yes — `0.75rem`; `rounded-lg`→12px, `rounded-xl`→18px, `rounded-2xl`→24px, `rounded-3xl`→36px, field radius 18px                                                   |
| `FACT-3553` | Type family                                                                                                                                 | Yes — Plus Jakarta Sans via `next/font/google`, bound to `--font-sans`; no second family, no mono face                                                             |
| `FACT-3554` | Icons                                                                                                                                       | Yes — Phosphor (`@phosphor-icons/react`), `weight="regular"`, 20px rows/nav, 24px headers; `aria-hidden="true"` beside text, accessible name on icon-only controls |
| `FACT-3555` | Elevation                                                                                                                                   | Named as one raised level, `shadow-surface` on `bg-surface`; bordered-or-raised, never both; `shadow-overlay` for overlays only — no numeric value, a rule         |
| `FACT-3556` | The shell                                                                                                                                   | Yes — three-track grid: 16rem nav rail, fluid main, 20rem side rail, collapsing to one column below `lg`                                                           |
| `FACT-3557` | Where it is written down                                                                                                                    | `.claude/skills/design-system/` — a skill of ours, not an adapter                                                                                                  |

**Rejected, by name** (closed options — each one line in the ADR, `docs/adr/ADR-0026-design-language.md:85-97`):

- A second theme / following `prefers-color-scheme`.
- Literal colours in utilities (`bg-[#6B53E4]`).
- Taking the `ui-ux-pro-max` LMS palette verbatim (teal primary, amber accent).
- A tint generated per category from a hash of the category name.
- Overriding `--radius` per component instead of globally.

**Consequence facts:**

- `FACT-3558` — a token change is accepted by a green `pnpm e2e:a11y` inside `pnpm verify`
  (`ADR-0025`), the gate that caught `FX-039`.
- `FACT-3559` — restyling changes no accessible name; all 28 functional cases passed unmodified
  across the HeroUI migration; a functional case edited for a visual change is a defect to
  investigate, not a test to update.
- `FACT-3560` — the language needs Plus Jakarta Sans through `next/font`, `@phosphor-icons/react`
  as a new runtime dependency watched by `pnpm audit --audit-level high`, and a rework of the four
  existing pages; that work is named `BL-031`, not `ADR-0026` itself.
- `FACT-3561` — nothing mechanical catches a hard-coded colour or a HeroUI-v2-spelled token;
  `FACT-3544` is what that failure looks like and it survived review, an accessibility scan and 28
  cases. Review against the skill is the only thing holding it.

**Two rationale blocks, both reasoning rather than fact**, each marked
`> **Rationale — not a fact.**` and each carrying no key:

- `docs/adr/ADR-0026-design-language.md:38-41`, in Context after `FACT-3547`, opening "The occasion
  was a reference screenshot the repository owner picked…" — why the look was chosen, ending
  "whether that look is the right one for the product is the owner's call and was made".
- `docs/adr/ADR-0026-design-language.md:120-124`, closing the record, opening "The largest ongoing
  cost is the one `ADR-0023` already named…" — that the library's docs and a model's recall
  describe a different visual system, and that the dead class names were "found only by compiling
  the stylesheet and looking".

No finding in this file rests on either.

## 2. The `design-system` skill as a specification

`.claude/skills/design-system/SKILL.md` carries no `FACT-` keys of its own — it is prose that cites
`ADR-0026`'s facts and restates their values in tables (e.g. the "Colour: the measured table",
`SKILL.md:28-39`, and the radius table, `SKILL.md:82-88`). Per the evidence rule, a claim here is
only as strong as the `FACT-` it names; where the skill gives a number the ADR itself does not
restate (e.g. the five category tint hex/OKLCH pairs), the **only** keyed source is `tokens.css`
itself, which is not a `FACT-` document — it is the file section 4 says to copy verbatim
(`SKILL.md:182-190`, `references/tokens.css:1-11`: "Copy it; do not paraphrase it — the values are
measured, not chosen").

**`references/tokens.css` declares, verbatim** (`references/tokens.css:18-81`):

- `:root`: `--accent: oklch(0.55 0.21 285)`; `--background: oklch(0.969 0.004 286)`;
  `--muted: oklch(0.52 0.014 286)`; `--radius: 0.75rem`.
- Five category pairs, each a tint and a foreground: `--category-violet` /
  `--category-violet-foreground` (`oklch(0.955 0.022 285)` / `oklch(0.45 0.16 285)`), and the same
  shape for `-blue` (hue 245), `-pink` (hue 350), `-green` (hue 155), `-amber` (hue 85, foreground
  `oklch(0.5 0.1 75)`).
- An `@theme inline` block exposing `--font-sans: var(--font-plus-jakarta), ui-sans-serif,
system-ui, sans-serif` and the ten `--color-category-*` Tailwind bindings for the five pairs
  above.
- A comment block (not CSS) giving the exact `layout.tsx` font-loading snippet
  (`Plus_Jakarta_Sans({ variable: '--font-plus-jakarta', subsets: ['latin'] })`) and the required
  `<html className="light ${sans.variable}" data-theme="light">`.

**`references/patterns.md` prescribes, per pattern** (markup + utilities, as written — not
paraphrased):

| Pattern         | Markup prescribed                                                                                                                                                                                                                         | Line                  |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| Shell           | `<div className="bg-background min-h-screen lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">` wrapping `<nav aria-label="Main">`, a `max-w-7xl` column, and `<aside aria-label="Overview">` inside a `xl:grid-cols-[minmax(0,1fr)_20rem]` row | `patterns.md:25-42`   |
| Navigation rail | `<ul>`/`<li>`/`<Link aria-current={isActive ? 'page' : undefined}>` with `aria-[current=page]:bg-accent-soft aria-[current=page]:text-accent-soft-foreground`, a Phosphor icon at `size={20}` `aria-hidden="true"`                        | `patterns.md:57-69`   |
| Hero banner     | `<section className="bg-accent text-accent-foreground … rounded-3xl p-6 sm:p-8">` with an uppercase eyebrow `<p>`, an `<h2 className="max-w-[28ch] …">`, one `<Button variant="solid">`                                                   | `patterns.md:86-93`   |
| Card            | `<Card.Root className="rounded-2xl p-5">` / `<Card.Content className="flex flex-col gap-3 p-0">`; raised or bordered, never both                                                                                                          | `patterns.md:102-111` |
| List of records | `<ul aria-label="Recent meetings">` / `<li>` with a `Card.Root` inside, `flex-row` explicit on `Card.Content`                                                                                                                             | `patterns.md:117-133` |
| Category chip   | `<Chip.Root size="sm" className="bg-category-violet text-category-violet-foreground rounded-md"><Chip.Label>…</Chip.Label></Chip.Root>`                                                                                                   | `patterns.md:137-141` |
| Stat tile       | `<Card.Root className="rounded-2xl p-4">` with a `size-10` icon badge (`bg-category-blue text-category-blue-foreground rounded-xl`) beside a two-line `<div>` (muted small line, bold truncated line)                                     | `patterns.md:151-163` |
| Person row      | Avatar + name + role + one named `Button`; `alt=""` + `aria-hidden` on the image when the name is beside it                                                                                                                               | `patterns.md:169-176` |
| Form            | `<form action={formAction} noValidate>`, `TextField`/`Label`/`Input type="text"` for email, one `role="alert"` paragraph, `<Button type="submit">`                                                                                        | `patterns.md:183-209` |
| Date/time       | `formatMeetingDateTime`, pinned `timeZone: 'UTC'`                                                                                                                                                                                         | `patterns.md:213-215` |

**Surfaces the application does not have today**, named explicitly in `patterns.md` as patterns to
apply: the navigation rail, the side rail (`aside aria-label="Overview"`), the hero banner, the
stat tile, and the category chip (`patterns.md:20-42, 55-78, 80-93, 135-167`). Confirmed absent in
the current tree by reading every file under `apps/web/src/app` and `apps/web/src/components`
(§4 of this file and the file list in "Not found" below) — none defines a `<nav>`, an `<aside>`, a
hero `<section>`, a stat-tile card, or a `Chip` used for a category.

The skill is explicit that only `Card`, `Chip`, `Button`, `TextField`, `Label` and `Input` are
"proven in this repository today" — the rest (`Link` active-state styling, `ProgressBar`/`Meter`,
`Avatar`/`AvatarGroup`, `ToggleButton`) are named with their API "left to live documentation"
(`patterns.md:7-15`).

### 2.1 `SKILL.md` itself — the decided numbers, quoted

The pass above tabulated `references/patterns.md` only. `SKILL.md` carries numbers of its own that
appear in neither `patterns.md` nor `tokens.css`. They are quoted below as written, with the line
they come from. **Whether each has a `FACT-` key is recorded per block**; the unkeyed ones are
collected again under Open questions, because a sentence in a skill is not corpus evidence
(`ADR-0021`) — the skill is not one of the four corpus documents.

**2.1.1 Colour — the measured table and the gamut sentence.**

The table itself is `SKILL.md:28-39` (ten rows: `--accent`, `--accent` as text, `--background`,
`--muted` twice, and the five `--category-*` inks with their tints and ratios). Its values are keyed
in the ADR for `--accent` (`FACT-3549`), `--background`/`--muted` (`FACT-3550`) and the tint range
"between 5.36:1 and 6.93:1" (`FACT-3551`); the per-token hex/OKLCH pairs are restated only in the
skill and in `tokens.css`.

Under "Traps this repository has actually hit", `SKILL.md:156-158` says, verbatim:

> **A colour that looks right can be outside sRGB.** `oklch(0.50 0.195 253.83)` — the current
> `--accent` from `FX-039` — clips on conversion, so the rendered colour is not the declared one.
> Every value in the table above was checked in-gamut.

That names the value live in the tree now: `apps/web/src/app/globals.css:36` declares
`--accent: oklch(50% 0.195 253.83);`, under a comment block at `globals.css:30-34` explaining it as
`FX-039`'s darkening of HeroUI's `oklch(62.04% .195 253.83)` "until `ACC-FN-01` passes; the hue and
chroma are the library's". `FX-039` in the ledger (`docs/CHANGELOG.md:110`) describes the same fix
and makes no gamut claim.

- The gamut sentence is **unkeyed**. Searched `docs/adr/ADR-0026-design-language.md` and the four
  corpus documents for `gamut`, `sRGB`, `clip` and `253.83`: the only hits are
  `docs/CHANGELOG.md:110` (`FX-039`, the value, no gamut claim) and `apps/web/src/app/globals.css:30`.
  No `FACT-` states that the current `--accent` clips, and no `FACT-` states that the `ADR-0026`
  values were checked in-gamut. `FACT-3558` (`ADR-0026:101-104`) keys only that "Every contrast
  number in this record and in the skill is computed from the OKLCH values" — a statement about
  contrast, not about gamut.
- **Not decided here.** Which `--accent` value stands — `FACT-3549`'s `oklch(0.55 0.21 285)` or
  `globals.css:36`'s `oklch(50% 0.195 253.83)` — is a design question. Named, left open.

**2.1.2 The type scale** (`SKILL.md:63-70`), verbatim:

| Role                | Size / leading       | Weight | Utility                               |
| ------------------- | -------------------- | ------ | ------------------------------------- |
| Page title (`h1`)   | 24px / 1.25          | 700    | `text-2xl font-bold tracking-tight`   |
| Section (`h2`)      | 18px / 1.35          | 600    | `text-lg font-semibold`               |
| Card title (`h3`)   | 16px / 1.4           | 600    | `text-base font-semibold`             |
| Body                | 16px / 1.5           | 400    | `text-base`                           |
| Secondary, metadata | 14px / 1.5           | 400    | `text-sm text-muted`                  |
| Chip, eyebrow label | 12px / 1.4, `0.04em` | 600    | `text-xs font-semibold tracking-wide` |

and the three bullets under it (`SKILL.md:72-76`), verbatim:

> - **12px is the floor and it is for labels only.** `ui-ux-pro-max` calls body text under 12px an
>   anti-pattern; a chip or an uppercase eyebrow is not body text.
> - **Prose is capped at `max-w-[65ch]`.** Two of the existing components already carry a width cap
>   for exactly this reason, in `apps/web/src/app/auth/layout.tsx` and `apps/web/src/app/page.tsx`.
> - **Line height stays unitless** so a user's text-spacing override still reflows.

- `FACT-3553` (`ADR-0026:66-68`) keys the **family only**: "Type is one family, Plus Jakarta Sans,
  loaded through `next/font/google` and bound to `--font-sans`. There is no second family and no
  mono face until something needs one."
- **Not found:** any `FACT-` stating a size, a leading, a weight, a utility, the 12px floor, the
  `max-w-[65ch]` prose cap or the unitless-line-height rule — read `ADR-0026` in full (124 lines)
  and grepped `docs/*.md` and `docs/adr/*.md` for `text-2xl`, `text-lg font-semibold`, `font-bold`,
  `65ch`, `12px` and `line height`; no hit outside `docs/CHANGELOG.md`.
- Recorded because `docs/CHANGELOG.md:72` (`CH-029`) says in prose that "`ADR-0026` fixes the
  palette, **the type scale**, the radii, the elevation, the icon library and the page shell", while
  `ADR-0026`'s keyed facts fix the radii (`FACT-3552`), the elevation (`FACT-3555`), the icon
  library (`FACT-3554`) and the shell (`FACT-3556`) and state no type scale. A ledger entry carries
  no `FACT-` key. Named, not resolved.

**2.1.3 Spacing rungs and the touch-target floor** (`SKILL.md:90-93`), verbatim:

> Spacing is Tailwind's 4px step and only these rungs: **4, 8, 12, 16, 20, 24, 32, 40**
> (`gap-1`…`gap-10`). Card padding is `p-5` or `p-6`; the gap between cards is `gap-4`; the gap
> between page sections is `gap-8`. Adjacent interactive elements keep **at least 8px** between them
> and a touch target is at least **44×44px** — both are `ui-ux-pro-max` critical rules.

- **Not found:** any `FACT-` stating a spacing rung, a card padding, a section gap, the 8px
  separation or the 44×44px target — read `ADR-0026` in full and grepped `docs/*.md`,
  `docs/adr/*.md` for `spacing`, `gap-`, `p-5`, `touch target` and `44`; every `44` hit is an
  unrelated key (`FACT-0044`, `FACT-1044`, `FACT-2044`, `FACT-3044`, `FACT-3144`, `FACT-3244`,
  `FACT-3344`, `FACT-3444`…`FACT-3447`). The radius scale printed beside it **is** keyed —
  `FACT-3552` (`ADR-0026:62-65`).

**2.1.4 Elevation** (`SKILL.md:99-103`), verbatim:

> - A raised surface: `bg-surface shadow-surface rounded-2xl`.
> - A quiet surface: `bg-surface border border-border rounded-2xl`.
> - **Never both.** A bordered card that also casts a shadow is the single most common way this
>   language goes blurry.
> - `shadow-overlay` belongs to popovers, menus, modals and tooltips. Nothing on the page uses it.
> - Depth otherwise comes from the lightness step: the canvas is `#F4F4F7`, a card is white. That is
>   why `--background` is not pure white.

- **Keyed.** `FACT-3555` (`ADR-0026:72-74`): "Elevation has one raised level — `shadow-surface` on
  `bg-surface`. A container is either bordered or raised, never both, and `shadow-overlay` belongs
  to overlays only." The lightness-step sentence is carried by `FACT-3550` (`ADR-0026:53-57`):
  "cards keep HeroUI's white `--surface`, so a raised surface reads as a lightness step rather than
  as a shadow."
- Unkeyed in the ADR: the exact utility strings (`rounded-2xl` on both lines,
  `border border-border`) and the enumeration "popovers, menus, modals and tooltips".

**2.1.5 Icons** (`SKILL.md:108-122`) — the lead line, a fenced `tsx` example and four bullets,
verbatim:

> **Phosphor** (`@phosphor-icons/react`) at `weight="regular"` — the library `ui-ux-pro-max` names
> primary, with Heroicons as its fallback. One family per surface; never mix.
>
> `<House size={20} weight="regular" aria-hidden="true" />` with the trailing comment
> "beside visible text", and
> `<Button aria-label="Notifications"><Bell size={20} /></Button>` with the trailing comment
> "icon-only control" (`SKILL.md:112-115`).
>
> - 20px inside navigation items, list rows and buttons; 24px in page headers.
> - Decorative icon beside text → `aria-hidden="true"`. Icon-only control → an accessible name on
>   the **control**, which is what the functional cases address it by.
> - **No emoji as icons.** That is a named anti-pattern and an `axe`-invisible one.
> - The dependency is not installed yet (`BL-031`). Until it is, a surface ships without icons
>   rather than with inline SVG pasted per component.

- **Keyed.** `FACT-3554` (`ADR-0026:69-71`) carries the library, the weight, both sizes, the
  `aria-hidden` rule and the accessible-name rule. `FACT-3547` (`ADR-0026:33-36`) keys Phosphor
  primary / Heroicons fallback and "one visual family per surface" as what the `ui-ux-pro-max` set
  requires. `FACT-3560` (`ADR-0026:110-113`) keys the dependency as not yet taken and the work as
  `BL-031`.
- **Not found:** any `FACT-` for "No emoji as icons", or for the interim instruction "a surface
  ships without icons rather than with inline SVG pasted per component" — read `ADR-0026` in full
  and grepped `docs/*.md`, `docs/adr/*.md` for `emoji`; zero hits.

**2.1.6 Motion** (`SKILL.md:126-130`), verbatim:

> 150–200ms, `ease-out`, and only on colour, opacity and transform. Animating `width` or `height`
> causes layout work per frame. Every animated surface honours `prefers-reduced-motion: reduce` — it
> is the last line of the `ui-ux-pro-max` pre-delivery checklist and the one most often skipped.
>
> HeroUI ships the curves: `ease-out-fluid`, `ease-out-cubic`, `ease-out-quart`.

- **Not found:** any `FACT-` about motion, duration, easing or `prefers-reduced-motion` — read
  `ADR-0026` in full (no occurrence of `motion`, `ease` or a duration) and grepped `docs/*.md`,
  `docs/adr/*.md` for `ease-out` and `reduced-motion`; zero hits. `ADR-0025`'s accessibility facts
  (`FACT-3534`–`FACT-3538`) name the `axe-core` tag set and the `h1`/`main` assertions and say
  nothing about motion.

**2.1.7 "Where this language stops: the invariants outrank it"** (`SKILL.md:136-144`), row by row as
written. Its preamble, `SKILL.md:134`: "None of the following bends for a visual reason. All of them
have already been broken once."

| Want                                                      | Not allowed, because                                                                 | What that cites                           |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------- |
| HeroUI's `Form`, `isRequired`, `type="email"`, `validate` | Invariant 15: the browser then refuses the submission and the Nest branch never runs | `CLAUDE.md` invariant 15; cf. `FACT-3514` |
| `ListBox` for a prettier list                             | `FACT-3512`: it renders `listbox`/`option`, a different contract from `HD-FN-04`     | `FACT-3512`, `HD-FN-04`                   |
| `onPress` on a submit control                             | `FACT-3511`: it forces `'use client'` and breaks the no-JS Server Action path        | `FACT-3511`                               |
| A dark mode toggle                                        | `FACT-3513`: the theme is pinned to light, like dates are pinned to UTC              | `FACT-3513`                               |
| Splitting `Meetings total: 5` across elements for styling | `HD-FN-03` matches it as one text node                                               | `HD-FN-03`                                |
| A second `h1`, or none                                    | `ACC-FN-04` asserts exactly one, because `axe` does not                              | `ACC-FN-04`, `FACT-3537`                  |
| Passing the token into a client component to style it     | Invariant 19: it would travel in the RSC stream                                      | `CLAUDE.md` invariant 19                  |

Row 5 is the single-text-node constraint on `Meetings total: 5`, stated here as a rule of the design
language. Elsewhere this sweep raises it only from a component comment and from `FACT-1013` /
`HD-FN-03` (§4).

### 2.2 The type scale beside the headings in the tree today

Both sides as written, one citation each. No comparison is drawn.

| File:line                                                                  | `className` on that line, as written             | Row of the `SKILL.md:63-70` table whose Role names that element | Utility that row gives              |
| -------------------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------- | ----------------------------------- |
| `apps/web/src/app/page.tsx:39` — `<h1>Hello, {user.email}</h1>`            | `truncate text-2xl font-semibold tracking-tight` | Page title (`h1`) — 24px / 1.25, weight 700 (`SKILL.md:65`)     | `text-2xl font-bold tracking-tight` |
| `apps/web/src/app/auth/login/page.tsx:21` — `<h1>Sign in</h1>`             | `text-2xl font-semibold tracking-tight`          | Page title (`h1`) — 24px / 1.25, weight 700 (`SKILL.md:65`)     | `text-2xl font-bold tracking-tight` |
| `apps/web/src/app/auth/register/page.tsx:18` — `<h1>Sign up</h1>`          | `text-2xl font-semibold tracking-tight`          | Page title (`h1`) — 24px / 1.25, weight 700 (`SKILL.md:65`)     | `text-2xl font-bold tracking-tight` |
| `apps/web/src/components/meeting-list.tsx:31` — `<h2>Recent meetings</h2>` | `text-base font-semibold tracking-tight`         | Section (`h2`) — 18px / 1.35, weight 600 (`SKILL.md:66`)        | `text-lg font-semibold`             |

Neither column is keyed with respect to the corpus: the left is code, the right is `SKILL.md` prose,
and per 2.1.2 no `FACT-` states a type-scale value.

## 3. Constraints that bound presentation

**`ADR-0023`** (status `accepted`, 2026-10-01) — HeroUI v3 replaces CSS Modules:

- `FACT-3509` — no `*.module.css` remains; `globals.css` holds `@import 'tailwindcss'` then
  `@import '@heroui/styles'`, that order.
- `FACT-3510` — `<form>` stays native wherever a Server Action is bound; HeroUI supplies only the
  controls inside.
- `FACT-3511` — a submit control is `<Button type="submit">`, never `onPress`.
- `FACT-3512` — lists stay `ul`/`li`; `ListBox` is not used (`role="listbox"`/`option` is a
  different contract from `HD-FN-04`/`HD-FN-05`).
- `FACT-3513` — the theme is pinned to light on `<html>` (`class="light"`, `data-theme="light"`),
  not `prefers-color-scheme`.
- `FACT-3514` — invariant 15 outranks HeroUI's documented form patterns (`isRequired`,
  `type="email"`, client-side `validate`): none is used.
- `FACT-3515` — the HeroUI migration changed no test: all 28 functional cases passed unmodified.
- `FACT-3516` — `apps/web` carries six new runtime dependencies from that migration, watched by
  `pnpm audit --audit-level high` inside `pnpm verify`.
- `FACT-3517` — class names are utility classes, not hashed module names; tests still address by
  role, label, text only.
- Rejected, by name: keeping CSS Modules beside HeroUI; adopting HeroUI's `Form`/`FieldError`;
  `next-themes`; the upstream curl installer.

**`ADR-0025`** (status `accepted`, 2026-10-02) — accessibility checked by a scanner:

- `FACT-3534` — `e2e/accessibility/accessibility.functional.spec.ts` runs `axe-core` via
  `@axe-core/playwright` against every page, tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`.
- `FACT-3535` — it joins the `web` project by filename suffix and is part of `pnpm verify` by
  construction.
- `FACT-3536` — every page is listed in `AUDITED_PAGES` in the spec (confirmed at
  `e2e/accessibility/accessibility.functional.spec.ts:25-29`: `/auth/login`, `/auth/register`, `/`
  — three entries, no fourth page).
- `FACT-3537` — `ACC-FN-04` separately asserts no missing/duplicated `h1` and a `main` landmark
  present, since `axe-core` does not check either.
- `FACT-3538` — case prefix `ACC` is registered in `KNOWN_CASE_PREFIXES`.
- Rejected, by name: leaving a11y to reference + review only; running the scan outside
  `pnpm verify`; scanning at WCAG AAA; suppressing the first violation; a separate Playwright
  project for the scan.
- `FACT-3539`–`FACT-3541` (Consequences): one dev dependency added (~4s to `pnpm e2e`); `axe-core`
  judges no flow, only part of usability; an `axe-core`/`@axe-core/playwright` upgrade can turn a
  green run red with no repository change.

**`CLAUDE.md` invariants 9–15 and 19**, quoted as written:

- **9.** "The gate for unauthenticated visitors lives in `src/proxy.ts` — `middleware.ts` is
  deprecated in Next 16. The matcher is narrow, or the proxy fires on `_next/static` and breaks
  CSS; the bounce back is `GET`-only, or a POST Server Action gets a redirect instead of executing."
- **10.** "`proxy.ts` is an 'optimistic' check, not security… The real check is duplicated in
  `lib/dal.ts` and **inside every Server Action**."
- **11.** "`redirect()` is called strictly **outside** `try/catch`… The symptom is 'login does
  nothing but the cookie is set'."
- **12.** "A cookie's `secure` is `process.env.NODE_ENV === 'production'`, not an unconditional
  `true`."
- **13.** "A file with `'use server'` exports **only** async functions: types and constants go to
  `lib/types.ts` and `lib/session-cookie.ts`."
- **14.** "`import 'server-only'` **does not resolve under Vitest**. Keep everything testable in
  modules without it (`api-client.ts`, `session-cookie.ts`, `format-date.ts`); `session.ts` and
  `dal.ts` have it and therefore have no units."
- **15.** "Form fields carry no `required`, and email is `type="text"`… The password is **never
  trimmed**… **HeroUI's own form documentation breaks this rule in three places** — `isRequired`,
  `type="email"` and a client-side `validate` on `TextField`… The form carries `noValidate`;
  validation lives in Nest and surfaces through `useActionState`."
- **19.** "The token is never passed as a prop into a client component: it would travel in the RSC
  stream and become available to any script on the page."

**`heroui-react` adapter** — what it says HeroUI's own documentation gets wrong here
(`.claude/skills/heroui-react/SKILL.md:51-62`): "Its form examples violate invariant 15 directly.
The `Form` and `TextField` docs show `isRequired`, `type='email'` and a client-side `validate` on
the same field… so the Server Action never runs, the Nest validation branch never runs, and
`AL-FN-05`/`AL-FN-14` end up testing the library instead of our code." It also names model recall of
HeroUI as v2-shaped ("`HeroUIProvider`, `framer-motion`, flat component names and
`color="primary"` are all v2" — `SKILL.md:28-29`, repeated in `design-system/SKILL.md:154-155`).

## 4. The data contract the UI renders against

**`Meeting` entity** (`docs/data-model.md`, source as the corpus states it:
`apps/api/src/meetings/meetings.types.ts` — the file on disk is `meeting.types.ts`, which is
contradiction C-1 in §7):
`FACT-1005` `id`, `FACT-1006` `ownerId` (never leaves — stripped by `toMeetingDto`), `FACT-1007`
`title` (3–100 chars), `FACT-1008` `startsAt` (ISO 8601 UTC string, always `…Z`), `FACT-1009`
`durationMinutes` (integer 15–480), `FACT-1010` `participants` (`string[]`, 0–20 entries, 1–100
chars each). `FACT-1011` `MeetingDto = Omit<Meeting, 'ownerId'>`. No sixth field anywhere in this
table.

- `FACT-1012` `MeetingsPageDto = { items: MeetingDto[], total: number }`.
- `FACT-1013` `total` is the owner's full record count, never `items.length` — invariant 4,
  confirmed again at `HD-FN-03` ("the number read from the page equals the API `total`, which is 5
  and differs from `items.length`" — `e2e/regression/home-dashboard/home-dashboard.functional.cases.md`).
- `FACT-2063`/`FACT-1011` — `GET /meetings/:id` returns exactly five keys sorted alphabetically:
  `durationMinutes`, `id`, `participants`, `startsAt`, `title`.
- `FACT-1018` timestamps are ISO 8601 UTC, milliseconds included, no local time anywhere.
- `FACT-1019` display dates are formatted with `Intl.DateTimeFormat('en-GB', …, { timeZone: 'UTC'
})`, pinned — matched in code by `formatMeetingDateTime` in
  `apps/web/src/lib/format-date.ts`, cited in `patterns.md:213-215`.
- Error-body shapes, invariant 8 / `FACT-2017`: `message` is an **array** on `400`
  (`FACT-2012`/`FACT-2013`), a **string** on `401` (`FACT-2014`/`FACT-2015`) and on `404`
  (`FACT-2016`).

**Is there a field anywhere in the contract or data model a category chip could label?**

Searched `docs/api-contract.md` (all 6 routes, all request/response shapes, `FACT-2000`–`FACT-2079`)
and `docs/data-model.md` (`User` `FACT-1000`–`1004`, `Meeting` `FACT-1005`–`1011`, response wrappers
`FACT-1012`–`1016`, value formats `FACT-1017`–`1024`) line by line for any field resembling a
category, course, subject, tag or type. None exists. Cross-checked against the web-side mirror,
`apps/web/src/lib/types.ts:15-22` (`Meeting` interface: `id`, `title`, `startsAt`,
`durationMinutes`, `participants` — same five keys, no sixth).

- **Not found:** a field in the API contract or the data model that a category chip could label —
  searched `docs/api-contract.md` (Routes table, all six endpoint sections, `MeetingDto`/
  `MeetingsPageDto` shapes) and `docs/data-model.md` (`Meeting` entity table, response wrappers,
  value formats table) for `category`/`subject`/`tag`/`type`/`course`; none of the keyed facts
  names such a field. The pattern's own markup instead hard-codes an example string
  (`"UI/UX Design"`, `patterns.md:139,159`) rather than naming a data source for it.

### What asserts the current `Meeting` key set

A category chip is one of the prescribed patterns (`patterns.md:137-141`) and no field in the data
carries a category (the "Not found" above). What is recorded here is only **what already asserts the
five-key shape** — the places a sixth field would have to travel through. Evidence, with no estimate
of cost and no position on whether a field should be added.

**`docs/data-model.md` — the entity and the DTO.**

- Section header, `docs/data-model.md:37`: "**Source:** `apps/api/src/meetings/meetings.types.ts`;
  the key set is asserted by `HD-API-01`." (On that path, see the contradiction in §7.)
- `FACT-1005` `id` (`:41`), `FACT-1006` `ownerId` — "**never** — `toMeetingDto` strips it" (`:42`),
  `FACT-1007` `title` (`:43`), `FACT-1008` `startsAt` (`:44`), `FACT-1009` `durationMinutes`
  (`:45`), `FACT-1010` `participants` (`:46`). The table's last column is "Leaves the server".
- `FACT-1011` (`docs/data-model.md:48`): "`MeetingDto = Omit<Meeting, 'ownerId'>`."
- `FACT-1012` (`docs/data-model.md:58-59`): "`MeetingsPageDto` = `{ items: MeetingDto[], total:
number }`."

**`docs/api-contract.md` — the request and response bodies.**

- `GET /meetings` — `FACT-2038` (`docs/api-contract.md:124-125`): "Body: `{ items: MeetingDto[],
total: number }`; each item carries the same five keys `GET /meetings/:id` returns, `participants`
  included. — `HD-API-01`, `FACT-1012`". Also `FACT-2035` (`limit?`, `:119`), `FACT-2039` (sort
  order, `:126-128`), `FACT-2040` (`total` is `countByOwner`, `:129-130`).
- `GET /meetings/:id` — `FACT-2063` (`docs/api-contract.md:198-199`): "Body on `200`: a
  `MeetingDto`, exactly five keys sorted `durationMinutes`, `id`, `participants`, `startsAt`,
  `title`. — `MD-API-01`, `FACT-1011`".
- `POST /meetings` request and its DTO validation — `FACT-2043` (`:144-145`): "Request:
  `{ title, startsAt, durationMinutes?, participants? }`"; the per-field rules are a keyed table at
  `docs/api-contract.md:151-154` — `FACT-2044` `title` "string, 3–100 characters", `FACT-2045`
  `startsAt` "ISO 8601", `FACT-2046` `durationMinutes` "optional integer 15–480; the service
  defaults it to 60", `FACT-2047` `participants` "optional array of strings, at most 20 entries,
  each 1–100 characters; the service defaults it to `[]`". `FACT-2048` (`:156-157`): "There is no
  `ownerId` field, and `forbidNonWhitelisted` rejects an attempt to send one with `400 property
ownerId should not exist`." `FACT-2049` and `FACT-2050` (`:158-161`) carry the two mandatory
  `@IsOptional()`s (invariant 2).
- `FACT-2042` (`:142-143`): `POST /meetings` "Answers `201` — POST's default — and there is no
  `@HttpCode` on this handler."

**The Nest files that carry the shape.**

- `apps/api/src/meetings/meeting.types.ts:5-17` — `interface Meeting` with `id`, `ownerId`, `title`,
  `startsAt`, `durationMinutes`, `participants`; `:23` — `export type MeetingDto = Omit<Meeting,
'ownerId'>;`; `:26-33` — `interface MeetingsPageDto { items; total }` with the comment "Invariant
  4: the owner's whole list, not `items.length`. The classic mistake here, covered at three levels:
  `HD-UT-03`, `HD-API-05`, `HD-FN-03`." `:40-45` — `interface CreateMeetingInput`.
- `apps/api/src/meetings/meetings.mapper.ts:11-19` — `toMeetingDto` lists the five outgoing fields
  explicitly. Its header comment, `:3-9`: "Fields are listed explicitly rather than removed by rest
  destructuring, so a new internal field on `Meeting` cannot leak on its own; `HD-API-01` checks the
  resulting key set." and "No `meetings.mapper.spec.ts` on purpose: … a spec missing from
  `*.unit.cases.md` would fail the meta-test (rule 8)."
- `apps/api/src/meetings/dto/create-meeting.dto.ts:25-51` — `CreateMeetingDto` with
  `@IsString() @Length(3, 100) title`, `@IsISO8601() startsAt`,
  `@IsOptional() @Type(() => Number) @IsInt() @Min(15) @Max(480) durationMinutes?`, and
  `@IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @Length(1, 100, { each:
true }) participants?`. Its doc comment, `:17-23`, names `forbidNonWhitelisted` and invariant 2.

**The suite assertion.**

- `e2e/regression/home-dashboard/home-dashboard.api.spec.ts:51`:
  `const MEETING_KEYS = ['durationMinutes', 'id', 'participants', 'startsAt', 'title'];`
- `HD-API-01` (spec `:83`), assertion at `:100`:
  `expect(Object.keys(item).sort()).toEqual(MEETING_KEYS);`, preceded by the comment at `:99`
  "The full key set rather than 'has an id': this also catches an `ownerId` leak", and followed at
  `:101` by `expect(item).not.toHaveProperty('ownerId');`.
- The paired case text, `e2e/regression/home-dashboard/home-dashboard.api.cases.md:47-50`: "200,
  JSON content type, `items` an array and `total` a number. Every item has **exactly** the keys
  `durationMinutes`, `id`, `participants`, `startsAt`, `title` — the full key set rather than 'has
  an id', so an `ownerId` leak is caught too."
- The same constant is asserted twice more: `home-dashboard.api.spec.ts:424` inside `HD-API-20`
  (`:405`, `POST /meetings` response), and
  `e2e/regression/meetings-detail/meetings-detail.api.spec.ts:97` (`MD-API-01`), against its own
  copy of the constant at `:44`.
- `FACT-2063`/`FACT-1011`'s "exactly five keys sorted alphabetically" is the contract-document side
  of the same assertion (quoted above); `FACT-2038` binds `GET /meetings` items to the same five.

## 5. Does the corpus promise anything about the visual surface outside `ADR-0026`?

Searched `docs/architecture.md`, `docs/data-model.md`, `docs/api-contract.md`, `docs/security.md`
and the ADR log (`docs/adr/README.md`) for any `FACT-` about page structure, headings, landmarks,
the shell, fonts, icons or colour.

- `docs/architecture.md` `FACT-0052` — "Component library + utility CSS … HeroUI v3 on Tailwind v4
  in `apps/web`" (`ADR-0023`) is the one architecture-level fact naming the styling approach; it
  names no colour, font or icon value.
- `docs/architecture.md` `FACT-0053`/`FACT-0054` — patterns refused: HeroUI's `Form`/`FieldError`,
  and `ListBox` for the meeting list. Both are markup-shape constraints, not visual ones.
- `docs/data-model.md` and `docs/api-contract.md` carry no `FACT-` about headings, landmarks, the
  shell, fonts, icons or colour — those documents own entities and endpoints, not presentation
  (`FACT-0001`–`FACT-0006`, the corpus ownership table in `architecture.md`).
- `docs/security.md` carries no `FACT-` keys at all (it is prose with no keyed-fact block in this
  file as read in full) and names nothing about the visual surface.
- The ADR log: no ADR besides `ADR-0023` and `ADR-0026` touches `apps/web` presentation. `ADR-0025`
  touches accessibility assertions (landmarks, headings) as a **check**, not as a promise about
  what the markup must look like beyond "exactly one `h1`" and "a `main` landmark exists"
  (`FACT-3537`).

So outside `ADR-0026` and `ADR-0023`, the only corpus promises touching the visual surface are the
accessibility floor in `ADR-0025` (`FACT-3534`, `FACT-3536`, `FACT-3537`) and the markup-shape
constraints in `FACT-0053`/`FACT-0054`.

## 6. Fact lifecycle — what would go stale

Under `ADR-0021`/`ADR-0022`, the following existing facts describe the pre-change state and would
no longer match the tree once the described rollout lands. Per the brief: **named, not retired or
edited** — retirement is a later stage's act.

- `FACT-3542` ("`globals.css` holds the two imports, the app-shell rules and exactly one
  project-owned value — the `--accent` override") — describes `globals.css` as it is **today**,
  before the token block from `tokens.css` is added.
- `apps/web/src/app/layout.tsx:2,5-13,33` uses `Geist`/`Geist_Mono` via `next/font/google` and
  `geistSans.variable`/`geistMono.variable` on `<html>` — not itself a `FACT-`-keyed statement in
  the corpus (it is code, not the architecture document), but it is the concrete state `FACT-3553`
  ("Type is one family, Plus Jakarta Sans… There is no second family and no mono face") commits the
  change to replacing.
- `FACT-3544`/`BL-032` ("`text-foreground-500` … `border-default-200` … compile to no CSS … seven
  and two occurrences … live in `apps/web` right now") describes a defect the rollout is stated to
  fold in and fix; once fixed, the occurrence counts in this fact no longer hold.
- `FACT-3560` ("the language needs Plus Jakarta Sans through `next/font`, `@phosphor-icons/react`
  as a new runtime dependency … and a rework of the four existing pages. That work is `BL-031`, not
  this record.") — states the work as **not yet done**; once the rollout lands, the backlog item
  this fact points at changes status.
- `docs/BACKLOG.md` rows for `BL-031` and `BL-032` themselves describe open backlog items
  (`docs/BACKLOG.md:29-30`) that the change is expected to close.

No fact anywhere asserts a _value_ that the change would contradict (e.g. no fact says "the accent
is HeroUI's default" — `FACT-3549` already asserts the overridden value as current). The staleness
is entirely about the **absence** this change fills: facts describing `globals.css`/`layout.tsx` as
not yet carrying the language, and `BL-031`/`BL-032` as open.

## 7. Contradictions — named, not resolved

Each is two sources that disagree, both quoted with their citation. Deciding which side is right —
and whether it is a defect or a decision — is not this stage's act.

**C-1 — The corpus names a `Meeting` source file that is not on disk.**

- Corpus side: `docs/data-model.md:37` — "**Source:** `apps/api/src/meetings/meetings.types.ts`;
  the key set is asserted by `HD-API-01`." The same path (plural `meetings.types.ts`) is repeated at
  `docs/data-model.md:48` (`FACT-1011`'s source), `:56` and `:59` (`FACT-1012`'s source), and in
  `docs/adr/ADR-0017-meeting-participants-strings.md:56` and
  `docs/adr/ADR-0021-corpus-facts-are-keyed.md:30`.
- Tree side: the file on disk is `apps/api/src/meetings/meeting.types.ts` (singular). `ls
apps/api/src/meetings` lists `dto`, `meeting.types.ts`, `meetings.controller.ts`,
  `meetings.mapper.ts`, `meetings.module.ts`, `meetings.seed.ts`, `meetings.service.spec.ts`,
  `meetings.service.ts` — no `meetings.types.ts`. `apps/api/src/meetings/meetings.mapper.ts:1`
  reads `import type { Meeting, MeetingDto } from './meeting.types.js';`.
- Earlier in this file, §4 repeated the corpus spelling (`contract.md` §4, "`Meeting` entity"); that
  sentence is the corpus's path, not a verified one.
- Nothing mechanical resolves it: `AR-API-11`…`AR-API-14` check key uniqueness, placement, that a
  keyed fact names a source, and that `FACT-` references resolve — not that a named source path
  exists.

**C-2 — Three different `ui-ux-pro-max` profile names stand behind the same font decision.**

- `FACT-3546` (`docs/adr/ADR-0026-design-language.md:28-32`): "The `ui-ux-pro-max` set profiles this
  product as an LMS — primary style 'Flat Design + Accessible & Ethical', dashboard style
  'Education Analytics Dashboard' — and both of its font pairings for that mood are single-family
  Plus Jakarta Sans. — `.agents/skills/ui-ux-pro-max/data/products.csv`, `data/typography.csv`,
  queried through `scripts/search.py`".
- `.claude/skills/design-system/SKILL.md:59-61`: "**One family: Plus Jakarta Sans**, through
  `next/font/google`, bound to `--font-sans`. It is the pairing `ui-ux-pro-max` returns for this
  product's mood twice over ('Enterprise SaaS', 'Friendly SaaS'), both single-family."
- `docs/CHANGELOG.md:38` (`FT-005`): "the set's `--design-system` query returns **Minimalism &
  Swiss** for a dashboard, so: hierarchy, whitespace, one accent, nothing decorative."
- Of the three, only the first carries a `FACT-` key (`FACT-3546`). `SKILL.md` prose carries no keys
  (§2 of this file); a ledger entry carries no keys.
- All three are already cited in this research; the disagreement between "LMS / Flat Design +
  Accessible & Ethical / Education Analytics Dashboard", "Enterprise SaaS / Friendly SaaS" and
  "Minimalism & Swiss" is named here and nowhere else in the corpus.

## Probe — `@phosphor-icons/react`

All commands run in the scratchpad project
`C:\Users\User\AppData\Local\Temp\claude\C--GIT-PurpleSchool\301e87d3-6eec-428c-b0f0-e74f71e9e575\scratchpad\phosphor-probe`,
never in the repository tree.

**1. Already present in the repo?**

```
$ grep -rn "@phosphor-icons" C:\GIT\PurpleSchool\package.json C:\GIT\PurpleSchool\apps\web\package.json C:\GIT\PurpleSchool\apps\api\package.json C:\GIT\PurpleSchool\pnpm-lock.yaml
(no output)
```

→ Fact: not present in any `package.json` in the monorepo nor in `pnpm-lock.yaml`. Confirmed again
by reading `apps/web/package.json` in full: the `"dependencies"` block spans
`apps/web/package.json:15-25` and holds **nine** runtime dependencies at `:16-24` —
`@heroui/react` (`^3.2.6`), `@heroui/styles` (`^3.2.6`), `@tailwindcss/postcss` (`^4.3.3`), `next`
(`16.3.6`), `postcss` (`^8.5.28`), `react` (`19.2.8`), `react-dom` (`19.2.8`), `tailwind-variants`
(`^3.3.1`), `tailwindcss` (`^4.3.3`) — none of them `@phosphor-icons/react`. (An earlier draft of
this file said 8; the count is nine.)

**2. Registry version, peer range, unpacked size:**

```
$ npm view @phosphor-icons/react version peerDependencies dist.unpackedSize
version = '2.1.10'
peerDependencies = { react: '>= 16.8', 'react-dom': '>= 16.8' }
dist.unpackedSize = 33027417
```

→ Fact: registry offers `2.1.10`; peer range is `>= 16.8` for both `react` and `react-dom`, with no
upper bound, so it is satisfied by the repo's pinned `react@19.2.8` / `react-dom@19.2.8`
(`apps/web/package.json:21-22`). Published unpacked size is 33,027,417 bytes (~31.5 MiB).

**3. Installed size in a scratchpad project:**

```
$ cat package.json
{"name":"phosphor-probe","version":"0.0.0","private":true,"dependencies":{"@phosphor-icons/react":"^2.1.10","react":"19.2.8","react-dom":"19.2.8"}}
$ npm install
added 4 packages, and audited 5 packages in 18s
found 0 vulnerabilities
$ node -e "… recursive size of node_modules/@phosphor-icons …"
31.50 MB
$ node -e "… recursive size of node_modules …"
38.72 MB total node_modules
$ ls node_modules
@phosphor-icons  react  react-dom  scheduler
$ du -sh node_modules/@phosphor-icons node_modules
47M     node_modules/@phosphor-icons
54M     node_modules
```

→ Fact: installing `@phosphor-icons/react@^2.1.10` against the repo's exact React 19.2.8 pin adds
exactly one new package tree (`@phosphor-icons` + `scheduler`, since `react`/`react-dom` were
already pinned) — byte-exact recursive size 31.50 MB for `@phosphor-icons` alone / 38.72 MB for the
whole scratchpad `node_modules`; `du`'s disk-block accounting on the same tree reports 47M / 54M
(the gap is allocation-unit rounding on Windows, not a different file set — `ls node_modules`
lists the same four packages either way).

**4. `pnpm audit --audit-level high` / `npm audit --audit-level high` in the scratchpad:**

```
$ npm audit --audit-level high
found 0 vulnerabilities
EXIT:0
```

→ Fact: clean at the time of this probe (2026-10-02), in the isolated scratchpad project, against
`@phosphor-icons/react@2.1.10` + its resolved transitive tree. This is not a claim about the
repository's own `pnpm audit --audit-level high`, which pools the whole dependency graph and was not
run as part of this probe (the brief forbids running `pnpm verify`/`pnpm e2e`, and this check did
not touch the repo tree).

**5. Repository tree verification — no install happened inside the repo:**

```
$ cd /c/GIT/PurpleSchool && git status --short
?? docs/plans/design-language-rollout/
```

→ Fact: the only untracked path is the pre-existing change folder itself (present before this
sweep started, per the git-status context given at the start of the task); nothing under
`apps/web` or the repo root was touched by the probe.

## Open questions

- Whether the five category-tint OKLCH pairs restated in `design-system/SKILL.md`'s table exactly
  match `references/tokens.css`'s declarations was checked by direct comparison in this sweep (they
  do, per §2) — recorded as a comparison performed, not left open, but noted here because the ADR
  body (`FACT-3551`) does not itself restate the per-token hex/OKLCH values, only `tokens.css` does.
- Whether `pnpm audit --audit-level high` stays clean for the **whole** repository once
  `@phosphor-icons/react` is added to `apps/web/package.json` and `pnpm-lock.yaml` is regenerated
  was not tested — only the isolated scratchpad dependency tree was audited, per the brief's
  constraint against running installs or audits inside the repo tree.
- **Not found:** any `FACT-` key in `docs/security.md` — the whole file was read and carries no
  keyed statements, only prose; searched for `` `FACT- `` in the file text, no match.
- **The corpus reasons a design language and states no fact for part of it.** The following values
  are decided in `.claude/skills/design-system/SKILL.md` and carry **no `FACT-` key anywhere**, so
  under `ADR-0021` they are not corpus evidence and cannot be relied on as fact — including across
  sessions. Each was searched for in `ADR-0026` (read in full) and across `docs/*.md` and
  `docs/adr/*.md`:
  - the whole type scale — six rows of size, leading, weight and utility (`SKILL.md:63-70`), plus
    the 12px label floor, the `max-w-[65ch]` prose cap and the unitless-line-height rule
    (`SKILL.md:72-76`). `FACT-3553` keys the family and nothing else.
  - the spacing rungs 4/8/12/16/20/24/32/40, the `p-5`/`p-6` card padding, `gap-4` between cards,
    `gap-8` between sections, the 8px separation and the 44×44px touch target (`SKILL.md:90-93`).
  - motion in full — 150–200ms, `ease-out`, colour/opacity/transform only,
    `prefers-reduced-motion: reduce`, and the three HeroUI curves (`SKILL.md:126-130`).
  - "No emoji as icons" and the interim rule "a surface ships without icons rather than with inline
    SVG pasted per component" (`SKILL.md:120-122`). The rest of the icons section **is** keyed by
    `FACT-3554`/`FACT-3547`/`FACT-3560`.
  - the gamut sentence about the current `--accent` (`SKILL.md:156-158`, see 2.1.1).
  - the exact elevation utility strings (`SKILL.md:99-100`); the elevation **rules** are keyed by
    `FACT-3555`, and the lightness step by `FACT-3550`.
    Keyed by contrast, and verified against the ADR: the family `FACT-3553` (`ADR-0026:66-68`), the
    radius scale `FACT-3552` (`:62-65`), the shell `FACT-3556` (`:75-77`), elevation `FACT-3555`
    (`:72-74`), icon sizes and the icon library `FACT-3554` (`:69-71`).
- Which `--accent` value stands: `FACT-3549`'s `oklch(0.55 0.21 285)` or the `oklch(50% 0.195
253.83)` live at `apps/web/src/app/globals.css:36`, about which `SKILL.md:156-158` makes an
  unkeyed gamut claim (2.1.1). Not decided here.
- The two contradictions in §7 (`meetings.types.ts` vs `meeting.types.ts`; three `ui-ux-pro-max`
  profile names) are open by construction — both sides are recorded, neither is chosen.
- **Not found:** a `FACT-` behind `docs/CHANGELOG.md:72`'s claim that "`ADR-0026` fixes … the type
  scale" — the ADR's `FACT-3542`…`FACT-3561` were read line by line and none states one (2.1.2).
