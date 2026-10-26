<!-- agent: design-reviewer; session: b988267e-c081-447a-abcb-7f7b884c5b13; captured: 2026-10-23T16:30:37.689Z -->

VERDICT
Change: e2e-test-architecture
Gate: FEAT-G2
Pass: re-run
Verdict: accept
Findings:
- nit | - | unverified-guarantee | design §8 says "A body parked on a timer never resumes", but P12 D4 only shows a 3 s timer that outlived the worker; a timer that fires during the tracker teardowns, before disposal, runs on live contexts
- nit | - | stale-fact | §2.3 says built-ins are "not covered" by P9 and FACT-3821 says "not on the lease's dependents", but in D1–D3 `request` was never a dependent of the lease (in D3 it was a dependency), so P12 agrees with P9 rather than being an exception to it
- nit | - | other | §2.3 says "by dependency in every link", but the override-to-parent-built-in link is ordered by setup order (the lease named first), and P12 never probed the override with `request` named first
- nit | - | other | the T4 check "contexts close before the release" names no action if it goes red; ADR-0037 is still proposed, so the answer is cheap, but nothing states it
- nit | - | stale-fact | FACT-3820 says "about 3000 process creations no process id was handed out twice", but P11 compared only the 1500 spawned children (distinctPids 1500); the helper pids were not compared
END VERDICT

This was a narrow re-run. I only reviewed design.md §2.3 ("The lease", "Release") and §8, plus ADR-0037's FACT-3776, FACT-3777 sources, FACT-3820, FACT-3821 and the new Consequences items, against P11 and P12 in research/probes.md.

## Strengths

- **§2.3 "The lease" reads P12 correctly on the main point.** A built-in `request` is torn down by setup order. So with `request` set up first (D2), or with a lease that depends on `request` (D3), the release ran on a live context. The answer is the form E1–E3 actually probed: `async ({ lease, request }, use) => use(request)`. In those runs, disposal came before the release in every parameter order. So the ordering guarantee for `request` does follow from P12.
- **The trackers depending on their request context is sound under P9.** `cleanup`, `preconditions` and `claim` depend on the override, and the override depends on the lease. Teardown therefore runs: tracker fallback on a live context, then disposal, then release. FACT-3776's "tears all three down before either" says exactly this.
- **The release opening its own context follows from the design.** Once the test's contexts are disposed before the release, the release cannot use them. Opening one from `playwright` and `apiBaseURL` is the pattern `apiRequest` already uses (e2e/fixtures/api.ts:57–63), and it creates no dependency cycle with the `request` override.
- **What is unproven is deferred honestly, in both places.** §2.3 limits the claim to P12 for `request` and P9 for the suite's own fixtures, and names a T4 check. That check is concrete: a `@ui-login` test and an `apiRequest` test, each timing out mid-`await`, with the lease set up both last and first, and the log showing each context closed before `RELEASE start`. ADR-0037's Consequences repeat the same gap. §8's "Not probed" line points to the same check.
- **The residue in §8 is stated plainly.** P12's server log shows an already-sent request is still answered. The design records this as misattributed but red, not silent, and leaves it open on purpose. A new Consequences item says the same.
- **FACT-3821 matches the P12 output line by line.** D2 and D3 disposed 13–21 ms after the release. E1–E3 disposed before it in all three orders. The pending call and later calls were rejected, and no late `POST` reached the server. A browser `context` was not probed. FACT-3820 matches P11 on the killed worker, the teardown budget equal to the test timeout, the cut teardown, and worker replacement. FACT-3777 now cites FACT-3820, which fits its dead-holder path.
- **Lifecycle:** ADR-0037 is still `proposed` (docs/adr/README.md:75), so amending FACT-3776 and FACT-3777 in place is allowed under ADR-0022. FACT-3776, FACT-3777, FACT-3820 and FACT-3821 are all present in docs/facts-lock.json. The new lines follow ADR-0021: keyed, each with a source, and no key inside the rationale block.

## Blockers

None.

## Findings

1. **§8, the timer generalization (`correction`).** "A body parked on a timer never resumes — the worker exits after the teardown" turns one D4 observation into a rule. In D4 the 3 s timer would have fired after the worker exited, about 22 ms after `RELEASE start`. A shorter timer can fire while the tracker fallbacks are running, when the overridden contexts are still alive by design, so the abandoned body does resume. The outcome is still covered: either the release sees `total` above 0 and fails the right test, or it falls into the residue already named. So no decision changes. But the sentence claims more than the probe showed, and FACT-3821's "because the worker exited after the teardown" puts a cause on a single run.
2. **§2.3 and FACT-3821, "not on the lease's dependents" (`correction`).** None of D1–D3 made `request` a dependent of the lease. In D3 the lease depended on `request`, which makes `request` a dependency, and P9 already says a dependency is torn down after its dependents. So P12 does not show built-ins escaping P9's rule. It shows that an unrelated built-in follows setup order, which is P9's `A1`. The design's conclusion is unaffected, but "it does not cover a built-in context" suggests built-ins behave differently, and a planner may read it that way.
3. **"By dependency in every link."** When `request` is overridden, the parent built-in that the override receives has no dependency on the lease. It is torn down before the lease only because it was set up after it, since the override names `lease` first. The design does say "the lease named first", so the mechanism is recorded, but it is setup order rather than dependency. P12 never ran the override with `request` named first, so that word order is load-bearing and untested in the other direction. The T4 check varies the lease's setup position, which is the right thing to vary. This is worth saying explicitly so nobody "tidies" the parameter order.
4. **No stated outcome for a red T4 check.** If the `context` override does not dispose before the release, FACT-3776's "every test-scoped context … is disposed before the release" is false for `@ui-login`. The ADR is still proposed, so revising it is cheap, but neither §2.3 nor §8 says that a red T4 sends the record back for revision.
5. **`apiRequest` is listed as unproven, more cautiously than needed.** It is suite-defined (api.ts:57–63), and its `dispose()` runs in its own teardown. If it depends on the lease, P9 already covers its ordering. Keeping it in the T4 check costs little, so this is not wrong.

## Minor

- FACT-3820 says "about 3000 process creations no process id was handed out twice". P11 counted 3000 creations but compared only the 1500 spawned children for reuse; the helper pids were not compared. Either drop to 1500 or say that only the children were compared. probes.md line 245 has the same wording.

## Verdict

Accept. The ordering guarantee for `request` follows from P12. The `context` and `apiRequest` links are honestly deferred to a concrete T4 check, and the keyed lines match the probe output. What remains are wording corrections that change no decision.

Files: C:\GIT\PurpleSchool\docs\plans\e2e-test-architecture\design.md, C:\GIT\PurpleSchool\docs\adr\ADR-0037-e2e-user-pool-and-cleanup.md, C:\GIT\PurpleSchool\docs\plans\e2e-test-architecture\research\probes.md, C:\GIT\PurpleSchool\e2e\fixtures\api.ts
