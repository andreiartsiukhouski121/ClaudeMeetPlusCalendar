# Login: UI (`/auth/login`)

- **Paired spec:** `e2e/regression/auth-login/auth-login.functional.spec.ts`
- **Playwright project:** `web` (Desktop Chrome, `baseURL = http://127.0.0.1:3100`)
- **Tags:** `@regression`, `@auth-login`, plus `@p0` on the critical cases
- **Run:** `pnpm e2e --project=web --grep @auth-login`
- **Preconditions:**
  - Playwright starts both servers; the user seed is applied.
  - Logins and passwords come from `e2e/fixtures/seed.ts`. Hard-coded data is a blocker.
  - Locators go by role and label only: `apps/web` uses CSS modules with hashed class names, so a
    class selector dies on the next build.

No case here checks the home page contents — in feature 1 `/` was still the create-next-app
default. A successful login is confirmed by the URL change and the session cookie.

**The form error is located as `getByRole('main').getByRole('alert')`**, never as a bare
`getByRole('alert')`: App Router keeps its own empty `role="alert"` route announcer outside
`<main>`, which causes a strict mode violation in every error case. Verified by a run.

10 cases: 5 P0, 5 P1/P2. Numbers `07`, `09`, `11`, `12` are **never reused**.

## Summary

| ID       | Title                                                       | Priority | Tags                          |
| -------- | ----------------------------------------------------------- | -------- | ----------------------------- |
| AL-FN-01 | the login form renders                                      | P0       | `@regression @auth-login @p0` |
| AL-FN-02 | a successful login leaves the form for /                    | P0       | `@regression @auth-login @p0` |
| AL-FN-03 | a wrong password shows an error and keeps the user on login | P0       | `@regression @auth-login @p0` |
| AL-FN-04 | an unknown email gives the same error                       | P0       | `@regression @auth-login @p0` |
| AL-FN-05 | an empty form does not submit                               | P1       | `@regression @auth-login`     |
| AL-FN-06 | the sign-up link leads to a page that exists                | P1       | `@regression @auth-login`     |
| AL-FN-08 | the login page logs nothing to the console                  | P1       | `@regression @auth-login`     |
| AL-FN-10 | the password is masked while typing                         | P1       | `@regression @auth-login`     |
| AL-FN-13 | the session cookie is httpOnly and unreachable from JS      | P0       | `@regression @auth-login @p0` |
| AL-FN-14 | an invalid email format in the UI                           | P2       | `@regression @auth-login`     |

## Cases

### AL-FN-01 — the login form renders

- **Priority:** P0
- **Steps:** open `/auth/login`.
- **Expected:** a level 1 heading is visible; the `Email` and `Password` fields are found **by
  label** (which also proves they have associated `<label>` elements); the `Sign in` button is
  visible.

### AL-FN-02 — a successful login leaves the form for /

- **Priority:** P0
- **Steps:** fill in the seeded `teacher` credentials and submit.
- **Expected:** the URL becomes `/`; exactly one `ps_session` cookie appears; the `Sign in` button
  is gone. The URL change is awaited by a web-first assertion because the transition is done by
  `redirect('/')` inside the Server Action — if that redirect ever moves inside a `try/catch`
  (invariant 11), the cookie is set and this case goes red.

### AL-FN-03 — a wrong password shows a visible error and keeps the user on the login page

- **Priority:** P0
- **Steps:** submit a valid email with a wrong password.
- **Expected:** the alert is visible and contains `Invalid email or password`; the URL is still
  `/auth/login` and the form is still there; the alert contains no `passwordHash`, `scrypt` or
  `apps/api`; no session cookie was set.

### AL-FN-04 — an unknown email gives the same error

- **Priority:** P0
- **Steps:** submit an unknown email, record the alert text, then submit a known email with a wrong
  password.
- **Expected:** the second alert text equals the first. The expected value is the **first
  response's text** rather than a constant, so the case proves the two rejection branches are
  indistinguishable.

### AL-FN-05 — an empty form does not submit

- **Priority:** P1
- **Steps:** submit the form with both fields empty.
- **Expected:** the alert shows `Enter your email and password` — the app's text, not the
  browser's. Invariant 15 forbids `required` on the inputs, otherwise the browser would block
  submission and the server branch would never run.

### AL-FN-06 — the sign-up link leads to a page that exists

- **Priority:** P1
- **Steps:** check the `Sign up` link and its `href`, click it, then navigate to `/auth/register`
  directly.
- **Expected:** the URL is `/auth/register`, the level 1 heading reads `Sign up`, there is no
  "This page could not be found", and the direct navigation returns HTTP 200. The direct step
  matters because clicking a `Link` is a client transition with no status code.

### AL-FN-08 — the login page logs nothing to the console, on render or after a failed sign-in

- **Priority:** P1
- **Steps:** subscribe to console and page errors **before** navigating, open the page, then submit
  a wrong password.
- **Expected:** the problem list is empty both times — the expected 401 was handled by the app
  rather than surfacing as an unhandled exception.

### AL-FN-10 — the password is masked while typing

- **Priority:** P1
- **Steps:** fill the password field and inspect it.
- **Expected:** the field has `type="password"` and holds the typed value, and the value is not
  visible as page text. The assertion is about the attribute because the value stays in the DOM.

### AL-FN-13 — the session cookie is httpOnly and unreachable from JS

- **Priority:** P0
- **Steps:** sign in, read the context cookies, then evaluate `document.cookie`.
- **Expected:** one `ps_session` cookie with `httpOnly: true`, `path: '/'`, `sameSite` other than
  `None`, and a value of three JWT segments; `document.cookie` contains neither the name nor the
  value. Otherwise XSS would obtain an access token for Nest.

### AL-FN-14 — an invalid email format in the UI

- **Priority:** P2
- **Steps:** submit `not-an-email` with a valid password.
- **Expected:** the alert shows `Check the email format` and the URL stays `/auth/login`. The email
  field is `type="text"` (invariant 15), so the browser does not block submission and the 400 from
  `ValidationPipe` reaches `loginAction`.
