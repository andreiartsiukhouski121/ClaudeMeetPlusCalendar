import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module.js';

/**
 * No CORS and no global prefix — both deliberate.
 *
 * CORS headers only matter to a browser origin, and this API has none: its clients are Next's
 * server-side `fetch` (BFF) and Playwright's `request` fixture. A bare `app.enableCors()` would
 * set `Access-Control-Allow-Origin: *` for zero benefit. A global prefix would break
 * `GET /` → `Hello World!` (SM-API-01); the paths `/`, `/auth/*`, `/meetings` do not collide.
 *
 * Validation is not here either: `ValidationPipe` is an `APP_PIPE` provider in `AppModule`
 * (invariant 3).
 */
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Express advertises `X-Powered-By: Express` — a free hint about which CVEs to try (SEC-API-08).
  app.disable('x-powered-by');

  await app.listen(process.env.PORT ?? 3001);
}

await bootstrap();
