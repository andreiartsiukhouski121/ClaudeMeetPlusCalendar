/**
 * Web-layer data types.
 *
 * They live here rather than in `'use server'` files: invariant 13 — such a file may export
 * **only** async functions, and exporting an interface or a constant breaks the build.
 */

/** The user profile as Nest returns it: `passwordHash` was stripped server-side. */
export interface PublicUser {
  id: string;
  email: string;
  name: string;
}

export interface Meeting {
  id: string;
  title: string;
  /** ISO 8601 UTC — exactly what Nest sent, with no local conversion. */
  startsAt: string;
  durationMinutes: number;
  participants: string[];
}

export interface MeetingsPage {
  items: Meeting[];
  /** The owner's full meeting count, not the length of `items`: the list is cut by the limit. */
  total: number;
}

/**
 * Login form state for `useActionState`. The `email` comes back with the error so the user does
 * not have to retype it after a failed attempt.
 */
export interface LoginFormState {
  error?: string;
  email?: string;
}

export interface CreateMeetingFormState {
  error?: string;
}

/** The login form pair after `FormData` parsing (see `login-credentials.ts`). */
export interface LoginCredentials {
  email: string;
  password: string;
}
