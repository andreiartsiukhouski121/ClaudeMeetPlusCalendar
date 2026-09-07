import { expect, test } from '@playwright/test';

/**
 * Next.js в dev-режиме ругается в консоль на свой HMR-сокет, когда тот не поднялся
 * (например, dev-сервер запущен на нестандартном порту). Это шум инфраструктуры,
 * а не ошибка приложения — иначе тест флакает в зависимости от состояния dev-сервера.
 */
const DEV_SERVER_NOISE = [/\/_next\/hmr/, /WebSocket connection to/];

function isDevServerNoise(text: string): boolean {
  return DEV_SERVER_NOISE.some((pattern) => pattern.test(text));
}

test.describe('Главная страница', () => {
  test('отдаёт заголовок и основной контент', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle('Create Next App');

    // `page.tsx` внутри h1 обёрнут в <code>, поэтому проверяем вхождение, а не полное совпадение.
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/To get started/);
  });

  test('показывает обе CTA-ссылки', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('link', { name: 'Deploy Now' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Documentation' })).toBeVisible();
  });

  test('не пишет ошибок в консоль и не падает в рантайме', async ({ page }) => {
    const problems: string[] = [];

    page.on('console', (message) => {
      if (message.type() === 'error' && !isDevServerNoise(message.text())) {
        problems.push(`console.error: ${message.text()}`);
      }
    });
    page.on('pageerror', (error) => {
      problems.push(`pageerror: ${error.message}`);
    });

    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    expect(problems).toEqual([]);
  });
});
