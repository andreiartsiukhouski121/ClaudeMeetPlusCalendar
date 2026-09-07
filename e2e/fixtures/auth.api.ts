import { expect, type APIRequestContext } from '@playwright/test';
import { SEED_USERS, type SeedUserKey } from './seed.js';

/**
 * Логин через API для кейсов проекта `api` — браузер в этом проекте не поднимается.
 * UI-логин живёт отдельно, в `auth.fixture.ts`.
 */

/**
 * Кэш токенов на процесс воркера. `POST /auth/login` считает scrypt, а под `teacher`
 * логинится почти каждый кейс контракта — без кэша это десятки лишних хешей на прогон.
 *
 * Модульная переменная, а не worker-фикстура: файл — обычный хелпер, его вызывают из спеков
 * с любым набором фикстур. Playwright запускает каждый воркер в своём процессе, поэтому
 * модульное состояние и так изолировано по воркерам.
 *
 * Токены не истекают внутри прогона: JWT_EXPIRES_IN = '1h', а таймаут теста — 60 с.
 */
const tokenCache = new Map<SeedUserKey, string>();

interface LoginResponseBody {
  accessToken?: unknown;
}

/**
 * Возвращает `accessToken` сид-пользователя. Ожидание 200 — внутри хелпера: если сид
 * не применился, падать должен хелпер с внятным сообщением, а не ассерт самого кейса
 * где-то ниже на `undefined` в заголовке.
 */
export async function loginApi(request: APIRequestContext, user: SeedUserKey): Promise<string> {
  const cached = tokenCache.get(user);
  if (cached !== undefined) {
    return cached;
  }

  const { email, password } = SEED_USERS[user];
  const response = await request.post('/auth/login', { data: { email, password } });

  expect(
    response.status(),
    `Логин сид-пользователя ${user} (${email}) не удался. Это проблема сида или /auth/login, ` +
      `не проверяемого кейса. Тело ответа: ${await response.text()}`,
  ).toBe(200);

  const body = (await response.json()) as LoginResponseBody;
  const { accessToken } = body;

  expect(
    typeof accessToken,
    `POST /auth/login для ${user} ответил 200, но accessToken не строка`,
  ).toBe('string');

  const token = accessToken as string;
  tokenCache.set(user, token);
  return token;
}

/** Заголовки с Bearer-токеном. Отдельная функция, чтобы схема не переписывалась в каждом кейсе. */
export function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

/** Сокращение для самого частого случая: залогиниться и сразу получить заголовки. */
export async function authHeadersFor(
  request: APIRequestContext,
  user: SeedUserKey,
): Promise<Record<string, string>> {
  return authHeaders(await loginApi(request, user));
}
