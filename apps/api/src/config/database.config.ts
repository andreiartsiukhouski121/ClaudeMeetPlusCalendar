import { Logger } from '@nestjs/common';

/**
 * Database connection config. `@nestjs/config` and dotenv are deliberately absent, so the value
 * comes straight from `process.env`; `apps/api/.env.example` documents the contract, not a way to
 * set it.
 */

/**
 * Matches the root `docker-compose.yml`'s `db` service: user `purpleschool`, password
 * `purpleschool`, database `purpleschool` — the host port it publishes, 5433, not the container's
 * internal 5432.
 */
const DEV_DATABASE_URL = 'postgres://purpleschool:purpleschool@127.0.0.1:5433/purpleschool';

const logger = new Logger('DatabaseConfig');

export interface DatabaseConfig {
  databaseUrl: string;
}

export function loadDatabaseConfig(): DatabaseConfig {
  const url = process.env.DATABASE_URL;

  if (url === undefined || url === '') {
    logger.warn(
      `DATABASE_URL is not set — falling back to the dev default "${DEV_DATABASE_URL}". ` +
        'For anything but a local run against docker-compose.yml, set the process environment ' +
        "variable: $env:DATABASE_URL='…'; pnpm dev:api",
    );
  }

  return {
    databaseUrl: url !== undefined && url !== '' ? url : DEV_DATABASE_URL,
  };
}
