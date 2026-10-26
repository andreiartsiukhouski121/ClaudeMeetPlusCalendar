<!-- agent: research-reviewer; session: b988267e-c081-447a-abcb-7f7b884c5b13; captured: 2026-10-21T16:04:26.290Z -->

VERDICT
Change: e2e-test-architecture
Gate: FEAT-G1
Pass: re-run
Verdict: accept
Findings:
- nit | - | stale-fact | contract.md §7 says a range-form grep found no hit for these keys, but docs/CHANGELOG.md:38 holds the range `FACT-1084`…`FACT-1087`, which covers FACT-1085 and FACT-1086; the FACT-1085 row leaves CHANGELOG.md:38 out
- nit | - | doc-drift | contract.md §1 still cites session-cookie.ts:11,19,32-40 (unchanged on the re-run), while code.md now has the correct :10, :17, :34-41
END VERDICT

# Research review, re-run: e2e-test-architecture, research review gate (FEAT-G1)

All four blockers from the first pass are fixed. I checked each fix by opening the cited lines. I checked the new citer table (`contract.md` §7) in full against my own repository grep. I found no new blockers.

## Blocker by blocker

**1. Line citations past the end of a file or off by a few lines (correction): fixed.** I opened every line the first pass flagged at HEAD:
- **`auth.api.ts`:** scrypt is at `:10-11`, `tokenCache` at `:19`, and the "Tokens do not expire mid-run" sentence at `:17`.
- **`cleanup.api.ts`:** `withCleanup` is at `:62`, `deleteTracked` at `:37`, and the header naming "`*.api.spec.ts` cases" at `:4`.
- **`auth.fixture.ts`:** the comment about the state file is at `:32-34`, the path function at `:36-41`, the write at `:77`, the `authStateFor` fixture at `:90-106`, `authUser` at `:109`, and `newContext({ storageState })` at `:113`.
- **`warm-up.ts`:** the login is at `:102-106`, the reason for a real login at `:19-20`, and "up to 14 workers" at `:10`.
- **`session-cookie.ts`:** the cookie name is at `:10`, `SESSION_MAX_AGE_SECONDS` at `:17`, and the options at `:34-41`.
- **`security.api.spec.ts`:** SEC-API-07's meeting creation is called at `:314` (the helper is at `:658`), and SEC-API-12's `withCleanup` is at `:588`.
- **`dal.ts`:** `:25`, `:40`, `:46/77/110/146`, and the four redirects at `:58/86/128/164` are all correct.
- **The rest:** `proxy.ts:18/48`, `auth.controller.ts:31-34` and `auth.config.ts:13/35` are all correct.

**2. The false "Not found" about `planner` (correction): fixed.** `research/README.md` "Still unknown" and `tests.md` §4 now cite two keyed facts:
- `FACT-1071` at `docs/data-model.md:162`: "plus one never-mutated fixture meeting".
- `FACT-1073` at `:175`: "`SEC-API-11`'s fixture".

They also cite `e2e/README.md:231-233` and `:246`. I checked all four lines and they match.

**3. Contradiction 4's six-against-ten count (correction): fixed.** The comparison is withdrawn. The count is replaced by the §7 list of ten files, and `history.md` §6a and its "Not found" line are struck through and marked as superseded. My grep finds the same ten living files that cite `FACT-3642`, plus `docs/facts-lock.json:4076`.

**4. No list of who cites the other facts the change touches (shape): fixed.** `contract.md` §7 adds a table for all eleven keys. My grep over the repository (excluding `docs/plans`, `.agents` and the profiling verdicts) matches the table on every key:
- every home line;
- every living file and line that cites a key;
- every `facts-lock.json` line I checked: 612, 615, 624, 636, 795, 805, 865, 870, 875, 1893, 1898, 1927, 3762 and 4076.

The table also records the citer lists for these keys, which the first pass had not named:
- `ADR-0022:58` and `scripts/facts-parse.mjs:37` cite `FACT-1073`.
- `data-model.md:191/326/332/333` cite these keys from rows that name a successor.

**The first-pass nits.** All are handled:
- The `FACT-1036` quote now matches `data-model.md:326` ("owns one meeting").
- The §3d inference has moved to a "Not found" line (`history.md:122`).
- Contradiction 3 now cites `e2e/README.md:230-231`.
- Contradiction 6 now separates "accepted today" from "drift over time".
- Contradiction 2 is relabelled as a state, not a contradiction.
- The three unrecorded statements are now recorded.
- The config-coverage line is in `tests.md` §6.
- The `history.md` gaps that other sweeps answer are marked in place and listed in the README.
- The README records the re-run model (`researcher` on `opus`, no sub-dispatch) next to the original sweep models.

## Findings (not blocking)

- **A range citation the table misses.** `contract.md` §7 says "a second grep for range forms … returned no hit for these keys". But `docs/CHANGELOG.md:38` contains `FACT-1084`…`FACT-1087`, a range that includes `FACT-1085` and `FACT-1086`. The `FACT-1085` row does not list `CHANGELOG.md:38`. The risk is small, because that line is already listed under three other keys. But retiring `eraser` (`FACT-1085`) would leave a range citation covering a retired key. **Fix:** add `CHANGELOG.md:38` (via the range) to the `FACT-1085` row, and reword the range-grep sentence.
- **Stale lines left in `contract.md`.** §1 "Session cookie" still cites `apps/web/src/lib/session-cookie.ts:11,19,32-40`; the correct lines are `:10`, `:17` and `:34-41`. This is the same class as blocker 1, in a file the re-run did not touch. `code.md` §1 now has the correct lines, so the two files disagree. **Fix:** re-point those three lines in `contract.md`.

## Gaps to carry forward (for the designer)

These are unchanged from the first pass and are all still open. The README's "Still unknown" now states each of them:
- **Stale claims.** How a busy slot behaves when its worker is killed. P2 did not probe it.
- **Seven workers.** No run or measurement exists at 7 workers.
- **Database state after cleanup.** P4 compared `total` only, not ids or sequences.
- **Lifetime of saved state.** Nothing states how long saved state lives across tests, runs or worktrees. What exists:
  - the JWT default is `'1h'` (`auth.config.ts:13`);
  - `auth.api.ts:17` notes the 1 h against the 60 s test timeout;
  - the cookie lasts 1 h (`FACT-1029`);
  - state files are wiped with `outputDir` (`auth.fixture.ts:32-34`);
  - two runs in one tree share the state files by name (`FACT-3221`).
- **Ten browser users.** Ten users means growing the seed. That touches:
  - `FACT-1086` ("All five users");
  - `SM-API-02`, which logs in every seed key;
  - `CHANGELOG.md:38`, both directly and through the range.
- **Cookie drift.** Whether a hand-built cookie diverges from the real one over time is untested. Requirement item 4's guard is the proposed answer.
- **Warm-up under API login.** Measuring it is still requirement item 8's job.
- **Retiring a key cited by a range.** The fact checks (`AR-API-11`…`14`) must resolve every `FACT-` reference. Whether they also resolve ranges such as `FACT-1084`…`FACT-1087` was not checked. That matters if `FACT-1085` is retired.
- **Unread corpus.** The full text of `FACT-3150` and `FACT-3002`, and of ADRs beyond the eleven named, was not read.

## Verdict

**accept.** Every blocker is fixed, and the citations and the citer table hold up against the repository. The two remaining items are small citation fixes the designer can work around.

Files reviewed:
- `C:\GIT\PurpleSchool\docs\plans\e2e-test-architecture\research\README.md`
- `C:\GIT\PurpleSchool\docs\plans\e2e-test-architecture\research\code.md`
- `C:\GIT\PurpleSchool\docs\plans\e2e-test-architecture\research\contract.md`
- `C:\GIT\PurpleSchool\docs\plans\e2e-test-architecture\research\tests.md`
- `C:\GIT\PurpleSchool\docs\plans\e2e-test-architecture\research\history.md`

Checked against:
- `C:\GIT\PurpleSchool\docs\profiling\verdicts\2026-10-21-e2e-test-architecture-feat-g1-a9600313.md` (the first-pass verdict)
