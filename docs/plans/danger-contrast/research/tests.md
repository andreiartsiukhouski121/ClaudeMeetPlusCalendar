# Research: tests — danger-contrast

> Written by the `researcher` directly (no `researcher-tests` subagent), model `opus`. The suite was
> **not run** in this sweep. Local run results below are the `FIX-S2` stage's report, recorded as
> such and not reproduced here.

## What scans an error state

- `e2e/accessibility/accessibility.functional.spec.ts` is the only file under `e2e/` or `apps/`
  importing `AxeBuilder`/`axe-core` (`grep -rln "AxeBuilder\|axe-core" e2e apps --include=*.ts`).
- `ACC-FN-01` (spec `:50-56`) scans `PUBLIC_PAGES`; `ACC-FN-02` (`:58-74`) scans `SESSION_PAGES`;
  both scan pages as loaded, with no form submitted. `AUDITED_PAGES` (`:25-30`) lists `/auth/login`,
  `/auth/register`, `/`, `/meetings/<GEOMETRY_WORKSHOP_MEETING_ID>`.
- `ACC-FN-03` (spec `:76-86`; cases `accessibility.functional.cases.md:73-82`, P1, tag column
  "—" in the summary table `:45`) is the only case that submits a form before scanning, and
  it submits only the login form.
- **Not found:** a case scanning the create-meeting form's error state ("Enter a meeting title",
  `apps/web/src/lib/actions/meetings.ts:37`) or the upload form's error state ("Choose a file to
  upload", `apps/web/src/lib/actions/meeting-files.ts:43`) — searched every `ACC-` case in
  `accessibility.functional.cases.md` and every `AxeBuilder` use.
- Those two error states are asserted functionally, not for contrast: `MF-FN-06` "a refused upload
  shows one `role="alert"` and adds no row" (`e2e/regression/meeting-files/meeting-files.functional.cases.md:50`,
  `:117`); `create-meeting-form.tsx:17` names `HD-FN-06`/`HD-FN-07` as the cases its markup serves.
- **Not found:** any assertion on `--danger`, `text-danger` or `color-contrast` outside the axe scan
  — searched `grep -rn "text-danger\|--danger\|color-contrast" e2e apps/web/src` over `*.ts`/`*.md`.

## The `ACC-FN-03` locator

- Spec `:83`: `await expect(page.getByRole('alert')).toBeVisible();` with the comment at `:82`
  "Scanning before the live region exists would scan the same DOM as ACC-FN-01."
- Cases `:76-79`: wait for the form's alert "located as `getByRole('main').getByRole('alert')`,
  **never** as a bare `getByRole('alert')`, because App Router keeps its own hidden `role="alert"`
  route announcer outside `<main>` and a page-wide locator matches both".
- `e2e/README.md:191-196`: a bare `getByRole('alert')` "is a strict-mode violation in **every** error
  case. Locate a form error as `getByRole('main').getByRole('alert')`."
- `e2e/regression/auth-login/auth-login.functional.spec.ts:31-34`: the bare locator "causes a strict
  mode violation ("resolved to 2 elements") in every error case. Verified by a run, not assumed."
- `e2e/regression/meeting-files/meeting-files.functional.spec.ts:54-61`: `formAlert` is
  `page.getByRole('main').getByRole('alert')`.
- `grep -rn "getByRole('alert')" e2e`, excluding the `main`-scoped form: the only code hit is
  `accessibility.functional.spec.ts:83`; the rest are comments and docs (the four citations above,
  plus `auth-login.functional.cases.md:17`, `meeting-files.functional.cases.md:17`). The
  `main`-scoped form appears 6 times under `e2e/`.

## CI evidence

Run `38429549429` (commit `f8cd6ab`, 2026-10-13, job "E2E, whole suite"; `gh run view --log-failed`):

- Attempts 119, 120 (retry #1), 121 (retry #2) of `accessibility.functional.spec.ts:76:7 › ACC-FN-03`
  all `✘`.
- Each failure is `Error: the login error state has violations` at spec `:85:78`.
- The violation each time: `color-contrast (serious)` on
  `<p class="text-danger text-sm" role="alert">Invalid email or password</p>`, "insufficient color
  contrast of 3.56 (foreground color: #ff383c, background color: #ffffff, font size: 10.5pt (14px),
  font weight: normal). Expected contrast ratio of 4.5:1".
- **Not found:** a strict-mode ("resolved to 2 elements") error at spec `:83` in this run — searched
  the failed log for `strict mode`.

Run `37930853945` (commit `18583b3`, 2026-10-09; `gh run view --log`, conclusion `success`):

- `ACC-FN-03` attempts 118 `✘`, 119 (retry #1) `✘`, 120 (retry #2) `✓`; summary "1 flaky",
  "166 passed (1.5m)".
- Violations logged: the same 3.56 `#ff383c`/`#ffffff` line twice, and one `color-contrast` line
  "insufficient color contrast of 4.49 (foreground color: #fcfcfc, background color: #7360e7, …
  14px …)" on `<button data-slot="button" class="button button--full-width button--md button--primary" … type="submit" … data-focused="true" data-hovered=…`.

Run `37127168216` (commit `2c84730`, 2026-10-03, conclusion `failure`):

- `ACC-FN-03` (then at spec `:70:7`) attempts 94, 95, 96 all `✘`, `Error: the login error state has
violations`; the 3.56 `#ff383c`/`#ffffff` line on the same `<p>`; the 4.49 button line appears
  once in the failed log.

Run `36992192998` (commit `829c69c`, 2026-10-02, `success`) predates the spec: `5624a7a` is not an
ancestor of `829c69c` (`git merge-base --is-ancestor`).

## Local runs reported by `FIX-S2` (not re-run here)

- Reported: the committed spec 0/5 red locally; a probe with the same bare wait 3/5 red; with the
  login POST delayed 300/1500 ms 0/5 red; waiting for the error text 5/5 red. The probe file is
  outside the repository, at
  `C:\Users\User\AppData\Local\Temp\claude\C--GIT-PurpleSchool\f097de28-2cfd-4a00-a282-3957c798d492\scratchpad\probe.functional.spec.ts`;
  it exists, and its `PROBE_FIXED=1` branch waits on `getByText('Invalid email or password')`, the
  other on bare `getByRole('alert')`, and it logs `pPresentAtScan` and `alertsAtScan`.
- **Not found:** the output of those local runs in the repository — they exist only in the `FIX-S2`
  hand-back.
