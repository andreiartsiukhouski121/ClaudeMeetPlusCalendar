# Dashboard: unit cases (Vitest)

- **This file has no paired spec** — unit specs live next to the code in `apps/**`, and this is the
  feature map: which case is covered by which spec.
- **Run:** `pnpm test:home-dashboard` (that is `pnpm -r test -t "HD-UT-"`); everything: `pnpm test`.
- **Mandatory rule:** a unit test title starts with its case ID — `it('HD-UT-01 — …')`. Without it
  the `vitest -t "HD-UT-"` filter cannot select the feature, and meta-test rule 7 cannot verify the
  case is automated.
- **Grouping:** every group below starts with a line carrying the **spec path**; the meta-test
  checks the path exists and that every ID listed under it appears in that file.

13 cases, all automated: 9 in `apps/api` (`01…09`) and 4 in `apps/web` (`10`, `11`, `15`, `16`).
Number `12` was merged into the time-zone independence case; `13` and `14` (Russian pluralization
of "meeting") are **never reused** — the pluralization helper was removed together with its
counter, which now renders as the fixed string `Meetings total: N`.

There is deliberately no spec for the mapper (`toMeetingDto`): it is a one-line projection, and the
absence of `ownerId` in the response is checked at contract level by `HD-API-01`. A spec without
described cases would break meta-test rule 8.

## Summary

| ID       | Priority | What it checks                                                 | Where automated   |
| -------- | -------- | -------------------------------------------------------------- | ----------------- |
| HD-UT-01 | P0       | sorting by date DESC regardless of input order                 | `MeetingsService` |
| HD-UT-02 | P0       | `limit` applies: 5 meetings with `limit=3` → 3                 | `MeetingsService` |
| HD-UT-03 | P0       | `countByOwner` is the full count, not the slice length         | `MeetingsService` |
| HD-UT-04 | P0       | filtering by `ownerId`: other users' meetings never appear     | `MeetingsService` |
| HD-UT-05 | P1       | a user with no meetings: empty list and `countByOwner` = 0     | `MeetingsService` |
| HD-UT-06 | P1       | the default `limit` is 3 when the parameter is omitted         | `MeetingsService` |
| HD-UT-07 | P0       | `create` takes `ownerId` from its argument and `id` from UUID  | `MeetingsService` |
| HD-UT-08 | P1       | `create` returns `id`, `title` and `durationMinutes ?? 60`     | `MeetingsService` |
| HD-UT-09 | P2       | equal dates still give a deterministic order (secondary sort)  | `MeetingsService` |
| HD-UT-10 | P1       | formatting does not depend on `TZ`, midnight boundary included | `format-date`     |
| HD-UT-11 | P1       | an invalid date → placeholder, no `Invalid Date`, no exception | `format-date`     |
| HD-UT-15 | P0       | a `datetime-local` value gives the same ISO under any `TZ`     | `format-date`     |
| HD-UT-16 | P1       | an empty string and junk → `null`, without throwing            | `format-date`     |

## `apps/api/src/meetings/meetings.service.spec.ts`

Test data is created through `create()` under dedicated owners (`usr-unit-*`) rather than taken
from the seed: the seed is sorted ascending, so the "arbitrary order" of `HD-UT-01` cannot be
reproduced on it, and a test must not go red because a meeting was added to the seed. The service
is rebuilt before each test, or created meetings would leak between cases.

- `HD-UT-01` P0 — `findRecent` sorts by `startsAt` DESC even when the input order is shuffled;
  the timestamp sequence is non-increasing.
- `HD-UT-02` P0 — `findRecent` applies `limit`: five meetings with `limit=3` return three.
- `HD-UT-03` P0 — `countByOwner` returns the owner's full count (5) while the page holds three, and
  the two are explicitly different. This is invariant 4, and the control experiment
  (`total = items.length`) must break this assertion.
- `HD-UT-04` P0 — `findRecent` filters by `ownerId`. The foreign meeting is deliberately the newest
  one, so without filtering it would come first.
- `HD-UT-05` P1 — a user with no meetings gets an empty list and `countByOwner` = 0.
- `HD-UT-06` P1 — the default `limit` of 3 applies both when the argument is omitted and when it is
  `undefined` — the latter is exactly what `ListMeetingsQueryDto` yields without the parameter.
- `HD-UT-07` P0 — `create` writes `ownerId` from its argument (invariant 5) and an `id` from
  `randomUUID()` that does not match the seeded `mtg-*` shape.
- `HD-UT-08` P1 — `create` returns the given title, the given duration, and 60 minutes when no
  duration was supplied.
- `HD-UT-09` P2 — with equal dates the order is deterministic thanks to the secondary sort by `id`,
  and it is the same across two consecutive calls (invariant 7).

## `apps/web/src/lib/format-date.spec.ts`

`process.env.TZ` genuinely affects later date operations in Node, so the time-zone checks are real
rather than decorative; the original value is restored in `afterEach` so test order cannot matter.

- `HD-UT-10` P1 — `formatMeetingDateTime` gives the same string under `TZ=UTC` and `TZ=Asia/Tokyo`,
  including for 23:30 UTC, which is already the next day in Tokyo. Without `timeZone: 'UTC'` the
  date would shift.
- `HD-UT-11` P1 — an invalid date yields the placeholder rather than `Invalid Date` in the markup
  or an exception: one broken date must not take the dashboard down.
- `HD-UT-15` P0 — `toIsoStartsAt` turns a zoneless `datetime-local` value into the same ISO string
  under any `TZ`, while a value with an explicit zone is taken as is.
- `HD-UT-16` P1 — an empty string, whitespace and junk return `null` without throwing, or the
  Server Action would 500 instead of returning `{ error }`.
