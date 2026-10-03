# Design: design-language-rollout

> `FEAT-S2`, from the accepted [`research/`](research/README.md). `BL-031` with `BL-032` folded in.
> Revised after the `FEAT-G2` verdict: B1 → §6.3, B2 → §3 and §6.6, B3 → §6.9, B4 → §6.9; findings
> 1–4 → §6.7, §6.4, §6.9, §6.9. **The design language is already decided** — `ADR-0026` is accepted
> and is not re-argued here; the palette, radius, family, icon library and shell are facts
> (`FACT-3548`…`FACT-3557`). This is the **mapping** of those facts onto `apps/web`'s files, plus the
> calls the research left open (§6). **No new ADR is needed** — §6.9 says why. Not a plan, not test
> cases, not code.

## 1. What the research established

Every load-bearing statement below traces to one of these; none is restated here.

| #   | Finding                                                                                                                                                                                                                                                         | Where                           |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| R1  | The ten files line by line, with a 38-entry `className` inventory; no icon, `<nav>`, `<aside>`, icon dependency or second grid anywhere — the only `grid` utility is `page.tsx:46`                                                                              | `code.md` §Q1, §Q3              |
| R2  | No field a category chip could label — `Meeting` is `id`, `title`, `startsAt`, `durationMinutes`, `participants`; `grep -rn "category"` over both apps and the data model → zero hits                                                                           | `code.md` §Q2, `contract.md` §4 |
| R3  | Probe 1: nine dead-class hits by `path:line` — seven `text-foreground-500`, two `border-default-200`; neither occurs in the 424 650-byte compiled stylesheet                                                                                                    | `code.md`/`probes.md` Probe 1   |
| R4  | Probes 2/4/5: which utilities HeroUI v3 emits (`shadow-surface`, the `color-mix`-derived `--accent-soft` pair); `@theme inline` **replaces** `--font-sans`; an appended `:root` lands outside every layer; `tokens.css` overrides four names while saying three | `code.md` Probes 2, 4, 5        |
| R5  | Probes 3/6: `Plus_Jakarta_Sans({ variable, subsets:['latin'] })` type-checks on `next@16.3.6`; **nothing reads the two Geist variables**                                                                                                                        | `code.md` Probes 3, 6           |
| R6  | Probe 7: the barrel and the per-icon `csr` subpath **fail `next build`** in a Server Component; `@phosphor-icons/react/ssr` passes at **0 bytes** of client JS (+1 413 B HTML for one 24px icon)                                                                | `code.md`/`probes.md` Probe 7   |
| R7  | The 28 functional cases with exact locators, including the **unscoped** `getByRole('list')` at `:166`/`:223` and `getByRole('listitem')` at `:254`                                                                                                              | `tests.md` §1, §3               |
| R8  | `ACC-FN-01`…`04`; `AUDITED_PAGES` = `/auth/login`, `/auth/register`, `/`; scanned against `wcag2a wcag2aa wcag21a wcag21aa`                                                                                                                                     | `tests.md` §2                   |
| R9  | Nothing mechanical catches a dead class, a hard-coded colour, a wrong font, contrast off an audited page, or a missing `aria-hidden`                                                                                                                            | `tests.md` §6; `FACT-3561`      |
| R10 | `HD-API-01`, `HD-API-20`, `MD-API-01` assert the exact five-key `Meeting` set with a sorted `toEqual`                                                                                                                                                           | `tests.md` §8, `contract.md`    |
| R11 | Which `ADR-0026` facts name a value and which are rules; the five patterns naming surfaces the tree lacks; most of the language's _numbers_ (type scale, spacing, 44×44px, motion) are **unkeyed skill prose**                                                  | `contract.md` §1, §2, §2.1      |
| R12 | `FX-039`, `FT-004`, `FT-005`, `CH-029`, per-file git history; `BL-008`/`BL-009`/`BL-029` overlap, `BL-030` does not. `@phosphor-icons/react@2.1.10` peers met by the pinned `react@19.2.8`; 0 vulnerabilities in an **isolated** install                        | `history.md`, `contract.md`     |

From the three UI skills. **`design-system`** supplied every value — nothing here was chosen: palette
and ratios (`SKILL.md:30-44`), type (`:63-70`), spacing (`:90-93`), elevation (`:99-103`), icons
(`:108-122`), "Where this language stops" (`:136-144`), `references/tokens.css`, `references/patterns.md`.
**`heroui-react`** supplied the six proven components and the four refused patterns (§3).
**`ui-ux-pro-max`**, via `scripts/search.py`: `Navigation / Active State` and `Breadcrumbs` (§6.3),
`Skip Links` and `Keyboard Navigation` (§8), `Empty States` (§2.5), `Touch Target Size` (§6.9) — but
**no verified match** for landmark/`aside` semantics, so §6.5 rests on the ARIA meaning of `aside` and
on `patterns.md:36` and says so.

## 2. The shape

### 2.1 `apps/api` — nothing

No controller, service, DTO, mapper, guard, module or seed change; `docs/api-contract.md` and
`docs/data-model.md` keep every fact they state and `Meeting` keeps its five outgoing keys (R10).

### 2.2 `apps/web` — layer by layer

| Layer                                                                | Changes                                                         | Stays                                                                                                                                                   |
| -------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`                                                       | `@phosphor-icons/react` `^2.1.10` as a runtime dependency (R12) | the nine existing runtime deps                                                                                                                          |
| `src/app/globals.css`                                                | the token block (§2.3)                                          | the two `@import`s in that order (`FACT-3509`); the app-shell `html`/`body` rules the auth layout centres against                                       |
| `src/app/layout.tsx`                                                 | Geist + Geist Mono → `Plus_Jakarta_Sans` (§2.3)                 | `light` + `data-theme="light"` (`FACT-3513`); `bg-background text-foreground` on `<body>`; `metadata`                                                   |
| `src/app/page.tsx`                                                   | becomes the three-track shell (§2.4)                            | one `h1` carrying `user.email`; the counter as one `p`, one text node, exactly `Meetings total: {total}`; one `main`; the two `dal` reads               |
| `src/components/nav-rail.tsx`, `hero-banner.tsx`, `stat-tile.tsx`    | **new**, all three Server Components (§6.3, §6.6, §6.5)         | —                                                                                                                                                       |
| `src/components/meeting-list.tsx`                                    | dead classes, type scale, card radius, row icon (§2.5)          | Server Component; `section`/`h2`/`ul aria-label="Recent meetings"`/`li`/`Card`/`Chip`; the empty-state text; `formatMeetingDateTime`                    |
| `src/components/create-meeting-form.tsx`                             | dead classes, type scale, card radius, width cap                | `'use client'`; `<form noValidate>`; `type="text"`; no `isRequired`/`validate`; `<Button type="submit">Create meeting</Button>`; the `role="alert"` `p` |
| `src/components/logout-button.tsx`                                   | nothing but its place in the shell header                       | Server Component; `<form action={logoutAction}>`; `<Button type="submit" variant="outline" size="sm">Sign out</Button>`                                 |
| `src/app/auth/layout.tsx`                                            | dead classes; **bordered-or-raised, not both** (§2.5)           | the single `<main>` wrapper; `max-w-sm`; the wordmark `p`                                                                                               |
| `src/app/auth/login/page.tsx`, `login-form.tsx`, `register/page.tsx` | dead classes, type scale only (§6.8)                            | every label, name, role, heading and string on all three                                                                                                |
| `src/proxy.ts`, `src/lib/**`, `lib/actions/**`, `lib/dal.ts`         | **nothing**                                                     | —                                                                                                                                                       |

No new route, Server Action, `fetch`, DAL export or client component. Invariant 19 is untouched: every
new component is a Server Component taking numbers and strings only — never a token.

### 2.3 `globals.css` and `layout.tsx`

The declarations of `design-system/references/tokens.css` go into `globals.css` **verbatim and in
order** — the four `:root` overrides (`--accent`, `--background`, `--muted`, `--radius`), the ten
`--category-*` declarations, and the `@theme inline` block with `--font-sans` and the ten
`--color-category-*` bindings (R4) — after the two `@import`s, before the app-shell rules, unlayered:
the mechanism `globals.css:32-33` already relies on, which R4 proves still works under
`@tailwindcss/postcss@4.3.3` + `@heroui/styles@3.2.6`. Two departures from a byte copy, both about
comments: `tokens.css`'s section-4 block is **instructions for `layout.tsx`**, not CSS, and does not
ship; its `:14` "Three values" sits above four declarations (R4), so `globals.css` keeps its own comment
voice (§8). The live `--accent: oklch(50% 0.195 253.83)` at `:35-37` is **replaced** (§6.1), its comment
rewritten to say the _value_ now comes from `FACT-3549` while the _placement_ stays what `FX-039`
established. `layout.tsx` takes `Plus_Jakarta_Sans({ variable: '--font-plus-jakarta', subsets: ['latin'] })`
and `<html lang="en" className={`light ${sans.variable}`} data-theme="light">`, as `tokens.css:83-97`
writes it; both Geist loaders and both variables go, since R5 proves no rule reads them and the body
font moves because `@theme inline` replaces `--font-sans` (R4).

### 2.4 The shell on `/`

`FACT-3556` — 16rem rail, fluid main, 20rem side rail, one column below `lg` — as `patterns.md:25-42`
writes it, with `minmax(0,1fr)` on both fluid tracks (`patterns.md:44-46`: the `overflow-x: hidden` in
`globals.css` would hide a blown-out track rather than fix it).

```
div  bg-background min-h-screen  lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]
├── nav aria-label="Main"            hidden lg:block        → §6.3
└── div  mx-auto max-w-7xl  flex flex-col gap-8 px-6 py-8
    ├── header   h1 lockup + counter p + <LogoutButton/>
    └── div  grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]
        ├── main   HeroBanner · MeetingList · CreateMeetingForm
        └── aside aria-label="Overview"   StatTile            → §6.5
```

Three consequences, all carried into §7. **The `h1` moves outside `<main>`**, since the pattern puts
`<header>` beside it; no case asserts containment. **The counter stays one `p` with a single text
node**, exactly `Meetings total: {total}` (`page.tsx:22-24`), and nothing else may match
`/^Meetings total: \d+$/`. **`max-w-5xl` becomes `max-w-7xl`** and `lg:grid-cols-[2fr_1fr]` disappears:
`FT-005` chose `2fr 1fr` because inputs stretched past the length of what goes in them
(`ui-ux-pro-max`, Typography / Line Length), preserved by capping the "New meeting" card instead.

### 2.5 Pattern application, surface by surface

| Surface                 | What the language puts on it                                                                                                                                                                                                                                                                                                                        |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Meeting row             | `li` → `Card.Root rounded-2xl px-4 py-3` with `Card.Content flex-row … p-0` (`patterns.md:117-133`); `flex-row` stays explicit (`FT-005`'s recorded HeroUI finding); date line `text-sm text-muted` with its icon inline in the same colour; the duration `Chip` keeps its exact text and takes `rounded-md`                                        |
| Meeting list `h2`       | `text-lg font-semibold` — the Section row of `SKILL.md:66`, `text-base` today. Spacing: `gap-3` inside the `ul`, `gap-8` between page sections (`SKILL.md:90-93`)                                                                                                                                                                                   |
| Empty state             | text unchanged (`No meetings yet`, `ui-ux-pro-max`'s `Empty States`); container moves from `border-default-200` to `border border-border border-dashed` and `text-muted`                                                                                                                                                                            |
| Create-meeting card     | `Card.Root rounded-2xl p-5`, `Card.Content p-0`, capped at `max-w-xl` so the inputs keep their `FT-005` length                                                                                                                                                                                                                                      |
| Auth card               | `auth/layout.tsx:25` carries `border-default-200 … border … shadow-sm` — a border **and** a shadow, which `FACT-3555` forbids. It resolves as raised: `bg-surface shadow-surface rounded-2xl`, dropping the border and Tailwind's `shadow-sm` (not a token — `SKILL.md:99`). Cards elsewhere follow the same rule; `shadow-overlay` is used nowhere |
| `h1` on all three pages | `text-2xl font-bold tracking-tight` — the Page-title row of `SKILL.md:65`; all three are `font-semibold` today                                                                                                                                                                                                                                      |
| Secondary text, borders | `text-muted` replaces all seven `text-foreground-500`; `border-border` replaces both `border-default-200` (R3)                                                                                                                                                                                                                                      |
| Icons                   | `size={20}`, `weight="regular"`, `aria-hidden="true"` beside text (`FACT-3554`) — §6.2 fixes the import, §6.4 the colour                                                                                                                                                                                                                            |

Icons ship on exactly three surfaces and nowhere else — the rail item, the meeting row's date line and
the stat tile's badge, all 20px, all decorative beside visible text. No icon-only control is introduced,
so `FACT-3554`'s accessible-name half has no new subject, and no icon goes in a page header, so its
24px rung has none either.

## 3. Contract

**No HTTP contract change.** No route is added, removed or renamed; no method, path, auth requirement,
request body, success body or error body moves. `docs/api-contract.md` keeps `FACT-2000`…`FACT-2079`
unchanged, including the error shapes invariant 8 names: `message` is an **array** on `400` from
`ValidationPipe` (`FACT-2012`/`FACT-2013`), a **string** on `401` (`FACT-2014`/`FACT-2015`) and on `404`
(`FACT-2016`). `e2e/regression/**/*.api.spec.ts` is untouched. **The six HeroUI components already
proven here** (`patterns.md:7-9`): `Card.Root`, `Card.Content`, `Chip.Root`, `Chip.Label`, `Button`,
`TextField`, `Label`, `Input` — and **no new one is introduced**. Not used: `Form`/`FieldError`
(`FACT-0053`, invariant 15), `ListBox` (`FACT-0054`/`FACT-3512`), `onPress` on a submit control
(`FACT-3511`), `isRequired`/`type="email"`/client `validate` (invariant 15), and — named because the
patterns mention them — `Avatar`, `ProgressBar`, `Meter`, `ToggleButton`, `Alert`. **Names and text
after the change:** the left column exists today and keeps its exact name; the right column is every
name and every string the new markup adds — nothing ships that is not listed.

| Unchanged                                                                  | Added                                                                                  |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `heading level 1` ×1 per page: `Hello, {user.email}`, `Sign in`, `Sign up` | `heading level 2`: `Everything you have planned, in one place.` (banner, §6.6)         |
| `heading level 2` ×2 on `/`: `Recent meetings`, `New meeting`              | text `Your schedule` — the banner eyebrow, a `p` with no role (§6.6)                   |
| `main` ×1 per page                                                         | landmark `navigation` named `Main` (§6.3)                                              |
| `list` named `Recent meetings`, with 3 `listitem`s                         | landmark `complementary` named `Overview` (§6.5)                                       |
| buttons `Create meeting`, `Sign out`, `Sign in`                            | link `Dashboard`, carrying a literal `aria-current="page"` (§6.3)                      |
| links `Sign up`, `Back to sign in`                                         | text `PurpleSchool` — the rail wordmark, a non-interactive `p` (§6.3)                  |
| labels `Email`, `Password`, `Title`, `Date and time`                       | text `{items.length} of {total} shown` and `Meetings` — the stat tile's two `span`s    |
| text `Meetings total: {n}`, `No meetings yet`; one `role="alert"` per form | three `aria-hidden="true"` icons, which carry no name and appear in no accessible tree |

**Nothing is renamed and nothing is removed, which is the whole of `FACT-3559`'s bar.** The added
strings were checked against the suite's text locators (R7, `tests.md` §3): none contains a seeded
meeting title (`meetings.seed.ts:20-68`, which `HD-FN-05` asserts hidden), `No meetings yet`, a user
email, or anything matching `/^Meetings total: \d+$/`; `Meetings` alone matches none of the
`getByText('Meetings total: …')` substring queries, which carry the counter's full prefix, and no spec
queries a level-2 heading, so the third `h2` is addressed by nothing.

## 4. Data

No entity, DTO, field, format or seed change. `Meeting` is `id`, `title`, `startsAt` (ISO 8601 UTC,
always `…Z`), `durationMinutes` (15–480), `participants` (`string[]`, 0–20) — `FACT-1005`…`FACT-1010`;
`MeetingDto = Omit<Meeting, 'ownerId'>` (`FACT-1011`); the mapper keeps stripping `ownerId` explicitly
(`meetings.mapper.ts:11-19`). `MeetingsPageDto = { items, total }`, and `total` stays the owner's full
count, never `items.length` (`FACT-1012`, `FACT-1013`, invariant 4). **No field is newly rendered**:
`participants` stays unrendered, `PublicUser.name` stays unrendered (§8 says why it was dropped), and
the one new number — the stat tile's `{items.length} of {total} shown` — is derived from two values the
page already holds, so no new read, no new DAL export, no change to `DEFAULT_MEETINGS_LIMIT = 3`.

**No seed change**, so no owner is reassigned: mutating cases keep their sandboxes — `planner` for
`*.api.spec.ts`, `organizer` for `*.functional.spec.ts` (`tests.md` §7) — and `teacher` and `student`
stay read-only baselines, so `TEACHER_MEETINGS.total = 5` / `latestLimit = 3` is what the tile reads as
"3 of 5 shown" and the student's empty page as "0 of 0 shown". Dates stay pinned:
`formatMeetingDateTime` with `timeZone: 'UTC'` (`FACT-1019`, `format-date.ts:27`), so
`HD-UT-10`…`HD-UT-16` are untouched and `BL-009` is not pre-empted.

## 5. Alternatives rejected

| Alternative                                                                         | Why not                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Keep `--accent: oklch(50% 0.195 253.83)` (the `FX-039` value) and apply the rest    | It is not a corpus fact. `FACT-3549` states the accent is `oklch(0.55 0.21 285)`; the live value is backed by a ledger entry and a green scan, neither of which carries a key. Keeping it would make the one token the whole palette is built around disagree with the accepted ADR, and `--accent-soft`/`--accent-soft-foreground` are `color-mix`-derived from it (R4), so the rail's active state would inherit the disagreement. |
| Build the rail from `ul`/`li` as `patterns.md:57-69` writes it                      | It adds a second `role="list"` to `/`. `home-dashboard.functional.spec.ts:166` and `:223` call `toBeVisible()` on an **unscoped** `getByRole('list')` (strict mode: two matches fail), `:254` counts unscoped `listitem`s expecting 0, and `:295-305` chains items off the unscoped list. Four or more cases go red for a visual reason — what `FACT-3559` calls a defect, not a test to update. §6.7.                               |
| Narrow those locators to the meetings section instead                               | Editing a functional case for a restyle is what `FACT-3559` forbids by name. The research also could not observe the collision without a run (README Still-unknown 5), so the edit would rest on a prediction.                                                                                                                                                                                                                       |
| `role="presentation"` on the rail's `ul` to hide it from `getByRole`                | Changing what a screen reader is told the thing is, to keep a locator quiet, is the move `FACT-3512` refuses `ListBox` for. It would pass the suite by lying.                                                                                                                                                                                                                                                                        |
| Add a `category` field to `Meeting` so the chip has a source                        | Out of the owner's scope, and expensive beyond it: `HD-API-01`, `HD-API-20` and `MD-API-01` each assert the exact sorted five-key set against their own `MEETING_KEYS` constant (R10), and `FACT-1005`…`FACT-1011`, `FACT-2038`, `FACT-2043`…`FACT-2050` and `FACT-2063` all state the shape. A chip is not worth a contract change.                                                                                                 |
| Tint the duration `Chip` by a duration bucket                                       | The chip reads `60 min`; a hue meaning "medium-length" is meaning carried by colour alone, which `FACT-3551` and `SKILL.md:52-53` both forbid and `ui-ux-pro-max` calls a priority-1 failure.                                                                                                                                                                                                                                        |
| Use two category tints as generic decoration, as `patterns.md:154` writes the badge | It answers only half of `FACT-3551`. Nothing would be conveyed by hue — the icon is `aria-hidden` with text beside it — but the fact also says the tints **label a category**, and with no category a tint labels nothing. It would also spend two of the five on non-categories, leaving the first real category field an ambiguous mapping. §6.4.                                                                                  |
| A hero banner with its own `Button` ("Join now", or an anchor to the form)          | The page's primary action already exists and four cases address it by name (`HD-FN-06`, `HD-FN-07`, `HD-FN-09`, `HD-FN-14`). A second prominent control is a second primary action — `SKILL.md:54-55` — and an in-page anchor is new interactive behaviour with no case. §6.6.                                                                                                                                                       |
| No hero banner at all                                                               | It is in the owner's scope and is the only surface using `bg-accent`/`text-accent-foreground`, the pair `FACT-3549` measures at 5.15:1. Dropping it would leave the accent on a button alone and never exercise the measured pair.                                                                                                                                                                                                   |
| Import icons through the barrel inside a thin `'use client'` wrapper                | Probe 7: +4 449 bytes of client JS for one icon versus 0 on the `/ssr` path, and it pushes decoration into a client boundary on surfaces that are deliberately Server Components (`meeting-list.tsx:7`, `logout-button.tsx:6-7`).                                                                                                                                                                                                    |
| Per-icon specifiers `@phosphor-icons/react/dist/ssr/Calendar`                       | The exports map does declare `"./dist/ssr/*"` (`probes.md` 7a), but no probe built it. The measured client-JS delta of the `/ssr` entry is already **zero**, so the only thing a per-icon path could improve is server-side module evaluation, which nothing measures. §8 names it as the move if build time regresses.                                                                                                              |
| Put the shell in `app/layout.tsx`, or in a `(dashboard)` route group                | `app/layout.tsx` wraps `/auth/*` too, and the auth frame's single `<main>` is load-bearing for `AL-FN-03`/`04`/`05`/`14` and `ACC-FN-04` (`tests.md` §3). A route group for one page is indirection with nothing to share; it becomes right when `BL-007` adds a second signed-in page.                                                                                                                                              |
| Give `/auth/register` the three-track shell                                         | A signed-out placeholder has nothing to navigate and no overview. `BL-008` replaces the page wholesale, so visual work there is paid for twice. §6.8.                                                                                                                                                                                                                                                                                |
| A hamburger drawer for the rail below `lg`                                          | `patterns.md:51-53`: a drawer is a feature with its own cases, not a responsive fallback. It would also be the change's first piece of client JS.                                                                                                                                                                                                                                                                                    |
| A "skip to main content" link                                                       | `ui-ux-pro-max`'s `Skip Links` applies to nav-heavy pages; a one-item rail adds one tab stop before `<main>`. New interactive markup with no case. §8 names what the second rail item buys.                                                                                                                                                                                                                                          |
| Key the type scale, spacing rungs, 44×44px and motion into the corpus here          | §6.9.                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Move the create-meeting form into the `aside`                                       | `aside` is complementary content; the page's primary action is not complementary. The 20rem track would be the natural width, but the semantics are wrong and `aria-label="Overview"` would misdescribe it.                                                                                                                                                                                                                          |

## 6. Decisions

**No ADR is written and none is superseded.** Each decision applies an `ADR-0026` fact or settles what
that record leaves to the implementation — an import specifier, a rail's destinations, where a pattern
does not fit the data — and none contradicts `ADR-0026`, `ADR-0023` or `ADR-0025`.

### 6.1 `--accent` is `oklch(0.55 0.21 285)` — `FACT-3549` lands

`FACT-3549` is a keyed, accepted, unsuperseded statement of what the accent **is**; `FACT-3548` makes
`globals.css` where it is declared. The live value rests on `FX-039` (unkeyed) and a green `ACC-FN-01`,
and the one keyed statement nearby, `FACT-3545`, is a rule about method that `FACT-3549` satisfies the
same way — `FACT-3558` makes a green `ACC-FN-01` in `pnpm verify` the acceptance, and the unkeyed gamut
claim at `SKILL.md:156-158` plays no part. `--accent-soft` and `--accent-soft-foreground` follow by
`color-mix` (R4), so the rail's active state needs no new value (`patterns.md:75-76`) — but that derived
pair is in **no** measured table and only `ACC-FN-02` checks it, and a red scan is a defect under
`FACT-3558`, not a token to nudge.

### 6.2 Icons come from `@phosphor-icons/react/ssr`

Named imports, `…Icon`-suffixed — the exact shape probe 7 variant D built, and the only one that
survives `next build` in a Server Component (R6); §6.9 records it durably. **Every component involved
stays a Server Component**, the three existing and the three new, while the two client forms keep their
`'use client'` for `useActionState` and render no icon. The change therefore adds **zero** bytes of
client JavaScript (R6) and no new client boundary, which keeps invariant 19 trivially true, at a measured
+1 413 bytes of prerendered HTML for one **24px** icon — an upper bound for the 20px sites here.

### 6.3 The rail navigates to one place, with a literal `aria-current`

Three routes exist and one is the signed-in page (R1, R8), so the rail ships **one destination**:
`Dashboard` → `/`, a `next/link` `Link`, active styling keyed off
`aria-[current=page]:bg-accent-soft aria-[current=page]:text-accent-soft-foreground`
(`patterns.md:62-74`, `ui-ux-pro-max`'s `Navigation / Active State`), under the `PurpleSchool` wordmark
as a non-interactive `p` — the lockup `auth/layout.tsx:21` uses, not a second link to the current page.
Inventing destinations is refused: an item for a page that does not exist needs a route the owner
excluded, and a disabled item tells the user something untrue. No `ul`/`li` — §6.7. **And
`aria-current="page"` is written literally, not computed:** `patterns.md:62`'s
`aria-current={isActive ? 'page' : undefined}` is written for a rail with several destinations, where
`isActive` comes from `usePathname`, a client hook. Here the rail renders on `/` only and its single
destination _is_ `/`, so the value cannot vary, and following that line literally would put
`'use client'` on `nav-rail.tsx` for a constant, contradicting §2.2 and §6.2. The styling still keys off
the attribute rather than a boolean, so `BL-007`'s second destination adds a condition and no restyle.

### 6.4 No category token appears in any class list, and no category chip ships

There is no category field and adding one is out of scope (R2, R10). `FACT-3551` says the five tints
"label a category" and that the chip's text is what says what it means; with no category there is
nothing to label. So **no category chip** — the duration `Chip` keeps `{durationMinutes} min` and
HeroUI's defaults — and **no `--category-*` utility in markup either**, reversing this design's first
draft, which tinted the stat tile's badge and the meeting row's icon (§5 carries the reason). The badge
is `bg-background text-muted`, the pair `SKILL.md:35` measures at 5.05:1, and the row's date icon is
`text-muted` inline: a stated departure from `patterns.md:151-163`, written for a page with categories.
All ten `--category-*` declarations and all ten `--color-category-*` bindings still ship (§2.3 copies
`tokens.css`), declared and referenced by nothing, waiting for a category field.

### 6.5 The side rail holds one stat tile, and that is all the data supports

`<aside aria-label="Overview">` holds one tile in the shape `patterns.md:151-163` prescribes — a
`size-10` icon badge (colour per §6.4), a muted small line and a bold subject line, the number smaller
than the subject: muted `{items.length} of {total} shown`, subject `Meetings`. It uses only the two
numbers the page already holds (§4), adds no fetch and no behaviour, and makes visible the distinction
invariant 4 and `FACT-1013` exist for. The subject is `Meetings`, not the pattern's noun phrase, because
`Recent meetings` is already the list's `h2` and the `ul`'s `aria-label`; neither line collides with
`COUNTER_PATTERN` or any `getByText` (§3). **Nothing else goes in the rail** — a progress bar, activity
feed or participants roll-up would each be new data, new behaviour, or a statistic computed over three
fetched meetings and wrong about the other two. The tile drops below `xl` with its track.

### 6.6 The hero banner: no button, and these exact strings

`patterns.md:82-83` gives the banner the page's single primary action; this page's is
`<Button type="submit">Create meeting</Button>`, addressed by name by four cases. So the banner ships as
**eyebrow + `h2`, no control**:

- eyebrow `p`, text `Your schedule` — `text-xs font-semibold tracking-wide uppercase` (`SKILL.md:70`)
- `h2`, text `Everything you have planned, in one place.` — `max-w-[28ch] text-2xl font-bold tracking-tight`
- surface — `bg-accent text-accent-foreground rounded-3xl p-6 sm:p-8`

The strings are decided here because they are a new accessible name on the one page every `HD-FN-*` and
`ACC-FN-02` runs against (`design-protocol` §3, `ADR-0023`); §3 carries the collision check, and the
`h2` is the page's third, which no spec queries. Dropping the button keeps the accent to what
`SKILL.md:54-55` allows — one surface, one primary action, one active nav item — a deliberate deviation
from `patterns.md:89-91`, unkeyed prose written against a screenshot whose primary action _was_ a CTA.
Second deviation, measurable: **no `opacity-80` on the eyebrow** (`patterns.md:87`), since `FACT-3558`
computes every ratio from the OKLCH values and an opacity makes the rendered ratio depend on a value
nobody computed. Both lines sit at the measured 5.15:1 pair.

### 6.7 The rail is a `nav` with links, not a list — and all 28 cases pass unmodified

`FACT-3559` is the bar: restyling changes no accessible name and no functional case is edited. A
`ul`-based rail would add a second `role="list"` to `/` and break `HD-FN-04`, `HD-FN-07`, `HD-FN-09` and
`HD-FN-14` through the unscoped locators at `home-dashboard.functional.spec.ts:166`, `:223`, `:254`,
`:295-305` (R7). So the rail is a `nav aria-label="Main" className="hidden lg:block"` holding the
wordmark `p` and the one `Link` of §6.3 — no `ul`, no `li`, no `role` override, which costs nothing
semantically since a list of one element conveys nothing a screen reader can use. `role="list"` becomes
correct at the second item, and at that moment the unscoped locators collide: **a latent trap in the
specs, not a defect this change creates**, reported in §8. Nor does the suite skip the rail — the `web`
project runs `devices['Desktop Chrome']` (`playwright.config.ts:55-60`, `tests.md` §7), whose viewport
is **1280×720** in the installed `playwright-core@1.62.1`, confirmed at
`playwright-core/lib/coreBundle.js:29070-29073` and nowhere in the research, which puts it above
Tailwind's `lg` (1024px): the rail **is** rendered on every run and `ACC-FN-02` scans it. The side
rail's `xl` sits exactly on that boundary, so the aside may run collapsed under the main column; either
way it is in the DOM.

### 6.8 `/auth/register` gets the tokens and nothing else

A placeholder existing only because `AL-FN-06` needs a 200 and an `h1` (`auth/register/page.tsx:10-12`),
and `BL-008` replaces it. It receives the font, radius, palette and the type-scale correction on its
`h1` — through `globals.css`, `layout.tsx` and one class change — and keeps its frame, text, `h1` and
"Back to sign in" link exactly. No shell (§5); `AUDITED_PAGES` keeps it, so `ACC-FN-01` keeps scanning.

### 6.9 Facts: which keys retire, and which numbers stay unkeyed

Under `ADR-0022` a fact whose statement stops being true is **retired** into its document's
`## Retired facts` register naming a successor, never edited in place and never deleted (`FACT-3487`).
Moving a line out of the body into that register is what `FACT-3489` prescribes — "retired and withdrawn
facts leave the body of the document and are listed in a `## Retired facts` table at its end" — and
`FACT-3489` with `FACT-3487` is what licenses touching the body of an accepted `ADR-0026`; **not**
`docs/adr/README.md:27-28`, which sanctions a different edit (keys added to existing lines).

| Retiring                                                                                                                                                                                                                                                                                                                                                                                                  | Because                                                                                                                                                                                                                                                   | Replaced by                                                                                                                                                                                                                                                                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FACT-3542` — the register's **Stated** column carries the line exactly as it last stood, both clauses: "Before this record `apps/web` had no visual language of its own. `globals.css` holds the two imports, the app-shell rules and exactly one project-owned value — the `--accent` override from `FX-039`; everything else is HeroUI's untouched default theme plus utilities chosen per component." | only the second clause goes false (after §2.3 `globals.css` holds the whole token block); the first stays true forever. A fact retires whole rather than being partly edited, so the register quotes it whole and the reason names the clause that moved. | a new `architecture` fact in **Patterns in use** (`docs/architecture.md:99`): the design language declared as tokens in `apps/web/src/app/globals.css`, citing `ADR-0026`                                                                                                                                                                                                                    |
| `FACT-3544` — `text-foreground-500` (seven) and `border-default-200` (two) "in use across `apps/web`" generate no CSS                                                                                                                                                                                                                                                                                     | after §2.5 the count is zero (R3 gives the nine sites)                                                                                                                                                                                                    | a new `architecture` fact in **Patterns deliberately refused** (`docs/architecture.md:135`): HeroUI v2 numeric token names, refused because v3 defines `--muted`/`--border` and no numeric scale — which keeps the failure class citable, which is what `code-reviewer.md` and the skill cite it for                                                                                         |
| `FACT-3560` — the language "needs … a new runtime dependency … and a rework of the four existing pages. That work is `BL-031`"                                                                                                                                                                                                                                                                            | the dependency is taken, the rework is done, and "four pages" never matched the tree (three `page.tsx`, two layouts, three components — research contradiction 3)                                                                                         | a new `architecture` fact in **Patterns in use** (`docs/architecture.md:99`): `apps/web` carries Plus Jakarta Sans through `next/font/google` bound to `--font-sans`, and `@phosphor-icons/react` as a runtime dependency imported **only through `@phosphor-icons/react/ssr`** — the barrel and `dist/csr/*` fail `next build` in a Server Component. Cites `ADR-0026` and the `FT-` entry. |

**The import specifier lives in that third successor fact, and that is the decision** — the first of the
three homes the gate named, because the corpus is where a later reader looks and because
`@phosphor-icons/react/ssr` constrains every future icon surface. The second, correcting
`design-system/SKILL.md:112-115`, is a skill edit outside this change's scope and is reported in §8; the
third, recording it only as an omission, is refused — the failure costs a five-build diagnosis. Numbers
come from `pnpm fact:next` at implementation time and `pnpm fact:lock` is regenerated after
(`FACT-3491`, `FACT-3492`), so this design names subjects and destination sections, never integers.
**`FACT-3549` does not move** — §6.1 applies it — and neither do `FACT-3545`, `FACT-3561` or any
`data-model`/`api-contract` key.

**Retiring `FACT-3544` has a cost the implementation must pay in the same change**, or `AR-API-14` goes
red: a living document must cite a living fact, and three cite this one — `docs/BACKLOG.md:29` (the
`BL-032` row, which becomes `closed` but is never deleted), `.claude/agents/code-reviewer.md:58` and
`design-system/SKILL.md:151` — so each must point at the successor. `ADR-0026`'s own `:115`/`:118` are
exempt (a key cited inside the file stating it), `references/tokens.css:61` is exempt (the rule scans
`.md` only), `research/` is a change folder.

**Does this change key any of the unkeyed numbers (R11)? No**, and that is a decision, not an omission.
The corpus is disjoint (`FACT-0007`) and presentation decisions live in the ADR log, so keying the type
scale means adding new _statements_ to an accepted record — which immutability does not permit — or
writing a new ADR, which the owner excluded. Nor does anything here depend on them being citable:
`ADR-0021` forbids _relying_ on an unkeyed sentence as fact, not applying a decision the skill exists to
apply (`SKILL.md:189-190`). The 44×44px figure must not be keyed at all, since `SKILL.md:92-93`
attributes it to `ui-ux-pro-max` while that set's own `Touch Target Size` row reads "Web 24 CSS px plus
WCAG exceptions" and warns against treating one minimum as universal (§8).

## 7. Impact on what already exists

**Cases. None is expected to change, and that is the acceptance bar** (`FACT-3559`, `BL-031`'s row).
Every case with something to lose is taken individually except `AL-FN-01`…`AL-FN-14`, collapsed into one
row because they share a reason; 28 is still the count that must pass.

| Case(s)                                                                   | At risk because                                          | Holds because                                                                                                                                              |
| ------------------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `HD-FN-04`, `HD-FN-05`, `HD-FN-07`, `HD-FN-09`, `HD-FN-14`                | unscoped `getByRole('list')` / `getByRole('listitem')`   | the rail adds no list role (§6.7); the meetings `ul` stays the only one on `/`                                                                             |
| `HD-FN-01`, `HD-FN-03`, `HD-FN-07`…`HD-FN-10`                             | `counter()` matches `/^Meetings total: \d+$/`            | the counter stays one `p`, one text node; no added text matches the pattern or its substring queries (§2.4, §3, §6.5)                                      |
| `HD-FN-02`, `HD-FN-14`, `HD-FN-16`, `SEC-FN-02`, `SEC-FN-03`, `ACC-FN-04` | one `h1`, containing the email                           | the `h1` keeps its text and stays unique; it moves outside `<main>`, which no case asserts (§2.4)                                                          |
| `HD-FN-05`                                                                | `getByText(omitted)` hidden for the two cut titles       | no added string contains a seeded meeting title (§3)                                                                                                       |
| `HD-FN-06`, `HD-FN-07`, `HD-FN-09`, `HD-FN-14`                            | `button` named `Create meeting`                          | the form's markup and its button's name are untouched                                                                                                      |
| `HD-FN-08`, `HD-FN-14`                                                    | `button` named `Sign out`                                | `logout-button.tsx` changes only where it sits                                                                                                             |
| `AL-FN-01`…`AL-FN-14`                                                     | the `/auth/*` frame, the labels, the `main`-scoped alert | `auth/layout.tsx` keeps its single `<main>`; both forms keep every label, name and role (§2.2)                                                             |
| `ACC-FN-01`, `ACC-FN-02`, `ACC-FN-03`                                     | every colour on every audited page moves at once         | the values are the measured ones (`FACT-3549`, `FACT-3550`, `FACT-3551`); `FACT-3558` makes these cases the gate, and a red one is a defect to investigate |
| `SEC-FN-01`…`SEC-FN-05`                                                   | page content and cookie behaviour                        | no Server Action, cookie, fetch or client boundary changes                                                                                                 |
| `HD-UT-10`…`HD-UT-16`, `AL-UT-20`…`AL-UT-30`                              | —                                                        | no `src/lib` module is touched; no unit renders anything (R9, `tests.md` §4)                                                                               |

The new landmarks are not scanned by axe's `region` or `landmark-one-main`: `ACC-FN-01`/`02` run
`wcag2a wcag2aa wcag21a wcag21aa` (R8) and both rules are `best-practice`-tagged, so they are out of
scope. The shell satisfies them anyway, but no case would have caught it either way.

**Invariants.** 9–14 and 19 are untouched by construction: `proxy.ts` and its matcher, the three session
checks, `redirect()` placement, the cookie's `secure`, the `'use server'` export rule, the `server-only`
split and both forms' invariant-15 markup stay as `code.md` §Q4 records them. 16 has no new subject — no
new page, no new protected route — so `PROTECTED_PAGES`, `PROTECTED_ROUTES` and `AUDITED_PAGES` are
unchanged; 17 and 18 have no subject at all, since nothing touches session failure handling or an
authentication branch. 4's `total` is unchanged and now appears twice, counter and tile.

**Corpus, backlog and ledger.** `ADR-0026` gains a `## Retired facts` register (§6.9),
`docs/architecture.md` gains three facts, `docs/facts-lock.json` is regenerated; `api-contract.md`,
`data-model.md` and `security.md` are untouched. `BL-031` closes and `BL-032` closes folded in, as its
own row invites ("fold it in and say so") — said here, explicitly. The dead-class fix is a **defect
found and now fixed**, so it earns its own `FX-` entry with "Found by: compiling the stylesheet through
`@tailwindcss/postcss` while writing `ADR-0026` (`CH-029`)", alongside the `FT-` entry for the rollout,
and `FACT-3544`'s retirement row names that `FX-` in its "Recorded in" column. `BL-008` is left cheaper
(§6.8), `BL-009` keeps the UTC pin, `BL-029` keeps one `role="alert"` per form, `BL-030` is unaffected.

## 8. Open questions and deliberate omissions

**Open — carried to the lead, not guessed:**

1. **`@phosphor-icons/react/ssr` has not been built inside `apps/web`.** Probe 7 ran in a scratchpad
   Next 16 app on the same pinned versions (R6), not in this workspace with HeroUI and Tailwind present
   — the one build-level risk here. If it fails, the answer is **not** `'use client'` but a report,
   because both client paths cost what §5 records.
2. **Repository-wide `pnpm audit --audit-level high` after the lockfile regenerates** is untested; only
   an isolated install was audited, at 0 vulnerabilities (R12, README Still-unknown 4).
3. **The unscoped list locators are a trap for whoever adds the second rail item** (§6.7). This change
   does not trip them and edits no case; whether it becomes a backlog item is the lead's call.
4. **Four skill and ledger corrections, each outside this change and the lead's to route:**
   `design-system/SKILL.md:112-115` shows the icon example with no module path, which is how the
   specifier was lost in the first place (research Still-unknown 13); `SKILL.md:92-93`'s 44×44px
   disagrees with the `ui-ux-pro-max` row it cites (§6.9); `tokens.css:14` says "Three values" above
   four declarations (R4, avoided in §2.3); `CH-029` credits `ADR-0026` with fixing the type scale,
   which it does not (research contradiction 10).
5. **`FACT-3559` counts 28 functional cases but cites only two of the three spec files** (README
   Still-unknown 6). Not settled here; this design takes the stronger reading — all 28, including
   `SEC-FN-01`…`05`, pass unmodified.

**Deliberately omitted, with what each would cost:**

- **No skip link**, focus-trap work or drawer: all new interactive behaviour with no case (§5). The skip
  link becomes worth its cases when the rail has a second item.
- **No motion.** `SKILL.md:126-130`'s durations are unkeyed and `prefers-reduced-motion` would be new
  untested behaviour; the rail item's `transition-colors` (`patterns.md:63`) is the colour-only exception.
- **No `PublicUser.name` on screen.** A second tile naming the signed-in user was dropped: the research
  does not record whether every seeded user has a non-empty `name`, and a design must not rest on an
  unrecorded fact. If the lead wants it, the seed needs checking first.
- **No per-icon `dist/ssr/*` specifiers** (§5), **no icon in a page header** despite `FACT-3554` offering
  a 24px size, and **all five category tints ship declared and referenced by nothing** (§6.4).
- **No mechanical guard against a dead class, a raw colour literal or a wrong font.** `FACT-3561` stays
  true: review against the skill, plus the `-500|-200|-700` grep probe 1 used, is what holds it; a check
  is separate work in `BL-030`'s shape.
- **No `participants` rendering**, no `/auth/register` content, no per-field errors, no second signed-in
  page, no route group, no API change.
