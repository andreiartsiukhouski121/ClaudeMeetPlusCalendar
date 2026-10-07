# Dashboard: UI (`/`)

- **Paired spec:** `e2e/regression/home-dashboard/home-dashboard.functional.spec.ts`
- **Playwright project:** `web` (Desktop Chrome, `baseURL = http://127.0.0.1:3100`)
- **Tags:** `@regression`, `@home-dashboard`, plus `@p0` and `@mutating` where applicable
- **Run:** `pnpm e2e --project=web --grep @home-dashboard`
- **Preconditions:**
  - Playwright starts both servers; the seed is applied.
  - The session comes from `auth.fixture.ts` (`authUser`/`authedPage`), baseline `total`/`items`
    through `apiRequest` from `api.ts`. The built-in `request` would hit Next rather than Nest in
    this project. That does not break the BFF rule — the call comes from the test's Node process,
    and browser traffic is checked by `HD-FN-11`.
  - Locators go by role, label and text only: hashed CSS module classes make class selectors die on
    the next build.
  - Mutating cases run as `organizer`, reserved for this file (`*.api.spec.ts` mutates `planner`).
    Counter assertions are relative, the title is unique and the date is the 2030 constant.
  - **An assertion's scope matches its subject.** A case about a landmark asserts inside that
    landmark; a case whose subject is the whole document says so and means it. The failure this rule
    exists for is **scope wider than subject** — `HD-FN-17` is about the navigation rail and counted
    links over the entire page — and it is not ignorance of scoping: `HD-FN-19` unioned four
    landmarks for its button count and stayed page-wide for its link count **in the same case**. It
    was inconsistency, not a missing idea. Each meeting title is now a link to its detail page, so
    any page-wide count of what one landmark contains is either already false or waiting to be.

18 cases. Numbers `12`, `13`, `15` are **never reused**.

## Summary

| ID       | Title                                               | Priority | Tags                                        |
| -------- | --------------------------------------------------- | -------- | ------------------------------------------- |
| HD-FN-01 | an unauthenticated visitor on / goes to login       | P0       | `@regression @home-dashboard @p0`           |
| HD-FN-02 | the greeting contains the user email                | P0       | `@regression @home-dashboard @p0`           |
| HD-FN-03 | the meeting count matches the API data              | P0       | `@regression @home-dashboard @p0`           |
| HD-FN-04 | exactly 3 recent meetings are shown                 | P0       | `@regression @home-dashboard @p0`           |
| HD-FN-05 | ordering and cutting of older meetings              | P0       | `@regression @home-dashboard @p0`           |
| HD-FN-06 | the "Create meeting" button is present              | P0       | `@regression @home-dashboard @p0`           |
| HD-FN-07 | creating a meeting updates the counter and the list | P0       | `@regression @home-dashboard @p0 @mutating` |
| HD-FN-08 | signing out closes access                           | P0       | `@regression @home-dashboard @p0 @mutating` |
| HD-FN-09 | empty state when there are no meetings              | P1       | `@regression @home-dashboard`               |
| HD-FN-10 | no console errors on the dashboard                  | P1       | `@regression @home-dashboard`               |
| HD-FN-11 | the browser never calls the API directly            | P1       | `@regression @home-dashboard`               |
| HD-FN-14 | accessibility of the controls                       | P1       | `@regression @home-dashboard`               |
| HD-FN-16 | an authenticated visitor on /auth/login goes to /   | P1       | `@regression @home-dashboard`               |
| HD-FN-17 | the navigation rail names its one destination       | P1       | `@regression @home-dashboard`               |
| HD-FN-18 | the rail adds no second list and no second counter  | P0       | `@regression @home-dashboard @p0`           |
| HD-FN-19 | the hero banner's two lines, and no new control     | P1       | `@regression @home-dashboard`               |
| HD-FN-20 | the overview tile counts items against total        | P1       | `@regression @home-dashboard`               |
| HD-FN-21 | the overview tile on an empty dashboard             | P1       | `@regression @home-dashboard`               |

## Cases

### HD-FN-01 — an unauthenticated visitor on / goes to login

- **Priority:** P0
- **Steps:** open `/` in a clean context.
- **Expected:** the URL is `/auth/login` with the form visible; the dashboard counter and the user
  email are absent — the redirect happened before the render.

### HD-FN-02 — the greeting contains the user email

- **Priority:** P0
- **Steps:** open `/` as `teacher`.
- **Expected:** the level 1 heading is visible and contains the seeded email.

### HD-FN-03 — the meeting count matches the API data

- **Priority:** P0
- **Steps:** fetch the baseline page from Nest, then open `/`.
- **Expected:** the text `Meetings total: <reference.total>` is visible and the number read from
  the page equals the API `total`, which is 5 and differs from `items.length`. The expected value
  comes from the API rather than a literal, so replacing `total` with `items.length` in the service
  must break this case.

### HD-FN-04 — exactly 3 recent meetings are shown

- **Priority:** P0
- **Steps:** open `/`.
- **Expected:** the list is visible and holds exactly three list items. The locator is unscoped and
  stays correct only because `HD-FN-18` pins `/` to exactly one element with role `list`; a second
  list anywhere on the dashboard makes this case ambiguous rather than red.

### HD-FN-05 — ordering and cutting of older meetings

- **Priority:** P0
- **Steps:** fetch the baseline from Nest, open `/`, walk the list items.
- **Expected:** the UI order matches the API order item by item, the API order matches the seeded
  expectation, and the two cut titles are not on the page. Comparing with the API rather than a
  constant catches both a lost sort in the service and a reordering in the markup.

### HD-FN-06 — the "Create meeting" button is present

- **Priority:** P0
- **Steps:** open `/`.
- **Expected:** the button is visible and enabled.

### HD-FN-07 — creating a meeting updates the counter and the list

- **Priority:** P0
- **Steps:** as `organizer`, read the counter, fill the title and date, submit, then reload.
- **Expected:** the counter becomes `before + 1`, the new meeting is **first** in the list (the
  2030 date is later than any seeded meeting of that owner and sorting is DESC), the list never
  exceeds three items, and after the reload both still hold — the change lives on the server, not
  in client state.

### HD-FN-08 — signing out closes access

- **Priority:** P0
- **Steps:** as `organizer`, click `Sign out`, then visit `/` again.
- **Expected:** the URL is `/auth/login` with the form visible and no email in the heading; no
  session cookie holds a non-empty value; the second visit again lands on the login page with no
  counter and no email.

### HD-FN-09 — empty state when there are no meetings

- **Priority:** P1
- **Steps:** open `/` as `student`.
- **Expected:** the heading carries the student email, `Meetings total: 0` is visible, there are
  zero list items, the text `No meetings yet` is shown, the create button is still enabled, and the
  console is clean. The empty state is explicit text rather than an empty list, because an empty
  list is indistinguishable from "the data failed to load".

### HD-FN-10 — no console errors on the dashboard

- **Priority:** P1
- **Steps:** subscribe to console and page errors **before** navigating, then open `/`.
- **Expected:** the problem list is empty. The blanket form is assertable here because `/` answers
  2xx; on a page whose own response is a 404, Chromium logs a resource error of its own and the
  assertion has to narrow to page errors instead (`MF-FN-11`).

### HD-FN-11 — the browser never calls the API directly

- **Priority:** P1
- **Steps:** record every request from the first navigation, sign in through the UI, reach `/`.
- **Expected:** no request is addressed to the Nest port, and the recorded list is not empty (which
  proves the recording worked). All page traffic goes to Next; only the Next server talks to Nest.

### HD-FN-14 — accessibility of the controls

- **Priority:** P1
- **Steps:** open `/` and query by role.
- **Expected:** the list and its three items are found by role; the `Create meeting` and `Sign out`
  buttons are found by role **and** accessible name — if a name disappears, the locator finds
  nothing; there is exactly one level 1 heading.

### HD-FN-16 — an authenticated visitor on /auth/login goes to /

- **Priority:** P1
- **Steps:** open `/auth/login` with a session.
- **Expected:** the URL becomes `/`, the sign-in button is gone and the heading carries the email.
  The bounce is done by `proxy.ts`.

### HD-FN-17 — the navigation rail names its one destination

- **Priority:** P1
- **Steps:** open `/` as `teacher` and query the navigation landmark.
- **Expected:** a `navigation` landmark named `Main` is visible — the `web` project runs Desktop
  Chrome at 1280×720, above `lg`, so the rail is rendered on every run; it shows the text
  `PurpleSchool`, which is not a control, and holds **exactly one link**, named `Dashboard`,
  pointing at `/` and carrying `aria-current="page"`. **The count is scoped to that landmark**, so
  an invented second destination in the rail fails here.
- **Why it is not "the only link on the page" any more:** it used to be, and that was a coincidence
  of a smaller page rather than a stronger assertion — `nav` was simply the one landmark that
  contained a link. Each meeting title in the list is now a link to its detail page, so the
  page-wide form is false and restoring it breaks the dashboard instead of protecting it. The case
  was always a statement about the rail; it now says so.

### HD-FN-18 — the rail adds no second list and no second counter

- **Priority:** P0
- **Steps:** open `/` as `teacher`; count the elements with role `list` and the ones matching the
  counter's text pattern.
- **Expected:** exactly one element on `/` has role `list` — the `Recent meetings` one — the
  navigation landmark holds zero list items, and exactly one element matches
  `/^Meetings total: \d+$/`. A rail or tile built from `ul`/`li`, or a second text in the counter's
  format, makes the unscoped list and counter locators of `HD-FN-04`, `HD-FN-05`, `HD-FN-07`,
  `HD-FN-09` and `HD-FN-14` ambiguous — a defect to investigate under `FACT-3559`, not a case to
  edit. This one is **deliberately page-wide**: its subject _is_ what else the document contains,
  so here scope and subject agree, which is why it survived the list rows becoming links while the
  counts phrased as shortcuts did not.

### HD-FN-19 — the hero banner's two lines, and no new control

- **Priority:** P1
- **Steps:** open `/` as `teacher`.
- **Expected:** the text `Your schedule` is visible and `Everything you have planned, in one place.`
  is visible as a **level 2** heading, so the page still has exactly one level 1 heading; and the
  `banner` landmark holds **zero links and zero buttons**.
- **Zero is the assertion, and it is not vacuous.** A hero call to action is the only defect this
  half exists to catch, and it would make the count one. Two translations of the old wording would
  both be wrong, and both are available to anyone rewriting this: scoping "the page's only link is
  `Dashboard`" **into `banner`** checks for a link that has never been there and proves nothing,
  because `Dashboard` lives in `nav`; and scoping it **to `nav`** instead makes this case
  `HD-FN-17` verbatim and leaves it saying nothing about the hero at all. The hero's claim is that
  it contains no control — not that some other landmark contains one.
- **The button half stays page-wide, and deliberately:** the page's only buttons are
  `Create meeting` and `Sign out`, counted over the union of the page's own landmarks —
  `navigation`, `banner`, `main` and `complementary` — rather than over the whole document, because
  `next dev` is Playwright's `webServer` and injects an `Open Next.js Dev Tools` control outside the
  application's markup on every page. Its subject is the page's whole interactive surface, so the
  scope is right; it is also the only assertion in the suite that would notice an unexpected button
  arriving anywhere on the dashboard. That scoping leaves a hole: a button added outside all four
  landmarks — in the outer shell `div`, or beside `<header>` — goes uncounted, and `banner` resolves
  only while `<header>` stays out of sectioning content.

### HD-FN-20 — the overview tile counts items against total

- **Priority:** P1
- **Steps:** fetch the baseline page from Nest, open `/` as `teacher`, scope to the complementary
  landmark.
- **Expected:** a `complementary` landmark named `Overview` is visible and holds the texts
  `<items.length> of <total> shown` and `Meetings`. Both numbers come from the API response rather
  than a literal — for the seed, `3 of 5 shown` — and `total` differs from `items.length`, the
  distinction invariant 4 and `FACT-1013` exist for; neither line matches the counter's pattern.

### HD-FN-21 — the overview tile on an empty dashboard

- **Priority:** P1
- **Steps:** open `/` as `student`.
- **Expected:** the `Overview` landmark is still present and reads `0 of 0 shown` with `Meetings`,
  while `Meetings total: 0` and `No meetings yet` stay visible. The tile ships with the empty state
  rather than disappearing along with the data.
