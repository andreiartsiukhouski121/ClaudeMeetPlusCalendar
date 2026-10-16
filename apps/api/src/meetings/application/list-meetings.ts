import { DEFAULT_MEETINGS_LIMIT } from '../domain/limits.js';
import type { Meeting } from '../domain/meeting.js';
import type { MeetingRepository } from './meeting.repository.js';

export interface ListMeetingsResult {
  items: Meeting[];
  /** Invariant 4: the owner's whole list, not `items.length`. */
  total: number;
}

export class ListMeetings {
  constructor(private readonly meetings: MeetingRepository) {}

  /** `limit` defaults to 3 here, not in the DTO. */
  async execute(
    ownerId: string,
    limit: number = DEFAULT_MEETINGS_LIMIT,
  ): Promise<ListMeetingsResult> {
    const [items, total] = await Promise.all([
      this.meetings.findRecentByOwner(ownerId, limit),
      this.meetings.countByOwner(ownerId),
    ]);

    return { items, total };
  }
}
