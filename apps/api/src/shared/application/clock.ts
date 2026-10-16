/** The port for "what time is it", so `application/` and `domain/` read no clock (`FACT-3734`). */
export interface Clock {
  now(): Date;
}
