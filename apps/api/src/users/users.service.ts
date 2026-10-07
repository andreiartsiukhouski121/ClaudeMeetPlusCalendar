import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import type { PublicUser, User } from './user.types.js';
import { toPublicUser } from './users.mapper.js';
import { normalizeEmail } from './normalize-email.js';

/**
 * Users service, backed by Prisma (`ADR-0027`). Holds no `Map`, no array and seeds nothing itself:
 * rows come from the database the standalone seed (`apps/api/prisma/seed.ts`) populated.
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | undefined> {
    const user = await this.prisma.user.findUnique({
      where: { email: normalizeEmail(email) },
    });

    return user === null ? undefined : toDomainUser(user);
  }

  async findById(id: string): Promise<User | undefined> {
    const user = await this.prisma.user.findUnique({ where: { id } });

    return user === null ? undefined : toDomainUser(user);
  }

  toPublic(user: User): PublicUser {
    return toPublicUser(user);
  }
}

/**
 * Explicit field list rather than the raw Prisma row: keeps `User` the one shape every caller
 * depends on, independent of whatever Prisma's generated type happens to carry.
 */
function toDomainUser(row: {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
}): User {
  return { id: row.id, email: row.email, name: row.name, passwordHash: row.passwordHash };
}
