import { Type } from 'class-transformer';
import { IsInt, IsISO8601, IsOptional, IsString, Length, Max, Min } from 'class-validator';

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
  @Length(3, 100)
  title: string;

  /** ISO 8601. The web layer normalizes the `<input type="datetime-local">` value itself. */
  @IsISO8601()
  startsAt: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(480)
  durationMinutes?: number;
}
