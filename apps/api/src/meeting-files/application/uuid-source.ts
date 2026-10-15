/** The port for fresh identifiers, so `domain/` generates no randomness (`FACT-3719`). */
export interface UuidSource {
  next(): string;
}
