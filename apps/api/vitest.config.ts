import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Resolves path aliases from tsconfig.json, including those added by `nest g library`.
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
  },
});
