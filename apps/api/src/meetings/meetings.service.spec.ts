import { beforeEach, describe, expect, it } from 'vitest';

import type { Meeting } from './meeting.types.js';
import { SEED_MEETINGS } from './meetings.seed.js';
import {
  DEFAULT_DURATION_MINUTES,
  DEFAULT_MEETINGS_LIMIT,
  MeetingsService,
} from './meetings.service.js';

/**
 * Cases `HD-UT-01…09` from `e2e/regression/home-dashboard/home-dashboard.unit.cases.md`, and
 * `MD-UT-01…09` from `e2e/regression/meetings-detail/meetings-detail.unit.cases.md`.
 *
 * Test data is created through `create()` under dedicated owners (`usr-unit-*`) rather than taken
 * from the seed: the seed is sorted ascending, so the "arbitrary order" of `HD-UT-01` cannot be
 * reproduced on it, and a test must not go red just because a meeting was added to the seed. Exact
 * numbers for seeded owners are checked by `HD-API-05` and `SM-API-03`.
 *
 * The service is rebuilt before each test: its store is a `Map`, so created meetings would
 * otherwise leak between cases.
 */
describe('MeetingsService', () => {
  const OWNER = 'usr-unit-owner';
  const OTHER_OWNER = 'usr-unit-other';

  let service: MeetingsService;

  beforeEach(() => {
    service = new MeetingsService();
  });

  /** Dates deliberately shuffled: sorting is the service's job, not insertion order's. */
  function seedShuffled(ownerId: string = OWNER): Meeting[] {
    return [
      service.create(ownerId, { title: 'Third', startsAt: '2026-03-10T10:00:00.000Z' }),
      service.create(ownerId, { title: 'First', startsAt: '2026-01-10T10:00:00.000Z' }),
      service.create(ownerId, { title: 'Fifth', startsAt: '2026-05-10T10:00:00.000Z' }),
      service.create(ownerId, { title: 'Second', startsAt: '2026-02-10T10:00:00.000Z' }),
      service.create(ownerId, { title: 'Fourth', startsAt: '2026-04-10T10:00:00.000Z' }),
    ];
  }

  it('HD-UT-01 — findRecent sorts by date DESC regardless of input order', () => {
    seedShuffled();

    const titles = service.findRecent(OWNER, 5).map((meeting) => meeting.title);

    expect(titles).toEqual(['Fifth', 'Fourth', 'Third', 'Second', 'First']);

    const timestamps = service.findRecent(OWNER, 5).map((meeting) => Date.parse(meeting.startsAt));
    const nonIncreasing = timestamps.every(
      (value, index) => index === 0 || timestamps[index - 1] >= value,
    );
    expect(nonIncreasing).toBe(true);
  });

  it('HD-UT-02 — findRecent applies limit: 5 meetings with limit=3 returns 3', () => {
    seedShuffled();

    expect(service.findRecent(OWNER, 3)).toHaveLength(3);
  });

  it('HD-UT-03 — countByOwner equals the full meeting count, not the length of findRecent', () => {
    seedShuffled();

    const page = service.findRecent(OWNER, 3);

    expect(service.countByOwner(OWNER)).toBe(5);
    expect(page).toHaveLength(3);
    // Exactly the mistake the control experiment targets: `total = items.length`.
    expect(service.countByOwner(OWNER)).not.toBe(page.length);
  });

  it('HD-UT-04 — findRecent filters by ownerId: other users meetings never appear', () => {
    seedShuffled();
    const foreign = service.create(OTHER_OWNER, {
      title: 'Someone elses meeting',
      startsAt: '2030-01-01T10:00:00.000Z',
    });

    const ids = service.findRecent(OWNER, 100).map((meeting) => meeting.id);

    // The foreign meeting is deliberately the newest: without filtering it would come first.
    expect(ids).not.toContain(foreign.id);
    expect(service.findRecent(OWNER, 100).every((meeting) => meeting.ownerId === OWNER)).toBe(true);
    expect(service.findRecent(OTHER_OWNER, 100).map((meeting) => meeting.id)).toEqual([foreign.id]);
  });

  it('HD-UT-05 — a user with no meetings: findRecent is empty, countByOwner is 0', () => {
    expect(service.findRecent('usr-unit-nobody', 3)).toEqual([]);
    expect(service.countByOwner('usr-unit-nobody')).toBe(0);
  });

  it('HD-UT-06 — the default limit of 3 applies when the parameter is omitted', () => {
    seedShuffled();

    expect(DEFAULT_MEETINGS_LIMIT).toBe(3);
    expect(service.findRecent(OWNER)).toHaveLength(DEFAULT_MEETINGS_LIMIT);
    // `undefined` is exactly what `ListMeetingsQueryDto` yields without the parameter.
    expect(service.findRecent(OWNER, undefined)).toHaveLength(DEFAULT_MEETINGS_LIMIT);
  });

  it('HD-UT-07 — create takes ownerId from its argument and id from randomUUID', () => {
    const created = service.create(OWNER, {
      title: 'Meeting owned via argument',
      startsAt: '2030-01-01T10:00:00.000Z',
    });

    expect(created.ownerId).toBe(OWNER);
    expect(created.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    // The id does not match the seeded `mtg-*` shape, so it was generated rather than supplied.
    expect(SEED_MEETINGS.some((meeting) => meeting.id === created.id)).toBe(false);
    expect(service.findRecent(OWNER, 100).map((meeting) => meeting.ownerId)).toEqual([OWNER]);
  });

  it('HD-UT-08 — create returns an entity with an id, the given title and durationMinutes ?? 60', () => {
    const withDuration = service.create(OWNER, {
      title: 'Thirty minute meeting',
      startsAt: '2030-01-01T10:00:00.000Z',
      durationMinutes: 30,
    });
    const withoutDuration = service.create(OWNER, {
      title: 'Meeting without a duration',
      startsAt: '2030-01-02T10:00:00.000Z',
    });

    expect(withDuration.title).toBe('Thirty minute meeting');
    expect(withDuration.durationMinutes).toBe(30);
    expect(withoutDuration.title).toBe('Meeting without a duration');
    expect(withoutDuration.durationMinutes).toBe(DEFAULT_DURATION_MINUTES);
    expect(DEFAULT_DURATION_MINUTES).toBe(60);
    expect(typeof withoutDuration.id).toBe('string');
  });

  it('HD-UT-09 — equal dates still give a deterministic order (secondary sort by id)', () => {
    const sameDate = '2026-06-01T12:00:00.000Z';
    const created = [
      service.create(OWNER, { title: 'A', startsAt: sameDate }),
      service.create(OWNER, { title: 'B', startsAt: sameDate }),
      service.create(OWNER, { title: 'C', startsAt: sameDate }),
    ];
    const expectedIds = created.map((meeting) => meeting.id).sort((a, b) => a.localeCompare(b));

    // Twice in a row: the order must depend on neither insertion order nor the run.
    expect(service.findRecent(OWNER, 3).map((meeting) => meeting.id)).toEqual(expectedIds);
    expect(service.findRecent(OWNER, 3).map((meeting) => meeting.id)).toEqual(expectedIds);
  });

  /**
   * Cases `MD-UT-01…09` from
   * `e2e/regression/meetings-detail/meetings-detail.unit.cases.md`. `MD-UT-01…08` reuse the
   * `usr-unit-*` owners created through `create()`, same convention as `HD-UT-01…09`; `MD-UT-09`
   * reads the seed directly — it is the seed array specifically that the constructor's copy site
   * protects.
   */
  it('MD-UT-01 — findById returns the full meeting for its owner', () => {
    const created = service.create(OWNER, {
      title: 'Full detail meeting',
      startsAt: '2030-02-01T10:00:00.000Z',
      durationMinutes: 45,
      participants: ['Nina Cole'],
    });

    expect(service.findById(OWNER, created.id)).toEqual(created);
  });

  it('MD-UT-02 — findById returns undefined for an unknown id', () => {
    service.create(OWNER, { title: 'Some meeting', startsAt: '2030-02-01T10:00:00.000Z' });

    expect(service.findById(OWNER, 'no-such-id')).toBeUndefined();
  });

  it('MD-UT-03 — findById returns undefined for an id owned by somebody else', () => {
    const created = service.create(OWNER, {
      title: 'Owned by OWNER',
      startsAt: '2030-02-01T10:00:00.000Z',
    });

    // Same `undefined` as MD-UT-02, by construction (ADR-0018): the ownership check lives inside
    // `findById` itself, so a wrong owner and an unknown id are one return path, not two that
    // merely happen to agree.
    expect(service.findById(OTHER_OWNER, created.id)).toBeUndefined();
  });

  it('MD-UT-04 — create normalizes absent, [] and explicit null participants to []', () => {
    const absent = service.create(OWNER, {
      title: 'Absent participants',
      startsAt: '2030-03-01T10:00:00.000Z',
    });
    const emptyArray = service.create(OWNER, {
      title: 'Empty array participants',
      startsAt: '2030-03-02T10:00:00.000Z',
      participants: [],
    });
    const explicitNull = service.create(OWNER, {
      title: 'Explicit null participants',
      startsAt: '2030-03-03T10:00:00.000Z',
      // Past the type: a validated-but-permissive runtime value, exactly what `ADR-0017` and
      // design probe PF2 measure.
      participants: null as unknown as string[],
    });

    expect(absent.participants).toEqual([]);
    expect(emptyArray.participants).toEqual([]);
    expect(explicitNull.participants).toEqual([]);
  });

  it('MD-UT-05 — create stores a given participants array verbatim, order preserved', () => {
    const participants = ['  Nina Cole ', 'Nina Cole', 'Nina Cole', 'guest@purpleschool.test'];

    const created = service.create(OWNER, {
      title: 'Verbatim participants',
      startsAt: '2030-03-04T10:00:00.000Z',
      participants,
    });

    // Neither trimmed nor deduplicated: the repeated and the padded entry both survive as given.
    expect(created.participants).toEqual(participants);
  });

  it("MD-UT-06 — create's returned array is a copy, not shared with the store", () => {
    const created = service.create(OWNER, {
      title: 'Copy on create',
      startsAt: '2030-03-05T10:00:00.000Z',
      participants: ['Nina Cole'],
    });

    created.participants.push('Mutated after the fact');

    expect(service.findById(OWNER, created.id)?.participants).toEqual(['Nina Cole']);
  });

  it('MD-UT-07 — findById returns an independent array on every call', () => {
    const created = service.create(OWNER, {
      title: 'Copy on findById',
      startsAt: '2030-03-06T10:00:00.000Z',
      participants: ['Nina Cole'],
    });

    service.findById(OWNER, created.id)?.participants.push('Mutated after the fact');

    expect(service.findById(OWNER, created.id)?.participants).toEqual(['Nina Cole']);
  });

  it("MD-UT-08 — findRecent's returned array is a copy, not shared with the store", () => {
    service.create(OWNER, {
      title: 'Copy on findRecent',
      startsAt: '2030-03-07T10:00:00.000Z',
      participants: ['Nina Cole'],
    });

    const [first] = service.findRecent(OWNER, 1);
    first.participants.push('Mutated after the fact');

    const [second] = service.findRecent(OWNER, 1);
    expect(second.participants).toEqual(['Nina Cole']);
  });

  it('MD-UT-09 — the constructor copy does not share the array with SEED_MEETINGS', () => {
    const seeded = SEED_MEETINGS.find((meeting) => meeting.participants.length > 0);
    expect(seeded, 'seed must carry at least one meeting with participants').toBeDefined();
    const { id, ownerId, participants: seedParticipants } = seeded as Meeting;
    const original = [...seedParticipants];

    try {
      // Mutating the returned clone (as MD-UT-07 does) cannot expose this bug: `findById` clones
      // on every exit regardless of what the constructor did. The only way to observe whether the
      // constructor shared the reference is to mutate `SEED_MEETINGS` itself, from outside the
      // service, and see whether the store's own copy moved with it.
      seedParticipants.push('Mutated after the fact');

      expect(service.findById(ownerId, id)?.participants).toEqual(original);
    } finally {
      // Restore the module-level constant regardless of the assertion's outcome: it is shared
      // with every other test in this file and with `e2e/fixtures/seed.ts`'s mirror check.
      seedParticipants.length = 0;
      seedParticipants.push(...original);
    }
  });
});
