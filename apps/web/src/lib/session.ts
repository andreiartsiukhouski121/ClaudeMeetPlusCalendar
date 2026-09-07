import 'server-only';
import { cookies } from 'next/headers';

import { buildSessionCookieOptions, SESSION_COOKIE_NAME } from './session-cookie';

/**
 * Работа с cookie сессии. В cookie лежит **сырой JWT** от Nest без дополнительной обёртки
 * (§3.5): он подписан HS256, не читается из JS (`httpOnly`) и не содержит ничего, кроме `sub`
 * и `email`. Функций `parseSession`/`serializeSession` в архитектуре нет — валидность токена
 * подтверждает сам Nest на `GET /auth/me`.
 *
 * Файл помечен `server-only` и трогает `next/headers`, поэтому юнитами НЕ покрывается: Vitest
 * не резолвит этот импорт (риск 6). Всё тестируемое вынесено в `session-cookie.ts`.
 *
 * `cookies()` в Next 16 асинхронна, а `.set`/`.delete` работают только внутри Server Action
 * или Route Handler (риск 4): «разлогинить» пользователя прямо при рендере страницы нельзя.
 */

export async function createSession(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, buildSessionCookieOptions(process.env.NODE_ENV));
}

export async function readSessionToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
