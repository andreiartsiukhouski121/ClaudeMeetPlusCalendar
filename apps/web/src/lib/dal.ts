import 'server-only';
import { redirect } from 'next/navigation';
import { cache } from 'react';

import { ApiError, apiFetch } from './api-client';
import { readSessionToken } from './session';
import type { MeetingsPage, PublicUser } from './types';

/**
 * Data Access Layer серверных компонентов: единственное место, откуда страница берёт данные.
 *
 * Файл помечен `server-only` и через `session.ts` трогает `next/headers`, поэтому юнитами
 * НЕ покрывается (риск 6): Vitest не резолвит этот импорт. Всё тестируемое вынесено в
 * чистые модули (`api-client.ts`, `format-date.ts`).
 *
 * **Это и есть настоящая проверка авторизации.** `proxy.ts` смотрит только на наличие cookie
 * и по документации Next гарантией безопасности не является; валидность токена подтверждает
 * Nest на `GET /auth/me`, и решение «пустить или увести на логин» принимается здесь.
 */

/** Сколько встреч показывает дашборд. Совпадает с дефолтом `MeetingsService` (§2.2 п.4). */
export const DEFAULT_MEETINGS_LIMIT = 3;

/**
 * Профиль текущего пользователя или редирект на логин.
 *
 * `cache()` из React — на один серверный рендер: `page.tsx` и любой компонент могут звать
 * функцию сколько угодно раз, запрос к Nest уйдёт один.
 *
 * При 401 делается именно `redirect`, а не удаление cookie: `.set`/`.delete` при рендере
 * страницы бросают ошибку (риск 4) — «разлогинить» пользователя тут физически нельзя.
 * `redirect()` вызывается ВНЕ `try/catch` (риск 18): внутри его проглотил бы `catch`.
 */
export const getCurrentUser = cache(async (): Promise<PublicUser> => {
  const token = await readSessionToken();
  let user: PublicUser | undefined;

  if (token !== undefined) {
    try {
      user = await apiFetch<PublicUser>('/auth/me', { token });
    } catch (error) {
      // 401 — токен просрочен, подделан или пользователя больше нет: уводим на логин.
      // Всё остальное (Nest не поднят, 500) не маскируем под «нет сессии»: пусть падает
      // в error boundary, иначе диагностика превратится в бесконечный редирект.
      if (!(error instanceof ApiError) || error.status !== 401) {
        throw error;
      }
    }
  }

  if (user === undefined) {
    redirect('/auth/login');
  }

  return user;
});

/**
 * Последние встречи и полное их число. `total` приходит от Nest и НЕ пересчитывается из
 * длины `items`: список отсечён лимитом (`HD-FN-03`).
 *
 * Проверка сессии дублируется и здесь: страница вызывает `getCurrentUser()` первой, но
 * порядок вызовов — не гарантия, а `redirect` при 401 нужен обеим функциям.
 */
export async function getMeetings(limit: number = DEFAULT_MEETINGS_LIMIT): Promise<MeetingsPage> {
  const token = await readSessionToken();
  let page: MeetingsPage | undefined;

  if (token !== undefined) {
    try {
      page = await apiFetch<MeetingsPage>(`/meetings?limit=${String(limit)}`, { token });
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) {
        throw error;
      }
    }
  }

  if (page === undefined) {
    redirect('/auth/login');
  }

  return page;
}
