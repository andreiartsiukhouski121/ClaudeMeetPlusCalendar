/**
 * Injection tokens for the ports `meetings` binds. They live here, in the wiring layer, because
 * `application/` may not know Nest. `UUID_SOURCE` is this module's own binding of the shared
 * `UuidSource` port.
 */
export const MEETING_REPOSITORY = Symbol('MEETING_REPOSITORY');
export const UUID_SOURCE = Symbol('UUID_SOURCE');
