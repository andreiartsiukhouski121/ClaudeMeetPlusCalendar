import { expect, test, type APIRequestContext } from '@playwright/test';

import { authHeadersFor, loginApi } from '../fixtures/auth.api.js';
import {
  EMPTY_FILES_MEETING_TITLE,
  GEOMETRY_WORKSHOP_TITLE,
  HEADER_SAFETY_MEETING,
  SEED_USERS,
  SEED_USER_KEYS,
  TEACHER_MEETINGS,
  TEACHER_MEETING_FILES,
} from '../fixtures/seed.js';

type TeacherMeetingTitle = keyof typeof TEACHER_MEETINGS.participants;

/**
 * Seed smoke: half the suite relies on specific users and their meetings, so their absence must
 * fail here as one clear case rather than as fifteen red feature cases. The failure message must
 * point at the seed, not at the feature under test.
 *
 * Cases live in the paired `seed.api.cases.md`.
 */

interface MeetingListItem {
  id: string;
  title: string;
  participants?: string[];
}

interface MeetingsPageBody {
  items?: MeetingListItem[];
  total?: number;
}

interface SeededFile {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
}

interface FilesListBody {
  items?: SeededFile[];
}

const FILE_SEED_PROBLEM =
  'This is a meeting FILE seed problem, not the feature under test: compare ' +
  'apps/api/src/meeting-files/meeting-files.seed.ts with e2e/fixtures/seed.ts.';

/**
 * The id of a seeded meeting found by its title — never a literal id in a case body.
 *
 * A module-level helper: `expect(...).toBeDefined()` followed by a cast keeps the lookup free of
 * the branch `playwright/no-conditional-in-test` forbids.
 */
function meetingIdByTitle(body: MeetingsPageBody, title: string, problem: string): string {
  const match = (body.items ?? []).find((item) => item.title === title);

  expect(match, `The seed must carry a meeting titled "${title}". ${problem}`).toBeDefined();

  return (match as MeetingListItem).id;
}

/** The file listing of one meeting, as the given (already-authenticated) owner. */
async function listFiles(
  request: APIRequestContext,
  headers: Record<string, string>,
  meetingId: string,
  label: string,
): Promise<SeededFile[]> {
  const response = await request.get(`/meetings/${meetingId}/files`, { headers });

  expect(
    response.status(),
    `GET /meetings/${meetingId}/files (${label}) did not answer 200. ${FILE_SEED_PROBLEM}`,
  ).toBe(200);

  return ((await response.json()) as FilesListBody).items ?? [];
}

test.describe('Smoke: seed is in place', { tag: '@smoke' }, () => {
  test('SM-API-02 — seeded users are in place', { tag: '@p0' }, async ({ request }) => {
    for (const key of SEED_USER_KEYS) {
      const { email } = SEED_USERS[key];

      // loginApi expects 200 itself and says clearly that the seed is at fault, not the case.
      const token = await loginApi(request, key);

      expect(
        token.split('.'),
        `Seeded user ${key} (${email}) logged in, but accessToken does not look like a JWT. ` +
          'This is a seed or token signing problem, not the feature under test: compare ' +
          'apps/api/src/users/users.seed.ts with e2e/fixtures/seed.ts.',
      ).toHaveLength(3);
    }
  });

  test(
    'SM-API-03 — seeded meetings and their files are in place',
    { tag: '@p0' },
    async ({ request }) => {
      const seedProblem =
        'This is a meeting seed problem, not the feature under test: compare ' +
        'apps/api/src/meetings/meetings.seed.ts with e2e/fixtures/seed.ts.';

      const teacherHeaders = await authHeadersFor(request, 'teacher');

      // limit=100 means "give me everything": the contract's upper bound, not a magic number.
      const teacher = await request.get('/meetings?limit=100', { headers: teacherHeaders });

      expect(teacher.status(), `GET /meetings as teacher did not answer 200. ${seedProblem}`).toBe(
        200,
      );

      const teacherBody = (await teacher.json()) as MeetingsPageBody;
      const titles = (teacherBody.items ?? []).map((item) => item.title);

      expect(
        teacherBody.total,
        `teacher must have ${String(TEACHER_MEETINGS.total)} meetings. ${seedProblem}`,
      ).toBe(TEACHER_MEETINGS.total);
      expect(titles, `teacher meeting titles drifted from the seed. ${seedProblem}`).toEqual(
        expect.arrayContaining([
          ...TEACHER_MEETINGS.latestTitles,
          ...TEACHER_MEETINGS.omittedTitles,
        ]),
      );

      // Per-title participants for all five of teacher's seeded meetings. teacher is read-only, so
      // each array is asserted verbatim (order included) against the fixture mirror.
      for (const [title, expectedParticipants] of Object.entries(TEACHER_MEETINGS.participants) as [
        TeacherMeetingTitle,
        readonly string[],
      ][]) {
        const meeting = (teacherBody.items ?? []).find((item) => item.title === title);

        expect(
          meeting,
          `teacher meeting "${title}" is missing from GET /meetings. ${seedProblem}`,
        ).toBeDefined();
        expect(
          meeting?.participants,
          `teacher meeting "${title}" participants drifted from the seed. ${seedProblem}`,
        ).toEqual(expectedParticipants);
      }

      const student = await request.get('/meetings?limit=100', {
        headers: await authHeadersFor(request, 'student'),
      });

      expect(student.status(), `GET /meetings as student did not answer 200. ${seedProblem}`).toBe(
        200,
      );

      const studentBody = (await student.json()) as MeetingsPageBody;

      expect(
        studentBody.total,
        `student is the "no meetings" edge case, total must be 0. ${seedProblem}`,
      ).toBe(SEED_USERS.student.meetingsCount);
      expect(studentBody.items).toEqual([]);

      /*
       * The file half of the seed. Until this was written the case read teacher's and student's
       * MEETINGS only, so the seed grew by a whole meeting and five files without the drift check
       * noticing — a drift check that could not see the drift it exists to catch.
       */
      const geometryFiles = await listFiles(
        request,
        teacherHeaders,
        meetingIdByTitle(teacherBody, GEOMETRY_WORKSHOP_TITLE, seedProblem),
        GEOMETRY_WORKSHOP_TITLE,
      );

      expect(
        geometryFiles.map(({ filename, contentType, sizeBytes, uploadedAt }) => ({
          filename,
          contentType,
          sizeBytes,
          uploadedAt,
        })),
        `"${GEOMETRY_WORKSHOP_TITLE}" must list exactly the two mirrored files, ` +
          `${TEACHER_MEETING_FILES.items.map((item) => item.filename).join(' then ')} ` +
          `(uploadedAt DESC, id ASC). ${FILE_SEED_PROBLEM}`,
      ).toEqual(TEACHER_MEETING_FILES.items.map((item) => ({ ...item })));

      // The empty state is part of the seeded baseline rather than an accident, so it is asserted
      // here too: MF-API-05 reads it as a fixture.
      const emptyMeetingFiles = await listFiles(
        request,
        teacherHeaders,
        meetingIdByTitle(teacherBody, EMPTY_FILES_MEETING_TITLE, seedProblem),
        EMPTY_FILES_MEETING_TITLE,
      );

      expect(
        emptyMeetingFiles,
        `"${EMPTY_FILES_MEETING_TITLE}" must hold no files. ${FILE_SEED_PROBLEM}`,
      ).toEqual([]);

      /*
       * planner's dedicated SEC-API-11 fixture. ONE named meeting and its files — never a count of
       * planner's meetings and never its participants: planner is the api project's mutation
       * sandbox, so any count races the cases creating meetings there. Nothing creates a second
       * meeting under this title and nothing uploads into it
       * (`meeting-files.api.cases.md` makes that a precondition), so an exact file list is safe.
       *
       * Why the names are compared character for character: a seed that quietly dropped or "cleaned
       * up" one of the hostile names would leave SEC-API-11 green against a fixture with nothing
       * hostile left in it.
       */
      const plannerHeaders = await authHeadersFor(request, 'planner');
      const planner = await request.get('/meetings?limit=100', { headers: plannerHeaders });

      expect(planner.status(), `GET /meetings as planner did not answer 200. ${seedProblem}`).toBe(
        200,
      );

      const headerSafetyFiles = await listFiles(
        request,
        plannerHeaders,
        meetingIdByTitle(
          (await planner.json()) as MeetingsPageBody,
          HEADER_SAFETY_MEETING.title,
          seedProblem,
        ),
        HEADER_SAFETY_MEETING.title,
      );

      // Compared as a SET: the listing orders by uploadedAt DESC, the mirror is written in seed
      // order, and this case is about which names exist, not about their order.
      expect(
        headerSafetyFiles.map((file) => file.filename).sort((a, b) => a.localeCompare(b)),
        `"${HEADER_SAFETY_MEETING.title}" must list exactly the five mirrored hostile filenames, ` +
          `character for character: ${JSON.stringify(HEADER_SAFETY_MEETING.filenames)}. ` +
          `${FILE_SEED_PROBLEM}`,
      ).toEqual([...HEADER_SAFETY_MEETING.filenames].sort((a, b) => a.localeCompare(b)));
    },
  );
});
