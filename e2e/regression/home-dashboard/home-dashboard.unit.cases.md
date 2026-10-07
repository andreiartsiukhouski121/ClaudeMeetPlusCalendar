# Dashboard: unit cases (Vitest)

- **This file has no paired spec** — unit specs live next to the code in `apps/**`, and this is the
  feature map: which case is covered by which spec.
- **Run:** `pnpm test:home-dashboard` (that is `pnpm -r test -t "HD-UT-"`); everything: `pnpm test`.
- **Mandatory rule:** a unit test title starts with its case ID — `it('HD-UT-10 — …')`. Without it
  the `vitest -t "HD-UT-"` filter cannot select the feature, and meta-test rule 7 cannot verify the
  case is automated.
- **Grouping:** every group below starts with a line carrying the **spec path**; the meta-test
  checks the path exists and that every ID listed under it appears in that file.

4 cases, all in `apps/web`. Number `12` was merged into the time-zone independence case; `13` and
`14` (Russian pluralization of "meeting") are **never reused** — the pluralization helper was
removed together with its counter, which now renders as the fixed string `Meetings total: N`.

**`HD-UT-01`…`HD-UT-09` are retired** and their numbers are never reused. They exercised
`MeetingsService` against an in-memory store; the service now reads and writes through Prisma, so
they could only be kept by giving every `pnpm test` run a database (`ADR-0027`, design §5 and §7 of
`docs/plans/meeting-files/design.md`). Where the coverage went: `HD-UT-01`…`06` and `08` were
already asserted over HTTP by `HD-API-01`…`10`; `HD-UT-07`'s id-shape half became `HD-API-21`, and
`HD-UT-09`'s equal-date tiebreak became `HD-API-22`, both at the same strength and both landed
**before** the store moved so they guarded the migration rather than confirming it.

There is deliberately no spec for the mapper (`toMeetingDto`): it is a one-line projection, and the
absence of `ownerId` in the response is checked at contract level by `HD-API-01`. A spec without
described cases would break meta-test rule 8.

## Summary

| ID       | Priority | What it checks                                                 | Where automated |
| -------- | -------- | -------------------------------------------------------------- | --------------- |
| HD-UT-10 | P1       | formatting does not depend on `TZ`, midnight boundary included | `format-date`   |
| HD-UT-11 | P1       | an invalid date → placeholder, no `Invalid Date`, no exception | `format-date`   |
| HD-UT-15 | P0       | a `datetime-local` value gives the same ISO under any `TZ`     | `format-date`   |
| HD-UT-16 | P1       | an empty string and junk → `null`, without throwing            | `format-date`   |

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
