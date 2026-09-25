import { Module } from '@nestjs/common';
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt';

import { loadAuthConfig } from '../config/auth.config.js';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { PasswordService } from './password.service.js';
import { TokenService } from './token.service.js';

const { jwtSecret, jwtExpiresIn } = loadAuthConfig();

/**
 * `jsonwebtoken@9` types `expiresIn` as the template literal `ms.StringValue` (`'1h'`, `'30m'`, …)
 * while the environment hands over a plain `string`. The format cannot be checked at the type
 * level, so the cast lives here with its reason: a bad value fails token signing at startup
 * instead of silently issuing an eternal token.
 */
type JwtSignOptions = NonNullable<JwtModuleOptions['signOptions']>;
const expiresIn = jwtExpiresIn as JwtSignOptions['expiresIn'];

@Module({
  imports: [UsersModule, JwtModule.register({ secret: jwtSecret, signOptions: { expiresIn } })],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, TokenService, JwtAuthGuard],
  // `MeetingsModule` needs both of these.
  exports: [JwtAuthGuard, TokenService],
})
export class AuthModule {}
