import { Injectable } from '@nestjs/common';

import { MeetingsService } from '../../meetings/meetings.service.js';
import type { MeetingAccess } from '../application/meeting-access.js';

/**
 * Ownership resolves through the existing `MeetingsService.findById`, so `ADR-0018`'s one-code-path
 * 404 is reused rather than re-derived: a stranger and a non-existent meeting are indistinguishable
 * (`FACT-2112`, `FACT-3704`).
 */
@Injectable()
export class MeetingsServiceAccess implements MeetingAccess {
  constructor(private readonly meetingsService: MeetingsService) {}

  async ownsMeeting(ownerId: string, meetingId: string): Promise<boolean> {
    return (await this.meetingsService.findById(ownerId, meetingId)) !== undefined;
  }
}
