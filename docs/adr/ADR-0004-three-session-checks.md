# ADR-0004 — The session is checked three times, not once

- **Status:** accepted
- **Date:** 2026-09-07
- **Supersedes:** —
- **Superseded by:** —

## Context

`proxy.ts` looks like the place where access is decided: it runs before the page and can redirect.
It is not. Next's proxy layer sees the request, not the API — it can tell that a cookie is present,
never that the token inside it is valid, not expired and signed by us. Treating it as the gate makes
a forged cookie enough to render a page.

## Decision

Three checks, each with a different job, and none of them removable:

1. **`proxy.ts`** — optimistic. Cookie present? No: bounce a `GET` to `/auth/login`. This is UX: it
   keeps a signed-out visitor from seeing a flash of a broken page. The bounce is `GET`-only,
   because redirecting a POST would break Server Actions.
2. **`lib/dal.ts`** — the real read-path check. It calls the API with the token; a 401 means the
   session is gone, and the visitor is sent through `/auth/session-expired`.
3. **Inside every Server Action** — the real write-path check. A Server Action is a public POST
   endpoint: it can be invoked without ever passing through a page render, so nothing upstream has
   necessarily run.

Rejected: checking only in the proxy (a forged cookie passes); checking only in the DAL (mutations
bypass it); a single shared `requireSession()` wrapper called from one place (there is no one place
— those are three different entry points).

## Consequences

- Every new Server Action carries its own session check. Reviewers look for it by default, and
  invariant 10 names it.
- Every new protected page is added to `PROTECTED_PAGES`, every new guarded route to
  `PROTECTED_ROUTES` (invariant 16) — the two lists are the only thing connecting the cross-feature
  security suite to a growing application.
- Three checks means three chances for them to disagree. They are held together by `SEC-FN-04` and
  `SEC-FN-05`, which walk the lists rather than naming pages one by one.
