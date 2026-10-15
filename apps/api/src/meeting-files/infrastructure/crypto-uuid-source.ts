import { randomUUID } from 'node:crypto';

import type { UuidSource } from '../application/uuid-source.js';

/** The adapter behind `UuidSource` (`FACT-3718`); the id format is `FACT-3670`. */
export class CryptoUuidSource implements UuidSource {
  next(): string {
    return randomUUID();
  }
}
