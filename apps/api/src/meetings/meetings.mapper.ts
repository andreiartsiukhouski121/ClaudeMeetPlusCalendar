import type { Meeting, MeetingDto } from './meeting.types.js';

/**
 * The only way a meeting leaves the server. Fields are listed explicitly rather than removed by
 * rest destructuring, so a new internal field on `Meeting` cannot leak on its own; `HD-API-01`
 * checks the resulting key set.
 *
 * No `meetings.mapper.spec.ts` on purpose: the function is one line, its result is checked at the
 * contract level, and a spec missing from `*.unit.cases.md` would fail the meta-test (rule 8).
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
