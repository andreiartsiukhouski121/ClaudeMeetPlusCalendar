'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { ApiError, apiFetch } from '../api-client';
import { toIsoStartsAt } from '../format-date';
import { readSessionToken } from '../session';
import type { CreateMeetingFormState, Meeting } from '../types';

/**
 * Server Action создания встречи.
 *
 * Файл экспортирует ТОЛЬКО async-функции: `'use server'` не разрешает экспорт констант и
 * типов (риск 19), поэтому `CreateMeetingFormState` живёт в `lib/types.ts`.
 */

/**
 * Создание встречи из формы дашборда (`useActionState`).
 *
 * Проверка сессии дублируется **внутри** действия и не полагается на `proxy.ts`: матчер
 * proxy не покрывает Server Actions надёжно, а документация Next прямо называет proxy
 * «не гарантией безопасности» (§0, риск 3).
 *
 * `redirect()` вызывается вне `try/catch` (риск 18): он реализован через выброс
 * `NEXT_REDIRECT`, и `catch` внутри блока перехватил бы его — вместо перехода на логин
 * пользователь увидел бы форму с непонятной ошибкой.
 *
 * Валидация только серверная: у полей формы нет ни `required`, ни встроенных ограничений
 * (риск 20), иначе ветки «Введите название» / «Укажите дату» никогда бы не выполнились
 * и проверяли бы поведение браузера, а не наш код.
 */
export async function createMeetingAction(
  _prevState: CreateMeetingFormState,
  formData: FormData,
): Promise<CreateMeetingFormState> {
  const token = await readSessionToken();

  if (token === undefined) {
    redirect('/auth/login');
  }

  const title = String(formData.get('title') ?? '').trim();
  const startsAt = toIsoStartsAt(String(formData.get('startsAt') ?? ''));

  if (title === '') {
    return { error: 'Введите название встречи' };
  }
  if (startsAt === null) {
    return { error: 'Укажите дату и время встречи' };
  }

  let failure: ApiError | undefined;

  try {
    // `durationMinutes` не отправляется вовсе — Nest подставит дефолт 60. Именно из-за
    // этого запроса `@IsOptional()` на поле DTO обязателен (`HD-API-20`).
    await apiFetch<Meeting>('/meetings', {
      method: 'POST',
      token,
      body: { title, startsAt },
    });
  } catch (error) {
    if (!(error instanceof ApiError)) {
      // Nest не поднят или 500 — не наша ветка: пусть падает в error boundary, а не
      // превращается в «проверьте название».
      throw error;
    }
    failure = error;
  }

  if (failure?.status === 401) {
    redirect('/auth/login');
  }
  if (failure !== undefined) {
    return {
      error:
        failure.status === 400
          ? 'Проверьте название (от 3 до 100 символов) и дату встречи'
          : 'Не удалось создать встречу, попробуйте ещё раз',
    };
  }

  // Без этого клиентский router-кэш покажет старый список даже при свежем серверном
  // рендере (риск 13). `revalidatePath`, а не `refresh()`: работает и при отправке формы
  // без JS, и выбор фиксируется один на кодовую базу.
  revalidatePath('/');

  return {};
}
