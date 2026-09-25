import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';

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
}
