import { test as base, type APIRequestContext } from '@playwright/test';

/**
 * Опции сьюта, которые задаёт `playwright.config.ts`.
 *
 * Адрес Nest — значение конфига, а не константа теста. До этого формула адреса (хост, порт из
 * переменной окружения, дефолт) была выписана в ТРЁХ местах — в конфиге, здесь и в
 * `security.functional.spec.ts`, — а адрес web ещё и литералом в `SEC-FN-05` (FX-023).
 *
 * Копии совпадали: все читали одну переменную окружения, и прогон на нештатных портах был
 * корректен. Но держалось это комментарием «при правке порта в конфиге правится и здесь», то
 * есть обещанием, а не инвариантом. Цена расхождения несимметрична: разъехавшись, тест сравнит
 * трафик со старым адресом и проверка BFF станет вакуумно зелёной — не упадёт, а перестанет
 * проверять.
 */
export type ApiOptions = {
  /** Адрес Nest в прогоне. Приходит из `use.apiBaseURL` в `playwright.config.ts`. */
  apiBaseURL: string;
};

/**
 * Дефолт опции пуст НАМЕРЕННО, а не равен прежней формуле.
 *
 * Рабочий дефолт здесь вернул бы ровно ту конструкцию, которую убирали: вторую копию адреса,
 * способную разойтись с конфигом. Причём разойтись тихо — сьют ходил бы по дефолту, а серверы
 * поднимались бы по конфигу. Пустое значение так не умеет: любое чтение падает с указанием,
 * что чинить.
 */
function requireApiBaseURL(apiBaseURL: string): string {
  if (apiBaseURL === '') {
    throw new Error(
      'Опция apiBaseURL пуста: она не задана в playwright.config.ts (use.apiBaseURL). ' +
        'Адрес Nest живёт только в конфиге — не восстанавливай формулу в тесте.',
    );
  }

  return apiBaseURL;
}

/**
 * Ушёл ли запрос напрямую в Nest. Единственное место, где адрес из конфига сопоставляется
 * с URL запроса: `HD-FN-11` и `SEC-FN-03` проверяют один и тот же инвариант BFF и обязаны
 * понимать «напрямую» одинаково.
 */
export function isNestRequest(url: string, apiBaseURL: string): boolean {
  return url.startsWith(requireApiBaseURL(apiBaseURL));
}

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
