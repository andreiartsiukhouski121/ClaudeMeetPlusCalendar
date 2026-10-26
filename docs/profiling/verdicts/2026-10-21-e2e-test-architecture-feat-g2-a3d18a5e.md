<!-- agent: design-reviewer; session: b988267e-c081-447a-abcb-7f7b884c5b13; captured: 2026-10-21T16:46:50.966Z -->

VERDICT
Change: e2e-test-architecture
Gate: FEAT-G2
Pass: re-run
Verdict: accept
Findings:
- nit | - | contract-gap | Q5 option B (ADR-0036 "Pending owner decision") names MF-FN-09 and SEC-FN-01 as exceptions to the password rule but not how rule 11 exempts one case inside a multi-case file (meeting-files.functional.spec.ts:357). A whole-file exemption opens every MF-FN case; a line exemption is brittle. One sentence now keeps B a narrow edit
- nit | - | unverified-guarantee | FACT-3777 says when the takeover marker is removed only on the success path ("removing its marker last"). A claimant whose re-read finds a new holder (the very case §2.3 cites) has no stated duty to remove its marker. "A claimant that finds a marker leaves the slot alone" then puts that slot beyond any later takeover
- nit | - | other | §2.6 runs the warm-up measurement only after the change is otherwise accepted. Until then warm-up.ts:58 (`const { email, password } = SEED_USERS.teacher`) is an unnamed hit of FACT-3759's destructuring pattern, so rule 11 goes red at acceptance. ADR-0036 names it as an exception only "after the measurement"
- nit | - | unverified-guarantee | P5 run 5 held the first webServer entry. In the real config the non-reusing api entry is the second (playwright.config.ts:92-113), after a web entry that reuses outside CI (:87). Playwright should still abort before globalSetup, but the case the design cites was not the one probed
- nit | - | doc-drift | FACT-3750 still restates the cookie name (FACT-3041) next to citing FACT-3041..3044. FACT-3803's "either later decision" does not name the two records it means
END VERDICT

# Design review: e2e-test-architecture, design review gate, re-run

The re-run answers all six first-pass blockers. It also answers the nits, apart from small leftovers listed below. Nothing it changed creates a new blocker.

## Blockers from the first pass

**1. Q1 and Q5 decided before the owner answered (shape): answered as "pending owner".**
- **(a) No keyed fact asserts either answer.**
  - I read every Decision line of ADR-0037 against Q1. FACT-3773 removes only `organizer`. FACT-3783 says `planner` is the `api` sandbox and the `web` project has no shared one; that holds under both A and B, because `eraser` is dedicated, not shared. FACT-3781 ("every other seeded user 0") is neutral, as the ADR says. `eraser` appears only in Context FACT-3766.
  - In ADR-0036, FACT-3754 and FACT-3759 defer to "exceptions this record names", which stays neutral. FACT-3042's re-point is conditional on option A (design §4).
- **(b) Each option is a narrow edit.**
  - Q1 A and B each list the seed count, what happens to FACT-1085, the clause FACT-3783 or FACT-3773 gains, and the effect on HD-API-23. Design §4 already carries the A/B rows for FACT-1085, FACT-1087 and `usr-eraser`.
  - Q5 A gives the exact reworded expectations and the FACT-3042 re-point. Q5 B gives the exception line.
  - The one gap is in B: how rule 11 exempts a single case inside a multi-case file (finding 1).
- **Q2, Q3, Q4, Q6.** Design §9's "Not owner questions" matches my first-pass reasoning item by item:
  - Q2: `organizer` leaves because of FACT-1037.
  - Q3: now a §5 row. Its reason (22 cases contending for ten users, `planner` kept for `mtg-planner-2` under FACT-1073, tracker cleanup plus FACT-3784) would satisfy someone who preferred it.
  - Q4: the ledger and backlog are re-pointed in place.
  - Q6: CI stays at one worker.

**2. Teardown comparison rested on unprobed behaviour: answered.**
- P5 (probes.md:73-92) records four runs that support FACT-3800 and FACT-3781:
  - run 2: a teardown throw gives `EXIT=1` with "2 passed" and "1 error was not a part of any test";
  - every run: both servers answer 200 from inside the teardown;
  - run 3: teardown runs after a failing test;
  - run 5: a held port with `reuseExistingServer: false` exits 1 before global setup ran.
- FACT-3792's rejection now cites FACT-3800, and the fallback is gone.
- The api base URL comes from `web.use.apiBaseURL`, exactly as warm-up.ts:47-50 reads it today, so suite rule 9 holds.
- Residual: the port-held case was probed on the first webServer entry, not the api entry (finding 4).

**3. Takeover race: answered.**
- P6 (probes.md:94-116) records:
  - one winner out of 20 processes in each of five rounds of rename onto an absent path, the losers getting `EPERM`;
  - rename onto an existing empty directory gives `EPERM`, which is what makes the `pool-NN.takeover` marker exclusive;
  - a held file blocks a directory rename (`EPERM`), which matches the release retry loop;
  - `kill(pid, 0)` throws `ESRCH` once the process is gone.
- The claim now renames a prepared directory that already holds its owner record. That closes the record-less window, recorded as rejected alternative FACT-3805.
- The dead claim keeps the slot until its meetings are purged. That closes the free-slot race, recorded as FACT-3804.
- The re-read under the marker stops a slow claimant from purging a slot a new holder took. I traced the sequence: marker removed, new holder claims, slow claimant takes the marker, re-read names a live holder, nothing is purged. It holds.
- The gap: removing the marker on that failed-re-read path is unstated (finding 2).
- Linux is honestly scoped out (one CI worker).

**4. Suite rule 11 matched too much and too little: answered.**
- FACT-3759 is now scoped to `*.functional.spec.ts` outside auth-login, plus `e2e/fixtures/*.ts` except `seed.ts`. It adds the destructuring pattern, and C4a/C4b prove both directions.
- I re-ran the §7 row "Seed password reads" with a grep for `password|Passw0rd|SEED_PASSWORD` over `e2e/`, excluding `*.api.spec.ts`.
  - It returns exactly the listed hits: home-dashboard.functional.spec.ts:114, meeting-files.functional.spec.ts:357, auth.api.ts:36, auth.fixture.ts:58, warm-up.ts:58, plus seed.ts and auth-login, which are out of scope.
  - `'definitely-not-the-password'` at accessibility.functional.spec.ts:79 matches no pattern.
- New: warm-up.ts:58 is a hit until the measurement runs (finding 3).

**5. FACT-3593 left stale (correction): answered.**
- Design §4 retires FACT-3593 into FACT-3803, a keyed Consequences line in ADR-0037. That placement follows FACT-3593's own placement in ADR-0027 Consequences and FACT-3473 ("keyed only where checkable").
- FACT-3803 states no count.
- The count in ADR-0007:50-52 is dropped in the same edit.

**6. FACT-3042's source (correction): answered.**
- Design §4 re-points FACT-3042 from SEC-FN-01 to AL-FN-13, as a source-only fix, under Q5 option A only.
- It correctly keeps SEC-FN-01 as a source of FACT-0010 and FACT-3048, because the `document.cookie` check still observes those.

## First-pass nits

All are answered:
- FACT-3750 now cites FACT-3041..3044.
- Upload order is in FACT-3799 and §2.4.
- The `limit=100` loop until `total` is 0 is in FACT-3776 and §2.4.
- CHANGELOG.md:39 and :40 are in §7.
- FACT-3184 is retired into FACT-3802.
- The testId check now comes before deletion, in FACT-3776.
- "One run per tree" now cites `reuseExistingServer: false` at playwright.config.ts:113, with P5 run 5.
- C2 is conditioned on Q5.
- "State kept" is stated explicitly for one run.

## Findings

1. **Q5 B: how the exception is scoped.** Rule 11 is a static scan. Exempting MF-FN-09 inside meeting-files.functional.spec.ts needs a stated unit (a file, a marker comment, a test block). A file exemption lets every MF-FN case read the password. A line exemption breaks on any edit. Stating this now keeps B a narrow edit.
2. **FACT-3777: removing the marker on the failed re-read path.** Add the clause: the claimant removes its own marker whenever the re-read does not name the same dead process and test.
3. **The warm-up before the measurement.** Either name warm-up.ts as a temporary exception until §2.6 decides, or say that arm A runs before rule 11 is turned on. Otherwise acceptance goes red on rule 11 itself.
4. **P5 run 5 held the web-side entry, not the api entry.** It is very likely equivalent, since all webServers are checked before globalSetup, but it was not probed as cited.

## Minor

- FACT-3750 still states "named `ps_session`", which FACT-3041 already says.
- FACT-3803: "either later decision" should name ADR-0027 and ADR-0037.

## Verdict

**Accept.** Every first-pass blocker is answered in the text and, where it rested on behaviour, by recorded probe output. The two owner questions are open with options specified as edits. What remains are one-clause fixes.

**Once the owner answers Q1 and Q5, the design can go to planning without another design review.** If the owner picks Q5 option B, finding 1's exemption granularity should be stated in that same edit. That is a sentence, not a design.

Files reviewed:
- C:\GIT\PurpleSchool\docs\plans\e2e-test-architecture\design.md
- C:\GIT\PurpleSchool\docs\adr\ADR-0036-ui-once-and-an-e2e-api-layer.md
- C:\GIT\PurpleSchool\docs\adr\ADR-0037-e2e-user-pool-and-cleanup.md
- C:\GIT\PurpleSchool\docs\plans\e2e-test-architecture\research\probes.md (P5, P6)
- C:\GIT\PurpleSchool\docs\profiling\verdicts\2026-10-21-e2e-test-architecture-feat-g2-aee513ec.md

Checked against:
- C:\GIT\PurpleSchool\docs\adr\ADR-0003-session-jwt-cookie.md
- C:\GIT\PurpleSchool\docs\adr\ADR-0021-corpus-facts-are-keyed.md
- C:\GIT\PurpleSchool\docs\adr\ADR-0027-postgres-prisma-store.md
- C:\GIT\PurpleSchool\e2e\fixtures\warm-up.ts
- C:\GIT\PurpleSchool\playwright.config.ts
