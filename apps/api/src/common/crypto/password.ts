import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * Хеширование паролей на `node:crypto.scrypt` — без нативных зависимостей вроде bcrypt.
 *
 * Формат хранения: `scrypt$<saltHex>$<keyHex>` (план имплементации §3.2).
 * Соль — 16 случайных байт на каждый вызов, ключ — 64 байта, сравнение — `timingSafeEqual`.
 *
 * Юниты лежат рядом (`password.spec.ts`, AL-UT-09…11), а не у `PasswordService`:
 * сервис — DI-обёртка в одну строку на метод, его спек тестировал бы обёртку, а не поведение.
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
 * `false` на любом непригодном `stored` — битый формат, чужой алгоритм, обрезанный хеш —
 * и НИКОГДА исключение: иначе одна повреждённая запись в хранилище превращает 401 в 500
 * (AL-UT-11).
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
