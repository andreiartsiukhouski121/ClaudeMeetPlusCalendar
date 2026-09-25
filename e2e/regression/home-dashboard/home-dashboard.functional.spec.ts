import {
  expect,
  mergeTests,
  type APIRequestContext,
  type Locator,
  type Page,
} from '@playwright/test';

import { isNestRequest, test as apiTest } from '../../fixtures/api.js';
import { authHeadersFor } from '../../fixtures/auth.api.js';
import { test as authTest } from '../../fixtures/auth.fixture.js';
import { collectConsoleProblems } from '../../fixtures/console.js';
import { FUTURE_STARTS_AT_LOCAL, SEED_USERS, TEACHER_MEETINGS } from '../../fixtures/seed.js';

/**
 * UI of the home page `/`. Cases live in the paired `home-dashboard.functional.cases.md`; every
 * test title starts with its case ID.
 *
 * Project `web`: Desktop Chrome, `baseURL = http://127.0.0.1:3100`, relative paths.
 *
 * Two fixture sets are merged with `mergeTests`: the session comes from `auth.fixture.ts`
 * (`authUser`/`authedPage`), the baseline `total`/`items` through `apiRequest` from `api.ts`.
 * `apiRequest` specifically, NOT the built-in `request`: in the `web` project the latter has
 * `baseURL` = `:3100`, so the call would hit Next rather than Nest and `HD-FN-03`/`HD-FN-05` could
 * not be written as they are. This does not break the BFF rule — the call comes from the test's
 * Node process, and browser traffic is checked by `HD-FN-11`.
 *
 * Locators go by role, label and text only: `apps/web` uses CSS modules with hashed classes, so a
 * class selector dies on the next build.
 */
const test = mergeTests(authTest, apiTest);

const TEACHER = SEED_USERS.teacher;
const STUDENT = SEED_USERS.student;
const SESSION_COOKIE_NAME = 'ps_session';

/** The counter is a single text node in exactly the `Meetings total: N` format. */
const COUNTER_PATTERN = /^Meetings total: \d+$/;

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

interface MeetingsPageBody {
  items: { id: string; title: string }[];
  total: number;
}

/** Baseline data straight from Nest — the source of expected numbers instead of a literal. */
async function fetchMeetingsPage(
  apiRequest: APIRequestContext,
  limit: number,
): Promise<MeetingsPageBody> {
  const response = await apiRequest.get(`/meetings?limit=${String(limit)}`, {
    headers: await authHeadersFor(apiRequest, 'teacher'),
  });

  expect(
    response.status(),
    'Baseline data could not be fetched from Nest directly — the problem is the seed or ' +
      '/meetings, not the UI under test',
  ).toBe(200);

  return (await response.json()) as MeetingsPageBody;
}

test.describe('Dashboard: UI', { tag: ['@regression', '@home-dashboard'] }, () => {
  /**
   * Cases without a session. `storageState: undefined` is a no-op on its own (there is no global
   * `storageState` in the config) — it declares that the test takes a clean `page` rather than
   * `authedPage`, and guards against a global state being added later.
   */
  test.describe('without a session', () => {
    test.use({ storageState: undefined });

    test(
      'HD-FN-01 — an unauthenticated visitor on / goes to login',
      { tag: '@p0' },
      async ({ page }) => {
        await page.goto('/');

        await expect(page).toHaveURL('/auth/login');
        await expect(page.getByLabel('Email')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();

        // No dashboard data on the page — the redirect happened before the render.
        await expect(counter(page)).toBeHidden();
        await expect(page.getByText(TEACHER.email)).toBeHidden();
      },
    );

    test('HD-FN-11 — the browser never calls the API directly', async ({ page, apiBaseURL }) => {
      const requestedUrls: string[] = [];
      // Subscribe BEFORE the first navigation, or the login requests never land in the list.
      page.on('request', (request) => requestedUrls.push(request.url()));

      await page.goto('/auth/login');
      await page.getByLabel('Email').fill(TEACHER.email);
      await page.getByLabel('Password').fill(TEACHER.password);
      await page.getByRole('button', { name: 'Sign in' }).click();

      await expect(page).toHaveURL('/');
      await expect(page.getByRole('heading', { level: 1 })).toContainText(TEACHER.email);

      const toNest = requestedUrls.filter((url) => isNestRequest(url, apiBaseURL));

      expect(
        toNest,
        `The browser called Nest directly (${apiBaseURL}) — a BFF violation. All page traffic ` +
          'must go to Next, and only the Next server talks to Nest.',
      ).toEqual([]);
      expect(requestedUrls.length).toBeGreaterThan(0);
    });
  });

  test(
    'HD-FN-02 — the greeting contains the user email',
    { tag: '@p0' },
    async ({ authedPage }) => {
      await authedPage.goto('/');

      const greeting = authedPage.getByRole('heading', { level: 1 });

      await expect(greeting).toBeVisible();
      await expect(greeting).toContainText(TEACHER.email);
    },
  );

  test(
    'HD-FN-03 — the meeting count matches the API data',
    { tag: '@p0' },
    async ({ authedPage, apiRequest }) => {
      const reference = await fetchMeetingsPage(apiRequest, TEACHER_MEETINGS.latestLimit);

      await authedPage.goto('/');

      // The expected number comes from the API response rather than a literal: replacing `total`
      // with `items.length` in the service must break this very assertion.
      await expect(
        authedPage.getByText(`Meetings total: ${String(reference.total)}`),
      ).toBeVisible();
      expect(reference.total).toBe(TEACHER_MEETINGS.total);
      expect(await readCounter(authedPage)).toBe(reference.total);
      expect(reference.total).not.toBe(reference.items.length);
    },
  );

  test('HD-FN-04 — exactly 3 recent meetings are shown', { tag: '@p0' }, async ({ authedPage }) => {
    await authedPage.goto('/');

    const list = authedPage.getByRole('list');

    await expect(list).toBeVisible();
    await expect(list.getByRole('listitem')).toHaveCount(TEACHER_MEETINGS.latestLimit);
  });

  test(
    'HD-FN-05 — ordering and cutting of older meetings',
    { tag: '@p0' },
    async ({ authedPage, apiRequest }) => {
      const reference = await fetchMeetingsPage(apiRequest, TEACHER_MEETINGS.latestLimit);

      await authedPage.goto('/');

      const items = authedPage.getByRole('list').getByRole('listitem');
      await expect(items).toHaveCount(reference.items.length);

      // The UI order is compared with the API order rather than a constant, so the case catches
      // both a lost sort in the service and a reordering in the markup.
      for (const [index, expectedTitle] of reference.items.map((item) => item.title).entries()) {
        await expect(items.nth(index)).toContainText(expectedTitle);
      }
      expect(reference.items.map((item) => item.title)).toEqual([...TEACHER_MEETINGS.latestTitles]);

      for (const omitted of TEACHER_MEETINGS.omittedTitles) {
        await expect(authedPage.getByText(omitted)).toBeHidden();
      }
    },
  );

  test(
    'HD-FN-06 — the "Create meeting" button is present',
    { tag: '@p0' },
    async ({ authedPage }) => {
      await authedPage.goto('/');

      const button = authedPage.getByRole('button', { name: 'Create meeting' });

      await expect(button).toBeVisible();
      await expect(button).toBeEnabled();
    },
  );

  test('HD-FN-10 — no console errors on the dashboard', async ({ authedPage }) => {
    // Subscribe BEFORE goto, or first-render errors never land in the list.
    const problems = collectConsoleProblems(authedPage);

    await authedPage.goto('/');
    await expect(authedPage.getByRole('heading', { level: 1 })).toContainText(TEACHER.email);
    await expect(counter(authedPage)).toBeVisible();

    expect(problems).toEqual([]);
  });

  test('HD-FN-14 — accessibility of the controls', async ({ authedPage }) => {
    await authedPage.goto('/');

    await expect(authedPage.getByRole('list')).toBeVisible();
    await expect(authedPage.getByRole('list').getByRole('listitem')).toHaveCount(
      TEACHER_MEETINGS.latestLimit,
    );

    // Role plus a non-empty accessible name: if the name disappears, the locator finds nothing.
    await expect(authedPage.getByRole('button', { name: 'Create meeting' })).toBeVisible();
    await expect(authedPage.getByRole('button', { name: 'Sign out' })).toBeVisible();

    await expect(authedPage.getByRole('heading', { level: 1 })).toHaveCount(1);
  });

  test('HD-FN-16 — an authenticated visitor on /auth/login goes to /', async ({ authedPage }) => {
    await authedPage.goto('/auth/login');

    // The bounce back is done by `proxy.ts`.
    await expect(authedPage).toHaveURL('/');
    await expect(authedPage.getByRole('button', { name: 'Sign in' })).toBeHidden();
    await expect(authedPage.getByRole('heading', { level: 1 })).toContainText(TEACHER.email);
  });

  test.describe('user without meetings', () => {
    test.use({ authUser: 'student' });

    test('HD-FN-09 — empty state when there are no meetings', async ({ authedPage }) => {
      const problems = collectConsoleProblems(authedPage);

      await authedPage.goto('/');

      await expect(authedPage.getByRole('heading', { level: 1 })).toContainText(STUDENT.email);
      await expect(authedPage.getByText('Meetings total: 0')).toBeVisible();
      await expect(authedPage.getByRole('listitem')).toHaveCount(0);
      await expect(authedPage.getByText('No meetings yet')).toBeVisible();

      const button = authedPage.getByRole('button', { name: 'Create meeting' });
      await expect(button).toBeVisible();
      await expect(button).toBeEnabled();

      expect(problems).toEqual([]);
    });
  });

  /**
   * Mutating cases run as `organizer`, reserved for `*.functional.spec.ts` (`*.api.spec.ts`
   * mutates `planner`), so there is no cross-project race. Serial mode is the in-file backup.
   * Counter assertions are relative only (`N` → `N+1`), the title is unique and the date is the
   * 2030 constant from `fixtures/seed.ts`.
   *
   * `HD-FN-08` signs out but does not spoil shared worker state: `authedPage` builds a new context
   * from the `storageState` file for every test, and signing out does not change that file.
   */
  test.describe('mutating cases as organizer', () => {
    test.describe.configure({ mode: 'serial' });
    test.use({ authUser: 'organizer' });

    test(
      'HD-FN-07 — creating a meeting updates the counter and the list',
      { tag: ['@p0', '@mutating'] },
      async ({ authedPage }) => {
        await authedPage.goto('/');

        const before = await readCounter(authedPage);
        const title = `E2E meeting ${String(Date.now())}-${String(
          Math.floor(Math.random() * 1e6),
        )}`;

        await authedPage.getByLabel('Title').fill(title);
        await authedPage.getByLabel('Date and time').fill(FUTURE_STARTS_AT_LOCAL);
        await authedPage.getByRole('button', { name: 'Create meeting' }).click();

        await expect(authedPage.getByText(`Meetings total: ${String(before + 1)}`)).toBeVisible();

        const items = authedPage.getByRole('list').getByRole('listitem');
        // The 2030 date is later than any seeded meeting of the owner, and sorting is DESC, so the
        // new meeting comes first.
        await expect(items.first()).toContainText(title);
        expect(await items.count()).toBeLessThanOrEqual(TEACHER_MEETINGS.latestLimit);

        // Reload: the change must live on the server, not in client state.
        await authedPage.reload();

        await expect(authedPage.getByText(`Meetings total: ${String(before + 1)}`)).toBeVisible();
        await expect(authedPage.getByRole('list').getByRole('listitem').first()).toContainText(
          title,
        );
      },
    );

    test(
      'HD-FN-08 — signing out closes access',
      { tag: ['@p0', '@mutating'] },
      async ({ authedPage }) => {
        await authedPage.goto('/');

        const logout = authedPage.getByRole('button', { name: 'Sign out' });
        await expect(logout).toBeVisible();

        await logout.click();

        await expect(authedPage).toHaveURL('/auth/login');
        await expect(authedPage.getByLabel('Email')).toBeVisible();
        await expect(authedPage.getByRole('heading', { level: 1 })).not.toContainText('@');

        const sessionCookies = (await authedPage.context().cookies()).filter(
          (cookie) => cookie.name === SESSION_COOKIE_NAME,
        );
        // The cookie is gone. Had the implementation left it with an empty value, the case would
        // still be correct: the value must be strictly empty.
        expect(
          sessionCookies.map((cookie) => cookie.value).filter((value) => value !== ''),
        ).toEqual([]);

        // A second visit to `/` is the deterministic "no data after sign-out" check.
        await authedPage.goto('/');

        await expect(authedPage).toHaveURL('/auth/login');
        await expect(counter(authedPage)).toBeHidden();
        await expect(authedPage.getByText(SEED_USERS.organizer.email)).toBeHidden();
      },
    );
  });
});
