<!-- agent: design-reviewer; session: b988267e-c081-447a-abcb-7f7b884c5b13; captured: 2026-10-23T15:40:48.117Z -->

VERDICT
Change: e2e-test-architecture
Gate: FEAT-G2
Pass: re-run
Verdict: accept-after-blockers
Findings:
- blocker | shape | recall-not-read | The test shape that rule 12 requires (FACT-3809, FACT-3811, design 2.4 and 2.7), `catch (e) { throw e; } finally {...}`, is an ESLint error: `no-useless-catch` ("Unnecessary catch clause") comes from js.configs.recommended (packages/eslint-config/base.js:17) and applies to e2e/** (eslint.config.mjs:17). `pnpm lint`, and so `pnpm verify`, goes red on all 136 tests. Neither the research nor the design mentions it
- blocker | shape | other | Decision (a) says it is "reconciled, not chosen", but for the whole `web` project one owner rule (shared preconditions in beforeAll/afterAll) gives way to the other (a test takes a user and returns it): browser modules get no beforeAll rows, and every test makes its own copy at a cost nobody measured. The owner asked to have this raised if the two rules could not both hold. That makes it the owner's call, not something the designer could settle by reconciling
- blocker | shape | contract-gap | The order of fixture teardown between the claim's release (FACT-3776) and the fallback in the `cleanup`/`preconditions` teardown (FACT-3780) is not stated. P7 did not probe it, and Playwright orders teardown by dependency or by parameter order. If the release runs first, a stale `trackAllOf(claim)` fallback can delete the meetings of the next holder of a released user, and a fallback cleanup can leave a slot marked leaked
- nit | - | other | FACT-3809's "one describe each" does not say whether nested describes are allowed. Today's specs use them for different preconditions ('without a session', 'user without meetings', home-dashboard.functional.spec.ts:88,344), and an api spec has several top-level describes (home-dashboard.api.spec.ts:82,267,506; meeting-files.api.spec.ts:194,430; meetings-detail.api.spec.ts:98,192). Design section 7 does not list this restructuring
- nit | - | dod-passes-when-broken | Rules 11 and 12 only count calls whose callee is named `test` (P8: "a test imported under another name" not tested). A spec that aliases `test` passes both rules having checked nothing, and nothing fails an in-scope file in which no `test` call matched
- nit | - | unverified-guarantee | design 2.4 has `afterAll` delete module rows even when the module's `beforeAll` threw partway through. P7 never made a `beforeAll` fail
- nit | - | contract-gap | `trackAllOf` registered before an id-tracked API create in the same tracker: because `run()` goes in reverse order, that id is deleted after the collection purge and gets a 404. That is a failure unless the entry was registered as tolerated, and design 2.4 does not say that it was
END VERDICT

# Design review: e2e-test-architecture, design review gate, third pass

## Strengths

- **Q1 option A is applied faithfully** (FACT-3773, FACT-3783, design 2.4 "HD-API-23", section 4 rows for `usr-eraser` and FACT-1085):
  - `eraser` leaves the seed and its fact is withdrawn;
  - one pool serves both projects;
  - `HD-API-23` claims a pool user and takes no page.
- **Q5 option B is applied faithfully:**
  - FACT-3806 names exactly MF-FN-09 and SEC-FN-01, each tagged `@ui-login`.
  - FACT-3807 records why the exemption is not by file, line or comment. That answers nit 1 of the second pass.
  - FACT-3042 keeps SEC-FN-01 as its source, which is correct, because SEC-FN-01 still reads the cookie flags the application sets.
- **The release check replaces the release purge cleanly.**
  - FACT-3776 and FACT-3812, with the rationale in ADR-0037, explain why a deletion at release would make a skipped cleanup invisible.
  - The takeover keeps its purge, and that is argued on its merits: a dead holder never reached its cleanup, and keeping that purge stops one crash from starving later claims.
- **C3 can go red in both parts.** I traced each.
  - (i) An unregistered `planner` create leaves `planner` at 3 against a baseline of 2, and no tracker or fallback touches it.
  - (ii) Without `trackAllOf`, the release check sees a `total` of 1, marks the slot leaked and fails the test. Teardown then lists the pool user, because release deletes nothing.
- **`run()` never throws, and the fixture teardown throws instead.** This rests on P7 (an error from a fixture's teardown is reported beside the test's own error), and design section 5 explains why throwing from `finally` would lose the test's own error.
- **Rule 11's tag scoping rests on P8, and its controls cover both directions:**
  - C4a/C4e must hit (including a read in a helper);
  - C4b must miss;
  - C4c/C4d drift the tag set both ways.
- **All five second-pass nits are resolved:**
  - the tag (FACT-3807);
  - the marker removed when the re-read names anything else (FACT-3777);
  - the `warm-up.ts` allowance (FACT-3759, design 2.6);
  - P5 run 6, which holds the second entry exactly as `playwright.config.ts:87,113` has it (FACT-3800);
  - FACT-3750 and FACT-3803 reworded.
- **I re-ran the impact row "Every test's body".** `^\s*test\(` over `e2e/**/*.spec.ts` gives 185 calls across 16 files. The four meta-test files hold 49 of them (10+7+20+12), which leaves 136 across 12 specs, exactly as the row lists.

## Blockers

**1. The required shape breaks lint (shape).**
- **Where:** design 2.4 "Body shape" and 2.7 rule 12, FACT-3809, FACT-3811.
- **What is wrong:** `node_modules/.../eslint/lib/rules/no-useless-catch.js:33-46` reports a catch clause whose only statement is `throw <its param>`, also when a `finally` follows ("Unnecessary catch clause"). The rule is `error` in `@eslint/js` recommended (`eslint-recommended.js:72`), which `base.js:17` pulls in and the root config applies to `e2e/**`.
- **Risk:** the rule 12 shape and `pnpm lint` cannot both be green. The implementer would discover this, then either switch a recommended rule off with no recorded decision or edit the shape.
- **What the design has to do:** the design (or the owner, see below) has to decide how the two coexist, and record it. research/tests.md:182 noted that the lint glob covers `e2e/` but did not check the rule set against the new shape.

**2. Decision (a) is a choice, not a reconciliation (shape).**
- **Where:** design 2.4 "Decision (a)", ADR-0037 Consequences ("A browser module holds no shared rows"), FACT-3813.
- **What is right:** for the `api` project the reconciliation holds: `planner` is a shared owner, the hook runs once per worker (P7), and tests address rows by id.
- **What is wrong:** for every browser module the argument works only by treating the per-test claim rule as fixed. Under it the owner's beforeAll rule has nothing to apply to, and what tests share becomes "the shape" of their preconditions, copied per test (`teacher`'s five meetings and two uploads, each upload waiting on the clock, for most HD-FN and MF-FN cases).
- **Why it is the owner's:** one binding rule is made inapplicable for a whole project, at a cost nobody measured (design section 8). The owner explicitly kept that call for themselves.
- **Risk:** low if the owner agrees, but the design records the owner's reserved decision as settled.

**3. Fixture teardown order (shape).**
- **Where:** design 2.3 "Release", 2.4 tracker and fallback, FACT-3776, FACT-3780, FACT-3810.
- **What is stated, and what is not:** the design states only that the browser context closes before the release. It does not state that the `cleanup` and `preconditions` teardowns, including the fallback that deletes and fails, run before the claim's release check. Nothing makes this hold: `cleanup` cannot depend on the claim, or every `api` test would claim, and P7 did not probe the order between two fixtures.
- **Risk:** the fallback is exactly the path the design relies on for a timed-out body. If the release runs first while `total` is 0, the slot is renamed away and can be claimed at once. The stale `trackAllOf(claim)` fallback then deletes the new holder's meetings with the same user's token, and an innocent test goes red. If `total` is above 0, a row the fallback was about to delete marks the slot leaked.
- **Remedy:** the design has to state the order and what guarantees it, or make `trackAllOf` refuse a claim that has been released.

## Findings

1. **"One describe each" (FACT-3809).** It needs a sentence on nested describes. Groups with different preconditions (no session, empty user, seeded shape) cannot share one module-wide `beforeEach` otherwise. The restructuring of the api specs that have several top-level describes is also missing from section 7.
2. **Rules 11 and 12 only see a callee named `test`.** Today every spec names it `test` (`mergeTests` at security.functional.spec.ts:26, meeting-files.functional.spec.ts:43, home-dashboard.functional.spec.ts:31). An alias, though, makes both rules pass having checked nothing. A must-hit item in the self-check would close it: an in-scope spec with zero matched `test` calls.
3. **`afterAll` after a failed `beforeAll`** is assumed in design 2.4 but was not probed.
4. **`trackAllOf` and id-tracked rows in one tracker.** Because deletion runs in reverse order, an API create registered before `trackAllOf` gets a 404 unless that entry is tolerated. State the rule.

## Minor

- Rule 12's meta-test exclusion is a narrowing of the owner's "every test body". It is surfaced honestly in section 9, but it is still a deviation until the owner answers.
- The ADR does not bound the release retry; only design 2.3 gives 2 s. That is consistent, just in two places.

## Genuinely the owner's call

1. **Decision (a).** "Your rules 'shared preconditions in beforeAll/afterAll' and 'a test takes a user and returns it when the test ends' cannot both apply to browser modules: each browser test holds a different pool user, so rows cannot be shared across its tests. The design proposes that browser modules have no beforeAll rows and each test creates its own copy of the preconditions in beforeEach (cost unmeasured; module-level rows exist only in api modules, on `planner`). Accept that, or prefer another arrangement?"
2. **The shape against lint** (blocker 1). "The try / catch (rethrow only) / finally shape is flagged as an error by ESLint's `no-useless-catch`, which the repository enables through the recommended set. Should the rule be switched off for `e2e/**` (recorded in the ADR), or should the shape be `try { … } finally { await cleanup.run(); }`, which behaves identically?"
3. **Rule 12's scope.** Already in design section 9: "Should the four meta-test files also carry the try/catch/finally shape, or are they out of scope as files that create no rows?"

## Can it go to planning

Not yet. It can once three things are done:
- the owner answers questions 1 and 2;
- the design records the lint resolution;
- the design states the teardown order (or the guard on a released claim) for blocker 3.

Each is a paragraph, not a redesign. If the owner accepts the design's position on (a), the rest of the pass needs no further full review.

Files reviewed:
- C:\GIT\PurpleSchool\docs\plans\e2e-test-architecture\design.md
- C:\GIT\PurpleSchool\docs\adr\ADR-0036-ui-once-and-an-e2e-api-layer.md
- C:\GIT\PurpleSchool\docs\adr\ADR-0037-e2e-user-pool-and-cleanup.md
- C:\GIT\PurpleSchool\docs\plans\e2e-test-architecture\research\probes.md (P5 run 6, P7, P8)
- C:\GIT\PurpleSchool\docs\profiling\verdicts\2026-10-21-e2e-test-architecture-feat-g2-a3d18a5e.md

Checked against:
- C:\GIT\PurpleSchool\eslint.config.mjs
- C:\GIT\PurpleSchool\packages\eslint-config\base.js
- C:\GIT\PurpleSchool\node_modules\.pnpm\eslint@9.39.5_jiti@2.7.0\node_modules\eslint\lib\rules\no-useless-catch.js
- C:\GIT\PurpleSchool\e2e\fixtures\auth.api.ts
- C:\GIT\PurpleSchool\e2e\regression\meeting-files\meeting-files.functional.spec.ts
- C:\GIT\PurpleSchool\docs\adr\README.md
