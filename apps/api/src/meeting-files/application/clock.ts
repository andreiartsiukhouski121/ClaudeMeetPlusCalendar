/** The port for "what time is it", so `application/` and `domain/` read no clock (`FACT-3718`). */
export interface Clock {
  now(): Date;
}
