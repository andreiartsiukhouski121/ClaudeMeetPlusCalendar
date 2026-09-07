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
 * `expiresIn` у `jsonwebtoken@9` типизирован шаблонным литералом `ms.StringValue`
 * (`'1h'`, `'30m'`, …), а из окружения приходит обычная `string`. Проверить формат на
 * этапе типов нельзя, поэтому приведение — здесь и с явной причиной: неверное значение
 * уронит подпись токена на старте, а не молча выдаст вечный токен.
 */
type JwtSignOptions = NonNullable<JwtModuleOptions['signOptions']>;
const expiresIn = jwtExpiresIn as JwtSignOptions['expiresIn'];

@Module({
  imports: [UsersModule, JwtModule.register({ secret: jwtSecret, signOptions: { expiresIn } })],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, TokenService, JwtAuthGuard],
  // `JwtAuthGuard` и `TokenService` понадобятся `MeetingsModule` в фиче 2.
  exports: [JwtAuthGuard, TokenService],
})
export class AuthModule {}
