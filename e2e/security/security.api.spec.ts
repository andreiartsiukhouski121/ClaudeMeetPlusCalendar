import { createHmac } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';

import { expect, test, type APIRequestContext } from '@playwright/test';

import { loginApi, authHeaders } from '../fixtures/auth.api.js';
import { FUTURE_STARTS_AT_ISO, SEED_USERS } from '../fixtures/seed.js';

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
];

/** POST routes with a DTO — to check `forbidNonWhitelisted` is on globally. */
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
    const errors = [
      await request.post('/auth/login', { data: { email: 'not-an-email' } }),
      await request.get('/meetings'),
      await request.get('/definitely-no-such-route'),
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

      const teacherIds = await idsOf(teacherToken);
      const studentIds = await idsOf(studentToken);

      expect(teacherIds.length).toBeGreaterThan(0);
      expect(studentIds).toEqual([]);
      expect(teacherIds.filter((id) => studentIds.includes(id))).toEqual([]);
    },
  );

  test('SEC-API-10 — the repository holds no secrets and no .env', async () => {
    const offenders = collectSecretOffenders(findRepoRoot());

    expect(offenders, offenders.join('\n')).toEqual([]);
  });
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
