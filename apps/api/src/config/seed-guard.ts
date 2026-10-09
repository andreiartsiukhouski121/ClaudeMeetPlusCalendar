/**
 * The seed writes four accounts sharing one password that is committed to git (`users.seed.ts`,
 * mirrored in `e2e/fixtures/seed.ts`). That is acceptable for a development or an e2e database and
 * never for a production one, so `apps/api/prisma/seed.ts` refuses to run when `NODE_ENV` says
 * production — the same signal the session cookie's `secure` flag reads (invariant 12).
 *
 * Its own module, carrying no decorator and no Nest import, for the reason `normalize-email.ts`
 * gives: the seed runs under plain `node`, whose type stripping cannot load decorated code.
 */
export function assertSeedAllowed(nodeEnv: string | undefined): void {
  if (nodeEnv === 'production') {
    throw new Error(
      'db:seed refuses to run with NODE_ENV=production: the seed accounts share a password ' +
        'committed to git and must never reach a production database.',
    );
  }
}
