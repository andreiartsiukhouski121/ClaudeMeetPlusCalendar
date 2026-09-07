import { describe, expect, it } from 'vitest';

import {
  buildSessionCookieOptions,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from './session-cookie';

/**
 * Юниты cookie сессии (`AL-UT-20…22`). Имя файла — по тест-плану §1.1 (`session.spec.ts`),
 * а тестируется `session-cookie.ts`: сам `session.ts` помечен `server-only` и трогает
 * `next/headers`, поэтому юнитами не покрывается (Vitest не резолвит этот импорт).
 *
 * Глобалы в `apps/web` не включены — `describe`/`it`/`expect` импортируются из `vitest`.
 * Заголовок каждого теста начинается с ID кейса: иначе `pnpm test:auth-login` не отберёт
 * фичу, а правило 7 мета-теста не подтвердит, что кейс автоматизирован.
 */
describe('buildSessionCookieOptions', () => {
  it('AL-UT-20 — в development cookie httpOnly, path "/", sameSite lax и secure: false', () => {
    const options = buildSessionCookieOptions('development');

    expect(options.httpOnly).toBe(true);
    expect(options.path).toBe('/');
    expect(options.sameSite).toBe('lax');
    // Именно false: `next dev` работает по http, а безусловный `secure: true` сломал бы
    // проверку в любом окружении, где loopback не считается trustworthy (риск 1).
    expect(options.secure).toBe(false);
  });

  it('AL-UT-21 — в production secure: true, остальные опции те же', () => {
    const production = buildSessionCookieOptions('production');
    const development = buildSessionCookieOptions('development');

    expect(production.secure).toBe(true);
    expect({ ...production, secure: false }).toEqual(development);
  });

  it('AL-UT-22 — SESSION_MAX_AGE_SECONDS равен часу и совпадает с JWT_EXPIRES_IN', () => {
    // 3600 — это `JWT_EXPIRES_IN = '1h'` из §3.6 плана имплементации. Разъезд этих чисел
    // даёт «сессия жива, а токен просрочен»: пользователь залогинен, а Nest отвечает 401.
    expect(SESSION_MAX_AGE_SECONDS).toBe(3600);
    expect(buildSessionCookieOptions(undefined).maxAge).toBe(SESSION_MAX_AGE_SECONDS);
    expect(SESSION_COOKIE_NAME).toBe('ps_session');
  });
});
