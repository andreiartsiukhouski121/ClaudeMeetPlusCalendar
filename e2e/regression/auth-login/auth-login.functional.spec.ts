import { expect, test, type Page } from '@playwright/test';

import { collectConsoleProblems } from '../../fixtures/console.js';
import { SEED_USERS } from '../../fixtures/seed.js';

/**
 * UI of `/auth/login`. Cases live in the paired `auth-login.functional.cases.md`; every test title
 * starts with its case ID.
 *
 * Project `web`: Desktop Chrome, `baseURL = http://127.0.0.1:3100`. Paths are relative — an
 * absolute URL would bypass the project `baseURL` and send the run to another port.
 *
 * Locators go by role and label only: `apps/web` uses CSS modules with hashed class names, so a
 * class selector dies on the next build. Logins and passwords come only from `fixtures/seed.ts`.
 *
 * No case here checks the home page contents: in feature 1 `/` was still the create-next-app
 * default. A successful login is confirmed by the URL change and the session cookie.
 */

const TEACHER = SEED_USERS.teacher;

/**
 * Session cookie name. A local constant rather than an import from `apps/web`: the suite treats
 * the app as a black box, and importing the production constant would compare a value to itself.
 */
const SESSION_COOKIE_NAME = 'ps_session';

/**
 * The login form error.
 *
 * A bare `page.getByRole('alert')` does not work here, and that is not pedantry: App Router keeps
 * its own `<div role="alert" aria-live="assertive" id="__next-route-announcer__">` on the page — a
 * routing announcer, empty and living outside `<main>`. It causes a strict mode violation
 * ("resolved to 2 elements") in every error case. Verified by a run, not assumed.
 *
 * So the search is narrowed by the `main` role rather than by a CSS chain or `.filter({ hasText })`
 * — a text filter would hide the "the alert never rendered" failure, since the locator would find
 * nothing and "the alert is visible" would become meaningless.
 */
function loginAlert(page: Page) {
  return page.getByRole('main').getByRole('alert');
}

test.describe('Login: UI', { tag: ['@regression', '@auth-login'] }, () => {
  /**
   * A clean context for the whole file. On its own this is a no-op — there is no global
   * `storageState` in `playwright.config.ts` — but it guards against one being added later.
   */
  test.use({ storageState: undefined });

  test('AL-FN-01 — the login form renders', { tag: '@p0' }, async ({ page }) => {
    await page.goto('/auth/login');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // getByLabel also proves the fields have associated <label> elements — an accessibility need.
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('AL-FN-02 — a successful login leaves the form for /', { tag: '@p0' }, async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByLabel('Email').fill(TEACHER.email);
    await page.getByLabel('Password').fill(TEACHER.password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    // The URL change is awaited by a web-first assertion rather than waitForNavigation: the
    // transition is done by `redirect('/')` inside the Server Action. If that redirect ends up
    // inside a try/catch (invariant 11), the cookie is set and this assertion goes red — exactly
    // what the case is for.
    await expect(page).toHaveURL('/');

    const sessionCookies = (await page.context().cookies()).filter(
      (cookie) => cookie.name === SESSION_COOKIE_NAME,
    );
    expect(sessionCookies).toHaveLength(1);

    // The home page contents belong to feature 2. It is enough that the login form is gone.
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeHidden();
  });

  test(
    'AL-FN-03 — a wrong password shows a visible error and keeps the user on the login page',
    { tag: '@p0' },
    async ({ page }) => {
      await page.goto('/auth/login');
      await page.getByLabel('Email').fill(TEACHER.email);
      await page.getByLabel('Password').fill('wrong-password');
      await page.getByRole('button', { name: 'Sign in' }).click();

      const alert = loginAlert(page);
      await expect(alert).toBeVisible();
      await expect(alert).toContainText('Invalid email or password');

      await expect(page).toHaveURL('/auth/login');
      await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();

      // No internals in the text: the 401 was handled rather than leaking outwards.
      await expect(alert).not.toContainText('passwordHash');
      await expect(alert).not.toContainText('scrypt');
      await expect(alert).not.toContainText('apps/api');

      const sessionCookies = (await page.context().cookies()).filter(
        (cookie) => cookie.name === SESSION_COOKIE_NAME,
      );
      expect(sessionCookies).toEqual([]);
    },
  );

  test('AL-FN-04 — an unknown email gives the same error', { tag: '@p0' }, async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByLabel('Email').fill('nobody@purpleschool.test');
    await page.getByLabel('Password').fill(TEACHER.password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    const alert = loginAlert(page);
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('Invalid email or password');
    const unknownEmailText = await alert.innerText();

    await expect(page).toHaveURL('/auth/login');

    // The same path again, this time with an existing email and a wrong password. The expected
    // value is the text of the FIRST response rather than a constant, so the case proves the two
    // rejection branches are indistinguishable rather than matching a known string.
    await page.goto('/auth/login');
    await page.getByLabel('Email').fill(TEACHER.email);
    await page.getByLabel('Password').fill('wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(alert).toBeVisible();
    await expect(alert).toHaveText(unknownEmailText);
  });

  test('AL-FN-05 — an empty form does not submit', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByRole('button', { name: 'Sign in' }).click();

    // The app's text, not the browser's: `required` on inputs is forbidden (invariant 15),
    // otherwise the browser would block submission and the server branch would never run.
    await expect(loginAlert(page)).toContainText('Enter your email and password');
    await expect(page).toHaveURL('/auth/login');
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('AL-FN-06 — the sign-up link leads to a page that exists', async ({ page }) => {
    await page.goto('/auth/login');

    const link = page.getByRole('link', { name: 'Sign up' });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/auth/register');

    await link.click();

    await expect(page).toHaveURL('/auth/register');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sign up');
    await expect(page.getByText('This page could not be found')).toBeHidden();

    // A separate direct navigation: clicking a Link is a client transition with no HTTP status.
    // Without this the case could not tell the page from a client-rendered 404.
    const direct = await page.goto('/auth/register');
    expect(direct?.status()).toBe(200);
  });

  test('AL-FN-08 — the login page logs nothing to the console, on render or after a failed sign-in', async ({
    page,
  }) => {
    // Subscribe BEFORE goto, or first-render errors never land in the list.
    const problems = collectConsoleProblems(page);

    await page.goto('/auth/login');
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    expect(problems).toEqual([]);

    await page.getByLabel('Email').fill(TEACHER.email);
    await page.getByLabel('Password').fill('wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(loginAlert(page)).toBeVisible();
    // The expected 401 was handled by the app rather than surfacing as an unhandled exception.
    expect(problems).toEqual([]);
  });

  test('AL-FN-10 — the password is masked while typing', async ({ page }) => {
    await page.goto('/auth/login');

    const password = page.getByLabel('Password');
    await password.fill(TEACHER.password);

    // `type="password"` is the only thing hiding the value: it stays in the DOM, so the assertion
    // is about the attribute rather than about text being absent from the page.
    await expect(password).toHaveAttribute('type', 'password');
    await expect(password).toHaveValue(TEACHER.password);
    await expect(page.getByText(TEACHER.password, { exact: true })).toBeHidden();
  });

  test(
    'AL-FN-13 — the session cookie is httpOnly and unreachable from JS',
    { tag: '@p0' },
    async ({ page }) => {
      await page.goto('/auth/login');
      await page.getByLabel('Email').fill(TEACHER.email);
      await page.getByLabel('Password').fill(TEACHER.password);
      await page.getByRole('button', { name: 'Sign in' }).click();

      await expect(page).toHaveURL('/');

      const sessionCookies = (await page.context().cookies()).filter(
        (cookie) => cookie.name === SESSION_COOKIE_NAME,
      );
      expect(sessionCookies).toHaveLength(1);

      const session = sessionCookies[0];
      expect(session.httpOnly).toBe(true);
      expect(session.path).toBe('/');
      expect(session.sameSite).not.toBe('None');
      expect(session.value.split('.')).toHaveLength(3);

      // The JWT must not be visible from JS — otherwise XSS gets an access token for Nest.
      const documentCookie = await page.evaluate(() => document.cookie);
      expect(documentCookie).not.toContain(session.value);
      expect(documentCookie).not.toContain(SESSION_COOKIE_NAME);
    },
  );

  test('AL-FN-14 — an invalid email format in the UI', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByLabel('Email').fill('not-an-email');
    await page.getByLabel('Password').fill(TEACHER.password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    // The email field is `type="text"`, so the browser does not block submission: the 400 from
    // ValidationPipe reaches loginAction and becomes this text (invariant 15).
    await expect(loginAlert(page)).toContainText('Check the email format');
    await expect(page).toHaveURL('/auth/login');
  });
});
