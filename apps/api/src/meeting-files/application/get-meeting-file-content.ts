import { MeetingFileNotFound, MeetingNotFound } from '../domain/meeting-file.errors.js';
import type { MeetingFile } from '../domain/meeting-file.js';
import type { MeetingAccess } from './meeting-access.js';
import type { MeetingFileRepository } from './meeting-file.repository.js';

export class GetMeetingFileContent {
  constructor(
    private readonly files: MeetingFileRepository,
    private readonly access: MeetingAccess,
  ) {}

  async execute(ownerId: string, meetingId: string, fileId: string): Promise<MeetingFile> {
    if (!(await this.access.ownsMeeting(ownerId, meetingId))) {
      throw new MeetingNotFound();
    }

    const file = await this.files.findByIdForMeeting(meetingId, fileId);

    if (file === undefined) {
      throw new MeetingFileNotFound();
    }

    return file;
  }
}
