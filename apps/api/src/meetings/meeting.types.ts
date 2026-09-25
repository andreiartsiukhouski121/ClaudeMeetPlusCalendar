/**
 * `startsAt` is an ISO 8601 string in UTC (`…Z`) rather than a `Date`: it survives JSON
 * serialization without surprises and compares stably in tests.
 */
export interface Meeting {
  id: string;
  ownerId: string;
  title: string;
  startsAt: string;
  durationMinutes: number;
}

/**
 * What goes out to the client. `toMeetingDto` strips `ownerId` — ownership is never exposed, which
 * `HD-API-01` checks against the element's key set.
 */
export type MeetingDto = Omit<Meeting, 'ownerId'>;

/** `GET /meetings` response: a slice of the list plus the owner's FULL meeting count. */
export interface MeetingsPageDto {
  /**
   * Invariant 4: the owner's whole list, not `items.length`. The classic mistake here, covered at
   * three levels: `HD-UT-03`, `HD-API-05`, `HD-FN-03`.
   */
  items: MeetingDto[];
  total: number;
}

/**
 * Input of `MeetingsService.create`. No `ownerId` field on purpose: invariant 5 takes the owner
 * from the token (`@CurrentUser()`), never from the request body (`HD-UT-07`, `HD-API-16`,
 * `HD-API-17`).
 */
export interface CreateMeetingInput {
  title: string;
  startsAt: string;
  durationMinutes?: number;
}
