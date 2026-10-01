# ADR-0005 — No CORS and no global prefix on the API

- **Status:** accepted
- **Date:** 2026-09-07
- **Supersedes:** —
- **Superseded by:** —

## Context

- `FACT-3080` CORS headers only matter for requests made from a browser origin. — `ADR-0002`
- `FACT-3081` The only clients of Nest are Next's server-side `fetch` and Playwright's `request`
  fixture; neither sends an `Origin` header and neither does a preflight. — `ADR-0002`,
  `apps/web/src/lib/api-client.ts`, `playwright.config.ts`
- `FACT-3082` A bare `enableCors()` answers `Access-Control-Allow-Origin: *`. — `@nestjs/common`
- `FACT-3083` A global prefix would break `SM-API-01`: `GET /` answering `Hello World!` is the
  liveness signal. — `SM-API-01`, `FACT-2018`
- `FACT-3084` The existing paths — `/`, `/auth/*`, `/meetings` — collide with nothing. — `FACT-2004`
- `FACT-3085` The reasoning sits in a comment in `main.ts` as well as in this record. —
  `apps/api/src/main.ts`

> **Rationale — not a fact.** Both `app.enableCors()` and `app.setGlobalPrefix('api')` are reflexes
> on a fresh Nest project, and both are cheap to add by accident later. Enabling CORS would make the
> API callable from any site on the internet in exchange for nothing; a prefix would push itself into
> every path, every test and every document.

## Decision

- `FACT-3086` Neither CORS nor a global prefix is enabled. — `apps/api/src/main.ts`
- `FACT-3087` `main.ts` disables the `x-powered-by` header. — `SEC-API-08`, `apps/api/src/main.ts`

## Consequences

- `FACT-3088` Route paths stay short and match the documents literally, which is what lets
  `AR-API-05` compare `docs/api-contract.md` against the controllers by string. — `AR-API-05`

> **Rationale — not a fact.** If a browser client is ever added, CORS becomes a deliberate decision
> with an explicit origin list, recorded as a new ADR — not a one-line reflex.
