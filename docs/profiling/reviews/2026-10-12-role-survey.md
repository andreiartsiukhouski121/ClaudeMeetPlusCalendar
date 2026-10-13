# Role survey 2026-10-12 — input to `TUNE-S1`, round 5

**What this file is.** On 2026-10-12 the owner asked for a fifth tuning round with two goals: make the
pipeline faster and cheaper without losing quality, and collect from every role what would help it
produce code that stays understandable and maintainable for years, for humans and AI agents alike.

Each of the 23 roles in `.claude/agents/` was dispatched once, read-only, with the same five
questions: (1) speed/cost, (2) inputs, (3) recurring quality problems and the single change that
would prevent them, (4) long-term maintainability, (5) one thing to remove or shrink. Each was told
to read its own definition, the three profiling records in `runs/`, and the `FX-` entries touching
its stage, and to cite every point or mark it "opinion, uncited".

**How to read it.** These are the roles' own reports, condensed by the orchestrator with the
citations kept. They are **self-reports, not measurements**: a role's account of where its tokens
went is evidence of what it read in the records, and its opinion is marked as such. Several roles
read only part of their sources and say so; that caveat is kept. `TUNE-S1` treats this file as one
source among the records, not as a substitute for them.

Paths without a directory are profiling records: `09-28` = `runs/2026-09-28-meetings-detail-participants.md`,
`10-03` = `runs/2026-10-03-design-language-rollout.md`, `10-06` = `runs/2026-10-06-meeting-files.md`.

---

## Discovery

### `researcher`

1. **Cost.** `FEAT-S1` 303,500 tokens / 92 calls / 16.0 min (`09-28`:19); 260,021 (`10-06`:58);
   unmeasured in `10-03` (:57). Research folders grow: 1,871, 3,007, 3,107 lines across the last
   three cycles vs 262 for discovery-pipeline. `10-03`:173-188 — research "roughly double what the
   design actually drew on"; unused: exhaustive `FACT-2000`–`2079` read, 657 lines of raw compiler
   output, a per-file git-history table. A researcher re-run only to format six files (`10-03`:39-40, 58).
2. **Inputs.** The skill once claimed five scaffolded files, two exist (fixed in `CH-025`).
   `docs/security.md` holds no keyed facts, so security findings have nothing to cite
   (meeting-files/research/README.md:151-166). Briefs carry no scope or depth bound (opinion).
3. **Quality.** Research finds documents drifting from each other (`FX-031`, `FX-032`), but later
   stages let contradictions continue: `FX-046`'s id divergence was named in research (README.md:142)
   and carried forward as `BL-024`. Single change: every item in README "Contradictions" must carry a
   `BL-`/`FX-` routing line (protocol now says only "a defect for the lead to route", SKILL.md:88-91).
4. **Long-term.** Keys work (`ADR-0021`). Gaps: `docs/security.md` outside the keyed corpus; every
   cycle re-derives the same call map (code.md 357/672/619 lines) — a keyed module map in
   `apps/*/CLAUDE.md` would shrink the code sweep to a diff (opinion).
5. **Remove.** Shrink the default history sweep for changes not touching the ledger area
   (history.md 241–503 lines; no `FX-` credits the history sweep). Alternative: drop raw `probes.md`
   output (657 and 733 lines, never read downstream, `10-03`:186-187).

### `researcher-code`

1. **Cost.** Not isolated in records (sweeps lumped in `FEAT-S1`). The research review costs about as
   much as the sweeps (158,585 / 192,839; `09-28`:20, `10-06`:59). Over-sweeping (`10-03`:173-177);
   six files failed `format:check` and needed a re-dispatch (`10-03`:39-40, 58).
2. **Inputs.** No size, question count or skip rule for a sweep; the "area is larger than one sweep"
   escape (`researcher-code.md`:47-49) has no threshold. Stale corpus: code and docs disagree and the
   sweep guesses which to trust (`FX-031`, `FX-032`).
3. **Quality.** The same stale-doc `FX-` set is rediscovered at research time. Repeated "Not found"
   for infrastructure that does not exist yet (meeting-files/research/code.md:243, 380-385). Single
   change: "run prettier on your file" in the definition — the role has `Bash` (opinion).
4. **Long-term.** Easy: the layered chain `proxy.ts` → `dal.ts` → `api-client.ts` → controller →
   service is stable; `PROTECTED_ROUTES` and `FACT-` lines are greppable. Hard: one rule in several
   places (invariants, corpus, adapters, ledger). Opinion: a generated route/module map, a short
   README per Nest module, symbol anchors instead of line numbers.
5. **Remove.** Shrink "What depends on the area" and "Not found" to what the question asks; drop
   "sweep converged after N files" unless the sweep was cut short.

### `researcher-contract`

1. **Cost.** contract.md: 717 lines for a presentation-only change with no HTTP surface
   (design-language-rollout), 425, 379, vs 48 for discovery-pipeline; long runs of "Not found: any
   FACT- for …" (:193, 210, 258, 270). Meeting-files §3 walks ~140 lines of facts one by one (opinion:
   re-listing, not selecting).
2. **Inputs.** Corpus read in full every run: api-contract 437 lines, data-model 326, architecture
   225, 33 ADRs — no per-area index. Stale docs: `FX-031`, `FX-032`, `FX-044`, `FX-046`.
3. **Quality.** Recurring class: "a statement nothing mechanically verifies" (`FX-031`, `FX-032`,
   `FX-044`, `FX-046`). Single change: extend the `AR-API` checks to verify case IDs in the
   api-contract Cases column and flag README/contract table duplicates (opinion on feasibility).
4. **Long-term.** `FACT-` keys are the best mechanism (522 keyed, `CH-023`). Missing: a topic index
   from keys to features. Per-change contract.md copies facts with quotes — a second copy that goes
   stale; replace quotes with key references (opinion). UI tokens under-documented as facts.
5. **Remove.** The full-quote requirement and "Not found" enumeration for changes with no contract
   surface; cite keys plus path instead.

### `researcher-history`

1. **Cost.** First history.md carried design inference later removed
   (meetings-detail-participants/research/history.md:10-16). Per-file git-history tables were never
   used (`10-03`:190-191).
2. **Inputs.** The boundary between retrieval and inference was learnt by violating it. Unformatted
   files failed `format:check` (`10-03`:39-48).
3. **Quality.** "Asked and answered from memory" (`10-06`:213-227; `09-28`:58 bad `path:line`
   pointers). Single prevention: read the cited document when recording; never assert from recall.
4. **Long-term.** Roles holding data must forward it at dispatch time (`10-06`:308-325). Keyed facts
   are well maintained; `AR-API-14` caught a dead reference by machine (`10-06`:256-271).
5. **Remove.** Pre-computed per-file history tables; keep targeted `git log --grep` queries
   (~50–100 lines per history.md).

### `researcher-tests`

1. **Cost.** Per-sweep tokens not recorded. tests.md 400 / 406 / 571 lines vs 45; research total
   9,669 lines. The test sweep paid for itself in `10-03` (unscoped list locators, :186-188).
   Opinion: re-listing every case in an area the change does not touch is the waste.
2. **Inputs.** Requirement not scoped to a surface list; misses 3 and 4 in `10-06`:196-204 were
   "never asked" (unscoped `getByRole('link')` counts in `HD-FN-17`/`HD-FN-19`; the `FACT-1036`
   count). `.cases.md` preconditions are not executed and rot (`10-06`:231-239). Retirement analysis
   answered from memory (`10-06`:168-185).
3. **Quality.** Same shape in 3 of 3 cycles: cases doc vs spec disagreement (`09-28`:61), false "no
   case asserts a 404" (:56), scope-blind assertions (`10-06`:205-211). `FX-041`'s coverage already
   existed as `MF-API-06` and nobody grepped. Single change: a mandatory "assertion-scope sweep" —
   grep `toHaveCount|toBeHidden|not.toBeVisible|unscoped getByRole` over specs touching a changed page,
   and counting words in case preconditions.
4. **Long-term.** Pairing and ID-prefix titles are sound. `path:line` rots, IDs are stable. Retire
   per case with a successor ID. Opinion: each case doc lists its scope-sensitive assertions.
5. **Remove.** Per-case narration of cases that do not depend on the change; keep "would break",
   fixtures/mutated owner, gaps. No `Not automated` markers exist in `e2e/**/*.cases.md` (grep count
   0), so that template part is always empty.

### `research-reviewer` (`FEAT-G1`)

1. **Cost.** Fully measured once: 158,585 tokens / 68 calls / 8.2 min, 2 blockers, one changed the
   shape (`09-28`:20, 71); caused 183,652 of research rework (:58). `10-06`: 192,839, verdict "not
   available" (:59). `10-03`: unmeasured. Its `10-06` output was mostly gaps (README.md:68-70,
   115-124, 226-255).
2. **Inputs.** Never given the requirement separately — only the researcher's restatement
   (`research-reviewer.md`:23). The definition contradicts itself: "was the surface covered?" (:23)
   vs "does not judge whether the coverage is adequate" (:37). No re-review rule after blockers;
   verdict not stored durably.
3. **Quality.** Bad pointers (`09-28`:58); index dropping sweep findings (README.md:226-227);
   `HD-FN-17`/`19` and `FACT-1036` passed the gate, although the previous cycle had found "seven
   unscoped list locators" (`10-03`:186-188). Single change: a fixed question for the tests and
   contract sweeps — "which assertions or facts state a count or scope over the surface this change
   adds to", answered by the greps in `10-06`:205-211.
4. **Long-term.** Write each recurring miss down as a grep in the protocol, not an intention
   (`10-06`:241). Opinion: one living list of every place that asserts a count or scope.
5. **Remove.** Checking the README records the model per sweep (`research-reviewer.md`:32-33) — a
   form check a script could do; never a blocker; no `FX-` names this gate.

### `designer` (`FEAT-S2`)

1. **Cost.** 428,268 / 21.7 min (`09-28`:21); 311,566 / 37.3 min second pass only (`10-03`:62);
   549,941 with ~20 resumes (`10-06`:60). The 300-line budget (`design-protocol`, since `6d162ad`)
   is ignored: meeting-files design.md 1,042 lines, §3 Contract ~270, §7 Impact ~226;
   design-language-rollout 546 → 422 after the lead's cut, which removed restatement, not substance
   (`10-03`:195).
2. **Inputs.** Research too broad in the wrong places (`10-03`:173-191); no coverage map of what each
   case asserts, so §7 retirement analysis was wrong twice (`HD-UT-09`, `MD-UT-06…09`;
   `10-06`:170-189); no record of page-wide assertions (`10-06`:191-211).
3. **Quality.** Design review returned blockers every cycle (`09-28`:72; `10-03`:140; `10-06`:61-62):
   a "mechanical guarantee" no check performs (`09-28`:59), a self-contradiction (`10-03`:123),
   coverage from memory. Single change: a mandatory "artifact families" table in design §7 — specs,
   corpus, cases preconditions, hand-kept lists, framework output — each answered by a quoted grep,
   never recall (`10-06`:213-229); today it lives only in one design and one record.
4. **Long-term.** `docs/architecture.md` has no module dependency map; module maps live in the two
   `CLAUDE.md` files outside the keyed corpus. ADR log (31 records) has no "decisions by area" or
   supersession index. Missing ADR: how framework/parser behaviour is pinned (`FX-043`). No keyed
   coverage index from case to facts/invariants.
5. **Remove.** Shrink design §3 to deltas against `docs/api-contract.md`, citing its keys.

### `design-reviewer` (`FEAT-G2`)

1. **Cost.** 151,795 / 8.0 min, 2 blockers, 1 shape (`09-28`:22, 72); 153,750, 4 blockers, 2 shape
   (`10-03`:61, 123, 140); 195,866 + 113,319 narrow re-run, verdict not recorded (`10-06`:61-62).
   `10-03` review re-run from scratch over unchanged files because the verdict died with the session
   (:34-36, 208-211). The narrow re-run cost 58% of a full pass (opinion: re-read the corpus).
2. **Inputs.** Designs far over budget (meeting-files open questions start at line 959). No list of
   what changed since the first pass; no rule for a correction-only re-run (the plan gate has one,
   `10-03`:65). Verdicts not stored durably.
3. **Quality.** Recurring: "a guarantee claimed for a check that does not perform it" (`09-28`:59).
   Own miss: the meeting-files impact list was wrong three times and passed the gate
   (design.md:740-742; `10-06`:168-203) — the definition asks whether impact is _stated_
   (`design-reviewer.md`:34-36), not whether it is true. Single change: impact section records the line
   actually read per case, plus the scope-containment search.
4. **Long-term.** Extend self-checking machinery (`AR-API-14`). `AUDITED_PAGES`/`PROTECTED_PAGES`
   still held by review (`CH-028`; `BL-030`). Opinion: enforce the 300-line design budget
   mechanically.
5. **Remove.** Reading all four corpus documents in full (`design-reviewer.md`:19-20) → read the ADR
   log, refused table, layer rules plus only the keys cited/retired; re-runs read only the delta.

### `planner` (`FEAT-S3`)

1. **Cost.** 304,155 / 29.3 min (`09-28`:23; 3.4× implementation time, reviews/2026-09-30-review.md:112);
   126,239 + 52,781 correction (`10-03`:63, 65); 364,786 with 4 resumes (`10-06`:63). Restatement of
   design in orientation (meeting-files.plan.md:10-14). The 100–150-line budget is met with very
   long lines: 160 lines but 60,864 bytes, longest line 1,494 chars, task table 34 KB (56%).
2. **Inputs.** Design passed sixteen open questions to the plan; design 1,042 lines vs 300 budget.
   Stale facts reached planning (`FACT-1036`, `10-06`:201; `ADR-0017`). A spike overturned the design
   (`prisma generate` 71 ms claimed, ~2 s measured, +10 s per verify; `10-06`:289).
3. **Quality.** Every plan-review finding in three cycles is task order or DoD timing (`09-28`:60;
   `10-03`:123, 142; `10-06`:276-283); four tasks nearly run in parallel, "true about files and false
   about server runs" (`09-28`:111). Single change: a "red before / green after" column naming the
   state where the DoD fails, plus a "starts the app: yes/no" flag.
4. **Long-term.** Freeze a plan once accepted; outcomes go to the ledger and record (task 7 row now
   reads as a retrospective, plan:68). DoDs as commands or case IDs; tasks cite `FACT-` keys.
5. **Remove.** Plan §2 Contract and §3 Data → one pointer line each ("design §N, not restated").
   Runner-up: let orientation answer "see design §N" when design cites the same IDs.

### `plan-reviewer` (`FEAT-G3`)

1. **Cost.** Cheapest gate: 126,135 / 6.1 min (`09-28`:24); 136,776 / 6.6 min (`10-03`:64); 117,917
   (`10-06`:64). Yield: 2 ordering blockers → 169,549 rework (`09-28`:60, 73); 4 corrections → 52,781
   rework, one high-value (a DoD passing with the old accent) (`10-03`:124, 141); `10-06` verdict not
   available.
2. **Inputs.** Own definition stale: `plan-reviewer.md`:34 says test cases "do not belong in a plan",
   but `CH-021` added §4a "Tests this change is expected to break" (`TEMPLATE.md`:110) — the role is
   told to skip the section where `10-06`'s misses lived. No artifact lists design findings already
   settled.
3. **Quality.** Recurring: ordering and unreachable DoDs. Recurring miss: scope and count assertions
   (`10-06`:191-203). Single upstream change: a mandatory "boundary" column (which task makes each DoD
   reachable) plus the enumerated-families sweep as a §4a/§3a checklist.
4. **Long-term.** A meta-test that every reference in `.claude/agents/*.md` to a plan section exists
   in `TEMPLATE.md` (opinion). Keep "settled by the spike, do not re-derive" (`plan-reviewer.md`:32).
5. **Remove.** Corpus conformance (`plan-reviewer.md`:19-22): read §3a's keys and the refused table
   instead of all four documents; keep "a behavioural task with no corpus fact named is a blocker" (:54).

### `test-designer` (`FEAT-S9`)

1. **Cost.** Most expensive single dispatch of `10-06`: 587,815 tokens, ~15 resumes (`10-06`:65) —
   more than design (549,941) or plan (364,786). 97,019 in `10-03` (:66).
   `meeting-files.api.cases.md` is 341 lines vs a 200-line budget (`test-designer.md`:43); the excess
   is parser internals with library line numbers (`MF-API-10`, :183-215), acceptability arguments,
   case history (:138-143).
2. **Inputs.** Inherited the design's wrong "covered" claims (`10-06`:170-180). Parser facts arrived
   late and were written into cases (:33-41) instead of design §3. Plan ordered test design after
   implementation (`10-03`:124).
3. **Quality.** Recurring: assertion broader than its subject, or stale precondition (`10-06`:196-200,
   233-235; `09-28`:61). Single change: checklist item "for each surface this change adds to, list
   every existing case whose scope contains it"; preconditions cite a `FACT-` key or fixture constant,
   never restate a count.
4. **Long-term.** Cases say what must be true and why, with a key; history and lessons go elsewhere.
   Shared traps (route announcer, dev-tools control, Chromium 404 console error) live once in
   `playwright-verify`, not copied per feature. One case, one response body.
5. **Remove.** Rationale paragraphs inside cases ("This case was…", library line numbers).

## Implementation

### `implementer-api` (`FEAT-S4`)

1. **Cost.** Implementation is cheap; rework dominates: 29.3% of `09-28` (1,018,067; :54-61);
   1,148,652 over 10 dispatches in `10-06` (:86-92). Per-task context is constant and heavy (three
   corpus documents, package CLAUDE.md, root invariants, the fact-retire ritual; definition :12-17,
   47-53). Opinion: the task slice should carry the 3–5 relevant keys inline. Some rework was
   non-implementer work under an implementation label ("audit overrides 64,215", "multer pin 61,321",
   `10-06`:88).
2. **Inputs.** The plan did not name facts the code contradicted (`FX-046`, five retired facts →
   `BL-024`). Copy sites listed by hand (`09-28`:76-77). Hand-offs built from recollection of cases
   (`10-06`:171) — link cases by path.
3. **Quality.** The invariants held; defects sit at edges they do not cover: `FX-041`
   (`Content-Disposition` from a stored filename), `FX-043` (dependency override), `FX-045` (vacuous
   typecheck), `FX-046` (id format). Single change (opinion): "data from the store or a header is
   hostile" — header/path values go through a unit-tested pure builder in `*.rules.ts`; a guard that
   fails if a tsconfig `include` misses a directory with `.ts`.
4. **Long-term (apps/api/src).** Good: services carry the invariant and case ID next to the code
   (`meetings.service.ts`:21-26, 37-40, 73-79); consistent controller/service/mapper/types/rules
   layout; `meeting-files.rules.ts` is pure. Hard: `toDomainMeeting` (`meetings.service.ts`:91-107)
   and `toDomainMeetingFile` (`meeting-files.service.ts`:75-93) restate Prisma's shape — a column
   means 3–4 edits; id prefixes as literals in two services (the `FX-046` shape) → one `issueId()`
   helper in `src/common/`; comments cite "design §8.14", which rots; `app.controller.ts` /
   `app.service.ts` look like scaffold leftovers (not opened). Lint candidates: ban `useGlobalPipes`.
5. **Remove.** The "Facts in the corpus" paragraph (:47-53) duplicates `project-context` and is
   enforced by `AR-API-15`; the nine "Rules that are not negotiable" restate root invariants 1–8.

### `implementer-web` (`FEAT-S4`)

1. **Cost.** 163,541–229,841 tokens per dispatch for 30–120 lines of product code (`10-06`:80-84;
   `upload-file-form.tsx` 64 lines, `meetings/[id]/page.tsx` 121). 207,311 / 114 calls / 19.6 min in
   `10-03` (:68). Mostly context loading: definition 68 lines, `apps/web/CLAUDE.md` 106, heroui-react
   108, design-system 193, plus root invariants; invariants appear three times. Icon-alias fix 98,841
   tokens for what one `.d.ts` read would have shown (`10-03`:71, 125).
2. **Inputs.** The plan had the empty-selection upload behaviour wrong: `FX-042` (Next substitutes
   `'blob'`) cost 326,861 + 85,892 (`10-06`:88-92). Stale doc: `apps/web/CLAUDE.md`:58-61 says
   `session.ts` has no units but `session.spec.ts` exists; the module map (:17-27) omits nav-rail,
   stat-tile, hero-banner, upload components. Labels-as-contract discoverable only by grepping cases.
3. **Quality.** Recurring "compiles or passes silently but is wrong": `FX-040` dead HeroUI v2 token
   classes passed review, the a11y scan and 28 functional cases; deprecated icon aliases; `FX-042`;
   `FX-045`. Single change: lint/CI on the compiled CSS — banned-class lint (`foreground-\d`,
   `default-\d`, `bg-[#`) and `no-deprecated` on imports.
4. **Long-term (apps/web/src).** Easy: pure modules apart from `server-only` ones; Server Action
   shape explicit. Hard: case IDs hand-written in component JSDoc (`meeting-list.tsx`:11-33); 15–20
   line doc comments on 70-line files, action preambles repeat invariants 10, 11, 13
   (`lib/actions/meeting-files.ts`:10-28); session-check boilerplate repeated per action → a
   `withSession(action)` helper; `dal.ts` 168 lines mixing fetchers → split by resource; components
   flat in `src/components` but forms under `app/` — pick one rule. Lint candidates: ban
   `required`/`isRequired` (inv. 15), `localhost` literals, non-async exports from `'use server'`
   (inv. 13), `bg-[#` and `rounded-[`. A README or index per lib folder as an entry point.
5. **Remove.** Invariant duplication: the definition restates root invariants 9–15 and 19
   (`implementer-web.md`:18-45); `apps/web/CLAUDE.md`:37-47 restates heroui-react.

### `code-reviewer` (`FEAT-G4`)

1. **Cost.** 159,360 / 5.8 min, 2 blockers (`09-28`); 162,275 / 8.5 min, 3 blockers (`10-03`);
   "not available" (`10-06`:69). `09-28`:74: "both prose; the code was correct on every point
   pressed" — yet 407,507 rework (:61), 2.5× the review. Across two records 1 of 5 blockers changed
   code. Opinion: re-reading the corpus and all 19 invariants for every diff.
2. **Inputs.** No verdict path or token counter in `10-06` (:303). Code comments cite "design §3",
   "design §8.14" without the change folder (`meeting-files.controller.ts`:56, 109;
   `meetings.controller.ts`:25).
3. **Quality.** Main recurring finding: documents disagreeing with code (`09-28`:61; `10-03`:126).
   `FX-040` got past review; `FACT-3561` says nothing mechanical catches dead classes → a check that
   compiles `globals.css` and fails on classes producing no CSS. Deprecated imports →
   `@typescript-eslint/no-deprecated` (suggestion). In the ledger, code review is credited with
   exactly one defect: `FX-004` (shared with acceptance).
4. **Long-term.** Comments point at line numbers in other files (`route.ts`:24 → `api-client.ts`:115,
   etc.) — cite symbols, never lines. "design §N" with no folder in ~20 comments — cite `FACT-`/`ADR-`
   or case IDs. Upload rule order lives in `meeting-files.controller.ts`:55-111 with a hard-coded "10"
   at :110 next to `MAX_FILES_PER_MEETING` → move to rules/service. Duplication: non-2xx →
   `ApiError` copied (`api-client.ts`:108-113, 168-173); `redirect('/auth/session-expired')` after 401
   hand-written 5× in 3 files → `assertOk()` and `withSession()`. Over-commenting: `route.ts` ~45%
   comment restating invariants by number.
5. **Remove.** Corpus reading (`code-reviewer.md`:73-77) → only when the diff touches `docs/`; drop
   the design-language bullet once the dead-class check exists.

## Tests

### `tester-unit`

1. **Cost.** Folded into a 12-dispatch `FEAT-S4` bucket of 1,997,808 (`10-06`:67); sub-items "retire
   dead units" 85,974, "unit specs" 69,492, "builder units" 87,224 (:83-89). The retirement recount
   was from memory and wrong for two classes (:168-180). No subject in `10-03` (correctly).
2. **Inputs.** Design §7 coverage claims from recollection (`HD-UT-09`; `MD-UT-06…09`). `MF-API-06`
   already pinned the header before `FX-041` (`10-06`:182-185). No named channel for a case ID whose
   subject was retired.
3. **Quality.** Vacuous or false-positive units: `FX-033` (`09-28`:88), `FX-001`/`FX-012`. The
   break-then-restore rule (`tester-unit.md`:49-51) is prose; nothing records it was done. Single
   change: one report line per new ID — "broken by <mutation>, red: yes".
4. **Long-term.** Logic in `server-only` files is untestable by design (inv. 14) → rule "no branching
   in a `server-only` file", extract pure deciders. Spec/module name mismatch (`session.spec.ts` tests
   `session-cookie.ts`, not opened) confuses agents. Opinion: a shared builder for users, tokens,
   meetings.
5. **Remove.** "Do not run pnpm test" and facts-corpus paragraphs (:43-45, 53-57); possibly the
   `*.unit.cases.md` pairing for trivial pure helpers (not verified).

### `tester-api`

1. **Cost.** `FEAT-S5` 1,146,931 / 66.1 min over 11 dispatches; 24 min on `FX-033`, a defect the
   change created in the existing suite (`09-28`:26, ~95). `10-06`: red tests 318,246; rework in the
   API area ~358k ("api spec catch-up" 131,461, "spec correction" 114,475, "seed fixture + 415 string"
   111,977; :66-73). Opinion: every grep-scoped run still pays server start + `db:reset`. Meta-specs
   (~2,500 of 5,599 api-project lines) are pulled into context on every suite dispatch.
2. **Inputs.** Separate rework dispatches suggest cases written before seed and contract settled
   (inferred). Five of ten rework items cannot be tied to an original stage. `e2e/README.md`:307-322
   carried an off-by-one file count through several entries (`FX-027`, `FX-035`).
3. **Quality.** Count/index drift (`FX-027`, `FX-035`); cross-suite breakage through shared state
   (`FX-033`). Single change: run the whole api project once before hand-back, not only the grep.
4. **Long-term.** Login repeated inline (14 in auth-login spec, 5 in security spec) →
   `loginAs()`/`authHeader()` fixture. `meeting-files.api.spec.ts` 918 lines → split or share upload
   builders. A fixtures index at the top of `seed.ts` saying which user is mutable (today only in the
   agent definition and `CLAUDE.md`).
5. **Remove.** The "Run economics" running changelog (`e2e/README.md`:301-331) → one current row,
   ideally generated; it has already drifted.

### `tester-functional`

1. **Cost.** 196,766 / 87 calls / 13.8 min for 5 new cases (`10-03`:69); 92,249 (`10-06`:68).
   Largest rework item in all records: "functional specs" correction 326,861, which found `FX-042`
   (`10-06`:89-92). Full suite is cheap (128 e2e in 30.6 s, `10-03`:73); cost is reading/writing.
   Re-reads invariants 1–19, `e2e/README.md` (300+ lines) and `playwright-verify` each dispatch.
2. **Inputs.** Specs written before browser encoding was known (`FX-042`): the case did not mark itself
   as dependent on FormData encoding. No marking of which cases are functional-critical.
3. **Quality.** No `getByTestId` or `locator(` in functional specs. Positional `.nth()`/`.first()` at
   `home-dashboard.functional.spec.ts`:186, 410, 417 and `meeting-files.functional.spec.ts`:148-154
   (intentional order assertions, fragile). Single change: a shared helper reading a rendered list as
   an array of text. 28 cases survived the HeroUI migration unmodified (`FACT-3559`).
4. **Long-term.** Accessible names are the contract; no heavy page objects (opinion); small helpers
   (list reader, upload helper); a "browser-dependent" tag on cases.
5. **Remove.** Whole-file invariant reloads → a web-only extract (definition :13 already limits to 9–15
   and 19).

### `tester-security`

1. **Cost.** Never given its own row (`09-28`:26; `10-06`:68 — 157,705 of 368,913). Correctly not
   dispatched in `10-03`. 157,705 in `10-06` produced `SEC-API-11`, which found `FX-041`.
2. **Inputs.** Only `PROTECTED_ROUTES` is mechanically checked (`AR-API-06`,
   `architecture.api.spec.ts`:1033); `PROTECTED_PAGES` (`security.functional.spec.ts`:31) and
   `POST_ROUTES` (`security.api.spec.ts`:58) rely on discipline; `docs/security.md`:31-37 presents all
   three as equivalent. Corpus facts a fixture changes are not named (`FACT-1036`, `10-06`:201).
3. **Quality.** One value in several places drifting (`FX-023`; unchecked lists;
   `accessibility.functional.spec.ts`:20-23 admits `AUDITED_PAGES` shares the weakness). Measurement
   fragility (`FX-011`). Single change: an `AR-API-06`-style check walking `page.tsx` under the session
   gate against `PROTECTED_PAGES` (and `AUDITED_PAGES`), and `@Post(` against `POST_ROUTES`.
4. **Long-term.** Derive or verify every list; three of four are hand-kept. Key the "found in live
   code" items and deliberate gaps in `docs/security.md`:39-67, 110-137 with `FACT-`/`BL-`. Give the
   role its own profiling row.
5. **Remove.** Narrow the dispatch trigger (`tester-security.md`:3) to new route, page, write path or
   response header; dependency bumps are caught by `pnpm audit` (`CH-030`, `CH-032` found by audit,
   not by this role).

### `tester-acceptance` (`FEAT-S7`/`S8`)

1. **Cost.** Before `CH-025`, running `pnpm verify` as a dispatch cost 286,179 / 15.0 min for a
   47–66 s command (`09-28`:28). `FEAT-S7` 89,467 / 5.6 min (`09-28`:29). `10-06`: `S7`+`S8` ≥ 260,934
   in one dispatch (:71). Re-counted test totals by grep (`10-06`:139-152), matching lead's figures.
   The record is 338 lines; ~120 are per-miss narrative (:163-283) already in design §7 and the ledger.
   The control experiment changed outcomes (`09-28`:87) — not waste.
2. **Inputs.** None of the 36 dispatches' tokens/time/calls were handed over (`10-06`:18-35); missing
   `FEAT-G4` total, per-stage time, dispatch count (:159-161); commit hash `pending` (:5); rework share
   "not separable" (README:106) — hand-backs do not say whether a dispatch is post-gate rework.
3. **Quality.** Hand sums wrong: `FX-034`, `FX-027`, designer key count (`10-06`:44-47); an ad-hoc
   `sum-tokens.mjs` not in the repo (:111-112). Stale citation of retired `FACT-3362` failed
   `AR-API-14` (:258-271). Single change: a committed `pnpm profile:sum` over a per-dispatch JSON that
   lead appends at each hand-back.
4. **Long-term.** Machine-readable `runs/<date>-<slug>.data.json`; the three records have different
   column sets (`09-28` has model/calls/cost, `10-06` none). Narrative once, in the ledger/ADR.
5. **Remove.** Shrink per-miss narrative to a table linking `FX-` rows; drop the independent test-count
   recount (`FX-013`: do not compare against stored counts).

## Orchestration

### `lead`

1. **Cost.** A gate re-run over unchanged artifacts after a killed session (`10-03`:35-38, 205-212;
   no inventory ID for that event, :208). Designer resumed ~20 times for 549,941 (`10-06`:60); design,
   test design and plan together 1,502,542 = 4.6× the most expensive code dispatch (:127-130).
   Opinion: a fresh narrow correction dispatch (`team-roles` SKILL.md:122-124) beats resuming.
   Acceptance moved to lead (`CH-025`): 1 min 47 s wall-clock (`10-06`:70). Lead's own cost never
   measured (`10-03`:80-89; `10-06`:76-77) — every total is a floor.
2. **Inputs.** The brief's "Report back" (`team-roles` SKILL.md:112) does not require tokens, calls,
   time — figures exist only in completion notices, and are lower bounds after resumes
   (`10-06`:20-45). No "runs the app: yes/no" field in the plan template (`09-28`:110-113).
3. **Quality.** Recurring: a process change lands in the inventory but not in the role prose agents
   read (`FX-038`, `FX-035`, `FX-034`; `FIX-S7` left on lead with no `Write`, CHANGELOG:84). Lead's
   own errors: acceptance before code review; told a tester to edit product code (`09-28`:110-115).
   Single change: a mechanical check that every stage owner in `docs/process.md` holds the tools the
   stage needs, plus an order check over the dispatch log.
4. **Long-term.** A fixed machine-readable hand-back block (stage, tokens, calls, time, verdict,
   blocker labels) makes the cost table a by-product. A per-stage "Read" list in `docs/process.md` so
   briefs stop drifting (opinion).
5. **Remove.** The "Facts in the corpus" explanation in `lead.md`:54 — keep the gate sentence (:56)
   and a pointer.

## The tuning loop itself

### `pipeline-reviewer` (`TUNE-S1`)

1. **Cost.** The second review copied the first's tables (`reviews/2026-09-30-review.md` §2.1–2.5,
   §3, §12 vs `2026-09-29-review.md` §2, §3, §7) and re-read everything (:20-28) — 742 lines vs 399.
   Round three skipped the review (`plans/2026-09-29-tuning-3.plan.md`:3-9).
2. **Inputs.** Records lack input/output token split, separate first-pass/re-run rows, per-tester
   rows, elapsed wall-clock, cost column (`09-28`); `10-03` has four unmeasured parts; `10-06` no
   agent-time, lower-bound tokens, rework "not separable" (README:94-106). No record exists for any
   tuning round.
3. **Quality.** First review failed formatting (`FX-034`). The two later records have never been
   reviewed.
4. **Long-term (opinion).** Reviews state only what changed since the last one and link the earlier
   one. A script-checked record template. One register of projected figures, to confirm or falsify.
5. **Remove (opinion).** Copying record tables into each review.

### `pipeline-planner` (`TUNE-S2`)

1. **Projected savings vs later records.** Did not deliver: round 4 P1 (narrow re-run ≤ 25% of first
   pass) — `10-03` plan correction 52,781 / 126,239 = 41.8%, test design 40,677 / 97,019 = 41.9%;
   round 2's `FEAT-S9` tripwire (> 300,000) — `10-06` 587,815, the largest dispatch total; round 1's
   300-line design budget — 546 → 422 (`10-03`:195-197). Cannot be judged: round 4 P3 (lead runs
   acceptance) and P6a/P6b (orchestrator row, cost column) — lead row "approximate" (`10-03`) / "not
   available" (`10-06`), no cost column in either; round 1 P1 (elapsed wall-clock) absent from both
   (`10-03`:15, `10-06`:54); round 1 P5 (filtered debug runs) — no record counts full-suite runs; all
   of round 3 — no `FIX` record exists. Delivered: round 1 P2 (first pass and re-run in separate rows,
   `10-03`:61-72).
2. **Inputs.** Before `10-03` every review rested on one record; round 3 had no review
   (`tuning-3`:3-9); round 2's evidence was an owner directive (`tuning-2`:6-8); no review had lead
   per-dispatch tokens, a price figure, or a reading/producing split (`tuning-4`:685-688).
3. **Weight that did not pay.** Test design 587,815 (`10-06`); the generated scenario index caused a
   code-review blocker (`10-03`:126); `FIX-S8`…`FIX-S11` have never run (`CH-025`); P6a/P6b cells never
   filled; the planner's own plans run 428–718 lines (opinion: too long to approve item by item).
4. **Long-term (opinion).** Per-dispatch numbers collected at hand-back by lead (`10-06`:29-35); cap a
   tuning plan at about one page per proposal with one summary table (as `tuning-4`:35-45); a stage
   with no record after two cycles is retired by default; inventory only in `docs/process.md`
   (`ADR-0020`).
5. **Remove.** P6a and P6b — empty two records running, they hide gaps rather than measure them; the
   real fix is lead forwarding numbers at hand-back (`10-06`:320-325). The BACKLOG Rejected row for P5
   (model change pending P6b, line 97) would need updating.

### `pipeline-implementer` (`TUNE-S3`)

1. **Cost.** The expense was propagating one fact to its copies, not the edit: `CH-025` found "eight
   further corrections" (stale "42 tests" in CLAUDE.md and the hook, a restated ten-step list and
   "projected 70–85 minutes" in TEMPLATE.md, archived-audit figures cited live, research-protocol's
   five-files claim). `CH-021` retired `FEAT-S5` in place because deletion would redden `AR-API-10`.
   Meta-tests `AR-API-07`/`08`/`10` were cheap and caught things.
2. **Inputs.** Ambiguity was "where does this live"; round 2 needed a "Collisions, verified" section;
   round 3 offered alternatives and the owner amended at the gate (`CH-022`), so plan text and approved
   text diverged. Opinion: record approval per proposal in the plan file itself.
3. **Quality.** `FX-034` (`CH-019` shipped four self-contradictions incl. `FEAT-S7`/`S8` on `lead`
   with no `Write`); `CH-022` repeated the lead/`Write` error for `FIX-S7`; `CH-025` found process.md
   crediting gates with `FX-031`/`032`/`033` that the ledger attributes elsewhere. Prevention: a check
   that every role in process.md holds the tools its stage needs; validate FX attribution claims
   against "Found by".
4. **Long-term.** Skills + agents + process.md ≈ 272 KB. Largest: feature-pipeline 28.6 KB (420
   lines), regression-verify 15.9, bugfix-pipeline 15.1, process.md 12.7, design-system 12.5,
   team-roles 12.0, playwright-verify 12.0, project-context 10, pipeline-tuning 9.5; 23 agents at
   3–6 KB. Duplication: stage IDs cited in seven skills; verification split across playwright-verify,
   regression-verify and both pipelines; the roles table restated in CLAUDE.md and each agent's
   description; run-economics numbers in three places (`FX-027`). Opinion: a size budget per skill;
   skills as short procedure plus links; a "cited by" check; split feature-pipeline by stage group.
5. **Remove.** feature-pipeline's per-stage rationale and cost narrative with one-record numbers.
