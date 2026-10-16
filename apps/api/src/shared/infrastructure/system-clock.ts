import type { Clock } from '../application/clock.js';

/** The adapter behind `Clock` (`FACT-3734`). */
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
