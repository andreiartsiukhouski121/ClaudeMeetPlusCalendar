import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import type { JwtPayload } from './auth.types.js';

/**
 * Типизированная обёртка над `JwtService`: `verifyAsync<JwtPayload>` вместо `any`
 * (в `apps/api` включён `recommendedTypeChecked`, где `no-unsafe-*` — ошибки, риск 14).
 *
 * Методы не `async`: они возвращают промис `JwtService` как есть — лишний `await` только
 * добавил бы кадр стека и поспорил с `require-await`.
 */
@Injectable()
export class TokenService {
  constructor(private readonly jwtService: JwtService) {}

  sign(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload);
  }

  verify(token: string): Promise<JwtPayload> {
    return this.jwtService.verifyAsync<JwtPayload>(token);
  }
}
