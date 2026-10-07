import { defineConfig } from 'prisma/config';

import { loadDatabaseConfig } from './src/config/database.config.js';

/**
 * Prisma 7's CLI loads this file instead of reading `datasource { url = … }` from the schema
 * (which it now rejects with `P1012`). Importing `database.config.ts` here is proven to work: the
 * CLI's loader transpiles this config, follows the relative `.js` → `.ts` specifier and runs it —
 * `@nestjs/common`'s `Logger` included, so the same fallback warning prints from `prisma db push`
 * as from `nest start`.
 */
const { databaseUrl } = loadDatabaseConfig();

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: { url: databaseUrl },
});
