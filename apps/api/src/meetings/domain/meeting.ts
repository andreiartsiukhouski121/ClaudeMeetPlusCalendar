import { DEFAULT_DURATION_MINUTES } from './limits.js';

export interface CreateMeetingProps {
  ownerId: string;
  title: string;
  startsAt: string;
  durationMinutes?: number;
  participants?: string[];
  /** Passed in so the entity generates no randomness (`AR-API-19`). */
  uuid: string;
}

/**
 * `startsAt` is an ISO 8601 string in UTC (`…Z`) rather than a `Date`: it survives JSON
 * serialization without surprises and compares stably in tests.
 */
export interface StoredMeeting {
  id: string;
  ownerId: string;
  title: string;
  startsAt: string;
  durationMinutes: number;
  /** Free-form strings, never a relation to `User` (`ADR-0017`). */
  participants: string[];
}

/**
 * A stored meeting. The fields stay primitives, so the response shape is the entity minus
 * `ownerId`, which `toMeetingDto` drops (`HD-API-01`).
 */
export class Meeting {
  private constructor(
    readonly id: string,
    readonly ownerId: string,
    readonly title: string,
    readonly startsAt: string,
    readonly durationMinutes: number,
    readonly participants: string[],
  ) {}

  /**
   * The only creation path. Composes the id as `mtg-` plus the supplied uuid (`ADR-0031`),
   * normalizes `startsAt` to canonical UTC (a client may send an offset date while the contract
   * promises `…Z`), defaults an absent or `null` `durationMinutes` to 60 and an absent or `null`
   * `participants` to `[]`. Participants are never trimmed nor deduplicated (`FACT-3351`). Input
   * bounds are the DTO's, not re-checked here.
   */
  static create(props: CreateMeetingProps): Meeting {
    return new Meeting(
      `mtg-${props.uuid}`,
      props.ownerId,
      props.title,
      new Date(props.startsAt).toISOString(),
      props.durationMinutes ?? DEFAULT_DURATION_MINUTES,
      props.participants ?? [],
    );
  }

  /** Rebuilds a stored row with no validation, normalization or defaults. */
  static restore(stored: StoredMeeting): Meeting {
    return new Meeting(
      stored.id,
      stored.ownerId,
      stored.title,
      stored.startsAt,
      stored.durationMinutes,
      stored.participants,
    );
  }
}
