import { describe, expect, it } from 'vitest';

import { assertSeedAllowed } from './seed-guard.js';

/**
 * Case AL-UT-32 from `e2e/regression/auth-login/auth-login.unit.cases.md`. Every test title starts
 * with its case ID — otherwise neither `pnpm test:auth-login` (`vitest -t "AL-UT-"`) nor meta-test
 * rule 7 works.
 */
describe('config/seed-guard', () => {
  it('AL-UT-32 — the seed refuses NODE_ENV=production and runs under any other value', () => {
    expect(() => {
      assertSeedAllowed('production');
    }).toThrow(/NODE_ENV=production/);

    for (const nodeEnv of [undefined, '', 'development', 'test']) {
      expect(() => {
        assertSeedAllowed(nodeEnv);
      }).not.toThrow();
    }
  });
});
