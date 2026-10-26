import { expect, type APIRequestContext } from '@playwright/test';
import { SEED_USERS, type SeedUserKey } from './seed.js';

/**
 * API login for cases in the `api` project — no browser starts there. UI login lives separately in
 * `auth.fixture.ts`.
 */

/**
 * Per-worker token cache. `POST /auth/login` runs scrypt, and nearly every contract case logs in
 * as `teacher` — without the cache that is dozens of extra hashes per run.
 *
 * A module variable rather than a worker fixture: this file is a plain helper called from specs
 * with any fixture set, and Playwright runs each worker in its own process, so module state is
 * already isolated per worker.
 *
 * Tokens do not expire mid-run: JWT_EXPIRES_IN is '1h' against a 60 s test timeout.
 */
const tokenCache = new Map<SeedUserKey, string>();

interface LoginResponseBody {
  accessToken?: unknown;
}

/**
 * Returns a seeded user's `accessToken`. The 200 expectation lives inside the helper: if the seed
 * did not apply, the helper should fail with a clear message rather than some later assertion
 * tripping over `undefined` in a header.
 */
export async function loginApi(request: APIRequestContext, user: SeedUserKey): Promise<string> {
  const cached = tokenCache.get(user);
  if (cached !== undefined) {
    return cached;
  }

  const { email, password } = SEED_USERS[user];
  const response = await request.post('/auth/login', { data: { email, password } });

  expect(
    response.status(),
    `Login of seeded user ${user} (${email}) failed. This is a seed or /auth/login problem, not ` +
      `the case under test. Response body: ${await response.text()}`,
  ).toBe(200);

  const body = (await response.json()) as LoginResponseBody;
  const { accessToken } = body;

  expect(
    typeof accessToken,
    `POST /auth/login for ${user} answered 200, but accessToken is not a string`,
  ).toBe('string');

  const token = accessToken as string;
  tokenCache.set(user, token);
  return token;
}

/** Bearer headers. A separate function so the scheme is not rewritten in every case. */
export function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

/** Shorthand for the most common case: log in and get the headers straight away. */
export async function authHeadersFor(
  request: APIRequestContext,
  user: SeedUserKey,
): Promise<Record<string, string>> {
  return authHeaders(await loginApi(request, user));
}
