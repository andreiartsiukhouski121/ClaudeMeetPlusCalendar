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
     * ValidationPipe регистрируется провайдером APP_PIPE, а НЕ через `app.useGlobalPipes`
     * в `main.ts` (план имплементации §2.2 п.6, §8 п.4): иначе
     * `Test.createTestingModule({ imports: [AppModule] })` — в частности
     * `apps/api/test/app.e2e-spec.ts` — поднимает приложение без валидации, и проверки 400
     * в supertest-наборе расходятся с реальным сервером.
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
