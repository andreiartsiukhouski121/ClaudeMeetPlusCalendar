'use server';

import { redirect } from 'next/navigation';

import { ApiError, apiFetch } from '../api-client';
import { hasEmptyCredential, readLoginCredentials } from '../login-credentials';
import { createSession, destroySession } from '../session';
import type { LoginFormState, PublicUser } from '../types';

/**
 * Authentication Server Actions.
 *
 * Invariant 13: this file exports ONLY async functions — `'use server'` forbids exporting
 * constants and types. Hence `LoginFormState` lives in `lib/types.ts` and `SESSION_COOKIE_NAME` in
 * `lib/session-cookie.ts`.
 */

interface LoginResponse {
  accessToken: string;
  user: PublicUser;
}

/**
 * Login from the form (`useActionState`). Returns a state carrying the error text, or redirects
 * to `/`.
 *
 * Invariant 11: `redirect('/')` sits STRICTLY outside `try/catch` — it works by throwing
 * `NEXT_REDIRECT`, and a `catch` inside the block would swallow it, leaving the cookie set and the
 * user staring at the form. The symptom is "login does nothing".
 *
 * Validation is server-side only: the form fields carry neither `required` nor `type="email"`
 * (invariant 15), otherwise the browser would never submit and the branches below would never run.
 */
export async function loginAction(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const { email, password } = readLoginCredentials(formData);

  if (hasEmptyCredential({ email, password })) {
    return { error: 'Enter your email and password', email };
  }

  try {
    const result = await apiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    await createSession(result.accessToken);
  } catch (error) {
    // 401 — one wording for both cases: the UI must not hint whether the account exists
    // (the same requirement as AL-API-03).
    if (error instanceof ApiError && error.status === 401) {
      return { error: 'Invalid email or password', email };
    }
    // 400 — ValidationPipe rejected the payload; for the login form that is always the email.
    if (error instanceof ApiError && error.status === 400) {
      return { error: 'Check the email format', email };
    }
    // Anything else (Nest down, 500) is not our branch: let it reach the error boundary instead of
    // turning into "wrong password".
    throw error;
  }

  redirect('/');
}

/** Sign out. `redirect` is outside any `try` for the same reason (invariant 11). */
export async function logoutAction(): Promise<void> {
  await destroySession();

  redirect('/auth/login');
}
