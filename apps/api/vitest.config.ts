import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Резолвит path-алиасы из tsconfig.json (в т.ч. добавленные `nest g library`).
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
  },
});
