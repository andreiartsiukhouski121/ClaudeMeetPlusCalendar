import type { Metadata } from 'next';

import { CreateMeetingForm } from '@/components/create-meeting-form';
import { LogoutButton } from '@/components/logout-button';
import { MeetingList } from '@/components/meeting-list';
import { getCurrentUser, getMeetings } from '@/lib/dal';

import styles from './page.module.css';

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
 *    `getByText` in `HD-FN-03` will not match.
 */
export default async function HomePage() {
  const user = await getCurrentUser();
  const { items, total } = await getMeetings();

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.greeting}>Hello, {user.email}</h1>
        <LogoutButton />
      </header>

      <p className={styles.counter}>{`Meetings total: ${String(total)}`}</p>

      <div className={styles.content}>
        <MeetingList meetings={items} />
        <CreateMeetingForm />
      </div>
    </main>
  );
}
