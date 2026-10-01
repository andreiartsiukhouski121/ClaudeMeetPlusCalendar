# ADR-0004 — The session is checked three times, not once

- **Status:** accepted
- **Date:** 2026-09-07
- **Supersedes:** —
- **Superseded by:** —

## Context

- `FACT-3060` Next's proxy layer sees the request, not the API: it can tell that a cookie is present,
  never that the token inside it is valid, not expired and signed by us. — invariant 10,
  `apps/web/src/proxy.ts`

> **Rationale — not a fact.** `proxy.ts` looks like the place where access is decided — it runs
> before the page and can redirect. Treating it as the gate makes a forged cookie enough to render a
> page.

## Decision

Three checks, each with a different job, and none of them removable:

- `FACT-3061` **`proxy.ts`** — optimistic. Cookie present? No: bounce a `GET` to `/auth/login`. —
  invariant 9, `apps/web/src/proxy.ts`
- `FACT-3062` The proxy bounce is `GET`-only, because redirecting a POST would break Server
  Actions. — invariant 9, `apps/web/src/proxy.ts`
- `FACT-3063` **`lib/dal.ts`** — the real read-path check: it calls the API with the token, and a 401
  means the session is gone and the visitor is sent through `/auth/session-expired`. — invariant 17,
  `apps/web/src/lib/dal.ts`
- `FACT-3064` **Inside every Server Action** — the real write-path check. A Server Action is a public
  POST endpoint and can be invoked without ever passing through a page render. — invariant 10,
  `apps/web/src/lib/actions`

Rejected:

- `FACT-3065` Checking only in the proxy — a forged cookie passes. — this record
- `FACT-3066` Checking only in the DAL — mutations bypass it. — this record
- `FACT-3067` A single shared `requireSession()` wrapper called from one place — there is no one
  place; those are three different entry points. — this record

> **Rationale — not a fact.** The proxy check is UX: it keeps a signed-out visitor from seeing a
> flash of a broken page.

## Consequences

- `FACT-3068` Every new Server Action carries its own session check. — invariant 10
- `FACT-3069` Every new protected page is added to `PROTECTED_PAGES` and every new guarded route to
  `PROTECTED_ROUTES`; those two lists are the only thing connecting the cross-feature security suite
  to a growing application. — invariant 16, `e2e/security/security.api.spec.ts`,
  `e2e/security/security.functional.spec.ts`
- `FACT-3070` The three checks are held together by `SEC-FN-04` and `SEC-FN-05`, which walk the lists
  rather than naming pages one by one. — `e2e/security/security.functional.spec.ts`

> **Rationale — not a fact.** Three checks means three chances for them to disagree, which is what
> the two list-walking cases are there to catch.
