import { Module, ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { MeetingsModule } from './meetings/meetings.module.js';

@Module({
  imports: [AuthModule, MeetingsModule],
  controllers: [AppController],
  providers: [
    AppService,
    /**
     * Invariant 3: registered as an `APP_PIPE` provider, not via `app.useGlobalPipes` in
     * `main.ts`. Otherwise `Test.createTestingModule({ imports: [AppModule] })` boots the app
     * without validation and the 400 checks disagree with the real server.
     */
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    },
  ],
})
export class AppModule {}
