/**
 * Domain errors: what went wrong, never how HTTP reports it. They carry a literal `kind` and no
 * status code or HTTP text; `MeetingsErrorFilter` maps each `kind` to the response the contract
 * documents.
 */
export type MeetingErrorKind = 'meeting-not-found';

export abstract class MeetingError extends Error {
  abstract readonly kind: MeetingErrorKind;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** One error for an absent and a foreign meeting, so the two stay indistinguishable (`ADR-0018`). */
export class MeetingNotFoundError extends MeetingError {
  readonly kind = 'meeting-not-found';

  constructor() {
    super('the meeting does not exist or belongs to someone else');
  }
}
