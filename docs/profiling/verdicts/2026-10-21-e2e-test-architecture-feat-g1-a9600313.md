<!-- agent: research-reviewer; session: b988267e-c081-447a-abcb-7f7b884c5b13; captured: 2026-10-21T15:54:07.953Z -->

VERDICT
Change: e2e-test-architecture
Gate: FEAT-G1
Pass: first
Verdict: accept-after-blockers
Findings:
- blocker | correction | stale-fact | code.md and tests.md cite line numbers past the end of their files (auth.api.ts:134-135/:143 in a 69-line file, cleanup.api.ts:321-359 in a 100-line file, auth.fixture.ts:97-135/:122 in a 124-line file), and several others are off by a few lines
- blocker | correction | recall-not-read | README "Still unknown" and tests.md §5 say no fact records planner's read-only role, but FACT-1071 and FACT-1073 state it, and contract.md quotes both
- blocker | correction | stale-fact | README contradiction 4 ("six grep hits against BL-068's ten") rests on history.md's docs-only grep. contract.md's own list of FACT-3642 citers has ten living files, so the contradiction is not real
- blocker | shape | other | living citations were swept for FACT-3642 only. Nobody listed who cites the other retire targets (FACT-3125/3126/3131/3580) or the seed-user facts the change touches (FACT-1071/1037/1085/1086/1087)
- nit | - | stale-fact | history.md §6a misquotes retired FACT-1036 as "owns two meetings"; data-model.md:326 says "owns one meeting"
- nit | - | other | history.md §3d states as fact that storageState "is in the file since its introduction", which is inferred from today's content and contradicts its own Not-found line
- nit | - | doc-drift | contradiction 3 misses that e2e/README.md:230-231 carries the same exact-count exception as FACT-1076, so the README also disagrees with its own line 237
- nit | - | other | contradiction 6 sets P1 (the cookie is accepted today) against a claim P1 does not test (a hand-built cookie drifts from production over time)
- nit | - | other | three existing statements bearing on "state kept" and cleanup are not recorded: auth.api.ts:17, auth.fixture.ts:32-34, e2e/README.md:246
- nit | - | stale-fact | history.md's "not read" items are answered by other sweeps, and the README does not cross-reference them
END VERDICT

# Research review: e2e-test-architecture, research review gate (FEAT-G1), first pass

## Strengths (verified by opening the file)

- **Playwright config.** `playwright.config.ts:31` reads `workers: isCI ? 1 : undefined`, and `:51` is the `globalSetup` warm-up line with its BL-058 comment at `:49-50`. The project `testMatch` lines are at `:63-73`. All three match the research.
- **The fixture's reasons for UI login.** The quote of the reason for UI login (`auth.fixture.ts:8-12`) is verbatim. So is the warm-up's "lazily loaded code in `loginAction`'s success branch" reason (`warm-up.ts:17-20`, README contradiction 6). code.md §3's citations into `auth.fixture.ts` are all correct: `:36-41`, `:52-83`, `:90-106`, `:109`, `:111-121`, `:113`, `:16-29`.
- **The ADR facts to retire.**
  - `FACT-3125`, `FACT-3126` and `FACT-3131` sit at `ADR-0007:22`, `:25` and `:37`.
  - ADR-0007's register of retired facts lists only 3121, 3122, 3127 and 3130.
  - `FACT-3580` is at `ADR-0027:69`, and `FACT-3593` at `:104-107` says "the ten it still states remain true".
  - Contract D1 and D2 are reported accurately and left unresolved. `FACT-3126` itself names `FACT-1087` as its source, which sharpens D2.
- **Corpus quotes.** `FACT-1076` (`data-model.md:181-184`) and `FACT-1087` (`:189-191`) are quoted correctly.
- **e2e/README.md and the backlog.** `e2e/README.md:237`, `:241-245`, `:321` (173) and `:335` ("all 167") are correct. The BL-068 row text at `BACKLOG.md:29` is correct.
- **Suite inventory.** 16 spec files, and 54 functional case rows (5/6/15/18/10) across the five functional case docs. No `e2e/journeys/` exists. `withCleanup` is used at exactly the lines listed in tests.md §4.
- **Already-existing helpers were found.** `loginApi` with its per-worker token cache, `withCleanup`, `authStateFor` with its storage state, the `apiRequest` fixture, and `delete-meetings-and-files.plan.md:19-20` naming this exact follow-up.
- **Sweep models are recorded** in `research/README.md` (`sonnet` ×3, `haiku` for history), and the probes include raw output.

## Blockers

1. **Line citations that cannot be true** (correction).
   - Past the end of the file:
     - code.md §2 cites `e2e/fixtures/auth.api.ts:134-135` (scrypt) and `:143` (`tokenCache`). The file has 69 lines, as code.md's own table says. The real lines are `:10-11` and `:19`.
     - code.md §3 cites `cleanup.api.ts:321-359` for `withCleanup`. The file has 100 lines; the function is at `:62-100`.
     - tests.md §1 cites `auth.fixture.ts:97-135` (the file has 124 lines) and "`:122` area" for `authUser`, which is at `:109`.
     - tests.md "Not found" cites `auth.fixture.ts:42-48` for the state file. The real lines are `:36-41` and `:77`.
   - Off by a few lines:
     - code.md cites `warm-up.ts:96-101`, `:15-18` and `:9`; the real lines are `:102-106`, `:19-20` and `:10`.
     - `SESSION_MAX_AGE_SECONDS` is at `session-cookie.ts:17`, not `:19`.
     - tests.md §4 gives SEC-API-07's meeting creation as `:589`, which is SEC-API-12 inside `withCleanup`. SEC-API-07's call is at `security.api.spec.ts:314`.
   - **Risk:** the planner and the implementers will navigate by these lines.
   - **Fix:** re-point each one.

2. **A false "Not found" about `planner`** (correction).
   - `research/README.md` "Still unknown" and tests.md §5 say no fact records that `planner` also serves read-only cases.
   - Two facts do:
     - `FACT-1071` (`data-model.md:162`): "mutation sandbox for `*.api.spec.ts`, plus one never-mutated fixture meeting".
     - `FACT-1073`: `mtg-planner-2` is SEC-API-11's fixture.
   - `e2e/README.md:231-233` says the same, and contract.md §1 already quotes both facts.
   - **Risk:** the requirement may retire the sandboxes. The designer would believe no keyed fact protects `mtg-planner-2`.
   - **Fix:** replace the line with a finding citing `FACT-1071` and `FACT-1073`.

3. **Contradiction 4's count comparison is false** (correction).
   - The README says history.md "counts six grep hits for `FACT-3642`, against the ten that `BL-068` claims".
   - history.md grepped `docs/` only (the `haiku` sweep).
   - contract.md's own citer list gives exactly ten living files outside plans and profiling:
     - four `apps/api/src/meeting-files/*` files;
     - `docs/api-contract.md`, `docs/BACKLOG.md` and `docs/CHANGELOG.md`;
     - three `meeting-files` case docs.
   - A repository grep confirms this. It also finds `docs/facts-lock.json`, which matters for the ADR-0022 retirement route.
   - **Fix:** drop the count clause from contradiction 4, or replace it with contract.md's list. Mark history.md's count as superseded.

4. **Citations of the other retire targets were not swept** (shape).
   - Requirement item 5 names `FACT-3125`, `FACT-3126`, `FACT-3131` and `FACT-3580`. Deleting `eraser` and adding ten users touches `FACT-1085`, `FACT-1087`, `FACT-1086` ("All five users share one password"), `FACT-1071` and `FACT-1037`.
   - Only `FACT-3642` got a list of who cites it.
   - My grep over those keys, outside `docs/plans`, finds:
     - `docs/facts-lock.json` (10 hits);
     - `docs/data-model.md` (8);
     - `docs/CHANGELOG.md` (1);
     - `docs/adr/ADR-0007` and `ADR-0027`;
     - `e2e/regression/meeting-files/meeting-files.functional.cases.md`, `meeting-files.api.cases.md` and `e2e/regression/home-dashboard/home-dashboard.api.cases.md`;
     - two profiling verdicts.
   - The repository's fact checks (`AR-API-11`…`AR-API-14`) require every `FACT-` reference in the repository to resolve.
   - **Risk:** the dependents of a retired fact silently become a design assumption.
   - **Fix:** add a per-key citer table, the same way it was done for `FACT-3642`.

## Findings (not blocking)

- **Misquote.** history.md §6a quotes `FACT-1036` as "owns two meetings". `data-model.md:326` says "owns one meeting".
- **Inference recorded as fact.** history.md §3d says "the storage-state mechanism is in the file since its introduction at `36e83b4`". That is inferred from today's content, and its own Not-found line says the commit is unknown. Move it to the Not-found line.
- **Stale "not read" items in history.md.** It says the current `workers` value, `FACT-1087` and `security.md:92` were not read. Other sweeps answer all three. The README should note which history.md gaps are closed elsewhere, since it was the `haiku` sweep.
- **Contradiction 3 is incomplete.** `e2e/README.md:230-231` carries the same exact-count exception as `FACT-1076`, so the README also disagrees with its own line 237, not only with the facts.
- **Contradiction 6 compares different claims.** P1 shows a cookie built from the API token is accepted today. The fixture's claim is that a hand-built cookie would "go red or green at the wrong moments", which is about drift over time, and P1 does not test drift. Say so, so the fixture's reason is not read as refuted.
- **Contradiction 2 is not a contradiction.** ADR-0007's register and `FACT-3593` agree the keys still stand. It is an accurate state that bears on retirement; label it that way.
- **Existing statements not recorded.**
  - `auth.api.ts:17`: "Tokens do not expire mid-run: JWT_EXPIRES_IN is '1h' against a 60 s test timeout".
  - `auth.fixture.ts:32-34`: the state file lives in `outputDir`, "wiped between runs anyway".
  - `e2e/README.md:246`: "No seeded meeting or file is ever a delete target".
  - All three bear on "state kept" and on the cleanup rules.
- **Config coverage of a new e2e directory.** `tsconfig.json:12` and `eslint.config.mjs:22` already cover `e2e/**/*.ts`, so a new `e2e/api/` needs no config change. Worth one line in tests.md §6.

## Gaps to carry forward (for the designer)

- **Stale claims.** How a busy slot behaves when its worker dies mid-test. P2 did not probe it.
- **Seven workers.** No run, measurement or fact exists for 7 workers. The `FX-052` reproduction was measured at the default 14 workers, and at 2.
- **Database state after cleanup.** P4 compared `total` only; ids, sequences and other rows were not checked.
- **Lifetime of saved state.**
  - The JWT lives 1 h; its only keyed value is `FACT-1029` on the cookie side, and `'1h'` itself appears only at `auth.config.ts:13`.
  - State files are wiped with `outputDir` (`auth.fixture.ts:32-34`).
  - `FACT-3221`: two runs in one tree share `storageState` files by name.
  - "State kept" across tests, runs or worktrees is therefore unspecified.
- **Ten browser users.** The seed has five users and no route creates one, so the seed must grow. `FACT-1086` ("All five users"), `SM-API-02` (which logs in every key) and the scrypt seeding cost (`FACT-3578`) are what moves.
- **Cookie drift.** Whether a hand-built cookie diverges from the real one over time (the fixture's stated risk) is untested. Requirement item 4's guard is the proposed answer.
- **Warm-up under API login.** The `FX-052` control run had `AL-FN-13` stuck on `/auth/login`. How the warm-up's login-branch reason applies once browser tests stop logging in through the UI is unmeasured.
- **Lost raw logs.** The `web-e2e-flake` raw logs are in the machine's temp directory (`docs/plans/web-e2e-flake/research/probes.md:5`) and may no longer exist. The written procedure is what remains.
- **Unread corpus.** `FACT-3150`, `FACT-3002`, and every ADR beyond the eleven named were read by title only.

## Verdict

**accept after blockers.** The surface is covered and the contradictions are stated without being resolved. But four statements need fixing before the designer inherits them: the impossible line numbers, the false "Not found" about `planner`, the false six-against-ten count, and the missing table of who cites the facts to retire.

Files reviewed: `C:\GIT\PurpleSchool\docs\plans\e2e-test-architecture\research\` (README.md, code.md, contract.md, tests.md, history.md, probes.md).
