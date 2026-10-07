/**
 * Canonical email form: `trim` + `toLowerCase`. Case and stray spaces must not block a login
 * (AL-API-10, AL-UT-17), and `GET /auth/me` must return the seeded email rather than whatever the
 * client sent.
 *
 * Lives in its own module, carrying no decorator, on purpose: `apps/api/prisma/seed.ts` runs under
 * plain `node`, whose type stripping throws on `@Injectable()` syntax, so this function cannot live
 * in `users.service.ts` while the seed script needs to import it directly rather than keep its own
 * copy of the rule.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
