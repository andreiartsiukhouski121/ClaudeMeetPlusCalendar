import type { APIRequestContext } from '@playwright/test';

import { authHeaders, authHeadersFor, loginApi } from '../../api/auth.api.js';
import type { Tracker } from '../../api/cleanup.api.js';
import { MEETING_NOT_FOUND_BODY, type ErrorBody } from '../../api/meetings.api.js';
import { FUTURE_STARTS_AT_ISO } from '../../fixtures/seed.js';
import { expect, test } from '../../fixtures/suite.js';

/**
 * Contract of `GET /meetings/:id`, `DELETE /meetings/:id` and of the `participants` field on
 * `POST /meetings`. Cases live
 * in the paired `meetings-detail.api.cases.md`; every test title starts with its case ID.
 *
 * Project `api`: the `request` fixture, `baseURL = http://127.0.0.1:3101`, no browser. Paths are
 * relative — an absolute URL would bypass the project `baseURL`.
 *
 * `teacher` and `student` are read-only; mutating cases run as `planner`, the shared sandbox
 * (`FACT-3783`), and register every meeting they create with the `cleanup` tracker as it is created
 * (`FACT-3780`). No case here counts an
 * absolute or relative `total`: `home-dashboard.api.spec.ts` also mutates `planner` under
 * `fullyParallel: true`, so a `total`-based check would race it. A created (or deliberately
 * rejected) meeting is instead found — or confirmed absent — by its own unique generated title,
 * which is unaffected by anything a concurrent file does to the same owner's counter.
 */

interface MeetingItem {
  id: string;
  title: string;
  startsAt: string;
  durationMinutes: number;
  participants: string[];
}

interface MeetingsPageBody {
  items?: MeetingItem[];
  total?: number;
}

const UNAUTHORIZED = 'Authentication required';
const NOT_FOUND = 'Meeting not found';

/** `MeetingDto` keys per the contract, sorted — no `ownerId` among them. */
const MEETING_KEYS = ['durationMinutes', 'id', 'participants', 'startsAt', 'title'];

/**
 * The created meeting's title is always unique, or a list-membership check could match a meeting
 * from a previous run (the in-memory store lives as long as the Nest process) or from a
 * concurrently running file mutating the same owner.
 */
function uniqueTitle(prefix: string): string {
  return `${prefix} ${String(Date.now())}-${String(Math.floor(Math.random() * 1e6))}`;
}

/**
 * Creates a meeting as the owner of `token` at the shared future date, registers it with `cleanup`
 * and returns its id. `tolerated` is the one 404 body the cleanup accepts, for a case that deletes
 * the row itself; `null` means the cleanup `DELETE` must answer 204.
 */
async function createDeleteTarget(
  request: APIRequestContext,
  token: string,
  title: string,
  cleanup: Tracker,
  tolerated: ErrorBody | null,
): Promise<string> {
  const response = await request.post('/meetings', {
    headers: authHeaders(token),
    data: { title, startsAt: FUTURE_STARTS_AT_ISO },
  });

  expect(response.status(), 'creating the delete target for this case must succeed').toBe(201);

  const { id } = (await response.json()) as MeetingItem;
  cleanup.track(`/meetings/${id}`, token, tolerated);
  return id;
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

/** One real id belonging to the given owner, read from the list — never a literal. */
async function realIdFor(
  request: APIRequestContext,
  headers: Record<string, string>,
): Promise<string> {
  const page = await readPage(request, headers, '?limit=100');
  const [first] = page.items ?? [];

  expect(first, 'Seed must carry at least one meeting for this owner').toBeDefined();

  return (first as MeetingItem).id;
}

test.describe('Meeting detail: API contract', { tag: ['@regression', '@meetings-detail'] }, () => {
  test(
    'MD-API-01 — GET /meetings/:id returns the full meeting for its owner',
    { tag: '@p0' },
    async ({ request, cleanup }) => {
      try {
        const headers = await authHeadersFor(request, 'teacher');
        const page = await readPage(request, headers, '?limit=100');
        const [listItem] = page.items ?? [];
        expect(listItem, 'teacher must have at least one seeded meeting').toBeDefined();

        const response = await request.get(`/meetings/${(listItem as MeetingItem).id}`, {
          headers,
        });

        expect(response.status()).toBe(200);
        expect(response.headers()['content-type']).toContain('application/json');

        const body = (await response.json()) as MeetingItem;

        expect(Object.keys(body).sort()).toEqual(MEETING_KEYS);
        // Same MeetingDto, same mapper, same id: the by-id read and the list item must agree
        // byte for byte.
        expect(body).toEqual(listItem);
      } finally {
        await cleanup.run();
      }
    },
  );

  test(
    'MD-API-02 — GET /meetings/:id without a token gives 401',
    { tag: '@p0' },
    async ({ request, cleanup }) => {
      try {
        const teacherHeaders = await authHeadersFor(request, 'teacher');
        const id = await realIdFor(request, teacherHeaders);

        const response = await request.get(`/meetings/${id}`);

        expect(response.status()).toBe(401);

        const body = (await response.json()) as ErrorBody;
        expect(body).toEqual({ message: UNAUTHORIZED, error: 'Unauthorized', statusCode: 401 });
      } finally {
        await cleanup.run();
      }
    },
  );

  test(
    "MD-API-03 — a non-existent id and another owner's id give byte-identical 404",
    { tag: '@p0' },
    async ({ request, cleanup }) => {
      try {
        const teacherHeaders = await authHeadersFor(request, 'teacher');
        const studentHeaders = await authHeadersFor(request, 'student');

        const teacherOwnedId = await realIdFor(request, teacherHeaders);
        // Derived from a real id, guaranteed to collide with nothing: no seeded or created id ever
        // carries this suffix.
        const nonExistentId = `${teacherOwnedId}-does-not-exist`;

        const wrongOwner = await request.get(`/meetings/${teacherOwnedId}`, {
          headers: studentHeaders,
        });
        const missing = await request.get(`/meetings/${nonExistentId}`, {
          headers: studentHeaders,
        });

        expect(wrongOwner.status()).toBe(404);
        expect(missing.status()).toBe(404);

        const wrongOwnerBody = (await wrongOwner.json()) as ErrorBody;
        const missingBody = (await missing.json()) as ErrorBody;

        const expectedBody = { message: NOT_FOUND, error: 'Not Found', statusCode: 404 };
        expect(missingBody).toEqual(expectedBody);
        // The one assertion `ADR-0018` exists for: the two whole parsed bodies compared directly,
        // not two separate shape checks that could both pass while the bodies themselves differ.
        expect(wrongOwnerBody).toEqual(missingBody);
      } finally {
        await cleanup.run();
      }
    },
  );

  test('MD-API-04 — GET /meetings/a/b falls through to Express, not to any Nest handler', async ({
    request,
    cleanup,
  }) => {
    try {
      // No handler matches a two-segment path, so the class-level guard never runs either — no
      // token is needed to reach this fallback.
      const response = await request.get('/meetings/a/b');

      expect(response.status()).toBe(404);

      const body = (await response.json()) as ErrorBody;
      expect(body).toEqual({
        message: 'Cannot GET /meetings/a/b',
        error: 'Not Found',
        statusCode: 404,
      });
    } finally {
      await cleanup.run();
    }
  });

  /**
   * Cases under `planner`. No test reads or asserts on `total`: `home-dashboard.api.spec.ts` mutates
   * the same owner under `fullyParallel: true`, and a `total`-based check here would race it. Every
   * case instead uses its own unique title as the sole evidence of creation or of its absence.
   */
  test.describe('Meeting detail: API contract as planner', () => {
    test(
      'MD-API-05 — POST /meetings stores participants verbatim, order preserved',
      { tag: '@mutating' },
      async ({ request, cleanup }) => {
        try {
          const token = await loginApi(request, 'planner');
          const headers = authHeaders(token);
          const title = uniqueTitle('E2E participants meeting');
          const participants = ['Guest Speaker', 'visitor@example.test'];

          const created = await request.post('/meetings', {
            headers,
            data: { title, startsAt: FUTURE_STARTS_AT_ISO, participants },
          });

          expect(created.status()).toBe(201);

          const createdBody = (await created.json()) as MeetingItem;
          cleanup.track(`/meetings/${createdBody.id}`, token);
          expect(createdBody.participants).toEqual(participants);

          // Read back through the by-id route: proves the value is stored, not merely echoed.
          const byId = await request.get(`/meetings/${createdBody.id}`, { headers });
          expect(byId.status()).toBe(200);

          const byIdBody = (await byId.json()) as MeetingItem;
          expect(byIdBody.participants).toEqual(participants);
        } finally {
          await cleanup.run();
        }
      },
    );

    test(
      'MD-API-06 — POST /meetings normalizes an absent, empty or null participants to []',
      { tag: '@mutating' },
      async ({ request, cleanup }) => {
        try {
          const token = await loginApi(request, 'planner');
          const headers = authHeaders(token);

          // `participants: undefined` is dropped by JSON serialization, so this reads on the wire
          // exactly as "the field absent" — no conditional is needed to build three shapes of body
          // (`playwright/no-conditional-in-test` is an error).
          const variants: { label: string; participants?: string[] | null }[] = [
            { label: 'absent', participants: undefined },
            { label: 'empty array', participants: [] },
            { label: 'explicit null', participants: null },
          ];

          for (const variant of variants) {
            const title = uniqueTitle(`E2E normalize (${variant.label})`);
            const data = {
              title,
              startsAt: FUTURE_STARTS_AT_ISO,
              participants: variant.participants,
            };

            const created = await request.post('/meetings', { headers, data });

            expect(created.status(), `variant "${variant.label}" must be accepted`).toBe(201);

            const createdBody = (await created.json()) as MeetingItem;
            cleanup.track(`/meetings/${createdBody.id}`, token);
            expect(createdBody.participants, `variant "${variant.label}"`).toEqual([]);

            const byId = await request.get(`/meetings/${createdBody.id}`, { headers });
            const byIdBody = (await byId.json()) as MeetingItem;
            expect(byIdBody.participants, `variant "${variant.label}", read back by id`).toEqual(
              [],
            );
          }
        } finally {
          await cleanup.run();
        }
      },
    );

    test(
      'MD-API-07 — POST /meetings rejects invalid participants shapes with 400, no meeting created',
      { tag: '@mutating' },
      async ({ request, cleanup }) => {
        try {
          const headers = await authHeadersFor(request, 'planner');

          const rejections: { label: string; participants: unknown; expectedMessages: string[] }[] =
            [
              {
                label: 'a string instead of an array',
                participants: 'x',
                expectedMessages: [
                  'participants must contain no more than 20 elements',
                  'participants must be an array',
                ],
              },
              {
                label: 'an array of numbers',
                participants: [1, 2],
                expectedMessages: [
                  'each value in participants must be longer than or equal to 1 and shorter than or ' +
                    'equal to 100 characters',
                  'each value in participants must be a string',
                ],
              },
              {
                label: 'an array holding an empty string',
                participants: [''],
                expectedMessages: [
                  'each value in participants must be longer than or equal to 1 and shorter than or ' +
                    'equal to 100 characters',
                ],
              },
              {
                label: 'an array of 21 entries',
                participants: Array.from({ length: 21 }, (_, index) => `Guest ${String(index)}`),
                expectedMessages: ['participants must contain no more than 20 elements'],
              },
            ];

          const titles = rejections.map((rejection) =>
            uniqueTitle(`E2E rejected (${rejection.label})`),
          );

          for (const [index, rejection] of rejections.entries()) {
            const response = await request.post('/meetings', {
              headers,
              data: {
                title: titles[index],
                startsAt: FUTURE_STARTS_AT_ISO,
                participants: rejection.participants,
              },
            });

            expect(response.status(), `"${rejection.label}" must be rejected`).toBe(400);

            const body = (await response.json()) as ErrorBody;
            expect(Array.isArray(body.message), `"${rejection.label}"`).toBe(true);

            for (const expectedMessage of rejection.expectedMessages) {
              // Membership, never length or order: two of these inputs produce two messages at
              // once, and the order between them is not a promise.
              expect(body.message, `"${rejection.label}"`).toContain(expectedMessage);
            }
          }

          // No side effect: none of the four rejected requests created a meeting.
          const page = await readPage(request, headers, '?limit=100');
          const createdTitles = (page.items ?? []).map((item) => item.title);

          for (const title of titles) {
            expect(createdTitles).not.toContain(title);
          }
        } finally {
          await cleanup.run();
        }
      },
    );

    test(
      'MD-API-08 — padded and duplicated participants are neither trimmed nor deduplicated',
      { tag: '@mutating' },
      async ({ request, cleanup }) => {
        try {
          const token = await loginApi(request, 'planner');
          const headers = authHeaders(token);
          const title = uniqueTitle('E2E padded participants');
          // The retired MD-UT-05's payload, carried over verbatim: padded and duplicated, so trimming
          // or deduplication on either response would be visible immediately.
          const participants = [
            '  Nina Cole ',
            'Nina Cole',
            'Nina Cole',
            'guest@purpleschool.test',
          ];

          const created = await request.post('/meetings', {
            headers,
            data: { title, startsAt: FUTURE_STARTS_AT_ISO, participants },
          });

          expect(created.status()).toBe(201);

          const createdBody = (await created.json()) as MeetingItem;
          cleanup.track(`/meetings/${createdBody.id}`, token);
          expect(createdBody.participants).toEqual(participants);

          // Read back through the by-id route: proves the value is stored, not merely echoed.
          const byId = await request.get(`/meetings/${createdBody.id}`, { headers });
          expect(byId.status()).toBe(200);

          const byIdBody = (await byId.json()) as MeetingItem;
          expect(byIdBody.participants).toEqual(participants);
        } finally {
          await cleanup.run();
        }
      },
    );

    // The delete cases target only meetings they create themselves, never a seeded row: a broken
    // ownership `where` must fail one case, not destroy the read-only seed.
    test(
      'MD-API-09 — DELETE /meetings/:id answers 204 empty, and the meeting is gone',
      { tag: ['@p0', '@mutating'] },
      async ({ request, cleanup }) => {
        try {
          const token = await loginApi(request, 'planner');
          const headers = authHeaders(token);

          const title = uniqueTitle('E2E delete meeting');
          const id = await createDeleteTarget(
            request,
            token,
            title,
            cleanup,
            MEETING_NOT_FOUND_BODY,
          );

          const deleted = await request.delete(`/meetings/${id}`, { headers });
          // A Nest `@Delete` defaults to 200: the status pins the `@HttpCode`.
          expect(deleted.status()).toBe(204);
          expect(await deleted.text()).toBe('');

          const byId = await request.get(`/meetings/${id}`, { headers });
          expect(byId.status()).toBe(404);
          expect((await byId.json()) as ErrorBody).toEqual(MEETING_NOT_FOUND_BODY);

          const page = await readPage(request, headers, '?limit=100');
          expect((page.items ?? []).map((item) => item.id)).not.toContain(id);
          expect((page.items ?? []).map((item) => item.title)).not.toContain(title);

          const second = await request.delete(`/meetings/${id}`, { headers });
          expect(second.status(), 'a deleted record is indistinguishable from an absent one').toBe(
            404,
          );
          expect((await second.json()) as ErrorBody).toEqual(MEETING_NOT_FOUND_BODY);
        } finally {
          await cleanup.run();
        }
      },
    );

    test(
      "MD-API-10 — another owner's DELETE gives the absent id's 404 and the meeting survives",
      { tag: ['@p0', '@mutating'] },
      async ({ request, cleanup }) => {
        try {
          const token = await loginApi(request, 'planner');
          const headers = authHeaders(token);
          const studentHeaders = await authHeadersFor(request, 'student');

          // The owner's own delete is the control that a route answering 404 to everyone fails.
          const id = await createDeleteTarget(
            request,
            token,
            uniqueTitle('E2E foreign delete'),
            cleanup,
            null,
          );

          const before = await request.get(`/meetings/${id}`, { headers });
          expect(before.status()).toBe(200);
          const beforeBody = (await before.json()) as MeetingItem;

          const foreign = await request.delete(`/meetings/${id}`, { headers: studentHeaders });
          const absent = await request.delete(`/meetings/${id}-does-not-exist`, {
            headers: studentHeaders,
          });

          expect(foreign.status(), "another owner's meeting").toBe(404);
          expect(absent.status(), 'a derived, never-issued id').toBe(404);

          const foreignBody = (await foreign.json()) as ErrorBody;
          const absentBody = (await absent.json()) as ErrorBody;
          expect(absentBody).toEqual(MEETING_NOT_FOUND_BODY);
          // Unowned is indistinguishable from absent on the write path too (`ADR-0018`).
          expect(foreignBody).toEqual(absentBody);

          const after = await request.get(`/meetings/${id}`, { headers });
          expect(after.status(), 'the foreign DELETE removed nothing').toBe(200);
          expect((await after.json()) as MeetingItem).toEqual(beforeBody);
        } finally {
          await cleanup.run();
        }
      },
    );

    test(
      'MD-API-11 — DELETE /meetings/:id without a token gives 401 and the meeting survives',
      { tag: ['@p0', '@mutating'] },
      async ({ request, cleanup }) => {
        try {
          const token = await loginApi(request, 'planner');
          const headers = authHeaders(token);

          const id = await createDeleteTarget(
            request,
            token,
            uniqueTitle('E2E unauthenticated delete'),
            cleanup,
            null,
          );

          const variants: { label: string; headers: Record<string, string> }[] = [
            { label: 'no Authorization header', headers: {} },
            { label: 'Authorization: Bearer with no value', headers: { Authorization: 'Bearer' } },
          ];

          for (const variant of variants) {
            const response = await request.delete(`/meetings/${id}`, { headers: variant.headers });

            expect(response.status(), variant.label).toBe(401);
            expect((await response.json()) as ErrorBody, variant.label).toEqual({
              message: UNAUTHORIZED,
              error: 'Unauthorized',
              statusCode: 401,
            });
          }

          const after = await request.get(`/meetings/${id}`, { headers });
          expect(after.status(), 'the guard refused before anything was deleted').toBe(200);
          expect(((await after.json()) as MeetingItem).id).toBe(id);
        } finally {
          await cleanup.run();
        }
      },
    );
  });
});
