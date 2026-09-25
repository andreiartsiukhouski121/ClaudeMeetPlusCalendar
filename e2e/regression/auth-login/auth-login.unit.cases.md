# Login: unit cases (Vitest)

- **This file has no paired spec** — unit specs live next to the code in `apps/**`, and this is the
  feature map: which case is covered by which spec.
- **Run:** `pnpm test:auth-login` (that is `pnpm -r test -t "AL-UT-"`); everything: `pnpm test`.
- **Mandatory rule:** a unit test title starts with its case ID — `it('AL-UT-09 — …')`. Without it
  the `vitest -t "AL-UT-"` filter cannot select the feature, and meta-test rule 7 cannot verify the
  case is automated.
- **Grouping:** every group below starts with a line carrying the **spec path**; the meta-test
  checks the path exists and that every ID listed under it appears in that file.

28 cases, all automated: 19 in `apps/api` and 9 in `apps/web`. Cases `29` and `30` were filed as a
fix task after accepting feature 1 (password trimming), not by the original plan; `31` came from
the timing fix. Numbers `12`, `16` and `18` are **never reused**.

## Summary

| ID       | Priority | What it checks                                               | Where automated     |
| -------- | -------- | ------------------------------------------------------------ | ------------------- |
| AL-UT-01 | P0       | `login` returns `accessToken` and a `user` without a hash    | `AuthService`       |
| AL-UT-02 | P0       | wrong password → `UnauthorizedException`                     | `AuthService`       |
| AL-UT-03 | P0       | unknown email → the same exception and the same message      | `AuthService`       |
| AL-UT-04 | P0       | the token comes from the token service, not string building  | `AuthService`       |
| AL-UT-05 | P1       | the email is normalized before the user lookup               | `AuthService`       |
| AL-UT-06 | P0       | the password is checked against the stored hash              | `AuthService`       |
| AL-UT-07 | P1       | the token payload is only `sub` and `email`                  | `AuthService`       |
| AL-UT-08 | P2       | a storage failure does not become a 401                      | `AuthService`       |
| AL-UT-31 | P0       | an unknown email still verifies a password (flat timing)     | `AuthService`       |
| AL-UT-09 | P0       | the `scrypt$salt$key` format and a unique salt               | `common/crypto`     |
| AL-UT-10 | P0       | `verifyPassword` on the right password → `true`              | `common/crypto`     |
| AL-UT-11 | P0       | a wrong password and a broken hash → `false`, no throw       | `common/crypto`     |
| AL-UT-13 | P0       | round trip `verify(sign(payload))`                           | `TokenService`      |
| AL-UT-14 | P0       | a tampered signature is rejected                             | `TokenService`      |
| AL-UT-15 | P1       | an expired token is rejected                                 | `TokenService`      |
| AL-UT-17 | P0       | `findByEmail` ignores case and edge whitespace               | `UsersService`      |
| AL-UT-19 | P0       | the public mapping carries no `passwordHash`                 | `UsersService`      |
| AL-UT-20 | P0       | session cookie options in development                        | `session-cookie`    |
| AL-UT-21 | P0       | `secure: true` in production                                 | `session-cookie`    |
| AL-UT-22 | P1       | the cookie lifetime matches `JWT_EXPIRES_IN`                 | `session-cookie`    |
| AL-UT-23 | P0       | `resolveApiUrl` never produces a double slash                | `api-client`        |
| AL-UT-24 | P1       | `resolveApiUrl` honours `API_URL` from the environment       | `api-client`        |
| AL-UT-25 | P1       | the default API base is `http://127.0.0.1:3001`              | `api-client`        |
| AL-UT-26 | P0       | `ApiError.message` normalizes from a string and an array     | `api-client`        |
| AL-UT-27 | P0       | the guard puts only `id` and `email` on `request.user`       | `JwtAuthGuard`      |
| AL-UT-28 | P0       | no header / non-`Bearer` / broken token → one rejection      | `JwtAuthGuard`      |
| AL-UT-29 | P0       | the email is trimmed, the password stays byte for byte       | `login-credentials` |
| AL-UT-30 | P1       | empty fields are detected; a spaces-only password is not one | `login-credentials` |

## `apps/web/src/lib/session.spec.ts`

Tests `apps/web/src/lib/session-cookie.ts` — a pure module without `server-only` and without
`next/headers`. `session.ts` itself has no units: Next aliases `server-only` to a package Vitest
cannot resolve (invariant 14).

- `AL-UT-20` P0 — `buildSessionCookieOptions('development')` gives `httpOnly: true`, `path: '/'`,
  `sameSite: 'lax'`, `secure: false`. False specifically: an unconditional `secure: true` would
  break the check in any environment where loopback is not trustworthy (invariant 12).
- `AL-UT-21` P0 — `buildSessionCookieOptions('production')` gives `secure: true`, with the other
  options unchanged (compared against the whole development set, not field by field).
- `AL-UT-22` P1 — `SESSION_MAX_AGE_SECONDS` is 3600 and matches `JWT_EXPIRES_IN = '1h'`: drift
  between the two gives "session alive, token expired".

## `apps/web/src/lib/api-client.spec.ts`

No network calls — `apiFetch` is covered end to end by e2e; the units close pure URL joining and
error text normalization. Edits to `process.env.API_URL` are rolled back in `finally`: it is a
process variable shared by every test in the file.

- `AL-UT-23` P0 — `resolveApiUrl` joins a base with and without a trailing slash into a single
  slash, never `//` (a path without a leading slash included).
- `AL-UT-24` P1 — `resolveApiUrl` honours `API_URL` from the process environment: this is exactly
  how Playwright wires Next on 3100 to Nest on 3101.
- `AL-UT-25` P1 — without `API_URL` the base is `http://127.0.0.1:3001`.
- `AL-UT-26` P0 — `ApiError.message` normalizes from **both** Nest body shapes: a string (401) and
  an array of strings (400 from `ValidationPipe`). Without it the user sees `[object Object]`; a
  body with no `message` yields a message built from the status.

## `apps/api/src/auth/auth.service.spec.ts`

Dependencies are passed as mocks through the constructor, without `Test.createTestingModule`: a
unit needs mocks, not a container.

- `AL-UT-01` P0 — `login` with a valid email and password returns `{ accessToken, user }` where
  `user` has no `passwordHash` (and the serialized response has no `scrypt`).
- `AL-UT-02` P0 — `login` with a wrong password throws `UnauthorizedException` with the
  invalid-credentials message.
- `AL-UT-03` P0 — `login` with an unknown email throws **the same** exception with **the same**
  message. The two messages are compared with each other rather than each against a constant.
- `AL-UT-04` P0 — `accessToken` comes from the token service (the mock is called once and its value
  is returned) rather than being assembled in the service.
- `AL-UT-05` P1 — the email is normalized (`trim` + `toLowerCase`) **before** the user lookup: the
  `findByEmail` mock receives the canonical email.
- `AL-UT-06` P0 — the password is compared by the verify function against the stored hash, never
  against plaintext. This also covers the `PasswordService` delegation, which is why the wrapper
  has no spec of its own.
- `AL-UT-07` P1 — the token payload holds exactly `sub` and `email` and no password hash.
- `AL-UT-08` P2 — a storage failure propagates as is rather than becoming a 401: otherwise an
  outage looks like a wrong password.
- `AL-UT-31` P0 — an unknown email still runs a password verification against a real-format dummy
  hash, so the response time stays flat (invariant 18).

## `apps/api/src/common/crypto/password.spec.ts`

The spec sits with the implementation rather than with `PasswordService`: that service is a
one-line DI wrapper, and its own spec would test the wrapper instead of the behaviour.

- `AL-UT-09` P0 — `hashPassword(plain)` differs from `plain`, has the format
  `scrypt$<saltHex>$<keyHex>` (32 hex characters of salt, 128 of key), and two calls with one
  password give **different** strings that both pass `verifyPassword`.
- `AL-UT-10` P0 — `verifyPassword(plain, hashPassword(plain))` → `true`.
- `AL-UT-11` P0 — `verifyPassword('other', hash)` → `false`; an empty string, a foreign format and
  a truncated hash also give `false`, **without throwing**.

## `apps/api/src/auth/token.service.spec.ts`

`JwtService` is built by hand with its own secret: a unit must not depend on `AuthModule`'s
configuration.

- `AL-UT-13` P0 — round trip: `verify(sign(payload))` returns the original `sub` and `email`.
- `AL-UT-14` P0 — `verify` throws on a token with a tampered signature (`invalid signature`).
- `AL-UT-15` P1 — an expired token is rejected (a past `expiresIn` rather than fake timers:
  `jsonwebtoken` checks against real time).

## `apps/api/src/users/users.service.spec.ts`

- `AL-UT-17` P0 — `findByEmail` ignores case and edge whitespace; an unknown email gives
  `undefined`, and a found user carries the canonical seeded email.
- `AL-UT-19` P0 — the public mapping (`toPublic`) holds exactly `id`, `email`, `name` and no
  `passwordHash`.

## `apps/api/src/auth/jwt-auth.guard.spec.ts`

The guard is ~25 lines of **our** security-relevant code, and its e2e duplicates were dropped as
degenerate. Header parsing is cheapest to check with a unit.

- `AL-UT-27` P0 — with `Authorization: Bearer <valid token>` the guard returns `true` and puts
  `{ id, email }` from the payload on `request.user`; no `passwordHash` there.
- `AL-UT-28` P0 — with a missing header, a non-`Bearer` scheme, an empty token and an unparseable
  token the guard throws the same `UnauthorizedException` — one rejection branch for every case, a
  500 is unacceptable, and `request.user` stays empty.

## `apps/web/src/lib/login-credentials.spec.ts`

Filed as a **fix task** after accepting feature 1, not by the original plan. Acceptance found that
`loginAction` trimmed not only the email but the password too: a password with an edge space
silently became a different password and its owner could never sign in. NIST SP 800-63B explicitly
forbids modifying or truncating a submitted password. `FormData` parsing was extracted into a pure
function precisely to make the rule checkable — a Server Action cannot be unit tested.

- `AL-UT-29` P0 — `readLoginCredentials` trims `email` and leaves `password` untouched: no `trim`,
  no inner whitespace normalization.
- `AL-UT-30` P1 — missing fields give empty strings and count as empty; a password of only spaces
  does **not** count as empty — whether it fits is the server's call, not the form's.
