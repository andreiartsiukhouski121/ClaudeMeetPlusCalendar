import { defineConfig } from 'vitest/config';

/**
 * Web units cover only the pure helpers in src/lib (date formatting, cookie options,
 * resolveApiUrl). React components are covered by Playwright, so neither jsdom nor
 * @testing-library is needed and the environment stays 'node'.
 *
 * Globals are OFF, unlike apps/api: enabling them would mean adding `types` to
 * apps/web/tsconfig.json and arguing with eslint-config-next. Specs import from 'vitest'.
 *
 * Invariant 14: files importing 'server-only' (session.ts, dal.ts) have no units — Next aliases
 * that import to a compiled module Vitest cannot resolve.
 */
export default defineConfig({
  resolve: { tsconfigPaths: true }, // same as apps/api — provides the @/* alias
  test: { environment: 'node', include: ['src/**/*.spec.ts'] },
});
