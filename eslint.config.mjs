import { baseConfig } from '@purpleschool/eslint-config/base';
import { defineConfig, globalIgnores } from 'eslint/config';
import playwright from 'eslint-plugin-playwright';

/**
 * Monorepo root config: lints only files outside apps/*. Each app has its own eslint.config.mjs.
 * That covers playwright.config.ts and e2e/**; Playwright reports are ignored.
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
  // The base has no type-aware rules, so a forgotten `await expect(...)` is caught syntactically:
  // without this the test passes silently, having checked nothing.
  {
    ...playwright.configs['flat/recommended'],
    files: ['e2e/**/*.ts'],
    // flat/recommended keeps these four at `warn`, and ESLint exits 0 on warnings — so
    // `waitForTimeout` and `test.skip` would pass `pnpm lint` green while the suite rules call
    // them blockers. Hence error.
    // `eslint . --max-warnings=0` was rejected: it would make every warning in the repository a
    // blocker, including rules unrelated to test robustness.
    // `test.fixme` stays allowed: no-skipped-test only knows `test.skip`/`describe.skip`, so the
    // "found a defect → test.fixme with a link" mechanism keeps working.
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      'playwright/no-wait-for-timeout': 'error',
      'playwright/no-skipped-test': 'error',
      'playwright/no-conditional-in-test': 'error',
      'playwright/no-page-pause': 'error',
    },
  },
]);
