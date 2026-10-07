import { redirect } from 'next/navigation';

import { resolveApiUrl } from '@/lib/api-client';
import { readSessionToken } from '@/lib/session';

interface RouteParams {
  // Next 16: `params` is a `Promise`, same as `MeetingPageProps` in the sibling `page.tsx`.
  params: Promise<{ id: string; fileId: string }>;
}

/**
 * Thrown by `fetchFileContent` for any non-2xx Nest response, carrying the status so the caller can
 * classify it the same way `lib/dal.ts` classifies `ApiError`.
 */
class DownloadError extends Error {
  constructor(readonly status: number) {
    super(`Download request answered ${String(status)}`);
    this.name = 'DownloadError';
  }
}

/**
 * Calls Nest's download endpoint directly — not `apiFetch`, which always does `response.json()`
 * (`lib/api-client.ts:115`) and therefore cannot carry bytes. That is a deliberate decision (task
 * 15 of the `meeting-files` plan), not an oversight: this file is the one place a multipart-free,
 * JSON-free Nest call is made from `apps/web`.
 */
async function fetchFileContent(id: string, fileId: string, token: string): Promise<Response> {
  const response = await fetch(resolveApiUrl(`/meetings/${id}/files/${fileId}/content`), {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new DownloadError(response.status);
  }

  return response;
}

/**
 * Downloads a meeting attachment's bytes. The second non-page Route Handler in the BFF, after
 * `auth/session-expired/route.ts`.
 *
 * Invariant 19: the session token is read from the cookie here, server-side, and used only to call
 * Nest — it never reaches a client component, and the browser never calls Nest directly
 * (`ADR-0002`).
 *
 * The bytes are served from this application's own origin, which is exactly why
 * `X-Content-Type-Options: nosniff` and `Cache-Control: private, no-store` are set **here** rather
 * than relayed from Nest's response: they are the security control for the origin that actually
 * serves the body to the browser (design §3). `Content-Type`, `Content-Length` and
 * `Content-Disposition` are forwarded as Nest sent them.
 *
 * Invariant 11: `redirect()` sits strictly OUTSIDE the `try/catch` below. It works by throwing
 * `NEXT_REDIRECT`, and a `catch` in this block would swallow that throw — the symptom would be a
 * download that silently returns nothing. The shape is `lib/dal.ts:103-132` transplanted: the
 * `catch` only narrows and rethrows (it never redirects or returns a response itself), and both
 * `redirect()` and the bare 404 `Response` happen after the block, outside it.
 */
export async function GET(_request: Request, { params }: RouteParams): Promise<Response> {
  const { id, fileId } = await params;
  const token = await readSessionToken();

  let nestResponse: Response | undefined;
  let missing = false;

  if (token !== undefined) {
    try {
      nestResponse = await fetchFileContent(id, fileId, token);
    } catch (error) {
      if (!(error instanceof DownloadError)) {
        // Nest unreachable, or anything else unexpected: not disguised as "no session" or "no
        // file" — let it reach the error boundary.
        throw error;
      }
      if (error.status === 404) {
        missing = true;
      } else if (error.status !== 401) {
        throw error;
      }
      // status === 401 falls through with `nestResponse` left `undefined`, handled below.
    }
  }

  if (missing) {
    return new Response(null, { status: 404 });
  }

  if (nestResponse === undefined) {
    redirect('/auth/session-expired');
  }

  const headers = new Headers();
  const contentType = nestResponse.headers.get('Content-Type');
  const contentLength = nestResponse.headers.get('Content-Length');
  const contentDisposition = nestResponse.headers.get('Content-Disposition');

  if (contentType !== null) {
    headers.set('Content-Type', contentType);
  }
  if (contentLength !== null) {
    headers.set('Content-Length', contentLength);
  }
  if (contentDisposition !== null) {
    headers.set('Content-Disposition', contentDisposition);
  }
  // Set at this origin, never relayed (invariants above): the security control, not a courtesy.
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Cache-Control', 'private, no-store');

  return new Response(nestResponse.body, { status: 200, headers });
}
