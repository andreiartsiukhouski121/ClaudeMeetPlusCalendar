# History: design-language-rollout

Requirement: Apply `ADR-0026` design language to `apps/web`: tokens, Plus Jakarta Sans font, `@phosphor-icons/react` as dependency, and rework pages/components onto three-track shell and patterns. Scope: `apps/web`. This is `BL-031` with `BL-032` folded in.

---

## Already built

### FT-004 — HeroUI v3 adoption

Entry: `FT-004` (2026-10-01)

> `apps/web` moves from CSS Modules to HeroUI v3 on Tailwind v4 (`ADR-0023`, closes `BL-023`): all seven components, all five `*.module.css` deleted, `globals.css` reduced to the two imports and the app shell. The `<form>` stays native wherever a Server Action is bound — HeroUI's `Form` is React Aria and owns submission — so HeroUI supplies the controls inside it. HeroUI's own form examples violate invariant 15 (`isRequired`, `type="email"`, a client-side `validate`); none is used, or the browser blocks submission and the server branch never runs. Lists keep `ul`/`li` rather than `ListBox`, which renders a different accessibility contract

Commit: `38d86d4`

Files touched that this change would touch:

- `apps/web/package.json` (added HeroUI dependencies)
- `apps/web/postcss.config.mjs` (added PostCSS config for Tailwind v4)
- `apps/web/src/app/auth/layout.tsx`
- `apps/web/src/app/auth/login/login-form.tsx`
- `apps/web/src/app/globals.css`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/page.tsx`
- `apps/web/src/components/create-meeting-form.tsx`
- `apps/web/src/components/meeting-list.tsx`
- `apps/web/src/components/logout-button.tsx`
- All `*.module.css` files (deleted)

### FT-005 — UI rework against design language

Entry: `FT-005` (2026-10-02)

> The UI is reworked against what HeroUI ships and what `ui-ux-pro-max` recommends for this product type — the set's `--design-system` query returns **Minimalism & Swiss** for a dashboard, so: hierarchy, whitespace, one accent, nothing decorative. Its palette was **not** taken — a teal rebrand nobody asked for would also have undone `FX-039`. **Login:** the `h1` rendered at body size and weight, leaving the page title visually weaker than the field labels under it — a hierarchy inversion; it now carries its own scale, with a wordmark above the card and a one-line subtitle, and the "Sign up" link is finally distinguishable from the text around it. The card is `max-w-sm`: a login form is two short fields, and a wider box only stretches the inputs past the length of what goes in them (Typography / Line Length). **Dashboard:** the counter moves under the heading as one lockup instead of floating between the header and the columns where it belonged to neither; the grid becomes `2fr 1fr` rather than two equal halves, because the list is the subject and the form is three controls; meeting rows become `Card` with the duration as a `Chip` — the one scannable value in the row, previously buried in a run of "22 Jan 2026, 16:15 · 60 min"; the create form sits in a `Card` too, so it reads as the same kind of surface as the rows opposite instead of floating on the page background. **One HeroUI behaviour worth recording:** `card__content` sets `flex-direction: column` itself, so `justify-between` distributed along the wrong axis and the chip dropped onto its own line — `flex-row` is explicit for that reason. **Refused:** HeroUI's `Alert` for the error container, because `role="alert"` is what `HD-FN-06` addresses and the component does not visibly declare it — not worth the risk for a coloured box.

Commit: `3df3155`

Files touched:

- `apps/web/src/app/auth/layout.tsx`
- `apps/web/src/app/auth/login/login-form.tsx`
- `apps/web/src/app/auth/login/page.tsx`
- `apps/web/src/app/auth/register/page.tsx`
- `apps/web/src/app/page.tsx`
- `apps/web/src/components/create-meeting-form.tsx`
- `apps/web/src/components/meeting-list.tsx`
- `docs/CHANGELOG.md`

---

## Already broken here

### FX-039 — HeroUI default accent contrast below WCAG AA

Entry: `FX-039` (2026-10-02)

> HeroUI v3's default `--accent`, `oklch(62.04% .195 253.83)`, puts the library's own `--accent-foreground` on it at a contrast of **3.58:1** — below the 4.5:1 that WCAG AA requires for 14px text at normal weight. Every primary button in the application was affected: "Sign in" and "Create meeting". Nothing in this repository wrote that colour; it is the component library's shipped theme, which is the class of defect `ADR-0023` warned arrives without a diff to review. The fix is one token override in `apps/web/src/app/globals.css` — the hue and chroma stay the library's, the lightness drops to 50% — placed outside any `@layer` so it beats the layered default. Re-scanned to zero violations on both pages.

Found by: `ACC-FN-01`/`ACC-FN-02`, on the first run of the accessibility suite the same commit added (`ADR-0025`) — no human looked at the button and thought it was wrong, and no other check in the repository reads a colour

Commit: `5624a7a`

Changed: `apps/web/src/app/globals.css` (one token override for `--accent`)

---

## Deferred — backlog items overlapping this work

### BL-031 — Apply ADR-0026 design language to apps/web

Open | P2 | web

Full entry row:

| ID     | P   | Area | What                                                                                                                                                                                                                                                                               | Depends on                                                                                                                                                                                                                                         | Conflicts with                                                                                                                           |
| ------ | --- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| BL-031 | P2  | web  | Apply `ADR-0026` to `apps/web`: the token block from `.claude/skills/design-system/references/tokens.css` into `globals.css`, Plus Jakarta Sans through `next/font`, `@phosphor-icons/react` as a dependency, and the four existing pages reworked onto the shell and the patterns | the design language is decided and written down but applied nowhere; a feature with a plan, since it adds two dependencies and touches every page, and its acceptance is a green `pnpm verify` with the 28 functional cases unedited (`FACT-3559`) | **BL-032:** shares the dead class names; **BL-029:** both touch the form, and the per-field error shape is deliberately not part of this |

### BL-032 — Dead HeroUI v2 token names in apps/web

Open | P2 | web

Full entry row:

| ID     | P   | Area | What                                                                                                                                                                                                                                                                                                                 | Depends on                                                                                                                                                                                                                                                                         | Conflicts with                                                                                |
| ------ | --- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| BL-032 | P2  | web  | `text-foreground-500` (seven occurrences) and `border-default-200` (two) in `apps/web` compile to nothing — they are HeroUI v2 token names and v3 defines `--muted` and `--border` with no numeric scale, so secondary text renders at full foreground and the two borders fall back to `currentColor` (`FACT-3544`) | a defect, not a feature: a red check first, then the swap to `text-muted` / `border-border`, then an `FX-` entry. Found while writing `ADR-0026` by compiling the stylesheet through `@tailwindcss/postcss` and grepping the output — no case, no scan and no review had caught it | **BL-031:** the rework replaces the same class names; fix this first or fold it in and say so |

### Conflicts between BL-031/BL-032 and other open backlog items

**BL-031/BL-032 conflict explicitly with:**

- `BL-029`: Per-field form errors — both touch the form, but BL-029's per-field error shape is deliberately not part of BL-031 (`BACKLOG.md` line 32)
- `BL-032` states: "the rework replaces the same class names" as BL-031 needs to replace

**BL-031 touches pages that other open items also touch:**

- `BL-008` (Real sign-up): `/auth/register` is a placeholder in both FT-001 and checked by test `AL-FN-06`; BL-031 reworks all four pages including this one, so BL-031 will change the page's visual presentation
- `BL-009` (Timezone display): Tests `HD-UT-10`, `HD-UT-12` and `formatMeetingDateTime` depend on hard-pinned `timeZone: 'UTC'`; BL-031 touches `apps/web/src/app/page.tsx` (the dashboard) and tests will need verification

**BL-031 does not conflict with:**

- `BL-030` (PROTECTED_PAGES check): Does not add new pages; only adds a check
- `BL-023`: Already closed by FT-004
- `BL-024`, `BL-025`, etc.: No overlap with presentation layer

---

## Rejected section

Search of `docs/BACKLOG.md` Rejected section for design system, styling, fonts, themes, components, icons, accessibility:

| What                        | Why rejected |
| --------------------------- | ------------ |
| (no matching entries found) | —            |

No entries in the Rejected section match styling, design system, component library, icons, fonts, or themes.

---

## Decisions constraining the area

### ADR-0023 — HeroUI v3 replaces CSS Modules in apps/web

- **Status:** accepted
- **Date:** 2026-10-01
- **Supersedes:** —
- **Superseded by:** —

Key facts:

- `FACT-3509`: `apps/web` styles its components with HeroUI v3 and Tailwind v4 utilities. No `*.module.css` file remains; `globals.css` holds `@import 'tailwindcss'` followed by `@import '@heroui/styles'`.
- `FACT-3510`: The `<form>` element stays native wherever a Next.js Server Action is bound to it
- `FACT-3511`: A submit control is `<Button type="submit">` and never an `onPress` handler
- `FACT-3512`: Lists keep plain `ul`/`li`; HeroUI's `ListBox` is not used for them
- `FACT-3513`: The theme is pinned to light on `<html>` rather than following `prefers-color-scheme`

What holds this in place: invariant 15 in `CLAUDE.md`, the 28 functional cases, and audit of dependencies with `pnpm audit --audit-level high`

### ADR-0025 — Accessibility is checked by a scanner in the suite, not by reading a guideline

- **Status:** accepted
- **Date:** 2026-10-02
- **Supersedes:** —
- **Superseded by:** —

Key facts:

- `FACT-3534`: `e2e/accessibility/accessibility.functional.spec.ts` runs `axe-core` at WCAG 2.0/2.1 A and AA over every page, four cases `ACC-FN-01`…`ACC-FN-04`
- `FACT-3535`: It is part of `pnpm verify` by construction: the file ends in `*.functional.spec.ts`, so it joins the `web` project
- `FACT-3536`: Every page is listed in `AUDITED_PAGES`; adding a page means adding a line
- `FACT-3539`: One dev dependency, `@axe-core/playwright`, and roughly four seconds per `pnpm e2e` run

What holds this in place: the spec runs inside `pnpm e2e` and therefore inside `pnpm verify` and CI; `FX-039` proves the check found something on the day it was added

### ADR-0026 — One design language for apps/web, declared as tokens

- **Status:** accepted
- **Date:** 2026-10-02
- **Supersedes:** —
- **Superseded by:** —

Key facts:

- `FACT-3548`: The design language lives in `apps/web/src/app/globals.css` as custom properties that override HeroUI's defaults, plus one `@theme inline` block for tokens HeroUI has no equivalent for
- `FACT-3549`: The brand accent is `oklch(0.55 0.21 285)` (`#6B53E4`), measuring 5.15:1 against `--accent-foreground`
- `FACT-3550`: The page canvas is `oklch(0.969 0.004 286)` (`#F4F4F7`); secondary text `--muted` redefined to `oklch(0.52 0.014 286)` (5.05:1 on canvas, 5.53:1 on card)
- `FACT-3551`: Five category tints exist as project-owned tokens — violet, blue, pink, green, amber
- `FACT-3552`: `--radius` is `0.75rem`, moving HeroUI's whole derived scale at once
- `FACT-3553`: Type is one family, Plus Jakarta Sans, loaded through `next/font/google` and bound to `--font-sans`
- `FACT-3554`: Icons are Phosphor (`@phosphor-icons/react`) at `weight="regular"`, 20px inside rows and 24px in headers
- `FACT-3555`: Elevation has one raised level — `shadow-surface` on `bg-surface`
- `FACT-3556`: The application shell is a three-track grid — 16rem navigation rail, fluid main column, 20rem side rail — collapsing to one column below `lg` breakpoint
- `FACT-3557`: The language is written in `.claude/skills/design-system/`, a skill rather than an adapter
- `FACT-3559`: Restyling changes no accessible name. All 28 functional cases passed unmodified across the HeroUI migration
- `FACT-3560`: The language is not free to apply: it needs Plus Jakarta Sans through `next/font`, `@phosphor-icons/react` as a runtime dependency, and a rework of four existing pages. That work is `BL-031`.

What holds this in place: every contrast number is computed from OKLCH values and decided by `ACC-FN-01` (green `pnpm e2e:a11y` inside green `pnpm verify`); `FACT-3561` states that nothing mechanical catches a hard-coded colour — review against the skill is the only thing holding it.

---

## Recent changes

### Git history of files this requirement names

Files touched by FT-004 and/or FT-005 - the ten files `BL-031` names. Method: `git log --oneline -- <path>` (no `--follow`); re-checked with `--follow` on every file below and the output is identical in each case, so no rename crosses the window (`git log --oneline --follow -- <path>`).

**Correction on re-check (`FEAT-G1` finding 1):** `apps/web/src/app/layout.tsx` was listed below as last touched by `3df3155` (`FT-005`). `git show --stat 3df3155` does not name this file among its eight changed paths (it touches `auth/layout.tsx`, `auth/login/login-form.tsx`, `auth/login/page.tsx`, `auth/register/page.tsx`, `app/page.tsx`, `create-meeting-form.tsx`, `meeting-list.tsx`, `docs/CHANGELOG.md`), and `git log --oneline -- apps/web/src/app/layout.tsx` confirms its history stops at `38d86d4`. The FT-005 file list at lines 38-46 above was the correct side; the table row was wrong and is corrected below. `docs/CHANGELOG.md`'s `FT-005` row (line 38) describes the login and dashboard rework in prose and names no file list, so it neither confirms nor contradicts either side - no contradiction with the ledger to record.

**Also corrected while re-checking the method (not one of the two findings, found as a side effect of re-running the commands):** the counts for `apps/web/src/app/page.tsx` (table said 3, `git log` shows 5: `3df3155`, `38d86d4`, `39e9e0c`, `4bedc02`, `fe07cfe`), `apps/web/src/app/auth/login/page.tsx` (table said 2, `git log` shows 3: `3df3155`, `39e9e0c`, `7c4fc5b`), and `apps/web/src/components/create-meeting-form.tsx` (table said 3, `git log` shows 4: `3df3155`, `38d86d4`, `39e9e0c`, `4bedc02`) were wrong in the same way - undercounted. `apps/web/src/app/globals.css` (3 commits, last `5624a7a`) checked out correct.

| File                                              | Total commits in history | Last commit | Last commit message                                                       | Entry                              |
| ------------------------------------------------- | ------------------------ | ----------- | ------------------------------------------------------------------------- | ---------------------------------- |
| `apps/web/src/app/globals.css`                    | 3                        | `5624a7a`   | feat(e2e): check accessibility with axe, and wire the UI skills to review | `FX-039`                           |
| `apps/web/src/app/layout.tsx`                     | 4                        | `38d86d4`   | feat(web): replace CSS Modules with HeroUI v3 on Tailwind v4              | `FT-004` (not touched by `FT-005`) |
| `apps/web/src/app/page.tsx`                       | 5                        | `3df3155`   | feat(web): rework the UI against HeroUI and ui-ux-pro-max                 | `FT-005`                           |
| `apps/web/src/app/auth/login/page.tsx`            | 3                        | `3df3155`   | feat(web): rework the UI against HeroUI and ui-ux-pro-max                 | `FT-005`                           |
| `apps/web/src/components/create-meeting-form.tsx` | 4                        | `3df3155`   | feat(web): rework the UI against HeroUI and ui-ux-pro-max                 | `FT-005`                           |
| `apps/web/src/app/auth/layout.tsx`                | 4                        | `3df3155`   | feat(web): rework the UI against HeroUI and ui-ux-pro-max                 | `FT-005`                           |
| `apps/web/src/app/auth/login/login-form.tsx`      | 4                        | `3df3155`   | feat(web): rework the UI against HeroUI and ui-ux-pro-max                 | `FT-005`                           |
| `apps/web/src/app/auth/register/page.tsx`         | 3                        | `3df3155`   | feat(web): rework the UI against HeroUI and ui-ux-pro-max                 | `FT-005`                           |
| `apps/web/src/components/meeting-list.tsx`        | 4                        | `3df3155`   | feat(web): rework the UI against HeroUI and ui-ux-pro-max                 | `FT-005`                           |
| `apps/web/src/components/logout-button.tsx`       | 3                        | `38d86d4`   | feat(web): replace CSS Modules with HeroUI v3 on Tailwind v4              | `FT-004` (not touched by `FT-005`) |

All ten files are now covered: two (`layout.tsx`, `logout-button.tsx`) stop at `FT-004` and were never touched by `FT-005`; `globals.css` stops at the `FX-039` fix on top of `FT-004`; the remaining seven were last touched by `FT-005`. 10 of 10 files named by the requirement (line 3, "a rework of ten existing files") are in the table.

### Git log for specific app/web files

```
3df3155 feat(web): rework the UI against HeroUI and ui-ux-pro-max
5624a7a feat(e2e): check accessibility with axe, and wire the UI skills to review
38d86d4 feat(web): replace CSS Modules with HeroUI v3 on Tailwind v4
39e9e0c chore: whole project migrated to English and comments condensed
4bedc02 feat(meetings): главная страница со списком встреч и контракт /meetings
7c4fc5b feat(auth): страница логина /auth/login и контракт POST /auth/login
fe07cfe chore: baseline монорепозитория (web + api + e2e-каркас)
```

---

## Profiling records

Search of `docs/profiling/` for records measuring `FT-004` or `FT-005`:

- **Not found:** FT-004 and FT-005 have no profiling records. Only one profiling record exists in the repository: `docs/profiling/runs/2026-09-28-meetings-detail-participants.md` which measures `FT-003`.

---

## Process changes tied to this area

### CH-029 — Design language written as measured tokens

Entry: `CH-029` (2026-10-02)

> The product gets a design language, and it is written down as numbers rather than as taste. `ADR-0026` fixes the palette, the type scale, the radii, the elevation, the icon library and the page shell for `apps/web`, taken from a reference dashboard the owner chose; a tenth skill of ours, `design-system`, is how an implementer applies it, with `references/tokens.css` as the block to paste into `globals.css` and `references/patterns.md` as the recurring surfaces. Every colour pair was computed OKLCH to sRGB to WCAG and is in the skill with its ratio — the accent at 5.15:1, the five category tints between 5.36:1 and 6.93:1 — because `FX-039` had already shown that a palette value here is settled by `ACC-FN-01` and not by how it looks. Two findings came out of writing it: HeroUI's own `--muted` measures 4.41:1 on the new canvas and fails AA, so the token is redefined rather than inherited; and `text-foreground-500` and `border-default-200`, live in nine places in `apps/web`, compile to nothing at all — v2 token names that a code review, an accessibility scan and 28 functional cases all passed over, because a class that generates no CSS produces no violation and no diff (`BL-032`). Nothing here is applied yet: the rework is `BL-031`, which is also where the two new dependencies land.

Commit: `bf35f7a`

Created: `.claude/skills/design-system/SKILL.md`, `.claude/skills/design-system/references/tokens.css`, `.claude/skills/design-system/references/patterns.md`

---

## Open questions

- **Not found:** No measurement of FT-004 or FT-005 token count, wall-clock time, or role breakdown. The pipeline is documented to be slow, but discovery cost vs. implementation cost is not measured for the UI rework feature (`feature-pipeline` §10 states that "the discovery half **is not measured**").

- **Not found:** No entry in the rejected section for alternative design systems, colour schemes, type systems, or component libraries proposed and rejected for `apps/web`.
