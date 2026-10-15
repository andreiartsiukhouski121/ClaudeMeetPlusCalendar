<!-- agent: research-reviewer; session: f097de28-2cfd-4a00-a282-3957c798d492; captured: 2026-10-14T12:58:58.001Z (restored from the transcript, FX-050) -->

VERDICT
Change: clean-architecture-pilot
Gate: FEAT-G1
Pass: re-run
Verdict: accept
Findings:
- nit | - | other | README Sweeps row for researcher-history says "~50 entries"; give the exact count or drop it, since an approximate count is the kind of unchecked summary the first pass flagged
- nit | - | assertion-scope | contract.md §H's "787 stated facts" scan cannot be reproduced from the file because the scan command and script are not recorded; the 15 rows I sampled are all correct
END VERDICT

**Re-run scope.** I checked the five blockers from the first pass and spot-checked the rewritten history.md and contract.md §H against the repository. I did not re-read the parts that passed the first time.

**Blockers from the first pass, all resolved**
1. **History coverage (shape).** history.md now covers all the items it was missing:
   - BL-040, BL-046 and BL-047: verified at docs/BACKLOG.md:37, :31 and :30. The quotes match, including "Counted: 23 → 0", "`FX-045` has no guard today" and "Open cost: lint and `pnpm verify` time, unmeasured".
   - FX-041, FX-042, FX-043 and FX-046: the line numbers 124, 123, 122 and 119 are right. The "exact equality" quote for FX-043 is in CHANGELOG.
   - FT-007's 18 retired service units: the Checks quote is present, and the 11/3/4 split checks out at docs/plans/meeting-files/meeting-files.plan.md:11.
   - Probe 7: docs/plans/meeting-files/research/probes.md:678-711 matches word for word, including the "Not probed" paragraph at :709-711. Probe 0e is at :154-158 and probe 5 starts at :526.
   - The README records the re-run as a sonnet sweep that replaced the rejected haiku sweep.
2. **Prior change folder described without reading it.** The invented descriptions ("26 contradictions" and the rest) are gone. Section 4 now quotes line ranges I could open. The design.md:604-605 rows and the ADR-0027 Rationale at :119-128 match.
3. **Nest DI under Vitest.** code.md:107 now names apps/api/src/app.controller.spec.ts:9-14 and apps/api/test/app.e2e-spec.ts:13-18. Both match the files, and so do apps/api/package.json:22 (test:e2e) and package.json:37 (verify). The README's "Open" item now says these specs exist but were not run, which is the honest position.
4. **Facts whose locked text names module files.** contract.md §H checks out:
   - Hashing is at scripts/facts-parse.mjs:71-73, with the hash written at :301.
   - The rule that a list item is hashed together with its continuation lines is at :162-174.
   - The rule that a table row is hashed alone, with its block source used only for the source check, is at :126-129 and :197-198.
   - The quotes from the AR-API-15 case are at e2e/architecture/architecture.api.cases.md:243-258.
   - `fact:lock` is defined at package.json:30.
   - I opened 9 of the 15 table rows (FACT-1057, 1063, 1065, 1070, 1075, 2087, 2089, 2090, 2110, 2112, 2115). Each one holds the named path or symbol inside the hashed statement.
   - A separate search of docs/ for keyed facts naming module symbols found no API-side key missing from the table.
5. **Download path.** contract.md Divergence 2 now gives both sides without picking one:
   - Corpus: FACT-3105 at ADR-0006:29 and FACT-0012 at architecture.md:82, including "assemble a response by hand".
   - Code: controller lines :155, :162, :170-175 and :177 all match.
   - It closes on "the corpus states no fact relating either to the download route". The README carries the same point as contradiction 7, also without a verdict.

**New contradictions 8 and 9 check out**
- Contradiction 8 (multer version): ADR-0029:25, :52 and :68 say multer@2.4.0, while pnpm-workspace.yaml:59 pins `'2.3.0'`, with the reason in the comment at :26-28.
- Contradiction 9 (BL-004): FACT-3594 at ADR-0027:113-115 says "`BL-004` stays open", while docs/BACKLOG.md:70 says "Closed by `CH-031` — rejected". Both are named and neither is resolved.

**Other spot-checks of history.md, all correct:**
- the CH-033 item quotes;
- the mapping of CH-033 items to backlog rows (BL-030, BL-039 and the others cite "tuning round 5");
- the list of rows in the backlog's Rejected section (BACKLOG.md:96-108);
- the FACT-3589 text and its "Rejected:" heading at ADR-0027:79.

I found no inference recorded as fact. The ADRs whose bodies the sweep did not read are marked "Not found".

**Gaps to carry forward (additions for the designer)**
- contract.md §H only scanned for literal names. A fact that refers to "the mapper" or "the controller" in plain words was not scanned. Moving files may still make such a fact false even though its lock hash does not change, so a review has to catch that, not AR-API-15.
- Two web-side keys, FACT-2119 and FACT-2120 (docs/api-contract.md:398-399), name `getMeetingFiles` and `lib/actions/meeting-files`. They are outside §H's scan pattern and outside this change's scope. They matter only if an API symbol they depend on gets renamed.
- The texts of ADR-0014, ADR-0015, ADR-0016 and ADR-0032 were not read (history.md, "Not found"). Whether they constrain a new skill or the planned update to the `implementer-api` definition is still open.
- Whether FT-007's 18 retired units are the whole set of service-layer units is unknown. Only plan.md:11 and the FT-007 Checks cell state that number.
- No suite was run, so nobody has observed decorated-class DI working under Vitest for any meeting-files class.

**Files**
- C:\GIT\PurpleSchool\docs\plans\clean-architecture-pilot\research\README.md
- C:\GIT\PurpleSchool\docs\plans\clean-architecture-pilot\research\history.md
- C:\GIT\PurpleSchool\docs\plans\clean-architecture-pilot\research\contract.md
- C:\GIT\PurpleSchool\docs\plans\clean-architecture-pilot\research\code.md

**Verdict: accept.** All five blockers are fixed, every citation I opened says what the research claims, and the new contradictions are named with both sides and left unresolved.
