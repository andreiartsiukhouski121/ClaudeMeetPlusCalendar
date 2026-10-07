import { register } from 'node:module';

/**
 * `db:seed` runs this file with plain `node prisma/seed.ts` — not through Nest's compiled build,
 * not through Vitest, neither of which plain `node` is. Both of those already know how to follow
 * this repository's `.js`-suffixed relative specifier to the `.ts` file that is actually on disk
 * (the pure-ESM convention every other source file in `apps/api` relies on); plain Node's module
 * resolver does not, and a static `import './seed-impl.js'` here would fail with
 * `ERR_MODULE_NOT_FOUND` exactly the way `prisma/seed.ts` itself did before this file existed.
 *
 * So this file registers a tiny resolve hook on itself, as a `data:` URL rather than a second file
 * on disk — there is nothing to reuse it, and splitting it out would only add a file whose entire
 * purpose is "read by this one" — and only then imports (dynamically: a static `import` is hoisted
 * and would resolve before this registration ever runs) the modules that need it. The hook is
 * deliberately narrow: it only ever redirects a **relative** specifier ending in `.js` to a sibling
 * `.ts` file that actually exists, so `@prisma/client`, `@prisma/adapter-pg` and every Node builtin
 * resolve exactly as they would without it.
 */
const resolveTsSiblingHook = `
  import { existsSync } from 'node:fs';
  import { fileURLToPath } from 'node:url';

  export async function resolve(specifier, context, nextResolve) {
    const isRelative = specifier.startsWith('./') || specifier.startsWith('../');

    if (isRelative && specifier.endsWith('.js')) {
      const candidate = new URL(specifier.replace(/\\.js$/, '.ts'), context.parentURL);

      if (existsSync(fileURLToPath(candidate))) {
        return { url: candidate.href, shortCircuit: true };
      }
    }

    return nextResolve(specifier, context);
  }
`;

register(`data:text/javascript,${encodeURIComponent(resolveTsSiblingHook)}`, import.meta.url);

const { PrismaPg } = await import('@prisma/adapter-pg');
const { PrismaClient } = await import('@prisma/client');
const { hashPassword } = await import('../src/common/crypto/password.js');
const { loadDatabaseConfig } = await import('../src/config/database.config.js');
const { SEED_MEETING_FILES } = await import('../src/meeting-files/meeting-files.seed.js');
const { SEED_MEETINGS } = await import('../src/meetings/meetings.seed.js');
const { SEED_USERS } = await import('../src/users/users.seed.js');
// Not imported from `users.service.ts`: that file carries an `@Injectable()` decorator, which is
// not erasable TypeScript syntax — plain Node's type stripping handles type annotations, not
// decorator transforms, and loading it this way throws `SyntaxError: Invalid or unexpected token`.
// `normalizeEmail` lives in its own undecorated module for exactly this reason, so it is imported
// rather than reproduced here a second time.
const { normalizeEmail } = await import('../src/users/normalize-email.js');

/**
 * Standalone seed, run by `pnpm db:seed` (chained from `db:reset`) against the database directly —
 * never by a service constructor on application boot (ADR-0027). Each plaintext password in
 * `users.seed.ts` is hashed with `scrypt` right here, at seed time: that is the substance of the
 * move, not `UsersService`'s own in-memory hashing, which is unchanged and runs independently until
 * it moves onto Prisma.
 *
 * Every row is upserted by its literal id, so running this script again — against a schema
 * `db:reset` did not just wipe — changes nothing rather than failing on a duplicate key.
 * Users are applied before meetings and meetings before files: Postgres enforces both foreign keys.
 */
async function main(): Promise<void> {
  const { databaseUrl } = loadDatabaseConfig();
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

  try {
    for (const user of SEED_USERS) {
      const email = normalizeEmail(user.email);
      const passwordHash = hashPassword(user.password);

      await prisma.user.upsert({
        where: { id: user.id },
        create: { id: user.id, email, name: user.name, passwordHash },
        update: { email, name: user.name, passwordHash },
      });
    }

    for (const meeting of SEED_MEETINGS) {
      const data = {
        ownerId: meeting.ownerId,
        title: meeting.title,
        startsAt: meeting.startsAt,
        durationMinutes: meeting.durationMinutes,
        participants: meeting.participants,
      };

      await prisma.meeting.upsert({
        where: { id: meeting.id },
        create: { id: meeting.id, ...data },
        update: data,
      });
    }

    for (const file of SEED_MEETING_FILES) {
      const data = {
        meetingId: file.meetingId,
        filename: file.filename,
        contentType: file.contentType,
        sizeBytes: file.sizeBytes,
        content: file.content,
        uploadedAt: file.uploadedAt,
      };

      await prisma.meetingFile.upsert({
        where: { id: file.id },
        create: { id: file.id, ...data },
        update: data,
      });
    }
  } finally {
    await prisma.$disconnect();
  }
}

await main();
