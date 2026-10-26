/**
 * Mirror of the `apps/api` seed — the single source of truth for tests. Hard-coding a login,
 * password or meeting title inside a spec is a review blocker: when the seed changes, such a spec
 * goes red in an unrelated place instead of in one.
 *
 * This file deliberately imports nothing from `apps/api`: the suite treats the server as a black
 * box over HTTP, and an import would make the assertion a tautology. Drift against
 * `users.seed.ts`/`meetings.seed.ts`/`meeting-files.seed.ts` is caught by `e2e/smoke/seed.api.spec.ts`.
 */

/** The ten pool users (`FACT-3773`): `pool-01` … `pool-10`, held one test at a time (`ADR-0037`). */
export type PoolUserKey =
  | 'pool-01'
  | 'pool-02'
  | 'pool-03'
  | 'pool-04'
  | 'pool-05'
  | 'pool-06'
  | 'pool-07'
  | 'pool-08'
  | 'pool-09'
  | 'pool-10';

export type SeedUserKey = 'teacher' | 'student' | 'planner' | PoolUserKey;

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
 * `teacher` and `student` must NEVER be mutated: exact numbers are only checked against them.
 * `api` mutations go to `planner`, except `HD-API-23`, which claims a pool user; `web` mutations
 * claim a pool user (`ADR-0037`, `FACT-1092`).
 */
const POOL_USER_KEYS: PoolUserKey[] = [
  'pool-01',
  'pool-02',
  'pool-03',
  'pool-04',
  'pool-05',
  'pool-06',
  'pool-07',
  'pool-08',
  'pool-09',
  'pool-10',
];

/** Every pool user: no meetings in a fresh seed, `Pool User NN`, one password like the rest. */
const POOL_USERS = Object.fromEntries(
  POOL_USER_KEYS.map((key) => [
    key,
    {
      email: `${key}@purpleschool.test`,
      password: SEED_PASSWORD,
      name: `Pool User ${key.slice('pool-'.length)}`,
      meetingsCount: 0,
    } satisfies SeedUser,
  ]),
) as Record<PoolUserKey, SeedUser>;

export const SEED_USERS: Record<SeedUserKey, SeedUser> = {
  ...POOL_USERS,
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
  // Mutation sandbox for *.api.spec.ts only. Two meetings: `mtg-planner-1`, the sandbox itself,
  // and `mtg-planner-2` (`HEADER_SAFETY_MEETING` below), a never-mutated `SEC-API-11` fixture.
  planner: {
    email: 'planner@purpleschool.test',
    password: SEED_PASSWORD,
    name: 'Maria Planner',
    meetingsCount: 2,
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
  /**
   * `startsAt` and `durationMinutes`, keyed by title, for the same five meetings: the values a
   * seeded-shape copy of a browser case is built from (`FACT-3799`). `SM-API-03` compares them
   * against the API, so a copy renders what the seed renders.
   */
  schedule: {
    'Intro to algebra': { startsAt: '2026-01-12T09:00:00.000Z', durationMinutes: 60 },
    'Homework review': { startsAt: '2026-01-13T11:30:00.000Z', durationMinutes: 45 },
    'Geometry workshop': { startsAt: '2026-01-15T14:00:00.000Z', durationMinutes: 90 },
    'Pre-exam consultation': { startsAt: '2026-01-19T08:00:00.000Z', durationMinutes: 30 },
    'Module wrap-up session': { startsAt: '2026-01-22T16:15:00.000Z', durationMinutes: 60 },
  },
} as const;

/**
 * `participants` for `mtg-planner-1`, the `api` mutation sandbox. Mirrored for completeness with
 * `apps/api/src/meetings/meetings.seed.ts`, but **not** read by `SM-API-03`: `planner` is mutated by
 * `*.api.spec.ts`, and comparing its meetings would race with the cases that create new ones there.
 */
export const PLANNER_MEETING_PARTICIPANTS = ['Ruth Delgado', 'guest.coach@purpleschool.test'];

/**
 * Mirror of `apps/api/src/meeting-files/meeting-files.seed.ts` — the two files seeded on
 * `teacher`'s "Geometry workshop" (`mtg-teacher-3`). `teacher` is read-only, so `MF-API-04`
 * and `MF-API-06` assert against these exact values rather than deriving them.
 */
export const GEOMETRY_WORKSHOP_TITLE = 'Geometry workshop';

/** The seeded id of "Geometry workshop" — what `AUDITED_PAGES` needs for a session-gated page that
 * exists only once a meeting id is known. Exported rather than written as a literal in a spec. */
export const GEOMETRY_WORKSHOP_MEETING_ID = 'mtg-teacher-3';

/** A seeded `teacher` meeting other than "Geometry workshop" — holds no files (`MF-API-05`). */
export const EMPTY_FILES_MEETING_TITLE = 'Pre-exam consultation';

export const TEACHER_MEETING_FILES = {
  meetingTitle: GEOMETRY_WORKSHOP_TITLE,
  /** `uploadedAt` descending, `id` ascending as the tiebreak (invariant 7): `notes.txt` lists first. */
  items: [
    {
      filename: 'notes.txt',
      contentType: 'text/plain',
      sizeBytes: 48,
      uploadedAt: '2026-01-15T15:31:00.000Z',
    },
    {
      filename: 'syllabus.pdf',
      contentType: 'application/pdf',
      sizeBytes: 1024,
      uploadedAt: '2026-01-15T15:30:00.000Z',
    },
  ],
  /** The first bytes of the seeded `syllabus.pdf`, asserted by `MF-API-06`. */
  pdfHeader: '%PDF-1.7\n',
  /** The fixed ASCII header each seeded file starts with, by filename (`FACT-1075`). */
  headers: {
    'notes.txt': 'Workshop notes: review before next session.\n',
    'syllabus.pdf': '%PDF-1.7\n',
  },
} as const;

/**
 * The byte rule of the seeded files (`FACT-1075`): the file's fixed ASCII header, padded with
 * `0x20` to its exact size. A download of a seeded file must equal this, byte for byte.
 */
export function seededFileBytes(header: string, sizeBytes: number): Buffer {
  const bytes = Buffer.alloc(sizeBytes, 0x20);
  bytes.write(header.slice(0, sizeBytes), 0, 'ascii');
  return bytes;
}

/**
 * Mirror of the five `fil-planner-2-*` rows `apps/api/src/meeting-files/meeting-files.seed.ts`
 * seeds onto `mtg-planner-2` — `planner`'s second, never-mutated meeting, titled below. Those rows
 * are written straight through Prisma and bypass the upload controller, so the filenames are
 * deliberately hostile and stored verbatim, with no sanitisation: a stray quote, a header-injection
 * attempt, a path traversal attempt and a non-ASCII name. `SEC-API-11` asserts that none of this can
 * break out of a response header; `SM-API-03` asserts this exact file list. **Mirror every name
 * byte-for-byte** — tidying one up here would leave `SEC-API-11` green against a fixture with
 * nothing hostile left in it, which is the exact drift this mirror exists to catch.
 */
export const HEADER_SAFETY_MEETING = {
  title: 'Archive intake session',
  filenames: [
    'report".txt',
    'evidence.log\r\nX-Injected: 1',
    'minutes.txt\nSet-Cookie: a=b',
    '../../etc/passwd',
    'déjà-vu.png',
  ],
} as const;

/**
 * Every meeting created by a test is dated 2030. DESC sorting plus the top-three slice mean the
 * assertion "the new meeting is first" only holds when the date is later than any seeded meeting
 * of that owner (`planner` — 2026-01-16). Using today's date or
 * `Date.now()` instead of these constants is a blocker.
 */
export const FUTURE_STARTS_AT_ISO = '2030-01-01T10:00:00.000Z';

/** The same value in `<input type="datetime-local">` format. */
export const FUTURE_STARTS_AT_LOCAL = '2030-01-01T10:00';

/**
 * Every seeded meeting with its owner and its file count in a fresh seed: what global teardown
 * compares the live API against (`FACT-3781`). `planner`'s `mtg-planner-2` holds the five hostile
 * `fil-planner-2-*` rows and `teacher`'s `mtg-teacher-3` the two documented files.
 */
export const SEEDED_MEETING_FILE_COUNTS: readonly {
  owner: SeedUserKey;
  meetingId: string;
  files: number;
}[] = [
  { owner: 'teacher', meetingId: 'mtg-teacher-1', files: 0 },
  { owner: 'teacher', meetingId: 'mtg-teacher-2', files: 0 },
  { owner: 'teacher', meetingId: GEOMETRY_WORKSHOP_MEETING_ID, files: 2 },
  { owner: 'teacher', meetingId: 'mtg-teacher-4', files: 0 },
  { owner: 'teacher', meetingId: 'mtg-teacher-5', files: 0 },
  { owner: 'planner', meetingId: 'mtg-planner-1', files: 0 },
  { owner: 'planner', meetingId: 'mtg-planner-2', files: HEADER_SAFETY_MEETING.filenames.length },
];
