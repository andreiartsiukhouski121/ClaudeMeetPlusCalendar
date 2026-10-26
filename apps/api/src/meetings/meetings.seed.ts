import type { StoredMeeting } from './domain/meeting.js';

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
 *  - `usr-planner` — 2 meetings: `mtg-planner-1`, the mutation sandbox for `*.api.spec.ts`, and
 *    `mtg-planner-2`, a dedicated, never-mutated fixture for `SEC-API-11` (see
 *    `meeting-files.seed.ts`) — nothing is ever uploaded into it, and no case asserts `planner`'s
 *    totals, so its presence does not disturb the sandbox;
 *  - `usr-pool-01` … `usr-pool-10` — no meetings: each is claimed by one test at a time (`FACT-3773`).
 */
export const SEED_MEETINGS: readonly StoredMeeting[] = [
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
    id: 'mtg-planner-2',
    ownerId: 'usr-planner',
    title: 'Archive intake session',
    startsAt: '2026-01-20T10:00:00.000Z',
    durationMinutes: 30,
    participants: [],
  },
];
