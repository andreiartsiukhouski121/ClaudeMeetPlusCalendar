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
    // flat/recommended держит эти четыре правила в `warn`, а ESLint с предупреждениями выходит
    // с кодом 0 — то есть `waitForTimeout` и `test.skip` проходили бы шаг «pnpm lint» зелёными,
    // хотя тест-план §6.3 называет их блокерами. Значит error.
    // Вариант `eslint . --max-warnings=0` отвергнут: он делает блокером любое предупреждение
    // во всём репозитории, включая правила, к устойчивости тестов не относящиеся.
    // `test.fixme` при этом остаётся разрешённым: no-skipped-test знает только про
    // `test.skip`/`describe.skip` — механизм «нашли дефект → test.fixme со ссылкой» не ломается.
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      'playwright/no-wait-for-timeout': 'error',
      'playwright/no-skipped-test': 'error',
      'playwright/no-conditional-in-test': 'error',
      'playwright/no-page-pause': 'error',
    },
  },
]);
