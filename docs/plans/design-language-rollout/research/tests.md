# Research: design-language-rollout — tests

> Written by the test sweep (`FEAT-S1`). Scope: `e2e/regression/<feature>/*.functional.*`,
> `e2e/security/*.functional.*`, `e2e/accessibility/**`, `apps/web/src/**/*.spec.ts`, and the
> meta-tests under `e2e/suite-integrity.api.spec.ts`, `e2e/ledger/`, `e2e/architecture/`,
> `e2e/process/`. Every statement below carries a case ID or a `path:line`. No verdict on
> adequacy is given — only what exists and what each check actually asserts.

## 1. The 28 functional cases, enumerated

**The direct enumeration across the three regression/security directories is 28**
(`e2e/regression/auth-login/auth-login.functional.cases.md`: 10 cases;
`e2e/regression/home-dashboard/home-dashboard.functional.cases.md`: 13 cases;
`e2e/security/security.functional.cases.md`: 5 cases; 10+13+5 = 28). That arithmetic is confirmed by
reading all three case docs case-by-case (below).

**Named, not resolved — the citation for "28" does not reach all 28 cases it counts.**
`FACT-3559` (`docs/adr/ADR-0026-design-language.md:105-109`) states "All 28 functional cases passed
unmodified" and names only two paths: `e2e/regression/auth-login/auth-login.functional.spec.ts` and
`e2e/regression/home-dashboard/home-dashboard.functional.spec.ts` — `e2e/security/security.functional.spec.ts`
is not cited, yet its 5 `SEC-FN-*` cases are required to reach 28 (10 `AL-FN-*` + 13 `HD-FN-*` = 23,
not 28). `docs/CHANGELOG.md:38` (`FT-005`) states the same number separately from accessibility: "all
28 functional cases and all 4 accessibility cases passed unmodified" — this entry also does not name
`security.functional.spec.ts` by path, and does not itself say whether its "28" includes `SEC-FN-*`.
Both sides carry a real citation and neither resolves the other: `FACT-3559`'s own citation list does
not reach 28 without the security file, and no document states outright that `SEC-FN-*` is or is not
part of the counted 28. Re-opened under Open questions below.

### `auth-login.functional.cases.md` / `auth-login.functional.spec.ts`

| ID       | Asserts                                                                                                                                                 | Exact locator(s) used by the spec                                                                                                                                        | `path:line`                                                     |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| AL-FN-01 | form renders: one `h1`, labelled Email/Password, a "Sign in" button                                                                                     | `page.getByRole('heading', {level:1})`, `page.getByLabel('Email')`, `page.getByLabel('Password')`, `page.getByRole('button',{name:'Sign in'})`                           | `e2e/regression/auth-login/auth-login.functional.spec.ts:51-59` |
| AL-FN-02 | successful login → URL `/`, exactly one `ps_session` cookie, Sign-in button gone                                                                        | `page.getByLabel('Email'/'Password')`, `getByRole('button',{name:'Sign in'})`, `context().cookies()` filtered on name `ps_session`, `toHaveURL('/')`                     | `:61-80`                                                        |
| AL-FN-03 | wrong password → visible alert containing `Invalid email or password`, stays on `/auth/login`, no leak of `passwordHash`/`scrypt`/`apps/api`, no cookie | `loginAlert(page)` = `page.getByRole('main').getByRole('alert')` (helper at `:40-42`)                                                                                    | `:82-108`                                                       |
| AL-FN-04 | unknown email and wrong-password-known-email give the identical alert text                                                                              | same `loginAlert` helper, compares `alert.innerText()` across two submissions                                                                                            | `:110-133`                                                      |
| AL-FN-05 | empty form → alert `Enter your email and password`, stays on `/auth/login`                                                                              | `loginAlert(page)`, `getByRole('button',{name:'Sign in'})`                                                                                                               | `:135-144`                                                      |
| AL-FN-06 | Sign-up link `href="/auth/register"`, click lands on a real page (`h1`="Sign up", no "not found" text), **and** a direct `goto` returns HTTP 200        | `page.getByRole('link',{name:'Sign up'})`, `page.getByRole('heading',{level:1})`, `page.getByText('This page could not be found')`, `page.goto('/auth/register')` status | `:146-163`                                                      |
| AL-FN-08 | no console/page errors on render or after a failed sign-in                                                                                              | `collectConsoleProblems(page)` (fixture), plus the Sign-in button/alert locators above                                                                                   | `:165-182`                                                      |
| AL-FN-10 | password field is masked while holding the typed value                                                                                                  | `page.getByLabel('Password')`, `toHaveAttribute('type','password')`, `toHaveValue(...)`, `page.getByText(TEACHER.password,{exact:true})` hidden                          | `:184-195`                                                      |
| AL-FN-13 | session cookie httpOnly, `path:'/'`, `sameSite !== 'None'`, 3-segment JWT value, invisible to `document.cookie`                                         | cookie object fields + `page.evaluate(() => document.cookie)`                                                                                                            | `:197-224`                                                      |
| AL-FN-14 | invalid email format → alert `Check the email format`, stays on `/auth/login`                                                                           | `loginAlert(page)`                                                                                                                                                       | `:226-236`                                                      |

Structural note: `loginAlert()` is narrowed to `page.getByRole('main').getByRole('alert')`
specifically because App Router's own route announcer (`<div role="alert" ... id="__next-route-announcer__">`)
lives **outside** `<main>` and a bare `getByRole('alert')` is a strict-mode violation — documented at
`e2e/regression/auth-login/auth-login.functional.spec.ts:28-42`. The login form's error `<p role="alert">`
(`apps/web/src/app/auth/login/login-form.tsx:46-50`) is rendered inside `<main>` because
`apps/web/src/app/auth/layout.tsx:19` wraps all `/auth/*` children in one `<main>`. Any markup change
that removes that `<main>` wrapper, or that puts a second `role="alert"` element inside it, is
load-bearing for AL-FN-03/04/05/14.

### `home-dashboard.functional.cases.md` / `home-dashboard.functional.spec.ts`

| ID                     | Asserts                                                                                                     | Exact locator(s)                                                                                                                                                                              | `path:line`                                                              |
| ---------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| HD-FN-01               | unauthenticated `/` → `/auth/login`, no counter, no email                                                   | `page.getByLabel('Email')`, `getByRole('button',{name:'Sign in'})`, `counter(page)` hidden, `page.getByText(TEACHER.email)` hidden                                                            | `e2e/regression/home-dashboard/home-dashboard.functional.spec.ts:91-105` |
| HD-FN-02               | greeting `h1` contains the user email                                                                       | `authedPage.getByRole('heading',{level:1})`                                                                                                                                                   | `:131-142`                                                               |
| HD-FN-03               | `Meetings total: <reference.total>` visible, number parsed equals API `total` (5), `total !== items.length` | `counter(page)` = `page.getByText(COUNTER_PATTERN)` where `COUNTER_PATTERN = /^Meetings total: \d+$/` (`:38-42`); also `authedPage.getByText(\`Meetings total: ${total}\`)` directly          | `:144-161`                                                               |
| HD-FN-04               | exactly 3 recent meetings                                                                                   | `authedPage.getByRole('list')`, `.getByRole('listitem')` `toHaveCount(TEACHER_MEETINGS.latestLimit)`                                                                                          | `:163-170`                                                               |
| HD-FN-05               | UI order matches API order; two omitted titles absent                                                       | `getByRole('list').getByRole('listitem')`, `.nth(index)`, `page.getByText(omitted)` hidden                                                                                                    | `:172-194`                                                               |
| HD-FN-06               | "Create meeting" button present and enabled                                                                 | `authedPage.getByRole('button',{name:'Create meeting'})`                                                                                                                                      | `:196-207`                                                               |
| HD-FN-07 (`@mutating`) | creating a meeting → counter `+1`, new item first, list ≤3, survives reload                                 | `getByLabel('Title')`, `getByLabel('Date and time')`, `getByRole('button',{name:'Create meeting'})`, `getByText(\`Meetings total: ${before+1}\`)`, `getByRole('list').getByRole('listitem')`  | `:278-309`                                                               |
| HD-FN-08 (`@mutating`) | sign-out clears cookie and access                                                                           | `getByRole('button',{name:'Sign out'})`, cookie value check, re-visit to `/`                                                                                                                  | `:311-342`                                                               |
| HD-FN-09               | empty state for `student`: `Meetings total: 0`, 0 listitems, `No meetings yet`, create button still enabled | `authedPage.getByRole('heading',{level:1})`, `getByText('Meetings total: 0')`, `getByRole('listitem')` count 0, `getByText('No meetings yet')`, `getByRole('button',{name:'Create meeting'})` | `:244-263`                                                               |
| HD-FN-10               | no console errors                                                                                           | `collectConsoleProblems`, `getByRole('heading',{level:1})`, `counter(authedPage)`                                                                                                             | `:209-218`                                                               |
| HD-FN-11               | browser never calls Nest directly                                                                           | `page.on('request', …)`, `isNestRequest(url, apiBaseURL)`                                                                                                                                     | `:107-128`                                                               |
| HD-FN-14               | list + 3 listitems by role; "Create meeting" and "Sign out" buttons by role **and name**; exactly one `h1`  | `getByRole('list')`, `.getByRole('listitem')`, `getByRole('button',{name:'Create meeting'})`, `getByRole('button',{name:'Sign out'})`, `getByRole('heading',{level:1})` `toHaveCount(1)`      | `:220-233`                                                               |
| HD-FN-16               | authenticated visit to `/auth/login` bounces to `/`                                                         | `getByRole('button',{name:'Sign in'})` hidden, `getByRole('heading',{level:1})` contains email                                                                                                | `:235-242`                                                               |

**`HD-FN-03`, "one text node":** the case doc (`home-dashboard.functional.cases.md:57`) says "the
text `Meetings total: <reference.total>` is visible … as one text node" per the task's framing, but
the **spec itself** does not assert a DOM text-node count — it uses
`page.getByText(\`Meetings total: ${total}\`)`(substring match, not`{exact:true}`) and a regex
`counter()` helper (`:38,41`), both of which pass as long as exactly one element's combined,
whitespace-normalized text content matches — Playwright's `getByText`does not require the string to
sit in a single DOM`Text`node. The actual "single text node" constraint is stated in the
**component's own comment**, not in a spec assertion:`apps/web/src/app/page.tsx:22-24`— "the
counter as a **single text node** in exactly the`Meetings total: 5`format, or`getByText`in`HD-FN-03`will not match. The template literal stays for that reason — splitting it across elements
for styling would break the locator." That comment's claim ("splitting ... would break the locator")
is stronger than what`getByText` actually enforces (see above) — a discrepancy between what the
case doc/component comment assert and what the paired spec mechanically checks.

**`HD-FN-04`, `ul`/`li` structure:** the spec asserts role, not tag name —
`authedPage.getByRole('list')` / `.getByRole('listitem')` (`home-dashboard.functional.spec.ts:166-169`).
The current markup is literally `<ul aria-label="Recent meetings">…<li>…</li></ul>`
(`apps/web/src/components/meeting-list.tsx:38-57`), and a comment there states the roles are the
load-bearing part: "`ul`/`li` rather than a pile of `div`s — `getByRole('list')` plus
`getByRole('listitem')` in `HD-FN-04`, `HD-FN-05`, `HD-FN-14`" (`meeting-list.tsx:10-11`). Any
element that keeps `role="list"`/`role="listitem"` (ARIA role override on a non-`ul`/`li` element)
would also satisfy the three cases that use `getByRole`, strictly by what the spec checks — the
`.cases.md` wording ("ul/li structure") is a stronger claim than the spec enforces.

### `security.functional.cases.md` / `security.functional.spec.ts`

| ID        | Asserts                                                                              | Exact locator(s)                                                                                                   | `path:line`                                      |
| --------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| SEC-FN-01 | session cookie httpOnly/sameSite=Lax/path=/, invisible to `document.cookie`          | cookie fields, `authedPage.evaluate(() => document.cookie)`                                                        | `e2e/security/security.functional.spec.ts:64-83` |
| SEC-FN-02 | token value, `accessToken`, `Bearer`, `scrypt` absent from `page.content()`          | `authedPage.getByRole('heading',{level:1})` (render check) then `authedPage.content()`                             | `:85-102`                                        |
| SEC-FN-03 | no direct Nest request, no `Authorization` header on any browser request             | `authedPage.getByRole('heading',{level:1})`, `page.on('request', …)`, `isNestRequest`                              | `:104-129`                                       |
| SEC-FN-04 | every path in `PROTECTED_PAGES = ['/']` redirects to `/auth/login` without a session | `page.toHaveURL(/\/auth\/login$/)`, `page.getByLabel('Email')`, `page.getByText(SEED_USERS.teacher.email)` count 0 | `:131-146`                                       |
| SEC-FN-05 | a forged/foreign-signed cookie still redirects to `/auth/login`                      | same `toHaveURL`/`getByText` pair, cookie forged via HMAC in the test itself                                       | `:148-188`                                       |

`PROTECTED_PAGES` in this file is `['/']` only (`security.functional.spec.ts:31`) — invariant 16
says "every new protected page" goes in this list; the dashboard is the only protected web page
today.

## 2. The accessibility cases

`e2e/accessibility/accessibility.functional.cases.md` lists 4 cases (confirmed against
`accessibility.functional.spec.ts`, which has exactly 4 `test(...)` bodies):

| ID        | Asserts                                                                                       | Pages visited                                                                                            | `path:line`                                    |
| --------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| ACC-FN-01 | zero axe violations, tags `wcag2a wcag2aa wcag21a wcag21aa`                                   | `PUBLIC_PAGES` = `/auth/login`, `/auth/register` (filtered from `AUDITED_PAGES` by `needsSession:false`) | `accessibility.functional.spec.ts:25-32,49-55` |
| ACC-FN-02 | zero axe violations for the signed-in dashboard                                               | `/` as `teacher` via `authedPage`                                                                        | `:57-68`                                       |
| ACC-FN-03 | zero axe violations in the login form's **error state** (different DOM: a live region exists) | `/auth/login`, after a failed submit                                                                     | `:70-80`                                       |
| ACC-FN-04 | exactly one `h1` and one `main` landmark per audited page                                     | `PUBLIC_PAGES` via `page`, `SESSION_PAGES` (`/`) via `authedPage`                                        | `:82-104`                                      |

`ADR-0025` fixes: `axe-core` through `@axe-core/playwright`, WCAG 2.0 A/AA + 2.1 A/AA
(`accessibility.functional.spec.ts:10,17`); the case doc states it "catches roughly a third of real
barriers" and is "a floor, not a verdict" (`accessibility.functional.cases.md:16-19`). `ACC-FN-01`'s
case note: this exact check is what found `FX-039` — HeroUI's default `--accent` at 3.58:1 contrast
(`accessibility.functional.cases.md:44-45`).

**`AUDITED_PAGES`** is the hand-maintained list connecting this suite to the app
(`accessibility.functional.spec.ts:25-29`): `/auth/login`, `/auth/register`, `/` — the same three
routes that exist in `apps/web/src/app` (§3/§7 below); `/auth/session-expired` (a Route Handler, not
a rendered page: `apps/web/src/app/auth/session-expired/route.ts`) is not in the list.

**Locator inconsistency noted, not diagnosed:** `ACC-FN-03` scans after
`await expect(page.getByRole('alert')).toBeVisible()` — an **unnarrowed** `getByRole('alert')`
(`accessibility.functional.spec.ts:77`) — while `auth-login.functional.spec.ts:40-42` explicitly
narrows the same query to `page.getByRole('main').getByRole('alert')` because a bare
`getByRole('alert')` is documented to hit App Router's own route announcer and throw a strict-mode
violation (`auth-login.functional.spec.ts:28-38`). Both specs currently pass against the same login
page markup; whether `ACC-FN-03`'s unnarrowed query is at risk from a markup change is not something
I ran the suite to find out (out of scope for a sweep) — it is recorded here as a difference in
locator practice between two specs hitting the same error element.

## 3. Per-surface locator inventory

**`src/app/page.tsx`** (the dashboard shell: `h1` greeting, counter paragraph, `<header>`, grid, two
columns):

- `page.getByRole('heading', {level:1})` — HD-FN-02 (`home-dashboard.functional.spec.ts:137`),
  HD-FN-10 (`:214`), HD-FN-14 (`:232`), HD-FN-16 (`:241`), HD-FN-11 (`:118`), SEC-FN-02
  (`security.functional.spec.ts:90`), SEC-FN-03 (`:118`), ACC-FN-02 (`accessibility.functional.spec.ts:64`),
  ACC-FN-04 (`:92,99`, applied to `/`, session branch)
- `page.getByText(COUNTER_PATTERN)` / `page.getByText(\`Meetings total: ${n}\`)` — HD-FN-01
(`:102`), HD-FN-03 (`:154-158`), HD-FN-07 (`:293,304`), HD-FN-08 (`:339`), HD-FN-09 (`:253`),
HD-FN-10 (`:215`)
- `page.getByText(TEACHER.email)` / `getByText(STUDENT.email)` / `getByText(SEED_USERS.organizer.email)`
  — HD-FN-01 (`:103`), HD-FN-08 (`:340`), SEC-FN-04 (`:143`), SEC-FN-05 (`:185`)
- `page.getByRole('main')` — ACC-FN-04 (`:93,102`)

**`src/app/auth/layout.tsx`** (the shared `/auth/*` frame, wraps children in one `<main>`):

- No spec queries this file's own markup directly by locator; its load-bearing property is
  structural — it is the only `<main>` wrapper for `/auth/login` and `/auth/register`, which is what
  makes `loginAlert()`'s `getByRole('main').getByRole('alert')` narrowing work (AL-FN-03/04/05/14,
  `auth-login.functional.spec.ts:40-42`) and what ACC-FN-04 counts as "one main landmark" for those
  two pages (`accessibility.functional.spec.ts:92-93`).

**`src/app/auth/login/page.tsx` + `login-form.tsx`**:

- `page.getByRole('heading', {level:1})` — AL-FN-01 (`:54`), AL-FN-06 (`:156`, after navigating to
  register, same helper pattern), ACC-FN-04 (`/auth/login` branch, `:92`)
- `page.getByLabel('Email')` / `page.getByLabel('Password')` — AL-FN-01/02/03/04/05/08/10/13/14
  (throughout `auth-login.functional.spec.ts`), HD-FN-01 (`:98`), SEC-FN-04 (`:142`), **and**
  `e2e/fixtures/auth.fixture.ts:64-65` inside `uiLogin()` — every functional case that uses
  `authedPage` (all of `HD-FN-*`, `ACC-FN-02`, `SEC-FN-01/02/03`) depends transitively on these two
  labelled fields existing, because `authedPage` is produced by a UI login through this exact form.
- `page.getByRole('button', {name:'Sign in'})` — same breadth as the Email/Password labels: directly
  in `AL-FN-*`, `HD-FN-01/02/11/16`, and transitively via `uiLogin()`
  (`auth.fixture.ts:66`) for every `authedPage`-based case across `home-dashboard`, `security` and
  `accessibility` functional suites.
- `page.getByRole('alert')`, narrowed to `page.getByRole('main').getByRole('alert')` in
  `auth-login.functional.spec.ts` — AL-FN-03/04/05/14; unnarrowed in `accessibility.functional.spec.ts:77`
  — ACC-FN-03 (see §2 note above).
- `page.getByLabel('Password')` + `toHaveAttribute('type','password')` + `toHaveValue(...)` —
  AL-FN-10 only (`:184-195`).
- `page.getByRole('link', {name:'Sign up'})` with `href` check — AL-FN-06 only
  (`auth-login.functional.spec.ts:149-151`).

**`src/app/auth/register/page.tsx`**:

- `page.getByRole('heading', {level:1})` `.toHaveText('Sign up')` — AL-FN-06
  (`auth-login.functional.spec.ts:156`), ACC-FN-04 (`/auth/register` branch, `:92`)
- `page.getByText('This page could not be found')` hidden — AL-FN-06 (`:157`)
- direct `page.goto('/auth/register')` status `200` — AL-FN-06 (`:161-162`)
- `ACC-FN-01` scans the whole rendered page (no locator beyond navigation) —
  `accessibility.functional.spec.ts:49-55`.

**`src/components/meeting-list.tsx`**:

- `authedPage.getByRole('list')` — HD-FN-04 (`:166-169`), HD-FN-05 (`:180-181`), HD-FN-14
  (`:223-226`)
- `authedPage.getByRole('listitem')` (unscoped) — HD-FN-09 (`:254`, count 0 for empty state)
- `.getByRole('list').getByRole('listitem')` — HD-FN-04/05/07/14 (as above, plus `:295,298,305`)
- `page.getByText(omitted)` hidden for the two cut titles — HD-FN-05 (`:190-192`)
- `page.getByText('No meetings yet')` — HD-FN-09 (`:255`)
- The component comment states the `aria-label="Recent meetings"` gives the list its accessible
  name, but **no spec queries the list by that name** — every spec locator above uses the bare role
  (`getByRole('list')`), not `getByRole('list', {name:'Recent meetings'})`. The label's presence is
  asserted nowhere directly; only roles and item counts are.

**`src/components/create-meeting-form.tsx`**:

- `authedPage.getByRole('button', {name:'Create meeting'})` — HD-FN-06 (`:202-205`), HD-FN-07
  (`:291`), HD-FN-09 (`:257-259`), HD-FN-14 (`:229`)
- `authedPage.getByLabel('Title')` / `getByLabel('Date and time')` — HD-FN-07 only
  (`:289-290`)
- No spec currently queries this component's `role="alert"` error paragraph (unlike the login
  form's, which AL-FN-03/04/05/14 exercise) — **not found**: no `HD-FN-*` case submits an invalid
  create-meeting form and reads its alert text.

**`src/components/logout-button.tsx`**:

- `authedPage.getByRole('button', {name:'Sign out'})` — HD-FN-08 (`:317`), HD-FN-14 (`:230`)

## 4. The unit level

Four Vitest files under `apps/web/src`, all paired with `.unit.cases.md` entries per
`e2e/regression/auth-login/auth-login.unit.cases.md` and
`e2e/regression/home-dashboard/home-dashboard.unit.cases.md`:

- `apps/web/src/lib/session.spec.ts` — `AL-UT-20/21/22`, tests `session-cookie.ts` (cookie options:
  `httpOnly`, `path`, `sameSite`, `secure`, max-age). No rendering, no class names.
- `apps/web/src/lib/api-client.spec.ts` — `AL-UT-23/24/25/26`, pure URL joining and error-message
  normalization. No rendering.
- `apps/web/src/lib/login-credentials.spec.ts` — `AL-UT-29/30`, `FormData` parsing (trim rules,
  empty-field detection). No rendering.
- `apps/web/src/lib/format-date.spec.ts` — `HD-UT-10/11/15/16`, date formatting under different
  `TZ` values and `datetime-local` parsing. No CSS, no class names, no fonts — only string output
  of a date formatter.

**Not found:** no Vitest unit under `apps/web/src` renders a component, touches a CSS class name, a
token, or a font. `grep`-level search of the four spec files confirms none imports
`@testing-library/react`, `render`, or any `.tsx` component file; all four import only plain
`lib/*.ts` modules, consistent with invariant 14 ("`import 'server-only'` does not resolve under
Vitest. Keep everything testable in modules without it") and the home-dashboard case doc's own
note that `toMeetingDto` (the one other candidate) has deliberately no spec
(`home-dashboard.unit.cases.md:17-19`).

## 5. Meta-tests that would see this change

- `e2e/suite-integrity.api.spec.ts` — ten rules, all file/suffix/ID/pairing checks
  (`suite-integrity.api.spec.ts:264-496`). None inspects component markup, class names, CSS, fonts
  or icons. Rule 2/3 (every spec has a paired `.cases.md` and vice versa) and rule 5 (every declared
  ID appears in its paired spec) would fire only if a presentation change also touched a `.cases.md`
  or dropped a locator the paired spec expects (e.g., removing the `Create meeting` button name
  would make `violationsRule5` irrelevant — that rule checks ID↔text pairing in markdown/spec files,
  not DOM state; the actual failure from a removed accessible name would surface as a **red
  functional test**, not as a suite-integrity violation).
- `e2e/ledger/ledger.api.spec.ts` — checks `docs/CHANGELOG.md`/`docs/BACKLOG.md` structure (entry
  IDs, commit hashes, dangling references). Would see this change only through the mandatory new
  `FT-`/ledger entry this change must add, not through any markup it changes.
- `e2e/architecture/architecture.api.spec.ts` — checks the ADR log, the Routes table in
  `docs/api-contract.md` against Nest controllers, `PROTECTED_ROUTES`, and the facts corpus
  (`FACT-` keys, `architecture.api.spec.ts:1-75` imports `scripts/facts-parse.mjs` for this). Since
  this change is `apps/web`-only presentation with "no API or contract change" per the research
  README (`docs/plans/design-language-rollout/research/README.md:29`), the Routes-table and
  controller checks are not implicated; the facts-corpus checks would apply only if the design
  stage adds or retires a `FACT-` key outside the already-accepted `ADR-0026` set.
- `e2e/process/process.api.spec.ts` — checks plan templates and change-folder structure
  (`process.api.spec.ts:1-19`). Not implicated by markup/CSS changes.
- **Not found:** no meta-test anywhere inspects `apps/web/src/app/globals.css`, Tailwind utility
  class names used in `.tsx` files, `package.json` dependencies for `@phosphor-icons/react`/font
  packages, or `next/font` configuration in `layout.tsx`. (`pnpm audit --audit-level high` would
  watch a new runtime dependency for known CVEs per `CLAUDE.md`'s Commands table, but that is a
  dependency-vulnerability check, not a markup/CSS/font-correctness check.)

## 6. Where coverage stops

Searched `e2e/**` (all `.spec.ts` and `.cases.md` files) for the terms `font`, `Jakarta`, `Geist`,
`phosphor`, `icon`, `aria-hidden` (case-insensitive): **zero matches** anywhere in `e2e/`.

- **Not found:** a check that a utility class compiles to no CSS. Confirmed by searching for a
  Tailwind-aware ESLint rule or stylelint config: `packages/eslint-config/` contains only `base.js`,
  `nest.js`, `next.js` (no tailwind plugin); `apps/web/postcss.config.mjs:8` registers exactly
  `@tailwindcss/postcss` and nothing that lints class names. `docs/adr/ADR-0026-design-language.md:114-118`
  (`FACT-3561`) states this directly as a known gap: "`text-foreground-500` and `border-default-200`
  … compile to no CSS … because a class that generates no CSS produces no violation, no failure and
  no diff. Review against the skill is the only thing holding it."
- **Not found:** a check for a hard-coded colour literal (e.g. `bg-[#6B53E4]`) in `apps/web/src`.
  No lint rule or e2e spec searches for a Tailwind arbitrary-value colour utility.
- **Not found:** a check for the wrong font family. `apps/web/src/app/layout.tsx:1-13` currently
  wires `Geist`/`Geist_Mono` via `next/font/google`; no spec reads a computed font-family, and the
  grep above found no test referencing a font name at all.
- **Not found:** a contrast check on any page/state not in `AUDITED_PAGES` (`/auth/login`,
  `/auth/register`, `/`) or not scanned by `ACC-FN-01/02/03`. The create-meeting form's own error
  state (invalid submission) is not scanned by any `ACC-FN-*` case — only the login form's error
  state is (`ACC-FN-03`). `axe-core` runs only against the states the four `ACC-FN-*` cases
  navigate to; a visual regression on an untested state (e.g., the empty-meetings state for
  `student`, or the create-form's error alert) would not be caught by `pnpm e2e:a11y`.
- **Not found:** a check for a missing `aria-hidden` on a decorative icon. `@phosphor-icons/react`
  is not yet a dependency (absent from `apps/web/package.json`; grepped for `phosphor` — no match),
  so no icon markup exists yet to check, and no case anticipates one.
- The only mechanism that would catch a **contrast regression on an audited page** is `ACC-FN-01`/
  `ACC-FN-02`/`ACC-FN-03` (axe-core, WCAG 2.1 AA) — this is how `FX-039` was found per
  `accessibility.functional.cases.md:44-45` and `docs/CHANGELOG.md:72` (`CH-029`).
- The only mechanism that would catch a **missing accessible name** on a control is a `getByRole`
  locator with a `name` option going dark across the functional suites listed in §3 (`Create
meeting`, `Sign out`, `Sign in`, `Sign up`, `Email`, `Password`) plus `ACC-FN-04`'s `h1`/`main`
  counts — none of these are contrast or CSS checks; they are accessible-name/role/landmark checks.

## 7. How a functional spec is written here

- **Fixtures**: `e2e/fixtures/seed.ts` (`SEED_USERS`, `TEACHER_MEETINGS`, `FUTURE_STARTS_AT_ISO`/`_LOCAL`
  — the only source of logins, passwords, meeting titles and dates); `e2e/fixtures/auth.fixture.ts`
  (`authUser` test option, `authStateFor` worker fixture, `authedPage` test fixture — built on a real
  UI login through `/auth/login`, see §3); `e2e/fixtures/api.ts` (`apiBaseURL` option, `apiRequest`
  fixture, `isNestRequest`); `e2e/fixtures/auth.api.ts` (`loginApi`, `authHeaders`, `authHeadersFor`
  — API-project login, token-cached per worker); `e2e/fixtures/console.ts`
  (`collectConsoleProblems`, `isDevServerNoise` — filters Next HMR noise so AL-FN-08/HD-FN-10 do not
  flake).
- **Seed data the dashboard renders**: `TEACHER_MEETINGS.total = 5`, `latestLimit = 3`,
  `latestTitles` (3 titles), `omittedTitles` (2 titles) — `e2e/fixtures/seed.ts:67-82`. `SEED_USERS`
  has four keys: `teacher`/`student` (never mutated, read-only baselines), `planner` (mutation
  sandbox for `*.api.spec.ts`), `organizer` (mutation sandbox for `*.functional.spec.ts`) —
  `seed.ts:31-58`.
- **Ports**: `playwright.config.ts:15-18` — `E2E_WEB_PORT ?? 3100`, `E2E_API_PORT ?? 3101`; project
  `api` → `API_URL`, project `web` → `WEB_URL` + `devices['Desktop Chrome']`
  (`playwright.config.ts:55-60`).
- **Helper functions a new spec in this area would reuse**: `loginAlert(page)`-style narrowed
  locators are file-local (not exported) in `auth-login.functional.spec.ts:40-42`; `counter(page)`/
  `readCounter(page)` are file-local in `home-dashboard.functional.spec.ts:40-57`; both would need
  to be reimplemented or imported if a new spec needed the same locator pattern — neither is
  currently exported from `e2e/fixtures/`.

## 8. What asserts the `Meeting` key set at the suite level

Evidence only — no judgement of adequacy, no recommendation.

**`HD-API-01`** — `e2e/regression/home-dashboard/home-dashboard.api.cases.md:43-50`: "Every item has
**exactly** the keys `durationMinutes`, `id`, `participants`, `startsAt`, `title` — the full key set
rather than 'has an id', so an `ownerId` leak is caught too." The paired spec
(`e2e/regression/home-dashboard/home-dashboard.api.spec.ts:98-102`):

```
for (const item of body.items ?? []) {
  // The full key set rather than "has an id": this also catches an `ownerId` leak.
  expect(Object.keys(item).sort()).toEqual(MEETING_KEYS);
  expect(item).not.toHaveProperty('ownerId');
```

`MEETING_KEYS` is declared at `home-dashboard.api.spec.ts:51` as
`['durationMinutes', 'id', 'participants', 'startsAt', 'title']` (alphabetically sorted). The
assertion is an **exact sorted key-list equality** (`Object.keys(item).sort()).toEqual(MEETING_KEYS)`)
applied to every item in `items`, not a count and not a subset/superset check: an added key on any
returned meeting object — a category field included — would fail `toEqual` here, and a removed key
would fail it the same way.

**Other cases asserting the same exact key set:**

- `HD-API-20` ("POST /meetings without durationMinutes gives 201 and a default of 60") —
  `home-dashboard.api.spec.ts:424`: `expect(Object.keys(body).sort()).toEqual(MEETING_KEYS);` against
  the single created meeting returned by `POST /meetings`, using the same `MEETING_KEYS` constant.
- `MD-API-01` ("GET /meetings/:id returns the full meeting for its owner") —
  `e2e/regression/meetings-detail/meetings-detail.api.cases.md:36-43`: "exactly the keys
  `durationMinutes`, `id`, `participants`, `startsAt`, `title`". The paired spec
  (`e2e/regression/meetings-detail/meetings-detail.api.spec.ts:97`):
  `expect(Object.keys(body).sort()).toEqual(MEETING_KEYS);` — its own `MEETING_KEYS` constant,
  declared independently at `meetings-detail.api.spec.ts:44` with the identical five-name array, then
  followed by `expect(body).toEqual(listItem)` (`:98-100`), a byte-for-byte comparison between the
  by-id read and the matching list item — a second, independent exact-shape check on the same
  endpoint pair.

So three `*-API-*` cases in two spec files, each with its own locally declared `MEETING_KEYS`
constant, assert the identical five-name sorted key list against a `Meeting`/`MeetingDto` object: a
new field on the API response would fail all three (`HD-API-01`, `HD-API-20`, `MD-API-01`) unless each
`MEETING_KEYS` constant were also updated.

**Functional level — absence or exact text of a meeting field:** searched
`e2e/regression/home-dashboard/home-dashboard.functional.spec.ts` and
`e2e/regression/auth-login/auth-login.functional.spec.ts` for `durationMinutes`, `participants`, and
`MEETING_KEYS` — zero matches in either file. The rendered duration appears today as
`{meeting.durationMinutes} min` inside a `Chip` (`apps/web/src/components/meeting-list.tsx:50-52`),
and `participants` is not rendered anywhere in `meeting-list.tsx`, but **not found**: no functional
case reads either value by text. `HD-FN-05` asserts only the 3 `latestTitles` present, in order, and
the 2 `omittedTitles` absent (`tests.md` §"home-dashboard.functional.cases.md" table above,
`home-dashboard.functional.spec.ts:172-194`) — a check on `title` text content and ordering, not on
`durationMinutes` or `participants`. `HD-FN-03` asserts only the counter text
(`Meetings total: <n>`, §1 table above). No functional case was found asserting the absence of a
field, or the exact text of a meeting row beyond its title and the dashboard counter — so a new chip
rendered inside an existing `<li>` (a category chip alongside the duration `Chip`) would not, on the
evidence found, be asserted against by any functional case at the text level; the three API cases
above (`HD-API-01`, `HD-API-20`, `MD-API-01`) are the only suite-level assertions found that would
fail on an added or removed `Meeting` key.

## Open questions

- Whether `ACC-FN-03`'s unnarrowed `page.getByRole('alert')` (`accessibility.functional.spec.ts:77`)
  is actually at risk from a markup change that would also affect `AL-FN-03`'s narrowed version is
  not established here — recorded as an observed inconsistency in §2, not as a verdict.
- Whether `FACT-3559`'s citation list (only the two regression spec paths, not
  `security.functional.spec.ts`) was a deliberate scoping or an incomplete citation is not
  established — the arithmetic (28 = 10+13+5) is confirmed, but the ADR's own citation does not
  name the third file.

- **Not found:** a case or spec that exercises `/auth/session-expired` by locator (it is a Route
  Handler, not rendered markup) — searched `e2e/**` for the string `session-expired`, found only in
  `e2e/README.md:92`, which names the mechanism in prose ("the `/auth/session-expired` Route
  Handler, which erases the cookie first"); no `.cases.md` or `.spec.ts` under `e2e/` navigates to
  it directly or asserts anything about its markup.
