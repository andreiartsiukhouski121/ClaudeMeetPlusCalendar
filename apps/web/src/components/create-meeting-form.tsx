'use client';

import { Button, Card, Input, Label, TextField } from '@heroui/react';
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
 * compose with a Server Action binding (`ADR-0023`). The error stays a plain `p` with `role="alert"`
 * rather than HeroUI's `Alert`: the role is what `HD-FN-06` addresses, and a component that may or
 * may not render it is not worth the risk for a coloured box.
 *
 * It sits in a `Card` so the panel reads as the same kind of surface as the meeting rows opposite —
 * before, the list had cards and the form floated on the page background.
 *
 * Invariant 15: no `required`, no `isRequired`, no `min`/`max` — native or React Aria validation
 * would block submission and the server branches would never run. Duration is not asked for at
 * all; Nest defaults it to 60 minutes.
 */
export function CreateMeetingForm() {
  const [state, formAction, pending] = useActionState(createMeetingAction, INITIAL_STATE);

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-base font-semibold tracking-tight">New meeting</h2>

      <Card.Root className="p-5">
        <Card.Content className="p-0">
          <form action={formAction} className="flex flex-col gap-5" noValidate>
            <TextField name="title" type="text">
              <Label>Title</Label>
              <Input placeholder="Module wrap-up session" />
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

            <Button type="submit" isPending={pending} fullWidth>
              Create meeting
            </Button>
          </form>
        </Card.Content>
      </Card.Root>
    </section>
  );
}
