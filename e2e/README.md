# Регрессионный сьют Playwright

Один каталог на фичу, внутри — и описание кейсов, и исполняемые спеки. Правя фичу, открываешь
**один** каталог и видишь все уровни проверок: API-контракт, UI, юниты (с точными путями к ним).

Канонический источник конвенции и полного перечня кейсов —
[`docs/plans/feature-plan-testing.md`](../docs/plans/feature-plan-testing.md). Здесь — рабочий
индекс: что где лежит и как это запустить.

## Конвенция имён

| Роль                                | Шаблон                          | Проект Playwright |
| ----------------------------------- | ------------------------------- | ----------------- |
| Кейсы API-контракта                 | `<feature>.api.cases.md`        | —                 |
| Спек API-контракта                  | `<feature>.api.spec.ts`         | `api` (:3101)     |
| Кейсы UI                            | `<feature>.functional.cases.md` | —                 |
| Спек UI                             | `<feature>.functional.spec.ts`  | `web` (:3100)     |
| Кейсы юнит-тестов (спеки в `apps/`) | `<feature>.unit.cases.md`       | vitest            |

**Суффикс имени файла — единственный источник истины о том, какой проект исполняет тест.**
`playwright.config.ts` маршрутизирует не по каталогу, а по `testMatch`: `*.api.spec.ts` → проект
`api` (фикстура `request`, браузер не поднимается), `*.functional.spec.ts` → проект `web`
(Desktop Chrome). Файл с любым другим именем **не попадёт ни в один проект и молча не запустится** —
от этого страхует `suite-integrity.api.spec.ts`.

Заголовок теста обязан начинаться с ID кейса (`SM-API-01 — …`): это даёт `--grep "HD-FN-07"`,
читаемый отчёт и автоматическую проверку парности. То же для юнит-тестов —
`it('AL-UT-09 — …')`, иначе `pnpm test:auth-login` не сможет отфильтровать фичу.

## Что где лежит

Строки с пометкой «(появится в …)» — запланированные файлы, которых на диске ещё нет. Сверяя
таблицу с `pnpm e2e --list`, пометку игнорировать: список показывает только созданные файлы.

| Фича                | Slug             | Кейсы (md)                                                                       | Спеки                                                                                                                                                                                               | Проект | Запуск                                          |
| ------------------- | ---------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------- |
| Логин `/auth/login` | `auth-login`     | `regression/auth-login/auth-login.api.cases.md`                                  | `regression/auth-login/auth-login.api.spec.ts`                                                                                                                                                      | api    | `pnpm e2e --project=api --grep @auth-login`     |
| Логин `/auth/login` | `auth-login`     | `regression/auth-login/auth-login.functional.cases.md`                           | `regression/auth-login/auth-login.functional.spec.ts`                                                                                                                                               | web    | `pnpm e2e --project=web --grep @auth-login`     |
| Логин `/auth/login` | `auth-login`     | `regression/auth-login/auth-login.unit.cases.md`                                 | `apps/api/src/auth/*.spec.ts`, `apps/api/src/common/crypto/password.spec.ts`, `apps/api/src/users/users.service.spec.ts`, `apps/web/src/lib/session.spec.ts`, `apps/web/src/lib/api-client.spec.ts` | vitest | `pnpm test:auth-login`                          |
| Главная `/`         | `home-dashboard` | `regression/home-dashboard/home-dashboard.api.cases.md` (появится в T2.4)        | `regression/home-dashboard/home-dashboard.api.spec.ts` (появится в T2.4)                                                                                                                            | api    | `pnpm e2e --project=api --grep @home-dashboard` |
| Главная `/`         | `home-dashboard` | `regression/home-dashboard/home-dashboard.functional.cases.md` (появится в T2.9) | `regression/home-dashboard/home-dashboard.functional.spec.ts` (появится в T2.9)                                                                                                                     | web    | `pnpm e2e --project=web --grep @home-dashboard` |
| Главная `/`         | `home-dashboard` | `regression/home-dashboard/home-dashboard.unit.cases.md` (появится в T2.4)       | `apps/api/src/meetings/*.spec.ts`, `apps/web/src/lib/format-date.spec.ts`                                                                                                                           | vitest | `pnpm test:home-dashboard`                      |
| Инфраструктура      | `smoke`          | `smoke/health.api.cases.md`, `smoke/seed.api.cases.md`                           | `smoke/health.api.spec.ts`, `smoke/seed.api.spec.ts`                                                                                                                                                | api    | `pnpm e2e e2e/smoke`                            |
| Конвенция сьюта     | —                | нет (в `SELF_EXEMPT`)                                                            | `suite-integrity.api.spec.ts`                                                                                                                                                                       | api    | `pnpm e2e e2e/suite-integrity.api.spec.ts`      |

`smoke/seed.api.spec.ts` создан в T1.5, вместе с `POST /auth/login`: `SM-API-02` (логины
сид-пользователей) до этого был бы заведомо красным, а красный тест в коммите — блокер. Проверка
сид-встреч добавляется в тот же файл в T2.4, вместе с контроллером `/meetings`.

## Фикстуры

| Файл                       | Что даёт                                                                                                                               |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `fixtures/seed.ts`         | `SEED_USERS`, `TEACHER_MEETINGS`, даты создаваемых встреч. **Единственный** источник логинов, паролей и названий встреч.               |
| `fixtures/auth.api.ts`     | `loginApi(request, user)` → `accessToken`, `authHeaders(token)`. Для проекта `api`, кэш на воркер.                                     |
| `fixtures/api.ts`          | `API_BASE_URL` и фикстура `apiRequest` — контекст запросов к Nest для кейсов проекта `web`, которым нужны эталонные данные.            |
| `fixtures/auth.fixture.ts` | Опция `authUser` (тест), `authStateFor` (воркер), `authedPage` (тест) — сессия для UI-кейсов через реальный UI-логин на `/auth/login`. |
| `fixtures/console.ts`      | `collectConsoleProblems(page)` + фильтр HMR-шума `next dev`. Без фильтра кейсы на консоль флакают.                                     |

## Теги и запуск

Теги задаются опцией `tag` у `test.describe`, а не текстом в заголовке: `@regression`, `@smoke`,
`@auth-login`, `@home-dashboard`, `@mutating` (кейс изменяет данные), `@p0` (критичный минимум).

```bash
pnpm e2e                                    # всё
pnpm e2e:smoke                              # инфраструктура: сервер поднялся, сид на месте
pnpm e2e:regression                         # весь регресс
pnpm e2e:auth-login                         # одна фича целиком (API + UI)
pnpm e2e:home-dashboard
pnpm e2e:p0                                 # критичный минимум перед пушем
pnpm e2e --project=api --grep @auth-login   # только контракт, без браузера
pnpm e2e --project=web --grep @auth-login   # только UI
pnpm e2e --grep "HD-FN-07"                  # один кейс по ID
pnpm e2e --grep-invert @mutating            # диагностика флака
pnpm e2e e2e/suite-integrity.api.spec.ts    # мета-проверка конвенции
pnpm e2e:report                             # отчёт после падения

pnpm test                                   # юниты обеих фич
pnpm test:auth-login                        # юниты одной фичи (фильтр по ID кейса)
pnpm test:home-dashboard
```

`test:auth-login` / `test:home-dashboard` фильтруют юниты по ID кейса (`vitest run -t "AL-UT-"`),
поэтому работают только вместе с правилом «заголовок юнит-теста начинается с ID». Двойное `--`
между `pnpm -r test` и `-t` писать **нельзя**: `vitest` перестанет считать `-t` опцией и прогонит
все тесты. Флага `--passWithNoTests` в этих двух скриптах тоже быть не должно, хотя тест-план §1.9
его предписывает: `apps/web` несёт этот флаг в своём `test`, а `vitest@4.1.11` падает на втором
вхождении опции — `Error: Expected a single value for option "--passWithNoTests", received
[true, true]`. Флаг остаётся ровно в `apps/web/package.json`.

Порты — **3100 (web) и 3101 (api)**, Playwright поднимает серверы сам. Не переводить прогон на
3000/3001: там может висеть `next start` со старой сборкой и дать ложное «зелено».

Если предыдущий прогон падал, на портах могут остаться осиротевшие серверы:

```bash
netstat -ano | grep :3100   # взять PID из строки LISTENING
netstat -ano | grep :3101
# затем Stop-Process -Id <pid> — не глушить все node разом, у пользователя свои dev-серверы
```

## Правила устойчивости (кратко)

Полностью — в тест-плане §5; здесь то, что нарушают чаще всего.

- **Локаторы** — только по роли, метке и тексту (`getByRole`, `getByLabel`, `getByText`).
  CSS-селекторы и селекторы по классам — блокер.
- **Ожидания** — только web-first ассерты (`await expect(...).toBeVisible()`). `waitForTimeout` и
  любая фиксированная пауза — блокер, `eslint-plugin-playwright` держит это правило в `error`.
- **`await` у асинхронного матчера обязателен.** `expect(response).toBeOK()` без `await` проходит,
  ничего не проверив.
- **Данные — только из `fixtures/seed.ts`.** Хардкод логина, пароля или названия встречи — блокер.
- **`teacher` и `student` не мутируются никогда** — только на них проверяются точные числа.
  Мутирующие кейсы работают под `planner` (проект `api`) или `organizer` (проект `web`), потому что
  `fullyParallel: true` и store у Nest общий.
- **Создаваемые встречи датируются 2030 годом** (`FUTURE_STARTS_AT_ISO`). Сортировка DESC + срез
  топ-3 означают, что ассерт «новая встреча первая» верен только при дате позже любой сид-встречи
  владельца. `Date.now()` вместо константы — блокер.
- **Абсолютные ассерты на счётчики в `@mutating`-кейсах запрещены** — новая встреча ищется по
  уникальному сгенерированному заголовку, а не по `total`.
- **Браузер не ходит на `:3101`.** Весь трафик страницы идёт в Next; это проверяет `HD-FN-11`.
  Эталонные данные из Nest берутся фикстурой `apiRequest` — из Node-процесса теста, а не из браузера.
- **Заведомо красный тест не коммитится.** Если проверка невозможна на текущем этапе, спек не
  создаётся до этапа, где он станет зелёным.

## Как добавить фичу в сьют

1. Создать `e2e/regression/<slug>/` (slug в kebab-case).
2. Положить четыре файла: `<slug>.api.cases.md`, `<slug>.api.spec.ts`,
   `<slug>.functional.cases.md`, `<slug>.functional.spec.ts` — плюс `<slug>.unit.cases.md`, если у
   фичи есть юниты. Структура `.cases.md` — по шаблону тест-плана §2 (шапка, таблица-сводка, раздел
   «Кейсы» с шагами и ожидаемым результатом).
3. Выдать ID кейсам: `<ФИЧА>-<ТИП>-<NN>`, где ТИП = `API` | `FN` | `UT`. Номера **не
   переиспользуются** после удаления кейса.
4. Начать заголовок каждого теста с ID кейса. Кейс, сознательно не автоматизированный, пометить в
   `.cases.md` строкой `- **Не автоматизирован:** <причина + ссылка на задачу>` — мета-тест
   распознаёт **только** этот синтаксис.
5. Проставить теги опцией `tag` у `test.describe`: `['@regression', '@<slug>']`, плюс `@p0` и
   `@mutating` там, где нужно.
6. Юнит-спеки положить рядом с кодом в `apps/**/src/**`, а их пути и ID кейсов перечислить в
   `<slug>.unit.cases.md`, сгруппировав по спекам: мета-тест проверяет и существование путей, и то,
   что ID встречается именно в том спеке, под которым перечислен.
7. Добавить строку в таблицу «Что где лежит» выше.
8. Прогнать `pnpm e2e e2e/suite-integrity.api.spec.ts` — должен быть зелёным. Затем `pnpm e2e` и
   `pnpm test`.
