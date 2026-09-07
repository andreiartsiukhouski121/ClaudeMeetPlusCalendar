import { describe, expect, it } from 'vitest';

import { ApiError, DEFAULT_API_BASE_URL, resolveApiUrl } from './api-client';

/**
 * Юниты API-клиента (`AL-UT-23…26`): чистая склейка URL и нормализация текста ошибки.
 * Сетевых вызовов здесь нет — `apiFetch` целиком проверяется e2e (тест-план §4.1).
 *
 * Файл `api-client.ts` намеренно не импортирует `server-only`: иначе этот спек упал бы
 * на импорте, который Vitest не резолвит (риск 6).
 */

/** `API_URL` — переменная процесса, поэтому её правки обязаны откатываться в `finally`. */
function withApiUrl<T>(value: string | undefined, run: () => T): T {
  const previous = process.env.API_URL;
  try {
    if (value === undefined) {
      delete process.env.API_URL;
    } else {
      process.env.API_URL = value;
    }
    return run();
  } finally {
    if (previous === undefined) {
      delete process.env.API_URL;
    } else {
      process.env.API_URL = previous;
    }
  }
}

describe('resolveApiUrl', () => {
  it('AL-UT-23 — склеивает базу с трейлинг-слэшем и без него в один слэш', () => {
    expect(resolveApiUrl('/auth/me', 'http://x:3001/')).toBe('http://x:3001/auth/me');
    expect(resolveApiUrl('/auth/me', 'http://x:3001')).toBe('http://x:3001/auth/me');
    // Несколько слэшей подряд и путь без ведущего слэша — та же нормализация.
    expect(resolveApiUrl('auth/me', 'http://x:3001///')).toBe('http://x:3001/auth/me');
  });

  it('AL-UT-24 — уважает API_URL из окружения процесса', () => {
    // Ровно этим Playwright связывает Next на :3100 с Nest на :3101 (`webServer.env`):
    // если функция перестанет читать переменную, web-проект уедет на :3001.
    const url = withApiUrl('http://127.0.0.1:3101', () => resolveApiUrl('/auth/login'));

    expect(url).toBe('http://127.0.0.1:3101/auth/login');
  });

  it('AL-UT-25 — без API_URL база равна http://127.0.0.1:3001', () => {
    const url = withApiUrl(undefined, () => resolveApiUrl('/auth/login'));

    expect(DEFAULT_API_BASE_URL).toBe('http://127.0.0.1:3001');
    expect(url).toBe('http://127.0.0.1:3001/auth/login');
  });
});

describe('ApiError', () => {
  it('AL-UT-26 — message нормализуется и из строки, и из массива строк', () => {
    // 401 от нашего UnauthorizedException: `message` — строка.
    const unauthorized = ApiError.fromBody(401, {
      message: 'Неверный email или пароль',
      error: 'Unauthorized',
      statusCode: 401,
    });

    expect(unauthorized.status).toBe(401);
    expect(unauthorized.message).toBe('Неверный email или пароль');

    // 400 от ValidationPipe: `message` — массив строк. Без нормализации пользователь
    // увидел бы `[object Object]` вместо текста.
    const validation = ApiError.fromBody(400, {
      message: ['email must be an email', 'password should not be empty'],
      error: 'Bad Request',
      statusCode: 400,
    });

    expect(validation.status).toBe(400);
    expect(validation.message).toContain('email must be an email');
    expect(validation.message).toContain('password should not be empty');
    expect(validation.message).not.toContain('[object Object]');

    // Тело без `message` (или вовсе не JSON) не должно давать пустую ошибку.
    expect(ApiError.fromBody(500, undefined).message).toBe('HTTP 500');
    expect(ApiError.fromBody(502, { error: 'Bad Gateway' }).message).toBe('HTTP 502');
    expect(ApiError.fromBody(401, undefined)).toBeInstanceOf(Error);
  });
});
