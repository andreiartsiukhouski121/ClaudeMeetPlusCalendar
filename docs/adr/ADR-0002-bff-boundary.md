# ADR-0002 — The browser talks only to Next: a BFF in front of Nest

- **Status:** accepted
- **Date:** 2026-09-07
- **Supersedes:** —
- **Superseded by:** —

## Context

- `FACT-3020` The API issues a JWT. — `apps/api/src/auth/auth.service.ts`, `ADR-0003`
- `FACT-3021` Three ledger defects are about this boundary leaking: a token in the RSC stream, a
  token in the page HTML, and a request from the browser straight to `:3101`. All three were found by
  tests, none by reading the diff. — `docs/CHANGELOG.md`, "Found by"

> **Rationale — not a fact.** If the browser called Nest directly it would have to hold the token in
> JavaScript-reachable storage, and any script on the page — ours, a dependency's, an injected one —
> could read it. Keeping the token on the server side of Next leaves the browser holding only an
> opaque cookie.

## Decision

- `FACT-3022` The browser addresses only `apps/web`. — `HD-FN-11`, `SEC-FN-03`
- `FACT-3023` Every call to Nest is made server-side by `lib/api-client.ts`, the single door
  outward. — `apps/web/src/lib/api-client.ts`
- `FACT-3024` The gate for unauthenticated visitors is `src/proxy.ts`, because Next 16 deprecated
  `middleware.ts`. — invariant 9, `apps/web/src/proxy.ts`
- `FACT-3025` The proxy matcher is kept narrow so the proxy does not fire on `_next/static` and break
  the CSS. — invariant 9, `apps/web/src/proxy.ts`

Rejected:

- `FACT-3026` Client-side `fetch` with a bearer token — it ends the boundary. — this record
- `FACT-3027` A second `fetch` helper "just for this one page" — the door stops being single, and
  nothing catches the next one. — this record

## Consequences

- `FACT-3028` Every new data path needs a server-side entry point: a Server Component reading through
  `lib/dal.ts`, or a Server Action. There is no supported way for a client component to fetch. —
  `apps/web/src/lib/dal.ts`, `FACT-0021`
- `FACT-3029` The boundary is held in place by `HD-FN-11` (the browser makes no request to `:3101`),
  `SEC-FN-03` (nothing on the wire carries the token) and invariant 19 (no token as a prop into a
  client component). — `e2e/security/security.functional.spec.ts`

> **Rationale — not a fact.** Two hops per request instead of one. Acceptable: the API is on the same
> machine, and the cost shows up in run economics rather than to the user.
