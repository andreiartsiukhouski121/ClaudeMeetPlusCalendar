import { describe, expect, it } from 'vitest';

import { ApiError, DEFAULT_API_BASE_URL, resolveApiUrl } from './api-client';

/**
 * API client units (`AL-UT-23…26`): pure URL joining and error text normalization. No network
 * calls here — `apiFetch` is covered end to end by e2e.
 *
 * `api-client.ts` deliberately does not import `server-only` (invariant 14), or this spec would
 * fail on an import Vitest cannot resolve.
 */

/** `API_URL` is a process variable, so edits to it must be rolled back in `finally`. */
function withApiUrl<T>(value: string | undefined, run: () => T): T {
  const previous = process.env.API_URL;
  try {
    if (value === undefined) {
      delete process.env.API_URL;
    } else {
      process.env.API_URL = value;
    }
    return run();
  } finally {
    if (previous === undefined) {
      delete process.env.API_URL;
    } else {
      process.env.API_URL = previous;
    }
  }
}

describe('resolveApiUrl', () => {
  it('AL-UT-23 — joins a base with and without a trailing slash into a single slash', () => {
    expect(resolveApiUrl('/auth/me', 'http://x:3001/')).toBe('http://x:3001/auth/me');
    expect(resolveApiUrl('/auth/me', 'http://x:3001')).toBe('http://x:3001/auth/me');
    // Several slashes in a row and a path without a leading slash normalize the same way.
    expect(resolveApiUrl('auth/me', 'http://x:3001///')).toBe('http://x:3001/auth/me');
  });

  it('AL-UT-24 — honours API_URL from the process environment', () => {
    // This is exactly how Playwright wires Next on :3100 to Nest on :3101 (`webServer.env`):
    // if the function stops reading the variable, the web project drifts to :3001.
    const url = withApiUrl('http://127.0.0.1:3101', () => resolveApiUrl('/auth/login'));

    expect(url).toBe('http://127.0.0.1:3101/auth/login');
  });

  it('AL-UT-25 — without API_URL the base is http://127.0.0.1:3001', () => {
    const url = withApiUrl(undefined, () => resolveApiUrl('/auth/login'));

    expect(DEFAULT_API_BASE_URL).toBe('http://127.0.0.1:3001');
    expect(url).toBe('http://127.0.0.1:3001/auth/login');
  });
});

describe('ApiError', () => {
  it('AL-UT-26 — message is normalized from both a string and an array of strings', () => {
    // 401 from our UnauthorizedException: `message` is a string.
    const unauthorized = ApiError.fromBody(401, {
      message: 'Invalid email or password',
      error: 'Unauthorized',
      statusCode: 401,
    });

    expect(unauthorized.status).toBe(401);
    expect(unauthorized.message).toBe('Invalid email or password');

    // 400 from ValidationPipe: `message` is an array of strings. Without normalization the user
    // would see `[object Object]` instead of text.
    const validation = ApiError.fromBody(400, {
      message: ['email must be an email', 'password should not be empty'],
      error: 'Bad Request',
      statusCode: 400,
    });

    expect(validation.status).toBe(400);
    expect(validation.message).toContain('email must be an email');
    expect(validation.message).toContain('password should not be empty');
    expect(validation.message).not.toContain('[object Object]');

    // A body without `message` (or no JSON at all) must not produce an empty error.
    expect(ApiError.fromBody(500, undefined).message).toBe('HTTP 500');
    expect(ApiError.fromBody(502, { error: 'Bad Gateway' }).message).toBe('HTTP 502');
    expect(ApiError.fromBody(401, undefined)).toBeInstanceOf(Error);
  });
});
