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
 * ОДНО И ТО ЖЕ сообщение и при неизвестном email, и при неверном пароле — требование
 * безопасности: по ответу нельзя перечислять существующие аккаунты (AL-API-03, AL-UT-02,
 * AL-UT-03).
 */
export const INVALID_CREDENTIALS_MESSAGE = 'Неверный email или пароль';

/**
 * Хеш-пустышка для выравнивания времени ответа. Считается один раз при загрузке модуля от
 * случайной строки: подобрать к нему пароль невозможно, а `verify` по нему делает ровно столько
 * же работы, сколько по настоящему.
 *
 * Константа модуля, а не поле класса, сознательно: порядок инициализации полей относительно
 * parameter properties зависит от настроек транспиляции, а промах здесь означал бы `verify` по
 * `undefined` в security-критичной ветке.
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
     * Пароль сверяется ВСЕГДА, даже когда пользователя нет: иначе неизвестный email отвечает
     * быстрее, чем неверный пароль, и одинакового сообщения уже недостаточно — аккаунты
     * перечисляются по времени ответа.
     *
     * Измерено до правки на этом коде: неизвестный email — 52 мс, неверный пароль — 86–114 мс.
     * Разница стабильная и различима с первой попытки (SEC-API-05).
     */
    const passwordMatches = this.passwordService.verify(
      dto.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    // Ветка отказа одна на оба случая: и «нет такого email», и «пароль не тот».
    if (user === undefined || !passwordMatches) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const accessToken = await this.tokenService.sign({ sub: user.id, email: user.email });

    return { accessToken, user: toPublicUser(user) };
  }
}
