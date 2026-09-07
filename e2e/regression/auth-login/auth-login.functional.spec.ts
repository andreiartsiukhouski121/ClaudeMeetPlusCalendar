import { expect, test, type Page } from '@playwright/test';

import { collectConsoleProblems } from '../../fixtures/console.js';
import { SEED_USERS } from '../../fixtures/seed.js';

/**
 * UI страницы `/auth/login`. Кейсы — в парном `auth-login.functional.cases.md`;
 * заголовок каждого теста начинается с ID кейса.
 *
 * Проект `web`: Desktop Chrome, `baseURL = http://127.0.0.1:3100`. Пути относительные —
 * абсолютный URL обошёл бы `baseURL` проекта и увёл прогон на чужой порт.
 *
 * Локаторы — только по роли и метке (тест-план §5.1): в `apps/web` CSS-модули с хешированными
 * именами классов, поэтому селектор по классу умирает на следующем билде. Логины и пароли —
 * только из `fixtures/seed.ts`.
 *
 * Ни один кейс здесь НЕ проверяет содержимое главной страницы: в фиче 1 `/` — ещё дефолтная
 * страница create-next-app, приветствие с email появляется в фиче 2. Успешный вход
 * подтверждается сменой URL и появлением cookie сессии.
 */

const TEACHER = SEED_USERS.teacher;

/**
 * Имя cookie сессии из плана имплементации §3.5. Константа локальная, а не импортированная
 * из `apps/web`: сьют проверяет приложение как чёрный ящик, а импорт прод-константы сделал бы
 * ассерт сравнением значения с самим собой.
 */
const SESSION_COOKIE_NAME = 'ps_session';

/**
 * Ошибка формы логина.
 *
 * Голый `page.getByRole('alert')` тут не работает, и это не придирка: App Router держит на
 * странице свой `<div role="alert" aria-live="assertive" id="__next-route-announcer__">` —
 * анонсер маршрутизации, пустой и живущий вне `<main>`. Он даёт strict mode violation
 * («resolved to 2 elements») в каждом кейсе с ошибкой. Проверено прогоном, а не предположением.
 *
 * Поэтому область поиска сужается по роли `main` (её даёт `app/auth/layout.tsx`), а не CSS-цепочкой
 * и не `.filter({ hasText })`: фильтр по тексту скрыл бы падение «alert не отрендерился вовсе» —
 * локатор просто не нашёл бы ничего, и ассерт «виден alert» стал бы бессмысленным.
 */
function loginAlert(page: Page) {
  return page.getByRole('main').getByRole('alert');
}

test.describe('Логин: UI', { tag: ['@regression', '@auth-login'] }, () => {
  /**
   * Чистый контекст на весь файл: авторизованных сценариев в фиче 1 нет, фикстура `authedPage`
   * не берётся ни одним кейсом. Само по себе это no-op — глобального `storageState`
   * в `playwright.config.ts` нет, обычная `page` и так чиста. Конструкция остаётся защитой
   * от будущего добавления глобального состояния в конфиг.
   */
  test.use({ storageState: undefined });

  test('AL-FN-01 — форма логина отрендерена', { tag: '@p0' }, async ({ page }) => {
    await page.goto('/auth/login');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // getByLabel заодно доказывает, что у полей есть связанные <label> — требование доступности.
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Пароль')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Войти' })).toBeVisible();
  });

  test('AL-FN-02 — успешный логин уводит с формы на /', { tag: '@p0' }, async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByLabel('Email').fill(TEACHER.email);
    await page.getByLabel('Пароль').fill(TEACHER.password);
    await page.getByRole('button', { name: 'Войти' }).click();

    // Смена URL ждётся web-first ассертом, а не waitForNavigation: переход выполняет
    // redirect('/') внутри Server Action. Если redirect окажется внутри try/catch (риск 18),
    // cookie выставится, а этот ассерт покраснеет — ровно то, что кейс и должен ловить.
    await expect(page).toHaveURL('/');

    const sessionCookies = (await page.context().cookies()).filter(
      (cookie) => cookie.name === SESSION_COOKIE_NAME,
    );
    expect(sessionCookies).toHaveLength(1);

    // Содержимое главной не проверяется — это фича 2. Достаточно, что формы логина больше нет.
    await expect(page.getByRole('button', { name: 'Войти' })).toBeHidden();
  });

  test(
    'AL-FN-03 — неверный пароль: видимая ошибка, пользователь остаётся на странице логина',
    { tag: '@p0' },
    async ({ page }) => {
      await page.goto('/auth/login');
      await page.getByLabel('Email').fill(TEACHER.email);
      await page.getByLabel('Пароль').fill('wrong-password');
      await page.getByRole('button', { name: 'Войти' }).click();

      const alert = loginAlert(page);
      await expect(alert).toBeVisible();
      await expect(alert).toContainText('Неверный email или пароль');

      await expect(page).toHaveURL('/auth/login');
      await expect(page.getByRole('button', { name: 'Войти' })).toBeVisible();

      // Служебных деталей в тексте быть не должно: 401 обработана, а не «протекла» наружу.
      await expect(alert).not.toContainText('passwordHash');
      await expect(alert).not.toContainText('scrypt');
      await expect(alert).not.toContainText('apps/api');

      const sessionCookies = (await page.context().cookies()).filter(
        (cookie) => cookie.name === SESSION_COOKIE_NAME,
      );
      expect(sessionCookies).toEqual([]);
    },
  );

  test('AL-FN-04 — неизвестный email даёт ту же ошибку', { tag: '@p0' }, async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByLabel('Email').fill('nobody@purpleschool.test');
    await page.getByLabel('Пароль').fill(TEACHER.password);
    await page.getByRole('button', { name: 'Войти' }).click();

    const alert = loginAlert(page);
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('Неверный email или пароль');
    const unknownEmailText = await alert.innerText();

    await expect(page).toHaveURL('/auth/login');

    // Второй заход тем же путём, но с существующим email и неверным паролем. Ожидаемое
    // значение — текст ПЕРВОГО ответа, а не константа: так кейс доказывает именно
    // неразличимость двух ветвей отказа, а не совпадение с заранее известной строкой.
    await page.goto('/auth/login');
    await page.getByLabel('Email').fill(TEACHER.email);
    await page.getByLabel('Пароль').fill('wrong-password');
    await page.getByRole('button', { name: 'Войти' }).click();

    await expect(alert).toBeVisible();
    await expect(alert).toHaveText(unknownEmailText);
  });

  test('AL-FN-05 — пустая форма не отправляется', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByRole('button', { name: 'Войти' }).click();

    // Текст приложения, а не браузера: `required` на инпутах запрещён (риск 20), иначе
    // отправку заблокировал бы браузер и серверная ветка валидации не выполнилась бы.
    await expect(loginAlert(page)).toContainText('Введите email и пароль');
    await expect(page).toHaveURL('/auth/login');
    await expect(page.getByRole('button', { name: 'Войти' })).toBeVisible();
  });

  test('AL-FN-06 — ссылка на регистрацию ведёт на существующую страницу', async ({ page }) => {
    await page.goto('/auth/login');

    const link = page.getByRole('link', { name: 'Зарегистрироваться' });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/auth/register');

    await link.click();

    await expect(page).toHaveURL('/auth/register');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Регистрация');
    await expect(page.getByText('This page could not be found')).toBeHidden();

    // Отдельная прямая навигация: клик по Link — клиентский переход, у него нет HTTP-статуса.
    // Без этой проверки кейс не отличил бы страницу от отрендеренного клиентом 404.
    const direct = await page.goto('/auth/register');
    expect(direct?.status()).toBe(200);
  });

  test('AL-FN-08 — страница логина не пишет в консоль ни при рендере, ни после неудачного входа', async ({
    page,
  }) => {
    // Подписка ДО goto: иначе ошибки первого рендера в список не попадут.
    const problems = collectConsoleProblems(page);

    await page.goto('/auth/login');
    await expect(page.getByRole('button', { name: 'Войти' })).toBeVisible();
    expect(problems).toEqual([]);

    await page.getByLabel('Email').fill(TEACHER.email);
    await page.getByLabel('Пароль').fill('wrong-password');
    await page.getByRole('button', { name: 'Войти' }).click();

    await expect(loginAlert(page)).toBeVisible();
    // Ожидаемая 401 обработана приложением, а не всплыла необработанным исключением.
    expect(problems).toEqual([]);
  });

  test('AL-FN-10 — пароль скрыт при вводе', async ({ page }) => {
    await page.goto('/auth/login');

    const password = page.getByLabel('Пароль');
    await password.fill(TEACHER.password);

    // `type="password"` — единственное, что скрывает значение: в DOM оно остаётся, поэтому
    // ассерт про атрибут, а не про отсутствие текста на странице.
    await expect(password).toHaveAttribute('type', 'password');
    await expect(password).toHaveValue(TEACHER.password);
    await expect(page.getByText(TEACHER.password, { exact: true })).toBeHidden();
  });

  test('AL-FN-13 — cookie сессии httpOnly и недоступна из JS', { tag: '@p0' }, async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByLabel('Email').fill(TEACHER.email);
    await page.getByLabel('Пароль').fill(TEACHER.password);
    await page.getByRole('button', { name: 'Войти' }).click();

    await expect(page).toHaveURL('/');

    const sessionCookies = (await page.context().cookies()).filter(
      (cookie) => cookie.name === SESSION_COOKIE_NAME,
    );
    expect(sessionCookies).toHaveLength(1);

    const session = sessionCookies[0];
    expect(session.httpOnly).toBe(true);
    expect(session.path).toBe('/');
    expect(session.sameSite).not.toBe('None');
    expect(session.value.split('.')).toHaveLength(3);

    // JWT не должен быть виден из JS — иначе XSS получает токен доступа к Nest.
    const documentCookie = await page.evaluate(() => document.cookie);
    expect(documentCookie).not.toContain(session.value);
    expect(documentCookie).not.toContain(SESSION_COOKIE_NAME);
  });

  test('AL-FN-14 — невалидный формат email в UI', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByLabel('Email').fill('not-an-email');
    await page.getByLabel('Пароль').fill(TEACHER.password);
    await page.getByRole('button', { name: 'Войти' }).click();

    // Поле email — `type="text"`, поэтому отправку не блокирует браузер: 400 от ValidationPipe
    // доходит до loginAction и превращается в этот текст (риск 20).
    await expect(loginAlert(page)).toContainText('Проверьте формат email');
    await expect(page).toHaveURL('/auth/login');
  });
});
