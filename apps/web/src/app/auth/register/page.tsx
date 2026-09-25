import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Sign up — PurpleSchool',
};

/**
 * Sign-up placeholder — a deliberate omission. The spec only asks for a link to sign-up, but a
 * link into a 404 cannot be checked functionally (`AL-FN-06` expects 200 and an `h1`), so the page
 * exists and carries exactly a heading, an explanation and a way back. There is no sign-up form,
 * no `POST /auth/register` and no user creation in this project.
 */
export default function RegisterPage() {
  return (
    <>
      <h1>Sign up</h1>
      <p>Sign-up is coming later</p>
      <p>
        <Link href="/auth/login">Back to sign in</Link>
      </p>
    </>
  );
}
