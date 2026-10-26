import type { APIRequestContext } from '@playwright/test';
import { authHeaders } from './auth.api.js';
import { FILE_NOT_FOUND_BODY } from './meeting-files.api.js';
import { MEETING_NOT_FOUND_BODY, type ErrorBody } from './meetings.api.js';

/**
 * The cleanup tracker (`FACT-3780`).
 *
 * A tracker holds the rows a test created, deletes them in reverse registration order, accepts a
 * `404` only with the exact not-found body, and records what went wrong in `failures` instead of
 * throwing: `run()` is called from a `finally`, where a throw would replace the body's own error.
 * The fixtures in `e2e/fixtures/suite.ts` throw the recorded failures from their teardown, which
 * Playwright reports beside the body's error.
 */

/** What a tracker needs of a test's lease: the claim tokens a `trackAllOf` recorded (`FACT-3810`). */
export interface ClaimRecorder {
  readonly recordedTokens: Set<string>;
}

/** What `trackAllOf` needs of a held pool user. */
export interface HeldUser {
  readonly slot: string;
  readonly token: string;
  readonly released: boolean;
}

/** The largest page the route accepts (`FACT-2035`). */
const LIST_LIMIT_MAX = 100;

type Entry =
  | { kind: 'path'; path: string; token: string; tolerated: ErrorBody | null }
  | { kind: 'all'; claim: HeldUser };

function sameBody(actual: unknown, expected: ErrorBody): boolean {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

export class Tracker {
  /** Every problem `run()` met; read by the owning fixture's teardown, never thrown by `run()`. */
  readonly failures: string[] = [];

  private entries: Entry[] = [];

  constructor(
    private readonly request: APIRequestContext,
    private readonly lease: ClaimRecorder,
  ) {}

  /**
   * Registers a row for deletion. `as` is the token the row is deleted with, so one test can clean
   * rows of two owners. `tolerated` is the one 404 body the caller accepts because it may delete the
   * row itself; the tolerance of a purged collection is never set here (`FACT-3810`).
   */
  track(path: string, as: string, tolerated: ErrorBody | null = null): void {
    this.entries.push({ kind: 'path', path, token: as, tolerated });
  }

  /**
   * Registers every meeting of a held pool user. Records the claim on the lease at once, so every
   * tracker of the test accepts a purged row's 404 whichever was registered first.
   */
  trackAllOf(claim: HeldUser): void {
    this.lease.recordedTokens.add(claim.token);
    this.entries.push({ kind: 'all', claim });
  }

  /** What is registered and not yet deleted, for a failure message. */
  get pending(): string[] {
    return this.entries.map((entry) =>
      entry.kind === 'path' ? `DELETE ${entry.path}` : `every meeting of ${entry.claim.slot}`,
    );
  }

  /** Deletes in reverse registration order, empties itself, records failures, never throws. */
  async run(): Promise<void> {
    const entries = this.entries.splice(0).reverse();

    for (const entry of entries) {
      try {
        if (entry.kind === 'path') {
          await this.deletePath(entry);
        } else {
          await this.deleteAllOf(entry.claim);
        }
      } catch (error) {
        this.failures.push(error instanceof Error ? error.message : String(error));
      }
    }
  }

  private async deletePath(entry: Extract<Entry, { kind: 'path' }>): Promise<void> {
    const response = await this.request.delete(entry.path, { headers: authHeaders(entry.token) });
    const status = response.status();

    if (status === 204) {
      return;
    }

    const text = await response.text();
    if (status === 404) {
      let body: unknown;
      try {
        body = JSON.parse(text);
      } catch {
        body = undefined;
      }

      if (entry.tolerated !== null && sameBody(body, entry.tolerated)) {
        return;
      }

      const purgeable = this.lease.recordedTokens.has(entry.token);
      if (
        purgeable &&
        (sameBody(body, MEETING_NOT_FOUND_BODY) || sameBody(body, FILE_NOT_FOUND_BODY))
      ) {
        return;
      }
    }

    throw new Error(
      `cleanup DELETE ${entry.path} must answer 204 or a tolerated 404 with the exact contract ` +
        `body; got ${String(status)} ${text}`,
    );
  }

  private async deleteAllOf(claim: HeldUser): Promise<void> {
    if (claim.released) {
      throw new Error(
        `trackAllOf(${claim.slot}): the claim was already released, so nothing was deleted; ` +
          'its next holder owns that user now',
      );
    }

    await deleteAllMeetings(this.request, claim.token, `trackAllOf(${claim.slot})`);
  }
}

/**
 * Deletes every meeting of `token`'s owner: `GET /meetings?limit=100`, then `DELETE` each, until
 * `total` is 0 (`FACT-3810`). 204 only — a held user's meetings cannot vanish under it. Shared by
 * `trackAllOf` and the pool's takeover purge (`FACT-3777`); `label` names the caller in a failure.
 */
export async function deleteAllMeetings(
  request: APIRequestContext,
  token: string,
  label: string,
): Promise<void> {
  const headers = authHeaders(token);

  for (;;) {
    const listing = await request.get(`/meetings?limit=${String(LIST_LIMIT_MAX)}`, { headers });
    if (listing.status() !== 200) {
      throw new Error(
        `${label}: GET /meetings answered ${String(listing.status())} ${await listing.text()}`,
      );
    }

    const page = (await listing.json()) as { items: { id: string }[]; total: number };
    if (page.total === 0) {
      return;
    }
    if (page.items.length === 0) {
      throw new Error(`${label}: total is ${String(page.total)} but the page lists no meeting`);
    }

    for (const { id } of page.items) {
      const response = await request.delete(`/meetings/${id}`, { headers });
      if (response.status() !== 204) {
        throw new Error(
          `${label}: DELETE /meetings/${id} must answer 204; got ${String(response.status())} ` +
            (await response.text()),
        );
      }
    }
  }
}
