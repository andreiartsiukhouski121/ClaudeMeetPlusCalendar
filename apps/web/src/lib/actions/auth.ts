'use server';

import { redirect } from 'next/navigation';

import { ApiError, apiFetch } from '../api-client';
import { hasEmptyCredential, readLoginCredentials } from '../login-credentials';
import { createSession, destroySession } from '../session';
import type { LoginFormState, PublicUser } from '../types';

/**
 * Server Actions аутентификации.
 *
 * Файл экспортирует ТОЛЬКО async-функции: `'use server'` не разрешает экспорт констант и
 * типов (риск 19). Поэтому `LoginFormState` лежит в `lib/types.ts`, а `SESSION_COOKIE_NAME`
 * — в `lib/session-cookie.ts`.
 */

interface LoginResponse {
  accessToken: string;
  user: PublicUser;
}

/**
 * Логин из формы (`useActionState`). Возвращает состояние с текстом ошибки — или уводит на `/`.
 *
 * `redirect('/')` стоит СТРОГО после `try/catch` (риск 18): он реализован через выброс
 * `NEXT_REDIRECT`, и `catch` внутри блока перехватил бы его — cookie уже выставлена, а
 * пользователь остался бы на форме с непонятной ошибкой. Симптом «логин ничего не делает».
 *
 * Валидация — только серверная: у полей формы нет ни `required`, ни `type="email"` (риск 20),
 * иначе браузер не отправил бы форму и ветки ниже никогда бы не выполнились.
 */
export async function loginAction(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const { email, password } = readLoginCredentials(formData);

  if (hasEmptyCredential({ email, password })) {
    return { error: 'Введите email и пароль', email };
  }

  try {
    const result = await apiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    await createSession(result.accessToken);
  } catch (error) {
    // 401 — «неверный email или пароль», одна и та же формулировка на оба случая: UI не
    // должен подсказывать, существует ли аккаунт (это же требование у AL-API-03).
    if (error instanceof ApiError && error.status === 401) {
      return { error: 'Неверный email или пароль', email };
    }
    // 400 — ValidationPipe отверг payload; для формы логина это всегда формат email.
    if (error instanceof ApiError && error.status === 400) {
      return { error: 'Проверьте формат email', email };
    }
    // Всё остальное (Nest не поднят, 500) — не наша ветка: пусть падает в error boundary,
    // а не превращается в «неверный пароль».
    throw error;
  }

  redirect('/');
}

/**
 * Выход. `redirect` — тоже вне любого `try` по той же причине (риск 18).
 */
export async function logoutAction(): Promise<void> {
  await destroySession();

  redirect('/auth/login');
}
