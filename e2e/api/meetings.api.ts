import { expect, type APIRequestContext } from '@playwright/test';
import { TEACHER_MEETINGS } from '../fixtures/seed.js';
import { authHeaders } from './auth.api.js';
import type { Tracker } from './cleanup.api.js';

/**
 * The `meetings` module of the suite's API layer (`FACT-3758`): the calls to `/meetings` that more
 * than one spec makes, and the not-found body they all compare against.
 */

export interface ErrorBody {
  message: string | string[];
  error: string;
  statusCode: number;
}

/** `FACT-2016` — the meeting-level 404. */
export const MEETING_NOT_FOUND_BODY: ErrorBody = {
  message: 'Meeting not found',
  error: 'Not Found',
  statusCode: 404,
};

export interface MeetingItem {
  id: string;
  title: string;
  startsAt: string;
}

export interface MeetingsPageBody {
  items: MeetingItem[];
  total: number;
}

export interface NewMeeting {
  title: string;
  startsAt: string;
  [field: string]: unknown;
}

/**
 * `POST /meetings` as `token`'s owner, registered with `tracker` before it returns, so a create is
 * never a row the test forgot to delete (`FACT-3780`). The 201 is asserted here: a failed create is
 * a precondition problem, not the case under test.
 */
export async function createMeeting(
  request: APIRequestContext,
  token: string,
  data: NewMeeting,
  tracker: Tracker,
): Promise<MeetingItem> {
  const response = await request.post('/meetings', { headers: authHeaders(token), data });
  expect(
    response.status(),
    `creating meeting "${data.title}" must answer 201; got ${await response.text()}`,
  ).toBe(201);

  const meeting = (await response.json()) as MeetingItem;
  tracker.track(`/meetings/${meeting.id}`, token);
  return meeting;
}

/** The ids of a seeded-shape copy, keyed by the seed's meeting titles. */
export type SeededShapeMeetings = Record<keyof typeof TEACHER_MEETINGS.schedule, string>;

/**
 * `teacher`'s five meetings on `token`'s owner (`FACT-3799`): the seed's titles, dates, durations and
 * participants, so a page renders the list, counter and detail it renders for `teacher`. Every row
 * is registered with `tracker` by `createMeeting`. The one seeded-shape builder: the dashboard
 * cases use it as it is, `createSeededShapeCopy` (`meeting-files.api.ts`) adds the two uploads.
 */
export async function createSeededShapeMeetings(
  request: APIRequestContext,
  token: string,
  tracker: Tracker,
): Promise<SeededShapeMeetings> {
  const titles = Object.keys(
    TEACHER_MEETINGS.schedule,
  ) as (keyof typeof TEACHER_MEETINGS.schedule)[];
  const ids: Partial<SeededShapeMeetings> = {};

  for (const title of titles) {
    const { startsAt, durationMinutes } = TEACHER_MEETINGS.schedule[title];
    const meeting = await createMeeting(
      request,
      token,
      { title, startsAt, durationMinutes, participants: [...TEACHER_MEETINGS.participants[title]] },
      tracker,
    );
    ids[title] = meeting.id;
  }

  return ids as SeededShapeMeetings;
}

/** `GET /meetings{query}` as `token`'s owner; the 200 is asserted. */
export async function fetchMeetingsPage(
  request: APIRequestContext,
  token: string,
  query = '',
): Promise<MeetingsPageBody> {
  const response = await request.get(`/meetings${query}`, { headers: authHeaders(token) });
  expect(response.status(), `GET /meetings${query} must answer 200`).toBe(200);
  return (await response.json()) as MeetingsPageBody;
}
