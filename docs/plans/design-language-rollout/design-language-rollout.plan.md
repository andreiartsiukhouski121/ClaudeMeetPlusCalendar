# Plan: design-language-rollout

> `FEAT-S3`, from the accepted [`design.md`](design.md) and [`research/`](research/README.md).
> `BL-031` with `BL-032` folded in. The design is **not** re-decided here: section references point
> into it rather than restating it. No new ADR — `ADR-0026` is the decision (design §6.9).

## 0. Orientation: what the project already has

- **Duplicate:** no matches. `CH-029` wrote `ADR-0026` and the `design-system` skill but applied neither; `FT-004` moved `apps/web` to HeroUI v3 and `FT-005` fixed the hierarchy by hand, before any token existed; `FX-039` changed `--accent` alone. `BL-031` is open and is this change.
- **Conflicts with shipped:** it replaces `FT-005`'s `max-w-5xl` and `lg:grid-cols-[2fr_1fr]` on `page.tsx`, and `FX-039`'s `--accent` **value** — that override's placement outside any layer is kept, since it is why it wins at all. The auth card's border-and-shadow from `FT-005` resolves to raised. Files: `globals.css`, `layout.tsx`, `page.tsx`, the auth layout and its two pages, `login-form.tsx`, `meeting-list.tsx`, `create-meeting-form.tsx`. The 28 functional cases, `ACC-FN-01`…`04` and every invariant-15 attribute stay as they are.
- **Conflicts with planned:** `BL-031` closes; `BL-032` closes folded in, as its own "Conflicts with" row invites; `BL-029` touches the same form but the one-`role="alert"` error shape is deliberately untouched; `BL-008` is left cheaper (`/auth/register` gets tokens only); `BL-009` keeps the UTC pin; `BL-030` and `BL-024` are unaffected. Nothing in the Rejected section matches.
- **Architecture impact:** `ADR-0026` is applied, not changed — the only touch to it is a `## Retired facts` register, which `ADR-0022` sanctions. `ADR-0023` is confirmed (HeroUI v3, light theme pinned, native `<form>`); `ADR-0025` is the gate the colour change answers to; `ADR-0021` and `ADR-0022` govern §3a; `ADR-0020` names the stages. Corpus: `docs/architecture.md` gains three facts and `docs/facts-lock.json` is regenerated — `docs/api-contract.md` and `docs/data-model.md` keep every key.
- **Open questions:** four, all from design §8 and none blocking the breakdown — the `/ssr` build inside this workspace (task 2), the repo-wide audit after the lockfile regenerates (task 1), the latent unscoped-list trap for whoever adds a second rail item, and four skill and ledger corrections outside this change. Nothing to confirm with the customer: the scope is the owner's own `BL-031` wording.

## 1. Spike: how the risky assumptions were proven

Throwaway probes against the installed toolchain; none of it lands in the repository.

| Assumption                                                                     | How it was proven                                                                                                                      | Fact                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `FACT-3544` still describes the tree, at the occurrences the design maps       | a grep for both class names over `apps/web/src`                                                                                        | seven plus two — **nine occurrences over eight lines in six files**, since `meeting-list.tsx:34` carries both. Exactly the sites design §2.2 lists                                                                                                                                   |
| Every utility the design writes compiles, and the two dead names still do not  | the real `@tailwindcss/postcss@4.3.3` plus `@heroui/styles@3.2.6` driven over a scratch class list (431 874 bytes out)                 | `.shadow-surface`, `.bg-accent`, `.bg-surface`, `.text-muted`, `.border-border`, `.rounded-2xl`/`3xl`, `.size-10`, `.max-w-[28ch]`, `.lg:grid-cols-[16rem_minmax(0,1fr)]` and the ten `.bg-category-*` all emit; `.text-foreground-500` and `.border-default-200` emit nothing       |
| `aria-[current=page]:` is a real variant, not a guess — §6.3 rests on it       | the same compile                                                                                                                       | it emits an `[aria-current="page"]` attribute rule setting `background-color: var(--accent-soft)`, and its `-foreground` twin; `--accent-soft` is `color-mix(in oklab, var(--accent) 15%, transparent)`, so it moves with the new accent and needs no value of its own               |
| `@theme inline` with `--font-sans` reaches the body with no `font-sans` class  | the same compile, reading preflight                                                                                                    | `--default-font-family` resolves to `var(--font-plus-jakarta), …` and preflight's `html` rule reads it — the whole font change hangs off `<html className={sans.variable}>`; drop that class and the page keeps the system stack, silently                                           |
| The font loader exists in the **installed** Next, with the options §2.3 passes | `apps/web/node_modules/next/dist/compiled/@next/font/dist/google/index.d.ts:14565`                                                     | `Plus_Jakarta_Sans` is declared with `variable?: T` and a `subsets` union including `'latin'`; `next/font/google` re-exports it                                                                                                                                                      |
| The icon dependency is a networked step and has never met this lockfile        | a grep for `phosphor` in `pnpm-lock.yaml` (0 hits) and in `node_modules/.pnpm` (absent)                                                | not installed anywhere: task 1 needs the network, and design §8.2 stays open until `pnpm audit` runs against the regenerated lockfile                                                                                                                                                |
| Retiring a fact has a machine-checked shape, and three live citations move     | `scripts/facts-parse.mjs:217`, `e2e/architecture/architecture.api.spec.ts:850-900` and its fixture at `:965`, plus a grep for the keys | the register is `Key` / `Stated` / `Status` / `Recorded in` with a `retired by FACT-NNNN` status; the reference rule scans `docs`, `e2e`, `.claude` and `scripts`, exempting `docs/plans`, `docs/profiling` and the stating file itself — so `ADR-0026`'s own two citations stay put |

One grep settled §6.7's premise harder than the design states it: the unscoped list locators in
`home-dashboard.functional.spec.ts` sit at `:166`, `:180`, `:223`, `:224`, `:254`, `:295` and `:305`
— **seven sites, not four**. Any `ul`/`li` in the rail or the tile fails them under strict mode.

## 2. Contract

**No HTTP contract change.** `apps/api` is untouched, no route, method, body, code or error shape
moves, `docs/api-contract.md` keeps `FACT-2000`…`FACT-2079`, and no `*.api.spec.ts` is edited.

What this change does move is the **accessible tree of `/`**, and only by addition (design §3):
landmark `navigation` named `Main`; landmark `complementary` named `Overview`; link `Dashboard`
carrying a literal `aria-current="page"`; `heading level 2` `Everything you have planned, in one place.`;
the texts `Your schedule`, `{items.length} of {total} shown` and `Meetings`; and three
`aria-hidden="true"` icons, which carry no name at all. **Nothing is renamed and nothing is removed** —
the `h1`, the counter, both existing `h2`s, the list and its label, and every button, link and label
name survive verbatim. That is the whole of `FACT-3559`'s bar.

## 3. Data

No entity, DTO, field, format or seed change, so no owner is reassigned: `planner` keeps the API
sandbox and `organizer` the functional one, `teacher` and `student` stay read-only baselines. Dates
stay pinned to `timeZone: 'UTC'` and absolute in the seed, so no unit moves.

Concrete values the new tile can be asserted on, both derived from numbers the page already holds:
`teacher` renders **`3 of 5 shown`** (`TEACHER_MEETINGS.total = 5`, `latestLimit = 3`) and `student`
**`0 of 0 shown`**. No new fetch, no new DAL export; `DEFAULT_MEETINGS_LIMIT` stays 3.

## 3a. Corpus facts this change adds or retires

| Fact        | Adds or retires                                                   | Where                                                     | Task |
| ----------- | ----------------------------------------------------------------- | --------------------------------------------------------- | ---- |
| `FACT-3542` | retired — `globals.css` stops holding one project-owned value     | `ADR-0026` body → its `## Retired facts` register         | 12   |
| `FACT-3544` | retired — the nine dead-class sites are gone                      | `ADR-0026` body → its `## Retired facts` register         | 12   |
| `FACT-3560` | retired — the dependency is taken and the rework is done          | `ADR-0026` body → its `## Retired facts` register         | 12   |
| new         | adds — the design language is declared as tokens in `globals.css` | `docs/architecture.md`, **Patterns in use**               | 12   |
| new         | adds — Plus Jakarta Sans, and icons only via `/ssr`               | `docs/architecture.md`, **Patterns in use**               | 12   |
| new         | adds — HeroUI v2 numeric token names, refused                     | `docs/architecture.md`, **Patterns deliberately refused** | 12   |

Numbers come from `pnpm fact:next` inside task 12, never from this document, and `pnpm fact:lock`
runs after. Each retirement row names its successor and the `FX-`/`FT-` entry that recorded it.

## 4. Tasks

| ID  | What to do                                                                                                                                  | Files                                                                                                                                                                  | Done when                                                                                                                                                                                                                                                                                                               | Depends on |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1   | Add `@phosphor-icons/react` `^2.1.10` as a runtime dependency and regenerate the lockfile                                                   | `apps/web/package.json`, `pnpm-lock.yaml`                                                                                                                              | it resolves against the pinned `react@19.2.8`; repo-wide `pnpm audit --audit-level high` exits 0                                                                                                                                                                                                                        | —          |
| 2   | Prove `@phosphor-icons/react/ssr` builds **in this workspace**: one throwaway named import in a Server Component, `next build`, then revert | throwaway only — nothing committed                                                                                                                                     | the build passes and the route's First Load JS is unchanged. **If it fails, stop and report** — not `'use client'` (design §8.1, §5)                                                                                                                                                                                    | 1          |
| 3   | The token block into `globals.css`, verbatim and in order; the `--accent` value replaced, its placement and the point of its comment kept   | `apps/web/src/app/globals.css`                                                                                                                                         | **exactly one `--accent` declaration remains in `globals.css`, its value is `oklch(0.55 0.21 285)` and it is the last one in the file**; the compiled sheet carries `.text-muted`, `.border-border` and the ten `.bg-category-*`; the two `@import`s are still first and the app-shell rules intact                     | —          |
| 4   | `Plus_Jakarta_Sans` in `layout.tsx`; both Geist loaders and both variables go                                                               | `apps/web/src/app/layout.tsx`                                                                                                                                          | a case-insensitive grep for `geist` under `apps/web/src` is empty; the rendered `<html>` carries the variable class; `light`, `data-theme="light"` and `metadata` untouched                                                                                                                                             | 3          |
| 5   | The four auth surfaces: dead classes, `h1` scale, and the card resolved as raised rather than bordered-and-raised                           | `app/auth/layout.tsx`, `auth/login/page.tsx`, `auth/login/login-form.tsx`, `auth/register/page.tsx`                                                                    | zero dead-class hits in these files; every label, name, role, heading and string unchanged; no `isRequired`, `type="email"` or client `validate` introduced                                                                                                                                                             | 3          |
| 6   | `meeting-list.tsx` onto the card and row patterns, with the date-line icon                                                                  | `src/components/meeting-list.tsx`                                                                                                                                      | no dead class; still a Server Component with `ul aria-label="Recent meetings"`; the icon is 20px and `aria-hidden`; the `Chip`'s text and the empty-state text are byte-identical                                                                                                                                       | 2, 3       |
| 7   | `create-meeting-form.tsx`: card radius and padding, the `max-w-xl` cap, type scale                                                          | `src/components/create-meeting-form.tsx`                                                                                                                               | `'use client'`, `noValidate`, `type="text"`, the untrimmed password, the single `role="alert"` `p` and the button's name all unchanged                                                                                                                                                                                  | 3          |
| 8   | The three new Server Components — nav rail, hero banner, stat tile                                                                          | `src/components/nav-rail.tsx`, `hero-banner.tsx`, `stat-tile.tsx` (new)                                                                                                | none carries `'use client'`; the rail is `nav aria-label="Main"` with no `ul`/`li` and a literal `aria-current="page"`; props are strings and numbers only, never a token                                                                                                                                               | 2, 3       |
| 9   | `page.tsx` onto the three-track shell, the header outside `main`, the `aside` beside it                                                     | `apps/web/src/app/page.tsx`                                                                                                                                            | exactly one `h1`, carrying `text-2xl font-bold tracking-tight`, one `main` and one `role="list"` on `/`; the counter is still one `p` matching `/^Meetings total: \d+$/` and **its `text-foreground-500` is gone** (design §2.2); both fluid tracks are `minmax(0,1fr)`                                                 | 8          |
| 10  | Scenarios for the three new surfaces — **added**, never an edit to an existing case (`FEAT-S9`, `test-designer`)                            | `e2e/regression/home-dashboard/home-dashboard.functional.cases.md`                                                                                                     | new `HD-FN-` IDs continue the numbering; the 28 existing cases are byte-identical in the diff                                                                                                                                                                                                                           | 3          |
| 11  | Their specs and the run (`FEAT-S11`, `tester-functional`)                                                                                   | `e2e/regression/home-dashboard/home-dashboard.functional.spec.ts`, `e2e/scenarios-index.md`                                                                            | the new cases pass and the diff is additions only; `e2e/suite-integrity.api.spec.ts` stays green; **`pnpm scenarios:index` run and the regenerated index committed, `PR-API-07` green**                                                                                                                                 | 9, 10      |
| 12  | Corpus: the three retirements, the three successors, the three repointed citations, `pnpm fact:lock`                                        | `docs/adr/ADR-0026-design-language.md`, `docs/architecture.md`, `docs/BACKLOG.md`, `.claude/agents/code-reviewer.md`, `design-system/SKILL.md`, `docs/facts-lock.json` | `AR-API-11`…`AR-API-16` green; the register uses the four columns the parser reads; no `FACT-` reference outside the stating file resolves to a retired key; **a case-insensitive grep for `text-foreground-500\|border-default-200` under `apps/web/src` returns nothing** — `FACT-3544`'s retirement is paid for here | 3–9        |
| 13  | Acceptance: one `pnpm verify`, then the interactive browser pass over `/`, `/auth/login` and `/auth/register` (`lead`, run directly)        | none — runs only                                                                                                                                                       | `pnpm verify` green on a single server start; console clean; the computed `--accent` on `<html>` is `oklch(0.55 0.21 285)`; `ACC-FN-01`…`04` green; no file under `e2e/regression/**` modified beyond task 11's additions                                                                                               | 11, 12     |
| 14  | Ledger and profiling (`FEAT-S7`/`FEAT-S8`, `tester-acceptance`)                                                                             | `docs/CHANGELOG.md`, `docs/BACKLOG.md`, `docs/profiling/runs/<YYYY-MM-DD>-design-language-rollout.md`                                                                  | an `FT-` for the rollout and an `FX-` for the dead classes with its "Found by"; `BL-031` and `BL-032` marked closed, never deleted; `LG-API-*` green                                                                                                                                                                    | 13         |

Parallel after task 3: **4, 5, 6, 7, 8 and 10** touch disjoint files — 10 is `FEAT-S9` and precedes the
implementation by design, so it waits on nothing it builds. Task 9 waits on 8 (it imports all three),
task 11 on 9 as well as 10, and `docs/BACKLOG.md` is shared by 12 and 14, already serialised by the chain.
Splitting 4–8 across agents needs a worktree each; different ports are not enough.

## 4a. Tests this change is expected to break

| Case ID | Why it goes red                                                                                                                                                                                                                                                                  | Closed by task |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| none    | design §7 takes each of the 28 functional cases, `ACC-FN-01`…`04` and the units individually: no accessible name, string, role or count moves, and `FACT-3559` makes an edited case the defect rather than the fix. A red case here is a finding for task 13, not a planned cost | —              |

## 5. Risks

- **`@phosphor-icons/react/ssr` has been built only in a scratchpad app** (design §8.1). Task 2 is the
  gate and runs before any icon ships; both client fallbacks cost what design §5 records, so a failure
  is reported to the owner rather than worked around.
- **The repo-wide audit has never seen this dependency** (spike row 6). Task 1 is where that is found
  out, before nine files move.
- **Every colour on the three audited pages changes at once.** `ACC-FN-01` and `02` are the acceptance
  (`FACT-3558`), and a red scan is a defect to investigate — never a token nudged until it passes.
- **One stray `ul` makes seven locators ambiguous.** The rail and the tile carry no list role; a
  reviewer checking only the four line numbers design §6.7 cites would miss `:180` and `:224`.
- **`AR-API-14` goes red the moment `FACT-3544` retires** unless the same task repoints
  `docs/BACKLOG.md:29`, `.claude/agents/code-reviewer.md:58` and `design-system/SKILL.md:151` — three
  files, one commit (task 12).
- **The side rail sits exactly on its breakpoint.** Desktop Chrome is 1280×720 and `xl` is 1280px, so a
  scrollbar can put the viewport under it and collapse the `aside` beneath the main column. Either way
  it is in the DOM and no case depends on which.
- **The font fails invisibly** (spike row 4): drop the variable class and the page still renders, in
  the system stack, with nothing failing.

## 6. Assumptions and deliberate omissions

- **No new ADR, and `ADR-0026`'s body is touched only to retire three facts into its register** — the
  edit `FACT-3487` and `FACT-3489` prescribe. If implementation meets a structural decision the design
  never made, it stops and reports: that is the owner's call, not a task's.
- Carried unchanged from design §8: no skip link, no drawer, no motion beyond the rail item's
  `transition-colors`, no `PublicUser.name` on screen, no per-icon `dist/ssr/*` specifiers, no icon in
  a page header, and all ten `--category-*` declarations ship referenced by nothing until a category
  field exists.
- **No mechanical guard against a dead class, a raw colour or a wrong font.** `FACT-3561` stays true;
  the grep for `-500|-200|-700` and review against the skill are what hold it, and a real check is
  separate work in `BL-030`'s shape.
- **The type scale, the spacing rungs, 44×44px and the motion durations stay unkeyed** (design §6.9) —
  applying a decision is not relying on an unkeyed sentence as fact.
- The spike's compile probe lives in the scratchpad and is never committed; task 3's definition of done
  re-runs the equivalent check against the real `globals.css`.
