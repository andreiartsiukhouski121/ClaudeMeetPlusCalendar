# ADR-0003 — The session is the API's own JWT in an httpOnly cookie

- **Status:** accepted
- **Date:** 2026-09-07
- **Supersedes:** —
- **Superseded by:** —

## Context

- `FACT-3040` `apps/web` needs to remember who the visitor is between requests, and `apps/api` needs
  to authorize each call. — `apps/web/src/lib/dal.ts`, `apps/api/src/auth/jwt-auth.guard.ts`

> **Rationale — not a fact.** Two identities would be one too many: a web session with its own store,
> plus a token for the API, means two lifetimes, two revocation stories and two places to get it
> wrong.

## Decision

- `FACT-3041` `POST /auth/login` returns the JWT that Nest signed, and `apps/web` puts that exact
  token into the `ps_session` cookie. — `FACT-1014`, `apps/web/src/lib/session-cookie.ts`
- `FACT-3042` The cookie is `httpOnly`, `sameSite=lax`, `path=/`. —
  `apps/web/src/lib/session-cookie.ts`, `SEC-FN-01`
- `FACT-3043` `secure` is tied to `process.env.NODE_ENV === 'production'` rather than an
  unconditional `true`. — invariant 12, `apps/web/src/lib/session-cookie.ts`
- `FACT-3044` The cookie's lifetime matches `JWT_EXPIRES_IN`. — `AL-UT-22`

Rejected:

- `FACT-3045` An encrypted session blob (`iron-session`, `jose`) — it would re-encode a token that is
  already signed, and add a second secret. — this record
- `FACT-3046` A server-side session store — there is no database, and an in-memory one would die with
  every `--watch` restart. — this record, `ADR-0007`

> **Rationale — not a fact.** An unconditional `secure: true` drops the cookie over plain HTTP in
> development, and login then silently does nothing.

## Consequences

- `FACT-3047` There is no session store and no revocation list: signing out deletes the cookie, and a
  stolen token stays valid until it expires. This is a deliberate gap. — `docs/security.md`,
  `BL-002`
- `FACT-3048` The token is opaque to the browser and readable by the Next server only. — `AL-FN-13`,
  `SEC-FN-01`, `SEC-FN-02`
- `FACT-3049` An invalid or expired cookie is cleared through the `/auth/session-expired` Route
  Handler, never by redirecting to `/auth/login`. — invariant 17, `SEC-FN-05`

> **Rationale — not a fact.** The proxy only sees that a cookie exists, so a direct redirect to the
> login page bounces the visitor back into a redirect loop. That cost a real defect and became
> invariant 17.
