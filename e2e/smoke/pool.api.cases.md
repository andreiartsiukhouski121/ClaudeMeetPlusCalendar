# Smoke: the user pool and the cleanup trackers

- **Paired spec:** `e2e/smoke/pool.api.spec.ts`
- **Playwright project:** `api` (the `request` fixture, `baseURL = http://127.0.0.1:3101`, no browser)
- **Tags:** `@smoke`, plus `@p0` and `@mutating` where applicable
- **Run:** `pnpm e2e e2e/smoke`
- **Preconditions:**
  - The seed holds the ten pool users, each with no meetings (`FACT-3773`); the suite's lease,
    claim and trackers come from `e2e/fixtures/suite.ts` and `e2e/api/cleanup.api.ts`.
  - **The scratch pool.** Every case below drives the pool on a **scratch pool directory** under
    the test's own output path, passed as the lease's pool-directory parameter — **never
    `.e2e-pool/`**, which the live run's browser and `api` cases are claiming from at the same time.
    A leaked mark, a takeover or a release written there would shrink or corrupt the live pool.
  - **Slots map to real users.** A scratch slot `pool-NN` is still the database user
    `usr-pool-NN`, whom a live test may hold. So a case that lets the scratch pool **read or delete a
    user's data** first claims that user in the live pool through the `claim` fixture, then
    pre-occupies every other scratch slot with an owner record naming this worker's own live process
    id, so the scratch claim can land only on the user the case holds. A case that never reads data
    frees a scratch slot by removing its directory, not through the release, which would read the
    user's `total`.
  - A dead holder is the process id of a child process the case started and waited to exit. Pid
    reuse within one run is not yet probed; a reused pid would make a takeover case wait, not pass.
  - Every body is `try { … } finally { await cleanup.run(); }` (`FACT-3809`); rows a case creates
    on a held user are registered with the test's `cleanup` tracker, so the live release finds the
    user back at 0 whatever the case asserted.

These cases exist because the pool's promises are invisible from any feature case: a feature case
goes red only when a promise fails **and** two tests happen to collide on one user. Here each
promise is provoked on purpose.

## Summary

| ID        | Title                                                         | Priority | Tags                   |
| --------- | ------------------------------------------------------------- | -------- | ---------------------- |
| SM-API-04 | concurrent claims give each slot exactly one holder           | P0       | `@smoke @p0`           |
| SM-API-05 | a two-user claim holds both users or neither                  | P1       | `@smoke`               |
| SM-API-06 | the release refuses a claim that names another test           | P1       | `@smoke`               |
| SM-API-07 | a clean release frees the slot; a dirty one marks it leaked   | P0       | `@smoke @p0 @mutating` |
| SM-API-08 | a takeover purges a dead holder's user, and only that user    | P0       | `@smoke @p0 @mutating` |
| SM-API-09 | `trackAllOf` tolerates its own purge, and no other 404        | P1       | `@smoke @mutating`     |
| SM-API-10 | a tracker's `run()` deletes in reverse, records, never throws | P1       | `@smoke @mutating`     |
| SM-API-11 | a transient rename failure onto a free slot is not "taken"    | P1       | `@smoke`               |

## Cases

### SM-API-04 — concurrent claims give each slot exactly one holder

- **Priority:** P0
- **Data:** a scratch pool with seven slots pre-occupied by live owner records; three free.
- **Steps:** start ten scratch claims at once, each under its own test id. When three have
  resolved, read each winner's slot and its `owner.json`. Free one winner's slot by removing its
  directory, wait for one more claim to resolve, and repeat until all ten have held a slot.
- **Expected:** exactly three claims resolve while three slots are free, each onto a **different**
  slot; no slot is ever reported by two claims at once — two resolutions on one slot fail the case
  naming both test ids. Every `owner.json` holds `pid`, `workerIndex`, `testId` and `claimedAt`,
  and its `testId` is the winner's own, so a claim never exists without its record (`FACT-3774`).
  No `.tmp-*` directory is left behind by a winner, and every claim eventually resolves.
- **Red on purpose when:** a failed rename is treated as success (control C1).

### SM-API-05 — a two-user claim holds both users or neither

- **Priority:** P1
- **Data:** a scratch pool with eight slots pre-occupied by live owner records; two free.
- **Steps:** start two scratch claims for two users each, at once. When the first resolves, read
  both free slots' records; then free those two slots by removing their directories and wait for the
  second.
- **Expected:** the first claim resolves holding **both** free slots while the second is still
  pending; the second then resolves holding both. Neither resolves holding one slot, and the case
  never times out: two claimants cannot each hold one user while waiting for the other's
  (`FACT-3775`).

### SM-API-06 — the release refuses a claim that names another test

- **Priority:** P1
- **Data:** a scratch pool with nine slots pre-occupied by live owner records; one free.
- **Steps:** take a scratch claim; overwrite its `owner.json` with another test id; call the
  scratch release.
- **Expected:** the release fails naming **both** test ids, before reading any user's data, and the
  slot directory is still in place (`FACT-3776`).

### SM-API-07 — a clean release frees the slot; a dirty one marks it leaked

- **Priority:** P0
- **Data:** one pool user `U` = `pool-NN`, claimed in the live pool; a scratch pool whose only free
  slot is `pool-NN`.
- **Steps:** register `cleanup.trackAllOf(claim)` for `U` first. Take a scratch claim and release
  it with `U` at 0 meetings. Take a scratch claim again;
  create one meeting as `U` and register it by id with the test's `cleanup`; release the scratch
  claim.
- **Expected:** the first release removes `claims/pool-NN` and leaves no `.released-*` directory.
  The second fails with exactly `pool-NN holds 1 meetings after the test's cleanup`, deletes nothing
  — `U` still has `total` 1 when the release has failed — writes `claims/pool-NN/leaked.json`, and
  leaves `claims/pool-NN` in place (`FACT-3776`, `FACT-3812`). The body's `finally` then deletes the
  meeting, and the live release is green.

### SM-API-08 — a takeover purges a dead holder’s user, and only that user

- **Priority:** P0
- **Data:** two pool users `U` = `pool-NN` and `V` = `pool-MM`, claimed together in the live pool;
  `cleanup.trackAllOf(claim)` registered first. A scratch pool in which every other slot
  is pre-occupied by live owner records; `pool-NN` holds a record naming a dead pid and test id
  `T`; `pool-MM` holds a record naming a dead pid and a `leaked.json`. Two meetings created as `U`.
- **Steps:** create a `pool-NN.takeover` marker of another claimant's; start a scratch claim and
  let it rescan for at least one second. Remove the marker and wait for the claim. Release it.
- **Expected:** while the marker exists, the claim takes nothing: `U` still has `total` 2 and both
  slots' records are unchanged. Once the marker is gone the claim takes over `pool-NN`: `U`'s
  meetings are deleted until `total` is 0, `pool-NN`'s record names the claimant's own pid and test
  id, and no `pool-NN.takeover` remains. `pool-MM` is never taken over though its holder is dead —
  its record and `leaked.json` are untouched throughout (`FACT-3777`). `V` is claimed live only so
  that a broken guard purges a user this case holds. The release then frees the slot.
- **Not covered here:** the branch where the re-read under the marker names a different holder.
  It sits between two filesystem calls of one claimant and cannot be provoked on purpose from a
  test, so it is no scenario.

### SM-API-09 — `trackAllOf` tolerates its own purge, and no other 404

- **Priority:** P1
- **Data:** one pool user `U` = `pool-NN`, claimed in the live pool; `planner`; a scratch pool
  whose only free slot is `pool-NN`.
- **Steps:** on two trackers over the test's lease, `A` and `B` — `B` standing for `preconditions`:
  create meeting `M1` as `U` and register it by id on `B`; create `M2` as `U` and register it by id
  on `A`; then register `A.trackAllOf(claim)`. Run `A`, then `B`, and read both trackers' recorded
  failures. Then create a `planner` meeting, delete it directly, register its path on a third
  tracker with `planner`'s token and run it. Finally take a scratch claim, release it, create `M3`
  as `U` registered with the test's `cleanup`, register a fourth tracker's `trackAllOf` on that
  released claim and run it.
- **Expected:** `U` has `total` 0 after `A` runs; neither `A` nor `B` records a failure — `M2` and
  `M1` were both registered before the collection and deleted after its purge, and each not-found
  `404` was the exact `FACT-2016` body, accepted on either tracker because the lease had recorded
  `U`'s claim (`FACT-3810`). The `planner` entry records a
  failure naming its path: the tolerance is not a token's but a held claim's. The released claim's
  `trackAllOf` deletes nothing — `M3` still exists — and records a failure naming `pool-NN`.

### SM-API-10 — a tracker's `run()` deletes in reverse, records, never throws

- **Priority:** P1
- **Data:** `planner`; one meeting with one file the case creates.
- **Steps:** on a tracker over the test's lease, register the meeting, then its file, then a
  `DELETE /meetings/a/b` entry that no route serves. Call `run()`; read its recorded failures; call
  `run()` again.
- **Expected:** the first `run()` resolves rather than rejecting. The file and the meeting both
  answer 204 — the file first, or its `DELETE` would answer the meeting's `FACT-2016` 404 and be
  recorded. Exactly one failure is recorded, naming `/meetings/a/b` and Express's `Cannot DELETE`
  404, which is not the exact contract body (`FACT-3780`). The second `run()` sends no request and
  records nothing new: the tracker emptied itself.

### SM-API-11 — a transient rename failure onto a free slot is not "taken"

- **Priority:** P1
- **Data:** none from the application; two record directories and a slot path in the test's own
  output directory.
- **Steps:** drive `renameOrFalse` from `e2e/fixtures/suite.ts` with a rename that throws `EPERM`
  on its first call and renames on the second, onto a slot path that does not exist. Then drive it
  with the real rename onto a slot path that already exists.
- **Expected:** the first call returns `true` and the record now sits at the slot path; the second
  returns `false` without waiting the whole retry window as if the slot were free.
- **Why:** a claim is an atomic rename, and every failed rename used to mean "taken". On Windows a
  freshly made directory is briefly held by an indexer or an antivirus scan and the rename fails
  with `EPERM` though no one holds the slot, so `SM-API-09`'s scratch setup went red with "the
  scratch slot pool-05 was already taken" in one `pnpm verify` of 2026-10-26 (`FX-054`). A failure
  is "taken" only while the destination exists.
