# ADR-0036 — Each flow is driven through the UI once; every other test goes through an e2e API layer

- **Status:** accepted
- **Date:** 2026-10-21
- **Supersedes:** —
- **Superseded by:** —
- **Note:** `FACT-3759` was revised before this record's first commit, because the change removed
  the global-setup warm-up and with it the rule's warm-up allowance; `ADR-0022` applies from first
  commit.

## Context

- `FACT-3747` Every functional spec reaches a session through a UI login today: four through the
  `authedPage` fixture, which signs in through the form once per worker per user and saves the
  state, and `auth-login.functional.spec.ts` inline. —
  `e2e/fixtures/auth.fixture.ts`, `docs/plans/e2e-test-architecture/research/tests.md`
- `FACT-3748` Outside that fixture, the form is submitted with valid credentials by `AL-FN-02`,
  `AL-FN-13`, `HD-FN-11`, `MF-FN-09` and the global-setup warm-up. — `e2e/fixtures/warm-up.ts`,
  `docs/plans/e2e-test-architecture/research/tests.md`
- `FACT-3749` The fixture gives one reason for a UI login: a cookie built by hand "would duplicate
  production session logic and go red or green at the wrong moments". —
  `e2e/fixtures/auth.fixture.ts`
- `FACT-3750` `apps/web` sets its session cookie with a 3600-second `maxAge`; the cookie's name and
  value, its flags and its lifetime rule are `FACT-3041`, `FACT-3042`, `FACT-3043` and
  `FACT-3044`. — `apps/web/src/lib/session-cookie.ts`, `ADR-0003`
- `FACT-3751` In probe P1 a cookie built from the `accessToken` of `POST /auth/login` matched the
  cookie the UI login set on name, domain, path, flags, lifetime and value shape, and `GET /` with
  it rendered the dashboard. The probe ran once at one commit; it did not test drift over time. —
  `docs/plans/e2e-test-architecture/research/probes.md`
- `FACT-3752` No fact, ADR or invariant requires a test to sign in through the UI, and none forbids
  a test from setting the cookie. — `docs/plans/e2e-test-architecture/research/contract.md`
- `FACT-3753` The suite's API helpers sit beside its Playwright fixtures in `e2e/fixtures/`
  (`auth.api.ts`, `cleanup.api.ts`, `multipart.ts`); no other helper directory exists under `e2e/`.
  — `docs/plans/e2e-test-architecture/research/code.md`

> **Rationale — not a fact.** A UI login in every browser test makes the sign-in flow a
> precondition of fifty cases whose subject is something else, so a regression in sign-in fails
> them all at once and the one case about sign-in is lost in the noise. The fixture's worry is
> real, but it is a worry about drift, and drift is caught by comparing the two cookies on every
> run rather than by never building one.

## Decision

- `FACT-3754` Every user flow is driven through the UI once, in the case whose subject it is, apart
  from the exceptions this record names; any other test reaches the state it needs through API
  calls the test makes. — this record
- `FACT-3755` Within `e2e/regression/auth-login/`, a sign-in through the form succeeds in exactly
  one case, `AL-FN-13`, which absorbs `AL-FN-02`; the other functional cases there submit the form
  only to be refused, and `ACC-FN-03` submits a wrong password only to scan the error state. — this
  record, `AL-FN-13`
- `FACT-3806` Outside `e2e/regression/auth-login/`, exactly two tests sign in through the form:
  `MF-FN-09`, whose subject includes signing in again after the session-expired hop, and
  `SEC-FN-01`, whose subject is the flags the application itself sets on `ps_session`. Each signs
  in as the pool user it holds, keeps its expectations, and carries the Playwright tag
  `@ui-login`; no other test carries that tag. — the owner's answer of 2026-10-23, this record
- `FACT-3756` A browser session a case does not sign in for is the `accessToken` of
  `POST /auth/login`, placed in the browser context by one cookie builder in the suite: name
  `ps_session`; value the token unchanged; origin the web project's base URL, so domain `127.0.0.1`
  and path `/`; `httpOnly` true; `secure` false; `sameSite` `Lax`; expiry 3600 s after it is built.
  — this record, `ADR-0003`
- `FACT-3757` `AL-FN-13` guards that builder. After the real sign-in it builds a cookie for the same
  user with the same builder and fails unless name, domain, path, `httpOnly`, `secure` and
  `sameSite` are equal, the two expiries are within 5 s of each other, and both values are three
  base64url segments whose payloads carry the same `sub` and `email`. — this record, `AL-FN-13`
- `FACT-3758` The suite's calls to the API live in `e2e/api/`, one module per API domain — `auth`,
  `meetings`, `meeting-files` — plus the cleanup tracker that spans them. `e2e/fixtures/` keeps the
  Playwright fixtures, the seed mirror, the console filter and the global setup and teardown. —
  this record
- `FACT-3759` A suite-integrity rule fails on any `*.functional.spec.ts` outside
  `e2e/regression/auth-login/`, and on any `.ts` under `e2e/fixtures/` other than `seed.ts`, that
  reads the seed password — a `.password` member access, a `password` binding in a destructuring
  pattern, the seed mirror's password constant, or its literal. A read is allowed only inside the
  function passed to a `test` call tagged `@ui-login`, the call bounded by parsing the file with the
  TypeScript compiler API. The rule also fails when `@ui-login` appears in a file that is not a
  `*.functional.spec.ts`, when the case IDs opening the titles of the tagged tests differ from those
  `FACT-3806` names, and when a `*.functional.spec.ts`
  in its scope holds no `test` call it can find or imports or declares `test` under another name,
  since a read in such a file could not be bounded; a spec takes `test` by that name from
  `e2e/fixtures/suite.ts`, the one module that composes the fixture sets, whose own aliasing is
  outside the rule's alias check. `*.api.spec.ts` files and
  `e2e/api/` are outside its scope: they sign in through the API, which needs the password. — this
  record, `e2e/suite-integrity.api.spec.ts`, `docs/plans/e2e-test-architecture/research/probes.md`
- `FACT-3802` `e2e/suite-integrity.api.spec.ts` holds the suite rules — the filename suffixes, the
  `.cases.md` pairing, ID uniqueness and, from this record and `ADR-0037`, the seed-password rule
  and the test-shape rule — and the file's own header is the one place that counts them. —
  `e2e/suite-integrity.api.spec.ts`, this record, `ADR-0037`

Rejected:

- `FACT-3760` A UI login per worker and user, as today — it keeps sign-in a precondition of every
  browser case, and sign-in is where the web project's load failures clustered. — `FX-052`,
  `e2e/fixtures/auth.fixture.ts`
- `FACT-3761` Importing the cookie options from `apps/web` into the suite — the name and flags
  would follow production, but the translation into a browser cookie and the value's shape would
  still be the suite's, and a guard comparing one function with itself notices nothing. — this
  record
- `FACT-3762` A setup project that signs in through the form once per user and saves the state —
  it keeps a UI login per user outside the case that checks login, which is what this record
  removes. — this record
- `FACT-3763` Keeping the API helpers in `e2e/fixtures/` — the password rule needs a directory to
  name, and a directory holding both fixtures and plain API clients cannot be named for either. —
  this record
- `FACT-3807` Exempting `MF-FN-09` and `SEC-FN-01` from the password rule by file, by line number
  or by a marker comment — a file exemption lets every other case in `meeting-files` and `security`
  read the password, a line number moves with any edit above it, and a comment binds to no test;
  a tag is part of the test call the parser bounds, and Playwright already reads it. — this record,
  `docs/plans/e2e-test-architecture/research/probes.md`

## Consequences

- `AL-FN-02` leaves the suite. `HD-FN-11`, `SEC-FN-02` and `SEC-FN-03` keep their expectations and
  lose the sign-in from their steps; the sign-in traffic `HD-FN-11` and `SEC-FN-03` used to record
  is asserted by `AL-FN-13` instead.
- `MF-FN-09` and `SEC-FN-01` keep a real sign-in, so `FACT-3042` keeps `SEC-FN-01` as its source:
  that case still reads the flags the application set, not the builder's.
- `e2e/fixtures/auth.fixture.ts` and its reason for a UI login go; the reason is answered by the
  guard in `AL-FN-13`, which goes red on the first run after the application's cookie and the
  builder's diverge on any compared field.
- What the guard does not compare it cannot catch: a cookie the server would refuse for a reason
  that leaves name, flags, expiry and payload keys alone would surface as every browser case failing
  rather than as `AL-FN-13`.
- A helper that reads the password and is called from a tagged test is still a hit: the read has to
  sit inside the tagged test itself, which keeps an exception from spreading through a shared
  function.
- The warm-up measurement ran and removed the global-setup warm-up, and its form sign-in with it;
  the rule's warm-up allowance was removed at the same time, so `FACT-3759` names no allowance
  beyond the tagged test.
- `ADR-0010`'s suite-rule count fact is retired into a `## Retired facts` register in that record,
  with `FACT-3802` as its successor.

> **Rationale — not a fact.** The rule is stated over the password rather than over clicks on the
> `Sign in` button because the button is also pressed by every negative case, and a successful
> sign-in is impossible without the one secret every seed user shares. It is scoped to the files
> that drive a browser because the API cases read the password for reasons that are their subject:
> invariant 18's timing comparison needs a valid login, and the leak assertions search responses for
> the password itself. The two exceptions exist because their expectations are about the sign-in
> itself, and the owner chose to keep the expectations over removing the last UI logins.
