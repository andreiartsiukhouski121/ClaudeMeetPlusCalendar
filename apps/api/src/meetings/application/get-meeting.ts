import { MeetingNotFoundError } from '../domain/meeting.errors.js';
import type { Meeting } from '../domain/meeting.js';
import type { MeetingRepository } from './meeting.repository.js';

export interface GetMeetingQuery {
  ownerId: string;
  id: string;
}

/**
 * The one lookup behind `GET /meetings/:id` and behind `meeting-files`' ownership check, so the two
 * 404 situations stay byte-identical by construction (`ADR-0018`).
 */
export class GetMeeting {
  constructor(private readonly meetings: MeetingRepository) {}

  async execute(query: GetMeetingQuery): Promise<Meeting> {
    const meeting = await this.meetings.findOwnedById(query.ownerId, query.id);

    if (meeting === undefined) {
      throw new MeetingNotFoundError();
    }

    return meeting;
  }
}
