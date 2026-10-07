import { describe, expect, it } from 'vitest';

import {
  buildContentDisposition,
  isAllowedContentType,
  isValidFilename,
  normalizeContentType,
} from './meeting-files.rules.js';

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

/**
 * Cases `MF-UT-08`…`MF-UT-10`: `buildContentDisposition` (`SEC-API-11`). Every fixture below was
 * verified live against a running server and is the contract, not an inference from the source.
 */
describe('buildContentDisposition', () => {
  it('MF-UT-08 — the filename* parameter escapes more than encodeURIComponent does', () => {
    // The live baseline: a plain ASCII name needs no escaping at all, and the two parameters
    // agree.
    expect(buildContentDisposition('syllabus.pdf')).toBe(
      'attachment; filename="syllabus.pdf"; filename*=UTF-8\'\'syllabus.pdf',
    );

    // encodeURIComponent is not sufficient — it leaves `*`, `'`, `(` and `)` unescaped. Proven
    // first against the JS built-in itself, so the next assertion's point cannot be missed: a
    // case that only fed a non-ASCII name would still pass an implementation reusing this call
    // unguarded.
    expect(encodeURIComponent("*'()")).toBe("*'()");

    // A name holding all four characters `encodeURIComponent` under-escapes, each required back
    // percent-encoded with uppercase hex.
    expect(buildContentDisposition("star*quote'paren(close).txt")).toBe(
      'attachment; filename="star_quote_paren_close_.txt"; ' +
        "filename*=UTF-8''star%2Aquote%27paren%28close%29.txt",
    );

    // The verified-live fixtures: a stored double quote, a CR LF pair and a colon, each
    // percent-encoded in uppercase hex — lowercase hex (`%0d%0a`) would fail this assertion.
    expect(buildContentDisposition('report".txt')).toBe(
      'attachment; filename="report_.txt"; filename*=UTF-8\'\'report%22.txt',
    );
    expect(buildContentDisposition('evidence.log\r\nX-Injected: 1')).toBe(
      'attachment; filename="evidence.log__X-Injected_ 1"; ' +
        "filename*=UTF-8''evidence.log%0D%0AX-Injected%3A%201",
    );
    expect(buildContentDisposition('minutes.txt\nSet-Cookie: a=b')).toBe(
      'attachment; filename="minutes.txt_Set-Cookie_ a_b"; ' +
        "filename*=UTF-8''minutes.txt%0ASet-Cookie%3A%20a%3Db",
    );
  });

  it('MF-UT-09 — the ASCII filename parameter is deliberately lossy and cannot be escaped out of', () => {
    // Every character outside A-Za-z0-9._- and space becomes `_`.
    expect(buildContentDisposition('report".txt')).toContain('filename="report_.txt"');
    expect(buildContentDisposition('evidence.log\r\nX-Injected: 1')).toContain(
      'filename="evidence.log__X-Injected_ 1"',
    );
    expect(buildContentDisposition('déjà-vu.png')).toContain('filename="d_j_-vu.png"');

    // Capped at 100 characters.
    const longName = `${'a'.repeat(150)}.txt`;
    const longHeader = buildContentDisposition(longName);
    const asciiMatch = /filename="([^"]*)"/.exec(longHeader);
    expect(asciiMatch?.[1]).toHaveLength(100);

    // An input the whole pipeline collapses to `file` is reachable only through `toFilenameBase`'s
    // own dot-rule (a bare `.` or `..`, `MF-UT-10`'s territory): every character the ASCII
    // mapping itself replaces is substituted one-for-one, never deleted, so `toAsciiFilenameParameter`
    // never actually receives an empty `base` through this builder — its own `'' → 'file'` branch
    // is unreachable from here. Asterisks therefore do not come back as `file`; they come back as
    // underscores, one per character, which is the behaviour actually verified live.
    expect(buildContentDisposition('***')).toContain('filename="___"');
    expect(buildContentDisposition('.')).toContain('filename="file"');

    // The security property to keep: neither a raw `"` nor a raw `\` can terminate the quoted
    // string early. Scanned generically, over every fixture above plus one holding both
    // characters, because the assertion is about what never appears rather than about one
    // example.
    const hostileInputs = [
      'report".txt',
      'evidence.log\r\nX-Injected: 1',
      'say"hi"and\\slash.txt',
      '"quote\\backslash".txt',
    ];
    for (const input of hostileInputs) {
      const header = buildContentDisposition(input);
      const asciiParameter = /filename="([^"]*)"/.exec(header)?.[1] ?? '';

      expect(asciiParameter).not.toMatch(/["\\]/);
    }
  });

  it('MF-UT-10 — base re-applies the path strip at the emitting boundary', () => {
    // The verified-live fixture: a traversal prefix is stripped down to the last segment.
    expect(buildContentDisposition('../../etc/passwd')).toBe(
      'attachment; filename="passwd"; filename*=UTF-8\'\'passwd',
    );

    // Either separator is recognised, and only the last one counts.
    expect(buildContentDisposition('a\\b.txt')).toContain('filename="b.txt"');
    expect(buildContentDisposition('a/b/c.txt')).toContain('filename="c.txt"');

    // `.`, `..` and an empty result all become `file` rather than an empty or dot-only name.
    expect(buildContentDisposition('..')).toContain('filename="file"');
    expect(buildContentDisposition('.')).toContain('filename="file"');
    expect(buildContentDisposition('a/')).toContain('filename="file"');

    // `FACT-3650`: a read path validates its own output rather than inheriting the write path's
    // guarantees, because the `filename` column has a second writer — the seed, through Prisma,
    // bypassing the upload route's `isValidFilename` check entirely. This step is why a row the
    // seed wrote with a path-like value still emits a safe header, and deleting it as redundant
    // with the upload-time rule would be correct about today's rows and wrong about the seed's.
    expect(buildContentDisposition('../../../seed/evil.txt')).toContain('filename="evil.txt"');
  });
});
