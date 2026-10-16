import { chromium, request, type FullConfig } from '@playwright/test';

import type { ApiOptions } from './api.js';
import { authHeaders, loginApi } from './auth.api.js';
import { GEOMETRY_WORKSHOP_MEETING_ID, SEED_USERS } from './seed.js';

/**
 * `globalSetup`: compiles every route of `apps/web` once, serially, before the first test (BL-058).
 *
 * Why. `next dev` compiles a route on its first request. With up to 14 workers the first requests
 * to never-compiled routes all arrive at once and under the suite's own load, which produced two
 * failures: Next answered its own HTML 404 before our handler ran, and the 404 then stuck for the
 * life of that process; and the first logins paid for compilation inside the 10 s `expect.timeout`
 * (AL-FN-02/03/04/08, ACC-FN-02/04/05/06, MF-FN-07/09/12). A lone request is handled correctly, so
 * the fix removes the concurrency instead of lengthening a timeout.
 *
 * Why a real login through the browser rather than a forged cookie or a GET only: the successful
 * branch of `loginAction` carries lazily loaded code that neither a GET of `/auth/login` nor a
 * wrong-password submit loads, and a real session lets every protected route execute its own
 * handler instead of being bounced by `proxy.ts` before it compiles (invariant 10).
 *
 * Why `globalSetup` and not a setup project: no new project and no spec to pair with a `.cases.md`.
 * Playwright awaits every `webServer` entry before it runs `globalSetup`.
 *
 * The route list below is hand-kept: a route added under `apps/web/src/app` needs a line here, or
 * its first compile goes back to happening under load.
 */

/** What a warm-up request is allowed to answer. A 404 is never among them: it is Next's own page. */
interface WarmUpRoute {
  readonly route: string;
  readonly expectedStatus: number;
}

function routeFailure(route: string, status: number, expected: number): Error {
  return new Error(
    status === 404
      ? `warm-up (BL-058): GET ${route} answered 404. Either the route is gone from apps/web and the ` +
          "list in e2e/fixtures/warm-up.ts is stale, or it is Next's own HTML 404 for a route that " +
          'exists, which sticks for the life of that process: restart next dev (stop whatever ' +
          'listens on the web port) and run again.'
      : `warm-up (BL-058): GET ${route} answered ${status}, expected ${expected}. The route list in ` +
          'e2e/fixtures/warm-up.ts or the seed has drifted from the application.',
  );
}

export default async function warmUp(config: FullConfig<ApiOptions>): Promise<void> {
  const web = config.projects.find((project) => project.name === 'web');
  const webURL = web?.use.baseURL;
  const apiURL = web?.use.apiBaseURL;

  if (webURL === undefined || apiURL === undefined) {
    throw new Error(
      'warm-up (BL-058): the web project has no baseURL or apiBaseURL in playwright.config.ts',
    );
  }

  const { email, password } = SEED_USERS.teacher;

  // The file id is not in the seed mirror: it is read from the API the way the specs read it.
  const api = await request.newContext({ baseURL: apiURL });
  let fileId: string;
  try {
    const token = await loginApi(api, 'teacher');
    const listing = await api.get(`/meetings/${GEOMETRY_WORKSHOP_MEETING_ID}/files`, {
      headers: authHeaders(token),
    });
    const items = (await listing.json()) as { items?: { id: string }[] };
    const first = items.items?.[0]?.id;
    if (first === undefined) {
      throw new Error(
        `warm-up (BL-058): ${GEOMETRY_WORKSHOP_MEETING_ID} lists no files, so the file route cannot ` +
          'be warmed. The seed has drifted.',
      );
    }
    fileId = first;
  } finally {
    await api.dispose();
  }

  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ baseURL: webURL });
    const page = await context.newPage();
    const navigationTimeout = 60_000;

    // Before the login: with a session `proxy.ts` bounces `/auth/login` to `/` before the page
    // compiles. `/auth/register` is outside the proxy matcher.
    const anonymous: WarmUpRoute[] = [
      { route: '/auth/login', expectedStatus: 200 },
      { route: '/auth/register', expectedStatus: 200 },
    ];
    for (const { route, expectedStatus } of anonymous) {
      const response = await page.goto(route, { timeout: navigationTimeout });
      const status = response?.status() ?? 0;
      if (status !== expectedStatus) {
        throw routeFailure(route, status, expectedStatus);
      }
    }

    // The login form's Server Action, the successful branch included, and `/` behind it.
    await page.goto('/auth/login', { timeout: navigationTimeout });
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(`${webURL}/`, { timeout: navigationTimeout });

    const pages: WarmUpRoute[] = [
      { route: '/', expectedStatus: 200 },
      { route: `/meetings/${GEOMETRY_WORKSHOP_MEETING_ID}`, expectedStatus: 200 },
    ];
    for (const { route, expectedStatus } of pages) {
      const response = await page.goto(route, { timeout: navigationTimeout });
      const status = response?.status() ?? 0;
      if (status !== expectedStatus) {
        throw routeFailure(route, status, expectedStatus);
      }
    }

    // Route Handlers answer without HTML, so they go through the context's request, which shares
    // the session cookie. `session-expired` goes last: it erases that cookie.
    const handlers: WarmUpRoute[] = [
      { route: `/meetings/${GEOMETRY_WORKSHOP_MEETING_ID}/files/${fileId}`, expectedStatus: 200 },
      { route: '/auth/session-expired', expectedStatus: 307 },
    ];
    for (const { route, expectedStatus } of handlers) {
      const response = await context.request.get(route, {
        maxRedirects: 0,
        timeout: navigationTimeout,
      });
      if (response.status() !== expectedStatus) {
        throw routeFailure(route, response.status(), expectedStatus);
      }
    }
  } finally {
    await browser.close();
  }
}
