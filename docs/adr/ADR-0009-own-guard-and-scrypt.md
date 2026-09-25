# ADR-0009 — Our own guard and `node:crypto` instead of passport and bcrypt

- **Status:** accepted
- **Date:** 2026-09-07
- **Supersedes:** —
- **Superseded by:** —

## Context

The authentication need here is small and completely known: verify a bearer token on a few routes,
and hash a handful of passwords. The usual stack for that — `@nestjs/passport` + `passport-jwt` +
`bcrypt` — brings a strategy registry, a second configuration surface and a native build, in
exchange for features this project does not use.

## Decision

- **`JwtAuthGuard`** — about twenty-five lines: read the `Authorization` header, verify with
  `JwtService`, attach the payload. `@CurrentUser()` is a parameter decorator reading what the guard
  attached, so a handler gets identity from the **signature**, never from the body (invariant 5).
- **`node:crypto.scrypt`** for password hashing, with a constant-time comparison. No native build,
  no install step that can fail on a fresh machine.
- **Both rejection branches cost the same.** An unknown email is verified against a dummy hash rather
  than returning early, and both branches answer the identical message. An identical message alone is
  not enough: an early exit made unknown emails answer in 52 ms against 86–114 ms for a wrong
  password, and accounts were enumerable by clock (`SEC-API-05`, now invariant 18).

Rejected: `passport-jwt` (indirection without benefit at this size); `bcrypt` (a native dependency
for something the platform provides); returning early on an unknown user (the timing oracle above).

## Consequences

- Anything passport would have given for free — refresh tokens, multiple strategies, rate limiting —
  is ours to build. `BL-001` (rate limiting on login) and `BL-002` (refresh tokens) are open for
  exactly that reason, and `BL-001` is the one item considered a production blocker.
- The guard is small enough to unit-test directly (`jwt-auth.guard.spec.ts`), which is how the 401
  branches stay covered without HTTP.
- The timing property is fragile by nature: it is held by `SEC-API-05` with a deliberately loose
  threshold, whose job is to catch a returning early exit rather than to measure microseconds.
