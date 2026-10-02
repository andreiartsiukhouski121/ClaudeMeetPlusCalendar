import { Card, Chip } from '@heroui/react';

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
 * Plain `ul`/`li` with `Card` **inside** each item rather than HeroUI's `ListBox` (`ADR-0023`):
 * `ListBox` is React Aria's selection widget and renders `role="listbox"`/`role="option"`, which is
 * a different accessibility contract from the one these cases assert. `Card.Root` expects a `div`,
 * so the `li` stays and the card sits in it — one extra element, and the roles are untouched.
 *
 * The duration is a `Chip` rather than text after a separator: it is the one scannable value in the
 * row, and a run of "22 Jan 2026, 16:15 · 60 min" buries it in the timestamp.
 *
 * `flex-row` is explicit on `Card.Content`: HeroUI's own `card__content` class sets
 * `flex-direction: column`, so `justify-between` alone distributed along the wrong axis and the chip
 * dropped onto its own line.
 */
export function MeetingList({ meetings }: { meetings: Meeting[] }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-base font-semibold tracking-tight">Recent meetings</h2>

      {meetings.length === 0 ? (
        <p className="border-default-200 text-foreground-500 rounded-xl border border-dashed px-4 py-8 text-center text-sm">
          No meetings yet
        </p>
      ) : (
        <ul className="flex flex-col gap-3" aria-label="Recent meetings">
          {meetings.map((meeting) => (
            <li key={meeting.id}>
              <Card.Root className="px-4 py-3">
                <Card.Content className="flex flex-row items-center justify-between gap-4 p-0">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="truncate font-medium">{meeting.title}</span>
                    <span className="text-foreground-500 text-sm">
                      {formatMeetingDateTime(meeting.startsAt)}
                    </span>
                  </div>

                  <Chip.Root size="sm" variant="secondary" className="shrink-0">
                    <Chip.Label>{meeting.durationMinutes} min</Chip.Label>
                  </Chip.Root>
                </Card.Content>
              </Card.Root>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
