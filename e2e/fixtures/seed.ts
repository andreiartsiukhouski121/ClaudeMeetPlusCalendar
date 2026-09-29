/**
 * Mirror of the `apps/api` seed — the single source of truth for tests. Hard-coding a login,
 * password or meeting title inside a spec is a review blocker: when the seed changes, such a spec
 * goes red in an unrelated place instead of in one.
 *
 * This file deliberately imports nothing from `apps/api`: the suite treats the server as a black
 * box over HTTP, and an import would make the assertion a tautology. Drift against
 * `users.seed.ts`/`meetings.seed.ts` is caught by `e2e/smoke/seed.api.spec.ts`.
 */

export type SeedUserKey = 'teacher' | 'student' | 'planner' | 'organizer';

export interface SeedUser {
  email: string;
  password: string;
  name: string;
  /** How many meetings the user has in a fresh seed. */
  meetingsCount: number;
}

/** One password for everyone: different ones add no testable branch, only noise in the cases. */
const SEED_PASSWORD = 'Passw0rd!';

/**
 * Four users rather than two, because of `fullyParallel: true` and the mutating `POST /meetings`:
 * the store is shared, so every mutating spec file needs its own owner or the `api` and `web`
 * projects race each other's counters.
 *
 * `teacher` and `student` must NEVER be mutated: exact numbers are only checked against them.
 */
export const SEED_USERS: Record<SeedUserKey, SeedUser> = {
  teacher: {
    email: 'teacher@purpleschool.test',
    password: SEED_PASSWORD,
    name: 'Anna Teacher',
    meetingsCount: 5,
  },
  student: {
    email: 'student@purpleschool.test',
    password: SEED_PASSWORD,
    name: 'Ivan Student',
    meetingsCount: 0,
  },
  // Mutation sandbox for *.api.spec.ts only.
  planner: {
    email: 'planner@purpleschool.test',
    password: SEED_PASSWORD,
    name: 'Maria Planner',
    meetingsCount: 1,
  },
  // Mutation sandbox for *.functional.spec.ts only.
  organizer: {
    email: 'organizer@purpleschool.test',
    password: SEED_PASSWORD,
    name: 'Peter Organizer',
    meetingsCount: 1,
  },
};

export const SEED_USER_KEYS = Object.keys(SEED_USERS) as SeedUserKey[];

/**
 * Expected data for `teacher` — the baseline for HD-API-03…05, HD-FN-03 and HD-FN-05. Seed dates
 * are fixed and absolute, so ordering and slicing are checked against concrete strings rather than
 * counts.
 */
export const TEACHER_MEETINGS = {
  /** The owner's full meeting count — what `total` must return, not the length of `items`. */
  total: 5,
  /** The service's default `limit`: how many meetings the dashboard shows. */
  latestLimit: 3,
  /** Titles of the three most recent meetings, ordered by `startsAt` DESC. */
  latestTitles: [
    'Module wrap-up session', // 2026-01-22T16:15:00.000Z
    'Pre-exam consultation', // 2026-01-19T08:00:00.000Z
    'Geometry workshop', // 2026-01-15T14:00:00.000Z
  ],
  /** Titles the top-three slice must cut. Asserting their absence is half the point of HD-API-04. */
  omittedTitles: [
    'Homework review', // 2026-01-13T11:30:00.000Z
    'Intro to algebra', // 2026-01-12T09:00:00.000Z
  ],
  /**
   * `participants`, keyed by title, for all five of `teacher`'s seeded meetings
   * (`apps/api/src/meetings/meetings.seed.ts`, `mtg-teacher-1`…`5`). `SM-API-03` compares each
   * array against the API's response verbatim — order included — because `teacher` is read-only
   * and an exact array can be asserted without creating anything.
   */
  participants: {
    'Intro to algebra': ['Nina Cole', 'guest.parent@purpleschool.test'],
    'Homework review': ['Nina Cole'],
    'Geometry workshop': ['Nina Cole', 'Omar Vance', 'guest.tutor@purpleschool.test'],
    'Pre-exam consultation': [],
    'Module wrap-up session': ['Nina Cole', 'Omar Vance'],
  },
} as const;

/**
 * `participants` for `mtg-planner-1` and `mtg-organizer-1` — the two mutation sandboxes. Mirrored
 * here for completeness with `apps/api/src/meetings/meetings.seed.ts`, but **not** read by
 * `SM-API-03`: `planner` and `organizer` are mutated by `*.api.spec.ts` / `*.functional.spec.ts`
 * respectively, and comparing their meetings would race with the cases that create new ones there
 * (plan `meetings-detail-participants` §6).
 */
export const PLANNER_MEETING_PARTICIPANTS = ['Ruth Delgado', 'guest.coach@purpleschool.test'];
export const ORGANIZER_MEETING_PARTICIPANTS = ['Ruth Delgado', 'Omar Vance'];

/**
 * Every meeting created by a test is dated 2030. DESC sorting plus the top-three slice mean the
 * assertion "the new meeting is first" only holds when the date is later than any seeded meeting
 * of that owner (`organizer` — 2026-01-14, `planner` — 2026-01-16). Using today's date or
 * `Date.now()` instead of these constants is a blocker.
 */
export const FUTURE_STARTS_AT_ISO = '2030-01-01T10:00:00.000Z';

/** The same value in `<input type="datetime-local">` format. */
export const FUTURE_STARTS_AT_LOCAL = '2030-01-01T10:00';
