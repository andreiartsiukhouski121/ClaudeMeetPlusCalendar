import { describe, expect, it } from 'vitest';

import {
  buildSessionCookieOptions,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from './session-cookie';

/**
 * Session cookie units (`AL-UT-20…22`). The file is named `session.spec.ts` by convention while it
 * actually tests `session-cookie.ts`: `session.ts` itself is `server-only` and touches
 * `next/headers`, so Vitest cannot resolve it (invariant 14).
 *
 * Globals are off in `apps/web`. Every test title starts with its case ID, or
 * `pnpm test:auth-login` cannot filter the feature and meta-test rule 7 cannot confirm the case is
 * automated.
 */
describe('buildSessionCookieOptions', () => {
  it('AL-UT-20 — in development the cookie is httpOnly, path "/", sameSite lax and secure: false', () => {
    const options = buildSessionCookieOptions('development');

    expect(options.httpOnly).toBe(true);
    expect(options.path).toBe('/');
    expect(options.sameSite).toBe('lax');
    // False on purpose: `next dev` serves http, and an unconditional `secure: true` would break
    // the check in any environment where loopback is not trustworthy (invariant 12).
    expect(options.secure).toBe(false);
  });

  it('AL-UT-21 — in production secure is true and the other options are unchanged', () => {
    const production = buildSessionCookieOptions('production');
    const development = buildSessionCookieOptions('development');

    expect(production.secure).toBe(true);
    expect({ ...production, secure: false }).toEqual(development);
  });

  it('AL-UT-22 — SESSION_MAX_AGE_SECONDS is one hour and matches JWT_EXPIRES_IN', () => {
    // 3600 is `JWT_EXPIRES_IN = '1h'`. If these numbers drift apart you get "session alive, token
    // expired": the user is logged in while Nest answers 401.
    expect(SESSION_MAX_AGE_SECONDS).toBe(3600);
    expect(buildSessionCookieOptions(undefined).maxAge).toBe(SESSION_MAX_AGE_SECONDS);
    expect(SESSION_COOKIE_NAME).toBe('ps_session');
  });
});
