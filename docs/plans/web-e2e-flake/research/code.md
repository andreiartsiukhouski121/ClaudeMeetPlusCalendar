# Code sweep: web e2e flake (BL-058)

The sweep converged after 11 files read; no new files surfaced in the last greps.

## 1. `playwright.config.ts`

- `fullyParallel: true` (`:28`); `retries: isCI ? 2 : 0` (`:30`); `workers: isCI ? 1 : undefined` (`:31`); `isCI = !!process.env.CI` (`:24`); `forbidOnly: isCI` (`:29`).
- `timeout: 60_000` (`:33`), preceded by the comment `// The first page visit triggers a cold Turbopack build — the default 30 s is not enough.` (`:32`).
- `expect: { timeout: 10_000 }` (`:34`). `use`: `actionTimeout: 15_000` (`:46`), `navigationTimeout: 30_000` (`:47`), `trace: 'on-first-retry'` (`:43`).
- Projects: `api`, `web` (`devices['Desktop Chrome']`, `baseURL: WEB_URL`, `:61-65`), `integration`. No project-level `workers`, `timeout` or `dependencies`.
- `webServer[0]` (web): `command: \`pnpm dev --port ${WEB_PORT}\`` (`:76`), `cwd: 'apps/web'` (`:77`), `env: { API_URL }` (`:82`), `url: WEB_URL` (`:83`), `reuseExistingServer: !isCI` (`:84`), `timeout: 180_000` (`:85`). No `port` key.
- `webServer[1]` (api): `command: 'pnpm start:e2e'` (`:93`), `cwd: 'apps/api'`, env `PORT`, `JWT_SECRET: 'e2e-secret'`, `DATABASE_URL` (`:101-105`), `url: API_URL` (`:106`), `reuseExistingServer: false` (`:110`), `timeout: 180_000` (`:113`).
- Stale `next start` comment, verbatim (`:9-13`):
  > Ports 3100/3101, NOT the usual 3000/3001. This matters: 3000 may hold a `pnpm dev` or, worse, a
  > `next start` serving a stale build. In the second case reuseExistingServer would latch onto a
  > production server that never picks up edits, and the run would go falsely green on broken code.
  > On a dedicated port the only thing to reuse is a dev server from a previous Playwright run,
  > which does have hot reload.

## 2. Scripts

- Root `verify` (`package.json:37`): `pnpm check:orientation && pnpm lint && pnpm typecheck && pnpm test && pnpm --filter @purpleschool/api test:e2e && pnpm format:check && pnpm e2e && pnpm audit --audit-level high`.
- Root `e2e` is `playwright test` (`:38`); `e2e:smoke|regression|auth-login|home-dashboard|p0|security|ui` are `playwright test` with a path, `--grep` or `--ui` (`:39-46`); `e2e:a11y` adds `--project=web` (`:44`). No script passes `--workers`. `build` is `pnpm -r build` (`:14`).
- `apps/web/package.json`: `"dev": "next dev"` (`:6`), `"build": "next build"` (`:7`), `"start": "next start"` (`:8`). No `--turbopack`/`--webpack` flag, no e2e variant. `next` is `16.3.8` (`:20`).
- `apps/api/package.json:14`: `"start:e2e": "pnpm prisma:generate && pnpm db:reset && nest start"`. `db:reset` (`:27`): `node scripts/assert-database-url.mjs && pnpm db:up && node scripts/reset-schema.mjs && prisma db push && pnpm db:seed`. `db:seed` is `node prisma/seed.ts` (`:26`). `nest start` is not `node dist/main`; `start` is `node dist/main` (`:10`) and is not used by `start:e2e`.

## 3. `.github/workflows/ci.yml`

- Job `verify`: `runs-on: ubuntu-latest` (`:33`), `timeout-minutes: 25` (`:34`). Steps run `pnpm check:orientation`, `lint`, `typecheck`, `test`, the api `test:e2e`, `format:check`, then `pnpm e2e` (`:92-93`), then audit. It does not call `pnpm verify`.
- No `workers` flag and no `CI=` set in the file; `env:` holds only `HUSKY: 0` (`:26-28`). Playwright's `CI` is whatever the runner provides.
- Caches: pnpm via `setup-node` `cache: pnpm` (`:52`) and `~/.cache/ms-playwright` (`:59-64`). No `.next` cache. No `next build` in `verify`.
- Job `build` (`:112-146`, `needs: verify`) runs `pnpm build` (`:133`) and uploads `apps/web/.next/` and `apps/api/dist/`.

## 4. `apps/api/src/common/crypto/password.ts`

- `hashPassword(plain): string` (`:18`) uses `scryptSync(plain, salt, KEY_BYTES)` (`:20`). `verifyPassword(plain, stored): boolean` (`:29`) uses `scryptSync` (`:50`). Both are synchronous.
- Parameters: `SALT_BYTES = 16`, `KEY_BYTES = 64` (`:14-15`). No cost options (N, r, p) are passed to `scryptSync`.
- Callers:
  - `apps/api/src/auth/auth.service.ts:28`: `const DUMMY_PASSWORD_HASH = hashPassword(randomBytes(16).toString('hex'));` at module load.
  - `apps/api/src/auth/password.service.ts:13` (`hashPassword`) and `:17` (`verifyPassword`).
  - `apps/api/src/auth/auth.service.ts:48-51`: `this.passwordService.verify(dto.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH)`. This runs on every login, including an unknown email.
  - `apps/api/prisma/seed.ts:42` (dynamic import), `:75` `hashPassword(user.password)`.
- `e2e/fixtures/auth.api.ts:10` is a comment naming this cost: `POST /auth/login` runs scrypt, with a per-worker token cache.

## 5. `e2e/fixtures/auth.fixture.ts`

- `uiLogin(browser, user, workerInfo)` (`:52`): `page.goto('/auth/login')` (`:63`), fills Email and Password (`:64-65`), clicks the `Sign in` button (`:66`), then `await expect(page, ...).toHaveURL('/')` (`:71-75`). It sets no timeout of its own, so the `expect.timeout` of 10 s applies (`playwright.config.ts:34`).
- `authStateFor` is a worker-scoped fixture caching one login per user per worker (`:90-106`). `authedPage` loads that `storageState` into a new context per test (`:111-121`).
- `e2e/fixtures/auth.api.ts:30` has `loginApi`, which belongs to the `api` project.

## 6. `apps/web/src/app/meetings/[id]/files/[fileId]/route.ts`

- `return new Response(null, { status: 404 })` when Nest answers 404 (`:86-88`). The body is null.
- `redirect('/auth/session-expired')` when there is no token or Nest answers 401 (`:90-92`).
- `return new Response(nestResponse.body, { status: 200, headers })` (`:112`). Headers forwarded: `Content-Type`, `Content-Length`, `Content-Disposition`; set: `X-Content-Type-Options`, `Cache-Control` (`:94-110`).
- Any other non-401/404 Nest status, or a failed `fetch`, is rethrown (`:73-81`). No handler line builds an HTML body.
- **Not found:** whether the HTML 404 seen on first compile comes from this handler — searched `route.ts` in full. Every `Response` it constructs has a null or byte body. The handler contains no `text/html` or `new Response('<` line.

## 7. `apps/web/next.config.ts`

- Sets only `allowedDevOrigins: ['127.0.0.1']` (`:6`) and `experimental.serverActions.bodySizeLimit: '2mb'` (`:11-13`). Nothing about turbopack, webpack, compile, `onDemandEntries` or dev indicators.
