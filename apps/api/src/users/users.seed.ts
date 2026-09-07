/**
 * Сид пользователей (план имплементации §3.3). Зеркало этих значений для тестов —
 * `e2e/fixtures/seed.ts`; расхождение ловит `e2e/smoke/seed.api.spec.ts` (SM-API-02).
 *
 * Плейнтекст-пароли живут ровно здесь и хешируются `scrypt` при инициализации
 * `UsersService`. Хардкодить хекс-литералы хешей нельзя: их нельзя воспроизвести,
 * нельзя поменять пароль, не переписав вручную, а смена параметров scrypt молча
 * ломает вход. Осознанное допущение демо без БД (§8 п.3).
 */

export interface SeedUser {
  id: string;
  email: string;
  name: string;
  password: string;
}

/** Один пароль на всех: разные не добавляют ни одной проверяемой ветки, только шум в кейсах. */
const SEED_PASSWORD = 'Passw0rd!';

/**
 * Четыре пользователя, а не два: `POST /meetings` мутирует общий in-memory store, а Playwright
 * гоняет `fullyParallel: true`, поэтому у каждого мутирующего spec-файла свой владелец
 * (`planner` — для `*.api.spec.ts`, `organizer` — для `*.functional.spec.ts`), а `teacher`
 * и `student` остаются read-only эталонами точных чисел.
 */
export const SEED_USERS: readonly SeedUser[] = [
  {
    id: 'usr-teacher',
    email: 'teacher@purpleschool.test',
    name: 'Анна Преподаватель',
    password: SEED_PASSWORD,
  },
  {
    id: 'usr-student',
    email: 'student@purpleschool.test',
    name: 'Иван Студент',
    password: SEED_PASSWORD,
  },
  {
    id: 'usr-planner',
    email: 'planner@purpleschool.test',
    name: 'Мария Планировщик',
    password: SEED_PASSWORD,
  },
  {
    id: 'usr-organizer',
    email: 'organizer@purpleschool.test',
    name: 'Пётр Организатор',
    password: SEED_PASSWORD,
  },
];
