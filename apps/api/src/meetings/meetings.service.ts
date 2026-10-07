import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateMeetingInput, Meeting } from './meeting.types.js';

/** How many meetings the dashboard shows when `limit` is absent. */
export const DEFAULT_MEETINGS_LIMIT = 3;

/** Meeting duration when the client does not send one. */
export const DEFAULT_DURATION_MINUTES = 60;

/**
 * Meetings service, backed by Prisma (`ADR-0027`). Holds no `Map`, no array and seeds nothing
 * itself: rows come from the database the standalone seed (`apps/api/prisma/seed.ts`) populated.
 */
@Injectable()
export class MeetingsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The owner's most recent meetings: filter by `ownerId`, sort DESC, limit at the database.
   * Invariant 7: `startsAt` descending with `id` ascending as the secondary key — without it two
   * meetings sharing a date come back in an undefined order (`HD-API-22`). Returns domain
   * entities; the controller strips `ownerId` via `toMeetingDto`.
   */
  async findRecent(ownerId: string, limit: number = DEFAULT_MEETINGS_LIMIT): Promise<Meeting[]> {
    const rows = await this.prisma.meeting.findMany({
      where: { ownerId },
      orderBy: [{ startsAt: 'desc' }, { id: 'asc' }],
      take: limit,
    });

    return rows.map(toDomainMeeting);
  }

  /**
   * Invariant 4: the owner's **full** meeting count, not the length of `findRecent`'s slice. Using
   * `items.length` instead shows "Meetings total: 3" for five meetings (`HD-API-05`).
   */
  async countByOwner(ownerId: string): Promise<number> {
    return this.prisma.meeting.count({ where: { ownerId } });
  }

  /**
   * `ownerId` comes **only** from the argument, which the controller takes from the token;
   * `CreateMeetingInput` has no owner field at all, and at the HTTP level `forbidNonWhitelisted`
   * rejects any attempt to send one (`HD-API-16`, `HD-API-17`).
   *
   * `startsAt` is normalized to canonical UTC: a client may send an offset date while the contract
   * promises `…Z`. Without it the store would hold strings in mixed formats.
   *
   * Ids stay application-issued (`randomUUID()`), exactly as before the move onto Prisma
   * (`FACT-2060`): the schema's `id` column carries no `@default`.
   */
  async create(ownerId: string, input: CreateMeetingInput): Promise<Meeting> {
    const row = await this.prisma.meeting.create({
      data: {
        id: randomUUID(),
        ownerId,
        title: input.title,
        startsAt: new Date(input.startsAt).toISOString(),
        durationMinutes: input.durationMinutes ?? DEFAULT_DURATION_MINUTES,
        // `?? []` normalizes an absent or `null` participants field, mirroring `durationMinutes`
        // above (`ADR-0017`). Never trimmed, never deduplicated (`FACT-1024`).
        participants: input.participants ?? [],
      },
    });

    return toDomainMeeting(row);
  }

  /**
   * Owner-scoped lookup by id. `Meeting | undefined` with **one** return path: a missing id and an
   * id owned by somebody else both fall through to the same `undefined` — the ownership check
   * lives here, not in the controller, so the two 404 situations stay byte-identical by
   * construction (`ADR-0018`). `ownerId` is always the caller's, taken by the controller from
   * `@CurrentUser()`.
   */
  async findById(ownerId: string, id: string): Promise<Meeting | undefined> {
    const row = await this.prisma.meeting.findUnique({ where: { id } });

    return row && row.ownerId === ownerId ? toDomainMeeting(row) : undefined;
  }
}

/**
 * Explicit field list rather than the raw Prisma row: keeps `Meeting` the one shape every caller
 * depends on, independent of whatever Prisma's generated type happens to carry.
 */
function toDomainMeeting(row: {
  id: string;
  ownerId: string;
  title: string;
  startsAt: string;
  durationMinutes: number;
  participants: string[];
}): Meeting {
  return {
    id: row.id,
    ownerId: row.ownerId,
    title: row.title,
    startsAt: row.startsAt,
    durationMinutes: row.durationMinutes,
    participants: row.participants,
  };
}
