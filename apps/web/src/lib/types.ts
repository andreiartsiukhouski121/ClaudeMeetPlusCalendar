/**
 * Типы данных веб-слоя (план имплементации §3.5).
 *
 * Держатся здесь, а не в файлах с `'use server'`: такой файл может экспортировать **только**
 * async-функции, экспорт интерфейса или константы оттуда ломает сборку (риск 19). Поэтому
 * `LoginFormState` живёт тут, а не рядом с `loginAction`.
 */

/** Профиль пользователя в том виде, в каком его отдаёт Nest: `passwordHash` срезан на сервере. */
export interface PublicUser {
  id: string;
  email: string;
  name: string;
}

export interface Meeting {
  id: string;
  title: string;
  /** ISO 8601 UTC — ровно то, что пришло от Nest, без локальных преобразований. */
  startsAt: string;
  durationMinutes: number;
}

export interface MeetingsPage {
  items: Meeting[];
  /** Полное число встреч владельца, а не длина `items`: список отсечён лимитом. */
  total: number;
}

/**
 * Состояние формы логина для `useActionState`. `email` возвращается вместе с ошибкой, чтобы
 * пользователю не приходилось перенабирать его после неудачной попытки.
 */
export interface LoginFormState {
  error?: string;
  email?: string;
}

export interface CreateMeetingFormState {
  error?: string;
}

/** Пара из формы логина после разбора `FormData` (см. `login-credentials.ts`). */
export interface LoginCredentials {
  email: string;
  password: string;
}
