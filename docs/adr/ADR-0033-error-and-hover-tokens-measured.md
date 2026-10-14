# ADR-0033 — Error and hover tokens measured

- **Status:** accepted
- **Date:** 2026-10-13
- **Supersedes:** — (amends `ADR-0026` in part: replaces the gate fact in its Consequences and overrides
  two tokens it left at HeroUI's default; every other fact of `ADR-0026` stands)
- **Superseded by:** —

## Context

- `FACT-3684` HeroUI's default `--danger`, `oklch(0.6532 0.2328 25.74)` (`#FF383C`), measures
  3.57:1 on white and 3.25:1 on the canvas `#F4F4F7`, below the 4.5:1 of WCAG AA for 14px normal
  text; `axe` reported it at 3.56:1 on the login error paragraph in CI runs `37127168216`,
  `37930853945` and `38429549429`. — `@heroui/styles@3.2.6` `dist/themes/default/variables.css:106`,
  `docs/plans/danger-contrast/research/probes.md` P1, P3
- `FACT-3685` `text-danger` is used three times in `apps/web`, each on a 14px `<p role="alert">`:
  the login form on `bg-surface` (white), the create-meeting form inside a default-variant
  `Card.Root`, which resolves to `bg-surface` (white), and the upload form directly on the page
  canvas. — `apps/web/src/app/auth/login/login-form.tsx:47`, `apps/web/src/app/auth/layout.tsx:25`,
  `apps/web/src/components/create-meeting-form.tsx:38,52`, `@heroui/styles@3.2.6`
  `dist/components/card.css:41-43` and `card/card.styles.js:4-5`,
  `apps/web/src/components/upload-file-form.tsx:54`, `apps/web/src/app/meetings/[id]/page.tsx:55,115`
- `FACT-3686` HeroUI derives `--accent-hover` as `color-mix(in oklab, var(--accent) 90%,
var(--accent-foreground) 10%)`, which on this repository's `--accent` is `#7766E8`, 4.22:1 under
  `--snow`; the primary `Button` paints it on hover and press through a 100ms `background-color`
  transition. `axe` recorded the focused and hovered "Sign in" button at 4.49:1 (`#FCFCFC` on
  `#7360E7`) inside `ACC-FN-03` in runs `37930853945` and `37127168216`. —
  `variables.css:130`, `dist/components/button.css:11-14,55-58,96-99`,
  `docs/plans/danger-contrast/research/tests.md` "CI evidence"
- `FACT-3687` `ACC-FN-01` and `ACC-FN-02` scan pages as loaded, with no form submitted; `ACC-FN-03`
  is the only case that scans an error state, and only the login form's. Neither the create-meeting
  nor the upload error state is scanned. — `e2e/accessibility/accessibility.functional.spec.ts:50-86`,
  `docs/plans/danger-contrast/research/tests.md`

> **Rationale — not a fact.** `#7360E7` lies about two thirds of the way from `--accent` to
> `#7766E8` on every channel, which reads as `axe` sampling the 100ms transition mid-flight; that is
> one plausible source of the case's run-to-run variation, not a proven one. The decision below does
> not depend on it: it makes every frame of the transition pass.

## Decision

- `FACT-3688` `--danger` is overridden in `apps/web/src/app/globals.css` to
  `oklch(0.55 0.21 25.74)` (`#D01C27`, in sRGB gamut): HeroUI's hue kept, lightness matched to
  `--accent`. It measures 5.42:1 on white (login, create-meeting) and 4.93:1 on the canvas (upload);
  the canvas is the binding surface. — `apps/web/src/app/globals.css`,
  `.claude/skills/design-system/SKILL.md`, "Colour: the measured table"
- `FACT-3689` `--accent-hover` is overridden to `oklch(0.50 0.21 285)` (`#5F42D3`), a step darker
  than `--accent`; `--snow` on it measures 6.38:1. Every channel of it is below `--accent`'s, so
  every frame of the transition between the two lies between 5.15:1 and 6.38:1. —
  `apps/web/src/app/globals.css`, `.claude/skills/design-system/SKILL.md`, "Colour: the measured table"
- `FACT-3690` `--danger-foreground`, `--danger-hover`, `--danger-soft` and
  `--danger-soft-foreground` are not overridden: HeroUI derives the last three from `--danger`, and
  no markup in `apps/web` renders any of the four. — `variables.css:107,133,160-162`,
  `grep -rn "danger" apps/web/src` (three `text-danger` hits only)
- `FACT-3691` Every contrast number in `ADR-0026`, in this record and in the `design-system` skill
  is computed from the OKLCH values. A token is decided by the `axe` scan of every state that
  renders it: `ACC-FN-01` and `ACC-FN-02` for a page as loaded, and the error-state cases —
  `ACC-FN-03` and the create-meeting and upload error-state cases — for a token that appears only
  after a submit; it is accepted by a green `pnpm verify`. —
  `e2e/accessibility/accessibility.functional.cases.md`, `ADR-0025`
- `FACT-3692` The `:root` override block in `globals.css` holds six values: `--accent`,
  `--accent-hover`, `--background`, `--muted`, `--danger` and `--radius`. —
  `apps/web/src/app/globals.css`

Rejected, each in one line:

- **A per-component class such as `text-red-700`** — `FACT-3548` forbids a component naming a
  colour, and `BL-034` is the open gap such a class would widen.
- **A value tuned to white only**, e.g. `oklch(0.58 0.21 25.74)` at 4.77:1 — it turns `ACC-FN-03`
  green and leaves the upload error at 4.35:1 on the canvas.
- **HeroUI's `Alert` or a `--danger-soft` panel** — `create-meeting-form.tsx:20-22` records why the
  error is a plain paragraph, and a tinted panel brings two more pairs to measure for no defect.
- **Moving the pointer off the button before the scan** — it hides a 4.22:1 state a user sees on
  every hover; `ADR-0025` rejects suppressing a finding.
- **A lighter `--accent-hover` that still passes** — the room between 4.5:1 and `--accent`'s 5.15:1
  is too narrow for a visible step, and a lighter hover keeps the mid-transition frames near the line.

## Consequences

- `ADR-0026`'s gate fact, which named `ACC-FN-01` as the deciding case, moves into that record's
  "Retired facts" register with `FACT-3691` as its successor (`ADR-0022`): `ACC-FN-01` never
  renders an error state.
- A future `variant="danger"` button would paint `--danger-hover`, computed `#D8403E`, at 4.33:1
  under `--snow`: it fails AA and must be measured and overridden before that button ships.
- `ACC-FN-03` waits for the `main`-scoped alert carrying its error text before scanning, as its case
  text already prescribes, and two error-state cases join it; the scan of each error state is then
  of the error DOM, every time.

> **Rationale — not a fact.** This is the third HeroUI default to fail AA here (`FX-039`, `CH-029`,
> now `--danger`), each found only once a scan reached the state it renders in. The lasting fix is
> the gate in `FACT-3691`, not the two values.
