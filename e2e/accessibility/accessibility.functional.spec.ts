import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

import { createSeededShapeCopy } from '../api/meeting-files.api.js';
import { GEOMETRY_WORKSHOP_TITLE, SEED_USERS } from '../fixtures/seed.js';
import { expect, test } from '../fixtures/suite.js';

/**
 * Cross-feature accessibility scan. Scenarios: `accessibility.functional.cases.md`.
 *
 * `axe-core` through `@axe-core/playwright`, against WCAG 2.0 A/AA and 2.1 A/AA (`ADR-0025`). It is
 * a floor, not a verdict: a scanner catches roughly a third of real barriers and judges no flow.
 *
 * Project `web`: Desktop Chrome, `baseURL` = `http://127.0.0.1:3100`.
 */

/** The WCAG levels the suite holds the application to. Widening this is a decision, not a tweak. */
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/**
 * Stands in for the held user's "Geometry workshop" copy in a path: no literal id is written into
 * a case, and `pathOf` resolves it once the copy exists.
 */
const GEOMETRY_PATH_TOKEN = ':geometry-workshop';

/**
 * Every page the application serves. **Adding a page means adding a line here** — this list is the
 * only thing connecting this suite to a growing application, exactly like `PROTECTED_ROUTES` and
 * `PROTECTED_PAGES` under invariant 16, and it carries the same weakness: nothing notices a
 * forgotten line.
 */
const AUDITED_PAGES = [
  { path: '/auth/login', needsSession: false },
  { path: '/auth/register', needsSession: false },
  { path: '/', needsSession: true },
  { path: `/meetings/${GEOMETRY_PATH_TOKEN}`, needsSession: true },
] as const;

const PUBLIC_PAGES = AUDITED_PAGES.filter((p) => !p.needsSession);
const SESSION_PAGES = AUDITED_PAGES.filter((p) => p.needsSession);

/** axe's own report, flattened into something a failure message can be read from. */
async function violationsOf(page: Page): Promise<string[]> {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

  return violations.flatMap((violation) =>
    violation.nodes.map(
      (node) =>
        `${violation.id} (${violation.impact ?? 'unknown'}): ${violation.help}\n` +
        `    ${node.html}\n` +
        `    ${node.failureSummary ?? ''}`,
    ),
  );
}

/** A path of `AUDITED_PAGES` with the held user's "Geometry workshop" copy's id put in. */
function pathOf(path: string, geometryMeetingId: string): string {
  return path.replace(GEOMETRY_PATH_TOKEN, geometryMeetingId);
}

test.describe('Accessibility', { tag: '@accessibility' }, () => {
  test.describe('pages without a session', () => {
    test(
      'ACC-FN-01 — every public page passes WCAG 2.1 AA',
      { tag: '@p0' },
      async ({ page, cleanup }) => {
        try {
          for (const { path } of PUBLIC_PAGES) {
            await page.goto(path);

            expect(await violationsOf(page), `${path} has accessibility violations`).toEqual([]);
          }
        } finally {
          await cleanup.run();
        }
      },
    );

    test('ACC-FN-03 — the login form in its error state passes WCAG 2.1 AA', async ({
      page,
      cleanup,
    }) => {
      try {
        await page.goto('/auth/login');
        await page.getByLabel('Email').fill(SEED_USERS.teacher.email);
        await page.getByLabel('Password').fill('definitely-not-the-password');
        await page.getByRole('button', { name: 'Sign in' }).click();

        // Scoped to `main` and to the exact text: App Router's route announcer is a `role="alert"`
        // outside `main`, and a bare locator can be satisfied before the form's paragraph exists, so
        // the scan would miss the error DOM. The pointer stays where the click put it, on the button.
        const alert = page.getByRole('main').getByRole('alert');
        await expect(alert).toBeVisible();
        await expect(alert).toContainText('Invalid email or password');

        expect(await violationsOf(page), 'the login error state has violations').toEqual([]);
      } finally {
        await cleanup.run();
      }
    });
  });

  test.describe('pages behind a session, on the held user with the seeded-shape copy', () => {
    let geometryMeetingId = '';

    test.beforeEach(async ({ claim, apiRequest, preconditions }) => {
      const copy = await createSeededShapeCopy(apiRequest, claim.token, preconditions);
      geometryMeetingId = copy[GEOMETRY_WORKSHOP_TITLE];
    });

    test.afterEach(async ({ preconditions }) => {
      await preconditions.run();
    });

    test(
      'ACC-FN-02 — every page behind a session passes WCAG 2.1 AA',
      { tag: '@p0' },
      async ({ sessionPage, cleanup }) => {
        try {
          // Every `needsSession: true` entry, not just `/`: a hardcoded path here would buy a newly
          // added session-gated page the one-`h1`/one-`main` assertions of `ACC-FN-04` and no scan at
          // all — exactly the gap this file's own preamble warns about.
          for (const { path } of SESSION_PAGES) {
            const resolved = pathOf(path, geometryMeetingId);
            await sessionPage.goto(resolved);

            // The scan is meaningless if the page did not actually render the authenticated view.
            await expect(sessionPage.getByRole('heading', { level: 1 })).toBeVisible();

            expect(
              await violationsOf(sessionPage),
              `${resolved} has accessibility violations`,
            ).toEqual([]);
          }
        } finally {
          await cleanup.run();
        }
      },
    );

    test('ACC-FN-05 — the create-meeting form in its error state passes WCAG 2.1 AA', async ({
      sessionPage,
      cleanup,
    }) => {
      try {
        await sessionPage.goto('/');
        await sessionPage.getByRole('button', { name: 'Create meeting' }).click();

        const alert = sessionPage.getByRole('main').getByRole('alert');
        await expect(alert).toBeVisible();
        await expect(alert).toContainText('Enter a meeting title');

        expect(
          await violationsOf(sessionPage),
          'the create-meeting error state has violations',
        ).toEqual([]);
      } finally {
        await cleanup.run();
      }
    });

    test('ACC-FN-06 — the upload form in its error state passes WCAG 2.1 AA', async ({
      sessionPage,
      cleanup,
    }) => {
      try {
        await sessionPage.goto(`/meetings/${geometryMeetingId}`);
        await sessionPage.getByRole('button', { name: 'Upload' }).click();

        // The API's 400 shown verbatim: an empty selection submits an empty `File`, not `null`.
        const alert = sessionPage.getByRole('main').getByRole('alert');
        await expect(alert).toBeVisible();
        await expect(alert).toContainText('file is required');

        expect(await violationsOf(sessionPage), 'the upload error state has violations').toEqual(
          [],
        );
      } finally {
        await cleanup.run();
      }
    });

    test('ACC-FN-04 — every audited page has exactly one h1 and a main landmark', async ({
      page,
      sessionPage,
      cleanup,
    }) => {
      try {
        // Two loops rather than one with a conditional: `playwright/no-conditional-in-test` forbids
        // branching in a test body, and the split is what the branch would have computed anyway.
        for (const { path } of PUBLIC_PAGES) {
          await page.goto(path);

          // axe does not fail a page for a missing or duplicated h1, so it is asserted here.
          await expect(page.getByRole('heading', { level: 1 }), `${path}: h1 count`).toHaveCount(1);
          await expect(page.getByRole('main'), `${path}: main landmark`).toHaveCount(1);
        }

        for (const { path } of SESSION_PAGES) {
          await sessionPage.goto(pathOf(path, geometryMeetingId));

          await expect(
            sessionPage.getByRole('heading', { level: 1 }),
            `${path}: h1 count`,
          ).toHaveCount(1);
          await expect(sessionPage.getByRole('main'), `${path}: main landmark`).toHaveCount(1);
        }
      } finally {
        await cleanup.run();
      }
    });
  });
});
