/**
 * Domain shape of a stored file. `content` is whatever Prisma's `Bytes` column hands back — a
 * `Uint8Array` on read, a `Buffer` (which already *is* a `Uint8Array`) on write — and is converted
 * to a `Buffer` at the controller boundary and nowhere else (`FACT-3628`).
 */
export interface MeetingFile {
  id: string;
  meetingId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  content: Uint8Array;
  uploadedAt: string;
}

/**
 * What the listing and the upload response hand back: five keys, `content` and `meetingId`
 * dropped — the way `toMeetingDto` drops `ownerId` (`FACT-3626`).
 */
export type MeetingFileDto = Omit<MeetingFile, 'meetingId' | 'content'>;

/** Input of `MeetingFilesService.create` — the three values the upload handler has determined. */
export interface CreateMeetingFileInput {
  filename: string;
  contentType: string;
  content: Buffer;
}
