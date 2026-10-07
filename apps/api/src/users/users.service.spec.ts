import { describe, expect, it } from 'vitest';

import { normalizeEmail } from './normalize-email.js';
import { toPublicUser } from './users.mapper.js';
import type { User } from './user.types.js';

/**
 * Cases AL-UT-17 and AL-UT-19 from `e2e/regression/auth-login/auth-login.unit.cases.md`,
 * re-pointed at the pure helpers `UsersService` now delegates to (`ADR-0027`): `findByEmail`
 * reaches Prisma from `meeting-files` task 8, so there is no in-process store left to build a
 * service around, but the normalisation and the public-shape rules it relies on are still plain
 * functions and still worth a unit each.
 */
describe('normalizeEmail / toPublicUser', () => {
  it('AL-UT-17 — findByEmail ignores case and surrounding whitespace', () => {
    const email = 'teacher@purpleschool.test';

    expect(normalizeEmail(email)).toBe(email);
    expect(normalizeEmail(email.toUpperCase())).toBe(email);
    expect(normalizeEmail(`  ${email}  `)).toBe(email);
    // Mixed case and padding together, not only one at a time.
    expect(normalizeEmail(`  ${email.toUpperCase()}  `)).toBe(email);
  });

  it('AL-UT-19 — toPublic contains no passwordHash', () => {
    const user: User = {
      id: 'usr-teacher',
      email: 'teacher@purpleschool.test',
      name: 'Anna Teacher',
      passwordHash: 'scrypt$deadbeef$cafebabe',
    };

    const publicUser = toPublicUser(user);

    expect(Object.keys(publicUser).sort()).toEqual(['email', 'id', 'name']);
    expect(publicUser).not.toHaveProperty('passwordHash');
    expect(JSON.stringify(publicUser)).not.toContain('scrypt');
  });
});
