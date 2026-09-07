import { logoutAction } from '@/lib/actions/auth';

import styles from './logout-button.module.css';

/**
 * Кнопка выхода. **Серверный** компонент: `'use client'` не нужен — форма с Server Action
 * работает и без клиентского JS, состояния у кнопки нет.
 *
 * Именно `<form action={logoutAction}>`, а не ссылка: выход меняет состояние, а cookie
 * удаляется только в Server Action или Route Handler (риск 4). Имя кнопки — точное
 * «Выйти» (`HD-FN-08`, `HD-FN-14`).
 */
export function LogoutButton() {
  return (
    <form action={logoutAction} className={styles.form}>
      <button className={styles.button} type="submit">
        Выйти
      </button>
    </form>
  );
}
