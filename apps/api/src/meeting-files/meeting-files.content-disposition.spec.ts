import { describe, expect, it } from 'vitest';

import { buildContentDisposition } from './meeting-files.content-disposition.js';

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
