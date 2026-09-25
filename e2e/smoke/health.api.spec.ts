import { expect, test } from '@playwright/test';

/**
 * Infrastructure smoke: Nest came up and routing works. Not tied to a feature, hence
 * `e2e/smoke/` rather than `e2e/regression/<feature>/` — and it should fail first and clearly.
 *
 * Cases live in the paired health.api.cases.md.
 */
test.describe('Smoke: API availability', { tag: '@smoke' }, () => {
  test('SM-API-01 — GET / answers with a greeting', async ({ request }) => {
    const response = await request.get('/');

    await expect(response).toBeOK();
    expect(await response.text()).toBe('Hello World!');
  });
});
