import 'server-only';
import { redirect } from 'next/navigation';
import { cache } from 'react';

import { ApiError, apiFetch } from './api-client';
import { readSessionToken } from './session';
import type { MeetingsPage, PublicUser } from './types';

/**
 * Data access layer for server components: the only place a page gets data from.
 *
 * Invariant 14: marked `server-only` and reaching `next/headers` through `session.ts`, so it has
 * no units — Vitest cannot resolve that import. Everything testable lives in pure modules.
 *
 * Invariant 10: **this is the real authorization check.** `proxy.ts` only sees that a cookie
 * exists; Nest confirms the token on `GET /auth/me`, and the decision to let the user in or send
 * them to login is made here.
 */

/**
 * Where a broken session goes. Invariant 17: NOT `/auth/login` — the invalid cookie would stay,
 * `proxy.ts` would see it and bounce back to `/`, giving `ERR_TOO_MANY_REDIRECTS` (SEC-FN-05). The
 * Route Handler erases the cookie first.
 */
const SESSION_RESET_PATH = '/auth/session-expired';

/** How many meetings the dashboard shows. Matches the `MeetingsService` default. */
export const DEFAULT_MEETINGS_LIMIT = 3;

/**
 * The current user's profile, or a redirect to login.
 *
 * React's `cache()` scopes to a single server render: any component may call this as often as it
 * likes and only one request reaches Nest.
 *
 * On 401 it redirects rather than deleting the cookie: `.set`/`.delete` throw while rendering a
 * page, so "signing the user out" is physically impossible here. `redirect()` is called OUTSIDE
 * `try/catch` (invariant 11) — inside, the `catch` would swallow it.
 */
export const getCurrentUser = cache(async (): Promise<PublicUser> => {
  const token = await readSessionToken();
  let user: PublicUser | undefined;

  if (token !== undefined) {
    try {
      user = await apiFetch<PublicUser>('/auth/me', { token });
    } catch (error) {
      // 401 means the token expired, was forged, or the user is gone: send them to login.
      // Anything else (Nest down, 500) is not disguised as "no session" — let it reach the error
      // boundary, or debugging turns into an endless redirect.
      if (!(error instanceof ApiError) || error.status !== 401) {
        throw error;
      }
    }
  }

  if (user === undefined) {
    redirect(SESSION_RESET_PATH);
  }

  return user;
});

/**
 * Recent meetings plus their full count. Invariant 4: `total` comes from Nest and is never
 * recomputed from `items.length` — the list is cut by the limit (`HD-FN-03`).
 *
 * The session check is repeated here too: the page calls `getCurrentUser()` first, but call order
 * is not a guarantee and both functions need the 401 redirect.
 */
export async function getMeetings(limit: number = DEFAULT_MEETINGS_LIMIT): Promise<MeetingsPage> {
  const token = await readSessionToken();
  let page: MeetingsPage | undefined;

  if (token !== undefined) {
    try {
      page = await apiFetch<MeetingsPage>(`/meetings?limit=${String(limit)}`, { token });
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) {
        throw error;
      }
    }
  }

  if (page === undefined) {
    redirect(SESSION_RESET_PATH);
  }

  return page;
}
