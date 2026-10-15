/**
 * Domain errors: what went wrong, never how HTTP reports it. They carry a literal `kind` and no
 * status code or HTTP text; the module's error filter maps each `kind` to the response the contract
 * documents (`FACT-3706`).
 */
export type MeetingFileErrorKind =
  | 'file-required'
  | 'invalid-file-name'
  | 'unsupported-content-type'
  | 'meeting-not-found'
  | 'file-limit-reached'
  | 'meeting-file-not-found';

export abstract class MeetingFileError extends Error {
  abstract readonly kind: MeetingFileErrorKind;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class FileRequired extends MeetingFileError {
  readonly kind = 'file-required';

  constructor() {
    super('a file is required');
  }
}

export class InvalidFileName extends MeetingFileError {
  readonly kind = 'invalid-file-name';

  constructor() {
    super('the filename breaks the filename rule');
  }
}

export class UnsupportedContentType extends MeetingFileError {
  readonly kind = 'unsupported-content-type';

  constructor() {
    super('the content type is not allowed');
  }
}

export class MeetingNotFound extends MeetingFileError {
  readonly kind = 'meeting-not-found';

  constructor() {
    super('the meeting does not exist or belongs to someone else');
  }
}

export class FileLimitReached extends MeetingFileError {
  readonly kind = 'file-limit-reached';

  constructor() {
    super('the meeting already holds the maximum number of files');
  }
}

export class MeetingFileNotFound extends MeetingFileError {
  readonly kind = 'meeting-file-not-found';

  constructor() {
    super('the file does not exist in this meeting');
  }
}
