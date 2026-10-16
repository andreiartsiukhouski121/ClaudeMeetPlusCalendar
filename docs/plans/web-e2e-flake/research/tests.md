# Research: existing checks around BL-058 (tests sweep)

Nothing was run. Counts are by `grep` over the spec files, so they are as precise as the pattern.

## 1. Login routes in `*.functional.spec.ts`

- **Shared UI-login helper:** `uiLogin` (`e2e/fixtures/auth.fixture.ts:52`) — goto `/auth/login`, fill Email and Password, click "Sign in", `toHaveURL('/')` (lines 63-75), then saves `storageState` (77). It is not exported. Specs reach it through the `authedPage` fixture (`auth.fixture.ts:111`), which calls the worker-scoped `authStateFor` (90-106): one UI login per user per worker, cached in a `Map`, then `browser.newContext({ storageState })`.
- Tests whose callback destructures `authedPage` (regex count):
  - `e2e/regression/home-dashboard/home-dashboard.functional.spec.ts`: 16 of 18 tests.
  - `e2e/regression/meeting-files/meeting-files.functional.spec.ts`: 14 of 15.
  - `e2e/accessibility/accessibility.functional.spec.ts`: 4 of 6 (ACC-FN-02, 04, 05, 06).
  - `e2e/security/security.functional.spec.ts`: 3 of 5 (lines 67, 88 and one more).
  - `e2e/regression/auth-login/auth-login.functional.spec.ts`: 0.
- Inline form fill, no helper:
  - `auth-login.functional.spec.ts`: all 10 tests use `page` with `test.use({ storageState: undefined })` (line 50); the Password fill and Sign in click are at 65, 89, 114, 129, 178, 204, 230.
  - `home-dashboard.functional.spec.ts:114` (HD-FN-11, `page`).
  - `meeting-files.functional.spec.ts:357` (inside MF-FN-09, on `authedPage` after the forged cookie).
  - `accessibility.functional.spec.ts:79-80` (ACC-FN-03, `page`).
- API token / `storageState` files: `loginApi` (`e2e/fixtures/auth.api.ts:30`) is for the `api` project, and `authHeadersFor` is imported by the home-dashboard and meeting-files functional specs (`home-dashboard.functional.spec.ts:10`, `meeting-files.functional.spec.ts:10`) for data setup, not for browser login.
- The header of `auth.fixture.ts` says the UI login is intentionally real: "form → Server Action → POST /auth/login" (line 11).

## 2. Cases that hit the files route handler `/meetings/<id>/files/<fileId>`

All go through `authedPage.context().request.get(href)` in `e2e/regression/meeting-files/meeting-files.functional.spec.ts`:

- MF-FN-07: line 256 (title), request at 269.
- MF-FN-09: line 311 (title); requests at 333, 339, 350 (`/auth/login`).
- MF-FN-12: line 407 (title block) ; request at 414 with `-does-not-exist` appended to the href.
- Not Playwright-UI but the same path family: `meeting-files.api.spec.ts:183,224,323,446` hit Nest's `/content`, not the web route handler.
- MF-FN-11 (`spec:387`) navigates `/meetings/<id>-does-not-exist`, a page route, not the file route.

## 3. Named cases: assertion (cases.md) and timeout overrides

No `test.setTimeout`, `test.slow` or per-test `timeout:` in any `*.functional.spec.ts` (grep count 0 in all five files). Suite-level in `playwright.config.ts`: `timeout: 60_000` (line 33), `expect.timeout: 10_000` (34), webServer `timeout: 180_000` (85, 113).

- AL-FN-02 (`auth-login.functional.cases.md:48`): URL becomes `/`, one `ps_session` cookie, Sign in button gone.
- AL-FN-03 (`:57`): alert visible with `Invalid email or password`, URL stays `/auth/login`, no `passwordHash`/`scrypt`/`apps/api` in alert, no session cookie.
- AL-FN-04 (`:65`): unknown email alert text equals the wrong-password alert text.
- AL-FN-08 (`:91`): console/page-error list empty on render and after a failed sign-in.
- ACC-FN-02 (`accessibility.functional.cases.md:67`): axe, 4 WCAG tags, zero violations on every `needsSession` page via `authedPage` (spec 58-74).
- ACC-FN-04 (`:98`): exactly one `h1` and one `main` per audited page (spec 121).
- ACC-FN-05 (`:108`): create-meeting error state, zero axe violations (spec 92-105).
- ACC-FN-06 (`:122`): upload error state, zero axe violations (spec 107-119).
- MF-FN-07 (`meeting-files.functional.cases.md:135`): same-origin href, 200, bytes identical, exact `Content-Disposition`, `nosniff`, `Cache-Control: private, no-store`.
- MF-FN-09 (`:158`): forged cookie, hop-by-hop 307 via `/auth/session-expired` to `/auth/login`, sign-in works afterwards.
- MF-FN-12 (`:196`): status 404, empty body, no redirect to login.
- The 10 s in the failure reports corresponds to `expect.timeout: 10_000` (`playwright.config.ts:34`); the `toHaveURL('/')` in `uiLogin` (`auth.fixture.ts:71`) and in AL-FN-02 use it.

## 4. `e2e/README.md` "Run economics" (line 302)

- Line 308: "Measured **2026-10-14**, Windows 11, Docker up on a reset-and-reseeded database, after the `clean-architecture-pilot` verify run".
- Line 313 row: 171 e2e tests, 16 e2e files, 54 units, `pnpm verify` "**2 min 23 s (one run)**".
- Line 315: 37 units in `apps/api`, 17 in `apps/web`, one supertest module-boot check; the 2 min 23 s "followed three red ones whose web project hit a load flake (`BL-058`)".
- Lines 325-330 (earlier 2026-10-06 measurements): `pnpm e2e` "all 167" 47.7-51.4 s; `--project=api --grep @auth-login` 13.1 s, ~12 s starting servers; `pnpm verify` 1 min 22 s - 1 min 47 s; cold `.next` ~137 s.
- Line 337-339: every `pnpm e2e` call costs about 12 s because it restarts both servers, `next dev` included.
- Worker counts do not appear in this section. `playwright.config.ts:30-31`: `retries: isCI ? 2 : 0`, `workers: isCI ? 1 : undefined`; `fullyParallel: true` (29).
- README line 226: "`fullyParallel: true` and the two projects share one database".

## 5. Tests/meta-tests on `workers`, `fullyParallel`, `webServer`, config

- **Not found:** an assertion on the `workers`, `retries` or `fullyParallel` values of `playwright.config.ts` — searched `e2e/**` for `workers|fullyParallel|webServer|playwright\.config`. Hits are comments only (e.g. `meetings-detail.api.spec.ts:15`, `home-dashboard.api.spec.ts:16,260`, `seed.ts:25`) and README prose (226, 200, 161).
- Nearest config-reading check: `e2e/suite-integrity.api.spec.ts:425` (rule 9: server address set only in `playwright.config.ts`, reaches tests through a fixture) and `:278` (a spec without a project suffix joins no project). Neither reads `workers`, `fullyParallel` or `webServer`.
- `auth-login.functional.spec.ts:48` comment mentions `storageState` in `playwright.config.ts`.

## 6. Existing cases on warm-up, first compile, retries

- **Not found:** a case about warm-up, first compile or retries — searched `e2e/**/*.cases.md` for `warm|first compile|retries|retry`; no case row.
- Prose only: `playwright.config.ts:32` comment "The first page visit triggers a cold Turbopack build — the default 30 s is not enough"; README "Run economics" lines 330-335 (warm vs cold `.next`).

## Coverage stops

- No `- **Not automated:**` entries in any `*.functional.cases.md` (grep over `e2e/**/*.cases.md`).
- No case addresses the behaviour of the web project under CPU load or the compile of `apps/web/src/app/meetings/[id]/files/[fileId]/route.ts`; the route handler is reached only by MF-FN-07, 09, 12 above.
