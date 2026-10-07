# Security — functional tests

- **Spec:** `e2e/security/security.functional.spec.ts`
- **Playwright project:** `web`
- **Tags:** `@security`
- **Run:** `pnpm e2e:security` (or `pnpm e2e --project=web --grep @security`)
- **Preconditions:**
  - The seed is applied; Playwright starts 3100/3101.
  - **`PROTECTED_PAGES` is the list every page-walking case here reads**, and a page added to it is
    covered by all of them at once — that is the only thing connecting this suite to a growing
    application (invariant 16). A case that opens one path directly while that list sits beside it
    is **scope narrower than subject**: it reads as an invariant and behaves as a single-page check,
    so a new page joins the list, passes the reachability case, and is asserted by nothing else.
    `SEC-FN-02` and `SEC-FN-03` were written that way and have been generalised; the same mistake
    in the accessibility suite left an authenticated page looking audited while nothing scanned it.

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
- **Steps:** sign in as `teacher`, then for **every** path in `PROTECTED_PAGES` open it and take
  `page.content()` — the final HTML together with the serialized RSC data — alongside the session
  cookie value.
- **Expected:** on every one of those pages the token value does not appear in the HTML, and the
  page text contains no `accessToken`, `Bearer` or `scrypt`. The failure message names the path, or
  a run covering several pages says only that something leaked somewhere.
- **Why it walks the list rather than opening `/`:** this catches the classic mistake — passing the
  token as a prop to a client component (invariant 19), where it travels in the RSC stream and
  becomes available to any script on the page. That mistake is made **when a page is written**, so
  asserting it against the one page that existed when the case was written is the least useful
  place to spend it. The meeting detail page renders server-fetched file metadata, links carrying
  file ids and a form bound to a Server Action — exactly the shape that leaks — and until this case
  read the list it was covered for reachability by `SEC-FN-04` and for leakage by nothing.

### SEC-FN-03 — the browser never calls the API directly nor exposes the token on the wire

- **Priority:** P0
- **Steps:** start recording network requests, sign in as `teacher`, then visit **every** path in
  `PROTECTED_PAGES` in turn, and inspect the accumulated request list and their headers.
- **Expected:** no browser request is addressed to the Nest port, and no browser request carries an
  `Authorization` header; the recorded list is not empty, which proves the recording worked. The
  second assertion matters more than the first: a token header on a browser request would mean the
  BFF was bypassed even if the address matches Next's. Walking the list is what makes this an
  invariant — a page that fetches its own data from Nest, or a download link pointed straight at
  `:3101`, is a per-page mistake and has to be checked per page (`ADR-0002`).

### SEC-FN-04 — protected pages are unreachable without a session

- **Priority:** P0
- **Steps:** in a clean context, open every protected path from `PROTECTED_PAGES`.
- **Expected:** the resulting URL is `/auth/login` every time; the page shows no email greeting and
  no meeting list. The path list is kept in the spec: add a protected page, add a line, and the
  case picks it up (invariant 16).
- **Known weakness, stated so nobody assumes it away:** the two negative markers are
  **dashboard-specific**. On a page that is not the dashboard — `/meetings/<id>`, say — there is no
  email greeting and no meeting list whatever happens, so there the case rests on its URL assertion
  alone. That is right today for a reason that does not generalise: it would not notice a page that
  rendered its own protected content and _then_ redirected. A per-page marker, or an assertion that
  the protected page's own heading is absent, is what would close it.

### SEC-FN-05 — a forged session cookie grants no access

- **Priority:** P0
- **Steps:** in a clean context set the `ps_session` cookie to `not.a.jwt` and open `/`; repeat
  with a token that is well formed but signed with a different secret.
- **Expected:** both times a redirect to `/auth/login`, with no dashboard. This checks that
  `proxy.ts` is not a guarantee: it only sees that a cookie **exists**, so validity has to be
  confirmed by the server layer (`lib/dal.ts` → `GET /auth/me`). Without it, forging a cookie would
  grant access to the page.
