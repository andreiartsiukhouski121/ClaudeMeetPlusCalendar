import { JwtService } from '@nestjs/jwt';
import { beforeAll, describe, expect, it } from 'vitest';

import type { JwtPayload } from './auth.types.js';
import { TokenService } from './token.service.js';

/**
 * Кейсы AL-UT-13…15 из `e2e/regression/auth-login/auth-login.unit.cases.md`.
 * `JwtService` инстанцируется руками, без `Test.createTestingModule`: секрет и срок
 * жизни в юните должны быть свои, а не из `AuthModule`.
 */
describe('TokenService', () => {
  const PAYLOAD: JwtPayload = { sub: 'usr-teacher', email: 'teacher@purpleschool.test' };

  let jwtService: JwtService;
  let tokenService: TokenService;

  beforeAll(() => {
    jwtService = new JwtService({ secret: 'unit-secret', signOptions: { expiresIn: '1h' } });
    tokenService = new TokenService(jwtService);
  });

  it('AL-UT-13 — round-trip: verify(sign(payload)) возвращает исходные sub и email', async () => {
    const token = await tokenService.sign(PAYLOAD);

    expect(token.split('.')).toHaveLength(3);

    const verified = await tokenService.verify(token);

    expect(verified.sub).toBe(PAYLOAD.sub);
    expect(verified.email).toBe(PAYLOAD.email);
  });

  it('AL-UT-14 — verify на токене с испорченной подписью бросает ошибку', async () => {
    const [header, payload, signature] = (await tokenService.sign(PAYLOAD)).split('.');
    const tampered = `${header}.${payload}.${signature.slice(0, -2)}xx`;

    await expect(tokenService.verify(tampered)).rejects.toThrow('invalid signature');
  });

  it('AL-UT-15 — истёкший токен отвергается', async () => {
    // Срок в прошлом вместо фиктивных таймеров: jsonwebtoken сверяется с реальным Date.now().
    const expired = await jwtService.signAsync(PAYLOAD, { expiresIn: '-1s' });

    await expect(tokenService.verify(expired)).rejects.toThrow('jwt expired');
  });
});
