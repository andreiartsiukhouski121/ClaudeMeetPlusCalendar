import { Injectable } from '@nestjs/common';

import { hashPassword } from '../common/crypto/password.js';
import type { PublicUser, User } from './user.types.js';
import { toPublicUser } from './users.mapper.js';
import { SEED_USERS } from './users.seed.js';

/**
 * Canonical email form: `trim` + `toLowerCase`. Case and stray spaces must not block a login
 * (AL-API-10, AL-UT-17), and `GET /auth/me` must return the seeded email rather than whatever the
 * client sent.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * In-memory user store — the project has no database. The seed is applied in the constructor and
 * hashes are derived from the plaintexts in `users.seed.ts`.
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
