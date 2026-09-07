import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword } from './password.js';

/**
 * Кейсы AL-UT-09…11 из `e2e/regression/auth-login/auth-login.unit.cases.md`.
 * Заголовок каждого теста начинается с ID кейса — иначе не работает ни
 * `pnpm test:auth-login` (фильтр `vitest -t "AL-UT-"`), ни правило 7 мета-теста сьюта.
 */
describe('common/crypto/password', () => {
  const PLAIN = 'Passw0rd!';

  it('AL-UT-09 — hash не равен plain, имеет формат scrypt$salt$key и уникален на каждый вызов', () => {
    const first = hashPassword(PLAIN);
    const second = hashPassword(PLAIN);

    expect(first).not.toBe(PLAIN);
    expect(first).not.toContain(PLAIN);

    const parts = first.split('$');
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe('scrypt');
    // 16 байт соли и 64 байта ключа в hex.
    expect(parts[1]).toMatch(/^[0-9a-f]{32}$/);
    expect(parts[2]).toMatch(/^[0-9a-f]{128}$/);

    // Соль случайная, поэтому два хеша одного пароля различаются, но оба валидны.
    expect(second).not.toBe(first);
    expect(verifyPassword(PLAIN, first)).toBe(true);
    expect(verifyPassword(PLAIN, second)).toBe(true);
  });

  it('AL-UT-10 — verifyPassword с верным паролем возвращает true', () => {
    expect(verifyPassword(PLAIN, hashPassword(PLAIN))).toBe(true);
  });

  it('AL-UT-11 — неверный пароль, чужой формат и пустая строка дают false без исключения', () => {
    const stored = hashPassword(PLAIN);

    expect(verifyPassword('other-password', stored)).toBe(false);

    // Битый или чужого формата хеш — false, а НЕ исключение: иначе одна повреждённая
    // запись в хранилище превращает 401 в 500.
    for (const broken of [
      '',
      'not-a-hash',
      'bcrypt$abc$def',
      'scrypt$zz$zz',
      'scrypt$deadbeef',
      `scrypt$${'aa'.repeat(16)}$${'bb'.repeat(8)}`,
    ]) {
      expect(() => verifyPassword(PLAIN, broken)).not.toThrow();
      expect(verifyPassword(PLAIN, broken)).toBe(false);
    }
  });
});
