import { Logger } from '@nestjs/common';

/**
 * Конфигурация подписи JWT. `@nestjs/config` и dotenv осознанно не подключены
 * (план имплементации §8 п.4), поэтому значения берутся прямо из `process.env`,
 * а `apps/api/.env.example` документирует контракт переменных, а не способ их задать.
 */

/**
 * Дефолт — стабильная константа, а НЕ `randomBytes` при старте: `nest start --watch`
 * перезапускается на каждой правке, и случайный секрет обнулял бы все выданные токены
 * посреди прогона тестов (план имплементации §3.6, риск 8).
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
      `JWT_SECRET не задан — используется dev-дефолт «${DEV_JWT_SECRET}». ` +
        'Для любого не-локального запуска задайте переменную окружения процесса: ' +
        "$env:JWT_SECRET='…'; pnpm dev:api",
    );
  }

  return {
    jwtSecret: secret !== undefined && secret !== '' ? secret : DEV_JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? DEFAULT_JWT_EXPIRES_IN,
  };
}
