# Design: danger-contrast

> Bugfix design (`FIX-S9`), first pass. It carries an ADR, so it exceeds the 50-line bugfix budget;
> the decision itself lives in `ADR-0033` and is cited here rather than restated.

## 1. What the research established

- `--danger` is HeroUI's default, unoverridden, 3.57:1 on white and 3.26:1 on the canvas —
  [`code.md`](research/code.md) "The token", [`probes.md`](research/probes.md) P1.
- Three `text-danger` uses: login (white), create-meeting (`Card`), upload (canvas) — `code.md`
  "The three uses". Only the login one is scanned — [`tests.md`](research/tests.md).
- `ACC-FN-03` waits on a bare `getByRole('alert')`, against its own case text and `e2e/README.md`
  — `tests.md` "The `ACC-FN-03` locator"; README contradictions 1 and 3.
- CI also logged the focused/hovered "Sign in" at 4.49:1; `--accent-hover` computes to 4.21:1 —
  `code.md` last section, `probes.md` P2, README Q-U2.

## 2. The shape

- **`apps/api`:** nothing.
- **`apps/web`:** `globals.css` `:root` gains two overrides, `--danger` and `--accent-hover`, with
  ratio comments, and its block comment "Four values" (`:15`) becomes six (`FACT-3692`). No
  component, page, action or class changes — every use keeps `text-danger` and `Button`'s default
  variant. Values and ratios: `FACT-3688`, `FACT-3689`; derived danger tokens untouched: `FACT-3690`.
- **Tests (shape only; cases by `test-designer`, specs by `tester-functional`):**
  - `ACC-FN-03` waits for `getByRole('main').getByRole('alert')` **with the text** "Invalid email
    or password" before scanning, as `accessibility.functional.cases.md:76-79` and
    `e2e/README.md:191-196` already prescribe. The pointer is not moved off the button.
  - Two new error-state scans in `e2e/accessibility/`, built the same way: the create-meeting form
    on `/` submitted with an empty title ("Enter a meeting title", on a white `Card`) and the upload
    form on `/meetings/<GEOMETRY_WORKSHOP_MEETING_ID>` submitted with no file chosen, which reaches
    Nest and comes back as its 400 `file is required`, shown verbatim in the same `text-danger`
    paragraph (`upload-file-form.tsx:54`) on the canvas — `MF-FN-15`,
    `meeting-files.functional.cases.md:219-235`; the action's "Choose a file to upload" branch
    (`lib/actions/meeting-files.ts:42-43`) is unreachable from the browser. Neither creates a row.
    Both are red on current code (3.57 and 3.25).
- **Not corpus, same change:** `design-system/SKILL.md` — measured rows for `--danger` (white,
  canvas) and `--accent-hover` (under `--snow`) in the table at `:30-39`; `--danger` out of the
  "HeroUI's default" list and the count corrected at `:41-43`; `:26` and "The gate" name the
  error-state scans next to `ACC-FN-01`. `references/tokens.css` gains the two declarations.

**Skills used.** `design-system`: the canvas, `--accent`, `--snow` and the "component never names a
colour" rule — the values above are added to its table, not chosen outside it. `ui-ux-pro-max`
(`search.py "error message color contrast" --domain ux`): 4.5:1 for normal text, and "red text +
error icon" — the paragraph's text already carries the meaning, so no icon (§8). `heroui-react`: no
`Alert`, `FieldError` or `isInvalid` — the refused patterns stay refused; the tokens are HeroUI's own.

## 3. Contract

No HTTP contract changes. No accessible name changes (`FACT-3559`).

## 4. Data

No entity, field or seed changes. The new scans use the seeded teacher and meeting; nothing mutates.

Computed by `scratchpad/design-contrast.mjs` — OKLCH → OKLab → linear sRGB (Ottosson), 8-bit hex,
WCAG 2.x luminance (the hex step makes the canvas 3.25 and hover 4.22 where P1/P2 printed 3.26/4.21):

```
HeroUI default --danger oklch(0.6532 0.2328 25.74) #FF383C inGamut=true | on white 3.57 | on canvas 3.25
--danger oklch(0.55 0.21 25.74) #D01C27 inGamut=true | on white 5.42 | on canvas 4.93 | snow on it 5.28 | --danger-hover #D8403E snow on it 4.33
HeroUI --accent-hover #7766E8 snow on it 4.22
CI-observed #7360E7 snow on it 4.49
fraction of accent->hover per RGB channel 0.67 0.68 0.75
candidate --accent-hover oklch(0.5 0.21 285) #5F42D3 inGamut=true snow on it 6.38
```

Margin on the binding surface (canvas): 4.93 − 4.5 = 0.43, against a 0.01 gap between `axe` and
computation (`code.md`).

## 5. Alternatives rejected

| Alternative                                                        | Why not                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fix the token only, leave `ACC-FN-03`'s wait as is                 | The bare locator is also satisfied by Next's route announcer (`code.md` "Next.js route announcer"), so a green run would not prove the error DOM was scanned.                                                                                           |
| Fix the locator only                                               | A deterministic scan of the error DOM is deterministically red at 3.57.                                                                                                                                                                                 |
| Leave the two other error states unscanned                         | A white-only value (`oklch(0.58 0.21 25.74)`, 4.77 white / 4.35 canvas) would turn `ACC-FN-03` green and leave upload failing; nothing would see it — the miss `FACT-3687` records.                                                                     |
| Q-U2 as a separate `BL-` item                                      | The hover state is on the DOM `ACC-FN-03` scans by construction (spec `:81` clicks the button; the log records `data-focused="true"`), and it already failed the case once (`tests.md`, `37930853945`). Token-only, the case would stay able to go red. |
| Others (per-component class, `Alert`, pointer move, lighter hover) | `ADR-0033`, "Rejected".                                                                                                                                                                                                                                 |

## 6. Decisions and ADRs

`ADR-0033` (proposed): overrides `--danger` and `--accent-hover`, and replaces `ADR-0026`'s gate
fact. It amends `ADR-0026` in part rather than superseding it — `AR-API-04` would require the whole
record's status to become `superseded`, and its other facts stand.

**Corpus keys.** Added: `FACT-3684`…`FACT-3692` (`ADR-0033`). Retired: `FACT-3558` → successor
`FACT-3691`, moved into `ADR-0026`'s "Retired facts" register in this change (`ADR-0022`); this
design wrote only the new record, so that move is a task for the plan. Nothing else retires:
`FACT-3545` ("darkened until `ACC-FN-01` passed") is history and stays true; `SKILL.md:41-43` is
unkeyed (README Q-U5) and is simply edited.

## 7. Impact on what already exists

| Artifact family                       | Grep or command run                                                                                                  | IDs returned                                                                                                                                        |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing specs and case preconditions | `grep -rn "text-danger\|--danger\|accent-hover\|color-contrast\|toHaveCSS" e2e --include=*.ts`                       | none — no spec asserts a colour; `ACC-FN-03` changes (above); `HD-FN-06`/`-07`, `MF-FN-06` locate the same alerts by role, untouched                |
| Corpus keys                           | `grep -rn "FACT-3558\|danger\|accent-hover\|ACC-FN-0[1-3]\|three overrides\|Four values"` over the corpus and skills | `FACT-3558` (retired, §6), `FACT-3545` (stays); `design-system/SKILL.md:26,41,43`; nothing in `architecture.md`, `data-model.md`, `api-contract.md` |
| Hand-kept lists                       | `AUDITED_PAGES` (`spec:25`), `KNOWN_CASE_PREFIXES` (`suite-integrity.api.spec.ts:43`)                                | unchanged — both pages already audited, `ACC` registered; new cases need `e2e/scenarios-index.md` refreshed (`PR-API-07`)                           |
| Framework output                      | the route announcer is a second `role="alert"` outside `main` (`code.md`); the `main`-scoped wait excludes it        | —                                                                                                                                                   |

Invariants: none changed; 15 holds (no `isInvalid`/`FieldError`). Visible to users: the error text
and the primary button's hover/pressed colour get darker.

## 8. Open questions and deliberate omissions

- **Not in research, confirmed in code here:** the `Card` surface (`card.css:41-43`,
  `card.styles.js:4-5`, closes Q-U3), the button's transition and hover rules (`button.css:11-14,
55-58,96-99`), and the absence of any `--danger-*` consumer in `apps/web`. The reviewer should
  check these citations.
- Q-U1 (why one run went green on retry) and the 4.49-vs-4.22 gap stay unproven; the mid-transition
  reading is a rationale in `ADR-0033`. The fix does not rest on it: every transition frame passes.
- Q-U4 (announcer in `next` 16.3.6) is left open; the `main`-scoped wait makes it irrelevant.
- `e2e/README.md:194-196` and `auth-login.functional.spec.ts:31-34` ("strict-mode violation in
  every error case") contradict the CI logs (README contradiction 2). Not touched: a separate
  documentation finding for the lead.
- No error icon (ui-ux-pro-max "Color Only"): the text carries the meaning; per-field errors are
  `BL-029`. `--danger-hover` would fail at 4.33 if a danger button ever ships (`ADR-0033`).
