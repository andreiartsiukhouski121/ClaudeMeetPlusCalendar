'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { ApiError, apiFetch } from '../api-client';
import { toIsoStartsAt } from '../format-date';
import { readSessionToken } from '../session';
import type { CreateMeetingFormState, Meeting } from '../types';

/**
 * Meeting creation Server Action.
 *
 * Invariant 13: only async functions are exported, so `CreateMeetingFormState` lives in
 * `lib/types.ts`.
 *
 * Invariant 10: the session check is repeated **inside** the action rather than delegated to
 * `proxy.ts` — the proxy matcher does not cover Server Actions reliably, and Next's own docs call
 * the proxy no security guarantee.
 *
 * Invariant 11: `redirect()` is called outside `try/catch`.
 */
export async function createMeetingAction(
  _prevState: CreateMeetingFormState,
  formData: FormData,
): Promise<CreateMeetingFormState> {
  const token = await readSessionToken();

  if (token === undefined) {
    redirect('/auth/session-expired');
  }

  const title = String(formData.get('title') ?? '').trim();
  const startsAt = toIsoStartsAt(String(formData.get('startsAt') ?? ''));

  if (title === '') {
    return { error: 'Enter a meeting title' };
  }
  if (startsAt === null) {
    return { error: 'Enter a meeting date and time' };
  }

  let failure: ApiError | undefined;

  try {
    // `durationMinutes` is not sent at all — Nest defaults it to 60. This request is exactly why
    // `@IsOptional()` on the DTO field is mandatory (`HD-API-20`).
    await apiFetch<Meeting>('/meetings', {
      method: 'POST',
      token,
      body: { title, startsAt },
    });
  } catch (error) {
    if (!(error instanceof ApiError)) {
      // Nest down or a 500: let it reach the error boundary rather than become "check the title".
      throw error;
    }
    failure = error;
  }

  if (failure?.status === 401) {
    redirect('/auth/session-expired');
  }
  if (failure !== undefined) {
    return {
      error:
        failure.status === 400
          ? 'Check the title (3 to 100 characters) and the meeting date'
          : 'Could not create the meeting, please try again',
    };
  }

  // Without this the client router cache shows the stale list even on a fresh server render.
  // `revalidatePath` rather than `refresh()`: it also works when the form is submitted without JS,
  // and the choice is fixed once for the whole codebase.
  revalidatePath('/');

  return {};
}
