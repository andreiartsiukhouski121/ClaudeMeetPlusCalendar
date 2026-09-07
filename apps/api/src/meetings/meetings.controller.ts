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
 * `GET /meetings`, `POST /meetings`.
 *
 * Guard навешен на **класс целиком** (§2.2 п.7): глобальным его ставить нельзя — он сломал бы
 * публичные `GET /` и `POST /auth/login`. Что guard навешен именно на весь контроллер,
 * проверяет `HD-API-02` (список без токена → 401) и `HD-API-14` (создание без токена → 401).
 *
 * `ownerId` во всех методах берётся из `@CurrentUser()`, то есть из подписанного токена,
 * и **никогда** из тела или query запроса.
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
      // Именно `countByOwner`, а не `items.length`: `total` — полное число встреч владельца.
      total: this.meetingsService.countByOwner(current.id),
    };
  }

  /**
   * `@HttpCode` тут не нужен: дефолтный для POST 201 и есть правильный ответ (`HD-API-13`).
   */
  @Post()
  create(@CurrentUser() current: AuthenticatedUser, @Body() dto: CreateMeetingDto): MeetingDto {
    return toMeetingDto(this.meetingsService.create(current.id, dto));
  }
}
