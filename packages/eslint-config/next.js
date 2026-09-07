import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';
import { defineConfig, globalIgnores } from 'eslint/config';

import { baseConfig } from './base.js';

/** Конфиг для Next.js-приложений. */
export const nextConfig = defineConfig([
  ...baseConfig,
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
  prettier,
]);

export default nextConfig;
