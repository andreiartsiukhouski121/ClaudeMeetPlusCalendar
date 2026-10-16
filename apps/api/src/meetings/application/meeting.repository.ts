import type { Meeting } from '../domain/meeting.js';

/** What the use cases need from storage, in domain types. */
export interface MeetingRepository {
  /** Newest first, `id` ascending as the tie-break (invariant 7). */
  findRecentByOwner(ownerId: string, limit: number): Promise<Meeting[]>;

  /** The owner's full count, never the length of a cut slice (invariant 4). */
  countByOwner(ownerId: string): Promise<number>;

  /** `undefined` for an absent and a foreign meeting alike, one code path (`ADR-0018`). */
  findOwnedById(ownerId: string, id: string): Promise<Meeting | undefined>;

  save(meeting: Meeting): Promise<void>;
}
