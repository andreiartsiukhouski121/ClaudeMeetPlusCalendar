import type { Metadata } from 'next';

import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: 'Sign in — PurpleSchool',
};

/**
 * Login page. A server component: the heading renders on the server and the interactive part
 * (`useActionState`) lives in the client `LoginForm`.
 *
 * The `h1` carries its own type scale. Unstyled it rendered at body size and weight, which left
 * the page title visually weaker than the field labels under it — a hierarchy inversion, and the
 * first thing wrong with the page.
 */
export default function LoginPage() {
  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-foreground-500 text-sm">Meetings and lessons in one place</p>
      </div>

      <LoginForm />
    </>
  );
}
