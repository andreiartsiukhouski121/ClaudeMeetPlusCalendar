import { formatMeetingDateTime } from '@/lib/format-date';
import type { Meeting } from '@/lib/types';

import styles from './meeting-list.module.css';

/**
 * Recent meetings. A **server** component: no state, no handlers, so no `'use client'`.
 *
 * The markup is dictated by test locators and must not be changed blindly:
 *  - `ul`/`li` rather than a pile of `div`s — `getByRole('list')` plus `getByRole('listitem')` in
 *    `HD-FN-04`, `HD-FN-05`, `HD-FN-14`;
 *  - `aria-label="Recent meetings"` gives the list an accessible name;
 *  - the empty state is explicit text (`HD-FN-09`), not an empty `ul`: an empty list is
 *    indistinguishable from "the data failed to load".
 */
export function MeetingList({ meetings }: { meetings: Meeting[] }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Recent meetings</h2>

      {meetings.length === 0 ? (
        <p className={styles.empty}>No meetings yet</p>
      ) : (
        <ul className={styles.list} aria-label="Recent meetings">
          {meetings.map((meeting) => (
            <li className={styles.item} key={meeting.id}>
              <span className={styles.title}>{meeting.title}</span>
              <span className={styles.meta}>
                {formatMeetingDateTime(meeting.startsAt)} · {meeting.durationMinutes} min
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
