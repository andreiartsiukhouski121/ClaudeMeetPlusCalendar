# Research: code — danger-contrast

> Written by the `researcher` directly (no `researcher-code` subagent), model `opus`. Scope: the
> colour token behind the error paragraphs, where it is used, what surface each use sits on, and
> the Next.js markup that shares the `alert` role. Verification of the `FIX-S3` findings. The
> commands and the output lines each number rests on are in [`probes.md`](probes.md).

## The token

- `apps/web/src/app/globals.css:19-40` is the `:root` override block. It declares `--accent` (`:25`),
  `--background` (`:28`), `--muted` (`:34`) and `--radius` (`:40`). The block comment at `:15-16`
  reads "Four values. Everything not listed here stays the library's default on purpose".
- **Not found:** a `--danger` declaration in `apps/web` — searched `grep -rn "danger" apps/web/src`
  over `*.ts`, `*.tsx`, `*.css`; the only hits are the three `text-danger` class uses below.
- HeroUI's default light theme declares `--danger: oklch(0.6532 0.2328 25.74)` at
  `node_modules/.pnpm/@heroui+styles@3.2.6_tailwindcss@4.3.3/node_modules/@heroui/styles/dist/themes/default/variables.css:106`
  (`--danger-foreground: var(--snow)` at `:107`). The installed version is the only
  `@heroui+styles` entry in `node_modules/.pnpm`; `apps/web/package.json:17` pins `^3.2.6`.
- In the same file, `--surface: var(--white)` is at `:72` and HeroUI's own `--background` is at
  `:68` (overridden by `globals.css:28`).
- Computed from the OKLCH value (probe P1): `--danger` = `#ff383c`; 3.57:1 on `#ffffff`; 3.26:1 on
  the canvas `oklch(0.969 0.004 286)` = `#f4f4f7`. axe reported the same pair at 3.56:1 in CI run
  `38429549429` (see [`tests.md`](tests.md)). The 0.01 difference between the two figures is not
  explained by anything in the repository.

## The three uses

| Use                                                  | Error text and its source                                                                        | Surface it renders on                                                                                                                                                     |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/app/auth/login/login-form.tsx:47`      | "Invalid email or password" — `apps/web/src/lib/actions/auth.ts:54`                              | `apps/web/src/app/auth/layout.tsx:25` — `<section className="bg-surface …">`                                                                                              |
| `apps/web/src/components/create-meeting-form.tsx:52` | "Enter a meeting title" — `apps/web/src/lib/actions/meetings.ts:37` (one of its branches)        | `create-meeting-form.tsx:38` — inside `Card.Root`                                                                                                                         |
| `apps/web/src/components/upload-file-form.tsx:54`    | "Choose a file to upload" — `apps/web/src/lib/actions/meeting-files.ts:43` (one of its branches) | `apps/web/src/app/meetings/[id]/page.tsx:115` — directly in `<section>` (`:78`) in `<main>` (`:77`), under `<div className="bg-background …">` (`:55`); no `Card` between |

- All three are `<p className="text-danger text-sm" role="alert">` (the three lines above).
- `create-meeting-form.tsx:20-22` records why the error is a plain `p` with `role="alert"` rather
  than HeroUI's `Alert`; `upload-file-form.tsx` and `login-form.tsx:16-18` record that the
  `role="alert"` container is dictated by test locators.
- **Not found:** a computed contrast figure for `--danger` on the `Card` surface of the
  create-meeting form — the `Card` background was not resolved in this sweep (open question Q-U3 in
  `README.md`).

## The design-system skill and `text-danger`

- `.claude/skills/design-system/SKILL.md:41-43`: "Everything else — `--foreground`, `--surface`,
  `--border`, `--separator`, `--danger`, `--success`, `--warning` and the whole `*-soft` family — is
  **HeroUI's default and stays that way**. The palette is three overrides and five additions". This
  line carries no `FACT-` key.
- `.claude/skills/design-system/SKILL.md:30-39` (the measured table) has rows for `--accent`,
  `--background`, `--muted` and the five category inks; **no row for `--danger`**.
- `.claude/skills/design-system/references/patterns.md:190-194` prescribes the error paragraph as
  `<p role="alert" className="text-danger text-sm">`.
- The skill counts "three overrides" (`SKILL.md:43`); `globals.css:15` counts "Four values"
  (`--radius` is the fourth, `globals.css:40`). Recorded only because both texts enumerate the same
  block.

## Next.js route announcer

- `node_modules/.pnpm/next@16.3.8_…/node_modules/next/dist/client/components/app-router-announcer.js:15-35`
  creates a `<next-route-announcer>` element with an open shadow root holding a `div` with
  `role = 'alert'` (`:25`), `ariaLive = 'assertive'` (`:23`), id `__next-route-announcer__` (`:24`)
  and inline style `position:absolute;…height:1px;…width:1px;clip:rect(0 0 0 0);overflow:hidden`
  (`:26`), appended to `document.body` (`:32`). It is created inside a `useEffect` (`:38-40`), i.e.
  after hydration.
- `apps/web/package.json:20` pins `"next": "16.3.8"`; it was `16.3.6` before commit `08fbdf1`
  (2026-10-09, "build(deps): bump next to 16.3.8 for GHSA-cjq9-62q9-8jv4"; `git show 08fbdf1`).
- **Not found:** whether the announcer source differs between 16.3.6 and 16.3.8 — only 16.3.8 is
  installed; 16.3.6 was not fetched in this sweep.

## Contrast of the submit button's hover state (adjacent, found in CI logs)

- HeroUI declares `--accent-hover: color-mix(in oklab, var(--accent) 90%, var(--accent-foreground) 10%)`
  at `variables.css:130`, with `--accent-foreground: var(--snow)` (`:38`) and
  `--snow: oklch(0.9911 0 0)` (`:14`).
- Computed with `--accent` = `globals.css:25` (probe P2): `#7766e8` against `#fcfcfc` = 4.21:1.
- CI recorded a different pair on the same button (see [`tests.md`](tests.md)): `#fcfcfc` on
  `#7360e7`, 4.49:1. The difference between `#7766e8` and `#7360e7` is not explained by anything in
  the repository.
