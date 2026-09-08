import { createHmac } from 'node:crypto';

import { expect, type Page } from '@playwright/test';

import { test } from '../fixtures/auth.fixture.js';
import { SEED_USERS } from '../fixtures/seed.js';

/**
 * Инварианты безопасности, видимые только из браузера. Кейсы — в парном
 * `security.functional.cases.md`.
 *
 * Проект `web`: Desktop Chrome, `baseURL = http://127.0.0.1:3100`. Пути относительные.
 *
 * Часть кейсов дублирует проверки внутри фич (`AL-FN-13`, `HD-FN-11`) намеренно: там это часть
 * контракта конкретной страницы, здесь — инвариант, который обязан держаться для любой новой.
 */

const SESSION_COOKIE_NAME = 'ps_session';
const API_PORT = process.env.E2E_API_PORT ?? '3101';

/** Закрытые страницы. Добавляя страницу за гейтом, добавь путь сюда. */
const PROTECTED_PAGES = ['/'];

async function sessionCookieValue(page: Page): Promise<string> {
  const cookies = await page.context().cookies();
  const session = cookies.find((cookie) => cookie.name === SESSION_COOKIE_NAME);

  expect(session, 'cookie сессии не найдена — логин не сработал').toBeDefined();

  return session?.value ?? '';
}

test.describe('Безопасность: браузер', { tag: '@security' }, () => {
  test(
    'SEC-FN-01 — cookie сессии httpOnly и недоступна из JS',
    { tag: '@p0' },
    async ({ authedPage }) => {
      await authedPage.goto('/');

      const cookies = await authedPage.context().cookies();
      const session = cookies.find((cookie) => cookie.name === SESSION_COOKIE_NAME);

      expect(session).toBeDefined();
      expect(session?.httpOnly).toBe(true);
      expect(session?.sameSite).toBe('Lax');
      expect(session?.path).toBe('/');

      const visibleToScripts = await authedPage.evaluate(() => document.cookie);

      expect(visibleToScripts).not.toContain(SESSION_COOKIE_NAME);
      expect(visibleToScripts).not.toContain(session?.value ?? 'нет-значения');
    },
  );

  test('SEC-FN-02 — токен не попадает в HTML страницы', { tag: '@p0' }, async ({ authedPage }) => {
    await authedPage.goto('/');
    await expect(authedPage.getByRole('heading', { level: 1 })).toBeVisible();

    const token = await sessionCookieValue(authedPage);
    // page.content() отдаёт итоговый HTML вместе с сериализованным потоком RSC — именно туда
    // уехал бы токен, переданный пропсом в клиентский компонент.
    const html = await authedPage.content();

    expect(html).not.toContain(token);
    expect(html).not.toContain('accessToken');
    expect(html).not.toContain('Bearer');
    expect(html).not.toContain('scrypt');
  });

  test(
    'SEC-FN-03 — браузер не ходит в API и не светит токен в сети',
    { tag: '@p0' },
    async ({ authedPage }) => {
      const requests: { url: string; hasAuthHeader: boolean }[] = [];

      authedPage.on('request', (request) => {
        requests.push({
          url: request.url(),
          hasAuthHeader: request.headers().authorization !== undefined,
        });
      });

      await authedPage.goto('/');
      await expect(authedPage.getByRole('heading', { level: 1 })).toBeVisible();

      expect(requests.length).toBeGreaterThan(0);
      expect(requests.filter((request) => request.url.includes(`:${API_PORT}`))).toEqual([]);
      // Заголовок с токеном в браузерном запросе означал бы обход BFF, даже если адрес — Next.
      expect(requests.filter((request) => request.hasAuthHeader)).toEqual([]);
    },
  );

  test.describe('без сессии', () => {
    test.use({ storageState: undefined });

    test(
      'SEC-FN-04 — закрытые страницы недоступны без сессии',
      { tag: '@p0' },
      async ({ page }) => {
        for (const path of PROTECTED_PAGES) {
          await page.goto(path);

          await expect(page).toHaveURL(/\/auth\/login$/);
          await expect(page.getByLabel('Email')).toBeVisible();
          await expect(page.getByText(SEED_USERS.teacher.email)).toHaveCount(0);
        }
      },
    );

    test(
      'SEC-FN-05 — подделанная cookie сессии не даёт доступа',
      { tag: '@p0' },
      async ({ page, baseURL }) => {
        const base64url = (value: object) =>
          Buffer.from(JSON.stringify(value)).toString('base64url').replace(/=+$/, '');
        const header = base64url({ alg: 'HS256', typ: 'JWT' });
        const payload = base64url({
          sub: 'usr-teacher',
          email: SEED_USERS.teacher.email,
          exp: Math.floor(Date.now() / 1000) + 3600,
        });
        const foreignSignature = createHmac('sha256', 'совершенно-другой-секрет')
          .update(`${header}.${payload}`)
          .digest('base64url')
          .replace(/=+$/, '');

        const forgeries = ['not.a.jwt', `${header}.${payload}.${foreignSignature}`];

        for (const value of forgeries) {
          await page.context().clearCookies();
          await page.context().addCookies([
            {
              name: SESSION_COOKIE_NAME,
              value,
              url: baseURL ?? 'http://127.0.0.1:3100',
            },
          ]);

          await page.goto('/');

          /*
           * `proxy.ts` видит только НАЛИЧИЕ cookie и пропустил бы такой запрос дальше — значит
           * валидность обязан подтверждать серверный слой (`lib/dal.ts` → `GET /auth/me`).
           * Без этого подделка cookie давала бы доступ к дашборду.
           */
          await expect(page).toHaveURL(/\/auth\/login$/);
          await expect(page.getByText(SEED_USERS.teacher.email)).toHaveCount(0);
        }
      },
    );
  });
});
