import { type NextRequest, NextResponse } from 'next/server';

import { SESSION_COOKIE_NAME } from './lib/session-cookie';

/**
 * Gate for unauthenticated visitors on `/`, plus a bounce off `/auth/login` for anyone who already
 * has a session.
 *
 * Invariant 9: the file is `proxy.ts`, not `middleware.ts` — Next 16 deprecated and renamed that
 * convention, and the export is `proxy`. Setting `runtime` in the config is forbidden; proxy
 * already runs on the Node.js runtime.
 *
 * Invariant 10: **this is an optimistic check, not security.** All it sees is that a cookie
 * exists; whether the token expired or the user still exists is Nest's business. The real check
 * lives in `lib/dal.ts` and inside every Server Action.
 */
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE_NAME);
  const { pathname } = request.nextUrl;

  if (!hasSession && pathname === '/') {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // GET only: a POST to `/auth/login` is the `loginAction` Server Action, and redirecting instead
  // of running it would mean login stopped working.
  if (hasSession && request.method === 'GET' && pathname.startsWith('/auth/login')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

/**
 * The matcher is narrow and explicit. Without it the proxy fires on `_next/static`, `_next/image`
 * and the contents of `public/`, breaking CSS and image loading.
 */
export const config = { matcher: ['/', '/auth/login'] };
