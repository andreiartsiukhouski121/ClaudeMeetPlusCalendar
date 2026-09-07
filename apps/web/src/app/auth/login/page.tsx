import type { Metadata } from 'next';

import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: 'Вход — PurpleSchool',
};

/**
 * Страница логина. Серверный компонент: заголовок рендерится на сервере, интерактивная часть
 * (`useActionState`) вынесена в клиентский `LoginForm`.
 *
 * Без пропсов и без `PageProps<'/auth/login'>` — чтобы типы страницы не зависели от свежести
 * `next typegen` (риск 15).
 */
export default function LoginPage() {
  return (
    <>
      <h1>Вход</h1>
      <LoginForm />
    </>
  );
}
