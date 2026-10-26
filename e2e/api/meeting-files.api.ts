/**
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
