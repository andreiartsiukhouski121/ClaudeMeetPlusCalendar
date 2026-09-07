import { type NextRequest, NextResponse } from 'next/server';

import { SESSION_COOKIE_NAME } from './lib/session-cookie';

/**
 * Гейт неавторизованных на `/` и обратный редирект с `/auth/login` для тех, у кого сессия
 * уже есть (задача `T2.7`).
 *
 * Файл называется `proxy.ts`, а не `middleware.ts`: в Next 16 конвенция `middleware.ts`
 * помечена deprecated и переименована, экспорт — `proxy` (§0, риск 2). `runtime` в config
 * задавать запрещено — proxy и так работает на Node.js-рантайме.
 *
 * **Это «оптимистичная» проверка, а не безопасность.** Здесь видно только наличие cookie:
 * просрочен ли токен и существует ли пользователь, знает Nest. Настоящая проверка — в
 * `lib/dal.ts` (`getCurrentUser`) и внутри каждого Server Action.
 */
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE_NAME);
  const { pathname } = request.nextUrl;

  if (!hasSession && pathname === '/') {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // Только GET: POST на `/auth/login` — это Server Action `loginAction`, и редирект вместо
  // его выполнения означал бы, что логин перестал работать (риск 3).
  if (hasSession && request.method === 'GET' && pathname.startsWith('/auth/login')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

/**
 * Матчер узкий и явный. Без него proxy срабатывает на `_next/static`, `_next/image` и
 * содержимое `public/`, то есть ломает загрузку CSS и картинок.
 */
export const config = { matcher: ['/', '/auth/login'] };
