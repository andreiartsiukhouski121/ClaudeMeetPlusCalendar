'use client';

import { Button, Input, Label, TextField } from '@heroui/react';
import { useActionState } from 'react';

import { createMeetingAction } from '@/lib/actions/meetings';
import type { CreateMeetingFormState } from '@/lib/types';

const INITIAL_STATE: CreateMeetingFormState = {};

/**
 * Create-meeting form. The dashboard's only client component — `'use client'` is here for
 * `useActionState`, which surfaces the error text. Submission goes through a Server Action, so the
 * token never reaches the browser.
 *
 * Markup dictated by test locators: real label/input wiring, a button named exactly
 * "Create meeting" (`HD-FN-06`, `HD-FN-07`), and an error container with `role="alert"`.
 *
 * The `form` element stays native, as in `LoginForm`: HeroUI's `Form` owns submission and does not
 * compose with a Server Action binding (`ADR-0023`).
 *
 * Invariant 15: no `required`, no `isRequired`, no `min`/`max` — native or React Aria validation
 * would block submission and the server branches would never run. Duration is not asked for at
 * all; Nest defaults it to 60 minutes.
 */
export function CreateMeetingForm() {
  const [state, formAction, pending] = useActionState(createMeetingAction, INITIAL_STATE);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">New meeting</h2>

      <form action={formAction} className="flex flex-col gap-4" noValidate>
        <TextField name="title" type="text">
          <Label>Title</Label>
          <Input />
        </TextField>

        <TextField name="startsAt" type="datetime-local">
          <Label>Date and time</Label>
          <Input step={60} />
        </TextField>

        {state.error !== undefined && (
          <p className="text-danger text-sm" role="alert">
            {state.error}
          </p>
        )}

        <Button type="submit" isPending={pending}>
          Create meeting
        </Button>
      </form>
    </section>
  );
}
