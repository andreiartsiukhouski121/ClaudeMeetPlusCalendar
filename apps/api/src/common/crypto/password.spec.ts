import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword } from './password.js';

/**
 * Cases AL-UT-09…11 from `e2e/regression/auth-login/auth-login.unit.cases.md`. Every test title
 * starts with its case ID — otherwise neither `pnpm test:auth-login` (`vitest -t "AL-UT-"`) nor
 * meta-test rule 7 works.
 */
describe('common/crypto/password', () => {
  const PLAIN = 'Passw0rd!';

  it('AL-UT-09 — the hash differs from the plaintext, has the scrypt$salt$key shape and is unique per call', () => {
    const first = hashPassword(PLAIN);
    const second = hashPassword(PLAIN);

    expect(first).not.toBe(PLAIN);
    expect(first).not.toContain(PLAIN);

    const parts = first.split('$');
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe('scrypt');
    // 16 salt bytes and 64 key bytes in hex.
    expect(parts[1]).toMatch(/^[0-9a-f]{32}$/);
    expect(parts[2]).toMatch(/^[0-9a-f]{128}$/);

    // The salt is random, so two hashes of one password differ yet both verify.
    expect(second).not.toBe(first);
    expect(verifyPassword(PLAIN, first)).toBe(true);
    expect(verifyPassword(PLAIN, second)).toBe(true);
  });

  it('AL-UT-10 — verifyPassword returns true for the correct password', () => {
    expect(verifyPassword(PLAIN, hashPassword(PLAIN))).toBe(true);
  });

  it('AL-UT-11 — a wrong password, a foreign format and an empty string give false without throwing', () => {
    const stored = hashPassword(PLAIN);

    expect(verifyPassword('other-password', stored)).toBe(false);

    // A broken or foreign-format hash is false, never an exception: otherwise one corrupted record
    // turns a 401 into a 500.
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
