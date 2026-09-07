import { expect, test } from '@playwright/test';

import { authHeaders, loginApi } from '../../fixtures/auth.api.js';
import { SEED_USERS } from '../../fixtures/seed.js';

/**
 * Контракт `POST /auth/login` и `GET /auth/me`. Кейсы — в парном
 * `auth-login.api.cases.md`; заголовок каждого теста начинается с ID кейса.
 *
 * Проект `api`: фикстура `request`, `baseURL = http://127.0.0.1:3101`, браузер не поднимается.
 * Пути относительные — абсолютный URL в спеке обходит `baseURL` проекта и уводит прогон
 * на чужой порт.
 *
 * Логины и пароли берутся только из `fixtures/seed.ts`: хардкод — блокер (тест-план §5.6).
 */

const TEACHER = SEED_USERS.teacher;

/** Форма тела ошибки Nest, выведенная из `HttpException.createBody` (план имплементации §2.1). */
interface ErrorBody {
  message: string | string[];
  error: string;
  statusCode: number;
}

interface LoginBody {
  accessToken?: unknown;
  user?: { id?: unknown; email?: unknown; name?: unknown };
}

const INVALID_CREDENTIALS = 'Неверный email или пароль';
const UNAUTHORIZED = 'Требуется авторизация';

test.describe('Логин: контракт API', { tag: ['@regression', '@auth-login'] }, () => {
  test('AL-API-01 — успешный логин возвращает токен', { tag: '@p0' }, async ({ request }) => {
    const response = await request.post('/auth/login', {
      data: { email: TEACHER.email, password: TEACHER.password },
    });

    // Именно 200, а не 201: Nest отвечает на POST кодом 201 по умолчанию, и без
    // @HttpCode(HttpStatus.OK) контракт нарушен.
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');

    const body = (await response.json()) as LoginBody;

    expect(typeof body.accessToken).toBe('string');
    expect(String(body.accessToken).length).toBeGreaterThan(0);
    expect(String(body.accessToken).split('.')).toHaveLength(3);
  });

  test(
    'AL-API-02 — неверный пароль даёт 401 в стандартной форме ошибки',
    { tag: '@p0' },
    async ({ request }) => {
      const response = await request.post('/auth/login', {
        data: { email: TEACHER.email, password: 'wrong-password' },
      });

      expect(response.status()).toBe(401);

      const body = (await response.json()) as ErrorBody & LoginBody;

      // `message` здесь строка, а не массив: массив бывает только у ошибок ValidationPipe.
      expect(typeof body.message).toBe('string');
      expect(body).toEqual({
        message: INVALID_CREDENTIALS,
        error: 'Unauthorized',
        statusCode: 401,
      });
      expect(body.accessToken).toBeUndefined();

      const text = await response.text();
      expect(text).not.toContain('stack');
      expect(text).not.toContain('apps/api');
    },
  );

  test(
    'AL-API-03 — неизвестный email даёт 401 с тем же сообщением',
    { tag: '@p0' },
    async ({ request }) => {
      const unknownEmail = await request.post('/auth/login', {
        data: { email: 'nobody@purpleschool.test', password: TEACHER.password },
      });
      const wrongPassword = await request.post('/auth/login', {
        data: { email: TEACHER.email, password: 'wrong-password' },
      });

      expect(unknownEmail.status()).toBe(401);
      expect(wrongPassword.status()).toBe(401);

      const unknownBody = (await unknownEmail.json()) as ErrorBody;
      const wrongBody = (await wrongPassword.json()) as ErrorBody;

      // По ответу нельзя определить, существует ли аккаунт — требование безопасности.
      expect(unknownBody.message).toBe(wrongBody.message);
      expect(unknownBody.message).toBe(INVALID_CREDENTIALS);
    },
  );

  test('AL-API-04 — отсутствующие и пустые поля дают 400', async ({ request }) => {
    const withoutPassword = await request.post('/auth/login', { data: { email: TEACHER.email } });
    const withoutEmail = await request.post('/auth/login', {
      data: { password: TEACHER.password },
    });
    const bothEmpty = await request.post('/auth/login', { data: { email: '', password: '' } });

    // Валидация срабатывает раньше аутентификации, поэтому ни 401, ни 500 здесь быть не может.
    expect(withoutPassword.status()).toBe(400);
    expect(withoutEmail.status()).toBe(400);
    expect(bothEmpty.status()).toBe(400);

    const withoutPasswordBody = (await withoutPassword.json()) as ErrorBody;
    const withoutEmailBody = (await withoutEmail.json()) as ErrorBody;
    const bothEmptyBody = (await bothEmpty.json()) as ErrorBody;

    expect(Array.isArray(withoutPasswordBody.message)).toBe(true);
    expect(withoutPasswordBody.message.toString()).toContain('password');
    expect(Array.isArray(withoutEmailBody.message)).toBe(true);
    expect(withoutEmailBody.message.toString()).toContain('email');
    expect(Array.isArray(bothEmptyBody.message)).toBe(true);
    expect(bothEmptyBody.message.toString()).toContain('email');
    expect(bothEmptyBody.message.toString()).toContain('password');
  });

  test('AL-API-07 — невалидный формат email и неверный тип пароля дают 400', async ({
    request,
  }) => {
    const badEmail = await request.post('/auth/login', {
      data: { email: 'not-an-email', password: TEACHER.password },
    });
    const numericPassword = await request.post('/auth/login', {
      data: { email: TEACHER.email, password: 12345 },
    });

    expect(badEmail.status()).toBe(400);
    expect(numericPassword.status()).toBe(400);

    const badEmailBody = (await badEmail.json()) as ErrorBody;
    const numericPasswordBody = (await numericPassword.json()) as ErrorBody;

    expect(Array.isArray(badEmailBody.message)).toBe(true);
    expect(badEmailBody.message.toString()).toContain('email must be an email');
    expect(Array.isArray(numericPasswordBody.message)).toBe(true);
    expect(numericPasswordBody.message.toString()).toContain('password must be a string');
  });

  test('AL-API-08 — лишнее поле отвергается forbidNonWhitelisted', async ({ request }) => {
    const response = await request.post('/auth/login', {
      data: { email: TEACHER.email, password: TEACHER.password, role: 'admin' },
    });

    expect(response.status()).toBe(400);

    const body = (await response.json()) as ErrorBody & LoginBody;

    expect(body.message.toString()).toContain('property role should not exist');
    expect(body.accessToken).toBeUndefined();
  });

  test('AL-API-10 — email нечувствителен к регистру', async ({ request }) => {
    const response = await request.post('/auth/login', {
      data: { email: TEACHER.email.toUpperCase(), password: TEACHER.password },
    });

    expect(response.status()).toBe(200);

    const body = (await response.json()) as LoginBody;
    expect(typeof body.accessToken).toBe('string');

    const me = await request.get('/auth/me', { headers: authHeaders(String(body.accessToken)) });

    expect(me.status()).toBe(200);

    const meBody = (await me.json()) as { email?: unknown };
    // Отдаётся канонический email из сида, а не то, что прислал клиент.
    expect(meBody.email).toBe(TEACHER.email);
  });

  test('AL-API-11 — ответ не содержит пароль', { tag: '@p0' }, async ({ request }) => {
    const response = await request.post('/auth/login', {
      data: { email: TEACHER.email, password: TEACHER.password },
    });

    expect(response.status()).toBe(200);

    // Именно текст ответа, а не разобранный объект: сериализованный хеш мог бы уехать
    // во вложенном поле, которого ассерт по ключам не заметит.
    const text = await response.text();

    expect(text.toLowerCase()).not.toContain('password');
    expect(text).not.toContain(TEACHER.password);
    expect(text).not.toContain('scrypt');
  });

  test('AL-API-13 — GET /auth/me с валидным токеном отдаёт профиль', async ({ request }) => {
    const token = await loginApi(request, 'teacher');

    const response = await request.get('/auth/me', { headers: authHeaders(token) });

    expect(response.status()).toBe(200);

    const body = (await response.json()) as { id?: unknown; email?: unknown };

    expect(typeof body.id).toBe('string');
    expect(body.email).toBe(TEACHER.email);
    expect(body).not.toHaveProperty('password');
    expect(body).not.toHaveProperty('passwordHash');
  });

  test('AL-API-14 — GET /auth/me без токена даёт 401', { tag: '@p0' }, async ({ request }) => {
    const response = await request.get('/auth/me');

    expect(response.status()).toBe(401);

    const body = (await response.json()) as ErrorBody & { email?: unknown };

    expect(body).toEqual({ message: UNAUTHORIZED, error: 'Unauthorized', statusCode: 401 });
    expect(body.email).toBeUndefined();
  });

  test('AL-API-15 — невалидный токен на /auth/me даёт 401, а не 500', async ({ request }) => {
    const response = await request.get('/auth/me', { headers: authHeaders('not.a.jwt') });

    // Именно 401: битый токен — это отказ в доступе, а не сбой сервера.
    expect(response.status()).toBe(401);

    const body = (await response.json()) as ErrorBody;

    expect(body).toEqual({ message: UNAUTHORIZED, error: 'Unauthorized', statusCode: 401 });
  });
});
