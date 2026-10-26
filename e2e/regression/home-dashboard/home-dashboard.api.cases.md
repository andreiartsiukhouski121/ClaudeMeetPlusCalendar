# Dashboard: API contract (`GET /meetings`, `POST /meetings`)

- **Paired spec:** `e2e/regression/home-dashboard/home-dashboard.api.spec.ts`
- **Playwright project:** `api` (the `request` fixture, `baseURL = http://127.0.0.1:3101`, no browser)
- **Tags:** `@regression`, `@home-dashboard`, plus `@p0` and `@mutating` where applicable
- **Run:** `pnpm e2e --project=api --grep @home-dashboard`
- **Preconditions:**
  - Playwright starts Nest on 3101 with `JWT_SECRET=e2e-secret`; the seed is applied.
  - Data comes from `e2e/fixtures/seed.ts`. Exact numbers are checked against `teacher`/`student`
    only — mutating them is forbidden.
  - Mutating cases run as `planner`, the `api` project's shared sandbox (`FACT-3783`); browser
    cases hold pool users, so no cross-project race remains on `planner` under
    `fullyParallel: true`, because `GET /meetings` is isolated by owner. `planner` is also mutated by
    `meetings-detail.api.spec.ts`, so no mutating case here reads `total`, which would race that
    file's concurrent creates. Each case is instead proven by its own unique generated title, by
    the ids it just created, or — for `HD-API-15`, whose rejected body carries no title — by the
    DTO's own bound on `title`.
  - **Cleanup:** every meeting a case creates is registered with its `cleanup` tracker as it is
    created and deleted in the body's `finally`, **also on failure** (`FACT-3780`, `FACT-3809`);
    a tracker failure is reported beside the case's own, never in its place. `HD-API-13`, `-17`,
    `-20`, `-21` and `-22` gain this; their assertions are unchanged.
  - `HD-API-13`…`HD-API-22` keep one nested serial `describe`: it orders `HD-API-13`'s top-three
    read before `HD-API-22`'s three same-date creates within this file.
  - **The one exception is `HD-API-23`, and it does not run as `planner`.** It reads `total` after
    a delete, which needs an owner whose count nothing else moves, so it claims a pool user
    (`FACT-3783`) — empty when claimed (`FACT-3773`) and held by no other test until the case ends.
    Its counts stay relative to a baseline it reads first; `FACT-3784` would allow absolute ones
    over a held user, and the case keeps its relative form so its expectations do not change. Every
    meeting it creates is registered with its `cleanup` tracker under the held user's token and
    deleted **also on failure** (`FACT-3785`); because its own `DELETE`s remove them first, each
    entry tolerates a cleanup `404` only when its body is exactly `FACT-2016`, and any other `404` —
    Express's `Cannot DELETE …` included — fails the case.

19 cases. Numbers `11`, `12`, `18`, `19` are **never reused**.

## Summary

| ID        | Title                                                         | Priority | Tags                                        |
| --------- | ------------------------------------------------------------- | -------- | ------------------------------------------- |
| HD-API-01 | GET /meetings with a token returns the list and total         | P0       | `@regression @home-dashboard @p0`           |
| HD-API-02 | GET /meetings without a token gives 401                       | P0       | `@regression @home-dashboard @p0`           |
| HD-API-03 | limit=3 returns exactly 3 items                               | P0       | `@regression @home-dashboard @p0`           |
| HD-API-04 | sorted by date DESC, older meetings cut                       | P0       | `@regression @home-dashboard @p0`           |
| HD-API-05 | total is the full count, not the length of items              | P0       | `@regression @home-dashboard @p0`           |
| HD-API-06 | data isolation between users                                  | P0       | `@regression @home-dashboard @p0`           |
| HD-API-07 | a user with no meetings                                       | P1       | `@regression @home-dashboard`               |
| HD-API-08 | a non-numeric limit gives 400                                 | P1       | `@regression @home-dashboard`               |
| HD-API-09 | a limit outside 1..100 gives 400                              | P1       | `@regression @home-dashboard`               |
| HD-API-10 | limit contract: default, ceiling, unknown parameter           | P1       | `@regression @home-dashboard`               |
| HD-API-13 | POST /meetings creates a meeting                              | P0       | `@regression @home-dashboard @p0 @mutating` |
| HD-API-14 | POST /meetings without a token gives 401, data unchanged      | P0       | `@regression @home-dashboard @p0`           |
| HD-API-15 | POST /meetings without required fields gives 400              | P1       | `@regression @home-dashboard`               |
| HD-API-16 | POST /meetings with an extra field gives 400                  | P1       | `@regression @home-dashboard`               |
| HD-API-17 | the created meeting belongs to the token owner                | P1       | `@regression @home-dashboard @mutating`     |
| HD-API-20 | POST /meetings without durationMinutes gives 201 and 60       | P0       | `@regression @home-dashboard @p0 @mutating` |
| HD-API-21 | the created id is `mtg-` + a randomUUID, not a seeded literal | P0       | `@regression @home-dashboard @p0 @mutating` |
| HD-API-22 | equal startsAt still orders by id ascending                   | P1       | `@regression @home-dashboard @mutating`     |
| HD-API-23 | total follows a delete, relative to a baseline                | P0       | `@regression @home-dashboard @p0 @mutating` |

## Cases

### HD-API-01 — GET /meetings with a token returns the list and total

- **Priority:** P0
- **Steps:** `GET /meetings` as `teacher`.
- **Expected:** 200, JSON content type, `items` an array and `total` a number. Every item has
  **exactly** the keys `durationMinutes`, `id`, `participants`, `startsAt`, `title` — the full key
  set rather than "has an id", so an `ownerId` leak is caught too. The response text contains no
  `passwordHash`, no seeded password and no `ownerId`.
- **Five keys, and five on purpose after meetings gained files:** a meeting's files are a separate
  resource, reached through `/meetings/:id/files`, so `MeetingDto` gained no field and this
  assertion survived a feature that added data to meetings. That was a decision rather than an
  accident, and it is recorded in the design — a case this strict goes red the moment somebody
  embeds a file count or a file list in the meeting body, which is the conversation that decision
  wants to force.

### HD-API-02 — GET /meetings without a token gives 401

- **Priority:** P0
- **Steps:** `GET /meetings` with no `Authorization`.
- **Expected:** 401 with exactly
  `{ message: 'Authentication required', error: 'Unauthorized', statusCode: 401 }` and no `items`.

### HD-API-03 — limit=3 returns exactly 3 items

- **Priority:** P0
- **Steps:** `GET /meetings?limit=3` as `teacher`.
- **Expected:** `items` has three elements.

### HD-API-04 — sorted by date DESC

- **Priority:** P0
- **Steps:** `GET /meetings?limit=3` as `teacher`.
- **Expected:** the timestamps are non-increasing and the titles match the three most recent seeded
  meetings in order. The two oldest titles are **absent** — half the point of the case.

### HD-API-05 — total is the full meeting count, not the length of items

- **Priority:** P0
- **Steps:** `GET /meetings?limit=3` as `teacher`.
- **Expected:** `total` is 5 while `items` holds 3, and the two differ explicitly. Invariant 4; the
  control experiment (`total = items.length`) must break this assertion.

### HD-API-06 — data isolation between users

- **Priority:** P0
- **Steps:** `GET /meetings?limit=100` as `teacher` and as `student`, then compare the id sets.
- **Expected:** the sets do not intersect; `student` is empty with `total` = 0, `teacher` has
  `total` = 5.

### HD-API-07 — a user with no meetings

- **Priority:** P1
- **Steps:** `GET /meetings?limit=3` as `student`.
- **Expected:** **200**, not 404 — having no meetings is a normal state, not "not found" — with an
  empty `items` and `total` = 0.

### HD-API-08 — a non-numeric limit gives 400

- **Priority:** P1
- **Steps:** `GET /meetings?limit=abc`.
- **Expected:** 400 (neither a 500 nor a silent ignore) with an array `message` mentioning `limit`.

### HD-API-09 — a limit outside 1..100 gives 400

- **Priority:** P1
- **Steps:** request `limit=0`, `limit=-1`, `limit=101`.
- **Expected:** 400 each; for 101 the message contains `limit must not be greater than 100` — the
  contract's ceiling is exactly 100, not 50.

### HD-API-10 — limit contract: default, ceiling, unknown parameter

- **Priority:** P1
- **Steps:** `GET /meetings` with no parameter, then with `limit=100`, then with
  `?limit=3&foo=bar`.
- **Expected:** without the parameter, 200 and the documented default of 3 — **this step catches a
  missing `@IsOptional()`** (invariant 2), without which the answer is 400 and the dashboard never
  loads. `limit=100` returns everything. The unknown parameter gives 400 with
  `property foo should not exist`, proving `forbidNonWhitelisted` applies to the query too.

### HD-API-13 — POST /meetings creates a meeting

- **Priority:** P0
- **Steps:** as `planner`, `POST /meetings` with a unique title, the 2030 date and
  `durationMinutes: 30`.
- **Expected:** **201** (the correct answer to a POST; no status decorator needed), the body echoes
  the title and duration with a string `id`, and afterwards the new title is among the top three.
  The 2030 date guarantees it lands in the slice.

### HD-API-14 — POST /meetings without a token gives 401 and changes no data

- **Priority:** P0
- **Steps:** as `planner`, `POST /meetings` with a unique title and no token.
- **Expected:** 401 with the standard error body, and the title is absent from `planner`'s full
  list afterwards.

### HD-API-15 — POST /meetings without required fields gives 400

- **Priority:** P1
- **Steps:** as `planner`, `POST /meetings` with an empty body.
- **Expected:** 400 with an array `message` mentioning both `title` and `startsAt`. No side effect:
  the body carries no `title`, so a leaked record could only carry one missing or shorter than the
  DTO's own `@Length(3, 100)` — every title in `planner`'s own list afterwards must be a real string
  of at least 3 characters. This is checked without a `total` reading, which a concurrent file's
  inserts would otherwise move.

### HD-API-16 — POST /meetings with an extra field gives 400

- **Priority:** P1
- **Steps:** as `planner`, `POST /meetings` with a unique title plus `ownerId: 'usr-teacher'`.
- **Expected:** 400 with `property ownerId should not exist`, and the title is absent from
  `planner`'s full list afterwards. This is invariant 5 enforced at the HTTP level.

### HD-API-17 — the created meeting belongs to the token owner

- **Priority:** P1
- **Steps:** create a meeting as `planner`, then list everything as `teacher`.
- **Expected:** neither the new id nor the new title appears in `teacher`'s list, and `teacher`'s
  `total` is still 5.

### HD-API-20 — POST /meetings without durationMinutes gives 201 and a default of 60

- **Priority:** P0
- **Steps:** `POST /meetings` with exactly the body the dashboard form sends — no
  `durationMinutes`.
- **Expected:** 201 with `durationMinutes` = 60 and the standard key set. Without `@IsOptional()`
  on the DTO field this answers 400 and the "Create meeting" button does not work at all — that is
  the point of the case.

### HD-API-21 — the created id is `mtg-` + a randomUUID, not a seeded literal

- **Priority:** P0
- **Steps:** as `planner`, `POST /meetings` with a unique title and the 2030 date; then
  `GET /meetings/{returned id}` as `planner`.
- **Expected:** the returned `id` matches
  `/^mtg-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/` — the type prefix
  followed by a `randomUUID()` (`FACT-2123`, `ADR-0031`) — so neither a bare UUID nor a seeded
  `mtg-<owner>-<n>` literal passes; the follow-up `GET` returns that same meeting, so the id was
  stored and not only echoed. This case carries the half of the retired `HD-UT-07` that
  `HD-API-16` and `HD-API-17` do not already cover.

### HD-API-22 — equal startsAt still orders by id ascending

- **Priority:** P1
- **Steps:** as `planner`, create **three** meetings with unique titles at the identical
  `FUTURE_STARTS_AT_ISO`. Read back once with `GET /meetings?limit=100`, keep only the three ids
  just created, and compare that subsequence with the same three ids sorted ascending.
- **Expected:** the filtered subsequence equals the ids in ascending order — invariant 7's
  secondary key, the only place in the suite where meetings share a `startsAt`. **Three, not two:**
  detection rests on three random UUIDs arriving out of ascending order, which is five chances in
  six against one in two. **The filter is what makes it race-safe** — other mutating cases create
  `planner` meetings at the same date and may interleave by id without this assertion caring.
  **One read, not two:** the retired `HD-UT-09` read twice because an in-memory sort can depend on
  insertion order, whereas a database returns the same wrong order as often as it is asked.

### HD-API-23 — total follows a delete, relative to a baseline

- **Priority:** P0
- **Data:** one pool user the case claims and takes no page for (`FACT-3783`); two meetings it
  creates with unique titles at `FUTURE_STARTS_AT_ISO`.
- **Steps:** as the held user, read `total` from `GET /meetings?limit=1` as the baseline `B`. Create the
  two meetings. Then three rounds, each reading `GET /meetings?limit=1` for `total` and
  `GET /meetings?limit=100` for membership: after the creates; after `DELETE` of the first; after
  `DELETE` of the second.
- **Expected:** `total` is `B + 2`, then `B + 1`, then `B`. After the creates both ids are in the
  full list; after the first `DELETE` (204) the first id is absent and the second still present;
  after the second `DELETE` (204) neither is. After the creates the `limit=1` read holds one item
  while `total` is `B + 2`, at least two, so `total = items.length` (invariant 4) cannot pass this
  case; a `total` that ignores deletes stays at `B + 2` and fails it too.
- **Cleanup:** `DELETE /meetings/{id}` for both meetings as the held user, through the `cleanup`
  tracker; a `FACT-2016` 404 is the expected answer when the case's own deletes already succeeded.
  The lease's release then finds the user back at 0 (`FACT-3776`).
