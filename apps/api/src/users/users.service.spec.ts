import { beforeAll, describe, expect, it } from 'vitest';

import { UsersService } from './users.service.js';
import { SEED_USERS } from './users.seed.js';

/** Кейсы AL-UT-17 и AL-UT-19 из `e2e/regression/auth-login/auth-login.unit.cases.md`. */
describe('UsersService', () => {
  let service: UsersService;

  // Один инстанс на файл: конструктор считает scrypt для каждого сид-пользователя.
  beforeAll(() => {
    service = new UsersService();
  });

  it('AL-UT-17 — findByEmail нечувствителен к регистру и к пробелам по краям', () => {
    const seed = SEED_USERS[0];

    const byExact = service.findByEmail(seed.email);
    const byUpper = service.findByEmail(seed.email.toUpperCase());
    const byPadded = service.findByEmail(`  ${seed.email}  `);

    expect(byExact?.id).toBe(seed.id);
    expect(byUpper).toBe(byExact);
    expect(byPadded).toBe(byExact);
    // Хранится и отдаётся канонический email из сида, а не то, что прислал клиент.
    expect(byUpper?.email).toBe(seed.email.toLowerCase());
    expect(service.findByEmail('nobody@purpleschool.test')).toBeUndefined();
  });

  it('AL-UT-19 — toPublic не содержит passwordHash', () => {
    const user = service.findByEmail(SEED_USERS[0].email);
    expect(user?.passwordHash).toEqual(expect.stringContaining('scrypt$'));

    const publicUser = service.toPublic(user!);

    expect(Object.keys(publicUser).sort()).toEqual(['email', 'id', 'name']);
    expect(publicUser).not.toHaveProperty('passwordHash');
    expect(JSON.stringify(publicUser)).not.toContain('scrypt');
  });
});
