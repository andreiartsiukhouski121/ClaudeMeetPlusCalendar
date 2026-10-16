import type { Meeting } from './domain/meeting.js';

/**
 * What goes out to the client. `toMeetingDto` strips `ownerId`: ownership is never exposed, which
 * `HD-API-01` checks against the element's key set.
 */
export type MeetingDto = Omit<Meeting, 'ownerId'>;

/** `GET /meetings` response: a slice of the list plus the owner's FULL meeting count. */
export interface MeetingsPageDto {
  /** Invariant 4: the owner's whole list, not `items.length` (`HD-UT-03`, `HD-API-05`, `HD-FN-03`). */
  items: MeetingDto[];
  total: number;
}

/**
 * The only way a meeting leaves the server. Fields are listed explicitly rather than removed by
 * rest destructuring, so a new internal field on `Meeting` cannot leak on its own; `HD-API-01`
 * checks the resulting key set.
 *
 * No `meetings.mapper.spec.ts` on purpose: the function is one line, its result is checked at the
 * contract level, and a spec missing from `*.unit.cases.md` would fail the meta-test.
 */
export function toMeetingDto(meeting: Meeting): MeetingDto {
  return {
    id: meeting.id,
    title: meeting.title,
    startsAt: meeting.startsAt,
    durationMinutes: meeting.durationMinutes,
    participants: meeting.participants,
  };
}
