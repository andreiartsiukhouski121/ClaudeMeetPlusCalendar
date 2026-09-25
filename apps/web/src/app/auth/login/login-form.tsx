'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import { loginAction } from '@/lib/actions/auth';
import type { LoginFormState } from '@/lib/types';

import styles from './login-form.module.css';

const INITIAL_STATE: LoginFormState = {};

/**
 * Login form. A client component only because of `useActionState`: submission goes through a
 * Server Action, so the JWT never reaches the browser.
 *
 * The markup is dictated by test locators and must not be changed blindly: real `<label htmlFor>`
 * elements, an error container with `role="alert"`, a button named exactly "Sign in" and a link
 * named "Sign up".
 *
 * Invariant 15: no `required` and no `type="email"`. Either one turns on native validation, the
 * browser refuses to submit, the server branches never run, and AL-FN-05 / AL-FN-14 end up testing
 * the browser instead of our code. The email field is `type="text"` and the form carries
 * `noValidate`.
 */
export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, INITIAL_STATE);

  return (
    <form action={formAction} className={styles.form} noValidate>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="email">
          Email
        </label>
        <input
          className={styles.input}
          id="email"
          name="email"
          type="text"
          autoComplete="email"
          defaultValue={state.email ?? ''}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="password">
          Password
        </label>
        <input
          className={styles.input}
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
        />
      </div>

      {state.error !== undefined && (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      )}

      <button className={styles.submit} type="submit" disabled={pending}>
        Sign in
      </button>

      <p className={styles.hint}>
        No account? <Link href="/auth/register">Sign up</Link>
      </p>
    </form>
  );
}
