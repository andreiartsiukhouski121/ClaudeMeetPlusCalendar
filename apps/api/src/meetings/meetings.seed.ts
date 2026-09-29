import type { Meeting } from './meeting.types.js';

/**
 * Meeting seed. `e2e/fixtures/seed.ts` mirrors these values (`TEACHER_MEETINGS`); any drift is
 * caught by SM-API-03.
 *
 * Dates are fixed and absolute — **never `Date.now()`** — or assertions about ordering and the
 * top-three slice would drift with the calendar.
 *
 * The split by owner is deliberate:
 *  - `usr-teacher` — 5 meetings, read-only baseline for exact counts ("last 3", `total` = 5);
 *  - `usr-student` — 0 meetings, the empty-state edge case;
 *  - `usr-planner` — 1 meeting, mutation sandbox for `*.api.spec.ts`;
 *  - `usr-organizer` — 1 meeting, mutation sandbox for `*.functional.spec.ts`.
 */
export const SEED_MEETINGS: readonly Meeting[] = [
  {
    id: 'mtg-teacher-1',
    ownerId: 'usr-teacher',
    title: 'Intro to algebra',
    startsAt: '2026-01-12T09:00:00.000Z',
    durationMinutes: 60,
    participants: ['Nina Cole', 'guest.parent@purpleschool.test'],
  },
  {
    id: 'mtg-teacher-2',
    ownerId: 'usr-teacher',
    title: 'Homework review',
    startsAt: '2026-01-13T11:30:00.000Z',
    durationMinutes: 45,
    participants: ['Nina Cole'],
  },
  {
    id: 'mtg-teacher-3',
    ownerId: 'usr-teacher',
    title: 'Geometry workshop',
    startsAt: '2026-01-15T14:00:00.000Z',
    durationMinutes: 90,
    participants: ['Nina Cole', 'Omar Vance', 'guest.tutor@purpleschool.test'],
  },
  {
    id: 'mtg-teacher-4',
    ownerId: 'usr-teacher',
    title: 'Pre-exam consultation',
    startsAt: '2026-01-19T08:00:00.000Z',
    durationMinutes: 30,
    participants: [],
  },
  {
    id: 'mtg-teacher-5',
    ownerId: 'usr-teacher',
    title: 'Module wrap-up session',
    startsAt: '2026-01-22T16:15:00.000Z',
    durationMinutes: 60,
    participants: ['Nina Cole', 'Omar Vance'],
  },
  {
    id: 'mtg-planner-1',
    ownerId: 'usr-planner',
    title: 'Sprint retro',
    startsAt: '2026-01-16T13:00:00.000Z',
    durationMinutes: 45,
    participants: ['Ruth Delgado', 'guest.coach@purpleschool.test'],
  },
  {
    id: 'mtg-organizer-1',
    ownerId: 'usr-organizer',
    title: 'Team standup',
    startsAt: '2026-01-14T10:00:00.000Z',
    durationMinutes: 30,
    participants: ['Ruth Delgado', 'Omar Vance'],
  },
];
