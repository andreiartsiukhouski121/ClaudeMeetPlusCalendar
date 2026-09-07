import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import type { PublicUser } from '../users/user.types.js';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';
import type { AuthenticatedUser, LoginResult } from './auth.types.js';
import { CurrentUser } from './current-user.decorator.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtAuthGuard, UNAUTHORIZED_MESSAGE } from './jwt-auth.guard.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * `@HttpCode(HttpStatus.OK)` обязателен: Nest отвечает на POST кодом 201 по умолчанию,
   * а контракт (§2) требует 200. Ловится только тестом на статус — AL-API-01.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<LoginResult> {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() current: AuthenticatedUser): PublicUser {
    const user = this.usersService.findById(current.id);

    // Токен подписан нами, но пользователя в хранилище больше нет: это тоже 401, не 500.
    if (user === undefined) {
      throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
    }

    return this.usersService.toPublic(user);
  }
}
