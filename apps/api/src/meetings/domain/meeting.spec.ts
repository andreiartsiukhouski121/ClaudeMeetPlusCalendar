import { describe, expect, it } from 'vitest';

import { DEFAULT_DURATION_MINUTES } from './limits.js';
import { Meeting } from './meeting.js';

/**
 * Cases `HD-UT-17`…`HD-UT-21` from `e2e/regression/home-dashboard/home-dashboard.unit.cases.md`.
 *
 * The entity reads no clock, no uuid source and no storage: the uuid is a plain argument, so
 * nothing here needs a fake. Input bounds are the DTO's and are not asked here.
 */
const UUID = '3f2b8c1e-4d5a-4e6f-8a7b-9c0d1e2f3a4b';

type CreateInput = Parameters<typeof Meeting.create>[0];

function createInput(overrides: Partial<CreateInput> = {}): CreateInput {
  return {
    ownerId: 'usr-1',
    title: 'Weekly sync',
    startsAt: '2026-01-12T10:00:00+01:00',
    durationMinutes: 30,
    participants: ['Nina Cole'],
    uuid: UUID,
    ...overrides,
  };
}

/** Drops an optional field, or passes an explicit `null` past the type, as `@IsOptional()` allows. */
function without(field: 'durationMinutes' | 'participants'): CreateInput {
  const input = createInput();
  delete input[field];

  return input;
}

function withNull(field: 'durationMinutes' | 'participants'): CreateInput {
  return { ...createInput(), [field]: null };
}

describe('Meeting.create', () => {
  it('HD-UT-17 — yields the six fields, startsAt as canonical UTC', () => {
    const meeting = Meeting.create(createInput());

    expect({ ...meeting }).toEqual({
      id: `mtg-${UUID}`,
      ownerId: 'usr-1',
      title: 'Weekly sync',
      startsAt: '2026-01-12T09:00:00.000Z',
      durationMinutes: 30,
      participants: ['Nina Cole'],
    });
    expect(typeof meeting.startsAt).toBe('string');

    const utc = Meeting.create(createInput({ startsAt: '2026-01-12T09:00:00Z' }));
    expect(utc.startsAt).toBe('2026-01-12T09:00:00.000Z');
  });

  it('HD-UT-18 — the id is mtg- plus the uuid passed in, verbatim', () => {
    const zero = '00000000-0000-0000-0000-000000000000';
    const other = '11111111-1111-1111-1111-111111111111';

    const first = Meeting.create(createInput({ uuid: zero }));
    const second = Meeting.create(createInput({ uuid: other }));

    expect(first.id).toBe('mtg-00000000-0000-0000-0000-000000000000');
    expect(second.id).toBe('mtg-11111111-1111-1111-1111-111111111111');
    expect(first.id).not.toBe(second.id);
  });

  it('HD-UT-19 — absent or null durationMinutes gives 60, a given value is kept', () => {
    expect(DEFAULT_DURATION_MINUTES).toBe(60);

    expect(Meeting.create(without('durationMinutes')).durationMinutes).toBe(60);
    expect(Meeting.create(withNull('durationMinutes')).durationMinutes).toBe(60);

    expect(Meeting.create(createInput({ durationMinutes: 15 })).durationMinutes).toBe(15);
    expect(Meeting.create(createInput({ durationMinutes: 480 })).durationMinutes).toBe(480);
  });

  it('HD-UT-20 — absent, null or empty participants give [], a given list is kept as sent', () => {
    expect(Meeting.create(without('participants')).participants).toEqual([]);
    expect(Meeting.create(withNull('participants')).participants).toEqual([]);
    expect(Meeting.create(createInput({ participants: [] })).participants).toEqual([]);

    expect(
      Meeting.create(createInput({ participants: ['Nina Cole', 'Nina Cole'] })).participants,
    ).toEqual(['Nina Cole', 'Nina Cole']);
    expect(
      Meeting.create(createInput({ participants: [' Nina Cole ', 'NINA@EXAMPLE.COM', 'Anna'] }))
        .participants,
    ).toEqual([' Nina Cole ', 'NINA@EXAMPLE.COM', 'Anna']);
  });
});

describe('Meeting.restore', () => {
  it('HD-UT-21 — validates, normalizes and defaults nothing', () => {
    const stored = {
      id: 'mtg-teacher-1',
      ownerId: 'usr-1',
      title: 'Hi',
      startsAt: '2026-01-12T10:00:00+01:00',
      durationMinutes: 5,
      participants: ['Nina Cole', 'Nina Cole'],
    };

    const restored = Meeting.restore(stored);

    expect({ ...restored }).toEqual(stored);
  });
});
