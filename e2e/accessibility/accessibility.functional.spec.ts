import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

import { SEED_USERS } from '../fixtures/seed';
import { expect, test } from '../fixtures/auth.fixture';

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
 * Every page the application serves. **Adding a page means adding a line here** — this list is the
 * only thing connecting this suite to a growing application, exactly like `PROTECTED_ROUTES` and
 * `PROTECTED_PAGES` under invariant 16, and it carries the same weakness: nothing notices a
 * forgotten line.
 */
const AUDITED_PAGES = [
  { path: '/auth/login', needsSession: false },
  { path: '/auth/register', needsSession: false },
  { path: '/', needsSession: true },
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

test.describe('Accessibility', { tag: '@accessibility' }, () => {
  test('ACC-FN-01 — every public page passes WCAG 2.1 AA', { tag: '@p0' }, async ({ page }) => {
    for (const { path } of PUBLIC_PAGES) {
      await page.goto(path);

      expect(await violationsOf(page), `${path} has accessibility violations`).toEqual([]);
    }
  });

  test(
    'ACC-FN-02 — the dashboard passes WCAG 2.1 AA for a signed-in user',
    { tag: '@p0' },
    async ({ authedPage }) => {
      await authedPage.goto('/');

      // The scan is meaningless if the page did not actually render the authenticated view.
      await expect(authedPage.getByRole('heading', { level: 1 })).toBeVisible();

      expect(await violationsOf(authedPage), '/ has accessibility violations').toEqual([]);
    },
  );

  test('ACC-FN-03 — the login form in its error state passes WCAG 2.1 AA', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByLabel('Email').fill(SEED_USERS.teacher.email);
    await page.getByLabel('Password').fill('definitely-not-the-password');
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Scanning before the live region exists would scan the same DOM as ACC-FN-01.
    await expect(page.getByRole('alert')).toBeVisible();

    expect(await violationsOf(page), 'the login error state has violations').toEqual([]);
  });

  test('ACC-FN-04 — every audited page has exactly one h1 and a main landmark', async ({
    page,
    authedPage,
  }) => {
    // Two loops rather than one with a conditional: `playwright/no-conditional-in-test` forbids
    // branching in a test body, and the split is what the branch would have computed anyway.
    for (const { path } of PUBLIC_PAGES) {
      await page.goto(path);

      // axe does not fail a page for a missing or duplicated h1, so it is asserted here.
      await expect(page.getByRole('heading', { level: 1 }), `${path}: h1 count`).toHaveCount(1);
      await expect(page.getByRole('main'), `${path}: main landmark`).toHaveCount(1);
    }

    for (const { path } of SESSION_PAGES) {
      await authedPage.goto(path);

      await expect(authedPage.getByRole('heading', { level: 1 }), `${path}: h1 count`).toHaveCount(
        1,
      );
      await expect(authedPage.getByRole('main'), `${path}: main landmark`).toHaveCount(1);
    }
  });
});
