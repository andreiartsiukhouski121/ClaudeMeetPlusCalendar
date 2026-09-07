import { Injectable } from '@nestjs/common';

import { hashPassword, verifyPassword } from '../common/crypto/password.js';

/**
 * DI-обёртка над `common/crypto/password.ts`: сервисам нужна инъекция, а чистым функциям —
 * прямой юнит. Своего спека у обёртки НЕТ осознанно (план имплементации §9, тест-план §4.1):
 * поведение покрыто AL-UT-09…11 у реализации, а делегация — моком в AL-UT-06.
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
