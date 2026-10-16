import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  HttpException,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';

import { MEETING_NOT_FOUND_MESSAGE } from '../meetings/meetings.error-filter.js';
import { FILENAME_RULE_MESSAGE } from './domain/file-name.js';
import { MAX_FILES_PER_MEETING } from './domain/limits.js';
import { MeetingFileError } from './domain/meeting-file.errors.js';

/** The one other 404 body this module answers with, beside the reused `Meeting not found`. */
export const FILE_NOT_FOUND_MESSAGE = 'File not found';

/**
 * Each domain error becomes the exact `HttpException` the contract documents, and is then handed to
 * the framework's own reply path, so status, body and headers are those of an exception thrown from
 * the handler (`FACT-3717`). Invariant 8: the three 400s carry an array, the 404s and the 415 a
 * string. The switch is exhaustive over `kind`: a new domain error with no row fails typecheck.
 */
function toHttpException(error: MeetingFileError): HttpException | undefined {
  switch (error.kind) {
    case 'file-required':
      return new BadRequestException(['file is required']);
    case 'invalid-file-name':
      return new BadRequestException([FILENAME_RULE_MESSAGE]);
    case 'unsupported-content-type':
      // One message whatever the reason — an unknown type, a missing one and a hostile one are
      // indistinguishable from outside (`FACT-3631`).
      return new UnsupportedMediaTypeException(
        'Unsupported file type: upload a PDF, PNG, JPEG or plain text file',
      );
    case 'meeting-not-found':
      return new NotFoundException(MEETING_NOT_FOUND_MESSAGE);
    case 'file-limit-reached':
      return new BadRequestException([`a meeting may hold at most ${MAX_FILES_PER_MEETING} files`]);
    case 'meeting-file-not-found':
      return new NotFoundException(FILE_NOT_FOUND_MESSAGE);
    default: {
      // Compile-time exhaustiveness only; at runtime the caller falls back to the default 500.
      const unmapped: never = error.kind;

      return unmapped;
    }
  }
}

/**
 * Catches only this module's domain errors (`FACT-3707`): the guard's 401, the interceptor's 413 and
 * string 400 and the pipe's array 400 are raised before the handler and never reach it.
 */
@Catch(MeetingFileError)
export class MeetingFilesErrorFilter extends BaseExceptionFilter {
  override catch(error: MeetingFileError, host: ArgumentsHost): void {
    super.catch(toHttpException(error) ?? error, host);
  }
}
