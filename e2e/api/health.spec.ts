import { expect, test } from '@playwright/test';

test.describe('API', () => {
  test('GET / отвечает приветствием', async ({ request }) => {
    const response = await request.get('/');

    await expect(response).toBeOK();
    expect(await response.text()).toBe('Hello World!');
  });
});
