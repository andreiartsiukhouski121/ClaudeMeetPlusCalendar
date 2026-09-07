import { Injectable } from '@nestjs/common';

import { hashPassword } from '../common/crypto/password.js';
import type { PublicUser, User } from './user.types.js';
import { toPublicUser } from './users.mapper.js';
import { SEED_USERS } from './users.seed.js';

/**
 * Приведение email к канону: `trim` + `toLowerCase`. Регистр и краевые пробелы не должны
 * мешать входу (AL-API-10, AL-UT-17), а `GET /auth/me` обязан отдавать email из сида,
 * а не то, что прислал клиент.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * In-memory хранилище пользователей: БД в проекте нет. Сид применяется в конструкторе,
 * хеши считаются из плейнтекстов `users.seed.ts` — см. §3.2 плана имплементации.
 */
@Injectable()
export class UsersService {
  private readonly usersById = new Map<string, User>();
  private readonly userIdsByEmail = new Map<string, string>();

  constructor() {
    for (const seed of SEED_USERS) {
      const email = normalizeEmail(seed.email);
      const user: User = {
        id: seed.id,
        email,
        name: seed.name,
        passwordHash: hashPassword(seed.password),
      };

      this.usersById.set(user.id, user);
      this.userIdsByEmail.set(email, user.id);
    }
  }

  findByEmail(email: string): User | undefined {
    const id = this.userIdsByEmail.get(normalizeEmail(email));

    return id === undefined ? undefined : this.usersById.get(id);
  }

  findById(id: string): User | undefined {
    return this.usersById.get(id);
  }

  toPublic(user: User): PublicUser {
    return toPublicUser(user);
  }
}
