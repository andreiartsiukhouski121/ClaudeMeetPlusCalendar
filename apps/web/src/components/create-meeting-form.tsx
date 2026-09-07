'use client';

import { useActionState } from 'react';

import { createMeetingAction } from '@/lib/actions/meetings';
import type { CreateMeetingFormState } from '@/lib/types';

import styles from './create-meeting-form.module.css';

const INITIAL_STATE: CreateMeetingFormState = {};

/**
 * Форма создания встречи. Единственный клиентский компонент дашборда — `'use client'` тут
 * из-за `useActionState`, которым показывается текст ошибки. Сама отправка идёт Server
 * Action-ом, токен в браузер не попадает.
 *
 * Разметка продиктована локаторами тестов (тест-план §5.1):
 *  - настоящие `<label htmlFor>` — `getByLabel('Название')` / `getByLabel('Дата и время')`;
 *  - кнопка с точным именем «Создать встречу» (`HD-FN-06`, `HD-FN-07`);
 *  - контейнер ошибки с `role="alert"`.
 *
 * Ни `required`, ни `min`/`max` (риск 20): нативная валидация заблокировала бы отправку,
 * и серверные ветки «Введите название» / «Укажите дату и время» никогда бы не выполнились.
 * Длительность не спрашиваем вовсе — Nest подставит дефолт 60 минут.
 */
export function CreateMeetingForm() {
  const [state, formAction, pending] = useActionState(createMeetingAction, INITIAL_STATE);

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Новая встреча</h2>

      <form action={formAction} className={styles.form} noValidate>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="title">
            Название
          </label>
          <input className={styles.input} id="title" name="title" type="text" />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="startsAt">
            Дата и время
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
          Создать встречу
        </button>
      </form>
    </section>
  );
}
