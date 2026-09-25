import 'server-only';
import { cookies } from 'next/headers';

import { buildSessionCookieOptions, SESSION_COOKIE_NAME } from './session-cookie';

/**
 * Session cookie handling. The cookie holds the **raw JWT** from Nest with no extra wrapper: it is
 * HS256-signed, unreadable from JS (`httpOnly`) and carries nothing but `sub` and `email`. There
 * are no `parseSession`/`serializeSession` functions — Nest itself confirms the token on
 * `GET /auth/me`.
 *
 * Invariant 14: marked `server-only` and touching `next/headers`, so it has no units; everything
 * testable lives in `session-cookie.ts`.
 *
 * `cookies()` is async in Next 16, and `.set`/`.delete` only work inside a Server Action or a
 * Route Handler — a user cannot be signed out while a page renders.
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
