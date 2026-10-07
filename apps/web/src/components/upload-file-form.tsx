'use client';

import { Button, Label } from '@heroui/react';
import { useActionState } from 'react';

import { uploadMeetingFileAction } from '@/lib/actions/meeting-files';
import type { UploadFileFormState } from '@/lib/types';

const INITIAL_STATE: UploadFileFormState = {};

interface UploadFileFormProps {
  meetingId: string;
}

/**
 * Attachment upload form, below the attachments list on `/meetings/<id>`.
 *
 * `'use client'` is here for `useActionState`, the same reason `CreateMeetingForm` carries it.
 * Submission goes through a Server Action, so the token never reaches the browser (invariant 19).
 *
 * The meeting id is **bound** rather than a form field (design §2): a client cannot substitute it
 * because it never travels in the request body at all. `uploadMeetingFileAction` is a `'use server'`
 * export, so binding it here is the same shape Next uses for any Server Action that needs an
 * argument beyond `(prevState, formData)`.
 *
 * Invariant 15: the `form` stays native with `noValidate`; submit is `<Button type="submit">`,
 * never `onPress`; the file input carries **no `required`** and **no `accept`** — either would let
 * the browser block submission before Nest's validation branch ever runs, and `MF-FN-06` would end
 * up testing the browser instead of our code. The label is a real `<label>` (HeroUI's `Label`
 * standalone, `htmlFor`-linked — the same component `CreateMeetingForm` uses inside `TextField`),
 * never a placeholder standing in for it (`ui-ux-pro-max`, Input Labels, severity High).
 *
 * The file control itself stays a bare native `<input type="file">` rather than a HeroUI `Input`:
 * `Input` is styled for text entry and expects `TextField`'s context, and a file picker's chrome is
 * the browser's own — HeroUI's docs show no file variant to copy here.
 */
export function UploadFileForm({ meetingId }: UploadFileFormProps) {
  const boundAction = uploadMeetingFileAction.bind(null, meetingId);
  const [state, formAction, pending] = useActionState(boundAction, INITIAL_STATE);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="file">Attachment</Label>
        <input
          id="file"
          type="file"
          name="file"
          className="border-border bg-surface text-foreground file:bg-accent file:text-accent-foreground block w-full rounded-xl border px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:px-3 file:py-1.5 file:text-sm file:font-medium"
        />
      </div>

      {state.error !== undefined && (
        <p className="text-danger text-sm" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" isPending={pending} className="w-fit">
        Upload
      </Button>
    </form>
  );
}
