# Security — API tests

- **Spec:** `e2e/security/security.api.spec.ts`
- **Playwright project:** `api`
- **Tags:** `@security`
- **Run:** `pnpm e2e:security` (or `pnpm e2e --grep @security`)
- **Preconditions:** the seed is applied (`e2e/fixtures/seed.ts`); Playwright starts 3100/3101.

These are **cross-feature invariants**, not checks of one feature. They must hold for every new
endpoint, so they live outside `e2e/regression/<feature>/` and walk the endpoints from a list: add
a protected route, add it to the list, and `SEC-API-01` starts checking it on its own
(invariant 16).

How they differ from similar cases in features: `AL-API-14` checks that `GET /auth/me` without a
token gives 401 — part of the login contract. `SEC-API-01` checks that **no** protected endpoint
answers without a token, including those that do not exist yet.

## Summary

| ID         | Title                                                          | Priority | Tag   |
| ---------- | -------------------------------------------------------------- | -------- | ----- |
| SEC-API-01 | every protected endpoint requires a token                      | P0       | `@p0` |
| SEC-API-02 | a forged signature and a junk token give 401, not 500          | P0       | `@p0` |
| SEC-API-03 | a token signed with a different secret is rejected             | P0       | `@p0` |
| SEC-API-04 | no response carries a hash, a salt or a plaintext password     | P0       | `@p0` |
| SEC-API-05 | response time does not reveal that an account exists           | P0       | `@p0` |
| SEC-API-06 | error bodies carry no stack trace, file paths or library names | P1       |       |
| SEC-API-07 | extra body fields are rejected on every POST endpoint          | P1       |       |
| SEC-API-08 | responses do not disclose the server stack (`X-Powered-By`)    | P1       |       |
| SEC-API-09 | one user's data is unreachable with another user's token       | P0       | `@p0` |
| SEC-API-10 | the repository holds no committed secrets and no `.env`        | P1       |       |

## Cases

### SEC-API-01 — every protected endpoint requires a token

- **Priority:** P0
- **Preconditions:** the protected routes are listed in the spec as `PROTECTED_ROUTES`.
- **Steps:** for each route, send a request **without** an `Authorization` header, then repeat with
  `Authorization: Bearer` carrying no value.
- **Expected:** every request gives `401`, and the body holds no payload (no `items`, no `email`,
  no `accessToken`).

### SEC-API-02 — a forged signature and a junk token give 401, not 500

- **Priority:** P0
- **Steps:** get a valid token; corrupt the last character of its signature and call a protected
  route; repeat with `not.a.jwt`, with an empty string and with the `Basic` scheme.
- **Expected:** `401` in every case. **A `500` is unacceptable**: it would mean an unhandled
  exception from token parsing reaches the error handler.

### SEC-API-03 — a token signed with a different secret is rejected

- **Priority:** P0
- **Preconditions:** Playwright passes `JWT_SECRET=e2e-secret` to the server.
- **Steps:** build an HS256 token with a valid payload signed with a **different** secret, and call
  a protected route with it.
- **Expected:** `401`. This differs from `SEC-API-02`: there the signature is broken, here it is
  arithmetically correct but foreign — the check is that the secret is verified at all.

### SEC-API-04 — no response carries a hash, a salt or a plaintext password

- **Priority:** P0
- **Steps:** walk every endpoint in its success path (login, profile, meeting list, meeting
  creation) and take the **text** of each response rather than the parsed object.
- **Expected:** no text contains `scrypt`, `passwordHash`, `password` or the seeded password value.
  The check works on text because parsing an object would miss a secret hidden in a nested field or
  in an error message.

### SEC-API-05 — response time does not reveal that an account exists

- **Priority:** P0
- **Steps:** measure `POST /auth/login` with an unknown email and with an existing email plus a
  wrong password, interleaving the samples and taking medians.
- **Expected:** the medians differ by less than a factor of three. Before the fix the measurement
  was 52 ms against 86–114 ms — a stable oracle, because an unknown email never reached `scrypt`.
  The threshold is deliberately loose: the goal is to catch a return of the early exit, not to
  measure microseconds.

### SEC-API-06 — error bodies carry no stack trace, file paths or library names

- **Priority:** P1
- **Steps:** trigger a 400 (malformed payload), a 401 (no token) and a 404 (unknown path), then
  parse the bodies.
- **Expected:** the body holds only `statusCode`, `message`, `error`. No `stack`, no `C:\` or
  `/src/`, no `node_modules`, no `at ` trace lines.

### SEC-API-07 — extra body fields are rejected on every POST endpoint

- **Priority:** P1
- **Steps:** for each POST route send a valid body plus a field absent from the DTO (`ownerId`,
  `role`, `isAdmin`).
- **Expected:** `400` with `property … should not exist`. This checks that
  `forbidNonWhitelisted` is on globally rather than in one DTO: without it an extra field is
  silently ignored, and the first attempt to assign a foreign owner becomes a question of service
  implementation.

### SEC-API-08 — responses do not disclose the server stack

- **Priority:** P1
- **Steps:** read the response headers of `GET /` and `POST /auth/login`.
- **Expected:** no `X-Powered-By` header. Express sends it by default — a free hint about which
  stack and which CVEs to try.

### SEC-API-09 — one user's data is unreachable with another user's token

- **Priority:** P0
- **Steps:** take the `teacher` and `student` tokens, request `GET /meetings?limit=100` with each
  and compare the `id` sets.
- **Expected:** the sets do not intersect; `student`'s list is empty and `teacher`'s is not.
  Duplicates `HD-API-06` on purpose: there it is part of the meetings contract, here it is an
  invariant that must hold once new resources appear.

### SEC-API-10 — the repository holds no committed secrets and no `.env`

- **Priority:** P1
- **Steps:** walk the repository files (skipping `node_modules`, `.next`, `dist`, reports) and
  check their content for signs of secrets.
- **Expected:** no `.env` files (other than `.env.example`), no private keys
  (`BEGIN … PRIVATE KEY`), no strings resembling a real JWT (three dot-separated base64 segments
  over 80 characters). The check is filesystem-based rather than network-based, which is why it
  lives in the `api` project that starts no browser.
