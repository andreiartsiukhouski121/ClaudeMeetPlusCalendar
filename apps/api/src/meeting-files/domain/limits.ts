/**
 * The module's limits, declared once (`FACT-3708`): the HTTP layer imports them and restates none.
 */

/** The ten-file-per-meeting cap (`FACT-3795`). */
export const MAX_FILES_PER_MEETING = 10;

/** The per-file size ceiling; enforced by the upload interceptor, not by the entity (`FACT-3629`). */
export const MAX_FILE_SIZE_BYTES = 1_048_576;

export const MAX_FILENAME_LENGTH = 100;

/**
 * No path separator, no quote, no control character. This pattern is the write-path defence; the
 * `Content-Disposition` builder is the read-path one (`FACT-2091`, `FACT-3650`). Written against the
 * **decoded** form — `multer` has already turned `%0A`, `%0D` and `%22` back into a literal newline,
 * carriage return and double quote by the time this runs, which is the actual defence this regex
 * provides. Every non-ASCII character is refused on purpose (`CH-014`).
 */
export const FILENAME_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9._ -]*[A-Za-z0-9._-])?$/;

/** The four allowed media types, compared after normalization — never the raw header. */
export const ALLOWED_CONTENT_TYPES: ReadonlySet<string> = new Set<string>([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'text/plain',
]);
