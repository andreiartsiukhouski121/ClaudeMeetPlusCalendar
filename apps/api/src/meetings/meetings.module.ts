import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { MeetingsController } from './meetings.controller.js';
import { MeetingsService } from './meetings.service.js';

/**
 * `AuthModule` импортируется ради `JwtAuthGuard` (он экспортирован оттуда вместе с
 * `TokenService`): guard навешивается декоратором на контроллер, поэтому его провайдер
 * должен быть доступен в этом модуле.
 */
@Module({
  imports: [AuthModule],
  controllers: [MeetingsController],
  providers: [MeetingsService],
  exports: [MeetingsService],
})
export class MeetingsModule {}
