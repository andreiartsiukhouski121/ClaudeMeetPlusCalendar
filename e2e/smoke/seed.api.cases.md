# Smoke: seed is in place

- **Paired spec:** `e2e/smoke/seed.api.spec.ts`
- **Playwright project:** `api` (the `request` fixture, `baseURL = http://127.0.0.1:3101`, no browser)
- **Tags:** `@smoke`, plus `@p0`
- **Run:** `pnpm e2e e2e/smoke`
- **Preconditions:** Playwright starts Nest on 3101 and the seed is applied when `UsersService` and
  `MeetingsService` initialize. Expected values come from `e2e/fixtures/seed.ts` — the single
  source of truth for tests; this file exists to catch drift against `users.seed.ts` and
  `meetings.seed.ts`.

The point is to fail **before** the regression cases, and clearly: half the suite relies on
specific seeded users and their meetings, so without this smoke their absence gives a dozen red
feature cases instead of one sensible message about the seed. The failure message must therefore
point at the seed, not at the feature.

## Summary

| ID        | Title                        | Priority | Tags         |
| --------- | ---------------------------- | -------- | ------------ |
| SM-API-02 | seeded users are in place    | P0       | `@smoke @p0` |
| SM-API-03 | seeded meetings are in place | P0       | `@smoke @p0` |

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

### SM-API-03 — seeded meetings are in place

- **Priority:** P0
- **Preconditions:** `GET /meetings` works and requires `Bearer`; `TEACHER_MEETINGS` describes the
  five meeting titles of `teacher`, and `student` is declared as the user with no meetings.
- **Steps:** get tokens for `teacher` and `student`, then `GET /meetings?limit=100` as each.
- **Expected:** `teacher` has `total` = 5 and `items` contains all five seeded titles (the three
  most recent plus the two the slice cuts); `student` has `total` = 0 and an empty `items`.
  `limit=100` means "give me everything" — the contract's ceiling (`@Max(100)`), not a magic number
  that would need changing as the seed grows. On failure the message points at the meeting seed and
  names the files to compare.
