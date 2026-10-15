import { FILENAME_PATTERN, MAX_FILENAME_LENGTH } from './limits.js';
import { InvalidFileName } from './meeting-file.errors.js';

export const FILENAME_RULE_MESSAGE =
  'filename must be 1 to 100 characters of letters, digits, dot, underscore, hyphen or space';

export function isValidFilename(filename: string): boolean {
  return (
    filename.length >= 1 &&
    filename.length <= MAX_FILENAME_LENGTH &&
    FILENAME_PATTERN.test(filename)
  );
}

/** A filename that satisfies the rule (`FACT-2090`); construction throws `InvalidFileName` otherwise. */
export class FileName {
  readonly value: string;

  constructor(raw: string) {
    if (!isValidFilename(raw)) {
      throw new InvalidFileName();
    }

    this.value = raw;
  }
}
