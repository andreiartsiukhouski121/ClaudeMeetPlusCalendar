'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import { loginAction } from '@/lib/actions/auth';
import type { LoginFormState } from '@/lib/types';

import styles from './login-form.module.css';

const INITIAL_STATE: LoginFormState = {};

/**
 * Форма логина. Клиентский компонент только из-за `useActionState`: сама отправка идёт
 * Server Action-ом, JWT в браузер не попадает.
 *
 * Разметка продиктована локаторами тестов (тест-план §5.1) и трогать её вслепую нельзя:
 *  - настоящие `<label htmlFor>` — `getByLabel('Email')` / `getByLabel('Пароль')`;
 *  - контейнер ошибки с `role="alert"` — `getByRole('alert')`;
 *  - кнопка с точным именем «Войти» и ссылка «Зарегистрироваться».
 *
 * Ни `required`, ни `type="email"` (риск 20): и то, и другое включает нативную валидацию,
 * браузер не отправляет форму, серверные ветки «Введите email и пароль» и «Проверьте формат
 * email» не выполняются — и кейсы AL-FN-05/AL-FN-14 начинают проверять браузер, а не наш код.
 * Поле email — `type="text"` с `autoComplete="email"`, на форме стоит `noValidate`.
 */
export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, INITIAL_STATE);

  return (
    <form action={formAction} className={styles.form} noValidate>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="email">
          Email
        </label>
        <input
          className={styles.input}
          id="email"
          name="email"
          type="text"
          autoComplete="email"
          defaultValue={state.email ?? ''}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="password">
          Пароль
        </label>
        <input
          className={styles.input}
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
        />
      </div>

      {state.error !== undefined && (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      )}

      <button className={styles.submit} type="submit" disabled={pending}>
        Войти
      </button>

      <p className={styles.hint}>
        Нет аккаунта? <Link href="/auth/register">Зарегистрироваться</Link>
      </p>
    </form>
  );
}
