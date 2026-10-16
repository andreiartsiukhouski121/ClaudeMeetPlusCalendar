import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

import { LIMIT_MAX, LIMIT_MIN } from '../domain/limits.js';

/**
 * Query of `GET /meetings?limit=`.
 *
 * Invariant 2: **`@IsOptional()` is mandatory.** Without it, under `whitelist: true,
 * transform: true`, a missing field still runs through `@IsInt/@Min/@Max` and `GET /meetings`
 * **without the parameter** answers 400 — the dashboard would not load at all. Verified by probe
 * on `@nestjs/common@12.0.1` + `class-validator@0.15.1`; caught by `HD-API-10` step 2.
 *
 * The upper bound is 100, not 50: `limit=100` is used as "give me everything" in `HD-API-17` and
 * `SM-API-03`.
 *
 * The default (3) is supplied by `ListMeetings`, not the DTO: a DTO default does not survive
 * `plainToInstance` predictably.
 */
export class ListMeetingsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(LIMIT_MIN)
  @Max(LIMIT_MAX)
  limit?: number;
}
