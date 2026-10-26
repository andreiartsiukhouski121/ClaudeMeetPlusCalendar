# Security

What is protected, what checks it, and what is deliberately not done. The document is short on
purpose: everything checkable automatically lives in `e2e/security/`, not in prose.

## Running the checks

```bash
pnpm e2e:security                  # 16 cases: 11 API invariants + 5 browser ones
pnpm audit --audit-level high      # known CVEs in the dependencies
pnpm verify                        # all of it: lint + types + units + the whole e2e, security included
```

Diff-level review of a branch's changes goes through the built-in `security-review` skill. It looks
at **changes** while the automated cases hold **invariants**; neither replaces the other.

## What is protected

The application is a learning project with no production deployment and a database that lives in a
local container, so the threat model is narrow:

| Asset              | Protected against                                                      | By what                                                                                                                   |
| ------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| User passwords     | leaking when a row or an API response is read                          | `scrypt` with a per-user salt, `timingSafeEqual`; the mapper strips the hash                                              |
| The session        | token theft by a script on the page (XSS) and forgery                  | httpOnly + sameSite=lax cookie, HS256 JWT, no token in the HTML or RSC                                                    |
| User data          | access with another user's token, owner spoofing through the body      | `ownerId` from the signed token; `forbidNonWhitelisted` on every DTO                                                      |
| Account existence  | enumeration by response and **by response time**                       | one message plus a password verification even for an unknown email                                                        |
| Internal structure | hints to an attacker in headers and error bodies                       | `x-powered-by` off; error bodies without stack traces or paths                                                            |
| Uploaded files     | hostile bytes served back, response-header injection, unbounded growth | an allow-list, a size ceiling, a per-meeting cap, `attachment` + `nosniff`, and a built `Content-Disposition` — see below |

## Invariants held by tests

`e2e/security/security.api.cases.md` and `security.functional.cases.md` carry the full wording.
Both specs walk routes and pages **from a list** (`PROTECTED_ROUTES`, `POST_ROUTES`,
`PROTECTED_PAGES`): add a protected route or page, add a line, and the check picks it up. Forget the
line and the check silently stops covering what is new — which is why it is its own item on the
acceptance checklist. Only `PROTECTED_ROUTES` is compared against the controllers by a check
(`AR-API-06`); `PROTECTED_PAGES`, `POST_ROUTES` and `AUDITED_PAGES` are kept by hand, and nothing
fails when one of them is out of date.

## What this suite found in live code

Four defects, none of which was visible in a diff or in a plan review:

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
4. **A stored filename interpolated into a response header** (`SEC-API-11`). The download controller
   built `Content-Disposition` by interpolating the stored `filename`, and two seeded rows holding
   a CR LF pair in that column answered **500** instead of streaming their bytes. No injected header ever reached the
   wire — but only because Node's own `setHeader` validator throws on a forged value, which is a
   defence this code does not own: a different adapter, a raw `writeHead`, or a future sanitiser that
   strips and continues instead of throwing would all lose it. The header is now **built** from the
   stored value in three steps rather than interpolated, every stored value answers 200, and the
   transferable part is the asymmetry that produced the bug: **the `filename` column has more than
   one writer.** The upload route validates what it admits; the seed writes rows the upload route
   would have refused. **A read path validates its own output rather than inheriting the write path's
   guarantees** — the next read path added here is held to the same rule.

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

## File uploads

`POST /meetings/:id/files` is the only route that accepts bytes and
`GET /meetings/:id/files/:fileId/content` the only one that returns them. Five controls bound what
that costs, and one of them is the actual security control rather than a usability guard:

- **A per-file ceiling of 1 048 576 bytes**, enforced by the file interceptor's own `limits.fileSize`
  rather than by arithmetic of ours, so the `413` is the framework's.
- **A cap of ten files per meeting**, so one meeting cannot hold files without bound; deleting a
  file frees a slot. The check is a count followed by an insert rather than a transaction: the contract promises
  the refusal, not an exact ceiling under concurrency.
- **An allow-list of four media types** — PDF, PNG, JPEG, plain text — compared after normalization,
  and it is the normalized value that is stored, never the client's raw header. This is a
  **usability guard, not a security control**: the declared type comes from the client, and above the
  multipart parser it is not merely untrusted but _not observable_ — `busboy` initialises an absent,
  empty or unparseable part type to the literal `text/plain`, so "declared nothing" and "declared
  text/plain" are the same string by the time any rule of ours runs.
- **`Content-Disposition: attachment` plus `X-Content-Type-Options: nosniff` on every download**,
  never `inline`. That pair is the security control: a stored file must not be able to execute in the
  application's own origin, whatever it claimed to be on the way in.
- **A built `Content-Disposition`**, for the reason the fourth defect above records: the `filename`
  column has more than one writer, so the read path validates its own output.

**There is no content scanning.** Nothing inspects the bytes for malware, archives, embedded scripts
or a magic number that disagrees with the declared type. The allow-list is about what the UI can
usefully show; the bytes are treated as opaque and served as an attachment because they are not
trusted.

## Deliberate gaps

Named explicitly, because a gap that is not stated is not a gap but a misreported result. Each is a
task of its own rather than a forgotten line.

- **No rate limiting.** `POST /auth/login` can be brute-forced without limit, and nothing bounds how
  often an authenticated user may upload. Acceptable for a demo; in a real project it is the first
  thing to add — and it is the only gap on this list I consider a production blocker.
- **No refresh tokens.** The session lives an hour, after which the user signs in again.
- **No dedicated CSRF token.** We rely on the built-in Server Action protection against cross-origin
  POSTs and on `sameSite=lax`.
- **`JWT_SECRET` has a default in the code** (with a `Logger.warn` when absent). Unacceptable for
  production; there is no production deployment here.
- **Seed passwords are plaintext** in `users.seed.ts` and hashed by the seed script before the row
  is written. The database itself holds no plaintext. In a real project the seed file would be a
  migration with ready hashes (`BL-004`).
- **The Server Action body limit is raised to `2mb` for every action.**
  `experimental.serverActions.bodySizeLimit` has no per-action form, so raising it so that an upload
  meets the API's documented `413` rather than Next's undocumented one also raises it for
  `loginAction`, which is reachable **unauthenticated**. The body an anonymous visitor can make Next
  buffer therefore goes from 1 MiB to 2 MiB. Accepted rather than overlooked: it doubles a constant
  in a demo with no rate limiting at all, and the gap above it is the one that matters.
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
- **`GHSA-q7qp-rjg7-q26m`, `multer` (high), accepted by the owner on 2026-10-26 (`CH-039`).** A
  denial of service through a pending **asynchronous `fileFilter`** after the request is torn down;
  patched in `2.5.0`. Unlike `braces` a fix exists, but `multer` is pinned to exactly `2.3.0` by
  `FX-043`: from `2.4.0` its "Unexpected field" message changed, and `@nestjs/platform-express`
  matches that message by exact equality, so a wrong field name answers `500` instead of the
  contracted `400`. The vulnerable path is not reached here: the only `FileInterceptor`
  (`meeting-files.controller.ts`) passes `limits` and no `fileFilter`. This is an argument, not a
  test. Ignored by GHSA ID in `pnpm.auditConfig.ignoreGhsas`; revisit — and remove the entry — when
  any `fileFilter` is added, or when the 400 mapping no longer depends on the message text
  (`BL-075`).
