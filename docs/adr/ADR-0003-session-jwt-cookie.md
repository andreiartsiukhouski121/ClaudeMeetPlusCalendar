# ADR-0003 — The session is the API's own JWT in an httpOnly cookie

- **Status:** accepted
- **Date:** 2026-09-07
- **Supersedes:** —
- **Superseded by:** —

## Context

`apps/web` needs to remember who the visitor is between requests, and `apps/api` needs to authorize
each call. Two identities would be one too many: a web session with its own store, plus a token for
the API, means two lifetimes, two revocation stories and two places to get it wrong.

## Decision

`POST /auth/login` returns the JWT that Nest signed. `apps/web` puts that exact token into the
`ps_session` cookie: `httpOnly`, `sameSite=lax`, `path=/`, and `secure` tied to
`process.env.NODE_ENV === 'production'` rather than an unconditional `true` — otherwise the cookie is
dropped over plain HTTP in development and login silently does nothing (invariant 12).

The cookie's lifetime must match `JWT_EXPIRES_IN`; `AL-UT-22` pins that.

Rejected: an encrypted session blob (`iron-session`, `jose`) — it would re-encode a token that is
already signed, and add a second secret; a server-side session store — there is no database
(`ADR-0007`), and an in-memory one would die with every `--watch` restart.

## Consequences

- No session store, no revocation list: signing out deletes the cookie, and a stolen token stays
  valid until it expires. That is a known, deliberate gap, recorded in `docs/security.md` and
  `BL-002`.
- The token is opaque to the browser and readable by the Next server only. Checked by `AL-FN-13`,
  `SEC-FN-01`, `SEC-FN-02`.
- An invalid or expired cookie must be cleared through the `/auth/session-expired` Route Handler,
  never by redirecting to `/auth/login` — the proxy only sees that a cookie exists and would bounce
  the visitor back into a redirect loop. That cost a real defect (`SEC-FN-05`) and became
  invariant 17.
