# Bugfix: danger-contrast

> `FIX-S10`, correction pass (upload error text per `MF-FN-15`), full path, from [`research/`](research/README.md), [`design.md`](design.md), `ADR-0033`.

## 0. Orientation: what the project already has

- **Duplicate:** no matches — no `FX-` entry touches `--danger`; not a regression (`FX-039` overrode
  `--accent` only). **Same class as `FX-039` and `CH-029`**: a HeroUI v3 default failing AA, arriving
  without a diff as `ADR-0023` warned — `--danger` measures 3.57:1 on white, 3.25:1 on the canvas.
- **Conflicts with shipped:** `ACC-FN-03` goes red and is right; its spec waits on a bare
  `getByRole('alert')` against its own case text (`accessibility.functional.cases.md:76-79`) and
  `e2e/README.md:191-196`. `text-danger` sits on three `role="alert"` paragraphs (login,
  create-meeting, upload); `HD-FN-06`/`-07` and `MF-FN-06` locate them by role, so markup stays.
- **Conflicts with planned:** no matches for an open `BL-` item on `--danger` or contrast. Adjacent:
  `BL-034` (colour literals; the fix stays a token), `BL-030` (pages, not error states), `BL-029`.
- **Architecture impact:** the bar is `ADR-0025` (axe, WCAG 2.1 AA). `ADR-0026` never mentions
  `--danger`; "stays HeroUI's default" is unkeyed text in `design-system/SKILL.md:41-43` (Q-U5), and
  its gate fact `FACT-3558` names `ACC-FN-01`, which never renders an error. `ADR-0033` (proposed,
  amends `ADR-0026` in part) decides both overrides and the new gate (`FACT-3684`…`FACT-3692`);
  `FACT-3558` retires into `ADR-0026`'s register per `ADR-0022`.
- **Open questions:** Q-U1 (why `37930853945` went green on retry #2) is answered in part — a bare
  wait lets the scan run before the paragraph exists (`FIX-S2`: 3/5 red bare, 5/5 on the text) — and
  is not proven for CI. Q-U4 (announcer in `next` 16.3.6) stays open; the `main`-scoped wait moots it.

## 1. Reproduction

| What        | Value                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------------- |
| Command     | CI run `38429549429`; locally the `FIX-S2` probe waiting on the error text (`research/tests.md`)        |
| Expected    | zero axe violations on the login error state (`ACC-FN-03`, `ADR-0025`)                                  |
| Actual      | `color-contrast` 3.56:1, `#ff383c` on `#ffffff`, on `<p class="text-danger text-sm" role="alert">`      |
| Stability   | CI red 3/3 (`38429549429`, `37127168216`), 2/3 (`37930853945`); local 0/5 committed spec, 5/5 text wait |
| Environment | nothing special; the variance comes from the wait, not the machine                                      |

## 2. Cause

- **Cause:** `--danger` is HeroUI's default, never overridden (`globals.css:19-40`), and fails AA on
  both surfaces it renders on; `ACC-FN-03`'s bare wait can be met before the paragraph exists, so
  the scan sometimes misses the error DOM; and the corpus gate (`FACT-3558`) never reaches an error.
- **Localized by** the `FIX-S2` probe (bare vs text wait), P1/P2, CI logs (P3). **Since** `38d86d4` (2026-10-01).

## 3. Impact

- **What else rests on this cause:** the create-meeting (white `Card`, 3.57) and upload (canvas,
  3.25) errors; the primary `Button` hover at 4.22:1 (`FACT-3686`), logged inside `ACC-FN-03`.
- **Visible:** low-contrast error text on three forms, no workaround. **Security:** none. **Urgency:** `P1` (`main` red).

## 3a. Corpus facts this fix adds or retires

| Fact                    | Adds or retires                                     | Where                      | Task |
| ----------------------- | --------------------------------------------------- | -------------------------- | ---- |
| `FACT-3684`…`FACT-3692` | added by the designer, already written              | `ADR-0033`                 | —    |
| `FACT-3558`             | retired by `FACT-3691`, verbatim, Recorded `FX-049` | `ADR-0026` "Retired facts" | T4   |
| `FACT-3545`             | stays — history, still true; no key taken here      | `ADR-0026`                 | —    |

## 4. Why it was not caught earlier

- **Which check should have caught it:** `ACC-FN-01`/`-02` scan pages as loaded; `ACC-FN-03` saw the
  error DOM only when the race went its way, and retries turned one red into "1 flaky". The "strict
  mode in every error case" claim told authors a bare locator fails loudly; it can pass silently.
- **What we do about it:** the text wait, error-state cases `ACC-FN-05`/`-06` (T1, T2), a `BL-` row (§7).

## 5. Fix plan

| ID  | Role                            | What to do                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Files                                                                                                                                                                                         | Done when                                                                                                                                                                                                                                                                                                     | Depends on |
| --- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| T1  | `test-designer` (`FIX-S5`)      | `ACC-FN-03` (changed) and `ACC-FN-05` (create-meeting) are already written; **only `ACC-FN-06` remains**: as `teacher` (`authedPage`), `/meetings/<GEOMETRY_WORKSHOP_MEETING_ID>` (`mtg-teacher-3`, `teacher`-owned, `e2e/fixtures/seed.ts:111-118`), press "Upload" with no file; wait for `getByRole('main').getByRole('alert')` with text `file is required` — an empty selection submits a `File`, not `null`, so the action's "Choose a file to upload" branch (`meeting-files.ts:42-43`) is unreachable from the UI and Nest answers 400 (`MF-FN-15`, `meeting-files.functional.cases.md:219-235`); scan (canvas); no row created, no `@mutating` | `e2e/accessibility/accessibility.functional.cases.md`                                                                                                                                         | `ACC-FN-06` Steps name the `main`-scoped locator and `file is required`; the summary table lists `ACC-FN-06` beside `-03` and `-05`                                                                                                                                                                           | —          |
| T2  | `tester-functional` (`FIX-S5`)  | spec `:83` per `ACC-FN-03`, new tests `ACC-FN-05` and `ACC-FN-06`; `pnpm scenarios:index` (`PR-API-07`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `e2e/accessibility/accessibility.functional.spec.ts`, `e2e/scenarios-index.md`                                                                                                                | `pnpm e2e --project=web --grep "ACC-FN-0[356]" --repeat-each=5 --workers=1` → **15/15 red**, each at the violations assertion with `color-contrast` on the `text-danger` paragraph (≈3.56 white, ≈3.25 canvas); zero strict-mode or timeout failures; the hand-back counts runs that also log the button pair | T1         |
| T3  | `tester-functional`             | correct the false claim (§7)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `e2e/README.md`, `e2e/regression/auth-login/auth-login.functional.spec.ts`                                                                                                                    | `grep -rn "every error case" e2e` → no hits; the `main`-scoped prescription unchanged                                                                                                                                                                                                                         | —          |
| T4  | `implementer-web` (`FIX-S6`)    | `:root` gains `--danger`, `--accent-hover` (`FACT-3688`, `FACT-3689`) with ratio comments; ":15 Four values" → six (`FACT-3692`). Same task, so restated values cannot drift (precedent `fb94ca2`): `design-system/SKILL.md` table rows (`--danger` white 5.42, canvas 4.93; `--accent-hover` under `--snow` 6.38), `:41-43` list and count, `:26` and "The gate" (`FACT-3691`); `references/tokens.css` two declarations; `FACT-3558` to `ADR-0026`'s register; `pnpm fact:lock`                                                                                                                                                                       | `apps/web/src/app/globals.css`, `.claude/skills/design-system/SKILL.md`, `.claude/skills/design-system/references/tokens.css`, `docs/adr/ADR-0026-design-language.md`, `docs/facts-lock.json` | T2's command → 15/15 green; `pnpm fact:check` exits 0; `FACT-3558` in `ADR-0026` only in the register; `git diff --stat apps/web` lists `globals.css` alone                                                                                                                                                   | T2         |
| T5  | `tester-acceptance` (`FIX-S7`)  | control: revert both overrides → T2's command 15/15 red on contrast → restore; then revert `--accent-hover` only, record N/15. `FX-049`: `Path: full (docs/plans/danger-contrast)`, "Found by" CI, Commit `` `pending` ``; the `BL-` rows of §7                                                                                                                                                                                                                                                                                                                                                                                                         | `docs/CHANGELOG.md`, `docs/BACKLOG.md`                                                                                                                                                        | both legs and counts in `FX-049`; `git diff apps/web` equals T4's after restore                                                                                                                                                                                                                               | T3, T4     |
| T6  | `lead` (`FIX-S7`)               | one `pnpm verify`, after T5 so `LG-API-07` checks `FX-049`'s marker                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | —                                                                                                                                                                                             | green in one run                                                                                                                                                                                                                                                                                              | T5         |
| T7  | `tester-acceptance` (`FIX-S11`) | profiling record                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `docs/profiling/runs/2026-10-13-danger-contrast.md`                                                                                                                                           | cites only stage IDs in `docs/process.md` (`AR-API-10`)                                                                                                                                                                                                                                                       | T6         |

T2 and T3 share a role, no file; T1 → T2 → T4 is red-before-fix. **Not touched:** component markup;
`patterns.md:191` (a token fix leaves it true); `--danger-hover`, `*-soft` (`FACT-3690`); `ADR-0033`'s status.

## 5a. Tests this fix is expected to break

| Case ID                               | Why it goes red                            | Closed by task |
| ------------------------------------- | ------------------------------------------ | -------------- |
| `ACC-FN-03`, `ACC-FN-05`, `ACC-FN-06` | `--danger` below 4.5:1 on white and canvas | T4             |

## 6. Verification

Red before the fix: T2, 15/15 (`ACC-FN-03`/`-05`/`-06` × 5). Control: T5. Acceptance: T6, one `pnpm verify`.

## 7. Risks and deliberate omissions

- **Decided: the "strict-mode in every error case" claim is corrected here (T3), not a `BL-` row.**
  A wrong document on the cause's path (§4); `bugfix-pipeline` §7 corrects it in the same change. The
  replacement states only what CI proves: a bare locator can fail with strict mode or pass with no
  form alert, depending on when the announcer mounts (`37930853945`).
- **Decided: a `BL-` row is filed (T5)** for a check that every rendered error state of `apps/web`
  is scanned: `FACT-3691` makes the gate "every state that renders it", yet a fourth `text-danger`
  use would be scanned by nothing. Conflicts with: `BL-030`. Its shape is not decided here.
- **`--accent-hover` may have no deterministic red test** — CI logged the pair in 2 of 3 runs. T5's
  second leg measures it; at 0/15 `FX-049` says so and T5 files a `BL-` row for the gap.
- **`FX-049` is expected;** if another `FX-` lands first, T4's register cell moves with T5. **`ADR-0033`
  stays `proposed`:** no step of the bugfix flow names who accepts it — the lead's call.
