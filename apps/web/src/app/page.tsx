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
 *
 * Layout: the counter sits **under the heading** as part of one lockup rather than floating between
 * the header and the columns, where it belonged to neither. The grid is `2fr 1fr`, not two equal
 * halves: the list is the page's subject and the form is three controls, and equal columns stretched
 * the inputs well past the length of what goes in them (`ui-ux-pro-max`, Typography / Line Length).
 */
export default async function HomePage() {
  const user = await getCurrentUser();
  const { items, total } = await getMeetings();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="truncate text-2xl font-semibold tracking-tight">Hello, {user.email}</h1>
          <p className="text-foreground-500 text-sm">{`Meetings total: ${String(total)}`}</p>
        </div>

        <LogoutButton />
      </header>

      <div className="grid items-start gap-8 lg:grid-cols-[2fr_1fr]">
        <MeetingList meetings={items} />
        <CreateMeetingForm />
      </div>
    </main>
  );
}
