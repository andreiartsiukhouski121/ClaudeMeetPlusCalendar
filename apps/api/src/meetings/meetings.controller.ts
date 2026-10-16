import { Body, Controller, Get, Param, Post, Query, UseFilters, UseGuards } from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CreateMeeting } from './application/create-meeting.js';
import { GetMeeting } from './application/get-meeting.js';
import { ListMeetings } from './application/list-meetings.js';
import { CreateMeetingDto } from './dto/create-meeting.dto.js';
import { ListMeetingsQueryDto } from './dto/list-meetings-query.dto.js';
import { MeetingsErrorFilter } from './meetings.error-filter.js';
import { type MeetingDto, type MeetingsPageDto, toMeetingDto } from './meetings.mapper.js';

/**
 * The guard is attached to the **whole class**: registering it globally would break the public
 * `GET /` and `POST /auth/login`. `HD-API-02` and `HD-API-14` check that it really covers the
 * controller.
 *
 * Invariant 5: `ownerId` always comes from `@CurrentUser()`, the signed token, and never from
 * the body or the query.
 */
@Controller('meetings')
@UseGuards(JwtAuthGuard)
@UseFilters(MeetingsErrorFilter)
export class MeetingsController {
  constructor(
    private readonly listMeetings: ListMeetings,
    private readonly createMeeting: CreateMeeting,
    private readonly getMeeting: GetMeeting,
  ) {}

  @Get()
  async list(
    @CurrentUser() current: AuthenticatedUser,
    @Query() query: ListMeetingsQueryDto,
  ): Promise<MeetingsPageDto> {
    const { items, total } = await this.listMeetings.execute(current.id, query.limit);

    return { items: items.map(toMeetingDto), total };
  }

  /** No `@HttpCode` here: the default 201 of POST is the correct answer (`HD-API-13`). */
  @Post()
  async create(
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: CreateMeetingDto,
  ): Promise<MeetingDto> {
    return toMeetingDto(await this.createMeeting.execute(current.id, dto));
  }

  /**
   * Declared after `@Get()` and `@Post()`: `GET /meetings` and `GET /meetings/` still reach `list`.
   * `@Param('id')` carries **no pipe**: no seed id is a UUID, and a pipe 400 would carry a string
   * `message` against invariant 8 (`ADR-0018`). A malformed id is simply an id no meeting has, so
   * there is no 400 on this route. An absent or foreign id surfaces as `MeetingNotFoundError`,
   * which `MeetingsErrorFilter` turns into the one 404.
   */
  @Get(':id')
  async findById(
    @CurrentUser() current: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<MeetingDto> {
    return toMeetingDto(await this.getMeeting.execute({ ownerId: current.id, id }));
  }
}
