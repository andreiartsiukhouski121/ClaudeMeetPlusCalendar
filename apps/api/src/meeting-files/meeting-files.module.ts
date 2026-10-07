import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { MeetingsModule } from '../meetings/meetings.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { MeetingFilesController } from './meeting-files.controller.js';
import { MeetingFilesService } from './meeting-files.service.js';

/**
 * `AuthModule` for `JwtAuthGuard`, `PrismaModule` for `PrismaService`, `MeetingsModule` for
 * `MeetingsService` — ownership resolves through its existing `findById` rather than a second
 * lookup of its own (design §2).
 */
@Module({
  imports: [AuthModule, PrismaModule, MeetingsModule],
  controllers: [MeetingFilesController],
  providers: [MeetingFilesService],
})
export class MeetingFilesModule {}
