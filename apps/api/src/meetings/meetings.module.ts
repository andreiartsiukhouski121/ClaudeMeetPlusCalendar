import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import type { UuidSource } from '../shared/application/uuid-source.js';
import { CryptoUuidSource } from '../shared/infrastructure/crypto-uuid-source.js';
import { CreateMeeting } from './application/create-meeting.js';
import { DeleteMeeting } from './application/delete-meeting.js';
import { GetMeeting } from './application/get-meeting.js';
import { ListMeetings } from './application/list-meetings.js';
import type { MeetingRepository } from './application/meeting.repository.js';
import { PrismaMeetingRepository } from './infrastructure/prisma-meeting.repository.js';
import { MeetingsController } from './meetings.controller.js';
import { MEETING_REPOSITORY, UUID_SOURCE } from './meetings.tokens.js';

/**
 * Wiring only: each port is bound to its adapter by a `Symbol` token, each use case is a
 * `useFactory` provider whose token is the class itself, so the controller receives use cases by
 * constructor type. `AuthModule` supplies `JwtAuthGuard`, `PrismaModule` the client for the
 * repository adapter. `GetMeeting` is exported: `meeting-files` reuses it as the one ownership
 * lookup (`ADR-0018`).
 */
@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [MeetingsController],
  providers: [
    { provide: MEETING_REPOSITORY, useClass: PrismaMeetingRepository },
    { provide: UUID_SOURCE, useClass: CryptoUuidSource },
    {
      provide: ListMeetings,
      useFactory: (meetings: MeetingRepository) => new ListMeetings(meetings),
      inject: [MEETING_REPOSITORY],
    },
    {
      provide: CreateMeeting,
      useFactory: (meetings: MeetingRepository, uuids: UuidSource) =>
        new CreateMeeting(meetings, uuids),
      inject: [MEETING_REPOSITORY, UUID_SOURCE],
    },
    {
      provide: GetMeeting,
      useFactory: (meetings: MeetingRepository) => new GetMeeting(meetings),
      inject: [MEETING_REPOSITORY],
    },
    {
      provide: DeleteMeeting,
      useFactory: (meetings: MeetingRepository) => new DeleteMeeting(meetings),
      inject: [MEETING_REPOSITORY],
    },
  ],
  exports: [GetMeeting],
})
export class MeetingsModule {}
