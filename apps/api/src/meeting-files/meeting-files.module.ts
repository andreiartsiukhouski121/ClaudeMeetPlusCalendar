import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { MeetingsModule } from '../meetings/meetings.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import type { Clock } from '../shared/application/clock.js';
import type { UuidSource } from '../shared/application/uuid-source.js';
import { CryptoUuidSource } from '../shared/infrastructure/crypto-uuid-source.js';
import { SystemClock } from '../shared/infrastructure/system-clock.js';
import { DeleteMeetingFile } from './application/delete-meeting-file.js';
import { GetMeetingFileContent } from './application/get-meeting-file-content.js';
import { ListMeetingFiles } from './application/list-meeting-files.js';
import type { MeetingAccess } from './application/meeting-access.js';
import type { MeetingFileRepository } from './application/meeting-file.repository.js';
import { UploadMeetingFile } from './application/upload-meeting-file.js';
import { GetMeetingAccess } from './infrastructure/get-meeting.access.js';
import { PrismaMeetingFileRepository } from './infrastructure/prisma-meeting-file.repository.js';
import { MeetingFilesController } from './meeting-files.controller.js';
import {
  CLOCK,
  MEETING_ACCESS,
  MEETING_FILE_REPOSITORY,
  UUID_SOURCE,
} from './meeting-files.tokens.js';

/**
 * Wiring only (`FACT-3705`): each port is bound to its adapter by a `Symbol` token, each use case is
 * a `useFactory` provider whose token is the class itself, so the controller receives use cases by
 * constructor type. `AuthModule` supplies `JwtAuthGuard`, `PrismaModule` the client for the
 * repository adapter, `MeetingsModule` the exported `GetMeeting` behind the access adapter.
 */
@Module({
  imports: [AuthModule, PrismaModule, MeetingsModule],
  controllers: [MeetingFilesController],
  providers: [
    { provide: MEETING_FILE_REPOSITORY, useClass: PrismaMeetingFileRepository },
    { provide: MEETING_ACCESS, useClass: GetMeetingAccess },
    { provide: CLOCK, useClass: SystemClock },
    { provide: UUID_SOURCE, useClass: CryptoUuidSource },
    {
      provide: UploadMeetingFile,
      useFactory: (
        files: MeetingFileRepository,
        access: MeetingAccess,
        clock: Clock,
        uuids: UuidSource,
      ) => new UploadMeetingFile(files, access, clock, uuids),
      inject: [MEETING_FILE_REPOSITORY, MEETING_ACCESS, CLOCK, UUID_SOURCE],
    },
    {
      provide: ListMeetingFiles,
      useFactory: (files: MeetingFileRepository, access: MeetingAccess) =>
        new ListMeetingFiles(files, access),
      inject: [MEETING_FILE_REPOSITORY, MEETING_ACCESS],
    },
    {
      provide: GetMeetingFileContent,
      useFactory: (files: MeetingFileRepository, access: MeetingAccess) =>
        new GetMeetingFileContent(files, access),
      inject: [MEETING_FILE_REPOSITORY, MEETING_ACCESS],
    },
    {
      provide: DeleteMeetingFile,
      useFactory: (files: MeetingFileRepository, access: MeetingAccess) =>
        new DeleteMeetingFile(files, access),
      inject: [MEETING_FILE_REPOSITORY, MEETING_ACCESS],
    },
  ],
})
export class MeetingFilesModule {}
