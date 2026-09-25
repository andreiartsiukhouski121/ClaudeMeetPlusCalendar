# Security — functional tests

- **Spec:** `e2e/security/security.functional.spec.ts`
- **Playwright project:** `web`
- **Tags:** `@security`
- **Run:** `pnpm e2e:security` (or `pnpm e2e --project=web --grep @security`)
- **Preconditions:** the seed is applied; Playwright starts 3100/3101.

This file checks what is only visible from the browser: that the session is unreachable from page
scripts, that the token never leaks into the markup, and that protected pages really are protected.
API invariants live in the paired `security.api.cases.md`.

## Summary

| ID        | Title                                                              | Priority | Tag   |
| --------- | ------------------------------------------------------------------ | -------- | ----- |
| SEC-FN-01 | the session cookie is httpOnly, sameSite=lax, path=/, JS-invisible | P0       | `@p0` |
| SEC-FN-02 | the token never reaches the HTML, the markup or client scripts     | P0       | `@p0` |
| SEC-FN-03 | the browser never calls the API directly nor exposes the token     | P0       | `@p0` |
| SEC-FN-04 | protected pages are unreachable without a session and after logout | P0       | `@p0` |
| SEC-FN-05 | a forged session cookie grants no access                           | P0       | `@p0` |

## Cases

### SEC-FN-01 — the session cookie is httpOnly, sameSite=lax, path=/ and JS-invisible

- **Priority:** P0
- **Steps:** sign in through the UI as `teacher`, read the context cookies, then evaluate
  `document.cookie` in the page.
- **Expected:** the `ps_session` cookie exists with `httpOnly` = `true`, `sameSite` = `Lax`,
  `path` = `/`; `document.cookie` contains **neither** the name `ps_session` nor the token value.
  Duplicates `AL-FN-13` on purpose: there it is part of the login contract, here it is an invariant
  for any future page.

### SEC-FN-02 — the token never reaches the HTML, the markup or client scripts

- **Priority:** P0
- **Steps:** sign in as `teacher`, open `/`, take `page.content()` (the final HTML together with
  the serialized RSC data) and the session cookie value.
- **Expected:** the token value does not appear in the HTML, and the page text contains no
  `accessToken`, `Bearer` or `scrypt`. This catches the classic mistake — passing the token as a
  prop to a client component (invariant 19): it would travel in the RSC stream and become
  available to any script on the page.

### SEC-FN-03 — the browser never calls the API directly nor exposes the token on the wire

- **Priority:** P0
- **Steps:** start recording network requests, sign in as `teacher`, open `/`, then inspect the
  request list and their headers.
- **Expected:** no browser request is addressed to the Nest port, and no browser request carries an
  `Authorization` header. The second matters more than the first: a token header on a browser
  request would mean the BFF was bypassed even if the address matches Next's.

### SEC-FN-04 — protected pages are unreachable without a session

- **Priority:** P0
- **Steps:** in a clean context, open every protected path from `PROTECTED_PAGES`.
- **Expected:** the resulting URL is `/auth/login` every time; the page shows no email greeting and
  no meeting list. The path list is kept in the spec: add a protected page, add a line, and the
  case picks it up (invariant 16).

### SEC-FN-05 — a forged session cookie grants no access

- **Priority:** P0
- **Steps:** in a clean context set the `ps_session` cookie to `not.a.jwt` and open `/`; repeat
  with a token that is well formed but signed with a different secret.
- **Expected:** both times a redirect to `/auth/login`, with no dashboard. This checks that
  `proxy.ts` is not a guarantee: it only sees that a cookie **exists**, so validity has to be
  confirmed by the server layer (`lib/dal.ts` → `GET /auth/me`). Without it, forging a cookie would
  grant access to the page.
