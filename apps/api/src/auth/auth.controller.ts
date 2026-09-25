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
   * Invariant 1: `@HttpCode(HttpStatus.OK)` is mandatory — Nest answers POST with 201 by default,
   * and the contract requires 200. Only a status assertion catches it (AL-API-01).
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

    // We signed the token, but the user is gone from the store: still a 401, not a 500.
    if (user === undefined) {
      throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
    }

    return this.usersService.toPublic(user);
  }
}
