import { expect, test, type APIRequestContext } from '@playwright/test';

import { authHeadersFor } from '../../fixtures/auth.api.js';
import { FUTURE_STARTS_AT_ISO, SEED_USERS, TEACHER_MEETINGS } from '../../fixtures/seed.js';

/**
 * Contract of `GET /meetings` and `POST /meetings`. Cases live in the paired
 * `home-dashboard.api.cases.md`; every test title starts with its case ID.
 *
 * Project `api`: the `request` fixture, `baseURL = http://127.0.0.1:3101`, no browser. Paths are
 * relative — an absolute URL would bypass the project `baseURL`.
 *
 * Data comes only from `fixtures/seed.ts`. Exact numbers are checked against `teacher`/`student`
 * alone: mutating them is forbidden. Mutating cases run as `planner`, reserved for
 * `*.api.spec.ts`, while `*.functional.spec.ts` mutates `organizer`. That removes the
 * cross-project race under `fullyParallel: true`, since `GET /meetings` is isolated by owner.
 *
 * `planner` is also mutated by `meetings-detail.api.spec.ts`, so a `before`/`after` reading of
 * `total` here would race that file's concurrent creates under `fullyParallel: true` — that was
 * `HD-API-14` failing with an offset that tracked the other file's insert count. Mutating cases
 * therefore assert by a unique generated title instead, the same approach that file already uses.
 * `HD-API-15` posts an empty body, so there is no title to look for; it instead leans on the DTO's
 * own `@Length(3, 100)` on `title` — a leaked record from that body could only carry a missing or
 * too-short title, which no legitimately created meeting (here or in a concurrent file) ever has.
 */

const TEACHER = SEED_USERS.teacher;

/** Nest error body shape, derived from `HttpException.createBody`. */
interface ErrorBody {
  message: string | string[];
  error: string;
  statusCode: number;
}

interface MeetingItem {
  id: string;
  title: string;
  startsAt: string;
  durationMinutes: number;
}

interface MeetingsPageBody {
  items?: MeetingItem[];
  total?: number;
}

const UNAUTHORIZED = 'Authentication required';

/** List item keys per the contract: no `ownerId` among them — `toMeetingDto` strips it. */
const MEETING_KEYS = ['durationMinutes', 'id', 'participants', 'startsAt', 'title'];

/**
 * The created meeting's title is always unique, or `toContainText` could match a meeting from a
 * previous run (the in-memory store lives as long as the Nest process).
 */
function uniqueTitle(prefix: string): string {
  return `${prefix} ${String(Date.now())}-${String(Math.floor(Math.random() * 1e6))}`;
}

/**
 * Helpers are pulled out of test bodies for a reason: `playwright/no-conditional-in-test` is an
 * error, and a condition inside a test is a blocker.
 */
function isNonIncreasing(values: number[]): boolean {
  return values.every((value, index) => index === 0 || values[index - 1] >= value);
}

async function readPage(
  request: APIRequestContext,
  headers: Record<string, string>,
  query = '',
): Promise<MeetingsPageBody> {
  const response = await request.get(`/meetings${query}`, { headers });

  expect(response.status()).toBe(200);

  return (await response.json()) as MeetingsPageBody;
}

test.describe('Dashboard: API contract', { tag: ['@regression', '@home-dashboard'] }, () => {
  test(
    'HD-API-01 — GET /meetings with a token returns the list and total',
    { tag: '@p0' },
    async ({ request }) => {
      const headers = await authHeadersFor(request, 'teacher');
      const response = await request.get('/meetings', { headers });

      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('application/json');

      const body = (await response.json()) as MeetingsPageBody;

      expect(Array.isArray(body.items)).toBe(true);
      expect(typeof body.total).toBe('number');
      expect(body.items?.length).toBeGreaterThan(0);

      for (const item of body.items ?? []) {
        // The full key set rather than "has an id": this also catches an `ownerId` leak.
        expect(Object.keys(item).sort()).toEqual(MEETING_KEYS);
        expect(item).not.toHaveProperty('ownerId');
        expect(typeof item.startsAt).toBe('string');
        expect(Number.isNaN(Date.parse(item.startsAt))).toBe(false);
        expect(typeof item.durationMinutes).toBe('number');
      }

      // The response text rather than the parsed object: a secret could hide in a nested field.
      const text = await response.text();
      expect(text).not.toContain('passwordHash');
      expect(text).not.toContain(TEACHER.password);
      expect(text).not.toContain('ownerId');
    },
  );

  test(
    'HD-API-02 — GET /meetings without a token gives 401',
    { tag: '@p0' },
    async ({ request }) => {
      const response = await request.get('/meetings');

      expect(response.status()).toBe(401);

      const body = (await response.json()) as ErrorBody & MeetingsPageBody;

      expect(body).toEqual({ message: UNAUTHORIZED, error: 'Unauthorized', statusCode: 401 });
      expect(body.items).toBeUndefined();
    },
  );

  test('HD-API-03 — limit=3 returns exactly 3 items', { tag: '@p0' }, async ({ request }) => {
    const headers = await authHeadersFor(request, 'teacher');
    const body = await readPage(request, headers, `?limit=${String(TEACHER_MEETINGS.latestLimit)}`);

    expect(body.items).toHaveLength(TEACHER_MEETINGS.latestLimit);
  });

  test('HD-API-04 — sorted by date DESC', { tag: '@p0' }, async ({ request }) => {
    const headers = await authHeadersFor(request, 'teacher');
    const body = await readPage(request, headers, `?limit=${String(TEACHER_MEETINGS.latestLimit)}`);
    const items = body.items ?? [];

    expect(isNonIncreasing(items.map((item) => Date.parse(item.startsAt)))).toBe(true);
    expect(items.map((item) => item.title)).toEqual([...TEACHER_MEETINGS.latestTitles]);

    // The slice must cut the two oldest meetings — half the point of the case is right here.
    for (const omitted of TEACHER_MEETINGS.omittedTitles) {
      expect(items.map((item) => item.title)).not.toContain(omitted);
    }
  });

  test(
    'HD-API-05 — total is the full meeting count, not the length of items',
    { tag: '@p0' },
    async ({ request }) => {
      const headers = await authHeadersFor(request, 'teacher');
      const body = await readPage(
        request,
        headers,
        `?limit=${String(TEACHER_MEETINGS.latestLimit)}`,
      );

      expect(body.total).toBe(TEACHER_MEETINGS.total);
      expect(body.items).toHaveLength(TEACHER_MEETINGS.latestLimit);
      // The control experiment (`total = items.length`) must break this very assertion.
      expect(body.total).not.toBe(body.items?.length);
    },
  );

  test('HD-API-06 — data isolation between users', { tag: '@p0' }, async ({ request }) => {
    const teacherHeaders = await authHeadersFor(request, 'teacher');
    const studentHeaders = await authHeadersFor(request, 'student');

    const teacherPage = await readPage(request, teacherHeaders, '?limit=100');
    const studentPage = await readPage(request, studentHeaders, '?limit=100');

    const teacherIds = (teacherPage.items ?? []).map((item) => item.id);
    const studentIds = (studentPage.items ?? []).map((item) => item.id);

    expect(teacherIds.length).toBeGreaterThan(0);
    expect(studentIds).toEqual([]);
    expect(teacherIds.filter((id) => studentIds.includes(id))).toEqual([]);
    expect(studentPage.total).toBe(SEED_USERS.student.meetingsCount);
    expect(teacherPage.total).toBe(TEACHER_MEETINGS.total);
  });

  test('HD-API-07 — a user with no meetings', async ({ request }) => {
    const headers = await authHeadersFor(request, 'student');
    const response = await request.get('/meetings?limit=3', { headers });

    // 200, not 404: having no meetings is a normal state, not "not found".
    expect(response.status()).toBe(200);

    const body = (await response.json()) as MeetingsPageBody;

    expect(body.items).toEqual([]);
    expect(body.total).toBe(0);
  });

  test('HD-API-08 — a non-numeric limit gives 400', async ({ request }) => {
    const headers = await authHeadersFor(request, 'teacher');
    const response = await request.get('/meetings?limit=abc', { headers });

    // Neither a 500 nor a silent ignore: the parameter is parsed and validated.
    expect(response.status()).toBe(400);

    const body = (await response.json()) as ErrorBody;

    expect(Array.isArray(body.message)).toBe(true);
    // Checked by inclusion: a non-numeric value produces three messages at once.
    expect(body.message.toString()).toContain('limit');
  });

  test('HD-API-09 — a limit outside 1..100 gives 400', async ({ request }) => {
    const headers = await authHeadersFor(request, 'teacher');

    for (const limit of ['0', '-1', '101']) {
      const response = await request.get(`/meetings?limit=${limit}`, { headers });

      expect(response.status(), `limit=${limit} must give 400`).toBe(400);

      const body = (await response.json()) as ErrorBody;
      expect(body.message.toString()).toContain('limit');
    }

    const tooBig = await request.get('/meetings?limit=101', { headers });
    const tooBigBody = (await tooBig.json()) as ErrorBody;

    // The contract's upper bound is exactly 100 (`@Max(100)`), not 50.
    expect(tooBigBody.message.toString()).toContain('limit must not be greater than 100');
  });

  test('HD-API-10 — limit contract: default, ceiling, unknown parameter', async ({ request }) => {
    const headers = await authHeadersFor(request, 'teacher');

    // Step 2. Without the parameter — 200 and the documented default of 3. This step catches a
    // missing `@IsOptional()`: without it the answer is 400 and the dashboard does not load.
    const byDefault = await request.get('/meetings', { headers });
    expect(byDefault.status()).toBe(200);

    const byDefaultBody = (await byDefault.json()) as MeetingsPageBody;
    expect(byDefaultBody.items).toHaveLength(TEACHER_MEETINGS.latestLimit);
    expect(byDefaultBody.total).toBe(TEACHER_MEETINGS.total);

    // Step 3. `limit=100` means "give me everything": the contract's upper bound.
    const full = await readPage(request, headers, '?limit=100');
    expect(full.items).toHaveLength(TEACHER_MEETINGS.total);
    expect(full.total).toBe(TEACHER_MEETINGS.total);

    // Step 4. `forbidNonWhitelisted` applies to the query too, not only to the body.
    const unknownParam = await request.get('/meetings?limit=3&foo=bar', { headers });
    expect(unknownParam.status()).toBe(400);

    const unknownParamBody = (await unknownParam.json()) as ErrorBody;
    expect(unknownParamBody.message.toString()).toContain('property foo should not exist');
  });
});

/**
 * Cases under `planner`. Serial mode keeps this file's own tests from landing in different
 * workers, but it says nothing about `meetings-detail.api.spec.ts`, which mutates the same
 * `planner` owner from another file entirely: the two files' inserts interleave freely under
 * `fullyParallel: true`. Every mutating case here is proven by its own unique generated title, or
 * — for `HD-API-15`, whose rejected body carries no title — by the DTO's own bound on `title`;
 * neither is moved by however many meetings a concurrent file created in between.
 */
test.describe(
  'Dashboard: API contract as planner',
  { tag: ['@regression', '@home-dashboard'] },
  () => {
    test.describe.configure({ mode: 'serial' });

    test(
      'HD-API-13 — POST /meetings creates a meeting',
      { tag: ['@p0', '@mutating'] },
      async ({ request }) => {
        const headers = await authHeadersFor(request, 'planner');
        const title = uniqueTitle('E2E API meeting');

        const created = await request.post('/meetings', {
          headers,
          data: { title, startsAt: FUTURE_STARTS_AT_ISO, durationMinutes: 30 },
        });

        // 201 is the right answer to a POST; no status decorator is needed here.
        expect(created.status()).toBe(201);

        const createdBody = (await created.json()) as MeetingItem;
        expect(typeof createdBody.id).toBe('string');
        expect(createdBody.title).toBe(title);
        expect(createdBody.durationMinutes).toBe(30);

        const after = await readPage(request, headers, '?limit=3');
        // The 2030 date guarantees the new meeting lands in the top three: with a date earlier
        // than the owner's seeded meeting (2026-01-16) the case would be falsely red. The title is
        // the evidence of creation, not `total`, which a concurrent file mutating the same
        // `planner` owner could move between two reads.
        expect((after.items ?? []).map((item) => item.title)).toContain(title);
      },
    );

    test(
      'HD-API-14 — POST /meetings without a token gives 401 and changes no data',
      { tag: '@p0' },
      async ({ request }) => {
        const headers = await authHeadersFor(request, 'planner');
        const title = uniqueTitle('No token');

        const response = await request.post('/meetings', {
          data: { title, startsAt: FUTURE_STARTS_AT_ISO },
        });

        expect(response.status()).toBe(401);

        const body = (await response.json()) as ErrorBody;
        expect(body).toEqual({ message: UNAUTHORIZED, error: 'Unauthorized', statusCode: 401 });

        // `limit=100` is the contract's ceiling (`@Max(100)`): the title must be absent from the
        // whole list, not merely from a slice.
        const after = await readPage(request, headers, '?limit=100');
        expect((after.items ?? []).map((item) => item.title)).not.toContain(title);
      },
    );

    test('HD-API-15 — POST /meetings without required fields gives 400', async ({ request }) => {
      const headers = await authHeadersFor(request, 'planner');

      const response = await request.post('/meetings', { headers, data: {} });

      expect(response.status()).toBe(400);

      const body = (await response.json()) as ErrorBody;

      expect(Array.isArray(body.message)).toBe(true);
      expect(body.message.toString()).toContain('title');
      expect(body.message.toString()).toContain('startsAt');

      // No side effect, checked without a `total` reading: this body carries no `title` at all,
      // so a leaked record could only have one missing or shorter than the DTO's own
      // `@Length(3, 100)`. A concurrent file's inserts always carry a unique, valid title through
      // the same validated endpoint, so this holds no matter how many of them land in between.
      const after = await readPage(request, headers, '?limit=100');
      const titles = (after.items ?? []).map((item) => item.title);

      for (const title of titles) {
        expect(typeof title, 'every stored title must be a real string').toBe('string');
        expect(
          title.length,
          `title "${title}" must satisfy the DTO's @Length(3, 100)`,
        ).toBeGreaterThanOrEqual(3);
      }
    });

    test('HD-API-16 — POST /meetings with an extra field gives 400', async ({ request }) => {
      const headers = await authHeadersFor(request, 'planner');
      const title = uniqueTitle('Owner spoofing');

      const response = await request.post('/meetings', {
        headers,
        data: {
          title,
          startsAt: FUTURE_STARTS_AT_ISO,
          ownerId: 'usr-teacher',
        },
      });

      expect(response.status()).toBe(400);

      const body = (await response.json()) as ErrorBody;
      expect(body.message.toString()).toContain('property ownerId should not exist');

      const after = await readPage(request, headers, '?limit=100');
      expect((after.items ?? []).map((item) => item.title)).not.toContain(title);
    });

    test(
      'HD-API-17 — the created meeting belongs to the token owner',
      { tag: '@mutating' },
      async ({ request }) => {
        const plannerHeaders = await authHeadersFor(request, 'planner');
        const title = uniqueTitle('Planner meeting');

        const created = await request.post('/meetings', {
          headers: plannerHeaders,
          data: { title, startsAt: FUTURE_STARTS_AT_ISO },
        });

        expect(created.status()).toBe(201);

        const createdBody = (await created.json()) as MeetingItem;
        const teacherPage = await readPage(
          request,
          await authHeadersFor(request, 'teacher'),
          '?limit=100',
        );
        const teacherItems = teacherPage.items ?? [];

        // `limit=100` is allowed precisely because the contract's ceiling is `@Max(100)`.
        expect(teacherItems.map((item) => item.id)).not.toContain(createdBody.id);
        expect(teacherItems.map((item) => item.title)).not.toContain(title);
        expect(teacherPage.total).toBe(TEACHER_MEETINGS.total);
      },
    );

    test(
      'HD-API-20 — POST /meetings without durationMinutes gives 201 and a default of 60',
      { tag: ['@p0', '@mutating'] },
      async ({ request }) => {
        const headers = await authHeadersFor(request, 'planner');
        const title = uniqueTitle('Meeting without a duration');

        const response = await request.post('/meetings', {
          headers,
          // Exactly the body the dashboard form sends: no `durationMinutes`.
          data: { title, startsAt: FUTURE_STARTS_AT_ISO },
        });

        // Without `@IsOptional()` on the DTO field this answers 400 — and the "Create meeting"
        // button does not work at all. That is the point of the case.
        expect(response.status()).toBe(201);

        const body = (await response.json()) as MeetingItem;
        expect(body.title).toBe(title);
        expect(body.durationMinutes).toBe(60);
        expect(Object.keys(body).sort()).toEqual(MEETING_KEYS);
      },
    );
  },
);
