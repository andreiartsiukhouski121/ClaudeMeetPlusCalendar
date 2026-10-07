import { Injectable } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import { loadDatabaseConfig } from '../config/database.config.js';

/**
 * Extends the generated `PrismaClient`, wired to `@prisma/adapter-pg` instead of the `url` Prisma 7
 * rejects inside `datasource` (see `prisma/schema.prisma`). Deliberately no `$connect()`, no
 * `OnModuleInit`, no `enableShutdownHooks()` (`FACT-3581`, `ADR-0027`): the pool opens lazily, on
 * whichever query runs first. That is what keeps `apps/api/test/app.e2e-spec.ts` green with no
 * database listening — it boots `AppModule` through Nest DI and issues `GET /`, which touches no
 * table, so the adapter is constructed but never asked to connect.
 */
@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    const { databaseUrl } = loadDatabaseConfig();

    super({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  }
}
