import { expect, test } from '@playwright/test';

import { authHeadersFor, loginApi } from '../fixtures/auth.api.js';
import { SEED_USERS, SEED_USER_KEYS, TEACHER_MEETINGS } from '../fixtures/seed.js';

/**
 * Смоук сида: половина сьюта опирается на конкретных пользователей и их встречи, поэтому
 * их отсутствие должно падать здесь, отдельным понятным кейсом, а не пятнадцатью красными
 * кейсами фичи. Сообщение падения обязано указывать на сид, а не на проверяемую фичу.
 *
 * Кейсы — в парном `seed.api.cases.md`.
 */

interface MeetingsPageBody {
  items?: { title: string }[];
  total?: number;
}

test.describe('Смоук: сид на месте', { tag: '@smoke' }, () => {
  test('SM-API-02 — сид-пользователи на месте', { tag: '@p0' }, async ({ request }) => {
    for (const key of SEED_USER_KEYS) {
      const { email } = SEED_USERS[key];

      // loginApi сам ожидает 200 и внятно сообщает, что виноват сид, а не кейс.
      const token = await loginApi(request, key);

      expect(
        token.split('.'),
        `Сид-пользователь ${key} (${email}) залогинился, но accessToken не похож на JWT. ` +
          'Это проблема сида или подписи токена, а не проверяемой фичи: сверь ' +
          'apps/api/src/users/users.seed.ts с e2e/fixtures/seed.ts.',
      ).toHaveLength(3);
    }
  });

  test('SM-API-03 — сид-встречи на месте', { tag: '@p0' }, async ({ request }) => {
    const seedProblem =
      'Это проблема сида встреч, а не проверяемой фичи: сверь ' +
      'apps/api/src/meetings/meetings.seed.ts с e2e/fixtures/seed.ts.';

    // limit=100 — «отдай всё»: верхняя граница контракта (`@Max(100)`), а не магическое число.
    const teacher = await request.get('/meetings?limit=100', {
      headers: await authHeadersFor(request, 'teacher'),
    });

    expect(teacher.status(), `GET /meetings под teacher не ответил 200. ${seedProblem}`).toBe(200);

    const teacherBody = (await teacher.json()) as MeetingsPageBody;
    const titles = (teacherBody.items ?? []).map((item) => item.title);

    expect(
      teacherBody.total,
      `У teacher должно быть ${String(TEACHER_MEETINGS.total)} встреч. ${seedProblem}`,
    ).toBe(TEACHER_MEETINGS.total);
    expect(titles, `Названия встреч teacher разошлись с сидом. ${seedProblem}`).toEqual(
      expect.arrayContaining([...TEACHER_MEETINGS.latestTitles, ...TEACHER_MEETINGS.omittedTitles]),
    );

    const student = await request.get('/meetings?limit=100', {
      headers: await authHeadersFor(request, 'student'),
    });

    expect(student.status(), `GET /meetings под student не ответил 200. ${seedProblem}`).toBe(200);

    const studentBody = (await student.json()) as MeetingsPageBody;

    expect(
      studentBody.total,
      `student — граничный случай «нет встреч», total обязан быть 0. ${seedProblem}`,
    ).toBe(SEED_USERS.student.meetingsCount);
    expect(studentBody.items).toEqual([]);
  });
});
