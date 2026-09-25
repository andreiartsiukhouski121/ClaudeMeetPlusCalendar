import { expect, test } from '@playwright/test';

import { authHeaders, loginApi } from '../../fixtures/auth.api.js';
import { SEED_USERS } from '../../fixtures/seed.js';

/**
 * Contract of `POST /auth/login` and `GET /auth/me`. Cases live in the paired
 * `auth-login.api.cases.md`; every test title starts with its case ID.
 *
 * Project `api`: the `request` fixture, `baseURL = http://127.0.0.1:3101`, no browser. Paths are
 * relative — an absolute URL in a spec bypasses the project `baseURL` and sends the run to another
 * port.
 *
 * Logins and passwords come only from `fixtures/seed.ts`: hard-coding them is a blocker.
 */

const TEACHER = SEED_USERS.teacher;

/** Nest error body shape, derived from `HttpException.createBody`. */
interface ErrorBody {
  message: string | string[];
  error: string;
  statusCode: number;
}

interface LoginBody {
  accessToken?: unknown;
  user?: { id?: unknown; email?: unknown; name?: unknown };
}

const INVALID_CREDENTIALS = 'Invalid email or password';
const UNAUTHORIZED = 'Authentication required';

test.describe('Login: API contract', { tag: ['@regression', '@auth-login'] }, () => {
  test('AL-API-01 — a successful login returns a token', { tag: '@p0' }, async ({ request }) => {
    const response = await request.post('/auth/login', {
      data: { email: TEACHER.email, password: TEACHER.password },
    });

    // 200, not 201: Nest answers POST with 201 by default, and without
    // @HttpCode(HttpStatus.OK) the contract is broken.
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');

    const body = (await response.json()) as LoginBody;

    expect(typeof body.accessToken).toBe('string');
    expect(String(body.accessToken).length).toBeGreaterThan(0);
    expect(String(body.accessToken).split('.')).toHaveLength(3);
  });

  test(
    'AL-API-02 — a wrong password gives 401 in the standard error shape',
    { tag: '@p0' },
    async ({ request }) => {
      const response = await request.post('/auth/login', {
        data: { email: TEACHER.email, password: 'wrong-password' },
      });

      expect(response.status()).toBe(401);

      const body = (await response.json()) as ErrorBody & LoginBody;

      // `message` is a string here, not an array: arrays only come from ValidationPipe errors.
      expect(typeof body.message).toBe('string');
      expect(body).toEqual({
        message: INVALID_CREDENTIALS,
        error: 'Unauthorized',
        statusCode: 401,
      });
      expect(body.accessToken).toBeUndefined();

      const text = await response.text();
      expect(text).not.toContain('stack');
      expect(text).not.toContain('apps/api');
    },
  );

  test(
    'AL-API-03 — an unknown email gives 401 with the same message',
    { tag: '@p0' },
    async ({ request }) => {
      const unknownEmail = await request.post('/auth/login', {
        data: { email: 'nobody@purpleschool.test', password: TEACHER.password },
      });
      const wrongPassword = await request.post('/auth/login', {
        data: { email: TEACHER.email, password: 'wrong-password' },
      });

      expect(unknownEmail.status()).toBe(401);
      expect(wrongPassword.status()).toBe(401);

      const unknownBody = (await unknownEmail.json()) as ErrorBody;
      const wrongBody = (await wrongPassword.json()) as ErrorBody;

      // The response must not reveal whether the account exists — a security requirement.
      expect(unknownBody.message).toBe(wrongBody.message);
      expect(unknownBody.message).toBe(INVALID_CREDENTIALS);
    },
  );

  test('AL-API-04 — missing and empty fields give 400', async ({ request }) => {
    const withoutPassword = await request.post('/auth/login', { data: { email: TEACHER.email } });
    const withoutEmail = await request.post('/auth/login', {
      data: { password: TEACHER.password },
    });
    const bothEmpty = await request.post('/auth/login', { data: { email: '', password: '' } });

    // Validation runs before authentication, so neither 401 nor 500 is possible here.
    expect(withoutPassword.status()).toBe(400);
    expect(withoutEmail.status()).toBe(400);
    expect(bothEmpty.status()).toBe(400);

    const withoutPasswordBody = (await withoutPassword.json()) as ErrorBody;
    const withoutEmailBody = (await withoutEmail.json()) as ErrorBody;
    const bothEmptyBody = (await bothEmpty.json()) as ErrorBody;

    expect(Array.isArray(withoutPasswordBody.message)).toBe(true);
    expect(withoutPasswordBody.message.toString()).toContain('password');
    expect(Array.isArray(withoutEmailBody.message)).toBe(true);
    expect(withoutEmailBody.message.toString()).toContain('email');
    expect(Array.isArray(bothEmptyBody.message)).toBe(true);
    expect(bothEmptyBody.message.toString()).toContain('email');
    expect(bothEmptyBody.message.toString()).toContain('password');
  });

  test('AL-API-07 — an invalid email format and a wrong password type give 400', async ({
    request,
  }) => {
    const badEmail = await request.post('/auth/login', {
      data: { email: 'not-an-email', password: TEACHER.password },
    });
    const numericPassword = await request.post('/auth/login', {
      data: { email: TEACHER.email, password: 12345 },
    });

    expect(badEmail.status()).toBe(400);
    expect(numericPassword.status()).toBe(400);

    const badEmailBody = (await badEmail.json()) as ErrorBody;
    const numericPasswordBody = (await numericPassword.json()) as ErrorBody;

    expect(Array.isArray(badEmailBody.message)).toBe(true);
    expect(badEmailBody.message.toString()).toContain('email must be an email');
    expect(Array.isArray(numericPasswordBody.message)).toBe(true);
    expect(numericPasswordBody.message.toString()).toContain('password must be a string');
  });

  test('AL-API-08 — an extra field is rejected by forbidNonWhitelisted', async ({ request }) => {
    const response = await request.post('/auth/login', {
      data: { email: TEACHER.email, password: TEACHER.password, role: 'admin' },
    });

    expect(response.status()).toBe(400);

    const body = (await response.json()) as ErrorBody & LoginBody;

    expect(body.message.toString()).toContain('property role should not exist');
    expect(body.accessToken).toBeUndefined();
  });

  test('AL-API-10 — the email is case insensitive', async ({ request }) => {
    const response = await request.post('/auth/login', {
      data: { email: TEACHER.email.toUpperCase(), password: TEACHER.password },
    });

    expect(response.status()).toBe(200);

    const body = (await response.json()) as LoginBody;
    expect(typeof body.accessToken).toBe('string');

    const me = await request.get('/auth/me', { headers: authHeaders(String(body.accessToken)) });

    expect(me.status()).toBe(200);

    const meBody = (await me.json()) as { email?: unknown };
    // The canonical seeded email is returned, not whatever the client sent.
    expect(meBody.email).toBe(TEACHER.email);
  });

  test('AL-API-11 — the response carries no password', { tag: '@p0' }, async ({ request }) => {
    const response = await request.post('/auth/login', {
      data: { email: TEACHER.email, password: TEACHER.password },
    });

    expect(response.status()).toBe(200);

    // The response text rather than the parsed object: a serialized hash could hide in a nested
    // field that a key-based assertion would miss.
    const text = await response.text();

    expect(text.toLowerCase()).not.toContain('password');
    expect(text).not.toContain(TEACHER.password);
    expect(text).not.toContain('scrypt');
  });

  test('AL-API-13 — GET /auth/me with a valid token returns the profile', async ({ request }) => {
    const token = await loginApi(request, 'teacher');

    const response = await request.get('/auth/me', { headers: authHeaders(token) });

    expect(response.status()).toBe(200);

    const body = (await response.json()) as { id?: unknown; email?: unknown };

    expect(typeof body.id).toBe('string');
    expect(body.email).toBe(TEACHER.email);
    expect(body).not.toHaveProperty('password');
    expect(body).not.toHaveProperty('passwordHash');
  });

  test(
    'AL-API-14 — GET /auth/me without a token gives 401',
    { tag: '@p0' },
    async ({ request }) => {
      const response = await request.get('/auth/me');

      expect(response.status()).toBe(401);

      const body = (await response.json()) as ErrorBody & { email?: unknown };

      expect(body).toEqual({ message: UNAUTHORIZED, error: 'Unauthorized', statusCode: 401 });
      expect(body.email).toBeUndefined();
    },
  );

  test('AL-API-15 — an invalid token on /auth/me gives 401, not 500', async ({ request }) => {
    const response = await request.get('/auth/me', { headers: authHeaders('not.a.jwt') });

    // 401 specifically: a broken token is a refusal, not a server fault.
    expect(response.status()).toBe(401);

    const body = (await response.json()) as ErrorBody;

    expect(body).toEqual({ message: UNAUTHORIZED, error: 'Unauthorized', statusCode: 401 });
  });
});
