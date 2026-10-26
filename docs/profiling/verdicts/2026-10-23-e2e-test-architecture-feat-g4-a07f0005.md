<!-- agent: code-reviewer; session: b988267e-c081-447a-abcb-7f7b884c5b13; captured: 2026-10-23T18:21:29.117Z -->

VERDICT
Change: e2e-test-architecture
Gate: FEAT-G4
Pass: first
Verdict: accept-after-blockers
Findings:
- blocker | correction | stale-fact | ADR-0037 FACT-3781 (lines 197-201) says teardown reads the api URL "as the warm-up does" and cites e2e/fixtures/warm-up.ts, which T12 deleted
- blocker | correction | stale-fact | ADR-0036 FACT-3759 (lines 66-80) still describes the warm-up allowance and a failure "when the warm-up allowance matches no read"; rule 11 no longer has either
- blocker | correction | other | the backlog item for the 3/20 ECONNRESET runs (the lead's ruling) is not in docs/BACKLOG.md, and BL-067 (line 30) still describes the route list of a deleted warm-up.ts
- nit | - | doc-drift | ADR-0037:295-296 says .e2e-pool/ is outside every root the meta-tests walk; SEC-API-10 walks the repo root and now skips it, which neither the ADR nor security.api.cases.md:162 says
- nit | - | security | SECRET_SCAN_SKIP_DIRS skips any directory named .e2e-pool at any depth, while .gitignore ignores only /.e2e-pool/ at the root
- nit | - | doc-drift | e2e/README.md:125 still describes apiRequest as the web cases' baseline context; T4 made it the context claim/cleanup/preconditions use in both projects
- nit | - | doc-drift | AL-FN-13 decides "sent to Nest" by port (auth-login.functional.spec.ts:295-297), while api.ts:35-42 names isNestRequest as the one definition of that
- nit | - | other | global-setup.ts:9-10 comment cites docs/plans/.../probes.md P14, which CLAUDE.md "Comments in code" forbids
- nit | - | stale-fact | T13 not run: tester-functional.md:43-44, tester-api.md:29-30, regression-verify SKILL.md:141-142, the CLAUDE.md tests section, apps/api/CLAUDE.md:45 and README.md:68 are stale; follow-ups, not blocking under plan §6
- nit | - | doc-drift | SM-API-07's spec registers cleanup.trackAllOf(claim) first (pool.api.spec.ts:335); the case's Data and Steps (pool.api.cases.md:83-87) do not mention it
END VERDICT

# Code review: e2e-test-architecture, code review gate, first pass

## How I read it, and what I could not do

I can only read files, so I had no `git diff`. I read the working tree against the plan, `design.md`, `ADR-0036`/`0037` and the corpus registers. I read in several passes:

**Read in full:**
- `e2e/fixtures/{suite,api,seed,global-setup,global-teardown}.ts`
- `e2e/api/{auth,cleanup,meetings}.api.ts`
- `playwright.config.ts`
- `security.functional.spec.ts` and its cases file
- `auth-login.functional.cases.md`

**Read in part:**
- `suite-integrity.api.spec.ts`: rules 11 and 12, their self-checks and the walk.
- `auth-login.functional.spec.ts`: `AL-FN-13`.
- `home-dashboard.functional.spec.ts`: lines 1–300.
- `MF-FN-09`, `HD-API-23`.
- `pool.api.spec.ts`: `SM-API-04`…`08`.
- `accessibility.functional.spec.ts`: lines 1–140.
- The `SEC-API-10` skip list.
- `data-model.md` (seed and register), `architecture.md` "Patterns in use", the `FACT-2096` area of `api-contract.md`, the ADR index, `BACKLOG.md` lines 25–35, probe P14.

**Not read:**
- `meeting-files.api.ts`
- `meetings-detail`, `auth-login`, `seed` and `health` api specs
- most of `home-dashboard.api.spec.ts` and `meeting-files.api.spec.ts`
- `ADR-0038`
- `facts-lock.json`

**Not done:** plan §5 asks this gate to read the expectation diff case by case across the 136 rewritten bodies. Without a diff against HEAD I could not. For "no expectation lost" I rely on the testers' counts (web 53 = 54 − `AL-FN-02`; api 142) and on rule 5. If you want that check done, give me the diff (e.g. `git diff HEAD -- e2e/regression e2e/security e2e/smoke e2e/accessibility`) as an input for a re-run.

## Strengths

- **The three wrapper fixtures take `lease` first** (`e2e/fixtures/suite.ts:540-583`), as `FACT-3776` requires. A comment explains why the order must not change and cites `FACT-3776`/`FACT-3821`. `sessionPage` depends on `claim` (`:590-600`). `claim`, `cleanup` and `preconditions` each declare `lease` and the context they call through (`:585-612`).
- **Release** (`suite.ts:425-483`):
  - It checks the claim still names its own test before reading any user.
  - It opens its own context through `requireApiBaseURL`, so an empty value is rejected, and disposes it in a `finally`.
  - It deletes nothing, writes `leaked.json` and keeps the slot when a user is not empty.
  - The failure text is exactly what the plan promised.
- **Takeover** (`suite.ts:299-336`) does a guarded marker rename and re-reads the record. It purges only when the same dead pid and test are still named, and removes the marker in a `finally`.
- **The tracker** (`e2e/api/cleanup.api.ts:76-137`): `run()` never throws and empties itself. The tolerance for a purged row comes from the lease, never from the caller (`:113-119`, `FACT-3810`). `trackAllOf` refuses a released claim.
- **Rule 12** checks the exact body shape (`suite-integrity.api.spec.ts:807-842`).
- **Global teardown** reads the API URL from `FullConfig` (`global-teardown.ts:30`, rule 9) and reports every difference together.
- **`AL-FN-13`'s guard** (`auth-login.functional.spec.ts:266-290`) compares each field of `FACT-3757` and names the one that differs.
- **`PROTECTED_PAGES`** stays one list, with the meeting id filled in per case (`security.functional.spec.ts:41-52`).
- **Retired keys** appear only in registers. A grep outside plans, profiling and the lock finds `FACT-1023/1031/1076/1086/1087/1037/1085/3125/3126/3131/3132/3593/3580/3642/3184` only in register rows. The successors `FACT-1088`…`1093`, `FACT-0079`/`0080` and the `FACT-2096` re-point are in place.

## Blockers (all `correction`)

1. **`docs/adr/ADR-0037-e2e-user-pool-and-cleanup.md:197-201`, `FACT-3781`.**
   - It says teardown reads the API URL "as the warm-up does", and its source list ends with `e2e/fixtures/warm-up.ts`.
   - T12 deleted that file, so a keyed decision fact now names a missing source and a false comparison.
   - The fact checks only resolve `FACT-` keys, not file paths, so the machine cannot catch this.

2. **`docs/adr/ADR-0036-ui-once-and-an-e2e-api-layer.md:70-74`, `FACT-3759`.**
   - It still says the rule allows reads "in `e2e/fixtures/warm-up.ts` for as long as the warm-up signs in", and that it fails "when the warm-up allowance matches no read".
   - The rule now has neither: no `warm` token in `suite-integrity.api.spec.ts`, and rule 11 is at `:659-753`. The fact describes a check the code no longer runs.
   - **How to fix 1 and 2:** neither key is in any commit yet. The design header says `ADR-0022` applies from the first commit, so revising in place and running `pnpm fact:lock` is available. The other way is to retire both keys with successors.
   - Revising in place sits uneasily with "an accepted ADR is never edited in substance", because the status flip happened in this same tree. Either way is acceptable; leaving the text as it is is not. This is your call to make explicitly.

3. **`docs/BACKLOG.md`.**
   - Your ruling sends the `read ECONNRESET` resets to a backlog item. Probe P14 records 3 of 20 loaded runs red, all on test-side calls to the API port (pool logins and per-test preconditions this change added). No such row exists.
   - BL-067 (`:30`) stays open but describes "the hand-kept route list in `e2e/fixtures/warm-up.ts`", a file that no longer exists.
   - Fix: file the resets item, with P14's candidates and "not significant against the control". Reword BL-067 so it only applies if a warm-up comes back, or close it as moot. As things stand, a red `pnpm verify` from a reset would be read as a new defect with no history.

## The six points you asked about

1. **`SEC-API-10` skipping `.e2e-pool`: an improvement.** The design's "outside every meta-test walk root" was true of the four meta-test files. It was false for `SEC-API-10`, a security spec whose walk starts at the repository root (`security.api.spec.ts:773-787`). Without the skip it would flag the real JWTs in `state/*.json` and could hit a directory removed mid-walk. The skip copies how `test-results` is handled. What to tidy (not blocking):
   - `ADR-0037:295-296` should say `SEC-API-10` skips the directory.
   - `security.api.cases.md:162` should name the run-state skips.
   - The skip matches the directory name at any depth, while `.gitignore:20` ignores `/.e2e-pool/` only at the root. Matching the root path would close that gap (`test-results` has the same gap already).

2. **T4 deviation, `apiRequest` in both projects: an improvement.**
   - `apiBaseURL` is set in the config's top-level `use`, so `apiRequest` points at Nest in both projects.
   - It is wrapped with the lease first (`suite.ts:581`), so the rule that every context closes before the release holds unchanged.
   - It avoids a fixture that has to know which project it runs in. `FACT-3776` ("the request context they call the API through") stays true.
   - Costs: every `api` test opens a second request context, because rule 12 makes `cleanup` mandatory; nobody has measured that. Also `e2e/README.md:125` still calls `apiRequest` the `web` baseline context.

3. **Parameter order and release context: correct.** All three overrides read `({ lease, <name> }, use)` (`suite.ts:578-583`). The release uses its own context (`:445-460`), not the test's, as the design requires.

4. **Rules 11 and 12: the self-checks test both directions, and the warm-up allowance is fully gone.**
   - Rule 11 must flag (`:922-1026`): each password pattern in an untagged test, the helper read, the tag in an api spec, the tagged set one short and one long, no `test` call, both kinds of alias, and a fixture read.
   - Rule 11 must pass (`:1029-1052`): the tagged reads, the API lines, the wrong-password literal, `seed.ts` and `auth-login/`.
   - Rule 12 must flag the eight broken shapes and must count exactly eight findings (`:1118-1133`), plus no-call, import alias and `const` alias.
   - Rule 12 must pass: the full shape at top level, under `skip`, under `fixme` and in a nested `describe`, and it must ignore files outside its scope.
   - Smaller gaps: a `beforeEach` hook is not in rule 12's must-pass set. The live tree covers that case: it is full of hooks and rule 12 is green. Line 1204 still says "all nine rules".

5. **Security (invariants 16–19).**
   - 16: `PROTECTED_ROUTES` is unchanged and `PROTECTED_PAGES`/`AUDITED_PAGES` change shape, not coverage.
   - 17: `MF-FN-09` keeps both redirect hops and signs in again (`meeting-files.functional.spec.ts:382-410`).
   - 19: `SEC-FN-02` walks every page with the built session, whose value is the token.
   - 12: `AL-FN-13` compares `secure: false`. 10: `SEC-FN-05` and the Server Action creates still exercise it. 18: untouched.
   - Storage state sits in the git-ignored `/.e2e-pool/state/`, is emptied every run (`global-setup.ts:13`) and is skipped by the secret scan. No token reaches a client component, and no endpoint or page was added. No security blocker.

6. **Stale documents.** Under plan §6 none of these block this gate, as long as the briefs for the final verify and acceptance tasks (T15, T16) name the superseded lines.
   - **Must be fixed before the change is closed out** (T13, or a backlog row if the owner declines):
     - `tester-functional.md:43-44` names `authUser`/`authedPage` and `organizer`, which no longer exist.
     - `regression-verify` `SKILL.md:141-142` makes absolute counters in `@mutating` cases a blocker, which contradicts `FACT-3784`. An acceptance run that is not told otherwise will raise a false blocker on a held-user case.
     - `tester-api.md:29-30` omits the `HD-API-23` exception.
     - `CLAUDE.md`'s tests section still says "`e2e/fixtures/` is the seed and helpers".
   - **Follow-ups:**
     - `apps/api/CLAUDE.md:45` ("each mutating spec file has its own owner") is now false.
     - `README.md:68` ("no database… four users") has been stale since `ADR-0027` and is more so now.
     - The "Run economics" timing row belongs to T16 as planned.

## Findings (worth fixing, not blocking)

- **`AL-FN-13` traffic check** (`auth-login.functional.spec.ts:295-297`): it treats a request as Nest-bound by port. `api.ts:35-42` says `isNestRequest` is the one definition that `HD-FN-11`/`SEC-FN-03` share, and `AL-FN-13` now carries those checks. Use `isNestRequest`.
- **`global-setup.ts:9-10`** cites a change-folder probe, which CLAUDE.md forbids in code comments. It also leaves out the resets. `meeting-files.api.spec.ts:465` cites "design §4"; that also needs fixing if this change added it.
- **`SM-API-07`**: the spec registers `cleanup.trackAllOf(claim)` (`pool.api.spec.ts:335`), and the case text (`pool.api.cases.md:83-87`) does not mention it.
- **Ledger:** no `FT-` row yet. It is planned in T16; no `FX-` is owed until the resets have a confirmed cause.
- **`data-model.md:331-332`**: `FACT-1038`/`FACT-1040` now point to `FACT-1091`/`1092`. If this diff changed them from `1086`/`1087`, that keeps the chain pointing at live successors, but the `1086`/`1087` step is now visible only in those keys' own register rows. I cannot confirm whether it changed without a diff.

## Minor

- `seed.ts:38-39` says "`api` mutations go to `planner`" without the `HD-API-23` exception.
- `auth.api.ts:74`: `poolCredentials` takes `SEED_USERS.teacher.password` instead of the pool user's own entry.
- `users.seed.ts:6-8` says `UsersService` hashes in its constructor; nothing in `apps/api/src/users` does (probably stale before this change).
- `accessibility.functional.spec.ts:4-6` imports without `.js`, unlike the other specs.
- `SM-API-08`'s title uses a curly apostrophe; its case heading uses a straight one.
- `home-dashboard.api.spec.ts:34-50` redeclares `ErrorBody`/`MeetingItem`, which `e2e/api/meetings.api.ts` already exports.
- The Context facts in `ADR-0036` (`FACT-3747`/`3748`/`3749`) cite files that are now deleted. That is acceptable for facts about the earlier state.
- `SEC-FN-04`'s summary title promises "after logout", and no step does it (probably older than this change).

## Verdict

**Accept after blockers.** The code does what the plan and ADRs decided. The two deviations (the `.e2e-pool` skip in the secret scan, and `apiRequest` in both projects) are justified improvements. The three blockers are all corrections: two keyed facts still describe the deleted warm-up, and the backlog lacks the resets item your ruling calls for and still describes the deleted warm-up in BL-067.

Files referenced:
- C:\GIT\PurpleSchool\docs\adr\ADR-0037-e2e-user-pool-and-cleanup.md
- C:\GIT\PurpleSchool\docs\adr\ADR-0036-ui-once-and-an-e2e-api-layer.md
- C:\GIT\PurpleSchool\docs\BACKLOG.md
- C:\GIT\PurpleSchool\e2e\fixtures\suite.ts
- C:\GIT\PurpleSchool\e2e\fixtures\global-setup.ts
- C:\GIT\PurpleSchool\e2e\api\cleanup.api.ts
- C:\GIT\PurpleSchool\e2e\api\auth.api.ts
- C:\GIT\PurpleSchool\e2e\suite-integrity.api.spec.ts
- C:\GIT\PurpleSchool\e2e\security\security.api.spec.ts
- C:\GIT\PurpleSchool\e2e\security\security.api.cases.md
- C:\GIT\PurpleSchool\e2e\regression\auth-login\auth-login.functional.spec.ts
- C:\GIT\PurpleSchool\e2e\smoke\pool.api.spec.ts
- C:\GIT\PurpleSchool\e2e\smoke\pool.api.cases.md
- C:\GIT\PurpleSchool\e2e\README.md
- C:\GIT\PurpleSchool\.gitignore
- C:\GIT\PurpleSchool\.claude\agents\tester-functional.md
- C:\GIT\PurpleSchool\.claude\agents\tester-api.md
- C:\GIT\PurpleSchool\.claude\skills\regression-verify\SKILL.md
- C:\GIT\PurpleSchool\apps\api\CLAUDE.md
- C:\GIT\PurpleSchool\README.md
