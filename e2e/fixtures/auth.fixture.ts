import path from 'node:path';
import { test as base, type Browser, type Page, type WorkerInfo } from '@playwright/test';
import { type SeedUserKey } from './seed.js';

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
 * ЗАГЛУШКА. Страницы `/auth/login` ещё нет — она появляется в T1.8, форма дашборда и кейсы,
 * которым нужна сессия, — в T2.x. Полноценно реализовать логин сейчас невозможно, а тихо
 * вернуть пустое состояние — хуже всего: `authedPage` отдала бы неавторизованную страницу,
 * кейс упал бы на непонятном ассерте, и причину искали бы в фиче, а не здесь.
 *
 * Поэтому функция честно бросает исключение с указанием задачи. Файл при этом компилируется
 * и проходит `pnpm typecheck`, а фикстура `authedPage` до T1.8 просто не берётся ни одним кейсом.
 */
function uiLogin(_browser: Browser, user: SeedUserKey, workerInfo: WorkerInfo): Promise<string> {
  return Promise.reject(
    new Error(
      `UI-логин появится в T1.8 (страница /auth/login). Сейчас получить сессию пользователя ` +
        `"${user}" невозможно, поэтому фикстуру authedPage брать нельзя — используй обычную ` +
        `page в чистом контексте.\n` +
        `Что здесь будет: открыть /auth/login, заполнить поля данными SEED_USERS["${user}"], ` +
        `нажать «Войти», дождаться URL "/", затем ` +
        `context.storageState({ path: '${storageStatePath(workerInfo, user)}' }) и вернуть этот путь.`,
    ),
  );
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
