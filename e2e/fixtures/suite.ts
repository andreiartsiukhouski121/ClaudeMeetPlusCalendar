import fs from 'node:fs';
import path from 'node:path';
import {
  request as playwrightRequest,
  type APIRequestContext,
  type Page,
  type TestInfo,
} from '@playwright/test';
import { authHeaders, loginPoolUser } from '../api/auth.api.js';
import { deleteAllMeetings, Tracker, type ClaimRecorder } from '../api/cleanup.api.js';
import { expect, requireApiBaseURL, test as apiTest, type ApiOptions } from './api.js';

/**
 * The one `test` every spec imports (`ADR-0036`, `ADR-0037`). It extends `api.ts`'s `test` with the
 * lease, the claim of a pool user, the session page and the two cleanup trackers, and exports the
 * result under the name `test`: a spec never aliases it or merges sets itself (suite rules 11, 12).
 *
 * The pool is a directory, `.e2e-pool/` at the repository root, emptied by global setup:
 * `claims/pool-NN/owner.json` is a claim, `state/pool-NN.json` a user's storage state. A claim is a
 * directory renamed onto its slot, which has exactly one winner (`FACT-3774`, `FACT-3801`).
 */

/** The pool's directory name; the root it sits in is the directory of `playwright.config.ts`. */
export const POOL_DIR_NAME = '.e2e-pool';

export function defaultPoolDir(config: { configFile?: string }): string {
  const root = config.configFile === undefined ? process.cwd() : path.dirname(config.configFile);
  return path.join(root, POOL_DIR_NAME);
}

/** Global setup: a run starts with no claim and no state, so state never outlives its run. */
export function emptyPool(poolDir: string): void {
  fs.rmSync(poolDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  fs.mkdirSync(path.join(poolDir, 'claims'), { recursive: true });
  fs.mkdirSync(path.join(poolDir, 'state'), { recursive: true });
}

const POOL_SIZE = 10;
const RETRY_EPERM_MS = 10;
const RETRY_EPERM_LIMIT_MS = 2000;
const SCAN_PAUSE_MS = 100;
const STATE_REBUILD_WITHIN_S = 120;
const DEFAULT_CLAIM_TIMEOUT_MS = 30_000;

/** `FACT-3756`: the cookie the application sets, as the suite builds it. */
export interface SessionCookie {
  name: 'ps_session';
  value: string;
  domain: string;
  path: '/';
  httpOnly: true;
  secure: false;
  sameSite: 'Lax';
  expires: number;
}

/**
 * The one builder of a browser session from an `accessToken`: the pool uses it for every state
 * file and `AL-FN-13` compares it with the cookie the application sets (`FACT-3757`), so the guard
 * tests the code the pool runs. The domain is the web base URL's host; the port is not part of it.
 */
export function buildSessionCookie(
  accessToken: string,
  webBaseURL: string,
  now: number = Date.now(),
): SessionCookie {
  return {
    name: 'ps_session',
    value: accessToken,
    domain: new URL(webBaseURL).hostname,
    path: '/',
    httpOnly: true,
    secure: false,
    sameSite: 'Lax',
    expires: Math.floor(now / 1000) + 3600,
  };
}

/** The record a claim is: who holds the slot and for which test (`FACT-3774`). */
export interface OwnerRecord {
  pid: number;
  workerIndex: number;
  testId: string;
  claimedAt: string;
}

/** One held pool user. `released` is set by a clean release and read by `trackAllOf`. */
export interface Claim {
  readonly slot: string;
  readonly number: number;
  /** The database user's id, `usr-pool-NN` (`FACT-3773`). */
  readonly userId: string;
  readonly email: string;
  /** The user's `accessToken`; the cookie in the state file carries the same value. */
  readonly token: string;
  readonly headers: Record<string, string>;
  /** `.e2e-pool/state/pool-NN.json`, a Playwright storage state holding the built cookie. */
  readonly storageStatePath: string;
  readonly poolDir: string;
  readonly testId: string;
  released: boolean;
}

export function slotName(slotNumber: number): string {
  return `pool-${String(slotNumber).padStart(2, '0')}`;
}

function claimsDir(poolDir: string): string {
  return path.join(poolDir, 'claims');
}

function slotDir(poolDir: string, slotNumber: number): string {
  return path.join(claimsDir(poolDir), slotName(slotNumber));
}

function statePath(poolDir: string, slotNumber: number): string {
  return path.join(poolDir, 'state', `${slotName(slotNumber)}.json`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let tmpCounter = 0;

function uniqueSuffix(): string {
  tmpCounter += 1;
  return `${String(process.pid)}-${String(tmpCounter)}`;
}

/** A directory holding a complete owner record, ready to be renamed onto a slot. */
function prepareRecordDir(poolDir: string, record: OwnerRecord): string {
  fs.mkdirSync(claimsDir(poolDir), { recursive: true });
  const dir = path.join(claimsDir(poolDir), `.tmp-${uniqueSuffix()}`);
  fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, 'owner.json'), JSON.stringify(record));
  return dir;
}

function removeQuietly(target: string): void {
  fs.rmSync(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
}

/** How long a rename onto a slot that does not exist yet is retried (`FX-054`). */
const TRANSIENT_RENAME_WINDOW_MS = 1_000;

/**
 * A rename onto a slot: `true` when this caller won it, `false` when the slot already exists.
 * `EPERM` is both a loser's code and Windows' code for a directory briefly held by an indexer or
 * an antivirus scan, so a failure means "taken" only while the destination exists; with no
 * destination it is transient and retried (`FX-054`). `rename` is a parameter for `SM-API-11`.
 */
export function renameOrFalse(
  from: string,
  to: string,
  rename: (from: string, to: string) => void = fs.renameSync,
): boolean {
  const started = Date.now();
  for (;;) {
    try {
      rename(from, to);
      return true;
    } catch {
      if (fs.existsSync(to) || Date.now() - started > TRANSIENT_RENAME_WINDOW_MS) {
        return false;
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
    }
  }
}

/** The record of a slot, `undefined` when the slot is being released or its record is unreadable. */
export function readOwner(poolDir: string, slotNumber: number): OwnerRecord | undefined {
  try {
    const parsed = JSON.parse(
      fs.readFileSync(path.join(slotDir(poolDir, slotNumber), 'owner.json'), 'utf8'),
    ) as Partial<OwnerRecord>;
    if (
      typeof parsed.pid !== 'number' ||
      typeof parsed.testId !== 'string' ||
      typeof parsed.workerIndex !== 'number' ||
      typeof parsed.claimedAt !== 'string'
    ) {
      return undefined;
    }
    return parsed as OwnerRecord;
  } catch {
    return undefined;
  }
}

function isLeaked(poolDir: string, slotNumber: number): boolean {
  return fs.existsSync(path.join(slotDir(poolDir, slotNumber), 'leaked.json'));
}

/** `process.kill(pid, 0)` throws `ESRCH` for a process that is gone (`FACT-3801`). */
function isDead(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return false;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'ESRCH';
  }
}

/**
 * Puts a slot's record in place by the claim's own primitive and reports whether it won. For a
 * scratch pool a case pre-occupies slots with it; the live pool never calls it directly.
 */
export function occupySlot(poolDir: string, slotNumber: number, record: OwnerRecord): boolean {
  const dir = prepareRecordDir(poolDir, record);
  const won = renameOrFalse(dir, slotDir(poolDir, slotNumber));
  if (!won) {
    removeQuietly(dir);
  }
  return won;
}

/** Frees a slot without reading its user: for a claim that held nothing yet, and for scratch setup. */
export function vacateSlot(poolDir: string, slotNumber: number): void {
  removeQuietly(slotDir(poolDir, slotNumber));
}

/** Renames the slot out of `pool-NN`, retrying while it fails with `EPERM`, then removes it. */
async function freeSlotDir(poolDir: string, slotNumber: number): Promise<void> {
  const from = slotDir(poolDir, slotNumber);
  const to = path.join(claimsDir(poolDir), `.released-${uniqueSuffix()}`);
  const started = Date.now();

  for (;;) {
    try {
      fs.renameSync(from, to);
      break;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'EPERM' || Date.now() - started > RETRY_EPERM_LIMIT_MS) {
        throw new Error(
          `${slotName(slotNumber)}: the release could not rename the claim out of its slot ` +
            `(${String(code)} for ${String(Date.now() - started)} ms)`,
        );
      }
      await sleep(RETRY_EPERM_MS);
    }
  }

  removeQuietly(to);
}

interface StoredState {
  cookies?: { name: string; value: string; expires: number }[];
}

/**
 * The user's storage state and token (`FACT-3778`): reused while its cookie has more than 120 s
 * left, otherwise built from one `POST /auth/login` and renamed into place.
 */
async function ensureState(
  poolDir: string,
  slotNumber: number,
  request: APIRequestContext,
  webBaseURL: string,
): Promise<string> {
  const file = statePath(poolDir, slotNumber);
  fs.mkdirSync(path.dirname(file), { recursive: true });

  try {
    const stored = JSON.parse(fs.readFileSync(file, 'utf8')) as StoredState;
    const cookie = stored.cookies?.find((candidate) => candidate.name === 'ps_session');
    if (cookie !== undefined && cookie.expires - Date.now() / 1000 > STATE_REBUILD_WITHIN_S) {
      return cookie.value;
    }
  } catch {
    // No state yet, or an unreadable one: it is rebuilt below.
  }

  const token = await loginPoolUser(request, slotNumber);
  const cookie = buildSessionCookie(token, webBaseURL);
  const temporary = `${file}.${uniqueSuffix()}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify({ cookies: [cookie], origins: [] }));
  fs.renameSync(temporary, file);
  return token;
}

export interface ClaimOptions {
  /** `.e2e-pool/` for a test's lease; a scratch directory for a case driving the pool itself. */
  poolDir: string;
  testId: string;
  workerIndex: number;
  /** How many users, taken all or none (`FACT-3775`). */
  count: number;
  /** An API context: the takeover purge and the state's login go through it. */
  request: APIRequestContext;
  webBaseURL: string;
  /** How long to wait for free users before failing; default 30 s. */
  timeoutMs?: number;
}

function describeHolders(poolDir: string): string {
  const holders: string[] = [];
  for (let n = 1; n <= POOL_SIZE; n += 1) {
    const record = readOwner(poolDir, n);
    holders.push(
      record === undefined
        ? `${slotName(n)} unreadable or free`
        : `${slotName(n)} test "${record.testId}" (pid ${String(record.pid)}${isLeaked(poolDir, n) ? ', leaked' : ''})`,
    );
  }
  return holders.join('; ');
}

/**
 * Takes over one slot whose holder is dead (`FACT-3777`): marks it with a directory of its own, re-reads
 * the record, purges the user and frees the slot only when the record still names the same dead
 * holder, and removes the marker after — or at once when the re-read names anything else.
 * Returns whether the slot was freed.
 */
async function takeOver(o: ClaimOptions, slotNumber: number): Promise<boolean> {
  const seen = readOwner(o.poolDir, slotNumber);
  if (seen === undefined || isLeaked(o.poolDir, slotNumber) || !isDead(seen.pid)) {
    return false;
  }

  const marker = `${slotDir(o.poolDir, slotNumber)}.takeover`;
  const own = prepareRecordDir(o.poolDir, {
    pid: process.pid,
    workerIndex: o.workerIndex,
    testId: o.testId,
    claimedAt: new Date().toISOString(),
  });

  if (!renameOrFalse(own, marker)) {
    removeQuietly(own);
    return false;
  }

  try {
    const again = readOwner(o.poolDir, slotNumber);
    const same =
      again !== undefined &&
      again.pid === seen.pid &&
      again.testId === seen.testId &&
      !isLeaked(o.poolDir, slotNumber);
    if (!same) {
      return false;
    }

    const token = await loginPoolUser(o.request, slotNumber);
    await deleteAllMeetings(o.request, token, `takeover of ${slotName(slotNumber)}`);
    await freeSlotDir(o.poolDir, slotNumber);
    return true;
  } finally {
    removeQuietly(marker);
  }
}

/**
 * Claims `count` users all-or-nothing. A free slot is taken by renaming a prepared record directory
 * onto it; with too few free, what was taken is given back and a dead holder's slot is taken over;
 * with none to take over the claimant pauses with jitter and scans again until its timeout, which
 * fails naming every holder's test.
 */
export async function claimUsers(o: ClaimOptions): Promise<Claim[]> {
  const deadline = Date.now() + (o.timeoutMs ?? DEFAULT_CLAIM_TIMEOUT_MS);
  fs.mkdirSync(claimsDir(o.poolDir), { recursive: true });

  for (;;) {
    const taken: number[] = [];
    for (let n = 1; n <= POOL_SIZE && taken.length < o.count; n += 1) {
      if (occupySlot(o.poolDir, n, newRecord(o))) {
        taken.push(n);
      }
    }

    if (taken.length === o.count) {
      return finishClaims(o, taken);
    }

    for (const n of taken) {
      vacateSlot(o.poolDir, n);
    }

    let freed = false;
    for (let n = 1; n <= POOL_SIZE && !freed; n += 1) {
      freed = await takeOver(o, n);
    }
    if (freed) {
      continue;
    }

    if (Date.now() >= deadline) {
      throw new Error(
        `test "${o.testId}" waited ${String(o.timeoutMs ?? DEFAULT_CLAIM_TIMEOUT_MS)} ms for ` +
          `${String(o.count)} free pool user(s). Holders: ${describeHolders(o.poolDir)}`,
      );
    }
    await sleep(SCAN_PAUSE_MS + Math.floor(Math.random() * SCAN_PAUSE_MS));
  }
}

function newRecord(o: ClaimOptions): OwnerRecord {
  return {
    pid: process.pid,
    workerIndex: o.workerIndex,
    testId: o.testId,
    claimedAt: new Date().toISOString(),
  };
}

async function finishClaims(o: ClaimOptions, slots: number[]): Promise<Claim[]> {
  try {
    const claims: Claim[] = [];
    for (const n of slots) {
      const token = await ensureState(o.poolDir, n, o.request, o.webBaseURL);
      claims.push({
        slot: slotName(n),
        number: n,
        userId: `usr-${slotName(n)}`,
        email: `${slotName(n)}@purpleschool.test`,
        token,
        headers: authHeaders(token),
        storageStatePath: statePath(o.poolDir, n),
        poolDir: o.poolDir,
        testId: o.testId,
        released: false,
      });
    }
    return claims;
  } catch (error) {
    for (const n of slots) {
      vacateSlot(o.poolDir, n);
    }
    throw error;
  }
}

/**
 * Releases claims (`FACT-3776`): first checks each still holds its own test id, before reading any
 * user; then reads each user's `total` through `GET /meetings?limit=1` on a request context opened
 * here and disposed here; deletes nothing. A user at 0 is renamed out of its slot and removed; one
 * above 0 fails the release naming the slot and the count and is marked leaked, which keeps the slot
 * out of the pool. Rejects with every failure.
 */
export async function releaseClaims(claims: Claim[], apiBaseURL: string): Promise<void> {
  const open = claims.filter((claim) => !claim.released);
  if (open.length === 0) {
    return;
  }

  const foreign = open.flatMap((claim) => {
    const record = readOwner(claim.poolDir, claim.number);
    return record?.testId === claim.testId
      ? []
      : [
          `${claim.slot} was claimed by test "${claim.testId}" but its record names ` +
            (record === undefined ? 'no holder' : `test "${record.testId}"`),
        ];
  });
  if (foreign.length > 0) {
    throw new Error(foreign.join('; '));
  }

  const failures: string[] = [];
  const context = await playwrightRequest.newContext({ baseURL: requireApiBaseURL(apiBaseURL) });
  const totals = new Map<Claim, number>();
  try {
    for (const claim of open) {
      const response = await context.get('/meetings?limit=1', { headers: claim.headers });
      if (response.status() === 200) {
        totals.set(claim, ((await response.json()) as { total: number }).total);
      } else {
        failures.push(
          `${claim.slot}: the release check GET /meetings answered ${String(response.status())}`,
        );
      }
    }
  } finally {
    await context.dispose();
  }

  for (const [claim, total] of totals) {
    if (total > 0) {
      fs.writeFileSync(
        path.join(slotDir(claim.poolDir, claim.number), 'leaked.json'),
        JSON.stringify({ testId: claim.testId, total, markedAt: new Date().toISOString() }),
      );
      failures.push(`${claim.slot} holds ${String(total)} meetings after the test's cleanup`);
      continue;
    }

    try {
      await freeSlotDir(claim.poolDir, claim.number);
      claim.released = true;
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (failures.length > 0) {
    throw new Error(failures.join('; '));
  }
}

/** A test's lease: what the test's claims, trackers and contexts hang off (`FACT-3776`). */
export interface Lease extends ClaimRecorder {
  readonly testId: string;
  readonly workerIndex: number;
  readonly poolDir: string;
  readonly apiBaseURL: string;
  readonly webBaseURL: string;
  /** Every claim the test holds; the release walks this list. */
  readonly claims: Claim[];
  /** Claim tokens a `trackAllOf` recorded: a purged row's 404 is accepted for them (`FACT-3810`). */
  readonly recordedTokens: Set<string>;
  /** Claims `count` users at once, all or none; the lease releases them. */
  acquire(count: number, request: APIRequestContext): Promise<Claim[]>;
}

function webBaseURLOf(testInfo: TestInfo): string {
  const web = testInfo.config.projects.find((project) => project.name === 'web');
  const url = web?.use.baseURL;
  if (url === undefined) {
    throw new Error("The pool needs the web project's baseURL in playwright.config.ts");
  }
  return url;
}

/** What a failing tracker teardown reports: the fixture throws what `run()` only recorded. */
async function settle(name: string, tracker: Tracker): Promise<void> {
  const unrun = tracker.pending;
  if (unrun.length > 0) {
    await tracker.run();
  }

  const problems = [
    ...(unrun.length > 0
      ? [
          `${name}: ${String(unrun.length)} registered row(s) were still undeleted when the test ` +
            `ended (deleted now by the fallback): ${unrun.join(', ')}`,
        ]
      : []),
    ...tracker.failures,
  ];
  if (problems.length > 0) {
    throw new Error(problems.join('\n'));
  }
}

interface SuiteFixtures {
  /** Empty: use the default `.e2e-pool/`. A scratch directory is a case's own choice. */
  poolDir: string;
  lease: Lease;
  claim: Claim;
  sessionPage: Page;
  cleanup: Tracker;
  preconditions: Tracker;
}

/*
 * Parameter order matters in the three overrides below: `lease` is named first, so it is set up
 * first and the wrapped built-in is disposed before the lease's release (`FACT-3776`, `FACT-3821`).
 * Never reorder them. `lease` is destructured and not read on purpose: Playwright derives the
 * dependency from the parameter list.
 */
export const test = apiTest.extend<SuiteFixtures>({
  poolDir: ['', { option: true }],

  lease: async ({ apiBaseURL, poolDir }, use, testInfo) => {
    const lease: Lease = {
      testId: testInfo.testId,
      workerIndex: testInfo.workerIndex,
      poolDir: poolDir === '' ? defaultPoolDir(testInfo.config) : poolDir,
      apiBaseURL,
      webBaseURL: webBaseURLOf(testInfo),
      claims: [],
      recordedTokens: new Set<string>(),
      async acquire(count, request) {
        const claims = await claimUsers({
          poolDir: lease.poolDir,
          testId: lease.testId,
          workerIndex: lease.workerIndex,
          count,
          request,
          webBaseURL: lease.webBaseURL,
          timeoutMs: Math.max(5000, Math.floor(testInfo.timeout * 0.8)),
        });
        lease.claims.push(...claims);
        return claims;
      },
    };

    await use(lease);

    await releaseClaims(lease.claims, apiBaseURL);
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  request: async ({ lease, request }, use) => use(request),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  apiRequest: async ({ lease, apiRequest }, use) => use(apiRequest),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  context: async ({ lease, context }, use) => use(context),

  claim: async ({ lease, apiRequest }, use) => {
    const [claim] = await lease.acquire(1, apiRequest);
    await use(claim);
  },

  sessionPage: async ({ browser, claim }, use, testInfo) => {
    const context = await browser.newContext({
      storageState: claim.storageStatePath,
      baseURL: webBaseURLOf(testInfo),
    });
    const page = await context.newPage();

    await use(page);

    await context.close();
  },

  cleanup: async ({ lease, apiRequest }, use) => {
    const tracker = new Tracker(apiRequest, lease);
    await use(tracker);
    await settle('cleanup', tracker);
  },

  preconditions: async ({ lease, apiRequest }, use) => {
    const tracker = new Tracker(apiRequest, lease);
    await use(tracker);
    await settle('preconditions', tracker);
  },
});

export { expect };
export type { ApiOptions };
