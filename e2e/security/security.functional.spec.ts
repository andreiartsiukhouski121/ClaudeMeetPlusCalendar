import { createHmac } from 'node:crypto';

import { expect, mergeTests, type Page } from '@playwright/test';

import { isNestRequest, test as apiTest } from '../fixtures/api.js';
import { test as authTest } from '../fixtures/auth.fixture.js';
import { SEED_USERS } from '../fixtures/seed.js';

/**
 * Security invariants visible only from the browser. Cases live in the paired
 * `security.functional.cases.md`.
 *
 * Project `web`: Desktop Chrome, `baseURL = http://127.0.0.1:3100`, relative paths.
 *
 * Some cases duplicate checks inside features (`AL-FN-13`, `HD-FN-11`) on purpose: there it is
 * part of one page's contract, here it is an invariant that must hold for every new page.
 */

/**
 * The sets are merged with `mergeTests`: the session from `auth.fixture.ts`, the Nest address from
 * the `apiBaseURL` option in `api.ts`, which `playwright.config.ts` supplies. This file used to
 * hold its own copy of the port formula (FX-023): it read the same environment variable and so
 * agreed with the config, but only by discipline. Once apart, `SEC-FN-03` would compare traffic
 * against an address where Nest was never started and silently stop checking the BFF rule.
 */
const test = mergeTests(authTest, apiTest);

const SESSION_COOKIE_NAME = 'ps_session';

/** Protected pages. Adding a page behind the gate means adding a path here (invariant 16). */
const PROTECTED_PAGES = ['/'];

/**
 * The web address from the project settings. There is DELIBERATELY no default: the former
 * `baseURL ?? 'http://…:3100'` was a fourth copy of the address and the only one that never read
 * the environment variable. It never got to fire — the `web` project always sets `baseURL` — but
 * if it had, it would have set the cookie on the wrong origin and "a forgery grants no access"
 * would have gone green having checked nothing (FX-023).
 *
 * A module-level function rather than a check inside the case: `playwright/no-conditional-in-test`
 * forbids branching in a test body, and rightly so.
 */
function requireBaseURL(baseURL: string | undefined): string {
  if (baseURL === undefined) {
    throw new Error(
      'The web project baseURL is not set in playwright.config.ts — there is nowhere to put the ' +
        'cookie. The address lives in the config; do not restore it as a literal here.',
    );
  }

  return baseURL;
}

async function sessionCookieValue(page: Page): Promise<string> {
  const cookies = await page.context().cookies();
  const session = cookies.find((cookie) => cookie.name === SESSION_COOKIE_NAME);

  expect(session, 'session cookie not found — the login did not work').toBeDefined();

  return session?.value ?? '';
}

test.describe('Security: browser', { tag: '@security' }, () => {
  test(
    'SEC-FN-01 — the session cookie is httpOnly and unreachable from JS',
    { tag: '@p0' },
    async ({ authedPage }) => {
      await authedPage.goto('/');

      const cookies = await authedPage.context().cookies();
      const session = cookies.find((cookie) => cookie.name === SESSION_COOKIE_NAME);

      expect(session).toBeDefined();
      expect(session?.httpOnly).toBe(true);
      expect(session?.sameSite).toBe('Lax');
      expect(session?.path).toBe('/');

      const visibleToScripts = await authedPage.evaluate(() => document.cookie);

      expect(visibleToScripts).not.toContain(SESSION_COOKIE_NAME);
      expect(visibleToScripts).not.toContain(session?.value ?? 'no-value');
    },
  );

  test(
    'SEC-FN-02 — the token never reaches the page HTML',
    { tag: '@p0' },
    async ({ authedPage }) => {
      await authedPage.goto('/');
      await expect(authedPage.getByRole('heading', { level: 1 })).toBeVisible();

      const token = await sessionCookieValue(authedPage);
      // page.content() returns the final HTML together with the serialized RSC stream — exactly
      // where a token passed as a prop to a client component would end up (invariant 19).
      const html = await authedPage.content();

      expect(html).not.toContain(token);
      expect(html).not.toContain('accessToken');
      expect(html).not.toContain('Bearer');
      expect(html).not.toContain('scrypt');
    },
  );

  test(
    'SEC-FN-03 — the browser never calls the API and never exposes the token on the wire',
    { tag: '@p0' },
    async ({ authedPage, apiBaseURL }) => {
      const requests: { url: string; hasAuthHeader: boolean }[] = [];

      authedPage.on('request', (request) => {
        requests.push({
          url: request.url(),
          hasAuthHeader: request.headers().authorization !== undefined,
        });
      });

      await authedPage.goto('/');
      await expect(authedPage.getByRole('heading', { level: 1 })).toBeVisible();

      expect(requests.length).toBeGreaterThan(0);
      expect(
        requests.filter((request) => isNestRequest(request.url, apiBaseURL)),
        `The browser called Nest directly (${apiBaseURL}) — a BFF violation`,
      ).toEqual([]);
      // A token header on a browser request would mean the BFF was bypassed even if the address
      // is Next's.
      expect(requests.filter((request) => request.hasAuthHeader)).toEqual([]);
    },
  );

  test.describe('without a session', () => {
    test.use({ storageState: undefined });

    test(
      'SEC-FN-04 — protected pages are unreachable without a session',
      { tag: '@p0' },
      async ({ page }) => {
        for (const path of PROTECTED_PAGES) {
          await page.goto(path);

          await expect(page).toHaveURL(/\/auth\/login$/);
          await expect(page.getByLabel('Email')).toBeVisible();
          await expect(page.getByText(SEED_USERS.teacher.email)).toHaveCount(0);
        }
      },
    );

    test(
      'SEC-FN-05 — a forged session cookie grants no access',
      { tag: '@p0' },
      async ({ page, baseURL }) => {
        const base64url = (value: object) =>
          Buffer.from(JSON.stringify(value)).toString('base64url').replace(/=+$/, '');
        const header = base64url({ alg: 'HS256', typ: 'JWT' });
        const payload = base64url({
          sub: 'usr-teacher',
          email: SEED_USERS.teacher.email,
          exp: Math.floor(Date.now() / 1000) + 3600,
        });
        const foreignSignature = createHmac('sha256', 'an-entirely-different-secret')
          .update(`${header}.${payload}`)
          .digest('base64url')
          .replace(/=+$/, '');

        const forgeries = ['not.a.jwt', `${header}.${payload}.${foreignSignature}`];

        for (const value of forgeries) {
          await page.context().clearCookies();
          await page.context().addCookies([
            {
              name: SESSION_COOKIE_NAME,
              value,
              url: requireBaseURL(baseURL),
            },
          ]);

          await page.goto('/');

          /*
           * `proxy.ts` only sees that a cookie EXISTS and would let this request through, so
           * validity has to be confirmed by the server layer (`lib/dal.ts` → `GET /auth/me`).
           * Without that, forging a cookie would grant access to the dashboard.
           */
          await expect(page).toHaveURL(/\/auth\/login$/);
          await expect(page.getByText(SEED_USERS.teacher.email)).toHaveCount(0);
        }
      },
    );
  });
});
