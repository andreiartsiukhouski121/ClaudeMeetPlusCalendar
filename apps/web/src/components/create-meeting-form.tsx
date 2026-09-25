'use client';

import { useActionState } from 'react';

import { createMeetingAction } from '@/lib/actions/meetings';
import type { CreateMeetingFormState } from '@/lib/types';

import styles from './create-meeting-form.module.css';

const INITIAL_STATE: CreateMeetingFormState = {};

/**
 * Create-meeting form. The dashboard's only client component — `'use client'` is here for
 * `useActionState`, which surfaces the error text. Submission goes through a Server Action, so the
 * token never reaches the browser.
 *
 * Markup dictated by test locators: real `<label htmlFor>` elements, a button named exactly
 * "Create meeting" (`HD-FN-06`, `HD-FN-07`), and an error container with `role="alert"`.
 *
 * Invariant 15: no `required`, no `min`/`max` — native validation would block submission and the
 * server branches would never run. Duration is not asked for at all; Nest defaults it to 60
 * minutes.
 */
export function CreateMeetingForm() {
  const [state, formAction, pending] = useActionState(createMeetingAction, INITIAL_STATE);

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>New meeting</h2>

      <form action={formAction} className={styles.form} noValidate>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="title">
            Title
          </label>
          <input className={styles.input} id="title" name="title" type="text" />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="startsAt">
            Date and time
          </label>
          <input
            className={styles.input}
            id="startsAt"
            name="startsAt"
            type="datetime-local"
            step={60}
          />
        </div>

        {state.error !== undefined && (
          <p className={styles.error} role="alert">
            {state.error}
          </p>
        )}

        <button className={styles.submit} type="submit" disabled={pending}>
          Create meeting
        </button>
      </form>
    </section>
  );
}
