import type { MeetingFile } from '../domain/meeting-file.js';

/** What the use cases need from storage, in domain types. */
export interface MeetingFileRepository {
  countForMeeting(meetingId: string): Promise<number>;

  add(file: MeetingFile): Promise<void>;

  /** Newest first, `id` ascending as the tie-break (invariant 7, `FACT-2110`). */
  findForMeeting(meetingId: string): Promise<MeetingFile[]>;

  /** `undefined` when the file is absent or belongs to another meeting (`FACT-2117`). */
  findByIdForMeeting(meetingId: string, fileId: string): Promise<MeetingFile | undefined>;

  /** `false` when the file is absent or belongs to another meeting, as `findByIdForMeeting`. */
  deleteByIdForMeeting(meetingId: string, fileId: string): Promise<boolean>;
}
