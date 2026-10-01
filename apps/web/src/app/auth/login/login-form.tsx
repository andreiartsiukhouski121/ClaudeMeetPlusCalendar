'use client';

import { Button, Input, Label, TextField } from '@heroui/react';
import Link from 'next/link';
import { useActionState } from 'react';

import { loginAction } from '@/lib/actions/auth';
import type { LoginFormState } from '@/lib/types';

const INITIAL_STATE: LoginFormState = {};

/**
 * Login form. A client component only because of `useActionState`: submission goes through a
 * Server Action, so the JWT never reaches the browser.
 *
 * The markup is dictated by test locators and must not be changed blindly: real label/input
 * wiring, an error container with `role="alert"`, a button named exactly "Sign in" and a link
 * named "Sign up".
 *
 * **The form element stays native** (`ADR-0023`). HeroUI's `Form` is a React Aria component and
 * owns submission; `action={formAction}` is a Next.js Server Action binding, and the two do not
 * compose. HeroUI is used for the controls inside, which is where its styling and its accessible
 * wiring actually are.
 *
 * Invariant 15, and HeroUI's own examples violate it: the docs put `isRequired` and
 * `type="email"` on `TextField` with a client-side `validate`. All three turn on native or React
 * Aria validation, the browser refuses to submit, the server branches never run, and AL-FN-05 /
 * AL-FN-14 end up testing the library instead of our code. The email field is `type="text"`, the
 * form carries `noValidate`, and nothing is marked required.
 */
export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, INITIAL_STATE);

  return (
    <form action={formAction} className="flex w-full flex-col gap-4" noValidate>
      <TextField name="email" type="text" defaultValue={state.email ?? ''} autoComplete="email">
        <Label>Email</Label>
        <Input />
      </TextField>

      <TextField name="password" type="password" autoComplete="current-password">
        <Label>Password</Label>
        <Input />
      </TextField>

      {state.error !== undefined && (
        <p className="text-danger text-sm" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" isPending={pending} fullWidth>
        Sign in
      </Button>

      <p className="text-foreground-500 text-center text-sm">
        No account? <Link href="/auth/register">Sign up</Link>
      </p>
    </form>
  );
}
