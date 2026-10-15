import { ALLOWED_CONTENT_TYPES } from './limits.js';
import { UnsupportedContentType } from './meeting-file.errors.js';

/**
 * Cuts at the first `;`, trims, lower-cases — so `application/pdf; charset=utf-8` and
 * `APPLICATION/PDF` compare equal to `application/pdf`. `busboy` initialises a part's declared type
 * to the literal `'text/plain'` when the header is absent, empty or unparseable and only overwrites
 * it when a header is present and parses, so "declared nothing" and "declared `text/plain`" are
 * already the same string by the time this function runs (`FACT-3647`).
 */
export function normalizeContentType(rawContentType: string): string {
  const [mediaType = ''] = rawContentType.split(';');

  return mediaType.trim().toLowerCase();
}

export function isAllowedContentType(normalizedContentType: string): boolean {
  return ALLOWED_CONTENT_TYPES.has(normalizedContentType);
}

/**
 * An allowed media type, held in its normalized form — the string that is stored and later echoed
 * back as `Content-Type` (`MF-API-17`, `FACT-3627`). Construction throws `UnsupportedContentType`
 * whatever the reason: an unknown, a missing and a hostile type are one outcome (`FACT-3631`).
 */
export class ContentType {
  readonly value: string;

  constructor(raw: string) {
    const normalized = normalizeContentType(raw);

    if (!isAllowedContentType(normalized)) {
      throw new UnsupportedContentType();
    }

    this.value = normalized;
  }
}
