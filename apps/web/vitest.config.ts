import { defineConfig } from 'vitest/config';

/**
 * Юниты web — только чистые хелперы из src/lib (форматирование дат, сборка опций cookie,
 * resolveApiUrl). React-компоненты покрыты Playwright, поэтому ни jsdom, ни
 * @testing-library здесь не нужны — environment остаётся 'node'.
 *
 * Глобалы (describe/it) НЕ включаем, в отличие от apps/api: иначе пришлось бы дописывать
 * `types` в apps/web/tsconfig.json и спорить с eslint-config-next. В спеках —
 * `import { describe, expect, it } from 'vitest'`.
 *
 * Файлы с `import 'server-only'` (session.ts, dal.ts) юнитами не покрываются: Next алиасит
 * этот импорт на next/dist/compiled/server-only, которого в node_modules нет, и Vitest его
 * не резолвит. Всё тестируемое обязано лежать в файле без такого импорта.
 */
export default defineConfig({
  resolve: { tsconfigPaths: true }, // как в apps/api — даёт алиас @/*
  test: { environment: 'node', include: ['src/**/*.spec.ts'] },
});
