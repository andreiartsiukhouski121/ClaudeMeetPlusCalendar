<!-- agent: design-reviewer; session: b988267e-c081-447a-abcb-7f7b884c5b13; captured: 2026-10-23T15:56:32.052Z -->

VERDICT
Change: e2e-test-architecture
Gate: FEAT-G2
Pass: re-run
Verdict: accept-after-blockers
Findings:
- blocker | correction | contract-gap | Nit 2's fix (FACT-3759, FACT-3811, design 2.7: rules 11 and 12 fail a file that "imports or declares `test` under another name") goes red on three specs the design keeps. `security.functional.spec.ts:5-6,26`, `home-dashboard.functional.spec.ts:9,11,31` and `meeting-files.functional.spec.ts:9,11,43` each import `test as apiTest` and `test as authTest` and combine them with `mergeTests`. Design 2.1 keeps `fixtures/api.ts`, which exports `test` (`api.ts:54`), and adds the lease, claim, cleanup and preconditions fixtures. The design does not say how a spec puts these fixture sets together without renaming `test`, and section 7 does not list the three files
- nit | - | unverified-guarantee | P9 B3 shows that when a test times out, its abandoned body promise stays pending while the fallback runs and the lease releases the slot. Nothing is said about that body resuming after the release, for example through a per-worker API context, and writing to a user that is now held by the next test. Design 2.4's "releases a clean user" is true only at the moment of release
- nit | - | contract-gap | Design 2.4 says the preconditions on a held user, which a body's `trackAllOf` purges, "are registered tolerated too". FACT-3810 gives the 404 tolerance only inside a tracker that holds the collection entry. The design does not say who sets `tolerated` on the `preconditions` entries or when, and the ADR does not cover the case of two trackers
- nit | - | other | C9's expected red lists the release failure only. When the release runs first and the slot is marked leaked rather than released, the `cleanup` fallback still deletes the row, so C9 also passes as written
END VERDICT

# Design review: e2e-test-architecture, design review gate, fourth pass (narrow)

Scope: only the answers to the third verdict and to the owner's answers of 2026-10-23. The rest of the design was not re-reviewed.

## Strengths

**Blocker 3 (teardown order) is answered, and the answer rests on P9.**
- Design 2.3 "The lease" and FACT-3776 make `claim`, `cleanup` and `preconditions` all depend on a test-scoped lease, and the release runs in the lease's teardown.
- P9's recorded output supports this:
  - B1 to B3 end in `RELEASE lease` after all three teardowns, whatever order the test names the fixtures in, on a pass, a failure and a timeout.
  - A1 shows the opposite order when the dependency is missing.
  - This is recorded as FACT-3814, which cites `workerProcessEntry.js`.
- FACT-3810 adds `trackAllOf` refusing a claim that has already been released, as a second guard.
- Section 5 explains why the refusal alone was not enough, and rejects `cleanup` depending on `claim` directly because every `api` test would then claim a pool user.
- FACT-3819 rejects putting the release in the claim fixture's own teardown.
- C9 makes the ordering able to go red.

**P9 B3 is used, not just recorded.** A body that times out does not run its `finally`. Design 2.4 "The fallback" and FACT-3780 now name the fixture fallback as the path that deletes a timed-out test's rows.

**Owner answer 1 is applied faithfully.**
- FACT-3815 says where system-level data exists: nowhere. No row a test can create belongs to no user, by the schema.
- FACT-3817 applies the rule rather than excepting from it.
- The `planner` rows are not kept. They become per-test `beforeEach`/`afterEach` rows, addressed by id (design 2.4, and section 5's last row).
- FACT-3809 is reworded to the owner's definition of system-level data.
- The table in 2.4 keeps the `beforeAll` row as the place for such data later, and section 8 says no tracker is built for it now.

**Owner answer 2 is applied faithfully.**
- The shape is `try { … } finally { await cleanup.run(); }` (FACT-3809, FACT-3811, design 2.4).
- FACT-3816 records P10: ESLint passes the shape without the `catch` and flags it with the `catch`.
- Rule 12 goes red on any `catch`.
- FACT-3818 rejects switching `no-useless-catch` off.
- `run()` never throwing is still argued correctly for a `finally` with no `catch`.

**Owner answer 3 is applied faithfully.** FACT-3811 states the four meta-test specs as outside the shape's scope, with the reason, and section 9 records it as a stated scope.

**The four nits:**
- Nested `describe`s are allowed (FACT-3809, 2.7), and section 7 lists the three `api` specs that need restructuring.
- Aliases are covered by both rules and their self-checks (P10 G and H).
- `afterAll` after a failed `beforeAll` was probed (P9 C, FACT-3814). It is now moot, because there are no `beforeAll` rows.
- The `trackAllOf` 404 rule is FACT-3810.

**Impact rows re-run.**

| Row | Grep re-run | Result |
| --- | --- | --- |
| "Every test's body" | `^\s*test(\.x)?\(` | 185 calls across 16 files; minus the meta-test specs, 136 across 12. Matches. |
| "Top-level `describe`s" | `^test\.describe` | Several top-level describes in `home-dashboard.api.spec.ts:82,267,506`, `meeting-files.api.spec.ts:194,430` and `meetings-detail.api.spec.ts:98,192`; one in every other spec. Matches. |
| "Hooks" | `beforeAll\|afterAll\|beforeEach\|afterEach` | No matches in any spec. Matches "none today". |

## Blockers

**1. The alias rule versus today's `mergeTests` imports (correction).**
- **Where:** design 2.7 rules 11 and 12, FACT-3759, FACT-3811, and section 7.
- **What is wrong:** all three functional specs that use fixtures import `test as apiTest` and `test as authTest` (lines above). Both rules now fail such a file. The design keeps `fixtures/api.ts`, which exports `test`, and adds new fixtures beside it, so composing them is still needed. Neither 2.1, 2.7 nor section 7 says how a spec gets one `test` without renaming one, or that these three files change.
- **Risk:** rules 11 and 12 go red on three specs the moment the rule lands. The implementer then has to invent the composition, or weaken the alias check that nit 2 asked for.
- **What is needed:** one sentence on how fixture sets are composed, and a row in section 7 for the three specs.

## Findings

1. **A timed-out body that keeps running.** After a timeout the body is abandoned, not cancelled (P9 B3: its `finally` never logs). If it resumes after the release, it could write to a user now held by another test. The page context and the built-in `request` fixture close, but a per-worker API context (`auth.api.ts`'s token cache) does not. Worth a line in section 8, under the open questions or the omissions.
2. **Tolerated 404s across two trackers.** FACT-3810 covers only the tracker that holds the collection entry. Design 2.4 extends this to `preconditions` without saying who sets `tolerated` on those entries.
3. **C9's expected red.** A slot that was released early is marked leaked, not released, so the `cleanup` fallback still deletes the row. C9 still goes red, but say that the fallback's deletion also happens.

## Minor

- Design 2.3 still points to the reviewer's blocker by name ("This is blocker 3's answer"). That is fine in a change folder, but it is history text inside the design.

## Can it go to planning

Yes, once the one correction is made: a sentence on how fixtures are composed without aliasing `test`, and the three specs added to section 7. That needs no further full pass.

There is no owner question. All three owner answers are applied as given.

Files reviewed:
- C:\GIT\PurpleSchool\docs\plans\e2e-test-architecture\design.md
- C:\GIT\PurpleSchool\docs\adr\ADR-0037-e2e-user-pool-and-cleanup.md
- C:\GIT\PurpleSchool\docs\adr\ADR-0036-ui-once-and-an-e2e-api-layer.md (FACT-3759, FACT-3806, FACT-3807)
- C:\GIT\PurpleSchool\docs\plans\e2e-test-architecture\research\probes.md (P7–P10)
- C:\GIT\PurpleSchool\docs\profiling\verdicts\2026-10-23-e2e-test-architecture-feat-g2-ad90fecf.md

Checked against:
- C:\GIT\PurpleSchool\e2e\security\security.functional.spec.ts
- C:\GIT\PurpleSchool\e2e\regression\home-dashboard\home-dashboard.functional.spec.ts
- C:\GIT\PurpleSchool\e2e\regression\meeting-files\meeting-files.functional.spec.ts
- C:\GIT\PurpleSchool\e2e\fixtures\api.ts
