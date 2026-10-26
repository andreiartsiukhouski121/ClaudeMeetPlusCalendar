import { createHmac } from 'node:crypto';

import type { Page } from '@playwright/test';

import { poolCredentials } from '../api/auth.api.js';
import { uploadMeetingFile } from '../api/meeting-files.api.js';
import { createMeeting } from '../api/meetings.api.js';
import { isNestRequest } from '../fixtures/api.js';
import {
  FUTURE_STARTS_AT_ISO,
  GEOMETRY_WORKSHOP_MEETING_ID,
  SEED_USERS,
} from '../fixtures/seed.js';
import { expect, test } from '../fixtures/suite.js';

/**
 * Security invariants visible only from the browser. Cases live in the paired
 * `security.functional.cases.md`.
 *
 * Project `web`: Desktop Chrome, `baseURL = http://127.0.0.1:3100`, relative paths.
 *
 * Some cases duplicate checks inside features (`AL-FN-13`, `HD-FN-11`) on purpose: there it is
 * part of one page's contract, here it is an invariant that must hold for every new page.
 *
 * Every case with a session holds one pool user (`FACT-3783`). `SEC-FN-01` signs in through the
 * form as that user, tagged `@ui-login` (`FACT-3806`), because its subject is the cookie the
 * application itself sets (`FACT-3042`). The two page walks open `sessionPage`, which carries the
 * cookie built from the held user's token (`FACT-3756`), on a meeting with one uploaded file
 * created in `beforeEach` and deleted in `afterEach` (`FACT-3809`). The cases without a session
 * claim nobody. The Nest address comes from the `apiBaseURL` option, never a copy of the port
 * formula (FX-023): once apart, `SEC-FN-03` would compare traffic against an address where Nest was
 * never started and silently stop checking the BFF rule.
 */

const SESSION_COOKIE_NAME = 'ps_session';

/**
 * Stands in for a meeting id in `PROTECTED_PAGES`: the session walks resolve it to the meeting the
 * held user created in `beforeEach`, `SEC-FN-04` to the seeded `GEOMETRY_WORKSHOP_MEETING_ID`.
 */
const MEETING_PATH_TOKEN = ':meeting';

/**
 * Protected pages. Adding a page behind the gate means adding a path here (invariant 16): every
 * page-walking case below reads this one list, resolved per case by `protectedPages`.
 */
const PROTECTED_PAGES = ['/', `/meetings/${MEETING_PATH_TOKEN}`];

/** `PROTECTED_PAGES` with a concrete meeting id put in. */
function protectedPages(meetingId: string): string[] {
  return PROTECTED_PAGES.map((path) => path.replace(MEETING_PATH_TOKEN, meetingId));
}

/** The one small file the session walks' meeting carries, so the detail page renders a file row. */
const WALK_FILE = {
  name: 'sec-fn-walk.txt',
  mimeType: 'text/plain',
  buffer: Buffer.from('bytes a protected page lists'),
};

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

  expect(session, 'session cookie not found — the session page carries no cookie').toBeDefined();

  return session?.value ?? '';
}

test.describe('Security: browser', { tag: '@security' }, () => {
  test.describe('signing in through the form as the held user', () => {
    test.use({ storageState: undefined });

    test(
      'SEC-FN-01 — the session cookie is httpOnly and unreachable from JS',
      { tag: ['@p0', '@ui-login'] },
      async ({ page, claim, cleanup }) => {
        try {
          const { email, password } = poolCredentials(claim.number);

          await page.goto('/auth/login');
          await page.getByLabel('Email').fill(email);
          await page.getByLabel('Password').fill(password);
          await page.getByRole('button', { name: 'Sign in' }).click();
          await expect(page).toHaveURL('/');

          const cookies = await page.context().cookies();
          const session = cookies.find((cookie) => cookie.name === SESSION_COOKIE_NAME);

          expect(session).toBeDefined();
          expect(session?.httpOnly).toBe(true);
          expect(session?.sameSite).toBe('Lax');
          expect(session?.path).toBe('/');

          const visibleToScripts = await page.evaluate(() => document.cookie);

          expect(visibleToScripts).not.toContain(SESSION_COOKIE_NAME);
          expect(visibleToScripts).not.toContain(session?.value ?? 'no-value');
        } finally {
          await cleanup.run();
        }
      },
    );
  });

  test.describe('on the held user with one meeting and one uploaded file', () => {
    let meetingId = '';

    test.beforeEach(async ({ claim, apiRequest, preconditions }) => {
      const meeting = await createMeeting(
        apiRequest,
        claim.token,
        { title: 'Security walk', startsAt: FUTURE_STARTS_AT_ISO },
        preconditions,
      );
      // The file goes with its meeting by cascade, so only the meeting is registered.
      await uploadMeetingFile(apiRequest, claim.token, meeting.id, WALK_FILE);
      meetingId = meeting.id;
    });

    test.afterEach(async ({ preconditions }) => {
      await preconditions.run();
    });

    test(
      'SEC-FN-02 — the token never reaches the page HTML',
      { tag: '@p0' },
      async ({ sessionPage, cleanup }) => {
        try {
          const token = await sessionCookieValue(sessionPage);

          /*
           * Every protected page, not just `/`. Passing the token as a prop into a client component
           * (invariant 19) is a mistake made WHEN A PAGE IS WRITTEN, so spending this case on the one
           * page that existed when it was written is the least useful place for it. The meeting
           * detail page renders server-fetched file metadata, links carrying file ids and a form
           * bound to a Server Action — exactly the shape that leaks, which is why the walk's meeting
           * carries an uploaded file.
           */
          for (const path of protectedPages(meetingId)) {
            await sessionPage.goto(path);
            await expect(sessionPage.getByRole('heading', { level: 1 })).toBeVisible();

            // page.content() returns the final HTML together with the serialized RSC stream —
            // exactly where a token passed as a prop to a client component would end up.
            const html = await sessionPage.content();

            // The path is named in every message: with more than one page in the list, "something
            // leaked somewhere" is not a usable failure.
            expect(html, `${path} carries the session token in its HTML`).not.toContain(token);
            expect(html, `${path} carries "accessToken" in its HTML`).not.toContain('accessToken');
            expect(html, `${path} carries "Bearer" in its HTML`).not.toContain('Bearer');
            expect(html, `${path} carries "scrypt" in its HTML`).not.toContain('scrypt');
          }
        } finally {
          await cleanup.run();
        }
      },
    );

    test(
      'SEC-FN-03 — the browser never calls the API and never exposes the token on the wire',
      { tag: '@p0' },
      async ({ sessionPage, apiBaseURL, cleanup }) => {
        try {
          const requests: { url: string; hasAuthHeader: boolean }[] = [];
          const pages = protectedPages(meetingId);

          sessionPage.on('request', (request) => {
            requests.push({
              url: request.url(),
              hasAuthHeader: request.headers().authorization !== undefined,
            });
          });

          /*
           * Every protected page in turn, into one accumulated list. Walking the list is what makes
           * this an invariant rather than a check of the dashboard: a page that fetches its own data
           * from Nest, or a download link pointed straight at the API port, is a PER-PAGE mistake
           * and has to be checked per page (`ADR-0002`).
           */
          for (const path of pages) {
            await sessionPage.goto(path);
            await expect(sessionPage.getByRole('heading', { level: 1 })).toBeVisible();
          }

          // Not empty: proof the recording worked at all, or everything below passes vacuously.
          expect(requests.length).toBeGreaterThan(0);
          expect(
            requests.filter((request) => isNestRequest(request.url, apiBaseURL)),
            `The browser called Nest directly (${apiBaseURL}) — a BFF violation. Pages visited: ` +
              pages.join(', '),
          ).toEqual([]);
          // A token header on a browser request would mean the BFF was bypassed even if the
          // address is Next's.
          expect(
            requests.filter((request) => request.hasAuthHeader),
            'A browser request carried an Authorization header — the token left the server layer',
          ).toEqual([]);
        } finally {
          await cleanup.run();
        }
      },
    );
  });

  test.describe('without a session', () => {
    test.use({ storageState: undefined });

    test(
      'SEC-FN-04 — protected pages are unreachable without a session',
      { tag: '@p0' },
      async ({ page, cleanup }) => {
        try {
          // The seeded id: no session means no held user, and the gate must refuse a real page.
          for (const path of protectedPages(GEOMETRY_WORKSHOP_MEETING_ID)) {
            await page.goto(path);

            await expect(page).toHaveURL(/\/auth\/login$/);
            await expect(page.getByLabel('Email')).toBeVisible();
            await expect(page.getByText(SEED_USERS.teacher.email)).toHaveCount(0);
          }
        } finally {
          await cleanup.run();
        }
      },
    );

    test(
      'SEC-FN-05 — a forged session cookie grants no access',
      { tag: '@p0' },
      async ({ page, baseURL, cleanup }) => {
        try {
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
        } finally {
          await cleanup.run();
        }
      },
    );
  });
});
