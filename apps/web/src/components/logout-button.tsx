import { logoutAction } from '@/lib/actions/auth';

import styles from './logout-button.module.css';

/**
 * Sign-out button. A **server** component: a form with a Server Action works without client JS and
 * the button holds no state.
 *
 * A `<form action={logoutAction}>` rather than a link: signing out changes state, and the cookie
 * can only be deleted inside a Server Action or a Route Handler. The button name is exactly
 * "Sign out" (`HD-FN-08`, `HD-FN-14`).
 */
export function LogoutButton() {
  return (
    <form action={logoutAction} className={styles.form}>
      <button className={styles.button} type="submit">
        Sign out
      </button>
    </form>
  );
}
