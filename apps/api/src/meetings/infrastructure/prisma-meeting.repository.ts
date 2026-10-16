import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service.js';
import type { MeetingRepository } from '../application/meeting.repository.js';
import { Meeting } from '../domain/meeting.js';

/**
 * The only `meetings` code that imports Prisma (`ADR-0027`). Ids are issued by the entity, never by
 * Prisma: the schema's `id` column carries no `@default` (`ADR-0031`).
 */
@Injectable()
export class PrismaMeetingRepository implements MeetingRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Invariant 7: `startsAt` descending with `id` ascending as the secondary key — without it two
   * meetings sharing a date come back in an undefined order (`HD-API-22`). The limit is applied at
   * the database.
   */
  async findRecentByOwner(ownerId: string, limit: number): Promise<Meeting[]> {
    const rows = await this.prisma.meeting.findMany({
      where: { ownerId },
      orderBy: [{ startsAt: 'desc' }, { id: 'asc' }],
      take: limit,
    });

    return rows.map((row) => Meeting.restore(row));
  }

  /** Invariant 4: the owner's full count (`HD-API-05`). */
  async countByOwner(ownerId: string): Promise<number> {
    return this.prisma.meeting.count({ where: { ownerId } });
  }

  /**
   * One return path: a missing id and an id owned by somebody else both fall through to the same
   * `undefined` (`ADR-0018`).
   */
  async findOwnedById(ownerId: string, id: string): Promise<Meeting | undefined> {
    const row = await this.prisma.meeting.findUnique({ where: { id } });

    return row && row.ownerId === ownerId ? Meeting.restore(row) : undefined;
  }

  async save(meeting: Meeting): Promise<void> {
    await this.prisma.meeting.create({
      data: {
        id: meeting.id,
        ownerId: meeting.ownerId,
        title: meeting.title,
        startsAt: meeting.startsAt,
        durationMinutes: meeting.durationMinutes,
        participants: meeting.participants,
      },
    });
  }
}
