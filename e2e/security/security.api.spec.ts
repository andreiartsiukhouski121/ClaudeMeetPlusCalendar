import { createHmac } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';

import { expect, test, type APIRequestContext } from '@playwright/test';

import { loginApi, authHeaders } from '../fixtures/auth.api.js';
import { buildMultipartBody } from '../fixtures/multipart.js';
import {
  FUTURE_STARTS_AT_ISO,
  GEOMETRY_WORKSHOP_TITLE,
  HEADER_SAFETY_MEETING,
  SEED_USERS,
} from '../fixtures/seed.js';

/**
 * Cross-feature security invariants. Cases live in the paired `security.api.cases.md`.
 *
 * How this differs from checks inside a feature: `AL-API-14` pins that `GET /auth/me` without a
 * token gives 401 — that is the login contract. Here we check that **no** protected route answers
 * without a token, including routes that did not exist when this was written: add a route, add a
 * line to `PROTECTED_ROUTES`, and the case picks it up (invariant 16).
 *
 * Project `api`: no browser, `baseURL` = `http://127.0.0.1:3101`.
 */

/** Protected routes. Adding a guarded endpoint means adding a line here. */
const PROTECTED_ROUTES = [
  { method: 'GET' as const, path: '/auth/me' },
  { method: 'GET' as const, path: '/meetings?limit=3' },
  { method: 'POST' as const, path: '/meetings' },
  /*
   * The literal `:id`, not a concrete id: `AR-API-06` builds the route from the decorators
   * (`@Controller('meetings')` + `@Get(':id')`) and compares that string, and the guard answers
   * 401 before the handler ever parses the parameter.
   */
  { method: 'GET' as const, path: '/meetings/:id' },
  /*
   * The three `meeting-files` routes, guarded by the same `JwtAuthGuard` on
   * `MeetingFilesController`. The upload is walked here as an ordinary POST with an empty JSON
   * body: the guard answers 401 before `FileInterceptor` ever looks for a part, so the body shape
   * is immaterial to this case — it is not immaterial to `SEC-API-07`, which is why that one grew
   * a branch rather than a row.
   */
  { method: 'POST' as const, path: '/meetings/:id/files' },
  { method: 'GET' as const, path: '/meetings/:id/files' },
  { method: 'GET' as const, path: '/meetings/:id/files/:fileId/content' },
];

/**
 * POST routes with a **JSON** DTO — to check `forbidNonWhitelisted` is on globally.
 *
 * `POST /meetings/:id/files` is deliberately absent: `callRoute` and the walker below send a JSON
 * object, and a JSON body on the upload route is parsed as multipart-less and answers
 * `['file is required']`, never `property … should not exist`. A row here would therefore walk
 * green while checking nothing. It is covered by the second branch of `SEC-API-07` instead.
 */
const POST_ROUTES = [
  {
    path: '/auth/login',
    valid: { email: SEED_USERS.teacher.email, password: SEED_USERS.teacher.password },
    needsToken: false,
  },
  {
    path: '/meetings',
    valid: { title: 'Whitelist check', startsAt: FUTURE_STARTS_AT_ISO },
    needsToken: true,
  },
];

/** Values that must appear in no response. */
const SECRET_MARKERS = ['scrypt', 'passwordHash', 'password', SEED_USERS.teacher.password];

async function callRoute(
  request: APIRequestContext,
  route: { method: 'GET' | 'POST'; path: string },
  headers: Record<string, string> = {},
) {
  return route.method === 'GET'
    ? request.get(route.path, { headers })
    : request.post(route.path, { headers, data: {} });
}

test.describe('Security: API', { tag: '@security' }, () => {
  test(
    'SEC-API-01 — every protected endpoint requires a token',
    { tag: '@p0' },
    async ({ request }) => {
      // The type is explicit: inference would give a union that does not fit
      // `Record<string, string>` in the request options.
      const headerVariants: Record<string, string>[] = [{}, { Authorization: 'Bearer' }];

      for (const route of PROTECTED_ROUTES) {
        for (const headers of headerVariants) {
          const response = await callRoute(request, route, headers);

          expect(
            response.status(),
            `${route.method} ${route.path} must answer 401 without a valid token`,
          ).toBe(401);

          const body = await response.text();
          // Not only the status but the absence of a payload: a 401 with data is a leak too.
          expect(body).not.toContain('accessToken');
          expect(body).not.toContain('items');
          expect(body).not.toContain(SEED_USERS.teacher.email);
        }
      }
    },
  );

  test('SEC-API-02 — a forged token gives 401, not 500', { tag: '@p0' }, async ({ request }) => {
    const valid = await loginApi(request, 'teacher');

    for (const header of brokenAuthorizationHeaders(valid)) {
      const response = await request.get('/auth/me', { headers: { Authorization: header } });

      // A 500 would mean the token parsing exception reached the error handler.
      expect(response.status(), `header "${header.slice(0, 24)}…" must give 401`).toBe(401);
    }
  });

  test(
    'SEC-API-03 — a token signed with a different secret is rejected',
    { tag: '@p0' },
    async ({ request }) => {
      const base64url = (value: object) =>
        Buffer.from(JSON.stringify(value)).toString('base64url').replace(/=+$/, '');

      const header = base64url({ alg: 'HS256', typ: 'JWT' });
      const payload = base64url({
        sub: 'usr-teacher',
        email: SEED_USERS.teacher.email,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      const signature = createHmac('sha256', 'an-entirely-different-secret')
        .update(`${header}.${payload}`)
        .digest('base64url')
        .replace(/=+$/, '');

      const response = await request.get('/auth/me', {
        headers: authHeaders(`${header}.${payload}.${signature}`),
      });

      // The signature is arithmetically valid here — this checks the secret is verified at all.
      expect(response.status()).toBe(401);
    },
  );

  test(
    'SEC-API-04 — no response carries a hash or a password',
    { tag: '@p0' },
    async ({ request }) => {
      const token = await loginApi(request, 'teacher');
      const responses = [
        await request.post('/auth/login', {
          data: { email: SEED_USERS.teacher.email, password: SEED_USERS.teacher.password },
        }),
        await request.get('/auth/me', { headers: authHeaders(token) }),
        await request.get('/meetings?limit=3', { headers: authHeaders(token) }),
      ];

      for (const response of responses) {
        // The text rather than the parsed object: parsing would miss a secret in a nested field
        // or inside an error message.
        const body = await response.text();

        for (const marker of SECRET_MARKERS) {
          expect(body, `response ${response.url()} contains "${marker}"`).not.toContain(marker);
        }
      }
    },
  );

  test(
    'SEC-API-05 — response time does not reveal that an account exists',
    { tag: '@p0' },
    async ({ request }) => {
      const attempt = async (email: string): Promise<number> => {
        const started = Date.now();
        const response = await request.post('/auth/login', {
          data: { email, password: 'definitely-wrong-password' },
        });
        const elapsed = Date.now() - started;

        expect(response.status()).toBe(401);

        return elapsed;
      };

      /*
       * The samples are INTERLEAVED rather than taken in blocks of five.
       *
       * The first version measured five unknown-email requests and then five wrong-password ones,
       * so the first block carried the warm-up of the whole request path and the second caught any
       * machine load drift. The test failed in roughly half the runs (a ratio of 2.518 against a
       * threshold of 2.5 was recorded) and produced a false report of "the timing vulnerability is
       * back" — the worst kind of flake, one that sends you hunting a hole that does not exist.
       * Interleaving cancels both warm-up and drift.
       */
      const unknownSamples: number[] = [];
      const wrongPasswordSamples: number[] = [];

      // The first pair is a warm-up and its result is discarded.
      await attempt('nobody@purpleschool.test');
      await attempt(SEED_USERS.teacher.email);

      for (let i = 0; i < 7; i += 1) {
        unknownSamples.push(await attempt('nobody@purpleschool.test'));
        wrongPasswordSamples.push(await attempt(SEED_USERS.teacher.email));
      }

      const median = (samples: number[]): number =>
        [...samples].sort((a, b) => a - b)[Math.floor(samples.length / 2)];

      const unknownAccount = median(unknownSamples);
      const wrongPassword = median(wrongPasswordSamples);

      /*
       * A threshold of 3 is deliberately loose: the case exists to catch a return of the early
       * exit without password verification, not to measure microseconds. Before the fix the
       * measurement was 52 ms against 86–114 ms, a ratio of about 2 under level conditions — a
       * defect of that size is caught by 3, while machine noise is not.
       */
      const ratio =
        Math.max(unknownAccount, wrongPassword) /
        Math.max(1, Math.min(unknownAccount, wrongPassword));

      expect(
        ratio,
        `medians: unknown email ${unknownAccount} ms, wrong password ${wrongPassword} ms ` +
          `(samples ${JSON.stringify(unknownSamples)} and ${JSON.stringify(wrongPasswordSamples)}) — ` +
          'the difference reveals that the account exists',
      ).toBeLessThan(3);
    },
  );

  test('SEC-API-06 — error bodies carry no stack trace and no file paths', async ({ request }) => {
    const token = await loginApi(request, 'teacher');
    const errors = [
      await request.post('/auth/login', { data: { email: 'not-an-email' } }),
      await request.get('/meetings'),
      await request.get('/definitely-no-such-route'),
      /*
       * The fourth sample is not a duplicate of the third. The third 404 comes from Nest's own
       * not-found handler and can never lose a key; this one is thrown by our controller, and
       * `ADR-0018` makes the ARGUMENT form of `NotFoundException` mandatory precisely because the
       * no-argument form answers with two keys only — `message` and `statusCode`, no `error`.
       * Without a sample that reaches a handler-thrown 404, that rule is guarded by one feature
       * case and a no-argument form on the next resource passes the cross-feature suite unseen.
       *
       * The token must be valid, or the guard answers 401 and the controller never runs. The id
       * is one no meeting has: `:id` carries no pipe, so a malformed id is simply an unknown one.
       */
      await request.get('/meetings/no-such-meeting-id', { headers: authHeaders(token) }),
    ];

    for (const response of errors) {
      const body = await response.text();

      expect(body).not.toContain('stack');
      expect(body).not.toContain('node_modules');
      expect(body).not.toContain('.ts:');
      expect(body).not.toMatch(/\bat\s+\w+\s+\(/); // a trace line like "at fn ("
      expect(body).not.toMatch(/[A-Za-z]:\\/); // an absolute Windows path

      const parsed: unknown = JSON.parse(body);
      expect(Object.keys(parsed as object).sort()).toEqual(['error', 'message', 'statusCode']);
    }
  });

  test('SEC-API-07 — extra fields are rejected on every POST endpoint', async ({ request }) => {
    const token = await loginApi(request, 'planner');

    for (const route of POST_ROUTES) {
      const response = await request.post(route.path, {
        headers: route.needsToken ? authHeaders(token) : {},
        data: { ...route.valid, isAdmin: true, ownerId: 'usr-teacher' },
      });

      expect(response.status(), `${route.path} must reject extra fields`).toBe(400);
      expect(await response.text()).toContain('should not exist');
    }

    /*
     * The multipart branch. The JSON arm above is untouched on purpose — a reviewer can see in the
     * diff that the existing routes are still walked exactly as they were.
     *
     * What this adds over the JSON arm: `UploadFileDto` declares **no** properties, so nothing on
     * that route is whitelisted by a decorator. The whole guarantee rests on the global pipe's
     * `whitelist` + `forbidNonWhitelisted` seeing a text part of a multipart body at all — if the
     * pipe were ever registered per-controller, or the DTO parameter dropped, an extra text part
     * would be silently ignored rather than refused.
     *
     * A real meeting owned by the caller, not a made-up id: validation currently runs before the
     * ownership lookup, so a fabricated id would pass today — and would keep passing if the extra
     * field were accepted and the request then failed with 404 for an unrelated reason. Against an
     * owned meeting a 400 can only mean the part was refused.
     */
    const meetingId = await createOwnMeeting(request, token);

    const multipart = await request.post(`/meetings/${meetingId}/files`, {
      headers: {
        ...authHeaders(token),
        'content-type': `multipart/form-data; boundary=${MULTIPART_BOUNDARY}`,
      },
      data: buildMultipartBody(
        [
          {
            name: 'file',
            filename: 'upload.txt',
            contentType: 'text/plain',
            content: 'legal bytes',
          },
          { name: 'label', content: 'anything' },
        ],
        MULTIPART_BOUNDARY,
      ),
    });

    expect(
      multipart.status(),
      'POST /meetings/:id/files must reject a text part absent from the DTO',
    ).toBe(400);

    // The whole body: invariant 8 makes `message` an array for a `ValidationPipe` 400, and the
    // extra part must be named — "400 for some reason" would also be satisfied by a broken route.
    expect(await multipart.json()).toEqual({
      message: ['property label should not exist'],
      error: 'Bad Request',
      statusCode: 400,
    });
  });

  test('SEC-API-08 — responses do not disclose the server stack', async ({ request }) => {
    for (const response of [
      await request.get('/'),
      await request.post('/auth/login', { data: {} }),
    ]) {
      const headers = response.headers();

      // Express sends X-Powered-By by default — a hint about which stack and CVEs to try.
      expect(headers, `response ${response.url()} discloses the stack`).not.toHaveProperty(
        'x-powered-by',
      );
    }
  });

  test(
    'SEC-API-09 — a user data is unreachable with someone else token',
    { tag: '@p0' },
    async ({ request }) => {
      const teacherToken = await loginApi(request, 'teacher');
      const studentToken = await loginApi(request, 'student');

      const idsOf = async (token: string): Promise<string[]> => {
        const response = await request.get('/meetings?limit=100', { headers: authHeaders(token) });
        await expect(response).toBeOK();
        const body = (await response.json()) as { items: { id: string }[] };

        return body.items.map((item) => item.id);
      };

      /**
       * Ids of the teacher's meetings that a request **by id** with the student's token gives
       * away. The by-id route must answer 404 for every one of them, and the body must not echo
       * the id back either: a 404 that quotes the record still confirms it exists.
       *
       * The bodies are collected first and filtered afterwards because a condition inside a test
       * body is forbidden by `playwright/no-conditional-in-test`.
       */
      const idsLeakedById = async (token: string, ids: string[]): Promise<string[]> => {
        const bodies: string[] = [];

        for (const id of ids) {
          const response = await request.get(`/meetings/${id}`, { headers: authHeaders(token) });

          expect(
            response.status(),
            `GET /meetings/${id} with another user's token must answer 404`,
          ).toBe(404);

          bodies.push(await response.text());
        }

        return ids.filter((id) => bodies.some((body) => body.includes(id)));
      };

      const teacherIds = await idsOf(teacherToken);
      const studentIds = await idsOf(studentToken);

      expect(teacherIds.length).toBeGreaterThan(0);
      expect(studentIds).toEqual([]);

      /*
       * The control for the by-id half: the owner does reach their own record by id. Without it
       * the next assertion would hold just as well against a route that answers 404 to everyone,
       * including its owner — a broken endpoint would read as a secure one.
       */
      const ownById = await request.get(`/meetings/${teacherIds[0]}`, {
        headers: authHeaders(teacherToken),
      });
      await expect(ownById).toBeOK();
      expect(((await ownById.json()) as { id: string }).id).toBe(teacherIds[0]);

      /*
       * One comparison of id SETS over both routes — that is this case's subject. Whether the two
       * 404s (an id that does not exist and an id owned by someone else) are byte-identical is
       * `ADR-0018`'s promise and is proved in `e2e/regression/meetings-detail/`; it is not
       * re-checked here.
       */
      const reachableByStudent = [
        ...studentIds,
        ...(await idsLeakedById(studentToken, teacherIds)),
      ];

      expect(teacherIds.filter((id) => reachableByStudent.includes(id))).toEqual([]);
    },
  );

  test('SEC-API-10 — the repository holds no secrets and no .env', async () => {
    const offenders = collectSecretOffenders(findRepoRoot());

    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  test(
    'SEC-API-11 — a stored filename cannot break out of a response header',
    { tag: '@p0' },
    async ({ request }) => {
      const plannerHeaders = authHeaders(await loginApi(request, 'planner'));
      const meetingId = await meetingIdByTitle(
        request,
        plannerHeaders,
        HEADER_SAFETY_MEETING.title,
      );
      const hostileFiles = await filesOfMeeting(request, plannerHeaders, meetingId);

      /*
       * A guard against a vacuous pass rather than a duplicate of `SM-API-03`: with an empty
       * listing every assertion below would walk zero responses and the case would go green having
       * checked nothing. Comparing the names character for character is `SM-API-03`'s job.
       */
      expect(
        hostileFiles,
        `"${HEADER_SAFETY_MEETING.title}" must carry the five seeded hostile filenames — ` +
          'see SM-API-03 and e2e/fixtures/seed.ts',
      ).toHaveLength(HEADER_SAFETY_MEETING.filenames.length);

      /*
       * The benign control: `teacher`'s ordinary `syllabus.pdf` — the same builder proved here to
       * leave an unremarkable name unharmed, not only the five hostile ones. `MF-API-06` pins the
       * same exact value from inside the `meeting-files` feature; this is the same row, read as
       * this cross-feature invariant's control rather than as that feature's contract.
       */
      const teacherHeaders = authHeaders(await loginApi(request, 'teacher'));
      const controlMeetingId = await meetingIdByTitle(
        request,
        teacherHeaders,
        GEOMETRY_WORKSHOP_TITLE,
      );
      const controlFiles = (await filesOfMeeting(request, teacherHeaders, controlMeetingId)).filter(
        (file) => file.filename === 'syllabus.pdf',
      );

      expect(
        controlFiles,
        `"${GEOMETRY_WORKSHOP_TITLE}" must carry the seeded syllabus.pdf — see SM-API-03`,
      ).toHaveLength(1);

      const observations = [
        ...(await observeDownloads(request, plannerHeaders, meetingId, hostileFiles)),
        ...(await observeDownloads(request, teacherHeaders, controlMeetingId, controlFiles)),
      ];

      for (const observation of observations) {
        const where =
          `GET the content of ${JSON.stringify(observation.filename)} ` +
          `(status ${String(observation.status)})`;
        const names = observation.headers.map((header) => header.name.toLowerCase());

        /*
         * The open status resolves to 200, every time: RFC 6266's two-parameter pairing can
         * represent any byte sequence, so no stored name is unrepresentable and there is no error
         * case left to accommodate. The `500` this case found on its first run was the defect
         * (`SEC-API-11` design §"the download header is built, never interpolated"); it is now
         * removed and is not a status this case tolerates.
         */
        expect(observation.status, where).toBe(200);

        // The two headers the seeded filenames are literally trying to forge.
        expect(
          names.filter((name) => name === 'x-injected'),
          `${where} answered with an X-Injected header — the filename became a header`,
        ).toEqual([]);
        expect(
          names.filter((name) => name === 'set-cookie'),
          `${where} answered with a Set-Cookie header — the filename became a header`,
        ).toEqual([]);

        // And the general form of the same thing: no header this case did not expect at all.
        expect(
          names.filter((name) => !EXPECTED_DOWNLOAD_HEADERS.has(name)),
          `${where} answered with a header this case does not expect`,
        ).toEqual([]);

        /*
         * No raw CR or LF survives inside a header value. A response that had been split would
         * show up as a forged header name in the assertions above; a value that still carries the
         * control characters shows up here. Between the two there is no room for a second response
         * line to have reached the client.
         */
        expect(
          observation.headers.filter((header) => /[\r\n]/.test(header.value)),
          `${where} carries a raw CR or LF inside a header value`,
        ).toEqual([]);

        const dispositions = observation.headers.filter(
          (header) => header.name.toLowerCase() === 'content-disposition',
        );

        // At most one — and where the row is served, exactly one carrying one `filename=`.
        expect(
          dispositions.length,
          `${where} answered with more than one Content-Disposition header`,
        ).toBeLessThanOrEqual(1);
        expect(
          dispositions.map((header) => (header.value.match(/filename=/g) ?? []).length),
          `${where} answered with a Content-Disposition carrying more than one filename parameter`,
        ).toEqual(dispositions.map(() => 1));

        /*
         * The regression pin on THIS implementation, on top of the class-level invariants above.
         * `buildContentDisposition`
         * (`apps/api/src/meeting-files/meeting-files.content-disposition.ts`) emits one fixed
         * RFC 6266 pairing per stored name — the table in `security.api.cases.md` — and a
         * different, equally valid escaping would fail only this assertion while every invariant
         * above kept holding: the invariants catch the class of defect, this string catches a
         * regression in one implementation of the fix.
         */
        const expectedDisposition = EXPECTED_CONTENT_DISPOSITIONS[observation.filename];

        expect(
          expectedDisposition,
          `${where} — this case has no expected Content-Disposition string for this filename`,
        ).toBeDefined();
        expect(
          dispositions.map((header) => header.value),
          `${where} did not carry the expected Content-Disposition`,
        ).toEqual([expectedDisposition]);
      }
    },
  );
});

/**
 * `Authorization` headers the server must reject.
 *
 * Built by a helper rather than in the test body: branching inside `test` is forbidden by
 * `playwright/no-conditional-in-test`, raised to `error` deliberately — a condition in a test
 * hides an unexercised branch and leaves the test green after checking half of it.
 */
function brokenAuthorizationHeaders(validToken: string): string[] {
  const tamperedSignature = `${validToken.slice(0, -1)}${validToken.at(-1) === 'a' ? 'b' : 'a'}`;

  return [
    `Bearer ${tamperedSignature}`,
    'Bearer not.a.jwt',
    'Bearer ',
    'Basic dXNlcjpwYXNz',
    validToken, // a valid token but without the `Bearer` scheme
  ];
}

/**
 * A meeting owned by the holder of `token`, created for this run. The title carries a random
 * suffix: `fullyParallel` is on, and a fixed title would let two concurrent runs collide.
 */
async function createOwnMeeting(request: APIRequestContext, token: string): Promise<string> {
  const title = `E2E security upload ${String(Date.now())}-${String(Math.floor(Math.random() * 1e6))}`;

  const response = await request.post('/meetings', {
    headers: authHeaders(token),
    data: { title, startsAt: FUTURE_STARTS_AT_ISO },
  });

  expect(response.status(), 'creating the sandbox meeting for SEC-API-07 must succeed').toBe(201);

  return ((await response.json()) as { id: string }).id;
}

// The multipart body builder this case needs — a part with an arbitrary field name alongside a
// plain text part — lives in `e2e/fixtures/multipart.ts`, shared with
// `meeting-files.api.spec.ts`'s own, fuller set of multipart cases.
const MULTIPART_BOUNDARY = 'secApi07Boundary4d81b0e6';

/** Directories the secret scan skips: not our code, or build artifacts. */
const SECRET_SCAN_SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'coverage',
  'test-results',
  'playwright-report',
  'blob-report',
]);

const SCANNED_EXTENSIONS = /\.(ts|tsx|js|mjs|cjs|json|md|yaml|yml|css|env|example|mts)$/;

/** Repository files showing signs of secrets. Outside the test for the same reason. */
function collectSecretOffenders(repoRoot: string): string[] {
  const offenders: string[] = [];

  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);

      if (statSync(full).isDirectory()) {
        if (!SECRET_SCAN_SKIP_DIRS.has(entry)) {
          walk(full);
        }
        continue;
      }

      const rel = relative(repoRoot, full).split(sep).join('/');

      // This spec legitimately contains the marker words — otherwise the case would catch itself.
      if (rel === 'e2e/security/security.api.spec.ts') {
        continue;
      }

      if (/(^|\/)\.env($|\.)/.test(rel) && !rel.endsWith('.env.example')) {
        offenders.push(`${rel}: a .env file must not reach the repository`);
        continue;
      }

      if (!SCANNED_EXTENSIONS.test(entry)) {
        continue;
      }

      const content = readFileSync(full, 'utf8');

      if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(content)) {
        offenders.push(`${rel}: a private key`);
      }
      // Looks like a real JWT: three base64 segments, over 80 characters in total.
      if (/\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/.test(content)) {
        offenders.push(`${rel}: a string that looks like an issued JWT`);
      }
    }
  };

  walk(repoRoot);

  return offenders;
}

/**
 * The repository root, found by walking up from `config.rootDir` looking for
 * `pnpm-workspace.yaml`.
 *
 * `config.rootDir` alone will not do: it equals the resolved `testDir`, that is `<repo>/e2e`, and
 * walking from there would find zero files — the case would pass vacuously with any secret
 * committed. The convention meta-test already tripped over exactly this, hence the same formula.
 * `import.meta.dirname` does not work: Playwright loads specs as CJS.
 */
function findRepoRoot(): string {
  let dir = test.info().config.rootDir;

  for (;;) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error(`pnpm-workspace.yaml not found in ${dir} or above`);
    }
    dir = parent;
  }
}

// --- SEC-API-11 -------------------------------------------------------------------------------

/**
 * Headers a download response may legitimately carry: the four the handler sets, what Express and
 * Node add by themselves, and what an error body would carry if a row is refused rather than
 * served. Anything outside this set is a header that got in from somewhere — which is the subject.
 */
const EXPECTED_DOWNLOAD_HEADERS = new Set([
  'cache-control',
  'connection',
  'content-disposition',
  'content-length',
  'content-type',
  'date',
  'etag',
  'keep-alive',
  'transfer-encoding',
  'vary',
  'x-content-type-options',
]);

interface SeededFileRef {
  id: string;
  filename: string;
}

interface DownloadObservation {
  filename: string;
  status: number;
  headers: { name: string; value: string }[];
}

/**
 * The id of a meeting found by its seeded title — never a literal id. Used for both `planner`'s
 * dedicated hostile-filename meeting and `teacher`'s "Geometry workshop" (the benign control): the
 * rows are read back over HTTP rather than through a database client, so the suite stays a black
 * box, with no schema knowledge and no `DATABASE_URL` in the test process
 * (`e2e/fixtures/seed.ts:5-8`).
 */
async function meetingIdByTitle(
  request: APIRequestContext,
  headers: Record<string, string>,
  title: string,
): Promise<string> {
  const response = await request.get('/meetings?limit=100', { headers });

  expect(response.status(), `reading meetings for "${title}" must succeed`).toBe(200);

  const body = (await response.json()) as { items?: { id: string; title: string }[] };
  const match = (body.items ?? []).find((item) => item.title === title);

  expect(match, `The seed must carry a meeting titled "${title}"`).toBeDefined();

  return (match as { id: string }).id;
}

/** The file rows of a meeting — id and filename, as the listing route returns them. */
async function filesOfMeeting(
  request: APIRequestContext,
  headers: Record<string, string>,
  meetingId: string,
): Promise<SeededFileRef[]> {
  const response = await request.get(`/meetings/${meetingId}/files`, { headers });

  expect(response.status(), 'listing the meeting files must succeed').toBe(200);

  return ((await response.json()) as { items?: SeededFileRef[] }).items ?? [];
}

/**
 * The exact `Content-Disposition` value `buildContentDisposition`
 * (`apps/api/src/meeting-files/meeting-files.content-disposition.ts`) emits today, keyed by the
 * stored filename — the regression pin `security.api.cases.md` tables
 * verbatim. `syllabus.pdf` is the benign control shared with `MF-API-06`; the other five are
 * `HEADER_SAFETY_MEETING.filenames`.
 */
const EXPECTED_CONTENT_DISPOSITIONS: Record<string, string> = {
  'syllabus.pdf': `attachment; filename="syllabus.pdf"; filename*=UTF-8''syllabus.pdf`,
  'report".txt': `attachment; filename="report_.txt"; filename*=UTF-8''report%22.txt`,
  'evidence.log\r\nX-Injected: 1':
    `attachment; filename="evidence.log__X-Injected_ 1"; ` +
    `filename*=UTF-8''evidence.log%0D%0AX-Injected%3A%201`,
  'minutes.txt\nSet-Cookie: a=b':
    `attachment; filename="minutes.txt_Set-Cookie_ a_b"; ` +
    `filename*=UTF-8''minutes.txt%0ASet-Cookie%3A%20a%3Db`,
  '../../etc/passwd': `attachment; filename="passwd"; filename*=UTF-8''passwd`,
  'déjà-vu.png': `attachment; filename="d_j_-vu.png"; filename*=UTF-8''d%C3%A9j%C3%A0-vu.png`,
};

/**
 * The RAW headers of every download response. `headersArray()` rather than `headers()`: the latter
 * lower-cases and merges duplicates, and a duplicated `Content-Disposition` is precisely one of the
 * things this case is looking for.
 *
 * The walk is outside the test body because `playwright/no-conditional-in-test` forbids branching
 * there, and because the assertions read better against a collected list than against a live
 * response.
 */
async function observeDownloads(
  request: APIRequestContext,
  headers: Record<string, string>,
  meetingId: string,
  files: SeededFileRef[],
): Promise<DownloadObservation[]> {
  const observations: DownloadObservation[] = [];

  for (const file of files) {
    const response = await request.get(`/meetings/${meetingId}/files/${file.id}/content`, {
      headers,
    });

    observations.push({
      filename: file.filename,
      status: response.status(),
      headers: response.headersArray(),
    });
  }

  return observations;
}
