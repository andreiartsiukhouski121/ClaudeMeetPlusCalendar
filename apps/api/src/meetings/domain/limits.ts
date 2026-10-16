/** Every number a meeting rule or its input bounds use, declared once (`ADR-0035`). */

/** How many meetings the dashboard shows when `limit` is absent. */
export const DEFAULT_MEETINGS_LIMIT = 3;

/** Meeting duration when the client does not send one. */
export const DEFAULT_DURATION_MINUTES = 60;

export const TITLE_MIN_LENGTH = 3;
export const TITLE_MAX_LENGTH = 100;

export const DURATION_MIN_MINUTES = 15;
export const DURATION_MAX_MINUTES = 480;

export const PARTICIPANTS_MAX_COUNT = 20;
export const PARTICIPANT_MIN_LENGTH = 1;
export const PARTICIPANT_MAX_LENGTH = 100;

export const LIMIT_MIN = 1;
/** 100, not 50: `limit=100` is used as "give me everything" in `HD-API-17` and `SM-API-03`. */
export const LIMIT_MAX = 100;
