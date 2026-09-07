# PurpleSchool

Монорепозиторий на pnpm workspaces.

## Структура

```
.
├── apps
│   ├── web          # Next.js 16 (App Router, TypeScript) — http://localhost:3000
│   └── api          # Nest.js 12 (TypeScript, Vitest)     — http://localhost:3001
├── packages
│   ├── eslint-config  # общие конфиги ESLint (base / next / nest)
│   └── tsconfig       # общие tsconfig (base / nextjs / nestjs)
├── pnpm-workspace.yaml  # список пакетов + catalog версий инструментов
├── .prettierrc          # единый Prettier на весь репозиторий
└── eslint.config.mjs    # ESLint для файлов корня и packages/*
```

## Требования

- Node.js >= 22 (см. `.nvmrc`)
- pnpm 10 (`corepack enable`)

## Установка

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
```

## Скрипты (из корня)

| Команда                             | Описание                        |
| ----------------------------------- | ------------------------------- |
| `pnpm dev`                          | запускает web и api параллельно |
| `pnpm dev:web` / `pnpm dev:api`     | запуск одного приложения        |
| `pnpm build`                        | сборка всех пакетов             |
| `pnpm start`                        | запуск собранных приложений     |
| `pnpm lint` / `pnpm lint:fix`       | ESLint по всем пакетам          |
| `pnpm typecheck`                    | проверка типов (`tsc --noEmit`) |
| `pnpm test`                         | тесты (Vitest в api)            |
| `pnpm format` / `pnpm format:check` | Prettier                        |

Команды внутри одного приложения: `pnpm --filter @purpleschool/web <script>`.

## Качество кода

- **ESLint 10** (flat config) — общие правила в `packages/eslint-config`,
  для api включены type-aware правила, для web — `eslint-config-next`.
- **Prettier** — один конфиг в корне, стилевые правила ESLint отключены через
  `eslint-config-prettier`.
- **husky + lint-staged** — перед коммитом на staged-файлах прогоняются
  `eslint --fix` и `prettier --write`.
