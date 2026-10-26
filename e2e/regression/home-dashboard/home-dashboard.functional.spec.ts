import type { Locator, Page } from '@playwright/test';

import { createSeededShapeMeetings, fetchMeetingsPage } from '../../api/meetings.api.js';
import { isNestRequest } from '../../fixtures/api.js';
import { collectConsoleProblems } from '../../fixtures/console.js';
import { FUTURE_STARTS_AT_LOCAL, SEED_USERS, TEACHER_MEETINGS } from '../../fixtures/seed.js';
import { expect, test } from '../../fixtures/suite.js';

/**
 * UI of the home page `/`. Cases live in the paired `home-dashboard.functional.cases.md`; every
 * test title starts with its case ID.
 *
 * Project `web`: Desktop Chrome, `baseURL = http://127.0.0.1:3100`, relative paths.
 *
 * Every case with a session holds one pool user (`FACT-3783`) and opens with `sessionPage`, a page
 * carrying the cookie built from that user's token (`FACT-3756`); none signs in through the form.
 * The baseline `total`/`items` and every precondition go through `apiRequest` as the held user —
 * NOT the built-in `request`, which in the `web` project has `baseURL` = `:3100` and would hit Next
 * rather than Nest. That does not break the BFF rule: the call comes from the test's Node process,
 * and browser traffic is checked by `HD-FN-11`.
 *
 * Cases that read `teacher`'s shape get its five meetings copied onto the held user in
 * `beforeEach` and deleted in `afterEach` (`FACT-3799`, `FACT-3809`); a case that creates through
 * the UI registers `cleanup.trackAllOf(claim)` before its first create (`FACT-3810`).
 *
 * Locators go by role, label and text only.
 */

/** The counter is a single text node in exactly the `Meetings total: N` format. */
const COUNTER_PATTERN = /^Meetings total: \d+$/;

const SESSION_COOKIE_NAME = 'ps_session';

function counter(page: Page): Locator {
  return page.getByText(COUNTER_PATTERN);
}

/**
 * The number from the counter. The helper is outside the test on purpose:
 * `playwright/no-conditional-in-test` is an error, and "throw if it did not match" needs one.
 */
async function readCounter(page: Page): Promise<number> {
  const text = await counter(page).innerText();
  const matched = /(\d+)/.exec(text);

  if (matched === null) {
    throw new Error(`Meeting counter not found in the text "${text}"`);
  }

  return Number(matched[1]);
}

const LATEST_QUERY = `?limit=${String(TEACHER_MEETINGS.latestLimit)}`;

test.describe('Dashboard: UI', { tag: ['@regression', '@home-dashboard'] }, () => {
  test.describe('without a session', () => {
    test.use({ storageState: undefined });

    test(
      'HD-FN-01 — an unauthenticated visitor on / goes to login',
      { tag: '@p0' },
      async ({ page, cleanup }) => {
        try {
          await page.goto('/');

          await expect(page).toHaveURL('/auth/login');
          await expect(page.getByLabel('Email')).toBeVisible();
          await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();

          // No dashboard data on the page — the redirect happened before the render.
          await expect(counter(page)).toBeHidden();
          await expect(page.getByText(SEED_USERS.teacher.email)).toBeHidden();
        } finally {
          await cleanup.run();
        }
      },
    );
  });

  test.describe('as the held user with the seeded-shape copy', () => {
    test.beforeEach(async ({ claim, apiRequest, preconditions }) => {
      await createSeededShapeMeetings(apiRequest, claim.token, preconditions);
    });

    test.afterEach(async ({ preconditions }) => {
      await preconditions.run();
    });

    test(
      'HD-FN-02 — the greeting contains the user email',
      { tag: '@p0' },
      async ({ sessionPage, claim, cleanup }) => {
        try {
          await sessionPage.goto('/');

          const greeting = sessionPage.getByRole('heading', { level: 1 });

          await expect(greeting).toBeVisible();
          await expect(greeting).toContainText(claim.email);
        } finally {
          await cleanup.run();
        }
      },
    );

    test(
      'HD-FN-03 — the meeting count matches the API data',
      { tag: '@p0' },
      async ({ sessionPage, claim, apiRequest, cleanup }) => {
        try {
          const reference = await fetchMeetingsPage(apiRequest, claim.token, LATEST_QUERY);

          await sessionPage.goto('/');

          // The expected number comes from the API response rather than a literal: replacing `total`
          // with `items.length` in the service must break this very assertion.
          await expect(
            sessionPage.getByText(`Meetings total: ${String(reference.total)}`),
          ).toBeVisible();
          expect(reference.total).toBe(TEACHER_MEETINGS.total);
          expect(await readCounter(sessionPage)).toBe(reference.total);
          expect(reference.total).not.toBe(reference.items.length);
        } finally {
          await cleanup.run();
        }
      },
    );

    test(
      'HD-FN-04 — exactly 3 recent meetings are shown',
      { tag: '@p0' },
      async ({ sessionPage, cleanup }) => {
        try {
          await sessionPage.goto('/');

          const list = sessionPage.getByRole('list');

          await expect(list).toBeVisible();
          await expect(list.getByRole('listitem')).toHaveCount(TEACHER_MEETINGS.latestLimit);
        } finally {
          await cleanup.run();
        }
      },
    );

    test(
      'HD-FN-05 — ordering and cutting of older meetings',
      { tag: '@p0' },
      async ({ sessionPage, claim, apiRequest, cleanup }) => {
        try {
          const reference = await fetchMeetingsPage(apiRequest, claim.token, LATEST_QUERY);

          await sessionPage.goto('/');

          const items = sessionPage.getByRole('list').getByRole('listitem');
          await expect(items).toHaveCount(reference.items.length);

          // The UI order is compared with the API order rather than a constant, so the case catches
          // both a lost sort in the service and a reordering in the markup.
          for (const [index, expectedTitle] of reference.items
            .map((item) => item.title)
            .entries()) {
            await expect(items.nth(index)).toContainText(expectedTitle);
          }
          expect(reference.items.map((item) => item.title)).toEqual([
            ...TEACHER_MEETINGS.latestTitles,
          ]);

          for (const omitted of TEACHER_MEETINGS.omittedTitles) {
            await expect(sessionPage.getByText(omitted)).toBeHidden();
          }
        } finally {
          await cleanup.run();
        }
      },
    );

    test(
      'HD-FN-06 — the "Create meeting" button is present',
      { tag: '@p0' },
      async ({ sessionPage, cleanup }) => {
        try {
          await sessionPage.goto('/');

          const button = sessionPage.getByRole('button', { name: 'Create meeting' });

          await expect(button).toBeVisible();
          await expect(button).toBeEnabled();
        } finally {
          await cleanup.run();
        }
      },
    );

    test(
      'HD-FN-07 — creating a meeting updates the counter and the list',
      { tag: ['@p0', '@mutating'] },
      async ({ sessionPage, claim, cleanup }) => {
        try {
          // Before the first create: every meeting of the held user is deleted at the end (`FACT-3810`).
          cleanup.trackAllOf(claim);

          await sessionPage.goto('/');

          const before = await readCounter(sessionPage);
          const title = `E2E meeting ${String(Date.now())}-${String(
            Math.floor(Math.random() * 1e6),
          )}`;

          await sessionPage.getByLabel('Title').fill(title);
          await sessionPage.getByLabel('Date and time').fill(FUTURE_STARTS_AT_LOCAL);
          await sessionPage.getByRole('button', { name: 'Create meeting' }).click();

          await expect(
            sessionPage.getByText(`Meetings total: ${String(before + 1)}`),
          ).toBeVisible();

          const items = sessionPage.getByRole('list').getByRole('listitem');
          // The 2030 date is later than any seeded meeting of the owner, and sorting is DESC, so the
          // new meeting comes first.
          await expect(items.first()).toContainText(title);
          expect(await items.count()).toBeLessThanOrEqual(TEACHER_MEETINGS.latestLimit);

          // Reload: the change must live on the server, not in client state.
          await sessionPage.reload();

          await expect(
            sessionPage.getByText(`Meetings total: ${String(before + 1)}`),
          ).toBeVisible();
          await expect(sessionPage.getByRole('list').getByRole('listitem').first()).toContainText(
            title,
          );
        } finally {
          await cleanup.run();
        }
      },
    );

    test('HD-FN-10 — no console errors on the dashboard', async ({
      sessionPage,
      claim,
      cleanup,
    }) => {
      try {
        // Subscribe BEFORE goto, or first-render errors never land in the list.
        const problems = collectConsoleProblems(sessionPage);

        await sessionPage.goto('/');
        await expect(sessionPage.getByRole('heading', { level: 1 })).toContainText(claim.email);
        await expect(counter(sessionPage)).toBeVisible();

        expect(problems).toEqual([]);
      } finally {
        await cleanup.run();
      }
    });

    test('HD-FN-11 — the browser never calls the API directly', async ({
      sessionPage,
      claim,
      apiBaseURL,
      cleanup,
    }) => {
      try {
        const requestedUrls: string[] = [];
        // Subscribe BEFORE the first navigation, or the page's requests never land in the list.
        sessionPage.on('request', (request) => requestedUrls.push(request.url()));

        await sessionPage.goto('/');
        await expect(sessionPage.getByRole('heading', { level: 1 })).toContainText(claim.email);

        const toNest = requestedUrls.filter((url) => isNestRequest(url, apiBaseURL));

        expect(
          toNest,
          `The browser called Nest directly (${apiBaseURL}) — a BFF violation. All page traffic ` +
            'must go to Next, and only the Next server talks to Nest.',
        ).toEqual([]);
        expect(requestedUrls.length).toBeGreaterThan(0);
      } finally {
        await cleanup.run();
      }
    });

    test('HD-FN-14 — accessibility of the controls', async ({ sessionPage, cleanup }) => {
      try {
        await sessionPage.goto('/');

        await expect(sessionPage.getByRole('list')).toBeVisible();
        await expect(sessionPage.getByRole('list').getByRole('listitem')).toHaveCount(
          TEACHER_MEETINGS.latestLimit,
        );

        // Role plus a non-empty accessible name: if the name disappears, the locator finds nothing.
        await expect(sessionPage.getByRole('button', { name: 'Create meeting' })).toBeVisible();
        await expect(sessionPage.getByRole('button', { name: 'Sign out' })).toBeVisible();

        await expect(sessionPage.getByRole('heading', { level: 1 })).toHaveCount(1);
      } finally {
        await cleanup.run();
      }
    });

    test('HD-FN-17 — the navigation rail names its one destination', async ({
      sessionPage,
      cleanup,
    }) => {
      try {
        await sessionPage.goto('/');

        const nav = sessionPage.getByRole('navigation', { name: 'Main' });
        await expect(nav).toBeVisible();
        await expect(nav.getByText('PurpleSchool')).toBeVisible();

        // That link is the only one in the rail — an invented second destination fails here. Scoped
        // to `nav` rather than taken page-wide: since `MF-FN-01` the dashboard's own meeting rows are
        // links too (`FACT-3559`), so a page-wide count is no longer 1 on an unmodified, working page.
        await expect(nav.getByRole('link')).toHaveCount(1);

        const dashboardLink = sessionPage.getByRole('link', { name: 'Dashboard' });
        await expect(dashboardLink).toBeVisible();
        await expect(dashboardLink).toHaveAttribute('href', '/');
        await expect(dashboardLink).toHaveAttribute('aria-current', 'page');
      } finally {
        await cleanup.run();
      }
    });

    test(
      'HD-FN-18 — the rail adds no second list and no second counter',
      { tag: '@p0' },
      async ({ sessionPage, cleanup }) => {
        try {
          await sessionPage.goto('/');

          // Exactly one element has role `list` on the whole page — the "Recent meetings" one.
          await expect(sessionPage.getByRole('list')).toHaveCount(1);

          const nav = sessionPage.getByRole('navigation', { name: 'Main' });
          await expect(nav.getByRole('listitem')).toHaveCount(0);

          // Exactly one element matches the counter's format.
          await expect(sessionPage.getByText(COUNTER_PATTERN)).toHaveCount(1);
        } finally {
          await cleanup.run();
        }
      },
    );

    test("HD-FN-19 — the hero banner's two lines, and no new control", async ({
      sessionPage,
      cleanup,
    }) => {
      try {
        await sessionPage.goto('/');

        await expect(sessionPage.getByText('Your schedule')).toBeVisible();
        await expect(
          sessionPage.getByRole('heading', {
            level: 2,
            name: 'Everything you have planned, in one place.',
          }),
        ).toBeVisible();

        // Still exactly one level 1 heading on the page.
        await expect(sessionPage.getByRole('heading', { level: 1 })).toHaveCount(1);

        // The hero banner holds two lines of text and nothing to click: zero is the claim, falsifiable
        // by exactly the defect this case names (a banner call-to-action). Page-wide was vacuous-proof
        // against nothing once the dashboard rows became links (`Received: 4`, `MF-FN-01`); `banner`
        // scoped to `toHaveCount(1)` was vacuous the other way — `banner` has never held a link, so it
        // passes by finding none; `nav` is `HD-FN-17` verbatim and asserts nothing about the hero. Zero
        // links inside `banner` is the only translation that is both non-vacuous and about the hero.
        const banner = sessionPage.getByRole('banner');
        await expect(banner.getByRole('link')).toHaveCount(0);

        // The button count stays page-wide over the four-landmark union, deliberately: it is the one
        // assertion in the suite that notices an unexpected button appearing ANYWHERE on the
        // dashboard, and `next dev` (`playwright.config.ts`'s `webServer`) injects its own dev-mode
        // indicator button ("Open Next.js Dev Tools") outside the application's rendered tree on every
        // page of every Next 16 app — framework chrome, absent from `grep -r` over this repository,
        // and never present in a production build — which is why the count is scoped to these four
        // landmarks rather than to the whole page.
        const nav = sessionPage.getByRole('navigation', { name: 'Main' });
        const main = sessionPage.getByRole('main');
        const aside = sessionPage.getByRole('complementary', { name: 'Overview' });
        const pageButtons = nav
          .getByRole('button')
          .or(banner.getByRole('button'))
          .or(main.getByRole('button'))
          .or(aside.getByRole('button'));

        await expect(pageButtons).toHaveCount(2);
        await expect(sessionPage.getByRole('button', { name: 'Create meeting' })).toBeVisible();
        await expect(sessionPage.getByRole('button', { name: 'Sign out' })).toBeVisible();
      } finally {
        await cleanup.run();
      }
    });

    test('HD-FN-20 — the overview tile counts items against total', async ({
      sessionPage,
      claim,
      apiRequest,
      cleanup,
    }) => {
      try {
        const reference = await fetchMeetingsPage(apiRequest, claim.token, LATEST_QUERY);

        await sessionPage.goto('/');

        const overview = sessionPage.getByRole('complementary', { name: 'Overview' });
        await expect(overview).toBeVisible();

        // Both numbers come from the API response rather than a literal — for the seed, 3 of 5 shown.
        await expect(
          overview.getByText(
            `${String(reference.items.length)} of ${String(reference.total)} shown`,
          ),
        ).toBeVisible();
        await expect(overview.getByText('Meetings', { exact: true })).toBeVisible();

        // Neither line matches the counter's pattern.
        await expect(overview.getByText(COUNTER_PATTERN)).toHaveCount(0);
      } finally {
        await cleanup.run();
      }
    });
  });

  test.describe('as the held user with no preconditions', () => {
    test(
      'HD-FN-08 — signing out closes access',
      { tag: ['@p0', '@mutating'] },
      async ({ sessionPage, claim, cleanup }) => {
        try {
          await sessionPage.goto('/');

          const logout = sessionPage.getByRole('button', { name: 'Sign out' });
          await expect(logout).toBeVisible();

          await logout.click();

          await expect(sessionPage).toHaveURL('/auth/login');
          await expect(sessionPage.getByLabel('Email')).toBeVisible();
          await expect(sessionPage.getByRole('heading', { level: 1 })).not.toContainText('@');

          const sessionCookies = (await sessionPage.context().cookies()).filter(
            (cookie) => cookie.name === SESSION_COOKIE_NAME,
          );
          // The cookie is gone. Had the implementation left it with an empty value, the case would
          // still be correct: the value must be strictly empty.
          expect(
            sessionCookies.map((cookie) => cookie.value).filter((value) => value !== ''),
          ).toEqual([]);

          // A second visit to `/` is the deterministic "no data after sign-out" check.
          await sessionPage.goto('/');

          await expect(sessionPage).toHaveURL('/auth/login');
          await expect(counter(sessionPage)).toBeHidden();
          await expect(sessionPage.getByText(claim.email)).toBeHidden();
        } finally {
          await cleanup.run();
        }
      },
    );

    test('HD-FN-09 — empty state when there are no meetings', async ({
      sessionPage,
      claim,
      cleanup,
    }) => {
      try {
        const problems = collectConsoleProblems(sessionPage);

        await sessionPage.goto('/');

        await expect(sessionPage.getByRole('heading', { level: 1 })).toContainText(claim.email);
        await expect(sessionPage.getByText('Meetings total: 0')).toBeVisible();
        await expect(sessionPage.getByRole('listitem')).toHaveCount(0);
        await expect(sessionPage.getByText('No meetings yet')).toBeVisible();

        const button = sessionPage.getByRole('button', { name: 'Create meeting' });
        await expect(button).toBeVisible();
        await expect(button).toBeEnabled();

        expect(problems).toEqual([]);
      } finally {
        await cleanup.run();
      }
    });

    test('HD-FN-16 — an authenticated visitor on /auth/login goes to /', async ({
      sessionPage,
      claim,
      cleanup,
    }) => {
      try {
        await sessionPage.goto('/auth/login');

        // The bounce back is done by `proxy.ts`.
        await expect(sessionPage).toHaveURL('/');
        await expect(sessionPage.getByRole('button', { name: 'Sign in' })).toBeHidden();
        await expect(sessionPage.getByRole('heading', { level: 1 })).toContainText(claim.email);
      } finally {
        await cleanup.run();
      }
    });

    test('HD-FN-21 — the overview tile on an empty dashboard', async ({ sessionPage, cleanup }) => {
      try {
        await sessionPage.goto('/');

        const overview = sessionPage.getByRole('complementary', { name: 'Overview' });
        await expect(overview).toBeVisible();
        await expect(overview.getByText('0 of 0 shown')).toBeVisible();
        await expect(overview.getByText('Meetings', { exact: true })).toBeVisible();

        await expect(sessionPage.getByText('Meetings total: 0')).toBeVisible();
        await expect(sessionPage.getByText('No meetings yet')).toBeVisible();
      } finally {
        await cleanup.run();
      }
    });
  });
});
