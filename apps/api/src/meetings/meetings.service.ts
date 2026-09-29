import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';

import type { CreateMeetingInput, Meeting } from './meeting.types.js';
import { SEED_MEETINGS } from './meetings.seed.js';

/** How many meetings the dashboard shows when `limit` is absent. */
export const DEFAULT_MEETINGS_LIMIT = 3;

/** Meeting duration when the client does not send one. */
export const DEFAULT_DURATION_MINUTES = 60;

/**
 * Invariant 7: `startsAt` DESC, with `id` ascending as the secondary key. Without the secondary
 * key two meetings sharing a date would fall back to insertion order and `HD-FN-05` would flake.
 * Pinned by `HD-UT-09`.
 *
 * Milliseconds are compared, not strings: a client may send an ISO date with an offset (`+03:00`),
 * and comparing such strings lexicographically gives the wrong order.
 */
function compareByStartsAtDesc(left: Meeting, right: Meeting): number {
  const byDate = Date.parse(right.startsAt) - Date.parse(left.startsAt);

  return byDate === 0 ? left.id.localeCompare(right.id) : byDate;
}

/**
 * In-memory meeting store — no database; the seed is applied in the constructor.
 *
 * Worth remembering while debugging: `nest start --watch` restarts on every edit and wipes
 * everything the tests created, so no test may depend on a meeting created by another.
 */
@Injectable()
export class MeetingsService {
  private readonly meetingsById = new Map<string, Meeting>();

  constructor() {
    for (const seed of SEED_MEETINGS) {
      // A shallow copy would share `participants` with the module-level `SEED_MEETINGS` array.
      this.meetingsById.set(seed.id, { ...seed, participants: [...seed.participants] });
    }
  }

  /**
   * The owner's most recent meetings: filter by `ownerId`, sort DESC, slice by `limit`. Returns
   * domain entities; the controller strips `ownerId` via `toMeetingDto`.
   */
  findRecent(ownerId: string, limit: number = DEFAULT_MEETINGS_LIMIT): Meeting[] {
    return this.byOwner(ownerId).sort(compareByStartsAtDesc).slice(0, limit);
  }

  /**
   * Invariant 4: the owner's **full** meeting count, not the length of `findRecent`'s slice. Using
   * `items.length` instead shows "Meetings total: 3" for five meetings (`HD-UT-03`, `HD-API-05`,
   * `HD-FN-03`).
   */
  countByOwner(ownerId: string): number {
    return this.byOwner(ownerId).length;
  }

  /**
   * `ownerId` comes **only** from the argument, which the controller takes from the token;
   * `CreateMeetingInput` has no owner field at all, and at the HTTP level `forbidNonWhitelisted`
   * rejects any attempt to send one (`HD-API-16`, `HD-API-17`).
   *
   * `startsAt` is normalized to canonical UTC: a client may send an offset date while the contract
   * promises `…Z`. Without it the store would hold strings in mixed formats.
   */
  create(ownerId: string, input: CreateMeetingInput): Meeting {
    const meeting: Meeting = {
      id: randomUUID(),
      ownerId,
      title: input.title,
      startsAt: new Date(input.startsAt).toISOString(),
      durationMinutes: input.durationMinutes ?? DEFAULT_DURATION_MINUTES,
      // `?? []` normalizes an absent or `null` participants field, mirroring `durationMinutes`
      // above (`ADR-0017`); the spread avoids sharing the array with the request body's own.
      participants: [...(input.participants ?? [])],
    };

    this.meetingsById.set(meeting.id, meeting);

    return { ...meeting, participants: [...meeting.participants] };
  }

  /**
   * Owner-scoped lookup by id. `Meeting | undefined` with **one** return path: a missing id and an
   * id owned by somebody else both fall through to the same `undefined` — the ownership check lives
   * here, not in the controller, so the two 404 situations stay byte-identical by construction
   * (`ADR-0018`). `ownerId` is always the caller's, taken by the controller from `@CurrentUser()`.
   */
  findById(ownerId: string, id: string): Meeting | undefined {
    const meeting = this.meetingsById.get(id);

    return meeting && meeting.ownerId === ownerId
      ? { ...meeting, participants: [...meeting.participants] }
      : undefined;
  }

  /** Copies, not references to stored objects: callers must not mutate the store. */
  private byOwner(ownerId: string): Meeting[] {
    return [...this.meetingsById.values()]
      .filter((meeting) => meeting.ownerId === ownerId)
      .map((meeting) => ({ ...meeting, participants: [...meeting.participants] }));
  }
}
