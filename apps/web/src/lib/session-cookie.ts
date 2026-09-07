/**
 * Имя и опции cookie сессии. Чистый модуль: **без** `import 'server-only'` и **без**
 * `next/headers` (план имплементации §3.5, риск 6) — иначе юниты `AL-UT-20…22` упали бы
 * на импорте, который Vitest не резолвит. Работа с самим хранилищем cookie — в `session.ts`.
 *
 * Имя константы живёт здесь, а не в `actions/auth.ts`: файл с `'use server'` может
 * экспортировать только async-функции (риск 19).
 */

export const SESSION_COOKIE_NAME = 'ps_session';

/**
 * Срок жизни cookie. Обязан совпадать с `JWT_EXPIRES_IN = '1h'` из §3.6: если числа разъедутся,
 * получится «сессия жива, а токен просрочен» — пользователь считается залогиненным, но каждый
 * запрос к Nest отвечает 401. Совпадение фиксирует `AL-UT-22`.
 */
export const SESSION_MAX_AGE_SECONDS = 60 * 60;

export interface SessionCookieOptions {
  httpOnly: boolean;
  sameSite: 'lax';
  path: string;
  maxAge: number;
  secure: boolean;
}

/**
 * Опции cookie сессии для переданного `NODE_ENV`.
 *
 * `secure` — по окружению, а НЕ безусловный `true`, и не по той причине, которую обычно
 * называют (риск 1): Chromium принимает `Secure`-cookie на `http://127.0.0.1`, loopback
 * считается trustworthy origin, так что e2e безусловный `true` не ломает. Причина другая —
 * в любом окружении, где loopback не trustworthy (другой браузер, прокси, контейнер с внешним
 * хостом), `secure: true` на http сломает проверку. Диагностический вывод: симптом
 * «бесконечный редирект `/` ↔ `/auth/login`» ищут в риске 18, а не здесь.
 */
export function buildSessionCookieOptions(nodeEnv: string | undefined): SessionCookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
    secure: nodeEnv === 'production',
  };
}
