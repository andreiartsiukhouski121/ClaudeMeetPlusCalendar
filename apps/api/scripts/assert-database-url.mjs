// `db:reset` no longer runs `prisma db push --force-reset`: Prisma 7's CLI detects an AI agent and
// refuses that flag without interactive consent, and this script runs on every Playwright run,
// locally and in CI, where nobody is there to grant it. The reset is a plain SQL schema drop and
// recreate instead (`reset-schema.mjs`), which never touches that gate.
//
// That makes this module load-bearing rather than cosmetic: it is now the *only* thing standing
// between the destructive SQL and the wrong database. It refuses to run without an explicitly set
// `DATABASE_URL` — no fallback, no dev default, unlike `database.config.ts`'s deliberate
// read-fall-back-warn contract (`FACT-3574`), which must keep working for `nest start` and must not
// be reused here — and `reset-schema.mjs` imports the validated value from here rather than reading
// `process.env.DATABASE_URL` a second time, so there is exactly one place this is decided.

const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl === undefined || databaseUrl === '') {
  console.error(
    'db:reset refuses to run without an explicit DATABASE_URL — otherwise it would drop and ' +
      'recreate the schema of whatever database the dev fallback points at. Set it first, e.g.: ' +
      "$env:DATABASE_URL='postgres://purpleschool:purpleschool@127.0.0.1:5433/purpleschool_e2e'; pnpm db:reset",
  );
  process.exit(1);
}

export const DATABASE_URL = databaseUrl;
