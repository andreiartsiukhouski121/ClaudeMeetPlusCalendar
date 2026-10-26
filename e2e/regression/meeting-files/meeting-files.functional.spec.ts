import type { Locator, Page } from '@playwright/test';

import { poolCredentials } from '../../api/auth.api.js';
import { createSeededShapeCopy } from '../../api/meeting-files.api.js';
import { fetchMeetingsPage, type SeededShapeMeetings } from '../../api/meetings.api.js';
import { isNestRequest } from '../../fixtures/api.js';
import { collectConsoleProblems } from '../../fixtures/console.js';
import {
  EMPTY_FILES_MEETING_TITLE,
  FUTURE_STARTS_AT_LOCAL,
  GEOMETRY_WORKSHOP_MEETING_ID,
  GEOMETRY_WORKSHOP_TITLE,
  TEACHER_MEETING_FILES,
} from '../../fixtures/seed.js';
import { expect, test } from '../../fixtures/suite.js';

/**
 * UI of the meeting detail page `/meetings/<id>`. Cases live in the paired
 * `meeting-files.functional.cases.md`; every test title starts with its case ID.
 *
 * Project `web`: Desktop Chrome, `baseURL = http://127.0.0.1:3100`, relative paths.
 *
 * Every case with a session holds one pool user (`FACT-3783`) and opens with `sessionPage`, a page
 * carrying the cookie built from that user's token (`FACT-3756`). Read-only cases get the
 * seeded-shape copy — `teacher`'s five meetings and the two uploads on the "Geometry workshop" copy
 * (`FACT-3799`) — in `beforeEach` and delete it in `afterEach` (`FACT-3809`). Mutating cases hold
 * their own user, register `cleanup.trackAllOf(claim)` before their first create (`FACT-3810`) and
 * each create their own meeting. Only `MF-FN-09` signs in through the form (`FACT-3806`).
 *
 * Locators go by role, label and text only, and an assertion's scope matches its subject: the
 * upload form's alert is read through `getByRole('main').getByRole('alert')`, never a bare
 * `getByRole('alert')` — App Router's own hidden route-announcer `role="alert"` div lives outside
 * `<main>` on every page and would otherwise make the count two (the lesson `auth-login` already
 * carries for its own form).
 */

const SESSION_COOKIE_NAME = 'ps_session';

/** The attachment list, located by its accessible name rather than a page-wide `getByRole('list')`,
 * since `MF-FN-13`'s dashboard also carries one named "Recent meetings". */
function attachmentsList(page: Page): Locator {
  return page.getByRole('list', { name: 'Attachments' });
}

/**
 * The upload form's own alert. A page-wide `getByRole('alert')` resolves to two elements on every
 * App Router page (`__next-route-announcer__` plus this one): scoping to `main` is the same fix
 * `auth-login.functional.spec.ts` already applies to its own form, carried over here.
 */
function formAlert(page: Page): Locator {
  return page.getByRole('main').getByRole('alert');
}

/**
 * Creates a meeting as the held user through the dashboard form and returns its id. The id comes
 * from `GET /meetings` by the unique generated title: the user holds no other meeting, but the
 * dashboard's top-3 list is sliced server-side and is not the source of an id.
 */
async function createHeldMeeting(
  page: Page,
  apiRequest: Parameters<typeof fetchMeetingsPage>[0],
  token: string,
): Promise<string> {
  const title = `MF upload ${String(Date.now())}-${String(Math.floor(Math.random() * 1e6))}`;

  await page.goto('/');
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Date and time').fill(FUTURE_STARTS_AT_LOCAL);
  await page.getByRole('button', { name: 'Create meeting' }).click();

  // The button re-enabling means the Server Action's round trip (including its own
  // `POST /meetings`) has resolved, so the meeting already exists by the time of the GET below.
  await expect(page.getByRole('button', { name: 'Create meeting' })).toBeEnabled();

  const body = await fetchMeetingsPage(apiRequest, token, '?limit=50');
  const created = body.items.find((item) => item.title === title);

  expect(created, `created meeting "${title}" not found via GET /meetings`).toBeDefined();

  return created?.id ?? '';
}

test.describe('Meeting files: UI', { tag: ['@regression', '@meeting-files'] }, () => {
  test.describe('as the held user with the seeded-shape copy', () => {
    let copy: SeededShapeMeetings;

    test.beforeEach(async ({ claim, apiRequest, preconditions }) => {
      copy = await createSeededShapeCopy(apiRequest, claim.token, preconditions);
    });

    test.afterEach(async ({ preconditions }) => {
      await preconditions.run();
    });

    test(
      'MF-FN-01 — a dashboard meeting title links to its detail page',
      { tag: '@p0' },
      async ({ sessionPage, cleanup }) => {
        try {
          await sessionPage.goto('/');

          const row = sessionPage.getByRole('link', { name: GEOMETRY_WORKSHOP_TITLE });
          await expect(row).toBeVisible();
          await row.click();

          await expect(sessionPage).toHaveURL(`/meetings/${copy[GEOMETRY_WORKSHOP_TITLE]}`);
          await expect(sessionPage.getByRole('heading', { level: 1 })).toContainText(
            GEOMETRY_WORKSHOP_TITLE,
          );
        } finally {
          await cleanup.run();
        }
      },
    );

    test(
      'MF-FN-02 — the detail page has one h1 with the title and one main',
      { tag: '@p0' },
      async ({ sessionPage, cleanup }) => {
        try {
          await sessionPage.goto(`/meetings/${copy[GEOMETRY_WORKSHOP_TITLE]}`);

          const heading = sessionPage.getByRole('heading', { level: 1 });
          await expect(heading).toHaveCount(1);
          await expect(heading).toContainText(GEOMETRY_WORKSHOP_TITLE);

          await expect(sessionPage.getByRole('main')).toHaveCount(1);
          await expect(sessionPage.getByRole('heading', { level: 2, name: 'Files' })).toBeVisible();

          // Start time and duration, visible as text — the copy carries the seeded "Geometry
          // workshop" values: 2026-01-15T14:00:00.000Z for 90 minutes.
          await expect(sessionPage.getByText('15 Jan 2026, 14:00')).toBeVisible();
          await expect(sessionPage.getByText('90 min')).toBeVisible();
        } finally {
          await cleanup.run();
        }
      },
    );

    test(
      'MF-FN-03 — the attachment list names both seeded files, newest first',
      { tag: '@p0' },
      async ({ sessionPage, cleanup }) => {
        try {
          await sessionPage.goto(`/meetings/${copy[GEOMETRY_WORKSHOP_TITLE]}`);

          const list = attachmentsList(sessionPage);
          await expect(list).toBeVisible();

          const items = list.getByRole('listitem');
          await expect(items).toHaveCount(2);

          const [notes, syllabus] = TEACHER_MEETING_FILES.items;

          await expect(items.nth(0)).toContainText(notes.filename);
          await expect(items.nth(0)).toContainText('48 B');
          await expect(items.nth(0).getByRole('link', { name: notes.filename })).toBeVisible();

          await expect(items.nth(1)).toContainText(syllabus.filename);
          await expect(items.nth(1)).toContainText('1.0 KiB');
          await expect(items.nth(1).getByRole('link', { name: syllabus.filename })).toBeVisible();
        } finally {
          await cleanup.run();
        }
      },
    );

    test('MF-FN-04 — a meeting with no files shows an empty state, not a blank', async ({
      sessionPage,
      cleanup,
    }) => {
      try {
        await sessionPage.goto('/');
        await sessionPage.getByRole('link', { name: EMPTY_FILES_MEETING_TITLE }).click();

        await expect(sessionPage.getByRole('heading', { level: 2, name: 'Files' })).toBeVisible();
        await expect(sessionPage.getByText('No attachments yet')).toBeVisible();

        // No stray `ul`/`li`: both roles are absent rather than present-but-empty, which is the
        // accessible-name-and-role equivalent of "no empty `ul` left behind" (a markup choice with no
        // accessible contract of its own to assert against directly).
        await expect(sessionPage.getByRole('list')).toHaveCount(0);
        await expect(sessionPage.getByRole('listitem')).toHaveCount(0);

        // The upload form is still shown.
        await expect(sessionPage.getByLabel('Attachment', { exact: true })).toBeVisible();
        await expect(sessionPage.getByRole('button', { name: 'Upload' })).toBeVisible();
      } finally {
        await cleanup.run();
      }
    });

    test(
      'MF-FN-07 — the download link serves the bytes from this origin',
      { tag: '@p0' },
      async ({ sessionPage, apiBaseURL, cleanup }) => {
        try {
          await sessionPage.goto(`/meetings/${copy[GEOMETRY_WORKSHOP_TITLE]}`);

          const link = attachmentsList(sessionPage).getByRole('link', { name: 'syllabus.pdf' });
          const href = await link.getAttribute('href');

          expect(href).not.toBeNull();
          expect(
            href,
            'the href must be same-origin relative, never an absolute Nest URL',
          ).not.toMatch(/^https?:\/\//);

          const response = await sessionPage.context().request.get(href ?? '');

          expect(response.status()).toBe(200);
          expect(
            isNestRequest(response.url(), apiBaseURL),
            'the download must never hit Nest directly',
          ).toBe(false);

          expect(response.headers()['content-disposition']).toBe(
            'attachment; filename="syllabus.pdf"; filename*=UTF-8\'\'syllabus.pdf',
          );
          expect(response.headers()['x-content-type-options']).toBe('nosniff');
          expect(response.headers()['cache-control']).toBe('private, no-store');

          const body = await response.body();
          const syllabus = TEACHER_MEETING_FILES.items[1];
          expect(body).toHaveLength(syllabus.sizeBytes);
          expect(body.toString('utf8').startsWith(TEACHER_MEETING_FILES.pdfHeader)).toBe(true);
        } finally {
          await cleanup.run();
        }
      },
    );

    test("MF-FN-10 — the upload form's accessible contract", async ({ sessionPage, cleanup }) => {
      try {
        await sessionPage.goto(`/meetings/${copy[GEOMETRY_WORKSHOP_TITLE]}`);

        const input = sessionPage.getByLabel('Attachment', { exact: true });
        await expect(input).toBeVisible();
        await expect(input).toHaveAttribute('type', 'file');
        await expect(input).toHaveAttribute('name', 'file');

        // Invariant 15: no `required`, no `accept` — either would let the browser block submission
        // before the server branches (MF-FN-06, MF-FN-15) ever ran.
        await expect(input).not.toHaveAttribute('required');
        await expect(input).not.toHaveAttribute('accept');

        await expect(sessionPage.getByRole('button', { name: 'Upload' })).toBeVisible();

        const noValidate = await input.evaluate(
          (element) => (element as HTMLInputElement).form?.noValidate,
        );
        expect(noValidate).toBe(true);
      } finally {
        await cleanup.run();
      }
    });

    test('MF-FN-11 — an unknown meeting id renders the not-found page', async ({
      sessionPage,
      cleanup,
    }) => {
      try {
        const problems = collectConsoleProblems(sessionPage);

        const response = await sessionPage.goto(
          `/meetings/${copy[GEOMETRY_WORKSHOP_TITLE]}-does-not-exist`,
        );

        expect(response?.status()).toBe(404);
        await expect(sessionPage.getByRole('heading', { level: 1 })).toHaveText('404');
        await expect(sessionPage.getByText('This page could not be found.')).toBeVisible();

        // "No error overlay or stack" is checked as "no uncaught exception", not as "zero console
        // output": Chromium itself always logs its own `console.error: Failed to load resource: the
        // server responded with a status of 404` for the top-level document whenever a navigation's
        // own response is a 4xx/5xx — verified live, independent of this application, and unrelated to
        // whether the page threw. A blanket-empty assertion here would be red on every correctly
        // working 404 page, which is not what this case is about; `HD-FN-10`/`MF-FN-14` keep the
        // blanket check on pages that are expected to answer 200.
        expect(problems.filter((problem) => problem.startsWith('pageerror:'))).toEqual([]);
      } finally {
        await cleanup.run();
      }
    });

    test('MF-FN-12 — a stale file id answers 404 without a page error', async ({
      sessionPage,
      cleanup,
    }) => {
      try {
        await sessionPage.goto(`/meetings/${copy[GEOMETRY_WORKSHOP_TITLE]}`);

        const href = await attachmentsList(sessionPage)
          .getByRole('link', { name: 'syllabus.pdf' })
          .getAttribute('href');
        expect(href).not.toBeNull();

        const staleHref = `${href ?? ''}-does-not-exist`;
        const response = await sessionPage.context().request.get(staleHref);

        expect(response.status()).toBe(404);
        expect(await response.body()).toHaveLength(0);
        // No redirect anywhere, in particular not to login: the final URL is still the stale one
        // requested, rather than `/auth/login` or `/auth/session-expired`.
        expect(response.url()).toContain('-does-not-exist');
      } finally {
        await cleanup.run();
      }
    });

    test('MF-FN-13 — "Back to dashboard" returns to /', async ({ sessionPage, claim, cleanup }) => {
      try {
        await sessionPage.goto(`/meetings/${copy[GEOMETRY_WORKSHOP_TITLE]}`);

        await sessionPage.getByRole('link', { name: 'Back to dashboard' }).click();

        await expect(sessionPage).toHaveURL('/');
        await expect(sessionPage.getByRole('heading', { level: 1 })).toContainText(claim.email);
        await expect(sessionPage.getByRole('list', { name: 'Recent meetings' })).toBeVisible();
      } finally {
        await cleanup.run();
      }
    });

    test('MF-FN-14 — the detail page logs nothing to the console', async ({
      sessionPage,
      cleanup,
    }) => {
      try {
        const problems = collectConsoleProblems(sessionPage);

        await sessionPage.goto(`/meetings/${copy[GEOMETRY_WORKSHOP_TITLE]}`);
        await expect(sessionPage.getByRole('heading', { level: 1 })).toContainText(
          GEOMETRY_WORKSHOP_TITLE,
        );
        await expect(attachmentsList(sessionPage)).toBeVisible();

        expect(problems).toEqual([]);
      } finally {
        await cleanup.run();
      }
    });

    test.describe('with no built session', () => {
      test.use({ storageState: undefined });

      test(
        'MF-FN-09 — a broken session on the download lands on session-expired',
        { tag: ['@p0', '@ui-login'] },
        async ({ page, claim, baseURL, cleanup }) => {
          try {
            const { email, password } = poolCredentials(claim.number);

            const signIn = async (): Promise<void> => {
              await page.goto('/auth/login');
              await page.getByLabel('Email').fill(email);
              await page.getByLabel('Password').fill(password);
              await page.getByRole('button', { name: 'Sign in' }).click();
              await expect(page).toHaveURL('/');
            };

            await signIn();
            await page.goto(`/meetings/${copy[GEOMETRY_WORKSHOP_TITLE]}`);

            const href = await attachmentsList(page)
              .getByRole('link', { name: 'syllabus.pdf' })
              .getAttribute('href');
            expect(href).not.toBeNull();

            expect(
              baseURL,
              'the web project baseURL is not set in playwright.config.ts',
            ).toBeDefined();
            await page.context().addCookies([
              {
                name: SESSION_COOKIE_NAME,
                value: 'not.a.valid.jwt',
                url: baseURL ?? '',
              },
            ]);

            // Hop 1: the download route reads the forged cookie, Nest answers 401, and the Route
            // Handler redirects to `/auth/session-expired` — never straight to `/auth/login`
            // (invariant 17 would otherwise loop against `proxy.ts`).
            const hop1 = await page.context().request.get(href ?? '', { maxRedirects: 0 });
            expect(hop1.status(), 'first hop, from the download route').toBe(307);
            const hop1Location = hop1.headers().location;
            expect(hop1Location).toBe('/auth/session-expired');

            // Hop 2: `/auth/session-expired` clears the cookie and redirects to `/auth/login`.
            const hop2 = await page.context().request.get(hop1Location, { maxRedirects: 0 });
            expect(hop2.status(), 'second hop, from /auth/session-expired').toBe(307);
            expect(hop2.headers().location).toBe('/auth/login');

            const remainingCookies = (await page.context().cookies())
              .filter((cookie) => cookie.name === SESSION_COOKIE_NAME)
              .map((cookie) => cookie.value)
              .filter((value) => value !== '');
            expect(
              remainingCookies,
              'the session cookie must be erased, not merely invalid',
            ).toEqual([]);

            // No loop: `/auth/login` itself answers 200 rather than bouncing anywhere else.
            const finalResponse = await page.context().request.get('/auth/login');
            expect(finalResponse.status()).toBe(200);
            expect(finalResponse.url()).toContain('/auth/login');

            // Signing in again afterwards works.
            await signIn();
          } finally {
            await cleanup.run();
          }
        },
      );
    });
  });

  test.describe('as the held user, each creating its own meeting', () => {
    test(
      'MF-FN-05 — uploading through the form adds a row for the file',
      { tag: ['@p0', '@mutating'] },
      async ({ sessionPage, claim, apiRequest, cleanup }) => {
        try {
          // Before the first create: every meeting of the held user is deleted at the end (`FACT-3810`).
          cleanup.trackAllOf(claim);

          const id = await createHeldMeeting(sessionPage, apiRequest, claim.token);
          await sessionPage.goto(`/meetings/${id}`);

          await expect(sessionPage.getByText('No attachments yet')).toBeVisible();

          const filename = `upload-${String(Date.now())}.txt`;
          await sessionPage.getByLabel('Attachment', { exact: true }).setInputFiles({
            name: filename,
            mimeType: 'text/plain',
            buffer: Buffer.from('hello'),
          });
          await sessionPage.getByRole('button', { name: 'Upload' }).click();

          await expect(
            attachmentsList(sessionPage).getByRole('link', { name: filename }),
          ).toBeVisible();
          await expect(sessionPage.getByText('No attachments yet')).toBeHidden();

          // The upload form renders no alert at all on success.
          await expect(formAlert(sessionPage)).toHaveCount(0);
        } finally {
          await cleanup.run();
        }
      },
    );

    test(
      'MF-FN-06 — a refused upload shows one role="alert" and adds no row',
      { tag: ['@p0', '@mutating'] },
      async ({ sessionPage, claim, apiRequest, cleanup }) => {
        try {
          cleanup.trackAllOf(claim);

          const id = await createHeldMeeting(sessionPage, apiRequest, claim.token);
          await sessionPage.goto(`/meetings/${id}`);

          const filename = `archive-${String(Date.now())}.zip`;
          await sessionPage.getByLabel('Attachment', { exact: true }).setInputFiles({
            name: filename,
            mimeType: 'application/zip',
            buffer: Buffer.from('PK'),
          });
          await sessionPage.getByRole('button', { name: 'Upload' }).click();

          const alert = formAlert(sessionPage);
          await expect(alert).toHaveCount(1);
          await expect(alert).toHaveText(
            'Unsupported file type: upload a PDF, PNG, JPEG or plain text file',
          );

          await expect(sessionPage.getByRole('link', { name: filename })).toHaveCount(0);
          await expect(sessionPage.getByText('No attachments yet')).toBeVisible();
          await expect(sessionPage).toHaveURL(`/meetings/${id}`);
        } finally {
          await cleanup.run();
        }
      },
    );

    test(
      'MF-FN-15 — an empty file selection reaches the server, not a block',
      { tag: '@mutating' },
      async ({ sessionPage, claim, apiRequest, cleanup }) => {
        try {
          cleanup.trackAllOf(claim);

          const id = await createHeldMeeting(sessionPage, apiRequest, claim.token);
          await sessionPage.goto(`/meetings/${id}`);

          // No `setInputFiles` call at all: the input keeps its browser default of no selected
          // file, and since it carries no `required` the click is never blocked client-side.
          await sessionPage.getByRole('button', { name: 'Upload' }).click();

          const alert = formAlert(sessionPage);
          await expect(alert).toHaveCount(1);
          await expect(alert).toHaveText('file is required');

          await expect(sessionPage.getByText('No attachments yet')).toBeVisible();
          await expect(sessionPage).toHaveURL(`/meetings/${id}`);
        } finally {
          await cleanup.run();
        }
      },
    );
  });

  test.describe('without a session', () => {
    test.use({ storageState: undefined });

    test(
      'MF-FN-08 — an unauthenticated visitor on the page goes to login',
      { tag: '@p0' },
      async ({ page, cleanup }) => {
        try {
          await page.goto(`/meetings/${GEOMETRY_WORKSHOP_MEETING_ID}`);

          await expect(page).toHaveURL('/auth/login');
          await expect(page.getByLabel('Email')).toBeVisible();

          // The bounce happened before the render: no meeting title, no filename, no upload control.
          await expect(page.getByText(GEOMETRY_WORKSHOP_TITLE)).toHaveCount(0);
          await expect(page.getByText('syllabus.pdf')).toHaveCount(0);
          await expect(page.getByLabel('Attachment', { exact: true })).toHaveCount(0);
        } finally {
          await cleanup.run();
        }
      },
    );
  });
});
