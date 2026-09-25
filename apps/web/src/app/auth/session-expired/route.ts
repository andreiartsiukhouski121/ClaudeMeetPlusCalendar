import { redirect } from 'next/navigation';

import { destroySession } from '@/lib/session';

/**
 * Invariant 17: clears a broken session — deletes the cookie, then sends the user to the login
 * form.
 *
 * Why a Route Handler rather than `redirect('/auth/login')` straight from the page. A cookie
 * holding an invalid token (expired, forged, signed with an old secret) wedges the app: `proxy.ts`
 * only sees that a cookie **exists**, so it lets the request through to `/`; the page gets a 401
 * from Nest and redirects to `/auth/login`; proxy sees the cookie again and sends the user back to
 * `/`. That is `ERR_TOO_MANY_REDIRECTS`, and the user cannot even reach the form to sign in again.
 * Found by `SEC-FN-05`.
 *
 * The loop cannot be broken by deleting the cookie while rendering: `cookies().delete()` throws
 * outside a Server Action or Route Handler. A Route Handler is the only place that can read the
 * session, erase it and redirect in one go.
 *
 * The path is deliberately **outside** the `proxy.ts` matcher, or the loop would return.
 */
export async function GET(): Promise<never> {
  await destroySession();

  redirect('/auth/login');
}
