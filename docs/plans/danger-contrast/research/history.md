# Research: history — danger-contrast

> First pass by `researcher-history` on `haiku`. That pass cited the change folder's own plan as
> evidence, located a CHANGELOG line in `BACKLOG.md`, and carried conclusions from the plan as
> "contradictions", so the `researcher` (`opus`) re-checked each statement against the ledger, the
> backlog, the ADR log, git and the CI history, and rewrote this file keeping only what checked
> out. See `README.md`, "Sweeps".

## The ledger (`docs/CHANGELOG.md`)

- `FX-039` (`docs/CHANGELOG.md:125`, 2026-10-02): HeroUI v3's default `--accent`,
  `oklch(62.04% .195 253.83)`, put the library's own `--accent-foreground` on it at 3.58:1, below the
  4.5:1 WCAG AA requires for 14px normal-weight text. The accessibility case note
  `e2e/accessibility/accessibility.functional.cases.md:57-58` records that `ACC-FN-01` found it.
- `CH-029` (`docs/CHANGELOG.md:78`, 2026-10-02): the design language recorded as `ADR-0026`; the
  entry records HeroUI's own `--muted` at 4.41:1 on the new canvas, redefined rather than
  inherited.
- `CH-028` (`docs/CHANGELOG.md:79`, 2026-10-02): `axe-core` wired into the suite (`ADR-0025`).
- `FT-005` (`docs/CHANGELOG.md:40`, 2026-10-02) and `FT-006` (`docs/CHANGELOG.md:39`, 2026-10-03):
  the HeroUI rework and the application of `ADR-0026` to `apps/web`.
- `FX-040` (`docs/CHANGELOG.md:124`, 2026-10-03): HeroUI v2 token class names in `apps/web` that
  compiled to no CSS.
- `docs/CHANGELOG.md:179`, under the heading "Found during implementation, before the code reached
  a branch" (`:165`): "`getByRole('alert')` gives a strict-mode violation: App Router keeps its own
  route announcer" — found by "first functional run".
- **Not found:** any ledger entry mentioning `--danger` or `text-danger` — searched
  `grep -n -i "danger" docs/CHANGELOG.md`.
- **Not found:** any ledger entry citing `ACC-FN-03` or a CI run of it (`38429549429`,
  `37930853945`, `37127168216`) — searched `grep -n "ACC-FN-03\|38429549429" docs/CHANGELOG.md`.
- **Not found:** a ledger entry recording `ACC-FN-03` as flaky — searched
  `grep -n -i "flak\|retry" docs/CHANGELOG.md`; the only "flaked" hit is `FX-011` (`:153`, about
  `SEC-API-05`).

## The backlog (`docs/BACKLOG.md`)

- `BL-029` (`docs/BACKLOG.md:47`, P3, web): per-field form errors tied to the input with
  `aria-describedby`, instead of one `role="alert"` paragraph per form.
- `BL-030` (`docs/BACKLOG.md:46`, P2, web): a check that `PROTECTED_PAGES` and `AUDITED_PAGES` list
  every page the application serves.
- `BL-034` (`docs/BACKLOG.md:42`, P2, web): no mechanical guard against a dead class, a raw colour
  literal or a wrong font (`FACT-3561`).
- **Not found:** an open or closed `BL-` item about `--danger`, the error colour, contrast of error
  states, or a11y scans of the create-meeting or upload error states — searched
  `grep -n -i "danger\|contrast\|a11y\|accessib" docs/BACKLOG.md`.
- **Not found:** anything related in the Rejected section — searched lines from `docs/BACKLOG.md:89`
  onward for `colou|contrast|alert|danger|axe|accessib`.

## The ADR log

- `ADR-0026` (`docs/adr/ADR-0026-design-language.md`): `FACT-3545` (`:14-16`), `FACT-3548`
  (`:34-38`), `FACT-3549` (`:39-41`), `FACT-3550` (`:42-…`), `FACT-3558` (`:90-93`). `FACT-3558`
  states that `ACC-FN-01` is what decides a token change.
- **Not found:** the word `danger` in any ADR — searched `grep -rn -i "danger" docs/adr/`.
- `ADR-0025` (`docs/adr/ADR-0025-accessibility-is-checked.md`): `FACT-3534` (`:31-34`, the WCAG tags),
  `FACT-3541` (`:68-70`, an `axe-core` upgrade can turn a green run red with no repository change).

## Git

- `e2e/accessibility/accessibility.functional.spec.ts`: two commits — `5624a7a` (2026-10-02, "feat(e2e):
  check accessibility with axe, …") and `18b27f6` (2026-10-07, "feat: store meetings in PostgreSQL
  …"). `git log -L76,86` attributes the `ACC-FN-03` body (spec `:76-86`) to `5624a7a` only;
  `18b27f6` changed the import and `AUDITED_PAGES` (`git show 18b27f6 -- <spec>`).
- `e2e/accessibility/accessibility.functional.cases.md:73-82` (the `ACC-FN-03` text, including the
  "never as a bare `getByRole('alert')`" step): `git log -L` attributes it to `5624a7a` and
  `18b27f6`.
- `e2e/README.md:191-196` (the scope-under-`main` rule): `git log -L` attributes it to `18b27f6`.
- `text-danger` first enters `apps/web/src` in `38d86d4` (2026-10-01, "feat(web): replace CSS
  Modules with HeroUI v3 on Tailwind v4") — `git log -S"text-danger" -- apps/web/src` returns only
  that commit.
- `next` 16.3.6 → 16.3.8: `08fbdf1` (2026-10-09), `apps/web/package.json` only.
- Commits between the last green CI run and the failing one (`git log 18583b3..f8cd6ab`): `e4aa852`,
  `0272e23`, `73abca0`, `f8cd6ab`.
- `git diff --stat 18583b3 f8cd6ab -- apps e2e/accessibility e2e/fixtures playwright.config.ts package.json pnpm-lock.yaml`
  lists only `apps/api/CLAUDE.md`, `apps/web/CLAUDE.md` and `package.json`; the `package.json` diff
  is one added script line, `"verdicts:report": "node scripts/verdicts-report.mjs"`.
- **Not found:** a change to `apps/web` source, `e2e/accessibility`, the Playwright config or the
  lock file between `18583b3` and `f8cd6ab` — searched with the `git diff --stat` above.

## CI history (`gh run list`, `gh run view`)

| Run           | Commit    | Date       | Conclusion | `ACC-FN-03`                                                                                              |
| ------------- | --------- | ---------- | ---------- | -------------------------------------------------------------------------------------------------------- |
| `36992192998` | `829c69c` | 2026-10-02 | success    | spec not yet present — `git merge-base --is-ancestor 5624a7a 829c69c` is false                           |
| `37127168216` | `2c84730` | 2026-10-03 | failure    | red on all three attempts, contrast 3.56 on the `<p class="text-danger text-sm" role="alert">`           |
| `37930853945` | `18583b3` | 2026-10-09 | success    | red, red, green on retry #2; Playwright summary "1 flaky", "166 passed"                                  |
| `38429549429` | `f8cd6ab` | 2026-10-13 | failure    | red on all three attempts, contrast 3.56, failing at spec `:85` ("the login error state has violations") |

Log lines for each row are in [`tests.md`](tests.md) and [`probes.md`](probes.md).
`playwright.config.ts:30` sets `retries: isCI ? 2 : 0`.
