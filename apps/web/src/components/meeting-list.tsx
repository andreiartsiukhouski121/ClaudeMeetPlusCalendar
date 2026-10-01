import { formatMeetingDateTime } from '@/lib/format-date';
import type { Meeting } from '@/lib/types';

/**
 * Recent meetings. A **server** component: no state, no handlers, so no `'use client'`.
 *
 * The markup is dictated by test locators and must not be changed blindly:
 *  - `ul`/`li` rather than a pile of `div`s — `getByRole('list')` plus `getByRole('listitem')` in
 *    `HD-FN-04`, `HD-FN-05`, `HD-FN-14`;
 *  - `aria-label="Recent meetings"` gives the list an accessible name;
 *  - the empty state is explicit text (`HD-FN-09`), not an empty `ul`: an empty list is
 *    indistinguishable from "the data failed to load".
 *
 * Plain `ul`/`li` with Tailwind utilities rather than HeroUI's `ListBox` (`ADR-0023`): `ListBox`
 * is React Aria's selection widget and renders `role="listbox"`/`role="option"`, which is a
 * different accessibility contract from the one these cases assert. Styling is not a reason to
 * change what a screen reader is told the thing is.
 */
export function MeetingList({ meetings }: { meetings: Meeting[] }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Recent meetings</h2>

      {meetings.length === 0 ? (
        <p className="text-foreground-500">No meetings yet</p>
      ) : (
        <ul className="flex flex-col gap-2" aria-label="Recent meetings">
          {meetings.map((meeting) => (
            <li
              className="border-default-200 bg-surface flex flex-col gap-1 rounded-lg border p-3"
              key={meeting.id}
            >
              <span className="font-medium">{meeting.title}</span>
              <span className="text-foreground-500 text-sm">
                {formatMeetingDateTime(meeting.startsAt)} · {meeting.durationMinutes} min
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
