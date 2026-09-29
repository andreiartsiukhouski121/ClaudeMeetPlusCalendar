import { expect, test } from '@playwright/test';

import { authHeadersFor, loginApi } from '../fixtures/auth.api.js';
import { SEED_USERS, SEED_USER_KEYS, TEACHER_MEETINGS } from '../fixtures/seed.js';

type TeacherMeetingTitle = keyof typeof TEACHER_MEETINGS.participants;

/**
 * Seed smoke: half the suite relies on specific users and their meetings, so their absence must
 * fail here as one clear case rather than as fifteen red feature cases. The failure message must
 * point at the seed, not at the feature under test.
 *
 * Cases live in the paired `seed.api.cases.md`.
 */

interface MeetingsPageBody {
  items?: { title: string; participants?: string[] }[];
  total?: number;
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

  test('SM-API-03 — seeded meetings are in place', { tag: '@p0' }, async ({ request }) => {
    const seedProblem =
      'This is a meeting seed problem, not the feature under test: compare ' +
      'apps/api/src/meetings/meetings.seed.ts with e2e/fixtures/seed.ts.';

    // limit=100 means "give me everything": the contract's upper bound, not a magic number.
    const teacher = await request.get('/meetings?limit=100', {
      headers: await authHeadersFor(request, 'teacher'),
    });

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
      expect.arrayContaining([...TEACHER_MEETINGS.latestTitles, ...TEACHER_MEETINGS.omittedTitles]),
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
  });
});
