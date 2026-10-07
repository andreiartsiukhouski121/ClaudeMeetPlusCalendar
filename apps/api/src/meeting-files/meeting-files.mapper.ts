import type { MeetingFile, MeetingFileDto } from './meeting-file.types.js';

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
