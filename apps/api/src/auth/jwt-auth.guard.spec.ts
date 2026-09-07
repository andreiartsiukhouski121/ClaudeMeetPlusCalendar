import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import type { AuthenticatedRequest, JwtPayload } from './auth.types.js';
import { JwtAuthGuard, UNAUTHORIZED_MESSAGE } from './jwt-auth.guard.js';
import type { TokenService } from './token.service.js';

/**
 * Кейсы AL-UT-27 и AL-UT-28 из `e2e/regression/auth-login/auth-login.unit.cases.md`.
 * Guard — наш код с ролью в безопасности: e2e-повторы разбора заголовка удалены планом,
 * поэтому ветки «нет заголовка / не Bearer / токен не разбирается» проверяются здесь.
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

  it('AL-UT-27 — валидный Bearer-токен: guard пропускает и кладёт в request.user только id и email', async () => {
    const { guard, context, request, verify } = createHarness('Bearer valid.jwt.token', PAYLOAD);

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(verify).toHaveBeenCalledWith('valid.jwt.token');
    expect(request.user).toEqual({ id: PAYLOAD.sub, email: PAYLOAD.email });
    expect(request.user).not.toHaveProperty('passwordHash');
  });

  it('AL-UT-28 — нет заголовка, схема не Bearer и неразбираемый токен дают один и тот же UnauthorizedException', async () => {
    const cases: {
      name: string;
      authorization: string | undefined;
      payload: JwtPayload | Error;
    }[] = [
      { name: 'заголовка нет', authorization: undefined, payload: PAYLOAD },
      { name: 'схема не Bearer', authorization: 'Basic dXNlcjpwYXNz', payload: PAYLOAD },
      { name: 'пустой токен', authorization: 'Bearer ', payload: PAYLOAD },
      {
        name: 'токен не разбирается',
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
