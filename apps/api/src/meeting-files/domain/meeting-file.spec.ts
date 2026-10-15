import { describe, expect, it } from 'vitest';

import { ContentType } from './content-type.js';
import { FileName } from './file-name.js';
import { MAX_FILE_SIZE_BYTES, MAX_FILES_PER_MEETING } from './limits.js';
import {
  FileLimitReached,
  FileRequired,
  InvalidFileName,
  MeetingFileError,
  MeetingFileNotFound,
  MeetingNotFound,
  UnsupportedContentType,
} from './meeting-file.errors.js';
import { MeetingFile } from './meeting-file.js';

/**
 * Cases `MF-UT-15`…`MF-UT-20` from
 * `e2e/regression/meeting-files/meeting-files.unit.cases.md`.
 *
 * The entity reads no clock, no uuid source and no storage: the instant, the uuid and the count of
 * files the meeting already holds are passed in, so nothing here needs a fake.
 */
const INSTANT = new Date('2020-02-03T04:05:06.007Z');

const UUID = '00000000-0000-0000-0000-000000000000';

function uploadInput(
  overrides: { bytes?: Uint8Array; existingCount?: number; uuid?: string } = {},
) {
  return {
    meetingId: 'mtg-1',
    filename: new FileName('notes.txt'),
    contentType: new ContentType('TEXT/PLAIN; charset=utf-8'),
    bytes: overrides.bytes ?? new Uint8Array(48),
    existingCount: overrides.existingCount ?? 0,
    now: INSTANT,
    uuid: overrides.uuid ?? UUID,
  };
}

function thrownBy(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }

  return undefined;
}

describe('MeetingFile.upload', () => {
  it('MF-UT-15 — carries its inputs as primitives, the instant passed in', () => {
    const file = MeetingFile.upload(uploadInput());

    expect(file.meetingId).toBe('mtg-1');
    expect(file.filename).toBe('notes.txt');
    expect(typeof file.filename).toBe('string');
    expect(file.contentType).toBe('text/plain');
    expect(typeof file.contentType).toBe('string');
    expect(file.sizeBytes).toBe(48);
    expect(file.uploadedAt).toBe('2020-02-03T04:05:06.007Z');
    expect(typeof file.uploadedAt).toBe('string');
  });

  it('MF-UT-16 — the id is fil- plus the uuid passed in, verbatim', () => {
    const first = MeetingFile.upload(uploadInput());
    const second = MeetingFile.upload(
      uploadInput({ uuid: '11111111-1111-1111-1111-111111111111' }),
    );

    expect(first.id).toBe('fil-00000000-0000-0000-0000-000000000000');
    expect(second.id).toBe('fil-11111111-1111-1111-1111-111111111111');
    expect(first.id).not.toBe(second.id);
  });

  it('MF-UT-17 — sizeBytes is the byte length; the ceiling is declared, not enforced', () => {
    expect(MeetingFile.upload(uploadInput({ bytes: new Uint8Array(1) })).sizeBytes).toBe(1);
    expect(MeetingFile.upload(uploadInput({ bytes: new Uint8Array(48) })).sizeBytes).toBe(48);

    expect(MAX_FILE_SIZE_BYTES).toBe(1_048_576);
    // The interceptor owns the ceiling, so the entity accepts one byte over it.
    const over = MeetingFile.upload(
      uploadInput({ bytes: new Uint8Array(MAX_FILE_SIZE_BYTES + 1) }),
    );
    expect(over.sizeBytes).toBe(1_048_577);
  });

  it('MF-UT-18 — refuses the eleventh file, not the tenth', () => {
    expect(MAX_FILES_PER_MEETING).toBe(10);

    expect(() => MeetingFile.upload(uploadInput({ existingCount: 0 }))).not.toThrow();
    expect(() => MeetingFile.upload(uploadInput({ existingCount: 9 }))).not.toThrow();

    for (const existingCount of [10, 11]) {
      const thrown = thrownBy(() => MeetingFile.upload(uploadInput({ existingCount })));

      expect(thrown).toBeInstanceOf(FileLimitReached);
      expect(thrown).toBeInstanceOf(MeetingFileError);
    }
  });
});

describe('MeetingFile.restore', () => {
  it('MF-UT-19 — validates nothing', () => {
    const rows = [
      { filename: 'evidence.log\r\nX-Injected: 1', contentType: 'application/x-msdownload' },
      { filename: '../../etc/passwd', contentType: 'application/x-msdownload' },
      { filename: 'say"hi".txt', contentType: 'application/x-msdownload' },
    ];

    for (const row of rows) {
      const stored = {
        id: 'fil-seed-1',
        meetingId: 'mtg-1',
        filename: row.filename,
        contentType: row.contentType,
        sizeBytes: 12,
        content: new Uint8Array([1, 2, 3]),
        uploadedAt: '2020-02-03T04:05:06.007Z',
      };

      const restored = MeetingFile.restore(stored);

      expect({ ...restored }).toEqual(stored);
    }
  });
});

describe('domain errors', () => {
  it('MF-UT-20 — six domain errors, six distinct kinds, no status on any', () => {
    const errors = [
      new FileRequired(),
      new InvalidFileName(),
      new UnsupportedContentType(),
      new MeetingNotFound(),
      new FileLimitReached(),
      new MeetingFileNotFound(),
    ];

    for (const error of errors) {
      expect(error).toBeInstanceOf(MeetingFileError);
      expect(error).toBeInstanceOf(Error);
      expect('status' in error).toBe(false);
      expect('statusCode' in error).toBe(false);
      expect('getStatus' in error).toBe(false);
    }

    const kinds = errors.map((error) => error.kind);
    expect(new Set(kinds).size).toBe(6);
  });
});
