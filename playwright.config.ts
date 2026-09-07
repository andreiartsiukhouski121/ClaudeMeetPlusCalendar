import { defineConfig, devices } from '@playwright/test';

/**
 * E2E-проверка монорепозитория: web (Next.js) и api (Nest.js).
 * Playwright сам поднимает оба сервера — см. webServer ниже.
 *
 * Порты 3100/3101, а НЕ обычные 3000/3001. Это принципиально: на 3000 может висеть
 * `pnpm dev` или, хуже, `next start` с прежней сборкой. Во втором случае
 * reuseExistingServer подцепил бы production-сервер, который не подхватывает правки,
 * и прогон дал бы ложное «зелено» на сломанном коде. На выделенном порту переиспользовать
 * можно только dev-сервер, поднятый прошлым прогоном Playwright, — а он с hot reload.
 */
const WEB_PORT = process.env.E2E_WEB_PORT ?? '3100';
const API_PORT = process.env.E2E_API_PORT ?? '3101';
const WEB_URL = `http://127.0.0.1:${WEB_PORT}`;
const API_URL = `http://127.0.0.1:${API_PORT}`;
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  // Первый заход на страницу триггерит холодную сборку Turbopack — 30 с по умолчанию мало.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  // baseURL задаётся только на уровне проекта, иначе api унаследует адрес web.
  projects: [
    // Файлы разложены по фичам (e2e/regression/<feature>/), поэтому проект выбирается
    // не каталогом, а суффиксом имени файла:
    //   *.api.spec.ts        -> проект api  (фикстура request, baseURL :3101, браузер не нужен)
    //   *.functional.spec.ts -> проект web  (Desktop Chrome, baseURL :3100)
    // Дефолтный testMatch ловит любой *.spec.ts, поэтому его надо переопределить в обоих
    // проектах: иначе браузерный спек уедет в api и получит page.goto на :3101.
    // Файл без одного из двух суффиксов не попадёт НИ в один проект и молча не запустится —
    // от этого страхует e2e/suite-integrity.api.spec.ts.
    { name: 'api', testMatch: /.*\.api\.spec\.ts$/, use: { baseURL: API_URL } },
    {
      name: 'web',
      testMatch: /.*\.functional\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'], baseURL: WEB_URL },
    },
  ],
  // cwd + `pnpm dev` вместо корневого `pnpm dev:web`: меньше слоёв процессов, которые
  // Windows-овский taskkill /T /F может осиротить и оставить порт занятым.
  webServer: [
    {
      command: `pnpm dev --port ${WEB_PORT}`,
      cwd: 'apps/web',
      // Next по дефолту ходит в :3001 (apps/web/src/lib/api-client.ts). Без этой переменной
      // web-проект тестировал бы связку с `pnpm dev:api`, а не с поднятым здесь Nest на :3101:
      // другой сид в памяти, другой JWT_SECRET — и прогон даёт ложный результат в любую сторону.
      // webServer.env мержится поверх process.env (playwright/types/test.d.ts).
      env: { API_URL },
      url: WEB_URL,
      reuseExistingServer: !isCI,
      timeout: 180_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      // Nest читает порт из process.env.PORT (см. apps/api/src/main.ts).
      command: 'pnpm dev',
      cwd: 'apps/api',
      // JWT_SECRET фиксируем константой: в коде есть dev-дефолт, но полагаться на него нельзя —
      // прогон должен быть воспроизводим и не зависеть от того, что стоит в окружении оболочки.
      // Случайный секрет здесь тоже нельзя: `nest start --watch` перезапускается на каждой правке,
      // и все выданные посреди прогона токены разом умрут.
      env: { PORT: API_PORT, JWT_SECRET: 'e2e-secret' },
      url: API_URL,
      reuseExistingServer: !isCI,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
