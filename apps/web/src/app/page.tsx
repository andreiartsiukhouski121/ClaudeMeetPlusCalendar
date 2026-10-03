import type { Metadata } from 'next';

import { CreateMeetingForm } from '@/components/create-meeting-form';
import { HeroBanner } from '@/components/hero-banner';
import { LogoutButton } from '@/components/logout-button';
import { MeetingList } from '@/components/meeting-list';
import { NavRail } from '@/components/nav-rail';
import { StatTile } from '@/components/stat-tile';
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
 * The three-track shell (`ADR-0026` §2.4): a 16rem navigation rail, a fluid main column and a
 * 20rem side rail, one column below `lg`. Both fluid tracks are `minmax(0,1fr)` rather than `1fr`:
 * a long unbroken title in a grid child otherwise widens the track past the viewport.
 *
 * Markup dictated by the cases:
 *  - exactly ONE `h1`, carrying the user's email (`HD-FN-02`, `HD-FN-14`);
 *  - the counter as a **single text node** in exactly the `Meetings total: 5` format, or
 *    `getByText` in `HD-FN-03` will not match. The template literal stays for that reason —
 *    splitting it across elements for styling would break the locator.
 *
 * The `h1` moves outside `<main>` as part of the `header` lockup; no case asserts containment.
 */
export default async function HomePage() {
  const user = await getCurrentUser();
  const { items, total } = await getMeetings();

  return (
    <div className="bg-background min-h-screen lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <NavRail />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="truncate text-2xl font-bold tracking-tight">Hello, {user.email}</h1>
            <p className="text-muted text-sm">{`Meetings total: ${String(total)}`}</p>
          </div>

          <LogoutButton />
        </header>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <main className="flex flex-col gap-8">
            <HeroBanner />
            <MeetingList meetings={items} />
            <CreateMeetingForm />
          </main>

          <aside aria-label="Overview" className="flex flex-col gap-6">
            <StatTile shown={items.length} total={total} />
          </aside>
        </div>
      </div>
    </div>
  );
}
