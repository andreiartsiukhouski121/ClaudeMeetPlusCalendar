# Meeting detail: unit cases (Vitest)

- **This file has no paired spec** — unit specs live next to the code in `apps/**`, and this is the
  feature map: which case is covered by which spec.
- **Run:** `pnpm test:meetings-detail` (that is `pnpm -r test -t "MD-UT-"`); everything: `pnpm test`.
- **Mandatory rule:** a unit test title starts with its case ID — `it('MD-UT-01 — …')`. Without it
  the `vitest -t "MD-UT-"` filter cannot select the feature, and meta-test rule 7 cannot verify the
  case is automated.
- **Grouping:** every group below starts with a line carrying the **spec path**; the meta-test
  checks the path exists and that every ID listed under it appears in that file.

9 cases, all in `apps/api`. `meetings.service.spec.ts` already carries `HD-UT-01`…`09`
(`home-dashboard.unit.cases.md`); those ids stay where they are and are not renumbered here — this
file only adds the `MD-UT-` group to the same spec.

The HTTP-level twin of `MD-UT-02`/`MD-UT-03` — that an unknown id and another owner's id give
byte-identical 404 **bodies** — is `MD-API-03`'s job; this file only proves the service returns the
same `undefined` for both, which is the one-return-path fact `ADR-0018` is built on.

## Summary

| ID       | Priority | What it checks                                                            | Where automated   |
| -------- | -------- | ------------------------------------------------------------------------- | ----------------- |
| MD-UT-01 | P0       | `findById` returns the full meeting for its owner                         | `MeetingsService` |
| MD-UT-02 | P0       | `findById` returns `undefined` for an unknown id                          | `MeetingsService` |
| MD-UT-03 | P0       | `findById` returns `undefined` for an id owned by somebody else           | `MeetingsService` |
| MD-UT-04 | P0       | `create` normalizes absent, `[]` and explicit `null` participants to `[]` | `MeetingsService` |
| MD-UT-05 | P1       | `create` stores a given participants array verbatim, order preserved      | `MeetingsService` |
| MD-UT-06 | P0       | `create`'s returned array is a copy, not shared with the store            | `MeetingsService` |
| MD-UT-07 | P0       | `findById`'s returned array is a copy, not shared with the store          | `MeetingsService` |
| MD-UT-08 | P0       | `findRecent`'s returned array is a copy, not shared with the store        | `MeetingsService` |
| MD-UT-09 | P0       | the constructor's seed copy does not share the array with `SEED_MEETINGS` | `MeetingsService` |

## `apps/api/src/meetings/meetings.service.spec.ts`

Test data for `MD-UT-01`…`08` is created through `create()` under dedicated owners (`usr-unit-*`),
same convention as `HD-UT-01`…`09`. `MD-UT-09` is the one case that must read the **seed** rather
than a created meeting, because it is the seed array specifically that the constructor's copy site
protects — a meeting created through `create()` was never at risk of sharing memory with
`SEED_MEETINGS` in the first place. It also runs in the **opposite direction** from `MD-UT-06`
through `08`, and deliberately so — see the case itself.

- `MD-UT-01` P0 — a meeting created for an owner is returned in full by `findById(ownerId, id)`:
  every field, including `participants`, matches what `create` returned.
- `MD-UT-02` P0 — `findById(ownerId, unknownId)` returns `undefined` for an id that was never
  created.
- `MD-UT-03` P0 — `findById(otherOwnerId, id)` returns `undefined` for a real id owned by somebody
  else — the same `undefined` as `MD-UT-02`, by construction (`ADR-0018`): the ownership check
  lives inside `findById`, not in a second branch, so an unknown id and a wrong-owner id are one
  code path, not two that happen to agree.
- `MD-UT-04` P0 — `create` stores `[]` for three separate inputs: `participants` absent from the
  argument object, `participants: []`, and `participants: null` (cast past the type, exactly what a
  validated-but-permissive runtime value would be) — `ADR-0017`'s normalization, measured by design
  probe PF2.
- `MD-UT-05` P1 — `create` stores a given array exactly as given: order preserved, no trimming of
  entries, no deduplication of a repeated entry.
- `MD-UT-06` P0 — mutating the `participants` array on the object `create` returns does not change
  what a later `findById` for the same id reports — `create`'s return is a copy of the stored array,
  not the stored array itself.
- `MD-UT-07` P0 — two calls to `findById` for the same id return two independent arrays: mutating
  the first does not affect the second.
- `MD-UT-08` P0 — mutating the `participants` array of an item returned by `findRecent` does not
  change what a later `findRecent` call reports — the `byOwner` copy site.
- `MD-UT-09` P0 — mutates the module-level `SEED_MEETINGS[i].participants` array **itself**, from
  outside the service, then asserts that `findById` for that seeded meeting still reports the
  original, unmutated array. This is the reverse of `MD-UT-06`/`07`/`08`, and it has to be: mutating
  the array `findById` _returns_ — the pattern the other three use — cannot observe this particular
  bug, because `findById` clones on every exit regardless of what the constructor did, so even a
  constructor that shared the reference with `SEED_MEETINGS` would still hand back an independent
  array on the way out. Only mutating `SEED_MEETINGS` first and reading through `findById`
  afterwards exposes whether the constructor's `{ ...seed, participants: [...seed.participants] }`
  cloned the array or merely spread the object and kept the same reference — `{ ...seed }` alone
  would let the seed's own mutation show up in the service's answer. The mutation is undone in a
  `finally` block: `SEED_MEETINGS` is a module-level constant shared with every other test in this
  file and with `e2e/fixtures/seed.ts`'s mirror check (`SM-API-03`).
