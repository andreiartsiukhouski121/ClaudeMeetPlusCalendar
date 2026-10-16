import type { ContentType } from './content-type.js';
import type { FileName } from './file-name.js';
import { MAX_FILES_PER_MEETING } from './limits.js';
import { FileLimitReached } from './meeting-file.errors.js';

export interface UploadMeetingFileInput {
  meetingId: string;
  filename: FileName;
  contentType: ContentType;
  bytes: Uint8Array;
  /** How many files the meeting already holds. */
  existingCount: number;
  /** Passed in so the entity reads no clock (`FACT-3734`). */
  now: Date;
  /** Passed in so the entity generates no randomness (`FACT-3738`). */
  uuid: string;
}

export interface StoredMeetingFile {
  id: string;
  meetingId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  content: Uint8Array;
  uploadedAt: string;
}

/**
 * A stored file. The fields stay primitives, so the response shape is the entity minus two keys
 * (`FACT-1063`). `content` is a `Uint8Array` and becomes a `Buffer` at the controller boundary and
 * nowhere else (`FACT-3628`).
 */
export class MeetingFile {
  private constructor(
    readonly id: string,
    readonly meetingId: string,
    readonly filename: string,
    readonly contentType: string,
    readonly sizeBytes: number,
    readonly content: Uint8Array,
    readonly uploadedAt: string,
  ) {}

  /**
   * The only creation path. Refuses the eleventh file (`FACT-3642`), issues the id as `fil-` plus the
   * supplied uuid (`FACT-3670`) and derives `sizeBytes` from the bytes (`FACT-1060`). The size
   * ceiling is not re-checked here: the interceptor owns it (`FACT-3629`).
   */
  static upload(input: UploadMeetingFileInput): MeetingFile {
    if (input.existingCount >= MAX_FILES_PER_MEETING) {
      throw new FileLimitReached();
    }

    return new MeetingFile(
      `fil-${input.uuid}`,
      input.meetingId,
      input.filename.value,
      input.contentType.value,
      input.bytes.length,
      input.bytes,
      input.now.toISOString(),
    );
  }

  /**
   * Rebuilds a stored row with **no** validation: the `filename` column has more than one writer and
   * the seed's hostile names must load, or `SEC-API-11`'s 200s would turn into errors (`FACT-3650`).
   */
  static restore(stored: StoredMeetingFile): MeetingFile {
    return new MeetingFile(
      stored.id,
      stored.meetingId,
      stored.filename,
      stored.contentType,
      stored.sizeBytes,
      stored.content,
      stored.uploadedAt,
    );
  }
}
