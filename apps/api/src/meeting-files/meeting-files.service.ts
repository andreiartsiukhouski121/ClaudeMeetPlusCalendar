import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateMeetingFileInput, MeetingFile } from './meeting-file.types.js';

/**
 * Meeting file persistence, backed by Prisma (`ADR-0027`, `ADR-0029`). Ownership is **not** this
 * service's business: `MeetingFilesController` resolves it through the existing
 * `MeetingsService.findById`, so `ADR-0018`'s one-code-path 404 is reused rather than re-derived
 * (design §2).
 */
@Injectable()
export class MeetingFilesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Plain count, not a transaction: the ten-file cap is a deliberate best-effort bound (design §8.14). */
  async countForMeeting(meetingId: string): Promise<number> {
    return this.prisma.meetingFile.count({ where: { meetingId } });
  }

  /**
   * Ids stay application-issued — the `fil-` type prefix plus a `randomUUID()` (`ADR-0031`) —
   * never Prisma-generated, matching every other entity in this schema. `sizeBytes` is derived from the buffer actually stored, never trusted
   * from elsewhere.
   */
  async create(meetingId: string, input: CreateMeetingFileInput): Promise<MeetingFile> {
    const row = await this.prisma.meetingFile.create({
      data: {
        id: `fil-${randomUUID()}`,
        meetingId,
        filename: input.filename,
        contentType: input.contentType,
        sizeBytes: input.content.length,
        // Prisma's generated `Bytes` type is `Uint8Array<ArrayBuffer>`; Node's `Buffer` is typed
        // `Uint8Array<ArrayBufferLike>` (it could in principle wrap a `SharedArrayBuffer`), so the
        // two don't unify structurally even though every `Buffer` here really is `ArrayBuffer`-backed.
        content: new Uint8Array(input.content),
        uploadedAt: new Date().toISOString(),
      },
    });

    return toDomainMeetingFile(row);
  }

  /**
   * Invariant 7: `uploadedAt` descending with `id` ascending as the secondary key — without it two
   * files uploaded in the same instant come back in an undefined order.
   */
  async findForMeeting(meetingId: string): Promise<MeetingFile[]> {
    const rows = await this.prisma.meetingFile.findMany({
      where: { meetingId },
      orderBy: [{ uploadedAt: 'desc' }, { id: 'asc' }],
    });

    return rows.map(toDomainMeetingFile);
  }

  /**
   * Scoped to the meeting the caller already owns: a file id that exists but belongs to another
   * meeting is `undefined` here too, the same way `MeetingsService.findById` folds "missing" and
   * "not yours" into one path (`MF-API-08`).
   */
  async findByIdForMeeting(meetingId: string, fileId: string): Promise<MeetingFile | undefined> {
    const row = await this.prisma.meetingFile.findUnique({ where: { id: fileId } });

    return row && row.meetingId === meetingId ? toDomainMeetingFile(row) : undefined;
  }
}

/**
 * Explicit field list rather than the raw Prisma row, mirroring `meetings.service.ts`'s
 * `toDomainMeeting`: keeps `MeetingFile` the one shape every caller depends on.
 */
function toDomainMeetingFile(row: {
  id: string;
  meetingId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  content: Uint8Array;
  uploadedAt: string;
}): MeetingFile {
  return {
    id: row.id,
    meetingId: row.meetingId,
    filename: row.filename,
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
    content: row.content,
    uploadedAt: row.uploadedAt,
  };
}
