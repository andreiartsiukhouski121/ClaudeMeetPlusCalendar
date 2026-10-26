import type { FullConfig } from '@playwright/test';

import type { ApiOptions } from './api.js';
import { defaultPoolDir, emptyPool } from './suite.js';

/**
 * `globalSetup`: empties the user pool before any test, so claims and storage state live exactly
 * one run (`FACT-3779`); a second run in the same tree cannot reach this point while the first
 * holds the api port. There is no route warm-up: at 7 workers the `FX-052` signature did not
 * appear in 20 runs under load, so the warm-up stopped earning its cost (`ADR-0036`).
 */
export default async function globalSetup(config: FullConfig<ApiOptions>): Promise<void> {
  emptyPool(defaultPoolDir(config));
}
