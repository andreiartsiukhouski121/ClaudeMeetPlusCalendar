# Smoke: seed is in place

- **Paired spec:** `e2e/smoke/seed.api.spec.ts`
- **Playwright project:** `api` (the `request` fixture, `baseURL = http://127.0.0.1:3101`, no browser)
- **Tags:** `@smoke`, plus `@p0`
- **Run:** `pnpm e2e e2e/smoke`
- **Preconditions:** Playwright starts Nest on 3101 through `pnpm start:e2e`, which resets the
  database and applies the standalone seed before the server answers — the seed is no longer a
  service constructor. Expected values come from `e2e/fixtures/seed.ts`, the single source of truth
  for tests; this file exists to catch drift against `users.seed.ts`, `meetings.seed.ts` and
  `meeting-files.seed.ts`.

The point is to fail **before** the regression cases, and clearly: half the suite relies on
specific seeded users and their meetings, so without this smoke their absence gives a dozen red
feature cases instead of one sensible message about the seed. The failure message must therefore
point at the seed, not at the feature.

## Summary

| ID        | Title                                        | Priority | Tags         |
| --------- | -------------------------------------------- | -------- | ------------ |
| SM-API-02 | seeded users are in place                    | P0       | `@smoke @p0` |
| SM-API-03 | seeded meetings and their files are in place | P0       | `@smoke @p0` |

## Cases

### SM-API-02 — seeded users are in place

- **Priority:** P0
- **Preconditions:** `POST /auth/login` works; all four `SEED_USER_KEYS` are described in
  `e2e/fixtures/seed.ts`.
- **Steps:** for each of the four seeded users (`teacher`, `student`, `planner`, `organizer`)
  perform `POST /auth/login` with the email and password from `e2e/fixtures/seed.ts`.
- **Expected:** all four logins return 200 and an `accessToken` of three dot-separated segments. On
  failure the message names the user and says the seed is what to compare
  (`apps/api/src/users/users.seed.ts` against `e2e/fixtures/seed.ts`), not the feature under test.

### SM-API-03 — seeded meetings and their files are in place

- **Priority:** P0
- **Preconditions:** `GET /meetings` and `GET /meetings/:id/files` work and require `Bearer`;
  `TEACHER_MEETINGS` describes the five meeting titles of `teacher` and, per title, its
  `participants` array; `TEACHER_MEETING_FILES` mirrors the two seeded files of "Geometry workshop"
  — `filename`, `contentType`, `sizeBytes` and `uploadedAt` for each; `HEADER_SAFETY_MEETING`
  mirrors the title of `planner`'s dedicated meeting and the five hostile filenames seeded onto it
  (`SEC-API-11`); `student` is declared as the user with no meetings.
- **Steps:** get tokens for `teacher`, `student` and `planner`, then `GET /meetings?limit=100` as
  `teacher` and as `student`. Take the id of the meeting titled "Geometry workshop" from `teacher`'s
  response and request its file listing; do the same for one other `teacher` meeting. Then, as
  `planner`, find the meeting whose title matches `HEADER_SAFETY_MEETING` and request its listing.
- **Expected:** `teacher` has `total` = 5 and `items` contains all five seeded titles (the three
  most recent plus the two the slice cuts); for each of those five titles, the responding meeting's
  `participants` array equals — verbatim, order included — `TEACHER_MEETINGS.participants[title]`;
  `student` has `total` = 0 and an empty `items`. `limit=100` means "give me everything" — the
  contract's ceiling (`@Max(100)`), not a magic number that would need changing as the seed grows.
  "Geometry workshop" lists exactly the two mirrored files, `notes.txt` before `syllabus.pdf`, each
  matching `TEACHER_MEETING_FILES` field for field; the other meeting lists none, so the empty
  state is part of the seeded baseline rather than an accident. The header-safety meeting is present
  in `planner`'s list and lists **exactly** the five mirrored filenames, compared as a set and
  character for character — including the quote, the carriage return, the line feed, the path and
  the non-ASCII name, which is the whole point of mirroring them: a seed that quietly dropped or
  "cleaned up" one of those names would leave `SEC-API-11` passing against a fixture that no longer
  contains anything hostile. On failure the message points at the meeting or file seed and names the
  files to compare, and for a `participants` or a file mismatch names the specific meeting title
  that disagreed.
- **What is asserted about `planner` and what is not:** this case reads **one named meeting** of
  `planner`'s and its files, never a count of `planner`'s meetings and never its seeded
  `participants`. `planner` is the `api` project's mutation sandbox, so any count races the cases
  creating meetings there; a single meeting found by title does not, because nothing creates a
  second meeting under that title and nothing uploads into it
  (`e2e/regression/meeting-files/meeting-files.api.cases.md` makes that a precondition).
  `organizer`'s seeded `participants` and `planner`'s own (`PLANNER_MEETING_PARTICIPANTS` /
  `ORGANIZER_MEETING_PARTICIPANTS`) stay mirrored for completeness and deliberately **not** asserted
  here, for the reason above and as
  `docs/plans/meetings-detail-participants/meetings-detail-participants.plan.md` §6 records.
