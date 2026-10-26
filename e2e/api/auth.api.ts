import { expect, type APIRequestContext } from '@playwright/test';
import { SEED_USERS, type PoolUserKey, type SeedUserKey } from '../fixtures/seed.js';

/**
 * API login — the `auth` module of the suite's API layer (`FACT-3758`). `e2e/api/` is outside suite
 * rule 11's scope because a call to `POST /auth/login` needs the seed password.
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

/** The login a pool user (`usr-pool-NN`) answers to; the one password every seeded user shares. */
export function poolCredentials(slotNumber: number): { email: string; password: string } {
  const label = String(slotNumber).padStart(2, '0');
  const { email, password } = SEED_USERS[`pool-${label}` as PoolUserKey];
  return { email, password };
}

/**
 * One uncached `POST /auth/login` for a pool user: the pool builds a user's storage state from it
 * once per run (`FACT-3778`), so a per-worker cache would only hold a token the state file already
 * holds.
 */
export async function loginPoolUser(
  request: APIRequestContext,
  slotNumber: number,
): Promise<string> {
  const { email, password } = poolCredentials(slotNumber);
  const response = await request.post('/auth/login', { data: { email, password } });

  expect(
    response.status(),
    `Login of pool user ${email} failed. The seed has no such user or /auth/login is broken, not ` +
      `the case under test. Response body: ${await response.text()}`,
  ).toBe(200);

  const { accessToken } = (await response.json()) as LoginResponseBody;
  expect(
    typeof accessToken,
    `POST /auth/login for ${email} answered 200, but accessToken is not a string`,
  ).toBe('string');

  return accessToken as string;
}
