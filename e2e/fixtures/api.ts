import { test as base, type APIRequestContext } from '@playwright/test';

/**
 * Suite options supplied by `playwright.config.ts`.
 *
 * The Nest address is a config value, not a test constant. It used to be spelled out in THREE
 * places — the config, this file and `security.functional.spec.ts` — plus a literal for the web
 * address in `SEC-FN-05` (FX-023). The copies agreed, but only by a comment promising they would
 * be kept in sync. The cost of drift is asymmetric: once apart, the test compares traffic against
 * a stale address and the BFF check goes vacuously green — it stops checking instead of failing.
 */
export type ApiOptions = {
  /** Nest address for this run. Comes from `use.apiBaseURL` in `playwright.config.ts`. */
  apiBaseURL: string;
};

/**
 * The option default is empty DELIBERATELY rather than a copy of the old formula.
 *
 * A working default here would bring back exactly what was removed: a second copy of the address,
 * able to drift from the config — and drift silently, with the suite using the default while the
 * servers use the config. An empty value cannot do that: any read fails and names the fix.
 */
function requireApiBaseURL(apiBaseURL: string): string {
  if (apiBaseURL === '') {
    throw new Error(
      'The apiBaseURL option is empty: it is not set in playwright.config.ts (use.apiBaseURL). ' +
        'The Nest address lives in the config only — do not rebuild the formula in a test.',
    );
  }

  return apiBaseURL;
}

/**
 * Whether a request went straight to Nest. The single place where the configured address meets a
 * request URL: `HD-FN-11` and `SEC-FN-03` check the same BFF invariant and must agree on what
 * "directly" means.
 */
export function isNestRequest(url: string, apiBaseURL: string): boolean {
  return url.startsWith(requireApiBaseURL(apiBaseURL));
}

/**
 * Nest request context for cases in the `web` project.
 *
 * Why a separate fixture: in the `web` project the built-in `request` has `baseURL` = `:3100`, so
 * `request.get('/meetings')` would hit Next rather than Nest, and cases needing baseline
 * `total`/`items` (HD-FN-03, HD-FN-05) could not be written as they are.
 *
 * This does not break the BFF rule: the request comes from the test's Node process, not the
 * browser. "The browser never reaches :3101" is checked by HD-FN-11 against page traffic.
 */
export const test = base.extend<ApiOptions & { apiRequest: APIRequestContext }>({
  apiBaseURL: ['', { option: true }],

  apiRequest: async ({ playwright, apiBaseURL }, use) => {
    const context = await playwright.request.newContext({
      baseURL: requireApiBaseURL(apiBaseURL),
    });
    await use(context);
    await context.dispose();
  },
});

export { expect } from '@playwright/test';
