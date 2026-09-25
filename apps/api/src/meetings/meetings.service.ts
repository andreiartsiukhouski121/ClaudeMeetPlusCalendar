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
      this.meetingsById.set(seed.id, { ...seed });
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
    };

    this.meetingsById.set(meeting.id, meeting);

    return meeting;
  }

  /** Copies, not references to stored objects: callers must not mutate the store. */
  private byOwner(ownerId: string): Meeting[] {
    return [...this.meetingsById.values()]
      .filter((meeting) => meeting.ownerId === ownerId)
      .map((meeting) => ({ ...meeting }));
  }
}
