# Meeting detail: API contract (`GET /meetings/:id`, `participants` on `POST /meetings`)

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

7 cases.

## Summary

| ID        | Title                                                                           | Priority | Tags                                     |
| --------- | ------------------------------------------------------------------------------- | -------- | ---------------------------------------- |
| MD-API-01 | GET /meetings/:id returns the full meeting for its owner                        | P0       | `@regression @meetings-detail @p0`       |
| MD-API-02 | GET /meetings/:id without a token gives 401                                     | P0       | `@regression @meetings-detail @p0`       |
| MD-API-03 | a non-existent id and another owner's id give byte-identical 404                | P0       | `@regression @meetings-detail @p0`       |
| MD-API-04 | GET /meetings/a/b falls through to Express, not to any Nest handler             | P1       | `@regression @meetings-detail`           |
| MD-API-05 | POST /meetings stores participants verbatim, order preserved                    | P1       | `@regression @meetings-detail @mutating` |
| MD-API-06 | POST /meetings normalizes an absent, empty or null participants to []           | P1       | `@regression @meetings-detail @mutating` |
| MD-API-07 | POST /meetings rejects invalid participants shapes with 400, no meeting created | P1       | `@regression @meetings-detail @mutating` |

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
