import { afterEach, describe, expect, it } from 'vitest';

import { formatMeetingDateTime, INVALID_DATE_PLACEHOLDER, toIsoStartsAt } from './format-date';

/**
 * Кейсы `HD-UT-10`, `HD-UT-11`, `HD-UT-15`, `HD-UT-16` из
 * `e2e/regression/home-dashboard/home-dashboard.unit.cases.md`.
 *
 * Глобалы в `apps/web` не включены (см. `vitest.config.ts`), поэтому `describe/it/expect`
 * импортируются явно.
 *
 * Смысл файла — доказать независимость от таймзоны процесса. `process.env.TZ` в Node
 * влияет на последующие операции с датами, поэтому проверка «одинаковый результат при
 * `TZ=UTC` и `TZ=Asia/Tokyo`» здесь настоящая, а не декоративная; исходное значение
 * возвращается в `afterEach`, чтобы порядок тестов ни на что не влиял.
 */
const ORIGINAL_TZ = process.env.TZ;

function withTimeZone<T>(timeZone: string, run: () => T): T {
  process.env.TZ = timeZone;
  return run();
}

afterEach(() => {
  if (ORIGINAL_TZ === undefined) {
    delete process.env.TZ;
  } else {
    process.env.TZ = ORIGINAL_TZ;
  }
});

describe('formatMeetingDateTime', () => {
  it('HD-UT-10 — одинаковая строка при TZ=UTC и TZ=Asia/Tokyo, включая границу суток', () => {
    // 23:30 UTC: в Токио это уже следующий день — без `timeZone: 'UTC'` дата сдвинулась бы.
    const nearMidnight = '2026-01-12T23:30:00.000Z';

    const inUtc = withTimeZone('UTC', () => formatMeetingDateTime(nearMidnight));
    const inTokyo = withTimeZone('Asia/Tokyo', () => formatMeetingDateTime(nearMidnight));

    expect(inTokyo).toBe(inUtc);
    // Дата именно 12-е, а не 13-е, и время именно 23:30.
    expect(inUtc).toContain('2026');
    expect(inUtc).toContain('12');
    expect(inUtc).toContain('23:30');
    expect(inUtc).not.toContain('13');

    const midday = '2026-01-15T14:00:00.000Z';
    expect(withTimeZone('Asia/Tokyo', () => formatMeetingDateTime(midday))).toBe(
      withTimeZone('UTC', () => formatMeetingDateTime(midday)),
    );
  });

  it('HD-UT-11 — невалидная дата даёт плейсхолдер без Invalid Date и без исключения', () => {
    expect(() => formatMeetingDateTime('не дата')).not.toThrow();

    for (const broken of ['не дата', '', '2026-13-45T99:99:99Z']) {
      expect(formatMeetingDateTime(broken)).toBe(INVALID_DATE_PLACEHOLDER);
      expect(formatMeetingDateTime(broken)).not.toContain('Invalid');
      expect(formatMeetingDateTime(broken)).not.toContain('NaN');
    }
  });
});

describe('toIsoStartsAt', () => {
  it('HD-UT-15 — значение datetime-local даёт одинаковую ISO-строку при TZ=UTC и TZ=Asia/Tokyo', () => {
    const local = '2030-01-01T10:00';

    const inUtc = withTimeZone('UTC', () => toIsoStartsAt(local));
    const inTokyo = withTimeZone('Asia/Tokyo', () => toIsoStartsAt(local));

    expect(inUtc).toBe('2030-01-01T10:00:00.000Z');
    expect(inTokyo).toBe(inUtc);

    // Значение с явной зоной трактуется как есть, а не переинтерпретируется.
    expect(withTimeZone('Asia/Tokyo', () => toIsoStartsAt('2030-01-01T10:00:00.000Z'))).toBe(
      '2030-01-01T10:00:00.000Z',
    );
  });

  it('HD-UT-16 — пустая строка и мусор дают null без исключения', () => {
    expect(() => toIsoStartsAt('')).not.toThrow();
    expect(() => toIsoStartsAt('не дата')).not.toThrow();

    expect(toIsoStartsAt('')).toBeNull();
    expect(toIsoStartsAt('   ')).toBeNull();
    expect(toIsoStartsAt('не дата')).toBeNull();
    expect(toIsoStartsAt('2030-99-99T99:99')).toBeNull();
  });
});
