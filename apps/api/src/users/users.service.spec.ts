import { beforeAll, describe, expect, it } from 'vitest';

import { UsersService } from './users.service.js';
import { SEED_USERS } from './users.seed.js';

/** Cases AL-UT-17 and AL-UT-19 from `e2e/regression/auth-login/auth-login.unit.cases.md`. */
describe('UsersService', () => {
  let service: UsersService;

  // One instance per file: the constructor runs scrypt for every seeded user.
  beforeAll(() => {
    service = new UsersService();
  });

  it('AL-UT-17 — findByEmail ignores case and surrounding whitespace', () => {
    const seed = SEED_USERS[0];

    const byExact = service.findByEmail(seed.email);
    const byUpper = service.findByEmail(seed.email.toUpperCase());
    const byPadded = service.findByEmail(`  ${seed.email}  `);

    expect(byExact?.id).toBe(seed.id);
    expect(byUpper).toBe(byExact);
    expect(byPadded).toBe(byExact);
    // The canonical seeded email is stored and returned, not whatever the client sent.
    expect(byUpper?.email).toBe(seed.email.toLowerCase());
    expect(service.findByEmail('nobody@purpleschool.test')).toBeUndefined();
  });

  it('AL-UT-19 — toPublic contains no passwordHash', () => {
    const user = service.findByEmail(SEED_USERS[0].email);
    expect(user?.passwordHash).toEqual(expect.stringContaining('scrypt$'));

    const publicUser = service.toPublic(user!);

    expect(Object.keys(publicUser).sort()).toEqual(['email', 'id', 'name']);
    expect(publicUser).not.toHaveProperty('passwordHash');
    expect(JSON.stringify(publicUser)).not.toContain('scrypt');
  });
});
