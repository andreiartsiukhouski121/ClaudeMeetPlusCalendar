import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { MeetingsController } from './meetings.controller.js';
import { MeetingsService } from './meetings.service.js';

/**
 * `AuthModule` is imported for `JwtAuthGuard`: the guard is attached by decorator on the
 * controller, so its provider must be visible in this module. `PrismaModule` for `PrismaService`,
 * `MeetingsService`'s store since `ADR-0027`.
 */
@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [MeetingsController],
  providers: [MeetingsService],
  exports: [MeetingsService],
})
export class MeetingsModule {}
