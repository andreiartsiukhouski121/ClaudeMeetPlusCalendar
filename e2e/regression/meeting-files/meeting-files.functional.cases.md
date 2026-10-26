# Meeting files: UI (`/meetings/<id>`)

- **Paired spec:** `e2e/regression/meeting-files/meeting-files.functional.spec.ts`
- **Playwright project:** `web` (Desktop Chrome, `baseURL = http://127.0.0.1:3100`)
- **Tags:** `@regression`, `@meeting-files`, `@e2e`, plus `@p0` and `@mutating` where applicable,
  and `@ui-login` on `MF-FN-09` alone
- **Run:** `pnpm e2e --project=web --grep @meeting-files`
- **Preconditions:**
  - Playwright starts both servers; the database is reset and seeded before the run.
  - **Every case with a session claims one pool user** (`FACT-3783`) and opens with a page carrying
    the cookie built from that user's token (`FACT-3756`). `MF-FN-08` has no session and claims
    nobody. `MF-FN-09` is the one form sign-in here, tagged `@ui-login` (`FACT-3806`).
  - **The seeded-shape copy.** Read-only cases create, in `beforeEach`, a copy of `teacher`'s five
    meetings on the held user — the seed's titles, dates, durations and participants — and upload
    onto the "Geometry workshop" copy the two files with the seed's names, types, sizes and byte rule
    (`FACT-1075`): `syllabus.pdf` first, then `notes.txt` once the clock is past the first upload's
    returned `uploadedAt`, asserting the two `uploadedAt` values differ. Files list `uploadedAt`
    descending (`FACT-2110`), and a tie would fall to the random id (`ADR-0031`, invariant 7), so
    the order is what puts `notes.txt` first as the seed does (`FACT-3799`). Every row is registered
    with `preconditions` and deleted in `afterEach` (`FACT-3809`). Read "as the held user with the
    copy" below as what `as teacher` used to mean.
  - Mutating cases hold their own pool user (`FACT-3783`), register `cleanup.trackAllOf(claim)`
    before their first create (`FACT-3810`), and each creates its own meeting first, so no case is
    affected by the ten-file refusal another left behind (`FACT-3795`). They need no serial block.
    Every body is `try { … } finally { await cleanup.run(); }`.
  - Locators go by role, label and text only, and **an assertion's scope matches its subject**: a
    count of what the attachment list holds is taken inside that list, never over the page.
  - **The upload error is located inside the upload form, never as a bare `getByRole('alert')`.**
    App Router renders its own hidden `<div role="alert" id="__next-route-announcer__">` on every
    page to announce route changes, so a page-wide alert locator matches two elements here and
    counts two. `auth-login.functional.cases.md` already states this for the login form and scopes
    to `getByRole('main')`; the lesson did not travel with the next form, which is why it is written
    here too.
  - **A console assertion is a claim about the browser as much as about us.** Three sources inject
    output or markup no application controls: the route announcer above, `next dev`'s
    `Open Next.js Dev Tools` control that `HD-FN-19`'s landmark union already dodges, and
    Chromium's unconditional `Failed to load resource: … 404` on any top-level navigation whose own
    response is non-2xx. So "the console is empty" is only assertable on a page that answers 2xx,
    and `MF-FN-11` says what it means instead of saying that.
  - **The API's messages are what the user reads.** The upload action surfaces them verbatim rather
    than rewriting them into a generic string, so the cases below assert the exact text from design
    §3 — `createMeetingAction` rewrites only because its 400 is a validation array nobody can act
    on. The **413** is the one exception: `File too large` names no limit, so the page substitutes
    `That file is larger than the 1 MiB limit`.
  - The page is reached by following the dashboard link for a meeting found by its seeded title —
    no URL is typed with a literal id except where the case is about a bad id.
  - The browser never calls Nest: the download goes through the Route Handler at this origin
    (`ADR-0002`, `FACT-3633`).

15 cases.

## Summary

| ID       | Title                                                      | Priority | Tags                                            |
| -------- | ---------------------------------------------------------- | -------- | ----------------------------------------------- |
| MF-FN-01 | a dashboard meeting title links to its detail page         | P0       | `@regression @meeting-files @e2e @p0`           |
| MF-FN-02 | the detail page has one `h1` with the title and one `main` | P0       | `@regression @meeting-files @e2e @p0`           |
| MF-FN-03 | the attachment list names both seeded files, newest first  | P0       | `@regression @meeting-files @e2e @p0`           |
| MF-FN-04 | a meeting with no files shows an empty state, not a blank  | P1       | `@regression @meeting-files @e2e`               |
| MF-FN-05 | uploading through the form adds a row for the file         | P0       | `@regression @meeting-files @e2e @p0 @mutating` |
| MF-FN-06 | a refused upload shows one `role="alert"` and adds no row  | P0       | `@regression @meeting-files @e2e @p0 @mutating` |
| MF-FN-07 | the download link serves the bytes from this origin        | P0       | `@regression @meeting-files @e2e @p0`           |
| MF-FN-08 | an unauthenticated visitor on the page goes to login       | P0       | `@regression @meeting-files @e2e @p0`           |
| MF-FN-09 | a broken session on the download lands on session-expired  | P0       | `@regression @meeting-files @e2e @p0 @ui-login` |
| MF-FN-10 | the upload form's accessible contract                      | P1       | `@regression @meeting-files @e2e`               |
| MF-FN-11 | an unknown meeting id renders the not-found page           | P1       | `@regression @meeting-files @e2e`               |
| MF-FN-12 | a stale file id answers 404 without a page error           | P1       | `@regression @meeting-files @e2e`               |
| MF-FN-13 | "Back to dashboard" returns to `/`                         | P1       | `@regression @meeting-files @e2e`               |
| MF-FN-14 | the detail page logs nothing to the console                | P1       | `@regression @meeting-files @e2e`               |
| MF-FN-15 | an empty file selection reaches the server, not a block    | P1       | `@regression @meeting-files @e2e @mutating`     |

## Cases

### MF-FN-01 — a dashboard meeting title links to its detail page

- **Priority:** P0
- **Steps:** open `/` as the held user with the copy and click the list row whose accessible name
  is the seeded title "Geometry workshop".
- **Expected:** the row is a link, the URL becomes `/meetings/<that meeting's id>`, and the row's
  accessible name is still the title — a link, not a renaming (`FACT-3559`, and `HD-FN-04`,
  `HD-FN-05`, `HD-FN-14`, `HD-FN-18`, `HD-FN-20` stay green unedited).

### MF-FN-02 — the detail page has one `h1` with the title and one `main`

- **Priority:** P0
- **Steps:** follow the link from `MF-FN-01` as the held user with the copy, whose meeting carries
  the seed's date and duration (`FACT-3799`).
- **Expected:** exactly one level-1 heading, carrying the meeting title; exactly one `main`
  landmark; a level-2 heading "Files". The meeting's start time and duration are visible as text.
- **Both counts are asserted here rather than inherited.** `ACC-FN-04` makes the same two
  assertions over every entry of `AUDITED_PAGES`, so it covers this page too — but a feature case
  that leaned on that would be depending on the page staying in a list kept in another suite's
  spec, and would go silently uncovered the day it left. The design states both the single `h1` and
  the single `main` for this page, so both belong in the feature's own case as well.

### MF-FN-03 — the attachment list names both seeded files, newest first

- **Priority:** P0
- **Steps:** open the "Geometry workshop" copy's page as the held user.
- **Expected:** a list labelled "Attachments" with exactly two items, `notes.txt` before
  `syllabus.pdf` — the API's order (`MF-API-04`) rendered unchanged. The count is taken **inside
  that list**, located by its accessible name, so the navigation rail or a later second list cannot
  make it ambiguous. Each item is a link whose accessible name is the filename, and each shows its
  size as the exact contract string: `48 B` on the `notes.txt` row and `1.0 KiB` on the
  `syllabus.pdf` row, for the seeded 48 and 1024 bytes. The strings are asserted literally because
  the format carries no locale — a comma for the decimal mark here would mean the helper reached
  for `Intl` and the page became machine-dependent.

### MF-FN-04 — a meeting with no files shows an empty state, not a blank

- **Priority:** P1
- **Steps:** as the held user with the copy, open a copied meeting other than "Geometry workshop".
- **Expected:** the "Files" section is present with a visible line saying there are no attachments
  yet, and the upload form is still shown. The attachments list holds no items — asserted through
  the empty-state line and the absence of any item inside the list, not through markup the design
  does not fix.

### MF-FN-05 — uploading through the form adds a row for the file

- **Priority:** P0
- **Steps:** as the held user, register `cleanup.trackAllOf(claim)`, create a meeting, open its
  page, set the file input to a small `text/plain` file with a unique legal filename, and submit
  with the "Upload" button.
- **Expected:** afterwards the attachments list holds a link named with that filename and the
  section is no longer the empty state. **The upload form renders no alert** — scoped to the form,
  because App Router's route announcer carries `role="alert"` on every page and a page-wide "no
  alert" assertion is false on a page that worked perfectly. The meeting id was never a form field
  — it is bound to the action — so the page is the only thing that decides the target.

### MF-FN-06 — a refused upload shows one `role="alert"` and adds no row

- **Priority:** P0
- **Steps:** as the held user, register `cleanup.trackAllOf(claim)`, create a meeting, open its
  page and upload a file whose content type is outside the allow-list.
- **Expected:** **exactly one alert inside the upload form**, reading exactly
  `Unsupported file type: upload a PDF, PNG, JPEG or plain text file` — the API's own message,
  shown verbatim, so this case fails if somebody rewrites it into a generic string on the way
  through. The list is unchanged and still holds no row for that filename; the page stays on
  `/meetings/<id>` with no navigation. One alert, not one per field — the repository's
  single-container pattern.
- **Why the count is scoped and must stay scoped:** page-wide it is two, always, because App Router
  renders a hidden `role="alert"` route announcer beside our form's own. That makes this the third
  **scope wider than subject** defect in this feature and the first where the extra element comes
  from the framework rather than from our markup — so the symptom is not a clean red but a count
  that is wrong by one on every run, in a locator that looks obviously correct. Anyone
  "simplifying" this back to a page-wide locator is reintroducing it.

### MF-FN-07 — the download link serves the bytes from this origin

- **Priority:** P0
- **Steps:** as the held user with the copy, read the `href` of the `syllabus.pdf` link and
  request it with the page's own context.
- **Expected:** the `href` is same-origin (`/meetings/<id>/files/<fileId>`) and never points at
  `:3101`. The response is 200 and the body is byte-identical to the seeded bytes (the copy's
  bytes follow the seed's rule, `FACT-1075`). At **this**
  origin, `Content-Disposition` is exactly
  `attachment; filename="syllabus.pdf"; filename*=UTF-8''syllabus.pdf` — forwarded from Nest with
  both parameters intact — and `X-Content-Type-Options: nosniff` and `Cache-Control: private,
no-store` are set here (`FACT-3633`).
- **The whole header is asserted, not the word `attachment`.** The mistake available at this
  boundary is a Route Handler that rebuilds the value instead of forwarding it, and a substring
  assertion passes straight through that: it would keep `attachment` and silently drop the
  `filename*` half that makes a hostile stored name safe.

### MF-FN-08 — an unauthenticated visitor on the page goes to login

- **Priority:** P0
- **Steps:** in a clean context, open `/meetings/<a seeded id>`.
- **Expected:** the URL is `/auth/login` with the form visible; no meeting title, no filename and no
  upload control rendered — the bounce happened before the render (invariants 9 and 10).

### MF-FN-09 — a broken session on the download lands on session-expired

- **Priority:** P0
- **Tags:** `@ui-login` (`FACT-3806`) — the subject includes signing in again after the hop, so the
  seed password is read inside this test's own body and nowhere else (`FACT-3759`).
- **Steps:** with the held user's copy in place and a fresh context with **no** built session, sign
  in through the form as the held user, open the "Geometry workshop" copy's page, then replace the
  session cookie with a forged value and request the download `href` again, following the chain one
  hop at a time rather than letting the client resolve it; then sign in through the form again as
  the held user.
- **Expected:** the request ends on `/auth/login` by way of `/auth/session-expired`, which clears
  the cookie — never a direct bounce and never `ERR_TOO_MANY_REDIRECTS` (invariant 17). Signing in
  again afterwards works. Each hop is asserted separately because the two-hop shape **is** the
  invariant: a client that followed redirects silently would report the same final URL for the
  direct bounce this case exists to forbid.

### MF-FN-10 — the upload form's accessible contract

- **Priority:** P1
- **Steps:** open any copied meeting's page as the held user and inspect the form.
- **Expected:** a visible `<label>` reading "Attachment" bound to a native `<input type="file">`
  with `name="file"`; a submit button named "Upload"; the form carries `noValidate`. The input has
  **no** `required` and **no** `accept`, or the browser would block submission and the server
  branches of `MF-FN-06` would never run (invariant 15).

### MF-FN-11 — an unknown meeting id renders the not-found page

- **Priority:** P1
- **Steps:** as the held user with the copy, open `/meetings/<a copied meeting's id>-does-not-exist`
  with console and page errors collected from before the navigation.
- **Expected:** the not-found page, a 404 status, and **no `pageerror` entry** — no uncaught
  exception, no hydration failure, no error overlay. The page is the application's own not-found
  render, not a stack trace.
- **Why it is not "the console is empty":** Chromium logs
  `Failed to load resource: the server responded with a status of 404` for **any** top-level
  navigation whose own response is non-2xx, unconditionally and regardless of the application. A
  blanket console assertion here would be permanently red against a page doing exactly what it
  should, so the case asks for what it actually means — the absence of a **stack** — while keeping
  the console subscribed so a real hydration mismatch or uncaught exception still fails it. That is
  the third kind of framework noise this feature has met, after the route announcer and the dev
  tools control.

### MF-FN-12 — a stale file id answers 404 without a page error

- **Priority:** P1
- **Steps:** as the held user with the copy, request
  `/meetings/<id>/files/<a copied fileId>-does-not-exist`.
- **Expected:** status 404 and an empty body — a bare status, since a stale link needs no payload —
  and no redirect to login. A Route Handler's response reaches the client unwrapped, unlike the
  page route in `MF-FN-11`, which Next renders through its own not-found page.

### MF-FN-13 — "Back to dashboard" returns to `/`

- **Priority:** P1
- **Steps:** open a copied meeting's page as the held user and click the link named "Back to
  dashboard".
- **Expected:** the URL is `/` and the dashboard's own heading and meeting list are visible.

### MF-FN-14 — the detail page logs nothing to the console

- **Priority:** P1
- **Steps:** open the "Geometry workshop" copy's page as the held user with
  `collectConsoleProblems`.
- **Expected:** no console errors and no page errors, HMR noise filtered. A hydration warning here
  would mean the server and client rendered the file list differently. The blanket form is
  assertable **here** and not in `MF-FN-11` for one reason: this page answers 2xx, so Chromium adds
  nothing of its own.

### MF-FN-15 — an empty file selection reaches the server, not a block

- **Priority:** P1
- **Steps:** as the held user, register `cleanup.trackAllOf(claim)`, create a meeting, open its
  page and press "Upload" **without choosing a file**.
- **Expected:** the submission is **not** blocked by the browser — no native validation bubble, no
  silently ignored click — and the form ends up showing exactly one alert inside itself, reading
  the API's `file is required` verbatim, while the attachments list is unchanged and the page stays
  on `/meetings/<id>`.
- **Why this case is worth its weight:** an empty selection submits a `File` with an empty name and
  zero size, not `null` — the HTML spec's behaviour — and the action deliberately does not
  short-circuit it, so the refusal comes from the server. That is invariant 15 in its cheapest
  possible form: a client-side guard here would make the documented `file is required` branch
  unreachable from the UI, and the suite would be checking the browser rather than our code. It is
  the same thing `AL-FN-05` protects on the login form, which is why both exist. The literal is
  asserted because the message is UI copy shown verbatim — if it is ever reworded, this case and
  the contract move together, which is the point of pinning it.
