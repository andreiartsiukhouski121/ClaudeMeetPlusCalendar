/** The port for fresh identifiers, so `domain/` generates no randomness (`FACT-3738`). */
export interface UuidSource {
  next(): string;
}
