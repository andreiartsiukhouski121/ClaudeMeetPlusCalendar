/** Does this owner own this meeting — one answer for an absent and a foreign meeting (`FACT-3381`). */
export interface MeetingAccess {
  ownsMeeting(ownerId: string, meetingId: string): Promise<boolean>;
}
