import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';

import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { GetMeetingFileContent } from './application/get-meeting-file-content.js';
import { ListMeetingFiles } from './application/list-meeting-files.js';
import { UploadMeetingFile } from './application/upload-meeting-file.js';
import { MAX_FILE_SIZE_BYTES } from './domain/limits.js';
import { UploadFileDto } from './dto/upload-file.dto.js';
import { buildContentDisposition } from './meeting-files.content-disposition.js';
import { MeetingFilesErrorFilter } from './meeting-files.error-filter.js';
import { type MeetingFileDto, toMeetingFileDto } from './meeting-files.mapper.js';

/**
 * Three routes nested under a meeting, guarded the same way as `MeetingsController` (invariant 16).
 * Each handler turns request parts into a use-case input, calls the use case and maps the result
 * out; a broken rule surfaces as a domain error that `MeetingFilesErrorFilter` translates
 * (`FACT-3706`).
 */
@Controller('meetings')
@UseGuards(JwtAuthGuard)
@UseFilters(MeetingFilesErrorFilter)
export class MeetingFilesController {
  constructor(
    private readonly uploadMeetingFile: UploadMeetingFile,
    private readonly listMeetingFiles: ListMeetingFiles,
    private readonly getMeetingFileContent: GetMeetingFileContent,
  ) {}

  /**
   * Evaluation order (`FACT-2097`…`FACT-2101`) — a request with two faults answers with the first
   * body in this list:
   *
   * 1. `JwtAuthGuard` (401) — runs before this method is even invoked.
   * 2. `FileInterceptor` (413 for an oversized file; a **string** 400 for a file under the wrong
   *    field name) — also before this method runs, since an interceptor wraps the pipe/handler
   *    call.
   * 3. `ValidationPipe` against the empty `UploadFileDto` (the array 400 for any extra text part).
   * 4. `UploadMeetingFile`: the file itself, then the filename, then the content type (415), then
   *    ownership (404), then the per-meeting count (400) — ownership strictly before the cap, so
   *    the cap cannot be used to probe whether a meeting exists (`MF-API-16`).
   */
  @Post(':id/files')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE_BYTES } }))
  async upload(
    @CurrentUser() current: AuthenticatedUser,
    @Param('id') meetingId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    // Unused by this handler: its only purpose is giving `ValidationPipe` a metatype to validate
    // the multipart body's non-file fields against — without a `@Body()` parameter the pipe never
    // runs for this route at all.
    @Body() _body: UploadFileDto,
  ): Promise<MeetingFileDto> {
    // `multer` drops a file part with no filename before the handler ever sees it, so an absent
    // `file` also covers "a `file` part with no filename and `Content-Type: application/octet-stream`".
    const created = await this.uploadMeetingFile.execute({
      ownerId: current.id,
      meetingId,
      file:
        file === undefined
          ? undefined
          : { originalName: file.originalname, declaredType: file.mimetype, bytes: file.buffer },
    });

    return toMeetingFileDto(created);
  }

  @Get(':id/files')
  async list(
    @CurrentUser() current: AuthenticatedUser,
    @Param('id') meetingId: string,
  ): Promise<{ items: MeetingFileDto[] }> {
    const files = await this.listMeetingFiles.execute(current.id, meetingId);

    // `{ items }`, no `total`: this route takes no `limit`, so a count could only ever be
    // `items.length` — exactly what invariant 4 forbids.
    return { items: files.map(toMeetingFileDto) };
  }

  @Get(':id/files/:fileId/content')
  async download(
    @CurrentUser() current: AuthenticatedUser,
    @Param('id') meetingId: string,
    @Param('fileId') fileId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const file = await this.getMeetingFileContent.execute(current.id, meetingId, fileId);

    // The only place a `Uint8Array` becomes a `Buffer` (`FACT-3628`).
    const content = Buffer.from(file.content);

    // Set before returning the `StreamableFile`: the adapter only fills in a header that is not
    // already present, so these four win over `StreamableFile`'s own defaults.
    //
    // `Content-Disposition` is **built**, never interpolated (`SEC-API-11`): the `filename` column
    // has more than one writer — the upload route validates what it admits, the seed writes
    // straight through Prisma — and this read path trusts neither.
    res.set({
      'Content-Type': file.contentType,
      'Content-Length': String(content.length),
      'Content-Disposition': buildContentDisposition(file.filename),
      'X-Content-Type-Options': 'nosniff',
    });

    return new StreamableFile(content);
  }
}
