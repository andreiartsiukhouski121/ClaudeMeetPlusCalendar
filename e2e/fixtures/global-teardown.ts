import { request, type FullConfig } from '@playwright/test';

import type { ApiOptions } from './api.js';
import { authHeaders, loginApi, loginPoolUser } from '../api/auth.api.js';
import {
  SEEDED_MEETING_FILE_COUNTS,
  SEED_USER_KEYS,
  SEED_USERS,
  type PoolUserKey,
} from './seed.js';

/**
 * `globalTeardown`: compares every seeded owner with its seed through the API and fails the run
 * listing every difference (`FACT-3781`). Tests clean up after themselves; this is the check that
 * they did, over data nothing else asserts: a leaked meeting on a pool user or a stray file on a
 * seeded meeting survives every green test otherwise.
 *
 * The api base URL comes from the `FullConfig` Playwright passes, the `web` project's `apiBaseURL`
 * option (suite rule 9). A throw here fails the run with both servers
 * still up (`FACT-3800`).
 */

const LIST_LIMIT = 100;

function poolSlot(key: PoolUserKey): number {
  return Number(key.slice('pool-'.length));
}

export default async function globalTeardown(config: FullConfig<ApiOptions>): Promise<void> {
  const apiURL = config.projects.find((project) => project.name === 'web')?.use.apiBaseURL;
  if (apiURL === undefined) {
    throw new Error(
      'global teardown (FACT-3781): the web project has no apiBaseURL in playwright.config.ts',
    );
  }

  const differences: string[] = [];
  const api = await request.newContext({ baseURL: apiURL });
  try {
    for (const key of SEED_USER_KEYS) {
      const token = key.startsWith('pool-')
        ? await loginPoolUser(api, poolSlot(key as PoolUserKey))
        : await loginApi(api, key);
      const response = await api.get(`/meetings?limit=${String(LIST_LIMIT)}`, {
        headers: authHeaders(token),
      });
      if (response.status() !== 200) {
        differences.push(`${key}: GET /meetings answered ${String(response.status())}`);
        continue;
      }
      const { total } = (await response.json()) as { total: number };
      const expected = SEED_USERS[key].meetingsCount;
      if (total !== expected) {
        differences.push(`${key}: ${String(total)} meetings, the seed has ${String(expected)}`);
      }
    }

    for (const { owner, meetingId, files } of SEEDED_MEETING_FILE_COUNTS) {
      const token = await loginApi(api, owner);
      const response = await api.get(`/meetings/${meetingId}/files`, {
        headers: authHeaders(token),
      });
      if (response.status() !== 200) {
        differences.push(`${meetingId}: GET files answered ${String(response.status())}`);
        continue;
      }
      const { items } = (await response.json()) as { items: unknown[] };
      if (items.length !== files) {
        differences.push(
          `${meetingId}: ${String(items.length)} files, the seed has ${String(files)}`,
        );
      }
    }
  } finally {
    await api.dispose();
  }

  if (differences.length > 0) {
    throw new Error(
      `global teardown (FACT-3781): ${String(differences.length)} difference(s) from the seed:\n` +
        differences.map((line) => `  - ${line}`).join('\n'),
    );
  }

  console.log(
    `global teardown (FACT-3781): ${String(SEED_USER_KEYS.length)} owners and ` +
      `${String(SEEDED_MEETING_FILE_COUNTS.length)} seeded meetings match the seed`,
  );
}
