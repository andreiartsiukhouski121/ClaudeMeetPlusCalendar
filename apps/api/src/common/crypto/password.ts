import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * Password hashing on `node:crypto.scrypt` — no native dependency like bcrypt.
 *
 * Stored as `scrypt$<saltHex>$<keyHex>`: 16 random salt bytes per call, a 64-byte key, compared
 * with `timingSafeEqual`.
 *
 * Units sit here (`password.spec.ts`, AL-UT-09…11) rather than on `PasswordService`: that service
 * is a one-line DI wrapper, so its spec would test the wrapper instead of the behaviour.
 */

const ALGORITHM = 'scrypt';
const SALT_BYTES = 16;
const KEY_BYTES = 64;
const HEX = /^[0-9a-f]+$/i;

export function hashPassword(plain: string): string {
  const salt = randomBytes(SALT_BYTES);
  const key = scryptSync(plain, salt, KEY_BYTES);

  return `${ALGORITHM}$${salt.toString('hex')}$${key.toString('hex')}`;
}

/**
 * Returns `false` for any unusable `stored` — broken format, foreign algorithm, truncated hash —
 * and never throws: otherwise one corrupted record turns a 401 into a 500 (AL-UT-11).
 */
export function verifyPassword(plain: string, stored: string): boolean {
  const parts = stored.split('$');

  if (parts.length !== 3) {
    return false;
  }

  const [algorithm, saltHex, keyHex] = parts;

  if (algorithm !== ALGORITHM || !HEX.test(saltHex) || !HEX.test(keyHex)) {
    return false;
  }

  try {
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(keyHex, 'hex');

    if (salt.length !== SALT_BYTES || expected.length !== KEY_BYTES) {
      return false;
    }

    return timingSafeEqual(scryptSync(plain, salt, KEY_BYTES), expected);
  } catch {
    return false;
  }
}
