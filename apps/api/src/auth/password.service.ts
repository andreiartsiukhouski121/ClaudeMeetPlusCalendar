import { Injectable } from '@nestjs/common';

import { hashPassword, verifyPassword } from '../common/crypto/password.js';

/**
 * DI wrapper over `common/crypto/password.ts`: services need injection, pure functions need a
 * direct unit test. No spec of its own on purpose — the behaviour is covered by AL-UT-09…11 on the
 * implementation, and the delegation by a mock in AL-UT-06.
 */
@Injectable()
export class PasswordService {
  hash(plain: string): string {
    return hashPassword(plain);
  }

  verify(plain: string, stored: string): boolean {
    return verifyPassword(plain, stored);
  }
}
