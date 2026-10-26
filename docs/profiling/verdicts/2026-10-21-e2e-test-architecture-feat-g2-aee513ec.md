<!-- agent: design-reviewer; session: b988267e-c081-447a-abcb-7f7b884c5b13; captured: 2026-10-21T16:31:04.815Z -->

VERDICT
Change: e2e-test-architecture
Gate: FEAT-G2
Pass: first
Verdict: accept-after-blockers
Findings:
- blocker | shape | other | Q1 and Q5 set settled decisions against each other (3 vs 5 for HD-API-23 on a pool user; 2 vs 7 for MF-FN-09 and SEC-FN-01), yet ADR-0037 FACT-3783 and ADR-0036 Consequences already decide them. The owner must answer before planning
- blocker | shape | unverified-guarantee | FACT-3781 (the global-teardown comparison) rests on two unprobed behaviours: a teardown error fails the run, and both webServers are still up. The §8 fallback is the dependent project that FACT-3792 rejects, so a failed probe rewrites the ADR. Prove it before the plan
- blocker | shape | unverified-guarantee | FACT-3777 stale takeover: renaming the directory aside frees the slot, so a plain mkdir by another scanner can grab the user before its meetings are purged. A claim dir not yet holding its pid record looks dead. "Exactly one claimant can rename" was not probed (P2 tested mkdir only)
- blocker | shape | assertion-scope | Suite rule 11 (FACT-3759) catches legitimate API uses: security.api.spec.ts:69,80,171 (invariant 18 timing, secret markers) and home-dashboard.api.spec.ts:111. It misses destructuring, which warm-up.ts:58 already uses (`const { email, password } = SEED_USERS.teacher`)
- blocker | correction | stale-fact | FACT-3593 (ADR-0027:104-107) says ADR-0007 still states ten facts and they "remain true". Retiring FACT-3125/3126/3131/3132 makes it six, and FACT-3593 is missing from the §4 table. ADR-0007's register intro (:50-52) repeats the count
- blocker | correction | stale-fact | FACT-3042 (ADR-0003:21) names SEC-FN-01 as the source of the cookie flags. On a built session SEC-FN-01 reads the builder's own flags, so §5's "their expectations still hold on a built session" is false for SEC-FN-01, and the source re-point is not listed
- nit | - | doc-drift | ADR-0036 FACT-3750 restates FACT-3041..3044 (ADR-0003); cite them instead
- nit | - | assertion-scope | Copying teacher's files cannot copy uploadedAt (the server assigns it), and MF-FN-02 expects notes.txt before syllabus.pdf. FACT-3799's "renders exactly" needs the upload order named
- nit | - | contract-gap | Release-time deletion does not say how it lists the meetings it deletes. GET /meetings caps limit at 100 (LIMIT_MAX); name the loop until total is 0
- nit | - | stale-fact | The §7 AL-FN-02 row misses docs/CHANGELOG.md:39 and :40 (grep re-run)
- nit | - | stale-fact | FACT-3184 (ADR-0010) is knowingly made more wrong by rule 11; retire it in this change or file a BL row
- nit | - | other | Release deletes meetings before checking testId, so a collision first wipes the other holder's rows; check first
- nit | - | other | "One run per tree" cites FACT-3149. The guard that stops a second run's globalSetup from wiping the first run's claims is the api webServer's reuseExistingServer: false (playwright.config.ts:113)
- nit | - | dod-passes-when-broken | C2's httpOnly:false variant also turns SEC-FN-01's document.cookie check red, not "AL-FN-13 alone"
- nit | - | other | Q2, Q3, Q4 and Q6 follow from the decisions or the existing checks and are not owner questions. Q3 belongs in §5 as an alternative with a reason
END VERDICT

# Design review: e2e-test-architecture, design review gate, first pass

## Strengths

- **§1 is correct about the fact-reference check.** It names a gap the research left. I confirmed it in `e2e/architecture/architecture.api.spec.ts`:
  - `HISTORICAL_DIRS` (:752) holds only `docs/plans` and `docs/profiling`.
  - The scan roots are at :755.
  - The key pattern is `\bFACT-(\d{4})\b` (`scripts/facts-parse.mjs:20`). A range `FACT-1084`…`FACT-1087` therefore exposes only its two end keys.
  - The `file === row.file` exemption (:896) holds up §6's claim. A new ADR citing a key retired in another file would fail the check. A register row in its own file does not.
- **§4 retires more keys than the research swept, and correctly.** It adds `FACT-1023`, `1031`, `1076` and `3132`. My grep finds no living citer of them outside `data-model.md` and `ADR-0007`, and the `ADR-0007` citers are lines that become register rows.
- **The §2.4 case list adds up.** 22 cases, which matches what §7 says.
- **The ADRs have the right form.** Context and Decision lines are keyed and each names a source. Rationale blocks carry no key. Consequences are unkeyed.
- **Retiring a fact into the register of an ADR that stays accepted has precedent.** `ADR-0018` and `ADR-0026` both did it.
- **§3 names the exact 404 bodies.** It also states that release-time deletion accepts `204` only.
- **The §5 alternatives are real.** Each rejection has a reason that someone who preferred the option could still accept. The `AL-FN-13`-as-survivor reason checks out: `FACT-0010` and `FACT-3048` cite `AL-FN-13`, and no corpus fact cites `AL-FN-02`.
- **One §7 row holds as written.** The `PROTECTED_PAGES` / `AUDITED_PAGES` row matches `security.functional.spec.ts:31` and `accessibility.functional.spec.ts:25-30`.
- **Security (invariants 16–19).** Nothing new is exposed: no endpoint, page, Server Action, or token sent to a client component.

## Blockers

1. **Two §9 questions are decided before the owner answers them (shape).**
   - **Q1.** Decision 3 says the pool is "dedicated to browser tests". Decision 5 deletes `eraser`. Putting `HD-API-23` on a pool user resolves that conflict, but `ADR-0037` `FACT-3783` states the answer as decided.
   - **Q5.** Decision 7 says expectations stay. Decision 2 allows UI login only in auth-login.
     - `MF-FN-09` expects "signing in again afterwards works" (`meeting-files.functional.cases.md:165`).
     - `SEC-FN-01` expects the app's real cookie flags (`security.functional.cases.md:36-41`).
     - Both get rewritten expectations, and `ADR-0036` Consequences already records them.
   - **Risk:** a "no" from the owner re-runs the stage after the plan exists.

2. **The global-teardown comparison rests on unprobed behaviour (shape).**
   - `FACT-3781` assumes two things: an error thrown in `globalTeardown` makes the run exit non-zero, and both `webServer`s are still running when it executes.
   - The §8 fallback is a fourth project, which `FACT-3792` rejects, and that adds a filename suffix to the convention.
   - So a failed probe changes an ADR decision. The probe costs minutes. Run it before the plan, not at control C3.

3. **The stale takeover has a race (shape).**
   - Renaming the dead holder's directory aside leaves `claims/pool-NN` absent. Any scanner's ordinary `mkdir` can take the slot before the purge runs, and that test gets a dirty user. This contradicts "deleted before the user is handed out".
   - Between `mkdir` and writing the owner record, the claim has no pid. A claimant reading the pid at that moment would judge a live claim dead.
   - Rename exclusivity on Windows was not probed. `FACT-3769` itself says the killed-holder case was not probed.

4. **Suite rule 11 matches both too much and too little (shape).** Its scope is "any `.ts` under `e2e/`" outside `fixtures/seed.ts`, `api/` and `auth-login/`.
   - **False hits:**
     - `security.api.spec.ts:69,171`: the invariant 18 timing case needs a valid login.
     - `security.api.spec.ts:80`: the secret-marker list.
     - `home-dashboard.api.spec.ts:111`: a negative leak assertion.
   - **Misses:** destructuring. `warm-up.ts:58` already reads the password that way, and that is the very file Arm C would exempt.
   - C4 tests only a functional spec, so control C4 proves neither direction.

5. **`FACT-3593` goes stale (correction).** The design retires four more facts from `ADR-0007`. After that, `FACT-3593` ("The ten it still states remain true…", `ADR-0027:104-107`) is false, because `ADR-0007` states six. The check cannot notice: `FACT-3593` cites no key by number. The prose at `ADR-0007:50-52` says the same count.

6. **`FACT-3042` is left with a source that no longer proves it (correction).**
   - `ADR-0003:21-22` sources the flags from `SEC-FN-01`.
   - Under the design, `SEC-FN-01` checks the cookie the builder set, so it proves nothing about the application's flags. Only `AL-FN-13` still observes the real cookie.
   - §5's reason ("expectations still hold on a built session") is wrong for `SEC-FN-01`.
   - The re-point is missing from §4.

## Findings

These are the nits in the block above. Three need a word more:

- **Copies of seeded files.** `uploadedAt` is set by the server. Two uploads in the same millisecond fall back to ordering by a random id (invariant 7).
- **Global setup empties `state/` as well as `claims/`.** Decision 3 says "state kept". Keeping it within one run is defensible, but say so explicitly.
- **The global teardown needs the api base URL.** It has no fixture, so it must read the URL from `FullConfig` without breaking suite rule 9 (`suite-integrity.api.spec.ts:441-458`). The warm-up is the precedent.

## Verdict on the §8 open points

- **Teardown error fails the run, and the servers are still up:** prove before the plan (blocker 2).
- **How long teardown gets after a test timeout:** safe to leave to a probe. Playwright replaces a worker after a failed test, so its pid dies and the takeover applies. The fallback is local. Make that probe the first implementation task rather than leaving it to acceptance control C5.
- **`process.kill(pid, 0)` on Windows:** safe to leave to a probe. Node documents signal 0 as an existence test, and libuv implements it on Windows. pid reuse is the residual risk, and it is small within one run.

## §9: which questions need the owner before planning

- **Q1: owner.** Blocks planning, because decisions 3 and 5 conflict and an ADR currently decides it.
- **Q5: owner.** Blocks planning, because decisions 2 and 7 conflict and the case texts depend on the answer.
- **Q2: not the owner's.** `organizer`'s only role (`FACT-1037`) is the web sandbox that decision 3 replaces.
- **Q3: not the owner's.** It is a design choice. Record it in §5 with a reason.
- **Q4: not the owner's.** The fact-reference check already treats the ledger and backlog as living. Changing the historical directories is a corpus-rule change outside this change.
- **Q6: not the owner's.** Decision 1 is about the 14-core local machine, and CI stays as it is.

## Verdict

**Accept after blockers.** The shape is sound and follows the research. But the stage re-runs for the shape blockers: two owner answers, one framework probe, the takeover race and the scope of suite rule 11. Then two stale corpus facts need correcting.

Files reviewed:
- C:\GIT\PurpleSchool\docs\plans\e2e-test-architecture\design.md
- C:\GIT\PurpleSchool\docs\adr\ADR-0036-ui-once-and-an-e2e-api-layer.md
- C:\GIT\PurpleSchool\docs\adr\ADR-0037-e2e-user-pool-and-cleanup.md
- C:\GIT\PurpleSchool\docs\adr\ADR-0038-file-cap-without-the-no-delete-premise.md

Checked against:
- C:\GIT\PurpleSchool\docs\plans\e2e-test-architecture\research\README.md
- C:\GIT\PurpleSchool\docs\profiling\verdicts\2026-10-21-e2e-test-architecture-feat-g1-a9600313.md
- C:\GIT\PurpleSchool\docs\profiling\verdicts\2026-10-21-e2e-test-architecture-feat-g1-ace5ad69.md
- C:\GIT\PurpleSchool\docs\adr\ADR-0003-session-jwt-cookie.md
- C:\GIT\PurpleSchool\docs\adr\ADR-0007-in-memory-store.md
- C:\GIT\PurpleSchool\docs\adr\ADR-0022-fact-lifecycle.md
- C:\GIT\PurpleSchool\docs\adr\ADR-0027-postgres-prisma-store.md
- C:\GIT\PurpleSchool\docs\data-model.md
- C:\GIT\PurpleSchool\e2e\architecture\architecture.api.spec.ts
- C:\GIT\PurpleSchool\e2e\suite-integrity.api.spec.ts
- C:\GIT\PurpleSchool\e2e\fixtures\warm-up.ts
- C:\GIT\PurpleSchool\playwright.config.ts
