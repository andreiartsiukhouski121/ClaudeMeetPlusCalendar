# Dashboard: unit cases (Vitest)

- **This file has no paired spec** — unit specs live next to the code in `apps/**`, and this is the
  feature map: which case is covered by which spec.
- **Run:** `pnpm test:home-dashboard` (that is `pnpm -r test -t "HD-UT-"`); everything: `pnpm test`.
- **Mandatory rule:** a unit test title starts with its case ID — `it('HD-UT-10 — …')`. Without it
  the `vitest -t "HD-UT-"` filter cannot select the feature, and meta-test rule 7 cannot verify the
  case is automated.
- **Grouping:** every group below starts with a line carrying the **spec path**; the meta-test
  checks the path exists and that every ID listed under it appears in that file.

9 cases: 4 in `apps/web` (`10`, `11`, `15`, `16`) and 5 in `apps/api` (`17`…`21`). Number `12` was
merged into the time-zone independence case; `13` and `14` (Russian pluralization of "meeting") are
**never reused** — the pluralization helper was removed together with its counter, which now renders
as the fixed string `Meetings total: N`.

**`HD-UT-01`…`HD-UT-09` are retired** and their numbers are never reused. They exercised
`MeetingsService` against an in-memory store; the service now reads and writes through Prisma, so
they could only be kept by giving every `pnpm test` run a database (`ADR-0027`, design §5 and §7 of
`docs/plans/meeting-files/design.md`). Where the coverage went: `HD-UT-01`…`06` and `08` were
already asserted over HTTP by `HD-API-01`…`10`; `HD-UT-07`'s id-shape half became `HD-API-21`, and
`HD-UT-09`'s equal-date tiebreak became `HD-API-22`, both at the same strength and both landed
**before** the store moved so they guarded the migration rather than confirming it.

**`HD-UT-17`…`21` are not those cases back.** The rules a meeting holds on creation — the id, the
canonical `startsAt`, the two defaults — moved from the service into the `Meeting` entity
(`ADR-0035`), which needs no store, so they are asked directly again; the query rules (owner filter,
order, count) stay in the repository adapter and stay asserted over HTTP only (`FACT-3739`).

There is deliberately no spec for the mapper (`toMeetingDto`): it is a one-line projection, and the
absence of `ownerId` in the response is checked at contract level by `HD-API-01`. A spec without
described cases would break meta-test rule 8.

## Summary

| ID       | Priority | What it checks                                                    | Where automated  |
| -------- | -------- | ----------------------------------------------------------------- | ---------------- |
| HD-UT-10 | P1       | formatting does not depend on `TZ`, midnight boundary included    | `format-date`    |
| HD-UT-11 | P1       | an invalid date → placeholder, no `Invalid Date`, no exception    | `format-date`    |
| HD-UT-15 | P0       | a `datetime-local` value gives the same ISO under any `TZ`        | `format-date`    |
| HD-UT-16 | P1       | an empty string and junk → `null`, without throwing               | `format-date`    |
| HD-UT-17 | P1       | `create` yields the six fields, `startsAt` as canonical UTC       | `domain/meeting` |
| HD-UT-18 | P1       | `create` makes the id `mtg-` + the uuid passed in, verbatim       | `domain/meeting` |
| HD-UT-19 | P1       | absent or `null` `durationMinutes` → 60, a given value kept       | `domain/meeting` |
| HD-UT-20 | P1       | absent or `null` `participants` → `[]`, a given list kept as sent | `domain/meeting` |
| HD-UT-21 | P1       | `restore` validates, normalizes and defaults nothing              | `domain/meeting` |

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

## `apps/api/src/meetings/domain/meeting.spec.ts`

The `Meeting` entity, asked with the uuid as a plain argument and no storage (`FACT-3738`,
`FACT-3739`). `create` takes one input object — `ownerId`, `title`, `startsAt`, the optional
`durationMinutes` and `participants`, and `uuid` — as `MeetingFile.upload` takes one. Input bounds
(title length, duration range, participant count and length) are the DTO's and are **not** asked
here: the pipe rejects them before the handler (`FACT-3707`), so an entity re-check could never fire.

- `HD-UT-17` P1 — `create` with `ownerId` `usr-1`, `title` `Weekly sync`, `startsAt`
  `2026-01-12T10:00:00+01:00`, `durationMinutes` 30, `participants` `['Nina Cole']` and `uuid`
  `3f2b8c1e-4d5a-4e6f-8a7b-9c0d1e2f3a4b` yields exactly `id`
  `mtg-3f2b8c1e-4d5a-4e6f-8a7b-9c0d1e2f3a4b`, `ownerId` `usr-1`, `title` `Weekly sync`, `startsAt`
  `2026-01-12T09:00:00.000Z`, `durationMinutes` 30 and `participants` `['Nina Cole']` — no other
  field, and `startsAt` a **string**, never a `Date` (`FACT-1008`, `FACT-2123`). The same input with
  `startsAt` `2026-01-12T09:00:00Z` gives `2026-01-12T09:00:00.000Z`: the rule is canonical UTC, not
  merely "ends in `Z`". An entity that stores `startsAt` as sent fails on both inputs.
- `HD-UT-18` P1 — the id is exactly `mtg-` followed by the `uuid` passed in, **verbatim**
  (`ADR-0031`, `FACT-1080`, `FACT-3738`): `00000000-0000-0000-0000-000000000000`, deliberately not a
  v4 value, gives `mtg-00000000-0000-0000-0000-000000000000`; two creates from otherwise identical
  inputs with different `uuid`s give two different ids, each `mtg-` + its own uuid. The entity
  **neither generates nor validates** the uuid: one that drew its own fails the fixed value, and one
  that checked the v4 shape throws on it. The v4 format and uniqueness belong to the shared
  `CryptoUuidSource` adapter, whose case lives in `meeting-files.unit.cases.md`.
- `HD-UT-19` P1 — `durationMinutes` absent, and an explicit `null` cast past the type, both give
  `60` (`FACT-1009`); `@IsOptional()` lets a `null` through the pipe (invariant 2), so the second
  input is reachable, not only defensive. `DEFAULT_DURATION_MINUTES` from `domain/limits.ts` is
  asserted to be `60`, so a changed constant fails here rather than over HTTP (`FACT-3736`). A given
  value is kept as given: `15` → `15`, `480` → `480`. An entity that defaults only `undefined`
  fails on `null`.
- `HD-UT-20` P1 — `participants` absent, an explicit `null` cast past the type, and `[]` all give
  `[]` — never `undefined`, never `null` (`FACT-2051`, `FACT-2052`, `FACT-2054`, `FACT-1010`).
  `['Nina Cole', 'Nina Cole']` comes back with **both** entries, and
  `[' Nina Cole ', 'NINA@EXAMPLE.COM', 'Anna']` comes back in that order, untrimmed and not
  lower-cased (`FACT-3351`, `FACT-1024`, `FACT-2053`). An entity that deduplicates, trims,
  lower-cases or sorts fails one of the two.
- `HD-UT-21` P1 — `restore` validates, normalizes and defaults **nothing**: a stored row with `id`
  `mtg-teacher-1`, `ownerId` `usr-1`, `title` `Hi` (under the DTO's minimum), `startsAt`
  `2026-01-12T10:00:00+01:00` (not canonical), `durationMinutes` 5 (under the DTO's minimum) and
  `participants` `['Nina Cole', 'Nina Cole']` comes back field-for-field deep-equal and throws
  nothing. The id is the seed's form, not `mtg-` + a uuid (`FACT-1080`): a `restore` routed through
  `create` fails on it, and one that re-normalizes `startsAt` or re-checks a bound fails on the rest.
