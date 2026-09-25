import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import type { JwtPayload } from './auth.types.js';

/**
 * Typed wrapper over `JwtService`: `verifyAsync<JwtPayload>` instead of `any`, since `apps/api`
 * runs `recommendedTypeChecked` where `no-unsafe-*` are errors.
 *
 * The methods are not `async`: they return `JwtService`'s promise as is, and an extra `await`
 * would only add a stack frame and argue with `require-await`.
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
