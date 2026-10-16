import { Meeting } from '../domain/meeting.js';
import type { UuidSource } from '../../shared/application/uuid-source.js';
import type { MeetingRepository } from './meeting.repository.js';

/**
 * No `ownerId` field on purpose: invariant 5 takes the owner from the token, so it is a separate
 * argument of `execute`, never part of the request body (`HD-API-16`, `HD-API-17`).
 */
export interface CreateMeetingInput {
  title: string;
  startsAt: string;
  durationMinutes?: number;
  participants?: string[];
}

export class CreateMeeting {
  constructor(
    private readonly meetings: MeetingRepository,
    private readonly uuids: UuidSource,
  ) {}

  async execute(ownerId: string, input: CreateMeetingInput): Promise<Meeting> {
    const meeting = Meeting.create({
      ownerId,
      title: input.title,
      startsAt: input.startsAt,
      durationMinutes: input.durationMinutes,
      participants: input.participants,
      uuid: this.uuids.next(),
    });

    await this.meetings.save(meeting);

    return meeting;
  }
}
