import { afterEach, describe, expect, it } from 'vitest';

import { formatMeetingDateTime, INVALID_DATE_PLACEHOLDER, toIsoStartsAt } from './format-date';

/**
 * Cases `HD-UT-10`, `HD-UT-11`, `HD-UT-15`, `HD-UT-16` from
 * `e2e/regression/home-dashboard/home-dashboard.unit.cases.md`.
 *
 * Globals are off in `apps/web`, so `describe/it/expect` are imported explicitly.
 *
 * The point of this file is to prove independence from the process time zone. `process.env.TZ`
 * genuinely affects later date operations in Node, so the "same result under `TZ=UTC` and
 * `TZ=Asia/Tokyo`" check is real rather than decorative; the original value is restored in
 * `afterEach` so test order cannot matter.
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
  it('HD-UT-10 — the same string under TZ=UTC and TZ=Asia/Tokyo, including across midnight', () => {
    // 23:30 UTC is already the next day in Tokyo — without `timeZone: 'UTC'` the date would shift.
    const nearMidnight = '2026-01-12T23:30:00.000Z';

    const inUtc = withTimeZone('UTC', () => formatMeetingDateTime(nearMidnight));
    const inTokyo = withTimeZone('Asia/Tokyo', () => formatMeetingDateTime(nearMidnight));

    expect(inTokyo).toBe(inUtc);
    // The date is the 12th, not the 13th, and the time is 23:30.
    expect(inUtc).toContain('2026');
    expect(inUtc).toContain('12');
    expect(inUtc).toContain('23:30');
    expect(inUtc).not.toContain('13');

    const midday = '2026-01-15T14:00:00.000Z';
    expect(withTimeZone('Asia/Tokyo', () => formatMeetingDateTime(midday))).toBe(
      withTimeZone('UTC', () => formatMeetingDateTime(midday)),
    );
  });

  it('HD-UT-11 — an invalid date yields the placeholder, with no Invalid Date and no exception', () => {
    expect(() => formatMeetingDateTime('not a date')).not.toThrow();

    for (const broken of ['not a date', '', '2026-13-45T99:99:99Z']) {
      expect(formatMeetingDateTime(broken)).toBe(INVALID_DATE_PLACEHOLDER);
      expect(formatMeetingDateTime(broken)).not.toContain('Invalid');
      expect(formatMeetingDateTime(broken)).not.toContain('NaN');
    }
  });
});

describe('toIsoStartsAt', () => {
  it('HD-UT-15 — a datetime-local value gives the same ISO string under TZ=UTC and TZ=Asia/Tokyo', () => {
    const local = '2030-01-01T10:00';

    const inUtc = withTimeZone('UTC', () => toIsoStartsAt(local));
    const inTokyo = withTimeZone('Asia/Tokyo', () => toIsoStartsAt(local));

    expect(inUtc).toBe('2030-01-01T10:00:00.000Z');
    expect(inTokyo).toBe(inUtc);

    // A value with an explicit zone is taken as is rather than reinterpreted.
    expect(withTimeZone('Asia/Tokyo', () => toIsoStartsAt('2030-01-01T10:00:00.000Z'))).toBe(
      '2030-01-01T10:00:00.000Z',
    );
  });

  it('HD-UT-16 — an empty string and junk give null without throwing', () => {
    expect(() => toIsoStartsAt('')).not.toThrow();
    expect(() => toIsoStartsAt('not a date')).not.toThrow();

    expect(toIsoStartsAt('')).toBeNull();
    expect(toIsoStartsAt('   ')).toBeNull();
    expect(toIsoStartsAt('not a date')).toBeNull();
    expect(toIsoStartsAt('2030-99-99T99:99')).toBeNull();
  });
});
