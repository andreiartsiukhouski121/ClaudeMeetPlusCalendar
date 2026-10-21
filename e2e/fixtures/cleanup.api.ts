import { expect, type APIRequestContext } from '@playwright/test';

/**
 * Cleanup for `*.api.spec.ts` cases that create meetings. A case runs its steps inside
 * `withCleanup`, registers every path it must remove with `track`, and the paths are deleted when
 * the steps end — also when they throw.
 *
 * A cleanup `404` is tolerated only when its body is exactly the one the case names; Express's own
 * `Cannot DELETE …` fallback is a different body and fails the case. The case's own assertion
 * failure is reported before a cleanup failure: it is rethrown after cleanup, and a cleanup error
 * raised while the case was already failing is dropped in its favour.
 */

export interface ErrorBody {
  message: string | string[];
  error: string;
  statusCode: number;
}

/** `FACT-2016` — the meeting-level 404. */
export const MEETING_NOT_FOUND_BODY: ErrorBody = {
  message: 'Meeting not found',
  error: 'Not Found',
  statusCode: 404,
};

/** `FACT-2083` — the file-level 404. */
export const FILE_NOT_FOUND_BODY: ErrorBody = {
  message: 'File not found',
  error: 'Not Found',
  statusCode: 404,
};

/** Registers a path for deletion; `tolerated` is the only 404 body accepted, or `null` for 204 only. */
export type Track = (path: string, tolerated: ErrorBody | null) => void;

async function deleteTracked(
  request: APIRequestContext,
  headers: Record<string, string>,
  path: string,
  tolerated: ErrorBody | null,
): Promise<void> {
  const response = await request.delete(path, { headers });
  const status = response.status();

  if (status === 204) {
    return;
  }

  expect(
    { status, tolerated: tolerated !== null },
    `cleanup DELETE ${path} must answer 204 or a tolerated 404; got ${String(status)} ${await response.text()}`,
  ).toEqual({ status: 404, tolerated: true });

  const body = (await response.json()) as ErrorBody;
  expect(
    body,
    `cleanup DELETE ${path}: a 404 is tolerated only with the exact contract body`,
  ).toEqual(tolerated);
}

export async function withCleanup(
  request: APIRequestContext,
  headers: Record<string, string>,
  steps: (track: Track) => Promise<void>,
): Promise<void> {
  const tracked: { path: string; tolerated: ErrorBody | null }[] = [];
  let stepsError: unknown;
  let stepsFailed = false;

  try {
    await steps((path, tolerated) => tracked.push({ path, tolerated }));
  } catch (error) {
    stepsFailed = true;
    stepsError = error;
  }

  // Reverse registration order: files registered after their meeting go first.
  let cleanupError: unknown;
  let cleanupFailed = false;

  for (const { path, tolerated } of tracked.reverse()) {
    try {
      await deleteTracked(request, headers, path, tolerated);
    } catch (error) {
      if (!cleanupFailed) {
        cleanupFailed = true;
        cleanupError = error;
      }
    }
  }

  if (stepsFailed) {
    throw stepsError;
  }

  if (cleanupFailed) {
    throw cleanupError;
  }
}
