import path from 'node:path';
import { expect, test as base, type Browser, type Page, type WorkerInfo } from '@playwright/test';
import { SEED_USERS, type SeedUserKey } from './seed.js';

/**
 * Сессия для функциональных кейсов (проект `web`).
 *
 * Ограничение архитектуры: сессионная cookie httpOnly и ставится Server Action веб-приложения,
 * JWT из Nest браузер не видит. Поэтому логинимся через UI, а не подделкой cookie: собирая
 * cookie руками, тест дублировал бы прод-логику сессии и краснел/зеленел невпопад при её
 * изменении. UI-логин проходит реальный путь «форма → Server Action → POST /auth/login → cookie»
 * и заодно проверяет, что этот путь жив.
 *
 * Схема — три сущности, и это не избыточность (тест-план §5.5):
 *
 *  - `authUser` — ТЕСТОВАЯ опция. Worker-scoped опцией её делать нельзя: Playwright 1.62.1
 *    отвергает `test.use({ authUser })` в `describe` для worker-scoped опции ошибкой
 *    «Cannot use({ authUser }) in a describe group, because it forces a new worker» — падает
 *    весь спек, а не отдельный кейс. А мутирующие кейсы фичи 2 обязаны переключаться на
 *    `organizer` внутри `describe`, потому что в том же файле живут кейсы под `teacher`,
 *    а разбить файл на два — нарушить требование «на фичу два файла тестов».
 *  - `authStateFor` — WORKER-фикстура, значение которой — функция «пользователь → путь к файлу
 *    storageState». Кэшируется именно функция: симметричный обход (worker-фикстура с самим
 *    состоянием) закрыт другой рантайм-проверкой — «worker fixture cannot depend on a test
 *    fixture». У функции зависимости от тестовой опции нет, а логин под каждого пользователя
 *    всё равно выполняется один раз на воркер. Оба запрета — рантайм-проверки Playwright,
 *    `pnpm typecheck` их не ловит: типы пару `{ scope: 'worker', option: true }` разрешают.
 *  - `authedPage` — TEST-фикстура. Worker-scoped `page`, переиспользуемая несколькими тестами,
 *    ломает изоляцию: остаются URL предыдущего теста и накопленные подписки `page.on('console')`
 *    — это бьёт прямо в HD-FN-10 («список проблем консоли пуст»). Переиспользуется только
 *    состояние; контекст и страница создаются на каждый тест.
 */

/**
 * Файл состояния лежит в `outputDir` проекта: он и так вычищается между прогонами, и его
 * не надо добавлять в `.gitignore` отдельной строкой. Имя пользователя в суффиксе обязательно
 * — один воркер держит состояния нескольких пользователей, и без суффикса они перезатирали бы
 * друг друга.
 */
function storageStatePath(workerInfo: WorkerInfo, user: SeedUserKey): string {
  return path.join(
    workerInfo.project.outputDir,
    `auth-state-w${workerInfo.workerIndex}-${user}.json`,
  );
}

/**
 * UI-логин: реальный путь «форма → Server Action → POST /auth/login → cookie». Подделывать
 * cookie руками нельзя — тест дублировал бы прод-логику сессии и краснел/зеленел невпопад при
 * её изменении (тест-план §5.5). Возвращает путь к файлу `storageState`, который потом
 * переиспользует `authedPage`.
 *
 * `baseURL` берётся из настроек проекта: `browser.newContext()` его НЕ наследует, и без
 * явной передачи `page.goto('/auth/login')` упал бы на относительном URL.
 *
 * Локаторы — те же, что в функциональных кейсах (роль и метка): если разметка формы
 * разъедется с ними, сломается и логин фикстуры, и AL-FN-01 — в одном месте, а не по-разному.
 */
async function uiLogin(
  browser: Browser,
  user: SeedUserKey,
  workerInfo: WorkerInfo,
): Promise<string> {
  const statePath = storageStatePath(workerInfo, user);
  const { email, password } = SEED_USERS[user];
  const context = await browser.newContext({ baseURL: workerInfo.project.use.baseURL });
  const page = await context.newPage();

  try {
    await page.goto('/auth/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Пароль').fill(password);
    await page.getByRole('button', { name: 'Войти' }).click();

    // Ждём именно смену URL, а не `waitForNavigation`: переход делает redirect Server Action-а.
    // Если он не случился, падать должна фикстура с внятным сообщением, а не кейс где-то ниже
    // на пустой странице.
    await expect(
      page,
      `UI-логин пользователя ${user} (${email}) не привёл на "/". Причина не в проверяемом ` +
        'кейсе: смотри /auth/login, loginAction и сид пользователей.',
    ).toHaveURL('/');

    await context.storageState({ path: statePath });
  } finally {
    await context.close();
  }

  return statePath;
}

export const test = base.extend<
  { authUser: SeedUserKey; authedPage: Page },
  { authStateFor: (user: SeedUserKey) => Promise<string> }
>({
  // worker-scoped: значение — функция, поэтому зависимости от тестовой опции нет.
  authStateFor: [
    async ({ browser }, use, workerInfo) => {
      const cache = new Map<SeedUserKey, string>();

      await use(async (user) => {
        const cached = cache.get(user);
        if (cached !== undefined) {
          return cached;
        }

        const statePath = await uiLogin(browser, user, workerInfo);
        cache.set(user, statePath);
        return statePath;
      });
    },
    { scope: 'worker' },
  ],

  // Тестовая опция: `test.use({ authUser: 'organizer' })` разрешён и в файле, и в describe.
  authUser: ['teacher', { option: true }],

  authedPage: async ({ browser, authStateFor, authUser }, use) => {
    const storageState = await authStateFor(authUser);
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();

    await use(page);

    // Контекст закрывается вместе с тестом: состояние переиспользуется через файл, а не
    // через живой контекст, иначе логаут в HD-FN-08 разлогинил бы и следующий тест.
    await context.close();
  },
});

export { expect } from '@playwright/test';
