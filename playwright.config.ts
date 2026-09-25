import { defineConfig, devices } from '@playwright/test';

import type { ApiOptions } from './e2e/fixtures/api.js';

/**
 * E2E checks for the monorepo: web (Next.js) and api (Nest.js). Playwright starts both servers
 * itself — see webServer below.
 *
 * Ports 3100/3101, NOT the usual 3000/3001. This matters: 3000 may hold a `pnpm dev` or, worse, a
 * `next start` serving a stale build. In the second case reuseExistingServer would latch onto a
 * production server that never picks up edits, and the run would go falsely green on broken code.
 * On a dedicated port the only thing to reuse is a dev server from a previous Playwright run,
 * which does have hot reload.
 */
const WEB_PORT = process.env.E2E_WEB_PORT ?? '3100';
const API_PORT = process.env.E2E_API_PORT ?? '3101';
const WEB_URL = `http://127.0.0.1:${WEB_PORT}`;
const API_URL = `http://127.0.0.1:${API_PORT}`;
const isCI = !!process.env.CI;

export default defineConfig<ApiOptions>({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  // The first page visit triggers a cold Turbopack build — the default 30 s is not enough.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    // The Nest address for cases that need it as a string (apiRequest, HD-FN-11, SEC-FN-03). Set
    // HERE and only here: the `web` project's own `baseURL` points at Next, and Playwright has no
    // second built-in address. A suite option is how the value reaches tests without making them
    // recompute the port formula (FX-023). It shows up in the HTML report with the rest of the
    // config.
    apiBaseURL: API_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  // baseURL is set per project only, or api would inherit web's address.
  projects: [
    // Files are grouped by feature (e2e/regression/<feature>/), so the project is chosen by the
    // filename suffix rather than the directory:
    //   *.api.spec.ts        -> project api  (the request fixture, baseURL :3101, no browser)
    //   *.functional.spec.ts -> project web  (Desktop Chrome, baseURL :3100)
    // The default testMatch catches any *.spec.ts, so it must be overridden in both projects:
    // otherwise a browser spec would land in api and run page.goto against :3101.
    // A file without either suffix joins NO project and silently never runs — that is what
    // e2e/suite-integrity.api.spec.ts guards against.
    { name: 'api', testMatch: /.*\.api\.spec\.ts$/, use: { baseURL: API_URL } },
    {
      name: 'web',
      testMatch: /.*\.functional\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'], baseURL: WEB_URL },
    },
  ],
  // cwd + `pnpm dev` instead of the root `pnpm dev:web`: fewer process layers for Windows
  // taskkill /T /F to orphan and leave a port occupied.
  webServer: [
    {
      command: `pnpm dev --port ${WEB_PORT}`,
      cwd: 'apps/web',
      // Next defaults to :3001 (apps/web/src/lib/api-client.ts). Without this variable the web
      // project would test against `pnpm dev:api` rather than the Nest started here on :3101:
      // a different in-memory seed, a different JWT_SECRET — a false result either way.
      // webServer.env merges on top of process.env.
      env: { API_URL },
      url: WEB_URL,
      reuseExistingServer: !isCI,
      timeout: 180_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      // Nest reads the port from process.env.PORT (see apps/api/src/main.ts).
      command: 'pnpm dev',
      cwd: 'apps/api',
      // JWT_SECRET is pinned to a constant: the code has a dev default, but relying on it would
      // make the run depend on the shell environment. A random secret is impossible too:
      // `nest start --watch` restarts on every edit and every token issued mid-run would die.
      env: { PORT: API_PORT, JWT_SECRET: 'e2e-secret' },
      url: API_URL,
      reuseExistingServer: !isCI,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
