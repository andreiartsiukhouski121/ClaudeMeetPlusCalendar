import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CreateMeetingDto } from './dto/create-meeting.dto.js';
import { ListMeetingsQueryDto } from './dto/list-meetings-query.dto.js';
import type { MeetingDto, MeetingsPageDto } from './meeting.types.js';
import { toMeetingDto } from './meetings.mapper.js';
import { MeetingsService } from './meetings.service.js';

/**
 * The guard is attached to the **whole class**: registering it globally would break the public
 * `GET /` and `POST /auth/login`. `HD-API-02` and `HD-API-14` check that it really covers the
 * controller.
 *
 * Invariant 5: `ownerId` always comes from `@CurrentUser()` — the signed token — and never from
 * the body or the query.
 */
@Controller('meetings')
@UseGuards(JwtAuthGuard)
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Get()
  list(
    @CurrentUser() current: AuthenticatedUser,
    @Query() query: ListMeetingsQueryDto,
  ): MeetingsPageDto {
    return {
      items: this.meetingsService.findRecent(current.id, query.limit).map(toMeetingDto),
      // `countByOwner`, not `items.length`: `total` is the owner's full meeting count.
      total: this.meetingsService.countByOwner(current.id),
    };
  }

  /** No `@HttpCode` here: POST's default 201 is the correct answer (`HD-API-13`). */
  @Post()
  create(@CurrentUser() current: AuthenticatedUser, @Body() dto: CreateMeetingDto): MeetingDto {
    return toMeetingDto(this.meetingsService.create(current.id, dto));
  }

  /**
   * Declared after `@Get()` and `@Post()` (design §3, probe C1/C5: `GET /meetings` and
   * `GET /meetings/` still reach `list`). `@Param('id')` carries **no pipe**: no seed id is a UUID,
   * and a pipe's 400 would carry a string `message` against invariant 8 (`ADR-0018`). A malformed
   * id is simply an id no meeting has — there is no `400` on this route.
   *
   * The only branch: `findById` returning `undefined` — whether the id does not exist or belongs to
   * another owner — becomes the one `NotFoundException`, with its argument, so the body keeps all
   * three keys `statusCode`/`message`/`error` (`SEC-API-06`, `ADR-0018`). The no-argument form drops
   * `error` and is forbidden.
   */
  @Get(':id')
  findById(@CurrentUser() current: AuthenticatedUser, @Param('id') id: string): MeetingDto {
    const meeting = this.meetingsService.findById(current.id, id);

    if (meeting === undefined) {
      throw new NotFoundException('Meeting not found');
    }

    return toMeetingDto(meeting);
  }
}
