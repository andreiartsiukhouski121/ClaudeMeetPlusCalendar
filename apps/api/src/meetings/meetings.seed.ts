import type { Meeting } from './meeting.types.js';

/**
 * Сид встреч (план имплементации §3.4). Зеркало этих значений для тестов —
 * `e2e/fixtures/seed.ts` (`TEACHER_MEETINGS`); расхождение ловит `SM-API-03`
 * в `e2e/smoke/seed.api.spec.ts`.
 *
 * Даты фиксированные и абсолютные — **никаких `Date.now()`**: иначе ассерты порядка
 * и отсечения топ-3 поплывут вместе с календарём.
 *
 * Раскладка по владельцам не случайна (§3.3, тест-план §5.4):
 *  - `usr-teacher` — 5 встреч, read-only эталон точных чисел («последние 3», `total` = 5);
 *  - `usr-student` — 0 встреч, граничный случай «пустое состояние»;
 *  - `usr-planner` — 1 встреча, песочница мутаций для `*.api.spec.ts`;
 *  - `usr-organizer` — 1 встреча, песочница мутаций для `*.functional.spec.ts`.
 */
export const SEED_MEETINGS: readonly Meeting[] = [
  {
    id: 'mtg-teacher-1',
    ownerId: 'usr-teacher',
    title: 'Вводный урок по алгебре',
    startsAt: '2026-01-12T09:00:00.000Z',
    durationMinutes: 60,
  },
  {
    id: 'mtg-teacher-2',
    ownerId: 'usr-teacher',
    title: 'Разбор домашнего задания',
    startsAt: '2026-01-13T11:30:00.000Z',
    durationMinutes: 45,
  },
  {
    id: 'mtg-teacher-3',
    ownerId: 'usr-teacher',
    title: 'Практикум по геометрии',
    startsAt: '2026-01-15T14:00:00.000Z',
    durationMinutes: 90,
  },
  {
    id: 'mtg-teacher-4',
    ownerId: 'usr-teacher',
    title: 'Консультация перед контрольной',
    startsAt: '2026-01-19T08:00:00.000Z',
    durationMinutes: 30,
  },
  {
    id: 'mtg-teacher-5',
    ownerId: 'usr-teacher',
    title: 'Итоговое занятие модуля',
    startsAt: '2026-01-22T16:15:00.000Z',
    durationMinutes: 60,
  },
  {
    id: 'mtg-planner-1',
    ownerId: 'usr-planner',
    title: 'Ретро спринта',
    startsAt: '2026-01-16T13:00:00.000Z',
    durationMinutes: 45,
  },
  {
    id: 'mtg-organizer-1',
    ownerId: 'usr-organizer',
    title: 'Планёрка команды',
    startsAt: '2026-01-14T10:00:00.000Z',
    durationMinutes: 30,
  },
];
