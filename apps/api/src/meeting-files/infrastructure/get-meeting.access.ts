import { Injectable } from '@nestjs/common';

import { GetMeeting } from '../../meetings/application/get-meeting.js';
import { MeetingNotFoundError } from '../../meetings/domain/meeting.errors.js';
import type { MeetingAccess } from '../application/meeting-access.js';

/**
 * Ownership resolves through `meetings`' exported `GetMeeting`, so `ADR-0018`'s one-code-path 404 is
 * reused rather than re-derived: a stranger and a non-existent meeting are indistinguishable
 * (`FACT-2124`). Only `MeetingNotFoundError` means "no"; any other failure is a fault, not an
 * answer, and propagates instead of turning into a 404.
 */
@Injectable()
export class GetMeetingAccess implements MeetingAccess {
  constructor(private readonly getMeeting: GetMeeting) {}

  async ownsMeeting(ownerId: string, meetingId: string): Promise<boolean> {
    try {
      await this.getMeeting.execute({ ownerId, id: meetingId });

      return true;
    } catch (error) {
      if (error instanceof MeetingNotFoundError) {
        return false;
      }

      throw error;
    }
  }
}
