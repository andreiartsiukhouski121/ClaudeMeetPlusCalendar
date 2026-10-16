import { ArgumentsHost, Catch, HttpException, NotFoundException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';

import { MeetingError } from './domain/meeting.errors.js';

/**
 * Byte-identical body for every "a meeting does not exist, or exists but is not yours" branch
 * (`ADR-0018`, `FACT-2016`). Exported once and imported by `MeetingFilesErrorFilter` rather than
 * written a second time: a second copy of this string is exactly how one documented body quietly
 * becomes two.
 */
export const MEETING_NOT_FOUND_MESSAGE = 'Meeting not found';

/**
 * Each domain error becomes the exact `HttpException` the contract documents, and is then handed to
 * the framework's own reply path, so status, body and headers are those of an exception thrown from
 * the handler. Invariant 8: the 404 carries a string `message`, built with an argument so the body
 * keeps all three keys `statusCode`/`message`/`error` (`SEC-API-06`). The switch is exhaustive over
 * `kind`: a new domain error with no row fails typecheck.
 */
function toHttpException(error: MeetingError): HttpException | undefined {
  switch (error.kind) {
    case 'meeting-not-found':
      return new NotFoundException(MEETING_NOT_FOUND_MESSAGE);
    default: {
      // Compile-time exhaustiveness only; at runtime the caller falls back to the default 500.
      const unmapped: never = error.kind;

      return unmapped;
    }
  }
}

/**
 * Catches only this module's domain errors: the guard's 401 and the pipe's array 400 are raised
 * before the handler and never reach it.
 */
@Catch(MeetingError)
export class MeetingsErrorFilter extends BaseExceptionFilter {
  override catch(error: MeetingError, host: ArgumentsHost): void {
    super.catch(toHttpException(error) ?? error, host);
  }
}
