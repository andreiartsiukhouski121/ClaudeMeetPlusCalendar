import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import type { AuthenticatedRequest, JwtPayload } from './auth.types.js';
import { JwtAuthGuard, UNAUTHORIZED_MESSAGE } from './jwt-auth.guard.js';
import type { TokenService } from './token.service.js';

/**
 * Cases AL-UT-27 and AL-UT-28 from `e2e/regression/auth-login/auth-login.unit.cases.md`. The guard
 * is our own security-relevant code, and the e2e duplicates of header parsing were dropped, so the
 * "no header / not Bearer / unparseable token" branches are checked here.
 */
describe('JwtAuthGuard', () => {
  const PAYLOAD: JwtPayload = { sub: 'usr-teacher', email: 'teacher@purpleschool.test' };

  function createHarness(authorization: string | undefined, payload: JwtPayload | Error) {
    const request = { headers: { authorization } } as unknown as AuthenticatedRequest;
    const verify = vi.fn(() =>
      payload instanceof Error ? Promise.reject(payload) : Promise.resolve(payload),
    );
    const guard = new JwtAuthGuard({ verify } as unknown as TokenService);
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    return { guard, context, request, verify };
  }

  it('AL-UT-27 — a valid Bearer token passes and puts only id and email on request.user', async () => {
    const { guard, context, request, verify } = createHarness('Bearer valid.jwt.token', PAYLOAD);

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(verify).toHaveBeenCalledWith('valid.jwt.token');
    expect(request.user).toEqual({ id: PAYLOAD.sub, email: PAYLOAD.email });
    expect(request.user).not.toHaveProperty('passwordHash');
  });

  it('AL-UT-28 — a missing header, a non-Bearer scheme and an unparseable token all give the same UnauthorizedException', async () => {
    const cases: {
      name: string;
      authorization: string | undefined;
      payload: JwtPayload | Error;
    }[] = [
      { name: 'no header', authorization: undefined, payload: PAYLOAD },
      { name: 'non-Bearer scheme', authorization: 'Basic dXNlcjpwYXNz', payload: PAYLOAD },
      { name: 'empty token', authorization: 'Bearer ', payload: PAYLOAD },
      {
        name: 'unparseable token',
        authorization: 'Bearer not.a.jwt',
        payload: new Error('invalid token'),
      },
    ];

    for (const { name, authorization, payload } of cases) {
      const { guard, context, request } = createHarness(authorization, payload);

      const result = guard.canActivate(context);

      await expect(result, name).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(result, name).rejects.toThrow(UNAUTHORIZED_MESSAGE);
      expect(request.user, name).toBeUndefined();
    }
  });
});
