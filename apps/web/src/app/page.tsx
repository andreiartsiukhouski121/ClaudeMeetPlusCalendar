import type { Metadata } from 'next';

import { CreateMeetingForm } from '@/components/create-meeting-form';
import { LogoutButton } from '@/components/logout-button';
import { MeetingList } from '@/components/meeting-list';
import { getCurrentUser, getMeetings } from '@/lib/dal';

export const metadata: Metadata = {
  title: 'Home — PurpleSchool',
};

/**
 * The dashboard. An async server component with no props (no `PageProps<'/'>`, so the types do not
 * depend on how fresh `next typegen` is).
 *
 * Invariant 10: the page checks the session **itself** via `getCurrentUser()`, which redirects to
 * the login page on an invalid token. That repeats the check `proxy.ts` makes, because proxy only
 * sees that a cookie exists and is not a security guarantee.
 *
 * Markup dictated by the cases:
 *  - exactly ONE `h1`, carrying the user's email (`HD-FN-02`, `HD-FN-14`);
 *  - the counter as a **single text node** in exactly the `Meetings total: 5` format, or
 *    `getByText` in `HD-FN-03` will not match. The template literal stays for that reason —
 *    splitting it across elements for styling would break the locator.
 */
export default async function HomePage() {
  const user = await getCurrentUser();
  const { items, total } = await getMeetings();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Hello, {user.email}</h1>
        <LogoutButton />
      </header>

      <p className="text-foreground-500">{`Meetings total: ${String(total)}`}</p>

      <div className="grid gap-6 md:grid-cols-2">
        <MeetingList meetings={items} />
        <CreateMeetingForm />
      </div>
    </main>
  );
}
