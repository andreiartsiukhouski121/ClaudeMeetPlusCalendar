/**
 * Nest client for Next's server side (BFF). The browser never gets here: page traffic goes to
 * Next, and Next goes to Nest.
 *
 * Invariant 14: this file has neither `import 'server-only'` nor `next/headers`. Next aliases
 * `server-only` to a compiled module that Vitest cannot resolve, and `resolveApiUrl` plus error
 * message normalization are covered by units `AL-UT-23…26`. Anything needing `cookies()` lives in
 * `session.ts`.
 */

/** Default API base — the same address `pnpm dev:api` listens on. */
export const DEFAULT_API_BASE_URL = 'http://127.0.0.1:3001';

/**
 * Absolute URL of a Nest endpoint. A pure function: the base can be passed as an argument (units
 * do that), otherwise `process.env.API_URL` is used — Playwright sets it to
 * `http://127.0.0.1:3101` via `webServer.env`.
 *
 * `process.env` is read on every call rather than once at module load, or the value would freeze
 * at import time and the variable from `webServer.env` might never apply.
 */
export function resolveApiUrl(path: string, base?: string): string {
  const rawBase = base ?? process.env.API_URL ?? DEFAULT_API_BASE_URL;
  // Trailing slashes are stripped and a leading slash is added: otherwise `http://x:3001/` plus
  // `/auth/me` yields `http://x:3001//auth/me` and Nest answers 404.
  const normalizedBase = rawBase.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${normalizedBase}${normalizedPath}`;
}

/** Nest error body: invariant 8 — `message` is a string on `HttpException`, an array on 400. */
interface NestErrorBody {
  message?: unknown;
}

/**
 * An HTTP failure from Nest. It carries the status because `loginAction` decides what the user
 * sees: 401 → "Invalid email or password", 400 → "Check the email format".
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /**
   * Builds the error from a parsed response body, normalizing `message` from **both** shapes
   * (`AL-UT-26`). Without normalization the user would see `[object Object]`.
   */
  static fromBody(status: number, body: unknown): ApiError {
    return new ApiError(status, extractErrorMessage(body, `HTTP ${String(status)}`));
  }
}

function extractErrorMessage(body: unknown, fallback: string): string {
  if (typeof body !== 'object' || body === null) {
    return fallback;
  }

  const { message } = body as NestErrorBody;

  if (typeof message === 'string' && message !== '') {
    return message;
  }
  if (Array.isArray(message)) {
    const lines = message.filter((item): item is string => typeof item === 'string');
    if (lines.length > 0) {
      return lines.join('; ');
    }
  }

  return fallback;
}

export interface ApiFetchOptions {
  /** JWT from the session cookie. Sent as `Authorization: Bearer` when present. */
  token?: string;
  method?: 'GET' | 'POST';
  body?: unknown;
}

/**
 * Request to Nest. Throws `ApiError` on any non-2xx; the calling Server Action decides what to
 * turn it into for the user.
 *
 * `cache: 'no-store'` is explicit even though Next 16 does not cache `fetch` by default: without
 * it, whoever enables `cacheComponents` first would serve one user's data to everybody.
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { token, method = 'GET', body } = options;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token !== undefined) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(resolveApiUrl(path), {
    method,
    headers,
    cache: 'no-store',
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    // The error body may not be JSON (a dead proxy, a dropped connection) — then the message is
    // built from the status instead of throwing a second, less useful error.
    const errorBody: unknown = await response.json().catch(() => undefined);
    throw ApiError.fromBody(response.status, errorBody);
  }

  return (await response.json()) as T;
}

export interface ApiFetchMultipartOptions {
  /** JWT from the session cookie. Sent as `Authorization: Bearer`, same as `apiFetch`. */
  token: string;
  file: File;
}

/**
 * The exact triple Next's Server Action multipart decoder produces for an `<input type="file">`
 * submitted with no selection (`MF-FN-15`). The browser's own request carries
 * `filename=""` — confirmed on the wire — and Node's standards-based `Request.formData()` parses
 * that faithfully into a `File` with `name: ''`. Next's own decoder sits between the two: it
 * reconstructs the `File` with the WHATWG default filename for an unnamed `Blob`, `'blob'`,
 * discarding the empty string the browser actually sent. A truthy name passes Nest's
 * `isValidFilename` check, so the request reaches the content-type branch (415) instead of being
 * discarded as absent (400 `file is required`).
 *
 * The substituted name differs by Next version: `'blob'` up to 16.3.x, and the literal string
 * `'undefined'` (an unnamed Blob's name stringified) from 16.4.1. Both are listed; the size and
 * type guards keep a real, named file from ever matching.
 */
const NEXT_PLACEHOLDER_NAMES = new Set(['blob', 'undefined']);

function isNextEmptySelectionPlaceholder(file: File): boolean {
  return (
    NEXT_PLACEHOLDER_NAMES.has(file.name) &&
    file.size === 0 &&
    file.type === 'application/octet-stream'
  );
}

/**
 * Upload request to Nest: a **separate** function from `apiFetch`, which is JSON-only
 * (invariant 13's neighbour, invariant 14's units `AL-UT-23…26` depend on `apiFetch` staying
 * byte-identical). No `Content-Type` header is set here — `fetch` derives the multipart boundary
 * itself from the `FormData` body, which is why this cannot simply reuse `apiFetch`'s `headers`
 * object.
 */
export async function apiFetchMultipart<T>(
  path: string,
  options: ApiFetchMultipartOptions,
): Promise<T> {
  const { token, file } = options;

  // Restores the filename Node's own `Request.formData()` would have produced for a genuinely
  // empty selection, undoing Next's substitution above. With an empty string, `FormData.append`
  // sends no `filename` parameter at all, and Nest's multer discards the part exactly as it does
  // for the real, un-mangled request — the same "file is required" branch `MF-API-09` pins,
  // reached without any client-side block (invariant 15).
  const filename = isNextEmptySelectionPlaceholder(file) ? '' : file.name;

  const body = new FormData();
  body.append('file', file, filename);

  const response = await fetch(resolveApiUrl(path), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
    body,
  });

  if (!response.ok) {
    const errorBody: unknown = await response.json().catch(() => undefined);
    throw ApiError.fromBody(response.status, errorBody);
  }

  return (await response.json()) as T;
}
