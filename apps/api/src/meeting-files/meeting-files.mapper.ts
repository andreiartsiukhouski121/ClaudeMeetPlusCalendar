import type { MeetingFile } from './domain/meeting-file.js';

/**
 * What the listing and the upload response hand back: five keys, `content` and `meetingId`
 * dropped — the way `toMeetingDto` drops `ownerId` (`FACT-3626`).
 */
export type MeetingFileDto = Omit<MeetingFile, 'meetingId' | 'content'>;

/**
 * The only way a file's metadata leaves the server. Fields are listed explicitly — no rest
 * destructuring — so `content` and `meetingId` cannot leak by a later field added to `MeetingFile`
 * going unnoticed (`FACT-3626`, mirrors `toMeetingDto`).
 */
export function toMeetingFileDto(file: MeetingFile): MeetingFileDto {
  return {
    contentType: file.contentType,
    filename: file.filename,
    id: file.id,
    sizeBytes: file.sizeBytes,
    uploadedAt: file.uploadedAt,
  };
}
