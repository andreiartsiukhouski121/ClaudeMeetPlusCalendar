'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { ApiError, apiFetchMultipart } from '../api-client';
import { readSessionToken } from '../session';
import type { MeetingFile, UploadFileFormState } from '../types';

/**
 * Attachment upload Server Action.
 *
 * Invariant 13: only async functions are exported, so `UploadFileFormState` lives in
 * `lib/types.ts` and `apiFetchMultipart` lives in `api-client.ts`.
 *
 * The meeting id is the **bound** first argument (`uploadMeetingFileAction.bind(null, meetingId)`
 * in `UploadFileForm`) — never a hidden form field, so a client cannot substitute it. It arrives
 * here the same way `ownerId` arrives at Nest: from something the caller cannot edit, never from
 * the request body (invariant 5's neighbour).
 *
 * Invariant 10: the session check is repeated **inside** the action — `proxy.ts` only sees that a
 * cookie exists, and its new branch for `/meetings/*` is optimistic, not security
 * (`apps/web/src/lib/actions/meetings.ts:17-19,27-31` is the established shape).
 *
 * Invariant 11: both `redirect()` calls sit outside `try/catch` — it throws `NEXT_REDIRECT`, and a
 * `catch` around it would swallow that throw and the symptom would be "the upload does nothing but
 * the row appears".
 */
export async function uploadMeetingFileAction(
  meetingId: string,
  _prevState: UploadFileFormState,
  formData: FormData,
): Promise<UploadFileFormState> {
  const token = await readSessionToken();

  if (token === undefined) {
    redirect('/auth/session-expired');
  }

  const file = formData.get('file');

  if (!(file instanceof File)) {
    return { error: 'Choose a file to upload' };
  }

  let failure: ApiError | undefined;

  try {
    await apiFetchMultipart<MeetingFile>(`/meetings/${meetingId}/files`, {
      token,
      file,
    });
  } catch (error) {
    if (!(error instanceof ApiError)) {
      // Nest down or a 500: let it reach the error boundary rather than become a form error.
      throw error;
    }
    failure = error;
  }

  if (failure?.status === 401) {
    redirect('/auth/session-expired');
  }
  if (failure !== undefined) {
    // Nest's own message, byte-for-byte: every error body in design §3 is already a sentence a
    // user can act on ("Unsupported file type", the filename rule, the ten-file refusal), and
    // nothing here would improve on it.
    return { error: failure.message };
  }

  // Without this the client router cache shows the stale attachment list even on a fresh server
  // render. `revalidatePath` rather than `refresh()`: it also works when the form is submitted
  // without JS, matching `createMeetingAction`'s choice for the same reason.
  revalidatePath(`/meetings/${meetingId}`);

  return {};
}
