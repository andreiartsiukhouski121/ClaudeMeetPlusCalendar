# Research: design-language-rollout

> The index of the research stage. Created by `pnpm change:new <slug>`, filled by the `researcher`
> agent before any design exists. The area files next to it (`code.md`, `contract.md`, `tests.md`,
> `history.md`) are written by the research subagents.
>
> **One rule governs this whole folder: record only what is in the project, never what you concluded
> from it.** Every statement carries a citation — `path:line`, a document section, a case ID, a
> `FT-`/`CH-`/`FX-`/`BL-`/`ADR-` ID, or a commit. Anything you cannot cite goes under
> **Open questions** or `- **Not found:** …` instead. "Nothing in this repository covers X" is a
> finding, often the most valuable one.

## Requirement, as received

Apply the design language already accepted in `ADR-0026` to `apps/web`. Named in the requirement:

- the token block from `.claude/skills/design-system/references/tokens.css` into
  `apps/web/src/app/globals.css`;
- Plus Jakarta Sans through `next/font/google`, replacing Geist / Geist Mono in
  `apps/web/src/app/layout.tsx`;
- `@phosphor-icons/react` as a new runtime dependency;
- a rework of the existing surfaces — `src/app/page.tsx`, `src/app/auth/layout.tsx`,
  `src/app/auth/login/page.tsx` + `login-form.tsx`, `src/app/auth/register/page.tsx`,
  `src/components/meeting-list.tsx`, `src/components/create-meeting-form.tsx`,
  `src/components/logout-button.tsx` — onto the three-track shell and the patterns in
  `.claude/skills/design-system/references/patterns.md`, including surfaces that do not exist today
  (navigation rail, side rail, hero banner, stat tile, category chip).

Stated as presentation only: no new route, no new Server Action, no API or contract change, no
behaviour change. The backlog item is `BL-031`, with `BL-032` folded into it —
`text-foreground-500` and `border-default-200` are HeroUI v2 token names that compile to no CSS
(`FACT-3544`). The surface under study is `apps/web`; `apps/api` is out of scope.

## Questions asked of the project

The record of what was looked for — including what came back empty. A question with no answer is
kept, not deleted.

| #   | Question                                                                                                                                                        | Area             | Answered in                                                                | Outcome                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | What does each of the ten `apps/web` files named in the requirement render today — components, utilities, structural markup?                                    | code             | `code.md` §Q1                                                              | Answered: all ten read in full, line-cited, plus a complete 38-entry `className` inventory (`code.md:207`)                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2   | What data reaches the UI, and does any field exist that a category chip could label?                                                                            | code + contract  | `code.md` §Q2, `contract.md` §4                                            | Answered **negative**: `Meeting` is `id`, `title`, `startsAt`, `durationMinutes`, `participants` (`apps/api/src/meetings/meetings.mapper.ts:11-19`); `grep -rn "category"` over `apps/api/src`, `apps/web/src`, `docs/data-model.md` → zero hits                                                                                                                                                                                                                                                                                       |
| 3   | Does `apps/web` today use any icon, navigation component, layout grid or second column?                                                                         | code             | `code.md` §Q3                                                              | Answered **negative** except one grid: `apps/web/src/app/page.tsx:46` (`lg:grid-cols-[2fr_1fr]`) is the only `grid` utility in the codebase; no icon, `<nav>`, `<aside>` or icon dependency. Which surfaces are Server Components, and what that does to the icon package, is question 36                                                                                                                                                                                                                                              |
| 4   | Which lines implement `CLAUDE.md` invariants 9-15 and 19 — i.e. which markup cannot move?                                                                       | code             | `code.md` §Q4                                                              | Answered line by line                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 5   | What is the `apps/web` build surface: package versions, PostCSS, Tailwind, Next, Vitest?                                                                        | code             | `code.md` §Q5                                                              | Answered; **no Tailwind config file exists** (`apps/web/postcss.config.mjs:3-4`)                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 6   | **Probe:** which numeric-scale colour utilities are used, and which compile to no CSS?                                                                          | code             | `code.md` Probe 1                                                          | Answered: 9 hits total — 7 `text-foreground-500`, 2 `border-default-200`, no others; both strings absent from the 424 650-byte compiled stylesheet                                                                                                                                                                                                                                                                                                                                                                                     |
| 7   | **Probe:** which token names and utility classes does HeroUI v3 actually define?                                                                                | code             | `code.md` Probe 2                                                          | Answered with the emitted declaration per class, and the list that emits nothing                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 8   | **Probe:** does Plus Jakarta Sans resolve through `next/font/google` here, and what does `layout.tsx` do today?                                                 | code             | `code.md` Probe 3, Probe 6                                                 | Answered: resolves in `next@16.3.6`; **the Geist variables are read by no rule anywhere**                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 9   | **Probe:** is an `@theme inline` block in `globals.css` picked up by the build?                                                                                 | code             | `code.md` Probe 4                                                          | Answered **yes**, with an emitted utility as evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 10  | **Probe:** what does `references/tokens.css` declare, and does any name collide?                                                                                | code             | `code.md` Probe 5                                                          | Answered: four HeroUI token overrides, ten category names, one `@theme inline` block; collisions named                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 11  | What does `ADR-0026` bind by key, what values does it fix, and what did it reject?                                                                              | contract         | `contract.md` §1                                                           | Answered: `FACT-3542`…`FACT-3561` enumerated; five rejected options listed                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 12  | What do the `design-system` skill and its references specify per pattern, and which patterns name a surface the application does not have?                      | contract         | `contract.md` §2                                                           | Answered: ten patterns specified; **five of them exist nowhere in the tree** — nav rail, side rail, hero banner, stat tile, category chip. Scoped to `references/patterns.md`; the rest of the skill is question 33                                                                                                                                                                                                                                                                                                                    |
| 13  | What bounds presentation: `ADR-0023`, `ADR-0025`, invariants 9-15/19, the `heroui-react` adapter?                                                               | contract         | `contract.md` §3                                                           | Answered, quoted verbatim; `AUDITED_PAGES` holds exactly three entries                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 14  | What does the data contract promise about what the dashboard and the forms display?                                                                             | contract         | `contract.md` §4                                                           | Answered across `FACT-2000`-`2079` and `FACT-1005`-`1011`                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 15  | Does the corpus promise anything about the visual surface outside `ADR-0026`?                                                                                   | contract         | `contract.md` §5                                                           | Answered: only `ADR-0025`'s floor (`FACT-3534`/`3536`/`3537`) and `FACT-0053`/`FACT-0054`; `docs/security.md` carries **no `FACT-` keys at all**                                                                                                                                                                                                                                                                                                                                                                                       |
| 16  | Which existing corpus facts would go stale if this change lands (`ADR-0021`/`ADR-0022`)?                                                                        | contract         | `contract.md` §6                                                           | Answered: `FACT-3542`, `FACT-3544`, `FACT-3560`, the `BL-031`/`BL-032` rows, and the Geist code state — **named, not retired**                                                                                                                                                                                                                                                                                                                                                                                                         |
| 17  | **Probe:** is `@phosphor-icons/react` present, what version/peer range/size, and does `pnpm audit --audit-level high` stay clean?                               | contract         | `contract.md` §Probe                                                       | Answered: absent from every `package.json` and from `pnpm-lock.yaml`; `2.1.10`, peers `react >= 16.8`; **0 vulnerabilities** in an isolated scratchpad install. Repo-wide audit **not** exercised — carried to Still unknown                                                                                                                                                                                                                                                                                                           |
| 18  | How many functional cases are there, by ID, and what does each assert?                                                                                          | tests            | `tests.md` §1                                                              | Answered: **28**, enumerated — 10 `AL-FN-*` + 13 `HD-FN-*` + 5 `SEC-FN-*`                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 19  | What do the accessibility cases assert, and what does `ADR-0025` fix about them?                                                                                | tests            | `tests.md` §2                                                              | Answered: `ACC-FN-01`…`ACC-FN-04` with pages, rules and thresholds                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 20  | Per surface: every locator any spec uses against it — which markup is load-bearing?                                                                             | tests            | `tests.md` §3                                                              | Answered per surface, by case ID and `path:line`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 21  | Which `apps/web` Vitest units exist, and does any touch rendering, class names, fonts or CSS?                                                                   | tests            | `tests.md` §4                                                              | Answered **negative**: four pure-logic specs under `src/lib`, none renders a component                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 22  | Which meta-tests would see a presentation change?                                                                                                               | tests            | `tests.md` §5                                                              | Answered: all ten `suite-integrity` rules are file/suffix/ID-pairing checks; none inspects markup or CSS                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 23  | Is there any check that would catch a dead class, a hard-coded colour, a wrong font, a contrast regression on an unvisited surface, or a missing `aria-hidden`? | tests            | `tests.md` §6                                                              | Answered **negative on all five**, each as a `Not found` with how it was searched                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 24  | How is a functional spec written here — fixtures, seed, ports, helpers?                                                                                         | tests            | `tests.md` §7                                                              | Answered                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 25  | What did `FT-004` and `FT-005` already change in these exact files?                                                                                             | history          | `history.md` §FT-004, §FT-005                                              | Answered with commits `38d86d4` and `3df3155` and their file lists                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 26  | What were `FX-039` and `CH-029`?                                                                                                                                | history          | `history.md` §FX-039, §CH-029                                              | Answered: `5624a7a` and `bf35f7a`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 27  | Which `FX-` rows concern styling, CSS, a class name, a token, contrast or a font?                                                                               | history          | `history.md` §Already broken here                                          | Answered: `FX-039` is the only one; found by the accessibility scan                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 28  | Do `BL-031`/`BL-032` conflict with any other open backlog row?                                                                                                  | history          | `history.md` §Conflicts                                                    | Answered: explicit with `BL-029` and `BL-032`; same-page overlap with `BL-008` and `BL-009`; **no** conflict with `BL-030`                                                                                                                                                                                                                                                                                                                                                                                                             |
| 29  | Has anything about styling, a design system, icons, fonts or a theme been rejected before?                                                                      | history          | `history.md` §Rejected                                                     | Answered **negative**: no matching entry in the Rejected section                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 30  | What is in the ADR log for `apps/web` presentation, and is any of it superseded?                                                                                | history          | `history.md` §Decisions                                                    | Answered: `ADR-0023`, `ADR-0025`, `ADR-0026` all accepted, none superseded                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 31  | What is the git history of each file the change would touch?                                                                                                    | history          | `history.md` §Recent changes                                               | Answered for **10 of 10** files (5 of 10 in the first pass). Two stop at `FT-004` and were never touched by `FT-005` — `apps/web/src/app/layout.tsx` and `src/components/logout-button.tsx`; `globals.css` stops at `FX-039`                                                                                                                                                                                                                                                                                                           |
| 32  | Does `docs/profiling/` hold a record for `FT-004` or `FT-005`?                                                                                                  | history          | `history.md` §Profiling                                                    | Answered **negative**: the only record is `docs/profiling/runs/2026-09-28-meetings-detail-participants.md`, which measures `FT-003`                                                                                                                                                                                                                                                                                                                                                                                                    |
| 33  | What does the `design-system` skill specify **outside** `references/patterns.md` — type, spacing, elevation, icons, motion, and where the language stops?       | contract         | `contract.md` §2.1                                                         | Answered: seven blocks quoted verbatim and line-cited from `SKILL.md` — the type scale (`:63-70`) and its three bullets (`:72-76`), the spacing rungs and the 44×44px target (`:90-93`), elevation incl. "Never both" (`:99-103`), icons (`:108-122`), motion (`:126-130`), and the "Where this language stops: the invariants outrank it" table (`:136-144`)                                                                                                                                                                          |
| 34  | Which of those decided numbers carry a `FACT-` key, and which exist only as skill prose?                                                                        | contract         | `contract.md` §2.1 per block, §Open questions                              | Answered: **keyed** — radius scale `FACT-3552`, family `FACT-3553`, icon library/weight/sizes/aria `FACT-3554`, elevation `FACT-3555`, shell `FACT-3556` (also `FACT-3547`, `FACT-3550`, `FACT-3560`). **Unkeyed anywhere** — the whole type scale and its three bullets, every spacing rung and padding, the 8px separation, the 44×44px target, all of motion, "No emoji as icons", the interim no-inline-SVG rule, the gamut sentence, the exact elevation utility strings                                                          |
| 35  | What asserts the current `Meeting` key set — i.e. what would a new field (such as one a category chip could label) have to move through?                        | contract + tests | `contract.md` §"What asserts the current `Meeting` key set", `tests.md` §8 | Answered: **three API cases** assert exact sorted key equality — `HD-API-01` (`e2e/regression/home-dashboard/home-dashboard.api.spec.ts:100`), `HD-API-20` (`:424`) and `MD-API-01` (`e2e/regression/meetings-detail/meetings-detail.api.spec.ts:97`), each against its own locally declared `MEETING_KEYS`; plus `FACT-1005`-`FACT-1012`, `FACT-2038`/`FACT-2042`-`FACT-2050`/`FACT-2063`, and `meeting.types.ts`, `meetings.mapper.ts`, `dto/create-meeting.dto.ts`. **No functional case** asserts the key set or a row's full text |
| 36  | **Probe:** does `@phosphor-icons/react` render inside a Server Component without `'use client'`, and what does it cost in the bundle?                           | code             | `code.md` Probe 7, `probes.md` Probe 7                                     | Answered **no through the default entry**: `next build` fails with `TypeError: (0 , c.createContext) is not a function`; the per-icon csr subpath fails identically; **`@phosphor-icons/react/ssr` passes** and prerenders the `<svg>`. Cost: **0 bytes** of client JS on the `/ssr` path (+1 413 B of HTML per icon), **+4 449 B** through the barrel inside a `'use client'` component                                                                                                                                               |

## Sweeps

Which subagent ran, on which model, over what. A thin file from a cheap model is a different fact
from a thin file from an expensive one — the first is fixable by re-running.

| Subagent              | Model                                                                                                  | Scope                                                                                                                                                                              | File                                                                                       | Converged after                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| `researcher-code`     | `opus` (raised from the `sonnet` default: six compile-and-grep probes over an interlinked CSS surface) | the ten `apps/web` files, the data reaching the UI, invariants 9-15/19 in situ, the build surface, and six probes                                                                  | [`code.md`](code.md) (+ [`probes.md`](probes.md), the throwaway probe code and raw output) | 32 files read, 45 tool calls; the last three greps returned nothing new    |
| `researcher-contract` | `sonnet` (default)                                                                                     | `ADR-0026` by key, the `design-system` skill and both reference files, `ADR-0023`/`ADR-0025`, invariants, the data contract, fact lifecycle, and the `@phosphor-icons/react` probe | [`contract.md`](contract.md)                                                               | 53 tool calls; `FACT-2000`-`2079` and `FACT-1005`-`1011` read exhaustively |
| `researcher-tests`    | `sonnet` (default)                                                                                     | every `*.functional.cases.md` and its spec, the accessibility cases, the per-surface locator inventory, the `apps/web` units, the meta-tests, and where coverage stops             | [`tests.md`](tests.md)                                                                     | 50 tool calls; all 28 functional cases enumerated individually             |
| `researcher-history`  | `haiku` (default — plain retrieval over the ledger, the backlog and git)                               | `FT-004`, `FT-005`, `FX-039`, `CH-029`, the `FX-` table, `BL-031`/`BL-032` and every other open row, the Rejected section, the ADR log, per-file git history, profiling            | [`history.md`](history.md)                                                                 | 24 tool calls                                                              |

No sweep came back thin enough to re-run at a higher model on the first pass.

### Re-run after the `FEAT-G1` review

The research review returned **accept after blockers** — one `shape`, two `correction`, plus findings
and one gap. The stage was re-run narrowly rather than from scratch: the `shape` blocker was a
coverage gap in one file, so each sweep was re-dispatched over only what the verdict named.

| Subagent              | Model on the re-run                                                                                                                                                | What it was re-dispatched over                                                                                                                                                                                                                                                          | Outcome                                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `researcher-contract` | `opus` (raised from `sonnet`: the blocker was a whole unswept specification, and the `FACT-`/prose split needed reading `ADR-0026` against the skill line by line) | `.claude/skills/design-system/SKILL.md` whole, the `FACT-` key question, the gamut statement, the type scale beside the headings in the tree, the dependency count, the `meeting.types.ts` path, the rationale-block wording, the profile names, and what asserts the `Meeting` key set | `contract.md` 382 → 718 lines; new §2.1, §2.2, §7 and the key-set subsection. Every line range the reviewer gave checked out; none was wrong |
| `researcher-code`     | `opus` (held from the first pass: the new probe is a build, not a grep)                                                                                            | the five mispointed citations, the gamut line in the `--accent` open question, Probe 7, and the relabelling of probe 5                                                                                                                                                                  | `code.md` 570 → 666, `probes.md` 337 → 657. Probe 7 ran five `next build`s in the scratchpad                                                 |
| `researcher-tests`    | `sonnet` (default — the finding was a framing fix and one case lookup)                                                                                             | the framing of the 28-case question, and what asserts the `Meeting` key set at the suite level                                                                                                                                                                                          | `tests.md` 334 → 399; §1 reframed, new §8                                                                                                    |
| `researcher-history`  | `sonnet` (**raised from the `haiku` default**: the first pass contradicted itself, which is the protocol's named reason to re-run at a higher model)               | the `layout.tsx` inconsistency and the five files missing from the git-history table                                                                                                                                                                                                    | `history.md` 235 → 244; the table now covers 10 of 10 files                                                                                  |

Two things the re-run found that the review did not ask for, recorded here because they bear on how
the first pass should be read:

- **The git-history table had a systematic undercount, not a single wrong row.** Besides the
  `layout.tsx` row the reviewer caught, three more counts were wrong in the same direction —
  `page.tsx` 3 → 5, `auth/login/page.tsx` 2 → 3, `create-meeting-form.tsx` 3 → 4 (`history.md`, the
  correction note above the table). `globals.css` checked out.
- **`code.md`'s "32 files read" was wrong independently of the eleven/ten slip** — the enumeration
  gives 35, plus the repository-root `package.json` cited in Q5 = **36** (`code.md:7`).

## Contradictions found

Both sides, with citations — **named, not resolved.**

1. **Two different values for `--accent`.** `apps/web/src/app/globals.css:36` sets
   `--accent: oklch(50% 0.195 253.83)` and its comment block (`globals.css:29-34`) cites `FX-039`
   and `ACC-FN-01` at `:32` as what fixed that value.
   `.claude/skills/design-system/references/tokens.css:20`
   sets `--accent: oklch(0.55 0.21 285)`, and `FACT-3549` states that value measures 5.15:1 against
   `--accent-foreground`. Each value carries its own stated measurement. The code sweep records both
   and resolves neither (`code.md` §Open questions).

   **A third statement bears on the same pair, and the two sides are therefore not symmetric.**
   Under "Traps this repository has actually hit",
   `.claude/skills/design-system/SKILL.md:156-158` says verbatim: "**A colour that looks right can be
   outside sRGB.** `oklch(0.50 0.195 253.83)` — the current `--accent` from `FX-039` — clips on
   conversion, so the rendered colour is not the declared one. Every value in the table above was
   checked in-gamut." That names the value live in `globals.css:36` specifically. Its status,
   recorded and not weighed: it carries **no `FACT-` key** — `ADR-0026` keys no equivalent, and
   `FACT-3558` keys only that the contrast numbers are computed from OKLCH, which is not a gamut
   claim — and it sits in no `Rationale` block, because `SKILL.md` contains none
   (`grep -c 'Rationale' .claude/skills/design-system/SKILL.md` → `0`). It is unkeyed skill prose,
   not corpus evidence under `ADR-0021` (`contract.md` §2.1.1, `code.md` §Open questions).

   **Still not resolved here.** Which value governs is a decision, and decisions belong to the design
   stage — Still unknown 3.

2. **`tokens.css` counts its own overrides differently from what it declares.**
   `.claude/skills/design-system/references/tokens.css:14` reads "Three values. Everything not
   listed here stays the library's default on purpose"; the `:root` block that follows overrides
   **four** HeroUI token names — `--accent` (`:20`), `--background` (`:23`), `--muted` (`:29`),
   `--radius` (`:35`) (`code.md` Probe 5).

3. **"The four existing pages" against what is in the tree.** `FACT-3560` and `docs/BACKLOG.md:30`
   (`BL-031`) both describe the work as "a rework of the four existing pages". The tree holds three
   `page.tsx` files — `apps/web/src/app/page.tsx`, `apps/web/src/app/auth/login/page.tsx`,
   `apps/web/src/app/auth/register/page.tsx` — plus two layouts and three components
   (`code.md` §Q1, which reads all ten files). The requirement as received names ten files.

4. **`FACT-3559`'s citation does not reach all 28 cases it counts.** `FACT-3559`
   (`docs/adr/ADR-0026-design-language.md:105-109`) states "All 28 functional cases passed
   unmodified" and cites only `e2e/regression/auth-login/auth-login.functional.spec.ts` and
   `e2e/regression/home-dashboard/home-dashboard.functional.spec.ts`. The tests sweep's direct
   enumeration gives 28 as 10 (`AL-FN-01`…`06`, `08`, `10`, `13`, `14`) + 13 (`HD-FN-01`…`11`,
   `14`, `16`) + **5 (`SEC-FN-01`…`05`, in `e2e/security/security.functional.cases.md`)** — a file
   the fact does not cite. `docs/CHANGELOG.md:38` (`FT-005`) states "28 functional … and 4
   accessibility" (`tests.md` §1, §Open questions).

5. **A component comment claims a structure the specs do not mechanically check.**
   `apps/web/src/components/meeting-list.tsx:10-11` states that `ul`/`li` is load-bearing;
   `HD-FN-04`/`05`/`09`/`14` assert only `getByRole('list')` / `getByRole('listitem')`
   (`tests.md` §3). The same shape appears at `apps/web/src/app/page.tsx:22-24`, whose comment
   asserts a "single text node" requirement stronger than what `getByText` enforces for `HD-FN-03`.

   The re-run found the same constraint stated as a rule of the design language, not only as a
   comment: the "Where this language stops" table at
   `.claude/skills/design-system/SKILL.md:136-144` holds the row "Splitting `Meetings total: 5`
   across elements for styling" → "`HD-FN-03` matches it as one text node" (`contract.md` §2.1.7).
   `FACT-1013` is the keyed statement behind the number itself. What no sweep found is a mechanical
   check of the single-text-node shape; the gap stands as recorded.

6. **Unscoped list locators against a pattern that adds a second list.**
   `e2e/regression/home-dashboard/home-dashboard.functional.spec.ts:223` asserts `toBeVisible()` on
   an unscoped `getByRole('list')` and `:254` counts an unscoped `getByRole('listitem')`; the
   navigation-rail pattern at `.claude/skills/design-system/references/patterns.md:58-69` is built
   from `ul`/`li`. What happens when both are on one page is not observable without a run, and this
   stage runs no suite (`code.md` §Open questions).

7. **Two cases locate the same alert differently.**
   `e2e/regression/auth-login/auth-login.functional.spec.ts:40-42` narrows with
   `page.getByRole('main').getByRole('alert')` — the case doc states App Router's route announcer
   sits outside `<main>`; `e2e/accessibility/accessibility.functional.spec.ts:77` (`ACC-FN-03`)
   uses an unnarrowed `page.getByRole('alert')` against the same page (`tests.md` §2, §Open
   questions).

8. **The corpus names a `Meeting` source file that is not on disk.** Corpus side:
   `docs/data-model.md:37` reads "**Source:** `apps/api/src/meetings/meetings.types.ts`; the key set
   is asserted by `HD-API-01`", and the same plural path is repeated at `docs/data-model.md:48`,
   `:56`, `:59`, at `docs/adr/ADR-0017-meeting-participants-strings.md:56` and at
   `docs/adr/ADR-0021-corpus-facts-are-keyed.md:30`. Tree side: the file is
   `apps/api/src/meetings/meeting.types.ts` (singular); the directory holds no `meetings.types.ts`,
   and `apps/api/src/meetings/meetings.mapper.ts:1` reads
   `import type { Meeting, MeetingDto } from './meeting.types.js';`. Nothing mechanical resolves it —
   `AR-API-11`…`AR-API-14` check key uniqueness, placement, that a keyed fact names a source, and
   that every `FACT-` reference resolves, not that a named source path exists (`contract.md` §7,
   C-1). Outside this change's surface; recorded because it was found, **not corrected** — a sweep
   cites, it does not fix the corpus.

9. **Three different `ui-ux-pro-max` profile names stand behind one font decision.** `FACT-3546`
   (`docs/adr/ADR-0026-design-language.md:28-32`) gives LMS / "Flat Design + Accessible & Ethical" /
   "Education Analytics Dashboard". `.claude/skills/design-system/SKILL.md:59-61` says the pairing is
   what the set returns for "Enterprise SaaS" and "Friendly SaaS". `docs/CHANGELOG.md:38` (`FT-005`)
   says the `--design-system` query returns "Minimalism & Swiss" for a dashboard. Of the three only
   `FACT-3546` carries a key; the other two are skill prose and a ledger entry. Nothing about the
   chosen family differs between them (`contract.md` §7, C-2).

10. **`CH-029` says `ADR-0026` fixes the type scale; `ADR-0026` states no type-scale fact.**
    `docs/CHANGELOG.md:72` (`CH-029`) reads that "`ADR-0026` fixes the palette, **the type scale**,
    the radii, the elevation, the icon library and the page shell". The ADR's keyed facts fix the
    radii (`FACT-3552`), the family (`FACT-3553`), the icon library (`FACT-3554`), the elevation
    (`FACT-3555`) and the shell (`FACT-3556`) — and state no size, leading, weight or utility at all.
    The type scale exists only in `.claude/skills/design-system/SKILL.md:63-70`, unkeyed
    (`contract.md` §2.1.2, question 34).

## Still unknown

What remains genuinely open after the sweeps. This is what the designer inherits as questions
rather than as silence.

1. **The category chip has no data source.** `Meeting` carries `id`, `title`, `startsAt`,
   `durationMinutes`, `participants` and nothing else — `apps/api/src/meetings/meetings.mapper.ts:11-19`,
   `apps/web/src/lib/types.ts`, `FACT-1005`-`FACT-1011`. `grep -rn "category"` over `apps/api/src`,
   `apps/web/src` and `docs/data-model.md` returns zero hits (`code.md`, `contract.md` §4). The
   pattern at `patterns.md` hard-codes an example string rather than naming a field. `FACT-3551`
   states the tints "label a category and never carry meaning alone: the text inside the chip is
   what says what it means" — what text, from what source, is not stated anywhere. **What a new field would have to move through
   is now recorded as evidence** (question 35): three API cases assert the exact key set with a
   sorted `toEqual` against a constant declared separately in each spec file — `HD-API-01`,
   `HD-API-20`, `MD-API-01` — alongside `FACT-1005`-`FACT-1012`, the `docs/api-contract.md` body and
   DTO facts, and `meeting.types.ts` / `meetings.mapper.ts` / `dto/create-meeting.dto.ts`. No
   functional case asserts the key set or a row's full text, so a chip added inside the existing
   `<li>` is addressed by no `HD-FN-*` locator (`tests.md` §8, `contract.md` §"What asserts the
   current `Meeting` key set"). **Whether a field should be added is not weighed here.**
2. **Four more patterns describe surfaces with no present source or precedent**: navigation rail,
   side rail, hero banner, stat tile (`contract.md` §2). What a navigation rail navigates between —
   the application serves three pages (`code.md` §Q1) — is not stated. `BL-030` records that pages
   have no machine-readable source list.
3. **Which `--accent` value governs** (contradiction 1). **Still open — this research does not pick
   a winner.** Three statements, now all recorded, and the documents are not symmetric:
   - `apps/web/src/app/globals.css:36` declares `oklch(50% 0.195 253.83)`, its comment block
     (`:29-34`) citing `FX-039` and `ACC-FN-01` at `:32` as what fixed it;
   - `.claude/skills/design-system/references/tokens.css:20` declares `oklch(0.55 0.21 285)`, and
     `FACT-3549` measures it at 5.15:1 against `--accent-foreground`;
   - `.claude/skills/design-system/SKILL.md:156-158` states that the **first** value "clips on
     conversion, so the rendered colour is not the declared one", and that every value in the skill's
     table "was checked in-gamut".

   Nothing in the corpus says which supersedes, and the gamut statement is unkeyed skill prose —
   `ADR-0026` keys no gamut fact (`FACT-3558` keys only that the ratios are computed from OKLCH).
   Under `ADR-0021` an unkeyed sentence is reasoning, not evidence, so the protocol's own case
   applies: **the corpus reasons about the rendered colour and states no fact about it.** The
   decision is the design stage's.

4. **Whether `pnpm audit --audit-level high` stays clean repository-wide** once
   `@phosphor-icons/react` enters `apps/web/package.json` and `pnpm-lock.yaml` is regenerated. Only
   an isolated scratchpad tree was audited — 0 vulnerabilities there (`contract.md` §Probe).
5. **Whether the navigation rail's `ul`/`li` collides with the unscoped list locators** of
   `HD-FN-*` (contradiction 6). Not observable without a run.
6. **Whether `FACT-3559` omitting `security.functional.spec.ts` is deliberate scoping or an
   incomplete citation** (contradiction 4).
7. **Nothing mechanical guards the language once applied.** No check exists for a utility class that
   compiles to no CSS, for a hard-coded colour literal, for the font family, for a missing
   `aria-hidden` on a decorative icon, or for contrast on any page or state outside the three in
   `AUDITED_PAGES` — `/auth/login`, `/auth/register`, `/` (`tests.md` §6, each line recorded with
   how it was searched). `FACT-3561` states the same absence. The create-meeting form's error state
   is never axe-scanned; the login form's is.
8. **No `apps/web` unit covers rendering, a class name, a token or a font** — the four Vitest specs
   under `src/lib` are pure logic (`tests.md` §4), and `vitest.config.ts:16` includes only
   `src/**/*.spec.ts`.
9. **`docs/security.md` carries no `FACT-` keys at all** (`contract.md` §5), so nothing in it is
   citable as evidence under `ADR-0021`.
10. **No profiling record exists for `FT-004` or `FT-005`** (`history.md` §Profiling), so there is
    no measured cost for the comparable prior UI rework.
11. **Overlap with open backlog items is recorded but not sized**: `BL-008` (`/auth/register` is a
    placeholder), `BL-009` (`HD-UT-10`, `HD-UT-12` and the UTC pin), `BL-029` (form error shape,
    explicitly excluded from `BL-031`) — `history.md` §Conflicts.
12. **Most of the design language's numbers are unkeyed skill prose, not corpus facts.** `ADR-0026`
    keys the radius scale (`FACT-3552`), the family (`FACT-3553`), the icon library, weight, sizes
    and `aria-hidden` rule (`FACT-3554`), the elevation rules (`FACT-3555`) and the shell
    (`FACT-3556`). It keys **nothing** for the whole type scale and its three bullets, any spacing
    rung or padding, the 8px adjacent-element separation, the 44×44px touch target, any of motion,
    "No emoji as icons", the interim no-inline-SVG rule, or the gamut sentence — searched by reading
    `ADR-0026` in full and grepping `docs/*.md` and `docs/adr/*.md` for `text-2xl`,
    `text-lg font-semibold`, `font-bold`, `65ch`, `12px`, `line height`, `spacing`, `gap-`, `p-5`,
    `touch target`, `44`, `ease-out`, `reduced-motion`, `motion`, `emoji`, `gamut`, `sRGB`, `clip`
    and `253.83` (`contract.md` §2.1, §Open questions). This is the protocol's named case — **the
    corpus reasons X and states no fact** — and under `ADR-0021` none of those values is citable as
    evidence. What that implies for the change is the design stage's to decide.
13. **The skill's icon example states no import specifier, and only one specifier builds.** The
    example at `.claude/skills/design-system/SKILL.md:112-115` writes
    `<House size={20} weight="regular" aria-hidden="true" />` and names no module path. Probe 7
    establishes that the default entry and the per-icon csr subpath both fail `next build` inside a
    Server Component, and `@phosphor-icons/react/ssr` passes (`code.md` Probe 7). Which specifier the
    language intends is stated nowhere — `FACT-3554` names the library and the weight, not an import
    path.
14. **No "First Load JS" figure is obtainable from this build.** `next@16.3.6` with Turbopack prints
    only the route list — no Size or First Load JS columns — and `--experimental-analyze` added
    none, so Probe 7's bundle numbers are a byte sum over `.next/static/**/*.js` instead
    (`probes.md` Probe 7). Recorded as the method it is, since a later stage may want the figure.

**Answered by the re-run, no longer open:** whether `@phosphor-icons/react` needs a client boundary
(question 36 / Probe 7), and whether the `design-system` skill specifies more than the ten patterns
(questions 33 and 34).
