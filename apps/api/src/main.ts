import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';

/**
 * CORS здесь НЕ включается и глобальный префикс НЕ добавляется — осознанное решение
 * (план имплементации §1.4), а не забытая строка:
 *
 * - CORS-заголовки нужны только браузерному origin. Единственные клиенты этого API —
 *   серверный `fetch` из Next (BFF) и фикстура `request` Playwright; preflight не участвует
 *   ни там, ни там. `app.enableCors()` без аргументов ставит `Access-Control-Allow-Origin: *`,
 *   то есть открывает API любому сайту за ноль пользы.
 * - Глобальный префикс сломал бы `GET /` → `Hello World!` (смоук SM-API-01) и потребовал бы
 *   дублировать префикс во всех путях. Пути и так неконфликтны: `/`, `/auth/*`, `/meetings`.
 *
 * Валидация тоже не здесь: `ValidationPipe` живёт провайдером `APP_PIPE` в `AppModule`,
 * иначе тестовые модули поднимали бы приложение без неё (§2.2 п.6).
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3001);
}

await bootstrap();
