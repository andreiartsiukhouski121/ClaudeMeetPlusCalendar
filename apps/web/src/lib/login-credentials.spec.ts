import { describe, expect, it } from 'vitest';

import { hasEmptyCredential, readLoginCredentials } from './login-credentials';

/**
 * Кейсы AL-UT-29, AL-UT-30 (см. `e2e/regression/auth-login/auth-login.unit.cases.md`).
 *
 * Заведены задачей на фикс по итогам приёмки фичи 1: `loginAction` обрезал пробелы не только
 * у email, но и у пароля. Пароль с пробелом на краю молча превращался в другой пароль, и
 * владелец такого пароля не входил никогда. Без этих тестов правка вернулась бы обратно.
 */

function formDataOf(email: string, password: string): FormData {
  const data = new FormData();
  data.set('email', email);
  data.set('password', password);

  return data;
}

describe('readLoginCredentials', () => {
  it('AL-UT-29 — email обрезается, пароль остаётся байт-в-байт', () => {
    const credentials = readLoginCredentials(
      formDataOf('  teacher@purpleschool.test  ', '  Pa ss  '),
    );

    expect(credentials.email).toBe('teacher@purpleschool.test');
    // Ключевой ассерт задачи-фикса: ни trim, ни нормализация пробелов внутри.
    expect(credentials.password).toBe('  Pa ss  ');
  });

  it('AL-UT-30 — отсутствующие поля дают пустые строки и считаются пустыми', () => {
    const empty = readLoginCredentials(new FormData());

    expect(empty).toEqual({ email: '', password: '' });
    expect(hasEmptyCredential(empty)).toBe(true);

    // Пароль из одних пробелов пустым НЕ считается: он валиден как пароль, подходит он
    // или нет — решает сервер, а не форма.
    expect(hasEmptyCredential({ email: 'a@b.test', password: '   ' })).toBe(false);
    expect(hasEmptyCredential({ email: 'a@b.test', password: 'x' })).toBe(false);
  });
});
