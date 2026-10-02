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
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Sign up</h1>
        <p className="text-foreground-500 text-sm">Sign-up is coming later</p>
      </div>

      <Link
        href="/auth/login"
        className="text-accent text-sm font-medium underline-offset-4 hover:underline"
      >
        Back to sign in
      </Link>
    </>
  );
}
