import {
  expect,
  mergeTests,
  type APIRequestContext,
  type Locator,
  type Page,
} from '@playwright/test';

import { API_BASE_URL, test as apiTest } from '../../fixtures/api.js';
import { authHeadersFor } from '../../fixtures/auth.api.js';
import { test as authTest } from '../../fixtures/auth.fixture.js';
import { collectConsoleProblems } from '../../fixtures/console.js';
import { FUTURE_STARTS_AT_LOCAL, SEED_USERS, TEACHER_MEETINGS } from '../../fixtures/seed.js';

/**
 * UI главной страницы `/`. Кейсы — в парном `home-dashboard.functional.cases.md`;
 * заголовок каждого теста начинается с ID кейса.
 *
 * Проект `web`: Desktop Chrome, `baseURL = http://127.0.0.1:3100`. Пути относительные.
 *
 * Два набора фикстур объединены `mergeTests`: сессия берётся из `auth.fixture.ts`
 * (`authUser`/`authedPage`), а эталонные `total`/`items` — через `apiRequest` из `api.ts`.
 * Именно `apiRequest`, а НЕ штатная `request`: в проекте `web` у неё `baseURL` = `:3100`,
 * то есть запрос ушёл бы в Next, а не в Nest, и кейсы `HD-FN-03`/`HD-FN-05` были бы
 * нереализуемы как написаны. BFF это не нарушает — запрос идёт из Node-процесса теста,
 * а браузерный трафик проверяет `HD-FN-11`.
 *
 * Локаторы — только по роли, метке и тексту (тест-план §5.1): в `apps/web` CSS-модули
 * с хешированными классами, селектор по классу умрёт на следующем билде.
 */
const test = mergeTests(authTest, apiTest);

const TEACHER = SEED_USERS.teacher;
const STUDENT = SEED_USERS.student;
const SESSION_COOKIE_NAME = 'ps_session';

/** Счётчик встреч — один текстовый узел ровно в формате `Всего встреч: N`. */
const COUNTER_PATTERN = /^Всего встреч: \d+$/;

function counter(page: Page): Locator {
  return page.getByText(COUNTER_PATTERN);
}

/**
 * Число из счётчика. Хелпер вынесен из теста намеренно: `playwright/no-conditional-in-test`
 * стоит в `error`, а «бросить, если не совпало» без условия не написать.
 */
async function readCounter(page: Page): Promise<number> {
  const text = await counter(page).innerText();
  const matched = /(\d+)/.exec(text);

  if (matched === null) {
    throw new Error(`Счётчик встреч не найден в тексте "${text}"`);
  }

  return Number(matched[1]);
}

interface MeetingsPageBody {
  items: { id: string; title: string }[];
  total: number;
}

/** Эталонные данные напрямую из Nest — источник ожидаемых чисел вместо литерала в тесте. */
async function fetchMeetingsPage(
  apiRequest: APIRequestContext,
  limit: number,
): Promise<MeetingsPageBody> {
  const response = await apiRequest.get(`/meetings?limit=${String(limit)}`, {
    headers: await authHeadersFor(apiRequest, 'teacher'),
  });

  expect(
    response.status(),
    'Эталонные данные не получены от Nest напрямую — проблема в сиде или в /meetings, ' +
      'а не в проверяемом UI',
  ).toBe(200);

  return (await response.json()) as MeetingsPageBody;
}

test.describe('Главная: UI', { tag: ['@regression', '@home-dashboard'] }, () => {
  /**
   * Кейсы без сессии. `storageState: undefined` сам по себе no-op (глобального
   * `storageState` в конфиге нет) — он объявляет, что тест берёт чистую `page`,
   * а не `authedPage`, и страхует от будущего добавления глобального состояния.
   */
  test.describe('без сессии', () => {
    test.use({ storageState: undefined });

    test('HD-FN-01 — неавторизованный на / уходит на логин', { tag: '@p0' }, async ({ page }) => {
      await page.goto('/');

      await expect(page).toHaveURL('/auth/login');
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Войти' })).toBeVisible();

      // Данных дашборда на странице нет — редирект случился до рендера.
      await expect(counter(page)).toBeHidden();
      await expect(page.getByText(TEACHER.email)).toBeHidden();
    });

    test('HD-FN-11 — браузер не обращается к API напрямую', async ({ page }) => {
      const requestedUrls: string[] = [];
      // Подписка ДО первой навигации: иначе запросы логина в список не попадут.
      page.on('request', (request) => requestedUrls.push(request.url()));

      await page.goto('/auth/login');
      await page.getByLabel('Email').fill(TEACHER.email);
      await page.getByLabel('Пароль').fill(TEACHER.password);
      await page.getByRole('button', { name: 'Войти' }).click();

      await expect(page).toHaveURL('/');
      await expect(page.getByRole('heading', { level: 1 })).toContainText(TEACHER.email);

      const toNest = requestedUrls.filter((url) => url.startsWith(API_BASE_URL));

      expect(
        toNest,
        `Браузер обратился к Nest напрямую (${API_BASE_URL}) — нарушение BFF. ` +
          'Весь трафик страницы обязан идти в Next, а к Nest ходит только сервер Next.',
      ).toEqual([]);
      expect(requestedUrls.length).toBeGreaterThan(0);
    });
  });

  test(
    'HD-FN-02 — приветствие содержит email пользователя',
    { tag: '@p0' },
    async ({ authedPage }) => {
      await authedPage.goto('/');

      const greeting = authedPage.getByRole('heading', { level: 1 });

      await expect(greeting).toBeVisible();
      await expect(greeting).toContainText(TEACHER.email);
    },
  );

  test(
    'HD-FN-03 — количество встреч совпадает с данными API',
    { tag: '@p0' },
    async ({ authedPage, apiRequest }) => {
      const reference = await fetchMeetingsPage(apiRequest, TEACHER_MEETINGS.latestLimit);

      await authedPage.goto('/');

      // Ожидаемое число берётся из ответа API, а не из литерала: подмена `total` на
      // `items.length` в сервисе обязана уронить именно этот ассерт.
      await expect(authedPage.getByText(`Всего встреч: ${String(reference.total)}`)).toBeVisible();
      expect(reference.total).toBe(TEACHER_MEETINGS.total);
      expect(await readCounter(authedPage)).toBe(reference.total);
      expect(reference.total).not.toBe(reference.items.length);
    },
  );

  test('HD-FN-04 — показаны ровно 3 последние встречи', { tag: '@p0' }, async ({ authedPage }) => {
    await authedPage.goto('/');

    const list = authedPage.getByRole('list');

    await expect(list).toBeVisible();
    await expect(list.getByRole('listitem')).toHaveCount(TEACHER_MEETINGS.latestLimit);
  });

  test(
    'HD-FN-05 — порядок и отсечение старых встреч',
    { tag: '@p0' },
    async ({ authedPage, apiRequest }) => {
      const reference = await fetchMeetingsPage(apiRequest, TEACHER_MEETINGS.latestLimit);

      await authedPage.goto('/');

      const items = authedPage.getByRole('list').getByRole('listitem');
      await expect(items).toHaveCount(reference.items.length);

      // Порядок в UI сверяется с порядком из API, а не с константой: так кейс ловит
      // и потерянную сортировку в сервисе, и переупорядочивание в разметке.
      for (const [index, expectedTitle] of reference.items.map((item) => item.title).entries()) {
        await expect(items.nth(index)).toContainText(expectedTitle);
      }
      expect(reference.items.map((item) => item.title)).toEqual([...TEACHER_MEETINGS.latestTitles]);

      for (const omitted of TEACHER_MEETINGS.omittedTitles) {
        await expect(authedPage.getByText(omitted)).toBeHidden();
      }
    },
  );

  test(
    'HD-FN-06 — кнопка «Создать встречу» присутствует',
    { tag: '@p0' },
    async ({ authedPage }) => {
      await authedPage.goto('/');

      const button = authedPage.getByRole('button', { name: 'Создать встречу' });

      await expect(button).toBeVisible();
      await expect(button).toBeEnabled();
    },
  );

  test('HD-FN-10 — нет ошибок в консоли на главной', async ({ authedPage }) => {
    // Подписка ДО goto: иначе ошибки первого рендера в список не попадут.
    const problems = collectConsoleProblems(authedPage);

    await authedPage.goto('/');
    await expect(authedPage.getByRole('heading', { level: 1 })).toContainText(TEACHER.email);
    await expect(counter(authedPage)).toBeVisible();

    expect(problems).toEqual([]);
  });

  test('HD-FN-14 — доступность управляющих элементов', async ({ authedPage }) => {
    await authedPage.goto('/');

    await expect(authedPage.getByRole('list')).toBeVisible();
    await expect(authedPage.getByRole('list').getByRole('listitem')).toHaveCount(
      TEACHER_MEETINGS.latestLimit,
    );

    // Роль + непустое доступное имя: если имя пропадёт, локатор просто не найдёт кнопку.
    await expect(authedPage.getByRole('button', { name: 'Создать встречу' })).toBeVisible();
    await expect(authedPage.getByRole('button', { name: 'Выйти' })).toBeVisible();

    await expect(authedPage.getByRole('heading', { level: 1 })).toHaveCount(1);
  });

  test('HD-FN-16 — авторизованный на /auth/login уходит на /', async ({ authedPage }) => {
    await authedPage.goto('/auth/login');

    // Обратный редирект делает `proxy.ts` — это DoD задачи T2.7.
    await expect(authedPage).toHaveURL('/');
    await expect(authedPage.getByRole('button', { name: 'Войти' })).toBeHidden();
    await expect(authedPage.getByRole('heading', { level: 1 })).toContainText(TEACHER.email);
  });

  test.describe('пользователь без встреч', () => {
    test.use({ authUser: 'student' });

    test('HD-FN-09 — пустое состояние при отсутствии встреч', async ({ authedPage }) => {
      const problems = collectConsoleProblems(authedPage);

      await authedPage.goto('/');

      await expect(authedPage.getByRole('heading', { level: 1 })).toContainText(STUDENT.email);
      await expect(authedPage.getByText('Всего встреч: 0')).toBeVisible();
      await expect(authedPage.getByRole('listitem')).toHaveCount(0);
      await expect(authedPage.getByText('Встреч пока нет')).toBeVisible();

      const button = authedPage.getByRole('button', { name: 'Создать встречу' });
      await expect(button).toBeVisible();
      await expect(button).toBeEnabled();

      expect(problems).toEqual([]);
    });
  });

  /**
   * Мутирующие кейсы — под `organizer`: он выделен именно для `*.functional.spec.ts`
   * (в `*.api.spec.ts` мутируется `planner`), поэтому межпроектной гонки нет.
   * Serial — страховка внутри файла. Ассерты на счётчик только относительные (`N` → `N+1`),
   * заголовок встречи уникальный, дата — 2030 год из `fixtures/seed.ts`.
   *
   * `HD-FN-08` логаутится, но общее состояние воркера этим не портит: `authedPage`
   * создаёт новый контекст из файла `storageState` на каждый тест, а сам файл логаут
   * не меняет.
   */
  test.describe('мутирующие кейсы под organizer', () => {
    test.describe.configure({ mode: 'serial' });
    test.use({ authUser: 'organizer' });

    test(
      'HD-FN-07 — создание встречи обновляет счётчик и список',
      { tag: ['@p0', '@mutating'] },
      async ({ authedPage }) => {
        await authedPage.goto('/');

        const before = await readCounter(authedPage);
        const title = `E2E встреча ${String(Date.now())}-${String(
          Math.floor(Math.random() * 1e6),
        )}`;

        await authedPage.getByLabel('Название').fill(title);
        await authedPage.getByLabel('Дата и время').fill(FUTURE_STARTS_AT_LOCAL);
        await authedPage.getByRole('button', { name: 'Создать встречу' }).click();

        await expect(authedPage.getByText(`Всего встреч: ${String(before + 1)}`)).toBeVisible();

        const items = authedPage.getByRole('list').getByRole('listitem');
        // Дата 2030 года позже любой сид-встречи владельца, сортировка DESC ⇒ новая первая.
        await expect(items.first()).toContainText(title);
        expect(await items.count()).toBeLessThanOrEqual(TEACHER_MEETINGS.latestLimit);

        // Перезагрузка: изменение обязано жить на сервере, а не в состоянии клиента.
        await authedPage.reload();

        await expect(authedPage.getByText(`Всего встреч: ${String(before + 1)}`)).toBeVisible();
        await expect(authedPage.getByRole('list').getByRole('listitem').first()).toContainText(
          title,
        );
      },
    );

    test(
      'HD-FN-08 — выход из аккаунта закрывает доступ',
      { tag: ['@p0', '@mutating'] },
      async ({ authedPage }) => {
        await authedPage.goto('/');

        const logout = authedPage.getByRole('button', { name: 'Выйти' });
        await expect(logout).toBeVisible();

        await logout.click();

        await expect(authedPage).toHaveURL('/auth/login');
        await expect(authedPage.getByLabel('Email')).toBeVisible();
        await expect(authedPage.getByRole('heading', { level: 1 })).not.toContainText('@');

        const sessionCookies = (await authedPage.context().cookies()).filter(
          (cookie) => cookie.name === SESSION_COOKIE_NAME,
        );
        // Cookie удалена. Если бы реализация оставляла её с пустым значением, кейс всё
        // равно был бы корректен: значение обязано быть строго пустым.
        expect(
          sessionCookies.map((cookie) => cookie.value).filter((value) => value !== ''),
        ).toEqual([]);

        // Повторный заход на `/` — детерминированная проверка «после выхода данных нет».
        await authedPage.goto('/');

        await expect(authedPage).toHaveURL('/auth/login');
        await expect(counter(authedPage)).toBeHidden();
        await expect(authedPage.getByText(SEED_USERS.organizer.email)).toBeHidden();
      },
    );
  });
});
