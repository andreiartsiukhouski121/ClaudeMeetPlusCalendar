/**
 * Зеркало сида `apps/api` (плана имплементации §3.3 и §3.4) — единственный источник истины
 * для тестов. Хардкод логина, пароля или названия встречи прямо в спеке — блокер на ревью
 * (тест-план §5.6): при изменении сида такой спек краснеет в непонятном месте, а не в одном.
 *
 * Файл сознательно НЕ импортирует ничего из `apps/api`: сьют проверяет сервер по HTTP как
 * чёрный ящик, а импорт сделал бы ассерт тавтологией — сравнением константы с самой собой.
 * Расхождение этих значений с `users.seed.ts`/`meetings.seed.ts` ловит `e2e/smoke/seed.api.spec.ts`.
 */

export type SeedUserKey = 'teacher' | 'student' | 'planner' | 'organizer';

export interface SeedUser {
  email: string;
  password: string;
  name: string;
  /** Сколько встреч у пользователя в свежем сиде. */
  meetingsCount: number;
}

/**
 * Один пароль на всех: разные пароли не добавляют ни одной проверяемой ветки,
 * зато создают шум в кейсах.
 */
const SEED_PASSWORD = 'Passw0rd!';

/**
 * Четыре пользователя, а не два — из-за `fullyParallel: true` и мутирующего `POST /meetings`:
 * store общий, поэтому у каждого мутирующего spec-файла обязан быть свой владелец, иначе
 * счётчики проектов `api` и `web` начнут гонять друг друга (тест-план §5.4).
 *
 * `teacher` и `student` мутировать ЗАПРЕЩЕНО: только на них проверяются точные числа.
 */
export const SEED_USERS: Record<SeedUserKey, SeedUser> = {
  teacher: {
    email: 'teacher@purpleschool.test',
    password: SEED_PASSWORD,
    name: 'Анна Преподаватель',
    meetingsCount: 5,
  },
  student: {
    email: 'student@purpleschool.test',
    password: SEED_PASSWORD,
    name: 'Иван Студент',
    meetingsCount: 0,
  },
  // Песочница мутаций только для *.api.spec.ts.
  planner: {
    email: 'planner@purpleschool.test',
    password: SEED_PASSWORD,
    name: 'Мария Планировщик',
    meetingsCount: 1,
  },
  // Песочница мутаций только для *.functional.spec.ts.
  organizer: {
    email: 'organizer@purpleschool.test',
    password: SEED_PASSWORD,
    name: 'Пётр Организатор',
    meetingsCount: 1,
  },
};

export const SEED_USER_KEYS = Object.keys(SEED_USERS) as SeedUserKey[];

/**
 * Ожидаемые данные `teacher` — эталон для HD-API-03…05, HD-FN-03 и HD-FN-05.
 * Даты в сиде фиксированные и абсолютные (никаких `Date.now()`), поэтому порядок
 * и отсечение проверяются по конкретным строкам, а не по количеству.
 */
export const TEACHER_MEETINGS = {
  /** Полное число встреч владельца — то, что обязан вернуть `total`, а не длина `items`. */
  total: 5,
  /** Дефолтный `limit` сервиса: сколько встреч показывает дашборд. */
  latestLimit: 3,
  /** Заголовки трёх последних встреч в порядке сортировки по `startsAt` DESC. */
  latestTitles: [
    'Итоговое занятие модуля', // 2026-01-22T16:15:00.000Z
    'Консультация перед контрольной', // 2026-01-19T08:00:00.000Z
    'Практикум по геометрии', // 2026-01-15T14:00:00.000Z
  ],
  /** Заголовки, которые срез топ-3 обязан отсечь. Ассерт «их нет» — половина смысла HD-API-04. */
  omittedTitles: [
    'Разбор домашнего задания', // 2026-01-13T11:30:00.000Z
    'Вводный урок по алгебре', // 2026-01-12T09:00:00.000Z
  ],
} as const;

/**
 * Все встречи, создаваемые тестами, датируются 2030 годом. Сортировка DESC + срез топ-3
 * означают, что ассерт «новая встреча первая в списке» верен только при дате позже любой
 * сид-встречи владельца (`organizer` — 2026-01-14, `planner` — 2026-01-16).
 * Дата «сегодня» или `Date.now()` вместо этих констант — блокер (тест-план §6.3).
 */
export const FUTURE_STARTS_AT_ISO = '2030-01-01T10:00:00.000Z';

/** То же значение в формате поля `<input type="datetime-local">`. */
export const FUTURE_STARTS_AT_LOCAL = '2030-01-01T10:00';
