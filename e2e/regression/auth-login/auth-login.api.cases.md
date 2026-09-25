# Login: API contract (`POST /auth/login`, `GET /auth/me`)

- **Paired spec:** `e2e/regression/auth-login/auth-login.api.spec.ts`
- **Playwright project:** `api` (the `request` fixture, `baseURL = http://127.0.0.1:3101`, no browser)
- **Tags:** `@regression`, `@auth-login`, plus `@p0` on the critical cases
- **Run:** `pnpm e2e --project=api --grep @auth-login`
- **Preconditions:**
  - Playwright starts Nest on port 3101 with `JWT_SECRET=e2e-secret`.
  - The user seed is applied at startup — checked by `e2e/smoke/seed.api.cases.md`.
  - Logins and passwords come from `e2e/fixtures/seed.ts`, tokens through
    `e2e/fixtures/auth.api.ts`. Hard-coded data in a spec is a blocker.
  - Invariant 8: `message` is an **array of strings only for `ValidationPipe` errors**; for an
    `UnauthorizedException` we throw, it is a string.

11 cases: 5 P0, 6 P1. Numbers `05`, `06`, `09` (merged into neighbours), `12`, `16`, `17`, `18` and
`19` (dropped as checks of `body-parser`, the Express router, or degenerate repeats) are **never
reused** — a gap in the numbering is normal, while reusing a number makes the history of reports
unreadable.

## Summary

| ID        | Title                                                  | Priority | Tags                          |
| --------- | ------------------------------------------------------ | -------- | ----------------------------- |
| AL-API-01 | a successful login returns a token                     | P0       | `@regression @auth-login @p0` |
| AL-API-02 | a wrong password gives 401 in the standard error shape | P0       | `@regression @auth-login @p0` |
| AL-API-03 | an unknown email gives 401 with the same message       | P0       | `@regression @auth-login @p0` |
| AL-API-04 | missing and empty fields give 400                      | P1       | `@regression @auth-login`     |
| AL-API-07 | a bad email format and a wrong password type give 400  | P1       | `@regression @auth-login`     |
| AL-API-08 | an extra field is rejected by forbidNonWhitelisted     | P1       | `@regression @auth-login`     |
| AL-API-10 | the email is case insensitive                          | P1       | `@regression @auth-login`     |
| AL-API-11 | the response carries no password                       | P0       | `@regression @auth-login @p0` |
| AL-API-13 | GET /auth/me with a valid token returns the profile    | P1       | `@regression @auth-login`     |
| AL-API-14 | GET /auth/me without a token gives 401                 | P0       | `@regression @auth-login @p0` |
| AL-API-15 | an invalid token on /auth/me gives 401, not 500        | P1       | `@regression @auth-login`     |

## Cases

### AL-API-01 — a successful login returns a token

- **Priority:** P0
- **Steps:** `POST /auth/login` with the seeded `teacher` email and password.
- **Expected:** status **200** (not 201 — invariant 1 requires `@HttpCode(HttpStatus.OK)`),
  `content-type: application/json`, and `accessToken` is a non-empty string of three dot-separated
  segments.

### AL-API-02 — a wrong password gives 401 in the standard error shape

- **Priority:** P0
- **Steps:** `POST /auth/login` with a valid email and a wrong password.
- **Expected:** status 401; the body is exactly
  `{ message: 'Invalid email or password', error: 'Unauthorized', statusCode: 401 }` with `message`
  a string; no `accessToken`; the response text contains neither `stack` nor `apps/api`.

### AL-API-03 — an unknown email gives 401 with the same message

- **Priority:** P0
- **Steps:** `POST /auth/login` with an unknown email, then with a known email and a wrong password.
- **Expected:** both give 401 and the two messages are identical (invariant 6) — the response must
  not reveal whether the account exists.

### AL-API-04 — missing and empty fields give 400

- **Priority:** P1
- **Steps:** `POST /auth/login` without a password, without an email, and with both fields empty.
- **Expected:** 400 in all three cases (validation runs before authentication, so neither 401 nor
  500 is possible); `message` is an array naming the missing field.

### AL-API-07 — an invalid email format and a wrong password type give 400

- **Priority:** P1
- **Steps:** send `email: 'not-an-email'`, then a numeric password.
- **Expected:** 400 each; the messages contain `email must be an email` and
  `password must be a string`.

### AL-API-08 — an extra field is rejected by forbidNonWhitelisted

- **Priority:** P1
- **Steps:** send a valid body plus `role: 'admin'`.
- **Expected:** 400 with `property role should not exist`, and no `accessToken` in the body.

### AL-API-10 — the email is case insensitive

- **Priority:** P1
- **Steps:** log in with the email uppercased, then call `GET /auth/me` with the token received.
- **Expected:** 200 on both; `/auth/me` returns the canonical seeded email rather than what the
  client sent.

### AL-API-11 — the response carries no password

- **Priority:** P0
- **Steps:** log in successfully and take the response **text**.
- **Expected:** the text contains neither `password` (in any case), nor the seeded password value,
  nor `scrypt`. Checked on the text because a serialized hash could hide in a nested field.

### AL-API-13 — GET /auth/me with a valid token returns the profile

- **Priority:** P1
- **Steps:** get a `teacher` token and call `GET /auth/me` with it.
- **Expected:** 200; `id` is a string, `email` matches the seed, and there is no `password` or
  `passwordHash`.

### AL-API-14 — GET /auth/me without a token gives 401

- **Priority:** P0
- **Steps:** call `GET /auth/me` with no `Authorization` header.
- **Expected:** 401 with exactly
  `{ message: 'Authentication required', error: 'Unauthorized', statusCode: 401 }` and no profile
  data.

### AL-API-15 — an invalid token on /auth/me gives 401, not 500

- **Priority:** P1
- **Steps:** call `GET /auth/me` with `Authorization: Bearer not.a.jwt`.
- **Expected:** 401 with the same body. A 500 would mean a token parsing exception reaches the
  error handler: a broken token is a refusal, not a server fault.
