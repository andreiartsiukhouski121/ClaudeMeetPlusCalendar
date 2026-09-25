import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import type { User } from '../users/user.types.js';
import type { JwtPayload } from './auth.types.js';
import type { UsersService } from '../users/users.service.js';
import { AuthService, INVALID_CREDENTIALS_MESSAGE } from './auth.service.js';
import type { PasswordService } from './password.service.js';
import type { TokenService } from './token.service.js';

/**
 * Cases AL-UT-01…08 and AL-UT-31 from `e2e/regression/auth-login/auth-login.unit.cases.md`.
 *
 * Dependencies are passed by hand instead of `Test.createTestingModule`: a unit needs mocks, not a
 * container, and this keeps the test independent of decorator metadata emission.
 */
describe('AuthService', () => {
  const PLAIN_PASSWORD = 'Passw0rd!';
  const TEACHER: User = {
    id: 'usr-teacher',
    email: 'teacher@purpleschool.test',
    name: 'Anna Teacher',
    passwordHash: `scrypt$${'aa'.repeat(16)}$${'bb'.repeat(64)}`,
  };

  interface HarnessOptions {
    /** `null` means "user not found": `undefined` would mean "take the default". */
    user?: User | null;
    findByEmailError?: Error;
    passwordValid?: boolean;
    token?: string;
  }

  function createHarness({
    user = TEACHER,
    findByEmailError,
    passwordValid = true,
    token = 'signed.jwt.token',
  }: HarnessOptions = {}) {
    const findByEmail = vi.fn((): User | undefined => {
      if (findByEmailError !== undefined) {
        throw findByEmailError;
      }
      return user ?? undefined;
    });
    // Arguments are recorded rather than read back from `.mock.calls`: a mock without typed
    // parameters gets an empty argument tuple, and `calls[0][1]` fails tsc.
    const verifiedHashes: string[] = [];
    const verify = vi.fn((_plain: string, stored: string) => {
      verifiedHashes.push(stored);
      return passwordValid;
    });
    const signedPayloads: JwtPayload[] = [];
    const sign = vi.fn((payload: JwtPayload) => {
      signedPayloads.push(payload);
      return Promise.resolve(token);
    });

    const service = new AuthService(
      { findByEmail } as unknown as UsersService,
      { verify } as unknown as PasswordService,
      { sign } as unknown as TokenService,
    );

    return { service, findByEmail, verify, sign, signedPayloads, verifiedHashes };
  }

  it('AL-UT-01 — login with a valid email and password returns accessToken and a user without passwordHash', async () => {
    const { service } = createHarness();

    const result = await service.login({ email: TEACHER.email, password: PLAIN_PASSWORD });

    expect(result.accessToken).toBe('signed.jwt.token');
    expect(result.user).toEqual({ id: TEACHER.id, email: TEACHER.email, name: TEACHER.name });
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(JSON.stringify(result)).not.toContain('scrypt');
  });

  it('AL-UT-02 — a wrong password throws UnauthorizedException with the invalid-credentials message', async () => {
    const { service } = createHarness({ passwordValid: false });

    const failure = service.login({ email: TEACHER.email, password: 'wrong-password' });

    await expect(failure).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(failure).rejects.toThrow(INVALID_CREDENTIALS_MESSAGE);
  });

  it('AL-UT-03 — an unknown email throws the same exception with the same message as a wrong password', async () => {
    const wrongPassword = await createHarness({ passwordValid: false })
      .service.login({ email: TEACHER.email, password: 'wrong-password' })
      .catch((error: unknown) => error);
    const unknownEmail = await createHarness({ user: null })
      .service.login({ email: 'nobody@purpleschool.test', password: PLAIN_PASSWORD })
      .catch((error: unknown) => error);

    expect(unknownEmail).toBeInstanceOf(UnauthorizedException);
    expect(wrongPassword).toBeInstanceOf(UnauthorizedException);
    // The response must not reveal whether the account exists: one message for both cases.
    expect((unknownEmail as Error).message).toBe((wrongPassword as Error).message);
    expect((unknownEmail as Error).message).toBe(INVALID_CREDENTIALS_MESSAGE);
  });

  it('AL-UT-04 — accessToken comes from the token service, it is not assembled as a string', async () => {
    const { service, sign } = createHarness({ token: 'token-from-token-service' });

    const result = await service.login({ email: TEACHER.email, password: PLAIN_PASSWORD });

    expect(sign).toHaveBeenCalledTimes(1);
    expect(result.accessToken).toBe('token-from-token-service');
  });

  it('AL-UT-05 — the email is normalized (trim + lowercase) before the user lookup', async () => {
    const { service, findByEmail } = createHarness();

    await service.login({ email: '  TEACHER@Purpleschool.TEST  ', password: PLAIN_PASSWORD });

    expect(findByEmail).toHaveBeenCalledWith(TEACHER.email);
  });

  it('AL-UT-06 — the password is checked by the verify function against the stored hash, not compared to plaintext', async () => {
    const { service, verify } = createHarness();

    await service.login({ email: TEACHER.email, password: PLAIN_PASSWORD });

    expect(verify).toHaveBeenCalledTimes(1);
    expect(verify).toHaveBeenCalledWith(PLAIN_PASSWORD, TEACHER.passwordHash);
  });

  it('AL-UT-07 — the token payload carries sub and email and no password hash', async () => {
    const { service, signedPayloads } = createHarness();

    await service.login({ email: TEACHER.email, password: PLAIN_PASSWORD });

    expect(signedPayloads).toHaveLength(1);
    const payload = signedPayloads[0];

    expect(Object.keys(payload).sort()).toEqual(['email', 'sub']);
    expect(payload.sub).toBe(TEACHER.id);
    expect(payload.email).toBe(TEACHER.email);
    expect(JSON.stringify(payload)).not.toContain('scrypt');
  });

  it('AL-UT-08 — a storage failure propagates as is instead of turning into a 401', async () => {
    const storageFailure = new Error('users storage is down');
    const { service } = createHarness({ findByEmailError: storageFailure });

    const failure = service.login({ email: TEACHER.email, password: PLAIN_PASSWORD });

    // A storage outage must not look like a wrong password, or the incident becomes
    // indistinguishable from an ordinary typo.
    await expect(failure).rejects.toBe(storageFailure);
    await expect(failure).rejects.not.toBeInstanceOf(UnauthorizedException);
  });

  it('AL-UT-31 — an unknown email still verifies a password, keeping response time flat', async () => {
    const { service, verify, verifiedHashes } = createHarness({ user: null });

    const failure = service.login({ email: 'nobody@purpleschool.test', password: PLAIN_PASSWORD });
    await expect(failure).rejects.toBeInstanceOf(UnauthorizedException);

    // Without this call an unknown email answers faster than a wrong password and the identical
    // message stops being enough. Measured before the fix: 52 ms vs 86–114 ms (SEC-API-05).
    expect(verify).toHaveBeenCalledTimes(1);
    expect(verifiedHashes).toHaveLength(1);
    // The dummy hash has a real format: an empty string would be rejected on format instantly and
    // the timing would not line up.
    expect(verifiedHashes[0]).toMatch(/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
    expect(verifiedHashes[0]).not.toBe(TEACHER.passwordHash);
  });
});
