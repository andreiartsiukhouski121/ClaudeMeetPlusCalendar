# Research: danger-contrast

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

Bugfix flow, research stage (stage `FIX-S8`), first pass. `ACC-FN-03` failed in CI run
`38429549429` on all three attempts: axe `color-contrast` 3.56:1 (`#ff383c` on `#ffffff`, 14px) on
the login form's `<p class="text-danger text-sm" role="alert">`. The earlier bugfix steps
(`FIX-S1` orientation, `FIX-S2` reproduction, `FIX-S3` cause, `FIX-S4` impact) handed over findings
to **verify and record**, not to copy: no `--danger` override in `apps/web`, three `text-danger`
uses, a bare `getByRole('alert')` at spec `:83` that Next's route announcer satisfies, and the
history and corpus links. No API or data impact, so no contract sweep.

## Questions asked of the project

| #   | Question                                                                                | Area    | Answered in                            | Outcome                                                                                                              |
| --- | --------------------------------------------------------------------------------------- | ------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 1   | Does `apps/web` override `--danger`?                                                    | code    | `code.md` "The token"                  | **Not found** — `globals.css:19-40` overrides `--accent`, `--background`, `--muted`, `--radius` only                 |
| 2   | What is HeroUI's default `--danger` and its contrast on white and on the canvas?        | code    | `code.md`, `probes.md` P1              | `variables.css:106`; 3.57:1 on white, 3.26:1 on `#f4f4f7` (computed); axe reports 3.56:1                             |
| 3   | Where is `text-danger` used, and on what surface?                                       | code    | `code.md` "The three uses"             | three `<p role="alert">`: login (`bg-surface`), create-meeting (`Card`), upload (page canvas, no card)               |
| 4   | Does any keyed corpus fact or ADR decide `--danger`?                                    | history | `history.md` "The ADR log"             | **Not found** in `docs/adr/`; the only statement is unkeyed, `design-system/SKILL.md:41-43`                          |
| 5   | What does the design-system skill prescribe for an error paragraph?                     | code    | `code.md`                              | `references/patterns.md:190-194`, `text-danger text-sm`                                                              |
| 6   | Which a11y cases scan an error state?                                                   | tests   | `tests.md`                             | only `ACC-FN-03`, login form only                                                                                    |
| 7   | Are the create-meeting and upload error states scanned?                                 | tests   | `tests.md`                             | **Not found**                                                                                                        |
| 8   | What locator does `ACC-FN-03` wait on, and what do the docs prescribe?                  | tests   | `tests.md` "The `ACC-FN-03` locator"   | spec `:83` bare `getByRole('alert')`; cases `:76-79`, `e2e/README.md:191-196` prescribe `main`-scoped; only offender |
| 9   | What is Next's route announcer and when does it mount?                                  | code    | `code.md` "Next.js route announcer"    | `app-router-announcer.js:15-35`, `role='alert'`, 1px clip, created in `useEffect`                                    |
| 10  | What did CI record for `ACC-FN-03`, and since when?                                     | tests   | `tests.md` "CI evidence", `history.md` | red since 2026-10-03 (`37127168216`), flaky-green 2026-10-09 (`37930853945`), red 2026-10-13 (`38429549429`)         |
| 11  | Which commits touched the spec, the case text, the locator rule, `text-danger`, `next`? | history | `history.md` "Git"                     | `5624a7a`, `18b27f6`, `38d86d4`, `08fbdf1`                                                                           |
| 12  | What changed between the last green and the failing CI run?                             | history | `history.md` "Git"                     | **Not found:** any `apps/web` source, `e2e/accessibility`, Playwright config or lock-file change                     |
| 13  | Does the ledger or backlog already hold this defect or a same-class one?                | history | `history.md`                           | same class: `FX-039`, `CH-029`; **Not found:** a `BL-` or ledger entry about `--danger` or `ACC-FN-03`               |
| 14  | Does the Rejected section hold anything related?                                        | history | `history.md`                           | **Not found**                                                                                                        |
| 15  | Does the announcer differ between `next` 16.3.6 and 16.3.8?                             | code    | `code.md`                              | **Not found** — 16.3.6 not installed, not fetched                                                                    |

## Sweeps

| Subagent              | Model   | Scope                                                         | File                    | Converged after                                                                                                                                                                                          |
| --------------------- | ------- | ------------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `researcher-history`  | `haiku` | ledger, backlog, Rejected, ADR log, git for the touched files | `history.md`            | one pass; **rewritten by the `researcher` (`opus`)** — the pass cited the change folder's plan as evidence, put `CHANGELOG.md:179` in `BACKLOG.md`, and carried the plan's conclusions as contradictions |
| `researcher` (self)   | `opus`  | code: the token, its uses and surfaces, the announcer         | `code.md`, `probes.md`  | one pass                                                                                                                                                                                                 |
| `researcher` (self)   | `opus`  | tests: a11y cases, the locator, CI logs of three runs         | `tests.md`, `probes.md` | one pass; suite **not run**                                                                                                                                                                              |
| `researcher-contract` | —       | not dispatched — no API or data impact (lead's brief)         | —                       | —                                                                                                                                                                                                        |

## Contradictions found

1. **The `ACC-FN-03` locator.** `accessibility.functional.cases.md:76-79` and `e2e/README.md:191-196`
   prescribe `getByRole('main').getByRole('alert')`; the spec at `accessibility.functional.spec.ts:83`
   uses bare `getByRole('alert')` (`tests.md`).
2. **"Strict-mode violation in every error case" versus the CI log.** `e2e/README.md:194-196` and
   `auth-login.functional.spec.ts:31-34` state that a bare `getByRole('alert')` is a strict-mode
   violation in every error case. In runs `38429549429`, `37930853945` and `37127168216` the
   `ACC-FN-03` failures are at spec `:85` (the violations assertion); no strict-mode error appears
   (`tests.md`, `probes.md` P3).
3. **Which case decides a token.** `FACT-3558` (`ADR-0026:90-93`) names `ACC-FN-01` as what decides a
   token change; `ACC-FN-01` scans pages with no form submitted (spec `:50-56`), and the `--danger`
   paragraphs exist only after a submit (`code.md`).
4. **Override count.** `globals.css:15` says "Four values"; `design-system/SKILL.md:43` says "three
   overrides" (`code.md`).

## Contradictions with the earlier stages' findings

- `FIX-S3` "spec unchanged since `5624a7a` (2026-10-02)": the file's last commit is `18b27f6`
  (2026-10-07); the `ACC-FN-03` body (`:76-86`) is attributed to `5624a7a` only (`history.md` "Git").
- `FIX-S2`/`FIX-S3` framed the red as today's ("no code change explains today's red"): CI shows
  `ACC-FN-03` red on all three attempts on 2026-10-03 (`37127168216`) and flaky — red, red, green —
  on 2026-10-09 (`37930853945`), with the same 3.56 violation (`tests.md`). The 2026-10-09 run
  postdates `08fbdf1`, and the 2026-10-03 run predates it.
- `FIX-S3` cites the announcer at `app-router-announcer.js:14-33`; the installed file has the
  element construction at `:15-35` (`code.md`). Content matches.
- `FIX-S3` "3.57 on white" and CI's 3.56: both reproduced (`probes.md` P1); not a contradiction,
  the 0.01 gap is unexplained.

Everything else handed over was confirmed: no `--danger` override; HeroUI `variables.css:106`; the
three uses at `login-form.tsx:47`, `create-meeting-form.tsx:52`, `upload-file-form.tsx:54`, the last
on the canvas; 3.26:1 on `#F4F4F7`; the cases doc and `e2e/README.md` forbid the bare locator and
`ACC-FN-03` is the only offender; `08fbdf1` is the `next` bump; `SKILL.md:41-43` unkeyed;
`patterns.md:191`; the two uncovered error strings; `FX-039` and `CH-029` as same-class entries; no
`BL-` item.

## Still unknown

- **Q-U1.** Why `ACC-FN-03` was green on retry #2 in `37930853945` and red on every attempt in
  `37127168216` and `38429549429`. The repository records nothing that answers it; the
  announcer-race explanation rests on `FIX-S2`'s local runs, which are not in the repository.
- **Q-U2.** A second `color-contrast` violation was logged on the "Sign in" submit button in its
  focused/hovered state: 4.49:1, `#fcfcfc` on `#7360e7` (`37930853945`, once in `37127168216`;
  absent from `38429549429`'s failed log). Computing `--accent-hover` from the tokens gives
  `#7766e8`, 4.21:1 (`probes.md` P2). Neither the colour difference nor whether this is in scope is
  answered by anything in the repository.
- **Q-U3.** The contrast of `--danger` on the create-meeting form's `Card` surface — not computed;
  the `Card` background token was not resolved.
- **Q-U4.** Whether `next` 16.3.6 and 16.3.8 differ in the announcer — 16.3.6 not inspected.
- **Q-U5.** No keyed fact or ADR states what `--danger` is or must be; the only statement is the
  unkeyed `design-system/SKILL.md:41-43`.
