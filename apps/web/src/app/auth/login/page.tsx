import type { Metadata } from 'next';

import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: 'Sign in — PurpleSchool',
};

/**
 * Login page. A server component: the heading renders on the server and the interactive part
 * (`useActionState`) lives in the client `LoginForm`.
 */
export default function LoginPage() {
  return (
    <>
      <h1>Sign in</h1>
      <LoginForm />
    </>
  );
}
