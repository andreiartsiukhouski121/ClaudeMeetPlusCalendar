import { randomBytes } from 'node:crypto';

import { Injectable, UnauthorizedException } from '@nestjs/common';

import { hashPassword } from '../common/crypto/password.js';
import { normalizeEmail, UsersService } from '../users/users.service.js';
import { toPublicUser } from '../users/users.mapper.js';
import type { LoginResult } from './auth.types.js';
import type { LoginDto } from './dto/login.dto.js';
import { PasswordService } from './password.service.js';
import { TokenService } from './token.service.js';

/**
 * Invariant 6: the same message for an unknown email and a wrong password, so responses cannot be
 * used to enumerate accounts (AL-API-03, AL-UT-02, AL-UT-03).
 */
export const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';

/**
 * Dummy hash that keeps response timing flat. Computed once at module load from a random string:
 * no password can match it, and verifying against it costs exactly as much as the real thing.
 *
 * A module constant rather than a class field on purpose: field initialization order relative to
 * parameter properties depends on transpilation settings, and a miss here would mean verifying
 * against `undefined` in a security-critical branch.
 */
const DUMMY_PASSWORD_HASH = hashPassword(randomBytes(16).toString('hex'));

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResult> {
    const user = this.usersService.findByEmail(normalizeEmail(dto.email));

    /*
     * Invariant 18: the password is always verified, even when the user does not exist. Otherwise
     * an unknown email answers faster than a wrong password and the identical message is no longer
     * enough — accounts get enumerated by response time.
     *
     * Measured before the fix: unknown email 52 ms, wrong password 86–114 ms (SEC-API-05).
     */
    const passwordMatches = this.passwordService.verify(
      dto.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (user === undefined || !passwordMatches) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const accessToken = await this.tokenService.sign({ sub: user.id, email: user.email });

    return { accessToken, user: toPublicUser(user) };
  }
}
