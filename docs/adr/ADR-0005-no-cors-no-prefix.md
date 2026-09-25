# ADR-0005 — No CORS and no global prefix on the API

- **Status:** accepted
- **Date:** 2026-09-07
- **Supersedes:** —
- **Superseded by:** —

## Context

Both are reflexes on a fresh Nest project: `app.enableCors()` and `app.setGlobalPrefix('api')`. Both
are wrong here, and both are cheap to add by accident later, which is why the reasoning sits in a
comment in `main.ts` as well as in this file.

CORS headers only matter for requests made from a browser origin. Under `ADR-0002` the only clients
of Nest are Next's server-side `fetch` and Playwright's `request` fixture. Neither sends an `Origin`
header, neither does a preflight. A bare `enableCors()` answers `Access-Control-Allow-Origin: *` —
it would make the API callable from any site on the internet, in exchange for nothing.

A global prefix would break `SM-API-01` (`GET /` answering `Hello World!` is the liveness signal) and
push the prefix into every path, every test and every document. The existing paths — `/`, `/auth/*`,
`/meetings` — do not collide with anything.

## Decision

Neither is enabled. `main.ts` also disables the `x-powered-by` header, which was a real finding
(`SEC-API-08`).

## Consequences

- If a browser client is ever added, CORS becomes a deliberate decision with an explicit origin
  list, recorded as a new ADR — not a one-line reflex.
- Route paths stay short and match the documents literally, which is what lets `AR-API-05` compare
  `docs/api-contract.md` against the controllers by string.
