# Research: meetings-detail-participants — tests

> Sweep of the existing test coverage touching meetings, at every level, and what a
> `participants[]` field / a `GET /meetings/:id` endpoint would interact with. Evidence rule: every
> statement carries a case ID or a `path:line`.

## 1. Existing cases touching meetings, by level

### API contract — `e2e/regression/home-dashboard/home-dashboard.api.cases.md` /

`home-dashboard.api.spec.ts`

16 cases, `HD-API-01`…`HD-API-20` (numbers `11`, `12`, `18`, `19` never reused —
`home-dashboard.api.cases.md:16`).

- **`HD-API-01`** — `GET /meetings` with a token. Asserts 200, `application/json`, `items` array,
  `total` number, `items.length > 0`. For **every** item: `expect(Object.keys(item).sort()).toEqual(MEETING_KEYS)`
  where `MEETING_KEYS = ['durationMinutes', 'id', 'startsAt', 'title']`
  (`home-dashboard.api.spec.ts:43`, assertion at `home-dashboard.api.spec.ts:102`) — an **exact**
  key set, not `toMatchObject`. Also `expect(item).not.toHaveProperty('ownerId')`
  (`home-dashboard.api.spec.ts:103`), and the raw response text must not contain `passwordHash`,
  the seeded password, or the string `ownerId` (`home-dashboard.api.spec.ts:110-113`).
- **`HD-API-02`** — `GET /meetings` with no token → 401, body
  `{ message: 'Authentication required', error: 'Unauthorized', statusCode: 401 }` via
  `expect(body).toEqual({...})` (`home-dashboard.api.spec.ts:127`), and `body.items` is `undefined`.
- **`HD-API-03`** — `limit=3` → exactly 3 items (`TEACHER_MEETINGS.latestLimit`).
- **`HD-API-04`** — DESC sort by `startsAt`; asserts `items.map(title)` equals
  `TEACHER_MEETINGS.latestTitles` in order and that `TEACHER_MEETINGS.omittedTitles` are absent
  (`home-dashboard.api.spec.ts:144-150`).
- **`HD-API-05`** — `total` (5) ≠ `items.length` (3), invariant 4
  (`home-dashboard.api.spec.ts:153-169`).
- **`HD-API-06`** — data isolation: `teacher`/`student` id sets do not intersect; `student.total`=0,
  `teacher.total`=`TEACHER_MEETINGS.total` (5).
- **`HD-API-07`** — `student` (no meetings) → 200, `items: []`, `total: 0`.
- **`HD-API-08`** — `limit=abc` → 400, array `message` containing `limit`.
- **`HD-API-09`** — `limit` outside 1..100 → 400 for `0`, `-1`, `101`; message for `101` contains
  `limit must not be greater than 100`.
- **`HD-API-10`** — default limit (no param) = 3, `limit=100` returns everything, unknown query
  param `foo` → 400 `property foo should not exist`.
- **`HD-API-13`** — `POST /meetings` as `planner`: 201, echoes `title`/`durationMinutes`, string
  `id`; `total` becomes `before + 1`; new title is among the top three (2030 date).
- **`HD-API-14`** — `POST /meetings` with no token → 401, standard error body, `total` unchanged.
- **`HD-API-15`** — `POST /meetings` with empty body `{}` → 400, array `message` containing both
  `title` and `startsAt`; `total` unchanged.
- **`HD-API-16`** — `POST /meetings` with valid body + `ownerId: 'usr-teacher'` → 400,
  `property ownerId should not exist`; `total` unchanged.
- **`HD-API-17`** — meeting created as `planner` never appears in `teacher`'s list; `teacher.total`
  stays 5.
- **`HD-API-20`** — `POST /meetings` without `durationMinutes` → 201, `durationMinutes: 60`, and the
  **same** exact-key assertion `expect(Object.keys(body).sort()).toEqual(MEETING_KEYS)`
  (`home-dashboard.api.spec.ts:408`).

All 16 case docs' assertions match what the spec actually checks — no divergence found between
`.cases.md` prose and the spec bodies for `HD-API-*`.

### UI — `e2e/regression/home-dashboard/home-dashboard.functional.cases.md` /

`home-dashboard.functional.spec.ts`

13 cases, `HD-FN-01`…`HD-FN-16` (numbers `12`, `13`, `15` never reused — `home-dashboard.functional.cases.md:18`).

- **`HD-FN-01`** — unauthenticated `/` → `/auth/login`, no counter/email rendered.
- **`HD-FN-02`** — heading contains the seeded email.
- **`HD-FN-03`** — `Meetings total: <reference.total>` visible, matches API `total` (5), differs
  from `items.length` — sourced from the API response, not a literal
  (`home-dashboard.functional.spec.ts:152-159`).
- **`HD-FN-04`** — exactly 3 list items rendered.
- **`HD-FN-05`** — UI item order matches API order item by item
  (`home-dashboard.functional.spec.ts:188`: `items.map(title)` equals `TEACHER_MEETINGS.latestTitles`),
  cut titles absent.
- **`HD-FN-06`** — "Create meeting" button visible and enabled.
- **`HD-FN-07`** — creating a meeting (as `organizer`) → counter `before + 1`
  (`home-dashboard.functional.spec.ts:293`), new meeting first in list, list ≤ 3 items, survives
  reload.
- **`HD-FN-08`** — sign-out clears access; no session cookie holds a non-empty value; second visit
  bounces to login.
- **`HD-FN-09`** — `student` empty state: heading has student email, `Meetings total: 0`, zero list
  items, `No meetings yet` text, create button still enabled, console clean.
- **`HD-FN-10`** — no console errors on `/`.
- **`HD-FN-11`** — no browser request reaches the Nest port (`:3101`); recorded traffic list is
  non-empty.
- **`HD-FN-14`** — list and its 3 items found by role; `Create meeting`/`Sign out` found by role
  **and accessible name**; exactly one level-1 heading.
- **`HD-FN-16`** — authenticated visitor on `/auth/login` bounces to `/`.

No divergence found between `.cases.md` prose and spec bodies for `HD-FN-*`.

### Units — `e2e/regression/home-dashboard/home-dashboard.unit.cases.md`

13 cases, `HD-UT-01`…`HD-UT-16` (`12` merged into `HD-UT-15`; `13`, `14` never reused —
`home-dashboard.unit.cases.md:16`).

`apps/api/src/meetings/meetings.service.spec.ts` (test titles confirmed at
`meetings.service.spec.ts:43,57,63,74,89,94,103,116,135`):

- `HD-UT-01` P0 — `findRecent` sorts by `startsAt` DESC regardless of input order.
- `HD-UT-02` P0 — `findRecent` applies `limit`: 5 meetings, `limit=3` → 3.
- `HD-UT-03` P0 — `countByOwner` equals the full count (5), not `findRecent`'s slice length —
  invariant 4 at the unit level.
- `HD-UT-04` P0 — `findRecent` filters by `ownerId`; a foreign meeting is the newest one, so an
  unfiltered call would surface it first.
- `HD-UT-05` P1 — no meetings → empty `findRecent`, `countByOwner` = 0.
- `HD-UT-06` P1 — default `limit` (3) applies when the parameter is omitted/`undefined`.
- `HD-UT-07` P0 — `create` takes `ownerId` from its argument (invariant 5) and `id` from
  `randomUUID()`.
- `HD-UT-08` P1 — `create` returns given `title`/`durationMinutes`, defaulting duration to 60.
- `HD-UT-09` P2 — equal dates still give a deterministic order via secondary sort on `id`
  (invariant 7).

`apps/web/src/lib/format-date.spec.ts` (titles at `format-date.spec.ts:32,52,64,79`):

- `HD-UT-10` P1 — `formatMeetingDateTime` identical under `TZ=UTC` and `TZ=Asia/Tokyo`, midnight
  boundary included.
- `HD-UT-11` P1 — an invalid date → placeholder, no `Invalid Date`, no exception.
- `HD-UT-15` P0 — `toIsoStartsAt` gives the same ISO string for a zoneless `datetime-local` value
  under any `TZ`.
- `HD-UT-16` P1 — empty string / junk → `null`, without throwing.

`home-dashboard.unit.cases.md:20-22` states there is **deliberately no spec for the mapper**
(`toMeetingDto`): "the absence of `ownerId` in the response is checked at contract level by
`HD-API-01`."

### Smoke — `e2e/smoke/**`

- **`SM-API-02`** (`e2e/smoke/seed.api.spec.ts:20`) — every seeded user (`teacher`, `student`,
  `planner`, `organizer`) logs in and gets a 3-segment JWT.
- **`SM-API-03`** (`e2e/smoke/seed.api.spec.ts:36`) — `GET /meetings?limit=100` for `teacher`: 200,
  `total === TEACHER_MEETINGS.total` (5), `titles` contains (via `arrayContaining`, not exact
  equality) both `latestTitles` and `omittedTitles`; for `student`: 200, `total === 0`,
  `items === []`.
- **`SM-API-01`** — `GET /` liveness only, no meetings involvement (per
  `docs/api-contract.md:23`).

### Security — `e2e/security/**`

`PROTECTED_ROUTES` (`e2e/security/security.api.spec.ts:22-26`, verbatim):

```
[
  { method: 'GET', path: '/auth/me' },
  { method: 'GET', path: '/meetings?limit=3' },
  { method: 'POST', path: '/meetings' },
]
```

`SEC-API-01` (`security.api.spec.ts:56-81`) walks this list with several bad/missing token
variants and asserts 401 plus that the response body contains none of `accessToken`, `items`, or
the teacher's email.

`POST_ROUTES` (`security.api.spec.ts:29-40`, verbatim):

```
[
  { path: '/auth/login', valid: {...}, needsToken: false },
  { path: '/meetings', valid: { title: 'Whitelist check', startsAt: FUTURE_STARTS_AT_ISO }, needsToken: true },
]
```

Used by `SEC-API-07` — "extra fields are rejected on every POST endpoint" (`security.api.spec.ts:231-243`): posts each route's valid body plus `isAdmin: true, ownerId: 'usr-teacher'` and asserts 400 + `should not exist` in the body text.

`PROTECTED_PAGES` (`e2e/security/security.functional.spec.ts:31`, verbatim): `['/']` — only the
dashboard root; no meeting-detail page is listed (none exists yet).

Neither list contains any `/meetings/:id` route or page — there is nothing yet for a new endpoint
to be missing from.

**`SEC-API-06` — the one case in the repository that asserts the key set of a 404 body.** Added by
the `researcher` on the review gate's blocker B1: the original sweep grepped
`security.api.spec.ts` (which contains no literal `404`) but not the paired `.cases.md`, and so
reported that no 404 assertion existed anywhere. It does.

Case text (`e2e/security/security.api.cases.md:80-86`), verbatim:

> ### SEC-API-06 — error bodies carry no stack trace, file paths or library names
>
> - **Priority:** P1
> - **Steps:** trigger a 400 (malformed payload), a 401 (no token) and a 404 (unknown path), then
>   parse the bodies.
> - **Expected:** the body holds only `statusCode`, `message`, `error`. No `stack`, no `C:\` or
>   `/src/`, no `node_modules`, no `at ` trace lines.

The spec (`security.api.spec.ts:210-229`) builds the three responses at `:212-215` — the 404 is
`await request.get('/definitely-no-such-route')` (`security.api.spec.ts:214`) — and then, for
**each** of the three:

```ts
expect(Object.keys(parsed as object).sort()).toEqual(['error', 'message', 'statusCode']);
```

(`security.api.spec.ts:227`.) The 404 it exercises is an unmatched path, not a meetings route.

**`SEC-API-09` — cross-user reachability, P0, `@p0`-tagged.** Also omitted by the original sweep.
Case text (`security.api.cases.md:105-112`), verbatim:

> ### SEC-API-09 — one user's data is unreachable with another user's token
>
> - **Priority:** P0
> - **Steps:** take the `teacher` and `student` tokens, request `GET /meetings?limit=100` with each
>   and compare the `id` sets.
> - **Expected:** the sets do not intersect; `student`'s list is empty and `teacher`'s is not.
>   Duplicates `HD-API-06` on purpose: there it is part of the meetings contract, here it is an
>   invariant that must hold once new resources appear.

The spec (`security.api.spec.ts:259-281`) asserts `teacherIds.length > 0`, `studentIds` equals
`[]`, and that the intersection is empty (`security.api.spec.ts:277-279`). It reads the two id sets
through `GET /meetings?limit=100` only (`security.api.spec.ts:266`); no other route is walked.

## 2. The key-set question

Two assertions in `home-dashboard.api.spec.ts` pin the **exact** key set of a meeting item/response
against the literal array `MEETING_KEYS = ['durationMinutes', 'id', 'startsAt', 'title']`
(`home-dashboard.api.spec.ts:43`):

- `HD-API-01`: `expect(Object.keys(item).sort()).toEqual(MEETING_KEYS)` for every item in
  `GET /meetings` (`home-dashboard.api.spec.ts:102`), applied inside a `for (const item of
body.items ?? [])` loop, i.e. every list item.
- `HD-API-20`: `expect(Object.keys(body).sort()).toEqual(MEETING_KEYS)` for the `POST /meetings`
  response body (`home-dashboard.api.spec.ts:408`).

**A `participants` (or any other) field added to `MeetingDto` and surfaced through
`toMeetingDto`/`GET /meetings`/`POST /meetings` would fail both `HD-API-01` and `HD-API-20`** unless
`MEETING_KEYS` is updated — `toEqual` on a sorted key array is exact-match, not subset. No other
spec in the repository performs a key-set check on a meeting item: `HD-API-13` (creation) checks
individual properties (`id` type, `title`, `durationMinutes`) via separate `expect` calls
(`home-dashboard.api.spec.ts:289-291`), not a key-set comparison, so it would not break from an
added field. `HD-API-16`'s `ownerId`-rejection assertion targets the **request** DTO
(`CreateMeetingDto`), not the response, and is unaffected by a response field addition.

No `Object.keys`/exact-key assertion exists in `home-dashboard.functional.spec.ts` (checked;
`grep` for `Object.keys` there returns nothing) — the functional spec compares titles/order/counter
text only (`home-dashboard.functional.spec.ts:188,152-159`), so a new field would not break any
`HD-FN-*` case directly.

**`not.toHaveProperty`:** one instance found — `expect(item).not.toHaveProperty('ownerId')` inside
`HD-API-01` (`home-dashboard.api.spec.ts:103`). It targets `ownerId` specifically and would not be
triggered by an unrelated new field such as `participants`.

**`total` (invariant 4):** checked as a value (not a key-set) at three levels —
`HD-UT-03` (`meetings.service.spec.ts:63`), `HD-API-05` (`home-dashboard.api.spec.ts:153-169`, plus
`SM-API-03`, `HD-API-06`, `HD-API-10`), and `HD-FN-03` (`home-dashboard.functional.spec.ts:152-159`).
None of these would be affected by adding a field to the meeting entity/DTO — they assert the
**number**, not the response shape.

**Response array shape:** `HD-API-01` asserts `Array.isArray(body.items)` and, per item, `typeof
item.startsAt === 'string'`, a parseable date, `typeof item.durationMinutes === 'number'`
(`home-dashboard.api.spec.ts:104-108`) — in addition to the exact key-set check above. No assertion
elsewhere constrains `items` length beyond what `HD-API-03`/`HD-API-10`/`SM-API-03` already state
for existing owners/limits.

## 3. What the meta-tests require of a new route or a new spec file

**Suite-integrity (`e2e/suite-integrity.api.spec.ts`)** — nine rules, each its own test:

- Rule 1 (`violationsRule1`, `suite-integrity.api.spec.ts:261-270`; its test at `:492`): every `e2e/**/*.spec.ts` file must end in
  `.api.spec.ts` or `.functional.spec.ts`, or it "joins no playwright.config.ts project and
  silently never runs" — confirmed also in `e2e/README.md:22-26`.
- Rule 2/3 (`violationsRule2`/`violationsRule3`, `suite-integrity.api.spec.ts:272-292`; tests at `:499` and `:503`): every spec needs a paired `.cases.md` of the
  same basename and vice versa (except `*.unit.cases.md`, which pairs to `apps/**` spec paths
  instead, rule 4/7).
- Rule 5 (`violationsRule5`, `suite-integrity.api.spec.ts:312-351`; test at `:517`): every case ID declared in a `.cases.md` (as a
  `## <ID> — …` heading or a `| <ID> | …` summary row) must appear verbatim in the paired spec, or
  be marked `- **Not automated:** <reason + task link>` (the _only_ recognized marker,
  `NOT_AUTOMATED_MARKER` at `suite-integrity.api.spec.ts:58`).
- Rule 6 (`violationsRule6`, `suite-integrity.api.spec.ts:353-371`; test at `:524`): no ID may be reused, including headings vs. table
  rows within one doc.
- Rule 7 (`violationsRule7`, `suite-integrity.api.spec.ts:373-394`; test at `:531`): a unit case ID listed under an `apps/**/*.spec.ts`
  path in a `.unit.cases.md` must appear in that exact spec file's text.
- Rule 8 (`violationsRule8`, `suite-integrity.api.spec.ts:396-433`; test at `:538`): every `apps/**/src/**/*.spec.ts` file (except
  `apps/api/src/app.controller.spec.ts`, the sole `UNIT_SPEC_EXEMPT` entry,
  `suite-integrity.api.spec.ts:32`) must be mentioned in some `*.unit.cases.md`.
- An unregistered case-ID prefix fails a dedicated test, `'ID prefixes are registered — otherwise
rules 5–7 are vacuously green'` (`suite-integrity.api.spec.ts:473`), which reads
  `KNOWN_CASE_PREFIXES` through `unregisteredPrefixes()` (`suite-integrity.api.spec.ts:214`); see §5.

**Architecture (`e2e/architecture/architecture.api.spec.ts`)**:

- `codeRoutes()` (`architecture.api.spec.ts:335-377`) scans `*.controller.ts` files for
  `@Controller(...)` and `@(Get|Post|Put|Patch|Delete)(...)` decorators via regex
  (`METHOD_DECORATOR` at line 56: `/@(Get|Post|Put|Patch|Delete)\(\s*(?:'([^']*)')?\s*\)/`), joining
  the controller prefix and the method path (`joinRoute`, line 322). A route like `@Get(':id')`
  inside `@Controller('meetings')` would be picked up as `/meetings/:id` by this mechanism (the
  regex captures any single-quoted literal, including one containing `:`).
- `documentedRoutes()` (`architecture.api.spec.ts:380-395`) parses the `## Routes` table in
  `docs/api-contract.md` via `CONTRACT_ROUTE_ROW` (line 50:
  ``/^\|\s*`(GET|POST|PUT|PATCH|DELETE)`\s*\|\s*`([^`]+)`\s*\|\s*([^|]*)\|/``).
- `violationsContractDrift()` (`architecture.api.spec.ts:401-`) fails if a code route has no
  matching row in the doc table, and vice versa — cited by `docs/api-contract.md:17-19`: "a route
  added to the code without a row here — or a row without a route — fails `pnpm verify`."
  `AR-API-06` (`architecture.api.spec.ts:622`) separately checks every **guarded** code route
  appears in `PROTECTED_ROUTES` in `e2e/security/security.api.spec.ts`
  (`architecture.api.spec.ts:439-459`).
- `docs/api-contract.md:154-160` ("Adding an endpoint") states the same four steps in prose: ADR if
  structural, controller/service/DTO/mapper, add the Routes table row, add to `PROTECTED_ROUTES` if
  guarded.

**`e2e/process/**`** (`e2e/process/process.api.spec.ts`) governs change-folder structure
(`PR-API-01`…`06`: section-0 labels, three stages present, no unfilled scaffold text, scaffolder
file list, research evidence) — nothing there is specific to routes or meeting fields; it does not
reference meetings by name (`grep` for "meetings" in that file returns nothing beyond this
research folder's own path).

**`e2e/README.md`** naming rule (`e2e/README.md:12-30`): filename suffix is the sole determinant of
Playwright project; a case-ID-first test title (`e2e/README.md:28-30`) is required for
`--grep`/`pnpm test:<feature>` filtering; "Adding a feature to the suite" (`e2e/README.md:164-183`)
lists the same eight steps (four/five files, case-ID assignment, `- **Not automated:**` marker,
tags, unit spec listing, "What lives where" row, running `suite-integrity.api.spec.ts`, one
`pnpm verify`).

## 4. Where coverage stops

- **404 from this API:** **no case asserts a 404 from a meetings route** — but `SEC-API-06` does
  assert the key set of a 404 body from an unknown path. Corrected by the `researcher` on blocker
  B1; the original bullet read "no case anywhere asserts a 404 response", which is false.
  - `SEC-API-06` (`security.api.cases.md:80-86`, spec `security.api.spec.ts:210-229`) triggers a
    404 with `request.get('/definitely-no-such-route')` (`:214`) and asserts
    `Object.keys(parsed).sort()` equals `['error', 'message', 'statusCode']` (`:227`) — the same
    assertion it applies to the 400 and the 401 in the same loop. Its stated expectation is "the
    body holds only `statusCode`, `message`, `error`" (`security.api.cases.md:85-86`). The 404 it
    exercises comes from an unmatched path, not from a handler.
  - The `grep -in "404|NotFound|not found"` behind the original bullet ran over
    `home-dashboard.api.spec.ts`, `home-dashboard.api.cases.md`, `security.api.spec.ts` and
    `security.functional.spec.ts`. `security.api.spec.ts` contains no literal `404` — the string
    lives in the **paired** `security.api.cases.md`, which was not in the grep's file list. That is
    how the case was missed.
  - Within the meetings feature the only 404-adjacent hits are `home-dashboard.api.spec.ts:192` and
    `home-dashboard.api.cases.md:88`, both about `GET /meetings` for a user with **zero** meetings
    answering **200, not 404** (`HD-API-07`) — a different subject from a "record not found" 404.
- **Cross-user reachability:** `SEC-API-09` (P0, `@p0`; `security.api.cases.md:105-112`, spec
  `security.api.spec.ts:259-281`) asserts that two users' meeting `id` sets do not intersect. Its
  own case text states it is an invariant that "must hold once new resources appear"
  (`security.api.cases.md:111-112`). It reads the id sets through `GET /meetings?limit=100` only
  (`security.api.spec.ts:266`); no by-id route is walked, because none exists.
- **A route parameter:** no controller in `apps/api/src` declares `@Param(...)` or a `@Get(':...')`
  /`@Post(':...')` path (checked via `grep -rn "@Get(|@Post(|@Param(" apps/api/src`); the only
  decorators found are `@Get()`/`@Post('login')`/`@Get('me')`/`@Get()`/`@Post()`
  (`app.controller.ts:8`, `auth.controller.ts:31,37`, `meetings.controller.ts:25,38`). No case
  exercises a path parameter on any route.
- **An array field in a request body:** no DTO in `apps/api/src` declares `@IsArray()` or any
  array-typed field (checked via `grep -rn "array|IsArray" apps/api/src/meetings/dto
apps/api/src/auth`, no matches). `CreateMeetingDto` (`create-meeting.dto.ts:15-30`) has exactly
  `title: string`, `startsAt: string`, `durationMinutes?: number` — no array field exists anywhere
  in the contract to have a case for.
- **Validation rejection on `POST /meetings`:** existing cases —
  - `HD-API-15` — empty body → 400, message mentions `title` and `startsAt` (missing required
    fields only; no case for `title` length bounds 3–100 or `startsAt` non-ISO-8601 format, though
    `create-meeting.dto.ts:16-22` declares `@Length(3,100)` and `@IsISO8601()`).
  - `HD-API-16` — extra field (`ownerId`) → 400, `property ownerId should not exist`.
  - `SEC-API-07` (`security.api.spec.ts:231`) — same extra-field rejection via
    `POST_ROUTES`, on `/meetings` specifically.
  - No case exists for: a `title` shorter than 3 or longer than 100 characters, a non-ISO-8601
    `startsAt`, a `durationMinutes` outside `15..480`, or a wrong-type field (e.g. `title` as a
    number). `Not found` below.
- **`apps/web` meeting-detail surface:** `apps/web/src/app` contains no `meetings/[id]` (or similar)
  route directory (checked via `find apps/web/src/app -type f`); the only app routes are `/`,
  `/auth/login`, `/auth/register`, `/auth/session-expired`. `apps/web/src/lib/dal.ts` exports only
  `getCurrentUser` and `getMeetings` (`dal.ts:40,71`) — no single-meeting fetch function exists.
  `apps/web/src/lib/types.ts:15-21` defines `Meeting` with exactly `id`, `title`, `startsAt`,
  `durationMinutes` — no `participants` field anywhere in `apps/web` or `apps/api` (checked via
  `grep -rn "participants|Participant" apps e2e docs`; the only hits are the three files inside
  this change's own `docs/plans/meetings-detail-participants/` folder).
- **`PROTECTED_PAGES`** (`e2e/security/security.functional.spec.ts:31`) lists only `['/']` — no
  meeting-detail page is a member, because none exists yet.
- No case anywhere is marked `- **Not automated:**` in `home-dashboard.api.cases.md`,
  `home-dashboard.functional.cases.md`, or `home-dashboard.unit.cases.md` (checked via grep for the
  literal marker string; zero matches in any of the three files) — every declared `HD-*` case is
  automated.

## 5. Case ID prefix scheme

Defined in `e2e/suite-integrity.api.spec.ts:43` as `KNOWN_CASE_PREFIXES` (corrected from `:40` by the `researcher` on assembly; line 40 is a comment):

```
['AL', 'HD', 'SM', 'SEC', 'LG', 'PR', 'AR']
```

— `AL` (auth-login), `HD` (home-dashboard), `SM` (smoke), `SEC` (security), `LG` (ledger), `PR`
(process meta-tests), `AR` (architecture meta-tests). The comment at
`suite-integrity.api.spec.ts:36-40` states: "Adding a feature means adding its prefix here.
Forgetting is impossible: the test below finds any `XX-API-01`-shaped ID with an unknown prefix in
the case docs and goes red" — enforced by the "ID prefixes are registered" test
(`suite-integrity.api.spec.ts`, the test following the walk self-check). No prefix for a
`meetings-detail-participants`-style feature (e.g. `MD`) exists yet in this list.

## Not found

- **Not found:** any case (API, functional, or unit) asserting a 404 response from a **meetings**
  route — searched `e2e/regression/home-dashboard/**`, `e2e/security/**`, `e2e/smoke/**` by grepping
  for `404`, `NotFound`, `not found` across **both** the specs and their paired `.cases.md` files.
  This line was rewritten by the `researcher` on blocker B1: as originally written it claimed no
  case asserted a 404 from any endpoint, and `SEC-API-06` does — see §1 "Security" and §4.
- **Not found:** any route or DTO field using the word `date` as an identifier (as opposed to
  `startsAt`) anywhere in `apps/api/src` or `apps/web/src` — searched via reading
  `create-meeting.dto.ts`, `meeting.types.ts`, `apps/web/src/lib/types.ts`; all three name the field
  `startsAt`.
- **Not found:** any existing test, fixture, or seed value for a `participants` field — searched
  `apps`, `e2e`, `docs` via `grep -rn "participants|Participant"`; the only occurrences are the
  three files already inside `docs/plans/meetings-detail-participants/` (this change's own design
  and plan documents, which are out of scope for this file).
- **Not found:** a `GET /meetings/:id`-shaped route, or any `@Param()` usage, anywhere in
  `apps/api/src` — searched via `grep -rn "@Get(|@Post(|@Param("`.
