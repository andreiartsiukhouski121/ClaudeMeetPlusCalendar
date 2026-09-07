import { Injectable, UnauthorizedException } from '@nestjs/common';

import { normalizeEmail, UsersService } from '../users/users.service.js';
import { toPublicUser } from '../users/users.mapper.js';
import type { LoginResult } from './auth.types.js';
import type { LoginDto } from './dto/login.dto.js';
import { PasswordService } from './password.service.js';
import { TokenService } from './token.service.js';

/**
 * ОДНО И ТО ЖЕ сообщение и при неизвестном email, и при неверном пароле — требование
 * безопасности: по ответу нельзя перечислять существующие аккаунты (AL-API-03, AL-UT-02,
 * AL-UT-03).
 */
export const INVALID_CREDENTIALS_MESSAGE = 'Неверный email или пароль';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResult> {
    const user = this.usersService.findByEmail(normalizeEmail(dto.email));

    // Ветка отказа одна на оба случая: и «нет такого email», и «пароль не тот».
    if (user === undefined || !this.passwordService.verify(dto.password, user.passwordHash)) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const accessToken = await this.tokenService.sign({ sub: user.id, email: user.email });

    return { accessToken, user: toPublicUser(user) };
  }
}
