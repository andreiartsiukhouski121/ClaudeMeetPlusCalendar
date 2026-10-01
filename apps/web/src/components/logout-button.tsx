import { Button } from '@heroui/react';

import { logoutAction } from '@/lib/actions/auth';

/**
 * Sign-out button. A **server** component: a form with a Server Action works without client JS and
 * the button holds no state.
 *
 * A `<form action={logoutAction}>` rather than a link: signing out changes state, and the cookie
 * can only be deleted inside a Server Action or a Route Handler. The button name is exactly
 * "Sign out" (`HD-FN-08`, `HD-FN-14`).
 *
 * `Button` carries `type="submit"` and submits the native form — proven by the suite rather than
 * assumed, because HeroUI's own docs only ever show `onPress` (`ADR-0023`). An `onPress` handler
 * here would need `'use client'` and would break the no-JS path.
 */
export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <Button type="submit" variant="outline" size="sm">
        Sign out
      </Button>
    </form>
  );
}
