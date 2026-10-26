import { expect, type APIRequestContext } from '@playwright/test';
import {
  GEOMETRY_WORKSHOP_TITLE,
  TEACHER_MEETING_FILES,
  seededFileBytes,
} from '../fixtures/seed.js';
import { authHeaders } from './auth.api.js';
import {
  createSeededShapeMeetings,
  type ErrorBody,
  type SeededShapeMeetings,
} from './meetings.api.js';
import type { Tracker } from './cleanup.api.js';

/** `FACT-2083` — the file-level 404. */
export const FILE_NOT_FOUND_BODY: ErrorBody = {
  message: 'File not found',
  error: 'Not Found',
  statusCode: 404,
};

/**
 * The `meeting-files` module of the suite's API layer (`FACT-3758`): the file-level not-found body
 * above and the upload encoder below.
 *
 * Hand-built `multipart/form-data` bodies, shared by every spec that needs a request shape
 * Playwright's own `multipart` option cannot express: a part with no `Content-Type` header at all,
 * an explicit empty one, a file part under an arbitrary field name, or a `filename*` (RFC 5987)
 * parameter instead of a plain `filename`. Playwright's object form either infers a content type
 * from the filename extension or throws when `mimeType` is the empty string, and it has no way to
 * emit `filename*` at all.
 *
 * Used by `e2e/regression/meeting-files/meeting-files.api.spec.ts` and
 * `e2e/security/security.api.spec.ts`. Kept in one place so the two do not drift the way they did
 * before this file existed — a spec importing another spec module is not an option, since that
 * would register the imported file's own tests as a side effect.
 */

export interface MultipartField {
  name: string;
  /** Omit for a plain text field — no `filename` parameter is emitted. */
  filename?: string;
  /**
   * A percent-encoded RFC 5987 `filename*` parameter, sent as `filename*=UTF-8''<value>` — already
   * percent-encoded by the caller. `busboy` prefers and percent-decodes this over a plain
   * `filename`, so it is how a non-ASCII or control-character name can actually arrive at the
   * handler. May be combined with `filename` or sent alone.
   */
  filenameStar?: string;
  /** Omit to send no `Content-Type` header at all for this part. Pass `''` for an empty header value. */
  contentType?: string;
  content: Buffer | string;
}

/** Backslash-escapes `"` and `\` the way a real client would in a quoted header parameter. */
function escapeHeaderValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/** Builds a complete multipart body (all parts plus the closing boundary) for the given boundary. */
export function buildMultipartBody(fields: MultipartField[], boundary: string): Buffer {
  const chunks: Buffer[] = [];

  for (const field of fields) {
    let head = `--${boundary}\r\nContent-Disposition: form-data; name="${escapeHeaderValue(field.name)}"`;

    if (field.filename !== undefined) {
      head += `; filename="${escapeHeaderValue(field.filename)}"`;
    }
    if (field.filenameStar !== undefined) {
      head += `; filename*=UTF-8''${field.filenameStar}`;
    }
    head += '\r\n';

    if (field.contentType !== undefined) {
      head += `Content-Type: ${field.contentType}\r\n`;
    }
    head += '\r\n';

    const content =
      typeof field.content === 'string' ? Buffer.from(field.content, 'utf8') : field.content;

    chunks.push(Buffer.from(head, 'utf8'), content, Buffer.from('\r\n', 'utf8'));
  }

  chunks.push(Buffer.from(`--${boundary}--\r\n`, 'utf8'));

  return Buffer.concat(chunks);
}

export interface UploadedFile {
  id: string;
  filename: string;
  uploadedAt: string;
}

/**
 * `POST /meetings/:id/files` as `token`'s owner with a `multipart` body Playwright's own option can
 * express; the 201 is asserted. The file goes with its meeting by cascade, so a caller registers
 * the meeting and nothing more.
 */
export async function uploadMeetingFile(
  request: APIRequestContext,
  token: string,
  meetingId: string,
  file: { name: string; mimeType: string; buffer: Buffer },
): Promise<UploadedFile> {
  const response = await request.post(`/meetings/${meetingId}/files`, {
    headers: authHeaders(token),
    multipart: { file },
  });
  expect(
    response.status(),
    `uploading ${file.name} must answer 201; got ${await response.text()}`,
  ).toBe(201);

  return (await response.json()) as UploadedFile;
}

const CLOCK_POLL_MS = 2;

/** Resolves once `Date.now()` is past `instant`, so the next write is stamped later than it. */
async function untilClockPast(instant: string): Promise<void> {
  while (Date.now() <= Date.parse(instant)) {
    await new Promise((resolve) => setTimeout(resolve, CLOCK_POLL_MS));
  }
}

/**
 * The two seeded files on one meeting (`FACT-3799`): the seed's names, types, sizes and byte rule
 * (`FACT-1075`), `syllabus.pdf` first and `notes.txt` once the clock is past the first upload's
 * `uploadedAt`, the two asserted to differ. Files list `uploadedAt` descending (`FACT-2110`) and a
 * tie would fall to the random id, so the order is what puts `notes.txt` first as the seed does.
 */
export async function uploadSeededFiles(
  request: APIRequestContext,
  token: string,
  meetingId: string,
): Promise<void> {
  const oldestFirst = [...TEACHER_MEETING_FILES.items].reverse();
  let previous: UploadedFile | undefined;

  for (const file of oldestFirst) {
    if (previous !== undefined) {
      await untilClockPast(previous.uploadedAt);
    }
    const uploaded = await uploadMeetingFile(request, token, meetingId, {
      name: file.filename,
      mimeType: file.contentType,
      buffer: seededFileBytes(TEACHER_MEETING_FILES.headers[file.filename], file.sizeBytes),
    });
    if (previous !== undefined) {
      expect(
        uploaded.uploadedAt,
        `${file.filename} must be stamped later than ${previous.filename}, or the list order is a tie`,
      ).not.toBe(previous.uploadedAt);
    }
    previous = uploaded;
  }
}

/**
 * The whole seeded shape on `token`'s owner: `teacher`'s five meetings and the "Geometry workshop"
 * copy's two uploads, which the meeting page and the accessibility scan read. Returns the copies'
 * ids by title.
 */
export async function createSeededShapeCopy(
  request: APIRequestContext,
  token: string,
  tracker: Tracker,
): Promise<SeededShapeMeetings> {
  const meetings = await createSeededShapeMeetings(request, token, tracker);
  await uploadSeededFiles(request, token, meetings[GEOMETRY_WORKSHOP_TITLE]);
  return meetings;
}
