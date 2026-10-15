import { describe, expect, it } from 'vitest';

import { ContentType, isAllowedContentType, normalizeContentType } from './content-type.js';
import { FileName, isValidFilename } from './file-name.js';
import {
  InvalidFileName,
  MeetingFileError,
  UnsupportedContentType,
} from './meeting-file.errors.js';

/**
 * Cases `MF-UT-01`…`MF-UT-03` from
 * `e2e/regression/meeting-files/meeting-files.unit.cases.md`.
 *
 * Both predicates are pure — no Nest, no Prisma, no multer — so they are exercised directly here
 * rather than through an HTTP upload. `MF-UT-02` deliberately keeps asserting two inputs that
 * cannot reach the rule over HTTP today: a path separator (`preservePath` is a single `multer`
 * option away from making it reachable) and an empty string (the parser discards an empty filename
 * parameter before the rule is consulted). The rule is a module boundary with its own contract, and
 * one that only holds because another library filters its input first breaks silently the day that
 * library's option changes.
 */
describe('isValidFilename', () => {
  it('MF-UT-01 — accepts the legal forms', () => {
    expect(isValidFilename('a')).toBe(true);
    expect(isValidFilename('a'.repeat(100))).toBe(true);
    expect(isValidFilename('notes.txt')).toBe(true);
    // A space, a dot, an underscore and a hyphen inside the same name.
    expect(isValidFilename('my report_v2-final.txt')).toBe(true);
    // A name ending in a dot, an underscore or a hyphen.
    expect(isValidFilename('report.')).toBe(true);
    expect(isValidFilename('report_')).toBe(true);
    expect(isValidFilename('report-')).toBe(true);
  });

  it('MF-UT-02 — rejects every header-unsafe form, including the inputs unreachable over HTTP today', () => {
    // Length bounds.
    expect(isValidFilename('')).toBe(false);
    expect(isValidFilename('a'.repeat(101))).toBe(false);

    // Leading/trailing whitespace and a leading dot.
    expect(isValidFilename(' report.txt')).toBe(false);
    expect(isValidFilename('report.txt ')).toBe(false);
    expect(isValidFilename('.report.txt')).toBe(false);

    // Path separators — unreachable over HTTP unless `preservePath` is set on multer, asserted
    // here anyway because the rule is a module boundary, not only a step in today's one path.
    expect(isValidFilename('../etc/passwd')).toBe(false);
    expect(isValidFilename('a/b.txt')).toBe(false);
    expect(isValidFilename('a\\b.txt')).toBe(false);

    // The live Content-Disposition injection defence: multer decodes a percent-encoded filename
    // parameter back into a literal quote, newline and carriage return before this rule runs.
    expect(isValidFilename('say"hi".txt')).toBe(false);
    expect(isValidFilename('line1\nline2.txt')).toBe(false);
    expect(isValidFilename('line1\rline2.txt')).toBe(false);

    // Non-ASCII is refused on purpose (CH-014), and it is live for the same reason as the quote
    // and the control characters — it genuinely reaches `originalname`.
    expect(isValidFilename('résumé.pdf')).toBe(false);
  });
});

describe('normalizeContentType / isAllowedContentType', () => {
  it('MF-UT-03 — normalizes before comparing, and the predicate is checked against the returned value', () => {
    // Accepted forms normalize to the bare lower-case media type — asserting the returned value,
    // not only a boolean, because that value is what gets stored and later echoed back as a
    // response header.
    expect(normalizeContentType('application/pdf; charset=utf-8')).toBe('application/pdf');
    expect(normalizeContentType('APPLICATION/PDF')).toBe('application/pdf');
    expect(normalizeContentType(' text/plain ')).toBe('text/plain');

    expect(isAllowedContentType(normalizeContentType('application/pdf; charset=utf-8'))).toBe(true);
    expect(isAllowedContentType(normalizeContentType('APPLICATION/PDF'))).toBe(true);
    expect(isAllowedContentType(normalizeContentType(' text/plain '))).toBe(true);
    expect(isAllowedContentType(normalizeContentType('image/png'))).toBe(true);
    expect(isAllowedContentType(normalizeContentType('image/jpeg'))).toBe(true);

    // Refused media types.
    expect(isAllowedContentType(normalizeContentType('image/gif'))).toBe(false);
    expect(isAllowedContentType(normalizeContentType('application/octet-stream'))).toBe(false);
    expect(isAllowedContentType(normalizeContentType('text/html'))).toBe(false);

    // The empty string and an undefined value, asked of `isAllowedContentType` directly rather
    // than through `normalizeContentType` (which requires a string) — defensive at this level
    // only, since over HTTP a missing header already arrives as the literal 'text/plain' and is
    // accepted, but the predicate is a module boundary and must still answer for both.
    expect(isAllowedContentType('')).toBe(false);
    expect(isAllowedContentType(undefined as unknown as string)).toBe(false);

    // The four accepted values asserted as a set: adding a fifth in the code without adding it to
    // the contract must fail here first.
    const accepted = ['application/pdf', 'image/png', 'image/jpeg', 'text/plain'];
    for (const contentType of accepted) {
      expect(isAllowedContentType(normalizeContentType(contentType))).toBe(true);
    }
  });
});
const LEGAL_NAMES = [
  'a',
  'a'.repeat(100),
  'notes.txt',
  'my report_v2-final.txt',
  'report.',
  'report_',
  'report-',
];

const ILLEGAL_NAMES = [
  '',
  'a'.repeat(101),
  ' report.txt',
  'report.txt ',
  '.report.txt',
  '../etc/passwd',
  'a/b.txt',
  'a\\b.txt',
  'say"hi".txt',
  'line1\nline2.txt',
  'line1\rline2.txt',
  'résumé.pdf',
];

function thrownBy(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }

  return undefined;
}

/**
 * Cases `MF-UT-11`…`MF-UT-14`: the value objects built over the predicates above. Each
 * construction yields the value or throws a domain error — never a returned flag.
 */
describe('FileName', () => {
  it('MF-UT-11 — holds a legal name verbatim', () => {
    for (const name of [...LEGAL_NAMES, 'Report.PDF']) {
      expect(new FileName(name).value).toBe(name);
    }
  });

  it('MF-UT-12 — refuses an illegal name with InvalidFileName', () => {
    for (const name of ILLEGAL_NAMES) {
      const thrown = thrownBy(() => new FileName(name));

      expect(thrown).toBeInstanceOf(InvalidFileName);
      expect(thrown).toBeInstanceOf(MeetingFileError);
      expect(thrown).not.toBeInstanceOf(TypeError);
    }
  });
});

describe('ContentType', () => {
  it('MF-UT-13 — its value is the normalized media type', () => {
    expect(new ContentType('APPLICATION/PDF; charset=utf-8').value).toBe('application/pdf');
    expect(new ContentType('  text/plain  ').value).toBe('text/plain');
    expect(new ContentType('image/PNG').value).toBe('image/png');
    expect(new ContentType('image/jpeg;q=1').value).toBe('image/jpeg');
  });

  it('MF-UT-14 — refuses the rest with UnsupportedContentType', () => {
    for (const raw of [
      'image/gif',
      'application/octet-stream',
      'text/html',
      '',
      'application/pdfx',
    ]) {
      const thrown = thrownBy(() => new ContentType(raw));

      expect(thrown).toBeInstanceOf(UnsupportedContentType);
      expect(thrown).toBeInstanceOf(MeetingFileError);
    }
  });
});
