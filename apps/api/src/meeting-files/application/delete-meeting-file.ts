import { MeetingFileNotFound, MeetingNotFound } from '../domain/meeting-file.errors.js';
import type { MeetingAccess } from './meeting-access.js';
import type { MeetingFileRepository } from './meeting-file.repository.js';

export interface DeleteMeetingFileCommand {
  ownerId: string;
  meetingId: string;
  fileId: string;
}

/**
 * Ownership first, so a foreign meeting never reveals whether a file id exists on it; then the
 * file, scoped to that meeting.
 */
export class DeleteMeetingFile {
  constructor(
    private readonly files: MeetingFileRepository,
    private readonly access: MeetingAccess,
  ) {}

  async execute(command: DeleteMeetingFileCommand): Promise<void> {
    if (!(await this.access.ownsMeeting(command.ownerId, command.meetingId))) {
      throw new MeetingNotFound();
    }

    if (!(await this.files.deleteByIdForMeeting(command.meetingId, command.fileId))) {
      throw new MeetingFileNotFound();
    }
  }
}
