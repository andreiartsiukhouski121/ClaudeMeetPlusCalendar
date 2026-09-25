import type { Page } from '@playwright/test';

/**
 * In dev mode Next complains to the console about its HMR socket when that socket did not come up
 * (for instance because the dev server runs on a non-default port — and Playwright uses 3100).
 * That is infrastructure noise, not an application error; without filtering it, tests flake with
 * the state of the dev server.
 *
 * The patterns were carried over from a deleted spec where runs had proven them. Do not rewrite
 * them from scratch: without the filter AL-FN-08 and HD-FN-10 become flaky.
 */
const DEV_SERVER_NOISE = [/\/_next\/hmr/, /WebSocket connection to/];

export function isDevServerNoise(text: string): boolean {
  return DEV_SERVER_NOISE.some((pattern) => pattern.test(text));
}

/**
 * Subscribes to `console` and `pageerror` and returns an array that fills up as the page runs.
 * Subscribe BEFORE `page.goto`, or first-render errors never land in it.
 *
 * A live array is returned rather than a snapshot: the assertion sits at the end of the test and
 * sees everything accumulated. Entries are prefixed with their source so a failing report says at
 * once whether it was a console error or an unhandled exception.
 *
 * Only `console.error` is collected, not warnings: React key warnings and the like are not broken
 * behaviour, and making any of them a blocker would turn the case into noise.
 */
export function collectConsoleProblems(page: Page): string[] {
  const problems: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error' && !isDevServerNoise(message.text())) {
      problems.push(`console.error: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => {
    problems.push(`pageerror: ${error.message}`);
  });

  return problems;
}
