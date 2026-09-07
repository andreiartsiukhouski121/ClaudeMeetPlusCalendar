import { baseConfig } from '@purpleschool/eslint-config/base';
import { defineConfig, globalIgnores } from 'eslint/config';
import playwright from 'eslint-plugin-playwright';

/**
 * Конфиг корня монорепозитория: линтит только файлы вне apps/*.
 * У каждого приложения свой eslint.config.mjs.
 * Сюда попадают playwright.config.ts и e2e/** — отчёты Playwright игнорируем.
 */
export default defineConfig([
  globalIgnores([
    'apps/**',
    'packages/*/dist/**',
    'test-results/**',
    'playwright-report/**',
    'blob-report/**',
  ]),
  ...baseConfig,
  // Type-aware правил в базе нет, поэтому забытый `await expect(...)` ловим синтаксически:
  // без этого тест молча проходит, ничего не проверив.
  {
    ...playwright.configs['flat/recommended'],
    files: ['e2e/**/*.ts'],
  },
]);
