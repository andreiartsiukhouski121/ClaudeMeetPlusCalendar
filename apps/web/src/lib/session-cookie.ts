/**
 * Session cookie name and options. A pure module: invariant 14 keeps `import 'server-only'` and
 * `next/headers` out, or units `AL-UT-20…22` would fail on an import Vitest cannot resolve. The
 * cookie store itself is handled in `session.ts`.
 *
 * The constant lives here rather than in `actions/auth.ts` because a `'use server'` file may only
 * export async functions (invariant 13).
 */

export const SESSION_COOKIE_NAME = 'ps_session';

/**
 * Cookie lifetime. Must match `JWT_EXPIRES_IN = '1h'`: if the two drift apart you get "session
 * alive, token expired" — the user counts as logged in while every Nest request answers 401.
 * Pinned by `AL-UT-22`.
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
 * Invariant 12: `secure` follows the environment rather than being unconditionally `true` — and
 * not for the usual reason. Chromium accepts `Secure` cookies on `http://127.0.0.1` because
 * loopback counts as a trustworthy origin, so e2e would survive a hard `true`. The real reason is
 * any environment where loopback is not trustworthy (another browser, a proxy, a container with an
 * external host): there `secure: true` over http breaks the check.
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
