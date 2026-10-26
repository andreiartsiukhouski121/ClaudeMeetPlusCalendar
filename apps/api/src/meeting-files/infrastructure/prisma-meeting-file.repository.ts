import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service.js';
import type { MeetingFileRepository } from '../application/meeting-file.repository.js';
import { MeetingFile } from '../domain/meeting-file.js';

/**
 * The only `meeting-files` code that imports Prisma (`FACT-3703`). Ids are issued by the entity,
 * never by Prisma, matching every other entity in this schema (`ADR-0031`).
 */
@Injectable()
export class PrismaMeetingFileRepository implements MeetingFileRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Plain count, not a transaction: the ten-file cap is a deliberate best-effort bound (`FACT-3795`). */
  async countForMeeting(meetingId: string): Promise<number> {
    return this.prisma.meetingFile.count({ where: { meetingId } });
  }

  async add(file: MeetingFile): Promise<void> {
    await this.prisma.meetingFile.create({
      data: {
        id: file.id,
        meetingId: file.meetingId,
        filename: file.filename,
        contentType: file.contentType,
        sizeBytes: file.sizeBytes,
        // Prisma's generated `Bytes` type is `Uint8Array<ArrayBuffer>`; Node's `Buffer` is typed
        // `Uint8Array<ArrayBufferLike>` (it could in principle wrap a `SharedArrayBuffer`), so the
        // two don't unify structurally even though every `Buffer` here really is `ArrayBuffer`-backed.
        content: new Uint8Array(file.content),
        uploadedAt: file.uploadedAt,
      },
    });
  }

  /**
   * Invariant 7: `uploadedAt` descending with `id` ascending as the secondary key — without it two
   * files uploaded in the same instant come back in an undefined order (`FACT-2110`).
   */
  async findForMeeting(meetingId: string): Promise<MeetingFile[]> {
    const rows = await this.prisma.meetingFile.findMany({
      where: { meetingId },
      orderBy: [{ uploadedAt: 'desc' }, { id: 'asc' }],
    });

    return rows.map((row) => MeetingFile.restore(row));
  }

  /**
   * Scoped to the meeting the caller already owns: a file id that exists but belongs to another
   * meeting is `undefined` here too (`MF-API-08`, `FACT-2117`).
   */
  async findByIdForMeeting(meetingId: string, fileId: string): Promise<MeetingFile | undefined> {
    const row = await this.prisma.meetingFile.findUnique({ where: { id: fileId } });

    return row && row.meetingId === meetingId ? MeetingFile.restore(row) : undefined;
  }

  /** The meeting is in the `where`, so a file id on another meeting deletes nothing. */
  async deleteByIdForMeeting(meetingId: string, fileId: string): Promise<boolean> {
    const { count } = await this.prisma.meetingFile.deleteMany({
      where: { id: fileId, meetingId },
    });

    return count === 1;
  }
}
