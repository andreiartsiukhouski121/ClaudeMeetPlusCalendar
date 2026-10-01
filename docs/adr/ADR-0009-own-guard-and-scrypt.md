# ADR-0009 — Our own guard and `node:crypto` instead of passport and bcrypt

- **Status:** accepted
- **Date:** 2026-09-07
- **Supersedes:** —
- **Superseded by:** —

## Context

- `FACT-3160` The authentication need here is to verify a bearer token on a few routes and hash a
  handful of passwords. — `FACT-2004`, `apps/api/src/users/users.seed.ts`
- `FACT-3161` `@nestjs/passport` + `passport-jwt` + `bcrypt` bring a strategy registry, a second
  configuration surface and a native build. — their package documentation

> **Rationale — not a fact.** That stack is paid for in features this project does not use.

## Decision

- `FACT-3162` `JwtAuthGuard` is about twenty-five lines: read the `Authorization` header, verify with
  `JwtService`, attach the payload. — `apps/api/src/auth/jwt-auth.guard.ts`
- `FACT-3163` `@CurrentUser()` is a parameter decorator reading what the guard attached, so a handler
  gets identity from the signature, never from the body. — invariant 5,
  `apps/api/src/auth/current-user.decorator.ts`
- `FACT-3164` Password hashing is `node:crypto.scrypt` with a constant-time comparison. —
  `apps/api/src/users/users.service.ts`, `FACT-1003`
- `FACT-3165` Both rejection branches cost the same: an unknown email is verified against a dummy
  hash rather than returning early, and both branches answer the identical message. — invariants 6
  and 18, `FACT-2024`, `SEC-API-05`
- `FACT-3166` An early exit made unknown emails answer in 52 ms against 86–114 ms for a wrong
  password, and accounts were enumerable by clock. — `SEC-API-05`, `FACT-2028`

Rejected:

- `FACT-3167` `passport-jwt` — indirection without benefit at this size. — this record
- `FACT-3168` `bcrypt` — a native dependency for something the platform provides. — this record
- `FACT-3169` Returning early on an unknown user — the timing oracle above. — this record

## Consequences

- `FACT-3170` Anything passport would have given for free — refresh tokens, multiple strategies, rate
  limiting — is ours to build; `BL-001` (rate limiting on login) and `BL-002` (refresh tokens) are
  open for that reason, and `BL-001` is the one item considered a production blocker. —
  `docs/BACKLOG.md`, `FACT-2029`
- `FACT-3171` The guard is unit-tested directly, which is how the 401 branches stay covered without
  HTTP. — `apps/api/src/auth/jwt-auth.guard.spec.ts`
- `FACT-3172` The timing property is held by `SEC-API-05` with a deliberately loose threshold. —
  `e2e/security/security.api.spec.ts`

> **Rationale — not a fact.** An identical message alone is not enough, which is what the timing
> measurement established. The loose threshold's job is to catch a returning early exit rather than
> to measure microseconds — the property is fragile by nature.
