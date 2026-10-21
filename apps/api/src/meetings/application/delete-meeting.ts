import { MeetingNotFoundError } from '../domain/meeting.errors.js';
import type { MeetingRepository } from './meeting.repository.js';

export interface DeleteMeetingCommand {
  ownerId: string;
  id: string;
}

/**
 * One owner-scoped delete: an absent, a foreign and an already-deleted meeting are the same `false`
 * and the same 404 (`ADR-0018`). The meeting's files go with it through the schema's cascade, so
 * this module never touches the file table.
 */
export class DeleteMeeting {
  constructor(private readonly meetings: MeetingRepository) {}

  async execute(command: DeleteMeetingCommand): Promise<void> {
    if (!(await this.meetings.deleteOwned(command.ownerId, command.id))) {
      throw new MeetingNotFoundError();
    }
  }
}
