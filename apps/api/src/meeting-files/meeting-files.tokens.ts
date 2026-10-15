/**
 * Injection tokens for the four ports. They live here, in the wiring layer, because `application/`
 * may not know Nest (`FACT-3705`).
 */
export const MEETING_FILE_REPOSITORY = Symbol('MEETING_FILE_REPOSITORY');
export const MEETING_ACCESS = Symbol('MEETING_ACCESS');
export const CLOCK = Symbol('CLOCK');
export const UUID_SOURCE = Symbol('UUID_SOURCE');
