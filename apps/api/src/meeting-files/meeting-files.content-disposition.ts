/**
 * The `Content-Disposition` builder for the download (`SEC-API-11`). It lives in the HTTP layer:
 * header syntax is HTTP, not domain (`FACT-2115`).
 */

const MAX_ASCII_FALLBACK_LENGTH = 100;

/** RFC 8187 `attr-char`: `ALPHA / DIGIT / "!" / "#" / "$" / "&" / "+" / "-" / "." / "^" / "_" / "`" / "|" / "~"`. */
const ATTR_CHAR_PATTERN = /[A-Za-z0-9!#$&+.^_`|~-]/;

/** Everything a `filename="<ascii>"` parameter can carry without a `"` or `\` ending it early. */
const ASCII_FALLBACK_SAFE_PATTERN = /[A-Za-z0-9._ -]/;

/**
 * Step 1 of the header builder: drop everything up to and including the last path separator, then
 * refuse the three names that would otherwise turn a stored path back into a filesystem
 * instruction. This is the upload path's filename rule applied again at the boundary that **emits**,
 * because the `filename` column has more than one writer and a read path does not inherit a write
 * path's guarantees (`FACT-3650`).
 */
function toFilenameBase(filename: string): string {
  const lastSeparatorIndex = Math.max(filename.lastIndexOf('/'), filename.lastIndexOf('\\'));
  const candidate = lastSeparatorIndex === -1 ? filename : filename.slice(lastSeparatorIndex + 1);

  return candidate === '' || candidate === '.' || candidate === '..' ? 'file' : candidate;
}

/**
 * Step 2 — `base` UTF-8 encoded, every octet outside RFC 8187's `attr-char` set percent-encoded
 * with uppercase hex. Lossless, and the parameter a modern client prefers (RFC 6266 §4.3).
 * `encodeURIComponent` alone under-encodes `*`, `'`, `(` and `)`, so the set is checked byte by
 * byte instead of reusing it.
 */
function toExtendedFilenameParameter(base: string): string {
  const bytes = Buffer.from(base, 'utf-8');
  let result = '';

  for (const byte of bytes) {
    const char = String.fromCharCode(byte);

    result +=
      byte < 0x80 && ATTR_CHAR_PATTERN.test(char)
        ? char
        : `%${byte.toString(16).toUpperCase().padStart(2, '0')}`;
  }

  return result;
}

/**
 * Step 3 — `base` with everything outside `A-Za-z0-9._-` and space replaced by `_`, capped at 100
 * characters, `file` if empty. Deliberately lossy: the compatibility parameter, never preferred
 * when `filename*` is present, and because neither `"` nor `\` survives it the quoted string
 * cannot terminate early.
 */
function toAsciiFilenameParameter(base: string): string {
  let result = '';

  for (const char of base) {
    result += ASCII_FALLBACK_SAFE_PATTERN.test(char) ? char : '_';
  }

  const truncated = result.slice(0, MAX_ASCII_FALLBACK_LENGTH);

  return truncated === '' ? 'file' : truncated;
}

/**
 * The complete `Content-Disposition` value for a download response (`SEC-API-11`). RFC 6266's
 * pairing of `filename` and `filename*` can represent any byte sequence, so there is no error case
 * here: every stored `filename`, however it got written, answers 200.
 */
export function buildContentDisposition(filename: string): string {
  const base = toFilenameBase(filename);
  const asciiParameter = toAsciiFilenameParameter(base);
  const extendedParameter = toExtendedFilenameParameter(base);

  return `attachment; filename="${asciiParameter}"; filename*=UTF-8''${extendedParameter}`;
}
