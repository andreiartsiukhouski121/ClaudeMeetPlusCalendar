import type { Clock } from '../../shared/application/clock.js';
import type { UuidSource } from '../../shared/application/uuid-source.js';
import { ContentType } from '../domain/content-type.js';
import { FileName } from '../domain/file-name.js';
import { FileRequired, MeetingNotFound } from '../domain/meeting-file.errors.js';
import { MeetingFile } from '../domain/meeting-file.js';
import type { MeetingAccess } from './meeting-access.js';
import type { MeetingFileRepository } from './meeting-file.repository.js';

export interface UploadMeetingFileCommand {
  ownerId: string;
  meetingId: string;
  file: { originalName: string; declaredType: string; bytes: Uint8Array } | undefined;
}

export class UploadMeetingFile {
  constructor(
    private readonly files: MeetingFileRepository,
    private readonly access: MeetingAccess,
    private readonly clock: Clock,
    private readonly uuids: UuidSource,
  ) {}

  /**
   * The evaluation order is the contract's (`FACT-2100`): the file itself, then the filename, then
   * the content type, then ownership, then the per-meeting count. Ownership comes strictly before the
   * count, so the cap cannot be used to probe whether a meeting exists (`FACT-2101`, `MF-API-16`).
   * A count then an insert, not a transaction (`FACT-3795`).
   */
  async execute(command: UploadMeetingFileCommand): Promise<MeetingFile> {
    if (command.file === undefined) {
      throw new FileRequired();
    }

    const filename = new FileName(command.file.originalName);
    const contentType = new ContentType(command.file.declaredType);

    if (!(await this.access.ownsMeeting(command.ownerId, command.meetingId))) {
      throw new MeetingNotFound();
    }

    const existingCount = await this.files.countForMeeting(command.meetingId);
    const file = MeetingFile.upload({
      meetingId: command.meetingId,
      filename,
      contentType,
      bytes: command.file.bytes,
      existingCount,
      now: this.clock.now(),
      uuid: this.uuids.next(),
    });

    await this.files.add(file);

    return file;
  }
}
