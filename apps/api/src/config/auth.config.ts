import { Logger } from '@nestjs/common';

/**
 * JWT signing config. `@nestjs/config` and dotenv are deliberately absent, so values come straight
 * from `process.env`; `apps/api/.env.example` documents the contract, not a way to set it.
 */

/**
 * A stable constant, not `randomBytes` at startup: `nest start --watch` restarts on every edit,
 * and a random secret would invalidate every issued token mid-run.
 */
const DEV_JWT_SECRET = 'purpleschool-dev-secret';
const DEFAULT_JWT_EXPIRES_IN = '1h';

const logger = new Logger('AuthConfig');

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
}

export function loadAuthConfig(): AuthConfig {
  const secret = process.env.JWT_SECRET;

  if (secret === undefined || secret === '') {
    logger.warn(
      `JWT_SECRET is not set — falling back to the dev default "${DEV_JWT_SECRET}". ` +
        'For anything but a local run, set the process environment variable: ' +
        "$env:JWT_SECRET='…'; pnpm dev:api",
    );
  }

  return {
    jwtSecret: secret !== undefined && secret !== '' ? secret : DEV_JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? DEFAULT_JWT_EXPIRES_IN,
  };
}
