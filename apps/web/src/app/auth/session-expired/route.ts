import { redirect } from 'next/navigation';

import { destroySession } from '@/lib/session';

/**
 * Сброс негодной сессии: удаляет cookie и уводит на форму логина.
 *
 * Зачем отдельный Route Handler, а не `redirect('/auth/login')` прямо из страницы.
 *
 * Cookie с невалидным токеном (протухшим, подделанным, подписанным прежним секретом) ломает
 * приложение наглухо: `proxy.ts` по устройству видит только **наличие** cookie, поэтому пускает
 * запрос на `/`; страница получает 401 от Nest и уводит на `/auth/login`; proxy снова видит
 * cookie и возвращает на `/`. Получается `ERR_TOO_MANY_REDIRECTS`, и пользователь не может даже
 * дойти до формы, чтобы войти заново. Найдено кейсом `SEC-FN-05`.
 *
 * Разорвать цикл удалением cookie при рендере страницы нельзя: `cookies().delete()` вне Server
 * Action и Route Handler бросает ошибку. Route Handler — единственное место, где сессию можно и
 * прочитать, и стереть, и сразу увести пользователя.
 *
 * Путь **не входит** в матчер `proxy.ts` — иначе цикл бы вернулся.
 */
export async function GET(): Promise<never> {
  await destroySession();

  redirect('/auth/login');
}
