/**
 * Pure predicates (`MF-UT-*`): the filename rule and the content-type allow-list. Neither touches
 * Nest, Prisma or multer, so both are unit-testable in isolation (design §2).
 */

/** The ten-file-per-meeting cap (`FACT-3642`) and the per-file size ceiling (design §3). */
export const MAX_FILES_PER_MEETING = 10;
export const MAX_FILE_SIZE_BYTES = 1_048_576;

export const FILENAME_RULE_MESSAGE =
  'filename must be 1 to 100 characters of letters, digits, dot, underscore, hyphen or space';

const MAX_FILENAME_LENGTH = 100;

/**
 * No path separator, no quote, no control character: the value is interpolated into
 * `Content-Disposition`, so an unchecked one is a header-injection vector (design §3). Written
 * against the **decoded** form — `multer` has already turned `%0A`, `%0D` and `%22` back into a
 * literal newline, carriage return and double quote by the time this runs, which is the actual
 * defence this regex provides. Every non-ASCII character is refused on purpose (`CH-014`).
 */
const FILENAME_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9._ -]*[A-Za-z0-9._-])?$/;

export function isValidFilename(filename: string): boolean {
  return (
    filename.length >= 1 &&
    filename.length <= MAX_FILENAME_LENGTH &&
    FILENAME_PATTERN.test(filename)
  );
}

/** The four allowed media types, compared after normalization — never the raw header. */
const ALLOWED_CONTENT_TYPES = new Set<string>([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'text/plain',
]);

/**
 * Cuts at the first `;`, trims, lower-cases — so `application/pdf; charset=utf-8` and
 * `APPLICATION/PDF` compare equal to `application/pdf`. `busboy` initialises a part's declared type
 * to the literal `'text/plain'` when the header is absent, empty or unparseable and only overwrites
 * it when a header is present and parses, so "declared nothing" and "declared `text/plain`" are
 * already the same string by the time this function runs (design §3, `FACT-3647`).
 */
export function normalizeContentType(rawContentType: string): string {
  const [mediaType = ''] = rawContentType.split(';');

  return mediaType.trim().toLowerCase();
}

export function isAllowedContentType(normalizedContentType: string): boolean {
  return ALLOWED_CONTENT_TYPES.has(normalizedContentType);
}

const MAX_ASCII_FALLBACK_LENGTH = 100;

/** RFC 8187 `attr-char`: `ALPHA / DIGIT / "!" / "#" / "$" / "&" / "+" / "-" / "." / "^" / "_" / "`" / "|" / "~"`. */
const ATTR_CHAR_PATTERN = /[A-Za-z0-9!#$&+.^_`|~-]/;

/** Everything a `filename="<ascii>"` parameter can carry without a `"` or `\` ending it early. */
const ASCII_FALLBACK_SAFE_PATTERN = /[A-Za-z0-9._ -]/;

/**
 * Step 1 of `SEC-API-11`'s header builder (design §"The download header is built, never
 * interpolated"): drop everything up to and including the last path separator, then refuse the
 * three names that would otherwise turn a stored path back into a filesystem instruction. This is
 * the upload path's filename rule applied again at the boundary that **emits**, because the
 * `filename` column has more than one writer and a read path does not inherit a write path's
 * guarantees (`FACT-3650`).
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
