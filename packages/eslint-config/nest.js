import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

import { baseConfig } from './base.js';

/** Конфиг для Nest.js-приложений (с проверкой типов). */
export const nestConfig = defineConfig([
  ...baseConfig,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: process.cwd(),
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },
  {
    // Файлы вне tsconfig (например, eslint.config.mjs) — без type-aware правил.
    files: ['**/*.mjs', '**/*.js', '**/*.cjs'],
    extends: [tseslint.configs.disableTypeChecked],
  },
]);

export default nestConfig;
