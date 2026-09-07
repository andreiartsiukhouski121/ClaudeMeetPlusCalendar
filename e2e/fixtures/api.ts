import { test as base, type APIRequestContext } from '@playwright/test';

/**
 * Адрес Nest в прогоне Playwright. Формула повторяет `playwright.config.ts` дословно,
 * включая дефолт порта: конфиг не экспортирует эту константу, а импортировать его из спека
 * значит тащить в тест и `webServer`, и `projects`.
 *
 * Если формулы разойдутся — `apiRequest` начнёт ходить не туда, куда `webServer` поднял Nest.
 * При правке порта в конфиге правится и здесь.
 */
export const API_BASE_URL = `http://127.0.0.1:${process.env.E2E_API_PORT ?? '3101'}`;

/**
 * Контекст запросов к Nest для кейсов проекта `web`.
 *
 * Зачем отдельная фикстура: в проекте `web` у штатной `request` `baseURL` = `:3100`, то есть
 * `request.get('/meetings')` ушёл бы в Next, а не в Nest, и кейсы, которым нужны эталонные
 * `total`/`items` (HD-FN-03, HD-FN-05), были бы нереализуемы как написаны.
 *
 * BFF это не нарушает: запрос идёт из Node-процесса теста, а не из браузера. Требование
 * «браузер никогда не ходит на :3101» проверяет HD-FN-11 по трафику страницы.
 */
export const test = base.extend<{ apiRequest: APIRequestContext }>({
  apiRequest: async ({ playwright }, use) => {
    const context = await playwright.request.newContext({ baseURL: API_BASE_URL });
    await use(context);
    await context.dispose();
  },
});

export { expect } from '@playwright/test';
