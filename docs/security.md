# Security

What is protected, what checks it, and what is deliberately not done. The document is short on
purpose: everything checkable automatically lives in `e2e/security/`, not in prose.

## Running the checks

```bash
pnpm e2e:security                  # 15 cases: 10 API invariants + 5 browser ones
pnpm audit --audit-level high      # known CVEs in the dependencies
pnpm verify                        # all of it: lint + types + units + the whole e2e, security included
```

Diff-level review of a branch's changes goes through the built-in `security-review` skill. It looks
at **changes** while the automated cases hold **invariants**; neither replaces the other.

## What is protected

The application is a learning project with no database and no production deployment, so the threat
model is narrow:

| Asset              | Protected against                                                 | By what                                                                      |
| ------------------ | ----------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| User passwords     | leaking when the store or an API response is read                 | `scrypt` with a per-user salt, `timingSafeEqual`; the mapper strips the hash |
| The session        | token theft by a script on the page (XSS) and forgery             | httpOnly + sameSite=lax cookie, HS256 JWT, no token in the HTML or RSC       |
| User data          | access with another user's token, owner spoofing through the body | `ownerId` from the signed token; `forbidNonWhitelisted` on every DTO         |
| Account existence  | enumeration by response and **by response time**                  | one message plus a password verification even for an unknown email           |
| Internal structure | hints to an attacker in headers and error bodies                  | `x-powered-by` off; error bodies without stack traces or paths               |

## Invariants held by tests

`e2e/security/security.api.cases.md` and `security.functional.cases.md` carry the full wording.
Both specs walk routes and pages **from a list** (`PROTECTED_ROUTES`, `POST_ROUTES`,
`PROTECTED_PAGES`): add a protected route or page, add a line, and the check picks it up. Forget the
line and the check silently stops covering what is new — which is why it is its own item on the
acceptance checklist.

## What this suite found in live code

Three defects, none of which was visible in a diff or in a plan review:

1. **An endless redirect on an invalid cookie** (`SEC-FN-05`). `proxy.ts` by design only sees that a
   cookie **exists** and let the request through to `/`; the page got a 401 from Nest and redirected
   to `/auth/login`; the proxy saw the cookie again and sent the user back to `/` —
   `ERR_TOO_MANY_REDIRECTS`. A user with an expired or forged token was locked out and could not
   even reach the form to sign in again. The cookie cannot be erased while rendering a page
   (`cookies().delete()` throws outside a Server Action or a Route Handler), so the
   `/auth/session-expired` Route Handler was added: it erases the session, redirects to login, and
   is **outside** the proxy matcher.
2. **A timing oracle on login** (`SEC-API-05`). An unknown email answered in 52 ms, a wrong password
   in 86–114 ms: the early exit never reached `scrypt`. With a difference that size, an identical
   message is not enough — accounts get enumerated by time. The password is now always verified,
   against a dummy hash computed once at module load from a random string when the user is unknown.
3. **`X-Powered-By: Express`** on every response (`SEC-API-08`) — a free hint about which stack and
   which CVEs to try.

## Server layer coverage

Measured by the pipeline audit: coverage of `apps/api` across **all** files in `src` is 68.5% (the
stock `test:cov` reports more because it counts only imported files in the denominator). In
`apps/web` unit coverage is 26%, and for `lib/dal.ts`, `proxy.ts` and `lib/actions/*` it is **0%**.

That is not a hole but a consequence of the architecture, and it matters to know what covers it
instead. Those modules are `server-only` or Server Actions: Vitest cannot resolve them in principle
(invariant 14), so they have no units by construction. They are covered by e2e — `SEC-FN-04`,
`SEC-FN-05`, `HD-FN-01` and `HD-FN-08` go straight through `proxy.ts` and `dal.ts`, the broken
session branch included. Chasing unit coverage here would mean moving logic out of those files for a
metric rather than for readability.

## Deliberate gaps

Named explicitly, because a gap that is not stated is not a gap but a misreported result. Each is a
task of its own rather than a forgotten line.

- **No rate limiting.** `POST /auth/login` can be brute-forced without limit. Acceptable for a demo
  without a database; in a real project it is the first thing to add — and it is the only gap on
  this list I consider a production blocker.
- **No refresh tokens.** The session lives an hour, after which the user signs in again.
- **No dedicated CSRF token.** We rely on the built-in Server Action protection against cross-origin
  POSTs and on `sameSite=lax`.
- **`JWT_SECRET` has a default in the code** (with a `Logger.warn` when absent). Unacceptable for
  production; there is no production deployment here.
- **Seed passwords are plaintext** in `users.seed.ts` and hashed at startup. The store itself holds
  no plaintext. In a real project the seed file would be a migration with ready hashes.
- **The cookie token is not additionally encrypted.** It is HS256-signed, unreadable from JS and
  carries nothing but `sub` and `email`.
- **No security headers** (CSP, HSTS, `X-Frame-Options`). They make sense with real hosting and get
  added with it; on a dev server, checking them would test Next's config rather than our code.
- **Rotating `JWT_SECRET` signs everyone out** — and that now happens correctly: an invalid cookie
  is erased through `/auth/session-expired` rather than locking the user in a redirect.

## Accepted dependency advisories

Unlike the gaps above, these are not a choice about our own threat model — they are upstream CVEs
with no fix available, accepted explicitly rather than left to silently block `pnpm verify`.

- **`GHSA-vfj7-8cjw-p6xm`, `braces` (high), closing `BL-033`.** Reached only through
  `packages/eslint-config → eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch`
  — the lint toolchain, never shipped runtime code. **Patched versions: `<0.0.0`**: no release of
  `braces` exists above the vulnerable `3.0.3`, which is also `latest` on the npm registry, so there
  is no version to pin to with `overrides` (unlike the `multer` entry in `pnpm-workspace.yaml`,
  which has one). Confirmed unrelated to any change that found it: reproduces identically on
  unmodified `main`. Ignored by GHSA ID in `package.json`'s `pnpm.auditConfig.ignoreGhsas`, which is
  the only way to keep `pnpm audit --audit-level high` green until `braces` ships a patched version
  — remove the entry then, not before.
