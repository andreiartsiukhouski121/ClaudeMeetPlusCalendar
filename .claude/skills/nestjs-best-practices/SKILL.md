---
name: nestjs-best-practices
description: Правила NestJS от внешнего скила с поправкой на инварианты этого репозитория — четыре из сорока здесь неверны. Use when writing, reviewing or refactoring anything under apps/api, and before applying any "NestJS best practice" to this codebase.
---

Адаптер к внешнему скилу `nestjs-best-practices` (40 правил, `kadajett/agent-nestjs-skills`).
Правила лежат в `.agents/skills/nestjs-best-practices/rules/`; каталог в `.gitignore`, набор
восстанавливается `pnpm skills:sync`. **Если каталога нет — работает всё, что написано ниже:**
таблица противоречий и границы применимости самодостаточны, недостаёт только текстов самих
правил.

**Читать его как рекомендации, а не как норму.** Норма — инварианты 1–8 корневого `CLAUDE.md`:
каждый из них здесь уже ломал реализацию и закрыт тестом.

## Четыре правила скила, которые в этом репозитории неверны

| Правило скила                                                                    | Почему здесь нет                                                                                                                                                                                   |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `security-validate-all-input.md`, `api-use-pipes.md` → `app.useGlobalPipes(...)` | Инвариант 3: `ValidationPipe` регистрируется провайдером `APP_PIPE` в `AppModule`. С `useGlobalPipes` тестовые модули поднимают приложение **без** валидации, и проверки 400 расходятся с сервером |
| `security-auth-jwt.md` → `UnauthorizedException('User not found or inactive')`   | Инварианты 6 и 18: неверный пароль и неизвестный email дают одно и то же сообщение **и** одно время ответа. Разный текст — это перечисление аккаунтов, уже найденное как `FX-007`                  |
| `devops-use-config-module.md` → `@nestjs/config` / `ConfigModule.forRoot()`      | В `apps/api` `.env` не читается намеренно: ни dotenv, ни `@nestjs/config` не подключены, переменные приходят из окружения, контракт описан в `.env.example`                                        |
| `test-e2e-supertest.md` → контракт эндпоинтов через supertest                    | Канонический источник HTTP-контракта — `e2e/regression/<фича>/<фича>.api.spec.ts` на Playwright. `apps/api/test/app.e2e-spec.ts` оставлен ровно для «`AppModule` поднимается»                      |

Примеры с TypeORM (`db-use-migrations.md`, `arch-feature-modules.md`, `db-avoid-n-plus-one.md`)
к этому коду неприменимы: базы нет, репозитории in-memory, переход на миграции — пункт `BL-004`.

## Что из скила полезно

- `security-rate-limiting.md` — это открытый `BL-001` (P1, единственный блокер продакшена: перебор
  на `POST /auth/login` ничем не ограничен). Если беретесь за него — правила оттуда по делу.
- `arch-single-responsibility`, `di-prefer-constructor-injection`, `error-handle-async-errors`,
  `arch-avoid-circular-deps` — не конфликтуют ни с чем и совпадают с тем, как код уже написан.

## Прежде чем применять любое правило

1. Свериться с инвариантами 1–8 и с `apps/api/CLAUDE.md`.
2. Поведенческое изменение — новый или обновлённый кейс в `e2e/regression/`, новый защищённый
   эндпоинт — строка в `PROTECTED_ROUTES`.
3. Найденное расхождение между скилом и кодом, если правым оказался скил, — это дефект: запись
   `FX-` с графой «Чем найдено».
