# Meeting detail: API contract (`GET /meetings/:id`, `DELETE /meetings/:id`, `participants` on `POST /meetings`)

- **Paired spec:** `e2e/regression/meetings-detail/meetings-detail.api.spec.ts`
- **Playwright project:** `api` (the `request` fixture, `baseURL = http://127.0.0.1:3101`, no browser)
- **Tags:** `@regression`, `@meetings-detail`, plus `@p0` and `@mutating` where applicable
- **Run:** `pnpm e2e --project=api --grep @meetings-detail`
- **Preconditions:**
  - Playwright starts Nest on 3101 with `JWT_SECRET=e2e-secret`; the seed is applied.
  - Data comes from `e2e/fixtures/seed.ts`. Exact numbers are checked against `teacher`/`student`
    only — mutating them is forbidden.
  - Mutating cases run as `planner`, reserved for `*.api.spec.ts`. No case here counts an absolute
    or relative `total`: a created meeting is found and confirmed absent by its own unique
    generated title, exactly as `e2e/README.md`'s robustness rules prescribe — `home-dashboard.
api.spec.ts` also mutates `planner`, and a `total`-based check here would race it.
  - **No meeting id is ever a literal.** A by-id case reads a real id from `GET /meetings` first,
    or from the `id` a `POST /meetings` in the same test just returned. A deliberately non-existent
    id is derived from a real one (`${realId}-does-not-exist`), never invented from scratch.
  - `GET /meetings/:id` has no `400`: this file adds none.
  - **A delete target is only ever a meeting the case itself just created** as `planner` with
    `POST /meetings`, a unique title and `FUTURE_STARTS_AT_ISO`. No seeded meeting — no `teacher`
    row and not `mtg-planner-2` — is ever sent a `DELETE`, by the owner or by anybody else: a
    broken ownership `where` would then destroy the read-only seed rather than fail one case.
    `student` is the foreign token; it makes requests and is never mutated.
  - **Cleanup:** every case that creates a meeting registers it with its `cleanup` tracker as it is
    created, and the tracker deletes it through `DELETE /meetings/:id` as `planner` in the body's
    `finally`, **also on failure** (`FACT-3780`, `FACT-3809`). This now includes `MD-API-05`,
    `MD-API-06` and `MD-API-08`, whose assertions are unchanged. A cleanup `404` is tolerated only
    when its body is exactly `FACT-2016`; any other `404` — Express's `Cannot DELETE …` included —
    fails the case. The case's own assertion failure is reported beside a cleanup failure, never
    replaced by it.

11 cases. **There is no `meetings-detail.unit.cases.md`:** `MD-UT-01`…`04` were already covered over
HTTP by the cases below, `MD-UT-06`…`09` are **withdrawn** — they guarded the in-memory store's
copy semantics, which cease to exist when every query builds a fresh object (`ADR-0027`) — and
`MD-UT-05` is relocated here as `MD-API-08`, landed before the store moved so that it guards the
migration rather than confirming it. The delete cases add none either: deletion carries no domain
rule (`FACT-3739`).

## Summary

| ID        | Title                                                                           | Priority | Tags                                         |
| --------- | ------------------------------------------------------------------------------- | -------- | -------------------------------------------- |
| MD-API-01 | GET /meetings/:id returns the full meeting for its owner                        | P0       | `@regression @meetings-detail @p0`           |
| MD-API-02 | GET /meetings/:id without a token gives 401                                     | P0       | `@regression @meetings-detail @p0`           |
| MD-API-03 | a non-existent id and another owner's id give byte-identical 404                | P0       | `@regression @meetings-detail @p0`           |
| MD-API-04 | GET /meetings/a/b falls through to Express, not to any Nest handler             | P1       | `@regression @meetings-detail`               |
| MD-API-05 | POST /meetings stores participants verbatim, order preserved                    | P1       | `@regression @meetings-detail @mutating`     |
| MD-API-06 | POST /meetings normalizes an absent, empty or null participants to []           | P1       | `@regression @meetings-detail @mutating`     |
| MD-API-07 | POST /meetings rejects invalid participants shapes with 400, no meeting created | P1       | `@regression @meetings-detail @mutating`     |
| MD-API-08 | padded and duplicated participants are neither trimmed nor deduplicated         | P1       | `@regression @meetings-detail @mutating`     |
| MD-API-09 | DELETE /meetings/:id answers 204 empty, and the meeting is gone                 | P0       | `@regression @meetings-detail @p0 @mutating` |
| MD-API-10 | another owner's DELETE gives the absent id's 404 and the meeting survives       | P0       | `@regression @meetings-detail @p0 @mutating` |
| MD-API-11 | DELETE /meetings/:id without a token gives 401 and the meeting survives         | P0       | `@regression @meetings-detail @p0 @mutating` |

## Cases

### MD-API-01 — GET /meetings/:id returns the full meeting for its owner

- **Priority:** P0
- **Steps:** `GET /meetings?limit=100` as `teacher`, take the first item's `id`. `GET
/meetings/{id}` as `teacher`.
- **Expected:** 200, JSON content type, exactly the keys `durationMinutes`, `id`, `participants`,
  `startsAt`, `title`, and the parsed body equals the matching item from the list response
  (`toEqual`) — the same `MeetingDto` from the same mapper, so the two must agree byte for byte.

### MD-API-02 — GET /meetings/:id without a token gives 401

- **Priority:** P0
- **Steps:** read a real id from `GET /meetings` as `teacher`, then `GET /meetings/{id}` with no
  `Authorization`.
- **Expected:** 401 with exactly
  `{ message: 'Authentication required', error: 'Unauthorized', statusCode: 401 }`.

### MD-API-03 — a non-existent id and another owner's id give byte-identical 404

- **Priority:** P0
- **Steps:** read a real id belonging to `teacher` from `GET /meetings`. Derive a plainly
  non-existent id from it (`${realId}-does-not-exist`). As `student` (who owns neither), request
  `GET /meetings/{realId}` and `GET /meetings/{nonExistentId}`.
- **Expected:** both requests answer 404 with exactly
  `{ message: 'Meeting not found', error: 'Not Found', statusCode: 404 }`, and the two **parsed
  bodies** are equal in **one** `toEqual` — not two separate shape assertions, which would not
  prove the bodies themselves match. This is the case `ADR-0018` exists for: a record that is not
  owned by the caller must be indistinguishable from a record that does not exist at all.

### MD-API-04 — GET /meetings/a/b falls through to Express, not to any Nest handler

- **Priority:** P1
- **Steps:** `GET /meetings/a/b` (a two-segment path; no handler matches it, so no token is
  needed).
- **Expected:** 404 with exactly
  `{ message: 'Cannot GET /meetings/a/b', error: 'Not Found', statusCode: 404 }` — Express's own
  fallback, unrelated to the `Meeting not found` body above; there is no `400` anywhere on this
  route.

### MD-API-05 — POST /meetings stores participants verbatim, order preserved

- **Priority:** P1
- **Steps:** as `planner`, `POST /meetings` with a unique title, the 2030 date and
  `participants: ['Guest Speaker', 'visitor@example.test']`. Read the created `id`, then `GET
/meetings/{id}`.
- **Expected:** the `POST` response is 201 with `participants` equal to the array as sent, order
  preserved; the follow-up `GET /meetings/{id}` returns the same array — proving the value is
  stored, not merely echoed back.

### MD-API-06 — POST /meetings normalizes an absent, empty or null participants to []

- **Priority:** P1
- **Steps:** as `planner`, for each of: the field absent, `participants: []`, `participants: null`
  — `POST /meetings` with a unique title and the 2030 date, then `GET /meetings/{id}` with the
  returned id.
- **Expected:** every one of the three is 201, and both the `POST` response and the follow-up `GET`
  report `participants: []` (`ADR-0017`).

### MD-API-07 — POST /meetings rejects invalid participants shapes with 400, no meeting created

- **Priority:** P1
- **Steps:** as `planner`, `POST /meetings` four times, each with a unique title and the 2030
  date, and one malformed `participants`: a string instead of an array, an array of numbers, an
  array holding an empty string, and an array of 21 entries.
- **Expected:** every attempt answers 400 with an array `message`; the case asserts **membership**
  in that array for the exact literal(s) the contract documents for that input, never its length
  or order — a string instead of an array and an array of numbers each produce **two** messages,
  the other two produce one. Afterwards, `GET /meetings` as `planner` contains none of the four
  unique titles: no meeting was created by any of the four rejected requests.

### MD-API-08 — padded and duplicated participants are neither trimmed nor deduplicated

- **Priority:** P1
- **Steps:** as `planner`, `POST /meetings` with a unique title, the 2030 date and exactly
  `participants: ['  Nina Cole ', 'Nina Cole', 'Nina Cole', 'guest@purpleschool.test']` — the
  payload of the retired `MD-UT-05`, carried over verbatim. Read the created `id`, then
  `GET /meetings/{id}`.
- **Expected:** both the `POST` response and the follow-up `GET` return that array **exactly** as
  sent: four entries, the padded one with its leading and trailing spaces intact, the repeated one
  present three times, order preserved. This is the only case that proves `FACT-1024` — participants
  are never trimmed and never deduplicated. `MD-API-05` sends two distinct clean strings and
  proves nothing about it, and the payload matters more once `participants` is a `text[]` column
  rather than a JS array.

### MD-API-09 — DELETE /meetings/:id answers 204 empty, and the meeting is gone

- **Priority:** P0
- **Data:** one meeting `planner` creates for this case; it holds **no** files.
- **Steps:** as `planner`, `DELETE /meetings/{id}`; then `GET /meetings/{id}`; then
  `GET /meetings?limit=100`; then `DELETE /meetings/{id}` a second time.
- **Expected:** the first `DELETE` answers **204** with an empty body (zero-length text). A Nest
  `@Delete` handler defaults to 200, so the status pins the `@HttpCode` exactly as invariant 1 does
  for login. The `GET` by id answers 404 with exactly `FACT-2016`; the listing holds neither the id
  nor the unique title. The second `DELETE` answers the same `FACT-2016` 404, not 204: a deleted
  record is indistinguishable from one that never existed (`ADR-0018`, `FACT-3380`, `FACT-3392`).
- **Why the meeting holds no files:** this is the case that stays green when the schema's cascade
  is removed, which is what lets `MF-API-25` going red prove that the cascade is what it tests.
- **Cleanup:** `DELETE /meetings/{id}` as `planner`; the `FACT-2016` 404 is the expected answer.

### MD-API-10 — another owner's DELETE gives the absent id's 404 and the meeting survives

- **Priority:** P0
- **Data:** one meeting `planner` creates for this case; `student` as the foreign token.
- **Steps:** as `planner`, `GET /meetings/{id}` and keep the body. As `student`,
  `DELETE /meetings/{id}`, then `DELETE /meetings/{id}-does-not-exist`. As `planner`,
  `GET /meetings/{id}` again.
- **Expected:** both `student` requests answer 404 with exactly `FACT-2016`, and the two parsed
  bodies are equal in **one** `toEqual` — unowned is indistinguishable from absent on the write
  path too (`ADR-0018`, `FACT-3392`). The owner's second `GET` answers 200 with a body equal to the
  first: the foreign `DELETE` removed nothing. This is the case a `where` reduced to `{ id }`
  turns red — the meeting would be gone.
- **Cleanup:** `DELETE /meetings/{id}` as `planner`, which must answer 204 here — the owner's own
  delete is the control that a route answering 404 to everyone would fail.

### MD-API-11 — DELETE /meetings/:id without a token gives 401 and the meeting survives

- **Priority:** P0
- **Data:** one meeting `planner` creates for this case.
- **Steps:** `DELETE /meetings/{id}` with no `Authorization`, then with `Authorization: Bearer`
  carrying no value; then `GET /meetings/{id}` as `planner`.
- **Expected:** both `DELETE`s answer 401 with exactly `FACT-2015`
  (`{ message: 'Authentication required', error: 'Unauthorized', statusCode: 401 }`); the owner's
  `GET` answers 200 with that meeting — the guard refused before anything was deleted.
- **Cleanup:** `DELETE /meetings/{id}` as `planner`, which must answer 204 here — the owner's own
  delete is the control that a route answering 401 to everyone would fail.
