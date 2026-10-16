import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

import {
  DURATION_MAX_MINUTES,
  DURATION_MIN_MINUTES,
  PARTICIPANT_MAX_LENGTH,
  PARTICIPANT_MIN_LENGTH,
  PARTICIPANTS_MAX_COUNT,
  TITLE_MAX_LENGTH,
  TITLE_MIN_LENGTH,
} from '../domain/limits.js';

/**
 * Body of `POST /meetings`.
 *
 * There is **no** `ownerId` field, and that is part of the protection: the owner comes from the
 * token, and `forbidNonWhitelisted` rejects any attempt to send one with
 * `400 property ownerId should not exist` (`HD-API-16`, `HD-API-17`).
 *
 * Invariant 2: `durationMinutes` **must** carry `@IsOptional()`. Without it a `POST /meetings`
 * omitting the field answers 400 — which is exactly how `createMeetingAction` and the "New
 * meeting" form send it, so the button would not work at all. Caught by `HD-API-20`.
 */
export class CreateMeetingDto {
  @IsString()
  @Length(TITLE_MIN_LENGTH, TITLE_MAX_LENGTH)
  title: string;

  /** ISO 8601. The web layer normalizes the `<input type="datetime-local">` value itself. */
  @IsISO8601()
  startsAt: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(DURATION_MIN_MINUTES)
  @Max(DURATION_MAX_MINUTES)
  durationMinutes?: number;

  /**
   * Free-form strings — a name or an email, never a `User.id` (`ADR-0017`). Optional, at most 20
   * entries, each 1-100 characters. `@IsOptional()` is not optional here either: invariant 2 holds
   * for arrays exactly as it does for `durationMinutes`.
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(PARTICIPANTS_MAX_COUNT)
  @IsString({ each: true })
  @Length(PARTICIPANT_MIN_LENGTH, PARTICIPANT_MAX_LENGTH, { each: true })
  participants?: string[];
}
