/**
 * User seed. `e2e/fixtures/seed.ts` mirrors these values for the tests; any drift is caught by
 * SM-API-02.
 *
 * Plaintext passwords live here and are hashed with `scrypt` when `UsersService` initializes.
 * Hard-coded hash literals would be unreproducible, impossible to change without rewriting by
 * hand, and a change of scrypt parameters would break login silently. A deliberate concession of
 * a demo without a database.
 */

export interface SeedUser {
  id: string;
  email: string;
  name: string;
  password: string;
}

/** One password for everyone: different ones add no testable branch, only noise in the cases. */
const SEED_PASSWORD = 'Passw0rd!';

/**
 * Four users rather than two: `POST /meetings` mutates the shared in-memory store while Playwright
 * runs `fullyParallel: true`, so each mutating spec file gets its own owner (`planner` for
 * `*.api.spec.ts`, `organizer` for `*.functional.spec.ts`) and `teacher`/`student` stay read-only
 * baselines for exact counts.
 */
export const SEED_USERS: readonly SeedUser[] = [
  {
    id: 'usr-teacher',
    email: 'teacher@purpleschool.test',
    name: 'Anna Teacher',
    password: SEED_PASSWORD,
  },
  {
    id: 'usr-student',
    email: 'student@purpleschool.test',
    name: 'Ivan Student',
    password: SEED_PASSWORD,
  },
  {
    id: 'usr-planner',
    email: 'planner@purpleschool.test',
    name: 'Maria Planner',
    password: SEED_PASSWORD,
  },
  {
    id: 'usr-organizer',
    email: 'organizer@purpleschool.test',
    name: 'Peter Organizer',
    password: SEED_PASSWORD,
  },
];
