import { expect, test } from '@playwright/test';

/**
 * Смоук инфраструктуры: Nest поднялся и роутинг жив. К фичам не относится, поэтому лежит
 * в e2e/smoke/, а не в e2e/regression/<feature>/ — и падать должен первым и понятно.
 *
 * Кейсы — в парном health.api.cases.md.
 */
test.describe('Смоук: доступность API', { tag: '@smoke' }, () => {
  test('SM-API-01 — GET / отвечает приветствием', async ({ request }) => {
    const response = await request.get('/');

    await expect(response).toBeOK();
    expect(await response.text()).toBe('Hello World!');
  });
});
