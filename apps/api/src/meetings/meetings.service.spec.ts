import { beforeEach, describe, expect, it } from 'vitest';

import type { Meeting } from './meeting.types.js';
import { SEED_MEETINGS } from './meetings.seed.js';
import {
  DEFAULT_DURATION_MINUTES,
  DEFAULT_MEETINGS_LIMIT,
  MeetingsService,
} from './meetings.service.js';

/**
 * Кейсы `HD-UT-01…09` из `e2e/regression/home-dashboard/home-dashboard.unit.cases.md`.
 *
 * Данные для проверок создаются через `create()` под собственными владельцами
 * (`usr-unit-*`), а не берутся из сида: во-первых, сид отсортирован по возрастанию дат,
 * то есть «произвольный порядок» из `HD-UT-01` на нём не воспроизвести; во-вторых, тест не
 * должен краснеть от того, что в сид добавили встречу. Сид-владельцев (`usr-teacher`)
 * эти тесты не трогают — точные числа по ним проверяют `HD-API-05` и `SM-API-03`.
 *
 * Инстанс сервиса создаётся заново перед каждым тестом: store внутри — `Map`, и созданные
 * встречи иначе протекали бы между кейсами.
 */
describe('MeetingsService', () => {
  const OWNER = 'usr-unit-owner';
  const OTHER_OWNER = 'usr-unit-other';

  let service: MeetingsService;

  beforeEach(() => {
    service = new MeetingsService();
  });

  /** Даты нарочно вперемешку: сортировку должен делать сервис, а не порядок вставки. */
  function seedShuffled(ownerId: string = OWNER): Meeting[] {
    return [
      service.create(ownerId, { title: 'Третья', startsAt: '2026-03-10T10:00:00.000Z' }),
      service.create(ownerId, { title: 'Первая', startsAt: '2026-01-10T10:00:00.000Z' }),
      service.create(ownerId, { title: 'Пятая', startsAt: '2026-05-10T10:00:00.000Z' }),
      service.create(ownerId, { title: 'Вторая', startsAt: '2026-02-10T10:00:00.000Z' }),
      service.create(ownerId, { title: 'Четвёртая', startsAt: '2026-04-10T10:00:00.000Z' }),
    ];
  }

  it('HD-UT-01 — findRecent сортирует по дате DESC при произвольном порядке входных данных', () => {
    seedShuffled();

    const titles = service.findRecent(OWNER, 5).map((meeting) => meeting.title);

    expect(titles).toEqual(['Пятая', 'Четвёртая', 'Третья', 'Вторая', 'Первая']);

    const timestamps = service.findRecent(OWNER, 5).map((meeting) => Date.parse(meeting.startsAt));
    const nonIncreasing = timestamps.every(
      (value, index) => index === 0 || timestamps[index - 1] >= value,
    );
    expect(nonIncreasing).toBe(true);
  });

  it('HD-UT-02 — findRecent применяет limit: при 5 встречах и limit=3 возвращается 3', () => {
    seedShuffled();

    expect(service.findRecent(OWNER, 3)).toHaveLength(3);
  });

  it('HD-UT-03 — countByOwner равен полному числу встреч, а не длине findRecent', () => {
    seedShuffled();

    const page = service.findRecent(OWNER, 3);

    expect(service.countByOwner(OWNER)).toBe(5);
    expect(page).toHaveLength(3);
    // Ровно та ошибка, которую ловит контрольный опыт T2.10: `total = items.length`.
    expect(service.countByOwner(OWNER)).not.toBe(page.length);
  });

  it('HD-UT-04 — findRecent фильтрует по ownerId: встречи других пользователей не попадают', () => {
    seedShuffled();
    const foreign = service.create(OTHER_OWNER, {
      title: 'Чужая встреча',
      startsAt: '2030-01-01T10:00:00.000Z',
    });

    const ids = service.findRecent(OWNER, 100).map((meeting) => meeting.id);

    // Дата чужой встречи заведомо самая новая: без фильтра она стояла бы первой.
    expect(ids).not.toContain(foreign.id);
    expect(service.findRecent(OWNER, 100).every((meeting) => meeting.ownerId === OWNER)).toBe(true);
    expect(service.findRecent(OTHER_OWNER, 100).map((meeting) => meeting.id)).toEqual([foreign.id]);
  });

  it('HD-UT-05 — пользователь без встреч: findRecent пуст, countByOwner = 0', () => {
    expect(service.findRecent('usr-unit-nobody', 3)).toEqual([]);
    expect(service.countByOwner('usr-unit-nobody')).toBe(0);
  });

  it('HD-UT-06 — дефолтный limit = 3 применяется, когда параметр не передан', () => {
    seedShuffled();

    expect(DEFAULT_MEETINGS_LIMIT).toBe(3);
    expect(service.findRecent(OWNER)).toHaveLength(DEFAULT_MEETINGS_LIMIT);
    // `undefined` — именно то, что придёт из `ListMeetingsQueryDto` без параметра.
    expect(service.findRecent(OWNER, undefined)).toHaveLength(DEFAULT_MEETINGS_LIMIT);
  });

  it('HD-UT-07 — create пишет ownerId из аргумента и id из randomUUID', () => {
    const created = service.create(OWNER, {
      title: 'Встреча владельца из аргумента',
      startsAt: '2030-01-01T10:00:00.000Z',
    });

    expect(created.ownerId).toBe(OWNER);
    expect(created.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    // id не совпадает с сидовым форматом `mtg-*`, то есть точно сгенерирован, а не задан.
    expect(SEED_MEETINGS.some((meeting) => meeting.id === created.id)).toBe(false);
    expect(service.findRecent(OWNER, 100).map((meeting) => meeting.ownerId)).toEqual([OWNER]);
  });

  it('HD-UT-08 — create возвращает сущность с id, переданным title и durationMinutes ?? 60', () => {
    const withDuration = service.create(OWNER, {
      title: 'Встреча на 30 минут',
      startsAt: '2030-01-01T10:00:00.000Z',
      durationMinutes: 30,
    });
    const withoutDuration = service.create(OWNER, {
      title: 'Встреча без длительности',
      startsAt: '2030-01-02T10:00:00.000Z',
    });

    expect(withDuration.title).toBe('Встреча на 30 минут');
    expect(withDuration.durationMinutes).toBe(30);
    expect(withoutDuration.title).toBe('Встреча без длительности');
    expect(withoutDuration.durationMinutes).toBe(DEFAULT_DURATION_MINUTES);
    expect(DEFAULT_DURATION_MINUTES).toBe(60);
    expect(typeof withoutDuration.id).toBe('string');
  });

  it('HD-UT-09 — при одинаковых датах порядок детерминирован (вторичная сортировка по id)', () => {
    const sameDate = '2026-06-01T12:00:00.000Z';
    const created = [
      service.create(OWNER, { title: 'A', startsAt: sameDate }),
      service.create(OWNER, { title: 'B', startsAt: sameDate }),
      service.create(OWNER, { title: 'C', startsAt: sameDate }),
    ];
    const expectedIds = created.map((meeting) => meeting.id).sort((a, b) => a.localeCompare(b));

    // Дважды подряд: порядок не должен зависеть ни от порядка вставки, ни от прогона.
    expect(service.findRecent(OWNER, 3).map((meeting) => meeting.id)).toEqual(expectedIds);
    expect(service.findRecent(OWNER, 3).map((meeting) => meeting.id)).toEqual(expectedIds);
  });
});
