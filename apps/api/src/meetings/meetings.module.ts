import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { MeetingsController } from './meetings.controller.js';
import { MeetingsService } from './meetings.service.js';

/**
 * `AuthModule` is imported for `JwtAuthGuard`: the guard is attached by decorator on the
 * controller, so its provider must be visible in this module.
 */
@Module({
  imports: [AuthModule],
  controllers: [MeetingsController],
  providers: [MeetingsService],
  exports: [MeetingsService],
})
export class MeetingsModule {}
