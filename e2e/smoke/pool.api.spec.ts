import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { authHeaders, loginApi } from '../api/auth.api.js';
import { Tracker } from '../api/cleanup.api.js';
import { createMeeting, fetchMeetingsPage, MEETING_NOT_FOUND_BODY } from '../api/meetings.api.js';
import { FUTURE_STARTS_AT_ISO } from '../fixtures/seed.js';
import {
  claimUsers,
  expect,
  occupySlot,
  readOwner,
  releaseClaims,
  renameOrFalse,
  slotName,
  test,
  vacateSlot,
  type Claim,
  type Lease,
  type OwnerRecord,
} from '../fixtures/suite.js';

import type { APIRequestContext } from '@playwright/test';

/**
 * The pool's promises, each provoked on purpose (`ADR-0037`). Every case drives a SCRATCH pool
 * directory under the test's own output path, never `.e2e-pool/`, which the live run is claiming
 * from at the same time. A scratch slot `pool-NN` is still the database user `usr-pool-NN`, so a
 * case that lets the scratch pool read or delete a user's data first holds that user in the live
 * pool and pre-occupies every other scratch slot.
 *
 * Cases live in the paired `pool.api.cases.md`.
 */

const POOL_SIZE = 10;
const CLAIM_TIMEOUT_MS = 20_000;

/** One finished scratch claim: who won which slots and what their records said at that moment. */
interface Resolution {
  testId: string;
  claims: Claim[];
  slots: string[];
  owners: (OwnerRecord | undefined)[];
}

/** What a set of concurrent scratch claims has done so far. */
interface Race {
  resolved: Resolution[];
  failures: string[];
  promises: Promise<void>[];
  /** Slot name to the test id of the claim holding it now; a second holder is a collision. */
  holders: Map<string, { testId: string; number: number }>;
  collisions: string[];
}

function newRace(): Race {
  return { resolved: [], failures: [], promises: [], holders: new Map(), collisions: [] };
}

interface ScratchClaim {
  poolDir: string;
  testId: string;
  count: number;
  request: APIRequestContext;
  lease: Lease;
}

function claimOptions(c: ScratchClaim) {
  return {
    poolDir: c.poolDir,
    testId: c.testId,
    workerIndex: c.lease.workerIndex,
    count: c.count,
    request: c.request,
    webBaseURL: c.lease.webBaseURL,
    timeoutMs: CLAIM_TIMEOUT_MS,
  };
}

/** Starts a scratch claim and records its outcome in `race`; never rejects, so none goes unhandled. */
function startClaim(race: Race, c: ScratchClaim): void {
  race.promises.push(
    claimUsers(claimOptions(c)).then(
      (claims) => {
        for (const claim of claims) {
          if (race.holders.has(claim.slot)) {
            race.collisions.push(
              `${claim.slot} resolved for both "${race.holders.get(claim.slot)?.testId ?? '?'}" ` +
                `and "${c.testId}"`,
            );
          }
          race.holders.set(claim.slot, { testId: c.testId, number: claim.number });
        }
        race.resolved.push({
          testId: c.testId,
          claims,
          slots: claims.map((claim) => claim.slot),
          owners: claims.map((claim) => readOwner(c.poolDir, claim.number)),
        });
      },
      (error: unknown) => {
        race.failures.push(
          `claim "${c.testId}" failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      },
    ),
  );
}

/** Waits until `count` claims have settled, then fails with the reason of any that failed. */
async function waitForSettled(race: Race, count: number): Promise<void> {
  await expect
    .poll(() => race.resolved.length + race.failures.length, { timeout: 15_000 })
    .toBeGreaterThanOrEqual(count);
  expect(race.failures, 'a scratch claim failed instead of resolving').toEqual([]);
}

/** Frees the oldest-held slot of a race by removing its directory, as a finished holder would. */
function freeOldestHolder(race: Race, poolDir: string): void {
  const [slot, holder] = [...race.holders.entries()][0];
  vacateSlot(poolDir, holder.number);
  race.holders.delete(slot);
}

/** A rename that throws `EPERM` once, as Windows does on a briefly held directory, then renames. */
function failsOnceWithEperm(): (from: string, to: string) => void {
  let failed = false;
  return (from, to) => {
    if (!failed) {
      failed = true;
      throw Object.assign(new Error('EPERM: operation not permitted, rename'), { code: 'EPERM' });
    }
    fs.renameSync(from, to);
  };
}

/** Pre-occupies every scratch slot except `free` with a record naming this live process. */
function occupyAllExcept(poolDir: string, free: number[], lease: Lease): void {
  for (let n = 1; n <= POOL_SIZE; n += 1) {
    if (!free.includes(n)) {
      const won = occupySlot(poolDir, n, {
        pid: process.pid,
        workerIndex: lease.workerIndex,
        testId: 'scratch-live-holder',
        claimedAt: new Date().toISOString(),
      });
      expect(won, `the scratch slot ${slotName(n)} was already taken`).toBe(true);
    }
  }
}

function slotPath(poolDir: string, number: number): string {
  return path.join(poolDir, 'claims', slotName(number));
}

function claimsEntries(poolDir: string): string[] {
  return fs.readdirSync(path.join(poolDir, 'claims'));
}

/** The pid of a child that has started and exited: a holder that is certainly dead. */
function deadPid(): number {
  const child = spawnSync(process.execPath, ['-e', '']);
  expect(child.pid, 'the child process did not start').toBeGreaterThan(0);
  return child.pid;
}

/** The message a release rejects with, or a sentinel when it did not reject. */
async function releaseFailure(claims: Claim[], apiBaseURL: string): Promise<string> {
  return releaseClaims(claims, apiBaseURL).then(
    () => 'the release succeeded',
    (error: unknown) => (error instanceof Error ? error.message : String(error)),
  );
}

/** A window in which something must NOT happen: polled on elapsed time, not slept. */
async function letItScan(ms: number): Promise<void> {
  const from = Date.now();
  await expect
    .poll(() => Date.now() - from, { timeout: ms + 5000, intervals: [100] })
    .toBeGreaterThanOrEqual(ms);
}

function meetingData(title: string): { title: string; startsAt: string } {
  return { title, startsAt: FUTURE_STARTS_AT_ISO };
}

/** Lists every `DELETE` a request context is asked to send, and forwards it unchanged. */
function recordingDeletes(request: APIRequestContext, sent: string[]): APIRequestContext {
  return new Proxy(request, {
    get(target, property) {
      const value: unknown = Reflect.get(target, property, target);
      if (property === 'delete') {
        return (url: string, options?: Parameters<APIRequestContext['delete']>[1]) => {
          sent.push(url);
          return target.delete(url, options);
        };
      }
      return typeof value === 'function'
        ? (value as (...args: unknown[]) => unknown).bind(target)
        : value;
    },
  });
}

test.describe('Smoke: the user pool and the cleanup trackers', { tag: '@smoke' }, () => {
  test(
    'SM-API-04 — concurrent claims give each slot exactly one holder',
    { tag: '@p0' },
    async ({ lease, apiRequest, cleanup }, testInfo) => {
      try {
        const poolDir = testInfo.outputPath('scratch-pool');
        occupyAllExcept(poolDir, [8, 9, 10], lease);

        const race = newRace();
        for (let i = 1; i <= POOL_SIZE; i += 1) {
          startClaim(race, {
            poolDir,
            testId: `sm04-claim-${String(i)}`,
            count: 1,
            request: apiRequest,
            lease,
          });
        }

        await waitForSettled(race, 3);
        expect(
          race.resolved,
          'exactly three claims resolve while three slots are free',
        ).toHaveLength(3);
        expect(
          race.resolved.flatMap((resolution) => resolution.slots).sort(),
          'the three winners hold three different slots, the three free ones',
        ).toEqual([slotName(8), slotName(9), slotName(10)]);

        for (let round = 0; round < POOL_SIZE - 3; round += 1) {
          freeOldestHolder(race, poolDir);
          await waitForSettled(race, 4 + round);
        }
        await Promise.all(race.promises);

        expect(race.collisions, 'no slot is ever held by two claims at once').toEqual([]);
        expect(race.resolved, 'every claim eventually resolves').toHaveLength(POOL_SIZE);
        for (const resolution of race.resolved) {
          // `readOwner` returns a record only when pid, workerIndex, testId and claimedAt are all
          // present and typed, so the winner's own test id is the whole remaining check.
          expect(
            resolution.owners[0]?.testId,
            `claim "${resolution.testId}" resolved without its own complete record (FACT-3774)`,
          ).toBe(resolution.testId);
        }
        expect(
          claimsEntries(poolDir).filter((entry) => entry.startsWith('.tmp-')),
          'a winner leaves no .tmp-* directory behind',
        ).toEqual([]);
      } finally {
        await cleanup.run();
      }
    },
  );

  test('SM-API-05 — a two-user claim holds both users or neither', async ({
    lease,
    apiRequest,
    cleanup,
  }, testInfo) => {
    try {
      const poolDir = testInfo.outputPath('scratch-pool');
      occupyAllExcept(poolDir, [9, 10], lease);

      const race = newRace();
      for (const testId of ['sm05-first', 'sm05-second']) {
        startClaim(race, { poolDir, testId, count: 2, request: apiRequest, lease });
      }

      await waitForSettled(race, 1);
      expect(race.resolved, 'the second claim is still pending').toHaveLength(1);
      const [first] = race.resolved;
      expect(first.slots.slice().sort(), 'the first claim holds both free slots').toEqual([
        slotName(9),
        slotName(10),
      ]);
      expect(
        first.owners.map((owner) => owner?.testId),
        'both records name the first claim',
      ).toEqual([first.testId, first.testId]);

      freeOldestHolder(race, poolDir);
      freeOldestHolder(race, poolDir);
      await waitForSettled(race, 2);
      await Promise.all(race.promises);

      const second = race.resolved[1];
      expect(second.testId).not.toBe(first.testId);
      expect(second.slots.slice().sort(), 'the second claim holds both, never one').toEqual([
        slotName(9),
        slotName(10),
      ]);
      expect(race.collisions).toEqual([]);
    } finally {
      await cleanup.run();
    }
  });

  test('SM-API-06 — the release refuses a claim that names another test', async ({
    lease,
    apiRequest,
    cleanup,
  }, testInfo) => {
    try {
      const poolDir = testInfo.outputPath('scratch-pool');
      occupyAllExcept(poolDir, [10], lease);

      const [held] = await claimUsers(
        claimOptions({ poolDir, testId: 'sm06-claimant', count: 1, request: apiRequest, lease }),
      );
      const record = readOwner(poolDir, held.number) as OwnerRecord;
      fs.writeFileSync(
        path.join(slotPath(poolDir, held.number), 'owner.json'),
        JSON.stringify({ ...record, testId: 'sm06-other-test' }),
      );

      // A token the API refuses: if the release read the user before checking the record, its
      // message would carry the failed read, not only the two test ids.
      const failure = await releaseFailure(
        [{ ...held, token: 'refused', headers: authHeaders('refused') }],
        lease.apiBaseURL,
      );

      expect(failure, 'the release names the claiming test').toContain('sm06-claimant');
      expect(failure, 'the release names the test the record names').toContain('sm06-other-test');
      expect(failure, 'the release reads no user before the record check').not.toContain(
        'GET /meetings',
      );
      expect(fs.existsSync(slotPath(poolDir, held.number)), 'the slot is still in place').toBe(
        true,
      );
    } finally {
      await cleanup.run();
    }
  });

  test(
    'SM-API-07 — a clean release frees the slot; a dirty one marks it leaked',
    { tag: ['@p0', '@mutating'] },
    async ({ lease, claim, apiRequest, cleanup }, testInfo) => {
      try {
        cleanup.trackAllOf(claim);
        const poolDir = testInfo.outputPath('scratch-pool');
        occupyAllExcept(poolDir, [claim.number], lease);
        const options = { poolDir, count: 1, request: apiRequest, lease };

        const [clean] = await claimUsers(claimOptions({ ...options, testId: 'sm07-clean' }));
        expect(clean.slot, 'the only free scratch slot is the held user').toBe(claim.slot);
        await releaseClaims([clean], lease.apiBaseURL);
        expect(
          fs.existsSync(slotPath(poolDir, claim.number)),
          'a clean release frees the slot',
        ).toBe(false);
        expect(
          claimsEntries(poolDir).filter((entry) => entry.startsWith('.released-')),
          'a clean release leaves no .released-* directory',
        ).toEqual([]);

        const [dirty] = await claimUsers(claimOptions({ ...options, testId: 'sm07-dirty' }));
        await createMeeting(apiRequest, claim.token, meetingData('SM-API-07 leaked row'), cleanup);
        const failure = await releaseFailure([dirty], lease.apiBaseURL);

        expect(failure).toBe(`${claim.slot} holds 1 meetings after the test's cleanup`);
        expect(
          (await fetchMeetingsPage(apiRequest, claim.token)).total,
          'the release deletes nothing',
        ).toBe(1);
        expect(
          fs.existsSync(path.join(slotPath(poolDir, claim.number), 'leaked.json')),
          'a dirty release marks the slot leaked',
        ).toBe(true);
        expect(
          fs.existsSync(slotPath(poolDir, claim.number)),
          'a dirty release leaves the slot in place',
        ).toBe(true);
      } finally {
        await cleanup.run();
      }
    },
  );

  test(
    'SM-API-08 — a takeover purges a dead holder’s user, and only that user',
    { tag: ['@p0', '@mutating'] },
    async ({ lease, apiRequest, cleanup }, testInfo) => {
      try {
        const [held, bystander] = await lease.acquire(2, apiRequest);
        cleanup.trackAllOf(held);
        cleanup.trackAllOf(bystander);
        await createMeeting(apiRequest, held.token, meetingData('SM-API-08 first'), cleanup);
        await createMeeting(apiRequest, held.token, meetingData('SM-API-08 second'), cleanup);

        const poolDir = testInfo.outputPath('scratch-pool');
        occupyAllExcept(poolDir, [held.number, bystander.number], lease);
        const dead = deadPid();
        occupySlot(poolDir, held.number, {
          pid: dead,
          workerIndex: 0,
          testId: 'sm08-dead-holder',
          claimedAt: new Date().toISOString(),
        });
        occupySlot(poolDir, bystander.number, {
          pid: dead,
          workerIndex: 0,
          testId: 'sm08-dead-leaked-holder',
          claimedAt: new Date().toISOString(),
        });
        const leakedFile = path.join(slotPath(poolDir, bystander.number), 'leaked.json');
        fs.writeFileSync(
          leakedFile,
          JSON.stringify({ testId: 'sm08-dead-leaked-holder', total: 1, markedAt: 'earlier' }),
        );
        const heldRecord = readOwner(poolDir, held.number);
        const bystanderRecord = readOwner(poolDir, bystander.number);
        const leakedText = fs.readFileSync(leakedFile, 'utf8');

        // Another claimant's marker, non-empty so a rename onto it fails on every platform.
        const marker = `${slotPath(poolDir, held.number)}.takeover`;
        fs.mkdirSync(marker);
        fs.writeFileSync(path.join(marker, 'owner.json'), '{}');

        const race = newRace();
        startClaim(race, {
          poolDir,
          testId: 'sm08-claimant',
          count: 1,
          request: apiRequest,
          lease,
        });
        await letItScan(1500);

        expect(race.failures, 'the claim failed instead of waiting').toEqual([]);
        expect(race.resolved, 'while the marker exists the claim takes nothing').toEqual([]);
        expect((await fetchMeetingsPage(apiRequest, held.token)).total).toBe(2);
        expect(readOwner(poolDir, held.number)).toEqual(heldRecord);
        expect(readOwner(poolDir, bystander.number)).toEqual(bystanderRecord);

        fs.rmSync(marker, { recursive: true, force: true });
        await waitForSettled(race, 1);

        expect(race.resolved[0].slots, 'the claim takes over the dead holder’s slot').toEqual([
          held.slot,
        ]);
        expect(
          (await fetchMeetingsPage(apiRequest, held.token)).total,
          'the takeover purged the dead holder’s user',
        ).toBe(0);
        expect(readOwner(poolDir, held.number)).toMatchObject({
          pid: process.pid,
          testId: 'sm08-claimant',
        });
        expect(fs.existsSync(marker), 'no takeover marker remains').toBe(false);
        expect(readOwner(poolDir, bystander.number), 'a leaked slot is never taken over').toEqual(
          bystanderRecord,
        );
        expect(fs.readFileSync(leakedFile, 'utf8')).toBe(leakedText);

        await releaseClaims(race.resolved[0].claims, lease.apiBaseURL);
        expect(fs.existsSync(slotPath(poolDir, held.number)), 'the release frees the slot').toBe(
          false,
        );
      } finally {
        await cleanup.run();
      }
    },
  );

  test(
    'SM-API-09 — trackAllOf tolerates its own purge, and no other 404',
    { tag: '@mutating' },
    async ({ lease, claim, apiRequest, cleanup }, testInfo) => {
      try {
        const planner = await loginApi(apiRequest, 'planner');
        const a = new Tracker(apiRequest, lease);
        const b = new Tracker(apiRequest, lease);

        await createMeeting(apiRequest, claim.token, meetingData('SM-API-09 first'), b);
        await createMeeting(apiRequest, claim.token, meetingData('SM-API-09 second'), a);
        a.trackAllOf(claim);
        await a.run();
        await b.run();

        expect((await fetchMeetingsPage(apiRequest, claim.token)).total).toBe(0);
        expect(a.failures, 'the purged row of A is tolerated').toEqual([]);
        expect(b.failures, 'the purged row of B is tolerated').toEqual([]);

        // A planner row deleted directly: its 404 is not a held claim's, so it is a failure.
        const created = await apiRequest.post('/meetings', {
          headers: authHeaders(planner),
          data: meetingData('SM-API-09 planner'),
        });
        expect(created.status()).toBe(201);
        const plannerPath = `/meetings/${((await created.json()) as { id: string }).id}`;
        cleanup.track(plannerPath, planner, MEETING_NOT_FOUND_BODY);
        const direct = await apiRequest.delete(plannerPath, { headers: authHeaders(planner) });
        expect(direct.status()).toBe(204);

        const third = new Tracker(apiRequest, lease);
        third.track(plannerPath, planner);
        await third.run();
        expect(third.failures, 'a planner 404 is not tolerated').toHaveLength(1);
        expect(third.failures[0]).toContain(plannerPath);

        // A claim already released: its trackAllOf deletes nothing and says why.
        const poolDir = testInfo.outputPath('scratch-pool');
        occupyAllExcept(poolDir, [claim.number], lease);
        const [scratch] = await claimUsers(
          claimOptions({ poolDir, testId: 'sm09-scratch', count: 1, request: apiRequest, lease }),
        );
        await releaseClaims([scratch], lease.apiBaseURL);
        await createMeeting(apiRequest, claim.token, meetingData('SM-API-09 third'), cleanup);

        const fourth = new Tracker(apiRequest, lease);
        fourth.trackAllOf(scratch);
        await fourth.run();
        expect(
          (await fetchMeetingsPage(apiRequest, claim.token)).total,
          'a released claim’s trackAllOf deletes nothing',
        ).toBe(1);
        expect(fourth.failures).toHaveLength(1);
        expect(fourth.failures[0]).toContain(claim.slot);
      } finally {
        await cleanup.run();
      }
    },
  );

  test(
    'SM-API-10 — a tracker’s run() deletes in reverse, records, never throws',
    { tag: '@mutating' },
    async ({ lease, apiRequest, cleanup }) => {
      try {
        const planner = await loginApi(apiRequest, 'planner');
        const sent: string[] = [];
        const tracker = new Tracker(recordingDeletes(apiRequest, sent), lease);

        const meeting = await createMeeting(
          apiRequest,
          planner,
          meetingData('SM-API-10 meeting'),
          tracker,
        );
        const upload = await apiRequest.post(`/meetings/${meeting.id}/files`, {
          headers: authHeaders(planner),
          multipart: { file: { name: 'a.txt', mimeType: 'text/plain', buffer: Buffer.from('x') } },
        });
        expect(upload.status()).toBe(201);
        const filePath = `/meetings/${meeting.id}/files/${((await upload.json()) as { id: string }).id}`;
        tracker.track(filePath, planner);
        tracker.track('/meetings/a/b', planner);

        await expect(
          tracker.run(),
          'run() resolves rather than rejecting',
        ).resolves.toBeUndefined();

        expect(sent, 'deleted in reverse registration order').toEqual([
          '/meetings/a/b',
          filePath,
          `/meetings/${meeting.id}`,
        ]);
        expect(tracker.failures, 'only the unrouted entry is a failure').toHaveLength(1);
        expect(tracker.failures[0]).toContain('/meetings/a/b');
        expect(tracker.failures[0]).toContain('Cannot DELETE');
        const gone = await apiRequest.get(`/meetings/${meeting.id}/files`, {
          headers: authHeaders(planner),
        });
        expect(gone.status(), 'the meeting and its file are deleted').toBe(404);

        await tracker.run();
        expect(sent, 'the second run() sends no request').toHaveLength(3);
        expect(tracker.failures, 'the second run() records nothing new').toHaveLength(1);
      } finally {
        await cleanup.run();
      }
    },
  );

  test('SM-API-11 — a transient rename failure onto a free slot is not "taken"', async ({
    cleanup,
  }, testInfo) => {
    try {
      const root = testInfo.outputPath('rename');
      const record = path.join(root, 'record');
      const slot = path.join(root, 'pool-01');
      fs.mkdirSync(record, { recursive: true });

      const flaky = failsOnceWithEperm();
      expect(renameOrFalse(record, slot, flaky), 'a free slot is won after one EPERM').toBe(true);
      expect(fs.existsSync(slot)).toBe(true);

      const second = path.join(root, 'second');
      fs.mkdirSync(second);
      const started = Date.now();
      expect(renameOrFalse(second, slot), 'an existing slot is taken').toBe(false);
      expect(Date.now() - started, 'a taken slot is not retried').toBeLessThan(500);
    } finally {
      await cleanup.run();
    }
  });
});
