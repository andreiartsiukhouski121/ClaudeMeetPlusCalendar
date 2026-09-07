import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import type { User } from '../users/user.types.js';
import type { JwtPayload } from './auth.types.js';
import type { UsersService } from '../users/users.service.js';
import { AuthService, INVALID_CREDENTIALS_MESSAGE } from './auth.service.js';
import type { PasswordService } from './password.service.js';
import type { TokenService } from './token.service.js';

/**
 * Кейсы AL-UT-01…08 из `e2e/regression/auth-login/auth-login.unit.cases.md`.
 *
 * Зависимости передаются вручную, без `Test.createTestingModule`: юниту нужны моки, а не
 * контейнер, и так тест не зависит от эмиссии метаданных декораторов в транспайлере.
 */
describe('AuthService', () => {
  const PLAIN_PASSWORD = 'Passw0rd!';
  const TEACHER: User = {
    id: 'usr-teacher',
    email: 'teacher@purpleschool.test',
    name: 'Анна Преподаватель',
    passwordHash: `scrypt$${'aa'.repeat(16)}$${'bb'.repeat(64)}`,
  };

  interface HarnessOptions {
    /** `null` — «пользователь не найден»: `undefined` в опциях означал бы «взять дефолт». */
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
    const verify = vi.fn(() => passwordValid);
    // Payload запоминается, а не читается из `sign.mock.calls`: мок без параметров типизирован
    // пустым кортежем аргументов, и `calls[0][0]` не проходит tsc.
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

    return { service, findByEmail, verify, sign, signedPayloads };
  }

  it('AL-UT-01 — login с верным email и паролем возвращает accessToken и user без passwordHash', async () => {
    const { service } = createHarness();

    const result = await service.login({ email: TEACHER.email, password: PLAIN_PASSWORD });

    expect(result.accessToken).toBe('signed.jwt.token');
    expect(result.user).toEqual({ id: TEACHER.id, email: TEACHER.email, name: TEACHER.name });
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(JSON.stringify(result)).not.toContain('scrypt');
  });

  it('AL-UT-02 — неверный пароль бросает UnauthorizedException с сообщением о неверных данных', async () => {
    const { service } = createHarness({ passwordValid: false });

    const failure = service.login({ email: TEACHER.email, password: 'wrong-password' });

    await expect(failure).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(failure).rejects.toThrow(INVALID_CREDENTIALS_MESSAGE);
  });

  it('AL-UT-03 — неизвестный email бросает то же исключение с тем же сообщением, что и неверный пароль', async () => {
    const wrongPassword = await createHarness({ passwordValid: false })
      .service.login({ email: TEACHER.email, password: 'wrong-password' })
      .catch((error: unknown) => error);
    const unknownEmail = await createHarness({ user: null })
      .service.login({ email: 'nobody@purpleschool.test', password: PLAIN_PASSWORD })
      .catch((error: unknown) => error);

    expect(unknownEmail).toBeInstanceOf(UnauthorizedException);
    expect(wrongPassword).toBeInstanceOf(UnauthorizedException);
    // По ответу нельзя определить, существует ли аккаунт: одно сообщение на оба случая.
    expect((unknownEmail as Error).message).toBe((wrongPassword as Error).message);
    expect((unknownEmail as Error).message).toBe(INVALID_CREDENTIALS_MESSAGE);
  });

  it('AL-UT-04 — accessToken получен вызовом сервиса токенов, а не собран строкой', async () => {
    const { service, sign } = createHarness({ token: 'token-from-token-service' });

    const result = await service.login({ email: TEACHER.email, password: PLAIN_PASSWORD });

    expect(sign).toHaveBeenCalledTimes(1);
    expect(result.accessToken).toBe('token-from-token-service');
  });

  it('AL-UT-05 — email нормализуется (trim + lowercase) перед поиском пользователя', async () => {
    const { service, findByEmail } = createHarness();

    await service.login({ email: '  TEACHER@Purpleschool.TEST  ', password: PLAIN_PASSWORD });

    expect(findByEmail).toHaveBeenCalledWith(TEACHER.email);
  });

  it('AL-UT-06 — пароль сверяется verify-функцией с хешем из хранилища, а не сравнением с plaintext', async () => {
    const { service, verify } = createHarness();

    await service.login({ email: TEACHER.email, password: PLAIN_PASSWORD });

    expect(verify).toHaveBeenCalledTimes(1);
    expect(verify).toHaveBeenCalledWith(PLAIN_PASSWORD, TEACHER.passwordHash);
  });

  it('AL-UT-07 — payload токена содержит sub и email и не содержит хеша пароля', async () => {
    const { service, signedPayloads } = createHarness();

    await service.login({ email: TEACHER.email, password: PLAIN_PASSWORD });

    expect(signedPayloads).toHaveLength(1);
    const payload = signedPayloads[0];

    expect(Object.keys(payload).sort()).toEqual(['email', 'sub']);
    expect(payload.sub).toBe(TEACHER.id);
    expect(payload.email).toBe(TEACHER.email);
    expect(JSON.stringify(payload)).not.toContain('scrypt');
  });

  it('AL-UT-08 — ошибка хранилища прокидывается как есть, а не превращается в 401', async () => {
    const storageFailure = new Error('users storage is down');
    const { service } = createHarness({ findByEmailError: storageFailure });

    const failure = service.login({ email: TEACHER.email, password: PLAIN_PASSWORD });

    // Падение хранилища не должно выглядеть как неверный пароль: иначе инцидент неотличим
    // от обычной опечатки пользователя.
    await expect(failure).rejects.toBe(storageFailure);
    await expect(failure).rejects.not.toBeInstanceOf(UnauthorizedException);
  });
});
