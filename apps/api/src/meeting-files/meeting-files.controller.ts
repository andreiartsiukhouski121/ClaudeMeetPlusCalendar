import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Res,
  StreamableFile,
  UnsupportedMediaTypeException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';

import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { MEETING_NOT_FOUND_MESSAGE } from '../meetings/meetings.controller.js';
import { MeetingsService } from '../meetings/meetings.service.js';
import { UploadFileDto } from './dto/upload-file.dto.js';
import type { MeetingFileDto } from './meeting-file.types.js';
import { toMeetingFileDto } from './meeting-files.mapper.js';
import {
  buildContentDisposition,
  FILENAME_RULE_MESSAGE,
  isAllowedContentType,
  isValidFilename,
  MAX_FILE_SIZE_BYTES,
  MAX_FILES_PER_MEETING,
  normalizeContentType,
} from './meeting-files.rules.js';
import { MeetingFilesService } from './meeting-files.service.js';

/** The one other 404 body this module answers with, beside the reused `Meeting not found`. */
export const FILE_NOT_FOUND_MESSAGE = 'File not found';

/**
 * Three routes nested under a meeting, guarded the same way as `MeetingsController` (invariant 16).
 * Ownership resolves through the existing `MeetingsService.findById` rather than a query of its
 * own, so `ADR-0018`'s one-code-path 404 is reused: a stranger and a non-existent meeting are
 * indistinguishable from outside (design §2).
 */
@Controller('meetings')
@UseGuards(JwtAuthGuard)
export class MeetingFilesController {
  constructor(
    private readonly meetingsService: MeetingsService,
    private readonly meetingFilesService: MeetingFilesService,
  ) {}

  /**
   * Evaluation order (design §3) — a request with two faults answers with the first body in this
   * list:
   *
   * 1. `JwtAuthGuard` (401) — runs before this method is even invoked.
   * 2. `FileInterceptor` (413 for an oversized file; a **string** 400 for a file under the wrong
   *    field name) — also before this method runs, since an interceptor wraps the pipe/handler
   *    call.
   * 3. `ValidationPipe` against the empty `UploadFileDto` (the array 400 for any extra text part).
   * 4. This body: the file itself, then the filename, then the content type (415), then ownership
   *    (404), then the per-meeting count (400) — ownership strictly before the cap, so the cap
   *    cannot be used to probe whether a meeting exists (`MF-API-16`).
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
    if (file === undefined) {
      // `multer` drops a file part with no filename before the handler ever sees it, so this also
      // covers "a `file` part with no filename and `Content-Type: application/octet-stream`".
      throw new BadRequestException(['file is required']);
    }

    if (!isValidFilename(file.originalname)) {
      throw new BadRequestException([FILENAME_RULE_MESSAGE]);
    }

    const contentType = normalizeContentType(file.mimetype);

    if (!isAllowedContentType(contentType)) {
      // One message whatever the reason — an unknown type, a missing one and a hostile one are
      // indistinguishable from outside (design §3, `FACT-3631`).
      throw new UnsupportedMediaTypeException(
        'Unsupported file type: upload a PDF, PNG, JPEG or plain text file',
      );
    }

    const meeting = await this.meetingsService.findById(current.id, meetingId);

    if (meeting === undefined) {
      throw new NotFoundException(MEETING_NOT_FOUND_MESSAGE);
    }

    const existingCount = await this.meetingFilesService.countForMeeting(meetingId);

    if (existingCount >= MAX_FILES_PER_MEETING) {
      // A count then an insert, not a transaction — the contract promises the refusal, not an
      // exact ceiling under concurrency (design §8.14, `FACT-3642`).
      throw new BadRequestException(['a meeting may hold at most 10 files']);
    }

    const created = await this.meetingFilesService.create(meetingId, {
      // The **normalized** media type is what gets stored, never `file.mimetype` itself: the
      // download echoes this back as `Content-Type` from this origin (`MF-API-17`, `FACT-3627`).
      filename: file.originalname,
      contentType,
      content: file.buffer,
    });

    return toMeetingFileDto(created);
  }

  @Get(':id/files')
  async list(
    @CurrentUser() current: AuthenticatedUser,
    @Param('id') meetingId: string,
  ): Promise<{ items: MeetingFileDto[] }> {
    const meeting = await this.meetingsService.findById(current.id, meetingId);

    if (meeting === undefined) {
      throw new NotFoundException(MEETING_NOT_FOUND_MESSAGE);
    }

    const files = await this.meetingFilesService.findForMeeting(meetingId);

    // `{ items }`, no `total`: this route takes no `limit`, so a count could only ever be
    // `items.length` — exactly what invariant 4 forbids (design §3).
    return { items: files.map(toMeetingFileDto) };
  }

  @Get(':id/files/:fileId/content')
  async download(
    @CurrentUser() current: AuthenticatedUser,
    @Param('id') meetingId: string,
    @Param('fileId') fileId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const meeting = await this.meetingsService.findById(current.id, meetingId);

    if (meeting === undefined) {
      throw new NotFoundException(MEETING_NOT_FOUND_MESSAGE);
    }

    const file = await this.meetingFilesService.findByIdForMeeting(meetingId, fileId);

    if (file === undefined) {
      throw new NotFoundException(FILE_NOT_FOUND_MESSAGE);
    }

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
