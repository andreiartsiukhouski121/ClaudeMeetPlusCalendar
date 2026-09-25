import path from 'node:path';
import { expect, test as base, type Browser, type Page, type WorkerInfo } from '@playwright/test';
import { SEED_USERS, type SeedUserKey } from './seed.js';

/**
 * Session for functional cases (project `web`).
 *
 * An architectural constraint: the session cookie is httpOnly and set by a Server Action, so the
 * browser never sees the JWT from Nest. Hence we log in through the UI rather than forging a
 * cookie — building one by hand would duplicate production session logic and go red or green at
 * the wrong moments. UI login walks the real path "form → Server Action → POST /auth/login →
 * cookie" and proves that path still works.
 *
 * Three entities, and none of them is redundant:
 *
 *  - `authUser` — a TEST option. It cannot be worker-scoped: Playwright 1.62.1 rejects
 *    `test.use({ authUser })` inside a `describe` for a worker-scoped option with "Cannot use(…)
 *    in a describe group, because it forces a new worker", which kills the whole spec rather than
 *    one case. Mutating cases must switch to `organizer` inside a `describe`, because the same
 *    file also holds cases under `teacher`.
 *  - `authStateFor` — a WORKER fixture whose value is a function "user → storageState path". The
 *    function is what gets cached: the symmetric approach (a worker fixture holding the state
 *    itself) is blocked by another runtime rule, "worker fixture cannot depend on a test fixture".
 *    A function has no dependency on the test option, and login per user still happens once per
 *    worker. Both prohibitions are runtime checks — `pnpm typecheck` does not catch them.
 *  - `authedPage` — a TEST fixture. A worker-scoped `page` reused across tests breaks isolation:
 *    the previous test's URL and accumulated `page.on('console')` subscriptions survive, which
 *    hits HD-FN-10 directly. Only the state is reused; context and page are created per test.
 */

/**
 * The state file lives in the project's `outputDir`: it is wiped between runs anyway and needs no
 * separate `.gitignore` line. The user suffix is mandatory — one worker holds states for several
 * users, and without it they would overwrite each other.
 */
function storageStatePath(workerInfo: WorkerInfo, user: SeedUserKey): string {
  return path.join(
    workerInfo.project.outputDir,
    `auth-state-w${workerInfo.workerIndex}-${user}.json`,
  );
}

/**
 * UI login. Returns the path to the `storageState` file that `authedPage` reuses.
 *
 * `baseURL` is taken from the project settings: `browser.newContext()` does NOT inherit it, and
 * without passing it explicitly `page.goto('/auth/login')` would fail on a relative URL.
 *
 * The locators match the functional cases (role and label): if the form markup drifts away from
 * them, both the fixture login and AL-FN-01 break in one place rather than differently.
 */
async function uiLogin(
  browser: Browser,
  user: SeedUserKey,
  workerInfo: WorkerInfo,
): Promise<string> {
  const statePath = storageStatePath(workerInfo, user);
  const { email, password } = SEED_USERS[user];
  const context = await browser.newContext({ baseURL: workerInfo.project.use.baseURL });
  const page = await context.newPage();

  try {
    await page.goto('/auth/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    // We wait for the URL to change rather than for a navigation event: the transition comes from
    // the Server Action's redirect. If it did not happen, the fixture should fail with a clear
    // message instead of a case failing later on an empty page.
    await expect(
      page,
      `UI login of ${user} (${email}) did not land on "/". The cause is not the case under test: ` +
        'look at /auth/login, loginAction and the user seed.',
    ).toHaveURL('/');

    await context.storageState({ path: statePath });
  } finally {
    await context.close();
  }

  return statePath;
}

export const test = base.extend<
  { authUser: SeedUserKey; authedPage: Page },
  { authStateFor: (user: SeedUserKey) => Promise<string> }
>({
  // Worker-scoped: the value is a function, so it has no dependency on the test option.
  authStateFor: [
    async ({ browser }, use, workerInfo) => {
      const cache = new Map<SeedUserKey, string>();

      await use(async (user) => {
        const cached = cache.get(user);
        if (cached !== undefined) {
          return cached;
        }

        const statePath = await uiLogin(browser, user, workerInfo);
        cache.set(user, statePath);
        return statePath;
      });
    },
    { scope: 'worker' },
  ],

  // A test option: `test.use({ authUser: 'organizer' })` is allowed in a file and in a describe.
  authUser: ['teacher', { option: true }],

  authedPage: async ({ browser, authStateFor, authUser }, use) => {
    const storageState = await authStateFor(authUser);
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();

    await use(page);

    // The context closes with the test: state is reused through the file rather than through a
    // live context, or the sign-out in HD-FN-08 would log the next test out too.
    await context.close();
  },
});

export { expect } from '@playwright/test';
