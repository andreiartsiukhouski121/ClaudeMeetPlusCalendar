# ADR-0002 — The browser talks only to Next: a BFF in front of Nest

- **Status:** accepted
- **Date:** 2026-09-07
- **Supersedes:** —
- **Superseded by:** —

## Context

The API issues a JWT. If the browser called Nest directly it would have to hold that token in
JavaScript-reachable storage, and any script on the page — ours, a dependency's, an injected one —
could read it. The alternative is to keep the token on the server side of Next and let the browser
hold only an opaque cookie.

This is not theoretical here: three ledger defects are about exactly this boundary leaking — a token
in the RSC stream, a token in the page HTML, a request from the browser straight to `:3101`. All
three were found by tests, none by reading the diff.

## Decision

The browser addresses **only** `apps/web`. Every call to Nest is made server-side by
`lib/api-client.ts`, the single door outward. The gate for unauthenticated visitors is `src/proxy.ts`
— Next 16 deprecated `middleware.ts` — and its matcher is kept narrow so the proxy does not fire on
`_next/static` and break the CSS.

Rejected: client-side `fetch` with a bearer token (it ends the boundary); a second `fetch` helper
"just for this one page" (the door stops being single, and nothing catches the next one).

## Consequences

- Every new data path needs a server-side entry point: a Server Component reading through
  `lib/dal.ts`, or a Server Action. There is no supported way for a client component to fetch.
- Two hops per request instead of one. Acceptable: the API is on the same machine, and the cost
  shows up in run economics rather than to the user.
- Held in place by `HD-FN-11` (the browser makes no request to `:3101`), `SEC-FN-03` (nothing on the
  wire carries the token) and invariant 19 (no token as a prop into a client component).
