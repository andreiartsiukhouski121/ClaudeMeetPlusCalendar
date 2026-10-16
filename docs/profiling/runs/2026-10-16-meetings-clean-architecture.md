# Run 2026-10-16 — `meetings-clean-architecture`

- **Flow:** `FEAT` · **Ledger:** `FT-009`; `BL-050` closed, `BL-061` and `BL-062` opened, `BL-058` extended
- **Change folder:** `docs/plans/meetings-clean-architecture/`
- **Commit:** `pending` (an uncommitted working-tree diff at the time of this record)
- **Decisions taken:** `ADR-0035` (the style record for ports and adapters, module-agnostic) — **proposed, not accepted**; plan task T7b (status flip, eight `ADR-0034` retirements, a second `pnpm verify`) waits for the owner
- **Shipped:** `meetings` in `apps/api` moved to `domain/` + `application/` + `infrastructure/`; a pure refactor with no HTTP contract change. The shared kernel `apps/api/src/shared/` now holds `Clock`, `UuidSource` and their adapters, moved out of `meeting-files`. New: `HD-UT-17`…`21`, `AR-API-19`.
- **Path:** **the first trimmed-path run.** By the owner's choice of 2026-10-15 the research (`FEAT-S1`) and its gate (`FEAT-G1`) and the design review (`FEAT-G2`) were skipped; `FEAT-S2` ran only for the style ADR the owner ordered on 2026-10-16. The change folder carries minimal research and design files written by the planner.
- **Recorded at:** `FEAT-S8`, from the dispatch log `lead` kept; nothing was read from transcripts.

## Reading note

First dispatch 2026-10-15 16:18; paused 16:36 for four plan questions that needed the owner (`Q1`…`Q4`;
the answer to `Q1` ordered the style ADR, so `FEAT-S2` ran and the plan was re-run); resumed 2026-10-16
12:30; first `FEAT-S7` dispatch (#11) about 12:58; the `FT-009` dispatch (#19) about 13:25; the green
`FEAT-S6` run about 13:38.

**Elapsed wall-clock is not a clean figure.** First dispatch to green verify is about 21 h 20 min on the
calendar, which is mostly the overnight pause. Working time is about **86 min** (18 min before the pause,
about 68 min from the resume to the green run), and the ledger and this record come after that. Agent-time
below is the sum of per-dispatch durations: **4,346 s = 72.4 min** over 20 dispatches; some ran in parallel
(#7 with #8, #10 with #9 and #11, #12 with #13, #15 with #16), so it exceeds the elapsed time of those
stretches. No agent was resumed: every gate was answered by a fresh dispatch.

**What is not in the totals**, stated rather than estimated:

- Dispatch 21 (`FEAT-S7`/`FEAT-S8`): 83,619 tokens, 18 calls, 270 s, as reported by the lead after the
  dispatch; it is counted in the addendum below, not in the #1-#20 totals of this section.
- `FEAT-S6`: `lead`'s own runs, no token figure. Three runs: 83 s, 111 s, 123 s.
- `lead`'s own orchestration work.

## Per stage

`#` is the dispatch number in `lead`'s log. Plan tasks with no stage ID of their own sit under the nearest
defined stage: T8 (the owner-approved skill and agent edit, a pipeline change) and its nit correction under
`FEAT-S4`, as in the pilot record; T9 (backlog rows and rewording) under `FEAT-S7`; the `FT-009` row and the
`AR-API-14` fix under `FEAT-S7`.

| ID                  | Pass                                        | #   | Role / model                  | Tokens  | Calls | Seconds        | Outcome                                                                       |
| ------------------- | ------------------------------------------- | --- | ----------------------------- | ------- | ----- | -------------- | ----------------------------------------------------------------------------- |
| `FEAT-S3`           | first                                       | 1   | planner / opus                | 141,955 | 41    | 517            | scaffold, minimal research and design files, the plan                         |
| `FEAT-G3`           | first                                       | 2   | plan-reviewer / opus          | 115,096 | 46    | 260            | accept-after-blockers: 3 correction                                           |
| `FEAT-S3`           | correction                                  | 3   | planner / opus                | 61,421  | 14    | 118            | rework; then the pause for the owner (`Q1`…`Q4`)                              |
| `FEAT-S2`           | first (the style ADR `ADR-0035`)            | 4   | designer / opus               | 96,506  | 19    | 402            | ordered by the owner's `Q1` answer                                            |
| `FEAT-S3`           | re-run (delta for the owner's answers)      | 5   | planner / opus                | 99,896  | 22    | 462            | new work, not rework                                                          |
| `FEAT-G3`           | re-run                                      | 6   | plan-reviewer / opus          | 109,599 | 38    | 331            | accept-after-blockers: 3 correction                                           |
| `FEAT-S2`           | correction (ADR blockers)                   | 7   | designer / opus               | 43,573  | 4     | 54             | rework; parallel with #8                                                      |
| `FEAT-S3`           | correction (plan blockers, T7a/T7b)         | 8   | planner / opus                | 75,094  | 11    | 207            | rework; the lead's T7a/T7b split; parallel with #7                            |
| `FEAT-S9`           | first (T1)                                  | 9   | test-designer / opus          | 153,519 | 40    | 525            |                                                                               |
| `FEAT-S4`           | first (T8, pipeline edit)                   | 10  | pipeline-implementer / sonnet | 54,483  | 7     | 31             | owner-approved skill and agent edit; parallel with #9, #11                    |
| `FEAT-S7`           | first (T9, backlog rows and rewording)      | 11  | tester-acceptance / sonnet    | 54,766  | 13    | 55             | before T7a                                                                    |
| `FEAT-S10`          | first, units (T2, red)                      | 12  | tester-unit / sonnet          | 50,933  | 7     | 37             | parallel with #13                                                             |
| `FEAT-S10`          | first, api (T2b, red)                       | 13  | tester-api / sonnet           | 58,799  | 18    | 139            |                                                                               |
| `FEAT-S4`           | first (T3a–T7a)                             | 14  | implementer-api / sonnet      | 155,679 | 51    | 497            | product code                                                                  |
| `FEAT-S10`          | correction (lint error once entity existed) | 15  | tester-unit / sonnet          | 38,696  | 4     | 25             | counted as a correction here; `lead`'s rework set omits it; parallel with #16 |
| `FEAT-G4`           | first                                       | 16  | code-reviewer / opus          | 210,392 | 99    | 485            | accept-after-blockers: 4 correction                                           |
| `FEAT-S4`           | correction (review blockers 1, 2, 4)        | 17  | implementer-api / sonnet      | 50,819  | 18    | 86             | rework, product code                                                          |
| `FEAT-S4`           | correction (skill nit)                      | 18  | pipeline-implementer / sonnet | 38,070  | 5     | 14             | rework                                                                        |
| `FEAT-S7`           | first (the `FT-009` row)                    | 19  | tester-acceptance / sonnet    | 49,501  | 8     | 60             | before verify, for the ledger's dangling-reference check                      |
| `FEAT-S7`           | correction (verify run 1, `AR-API-14`)      | 20  | tester-acceptance / sonnet    | 39,003  | 7     | 41             | rework after acceptance run 1                                                 |
| `FEAT-S6`           | verify runs 1, 2, 3                         | —   | lead                          | n/a     | n/a   | 83 / 111 / 123 | red (`AR-API-14`), red (`AL-FN-02`, `BL-058`), **green**                      |
| `FEAT-S7`/`FEAT-S8` | control experiment, ledger, this record     | 21  | tester-acceptance / sonnet    | 83,619  | 18    | 270            | figures from the lead's hand-back; see the addendum                           |

## Per-stage totals, summed by script

20 measured dispatches (#1–#20): **1,697,800 tokens, 472 tool calls, 4,346 s**, which agrees exactly with
`lead`'s sums.

| Stage      | Tokens  | Calls | Seconds |
| ---------- | ------- | ----- | ------- |
| `FEAT-S2`  | 140,079 | 23    | 456     |
| `FEAT-S3`  | 378,366 | 88    | 1,304   |
| `FEAT-G3`  | 224,695 | 84    | 591     |
| `FEAT-S9`  | 153,519 | 40    | 525     |
| `FEAT-S10` | 148,428 | 29    | 201     |
| `FEAT-S4`  | 299,051 | 81    | 628     |
| `FEAT-G4`  | 210,392 | 99    | 485     |
| `FEAT-S7`  | 143,270 | 28    | 156     |

`FEAT-S1`, `FEAT-G1`, `FEAT-G2` and `FEAT-S11` did not run: no rows.

## The four numbers

1. **Discovery vs implementation.** Discovery (`FEAT-S1`…`FEAT-G3`, the frozen boundary, the same
   definition the pilot record uses): **743,140 tokens, 43.8%**. Pre-implementation (discovery plus
   `FEAT-S9` and `FEAT-S10`): **1,045,087, 61.6%**; the two figures overlap. The remainder (`FEAT-S4`,
   `FEAT-G4`, `FEAT-S7`): **652,713, 38.4%**. Product code (#14, #17) is **206,498, 12.2%** of the total;
   `FEAT-S4` as a stage is larger (299,051) because it carries the T8 pipeline edit (#10, #18: 92,553).
2. **Rework share.** Dispatches #3, #7, #8, #17, #18 and #20 (the set `lead` counted): **307,980 tokens,
   18.1%** of 1,697,800. Judgement calls, shown so the figure is not read as cleaner than it is: #15
   (38,696, a lint error surfaced once the entity existed) is a correction but not in `lead`'s set; counting
   it gives 346,676, 20.4%. The pilot record counted a gate re-run as rework; #6 (109,599) is the same kind
   of dispatch here, and counting it too gives 456,275, 26.9% (the pilot's own 25.3% counted its #4). #5
   (99,896) is not counted: it is the plan's delta for the owner's answers, new work rather than a redo.
   #20 was a correction after acceptance run 1, not after a review gate.
3. **Gate yield.** `FEAT-G3` 3 correction blockers on the first pass and 3 on the re-run; `FEAT-G4` 4
   correction blockers (blocker 3 was answered by the reviewer's fallback, the paraphrase kept and named,
   and the `AR-API-14` defect it exposed filed as `BL-062`). 10 blockers over three gate passes, none a
   change of shape. Both gates returned accept-after-blockers on their first pass. Gate cost: 435,087
   tokens (#2, #6, #16), **25.6%** of the total. No verdict-file reading was done for this record; the
   counts are from `lead`'s notes.
4. **What found each defect.** No defect shipped, so no `FX-`. What caught what:
   - `FEAT-G3` (both passes): the plan blockers, the second pass after the owner's answers.
   - `FEAT-G4`: four correction blockers, one of which exposed `BL-062`.
   - `FEAT-S10` (#15): a lint error that appeared only once the entity existed.
   - `FEAT-S6` run 1: `AR-API-14`, the new `BL-062` and `FT-009` rows citing a retired key.
   - `FEAT-S6` run 2: `AL-FN-02`, a web-project flake of the `BL-058` class, not a defect of this change.
   - The control experiment (dispatch 21): found nothing unexercised; every break went red.

## Against the pilot record

The pilot is [`2026-10-14-clean-architecture-pilot.md`](2026-10-14-clean-architecture-pilot.md):
**2,975,954 tokens over 38 measured dispatches**, discovery **55.9%**, rework **25.3%** (`lead`'s set).

| Figure                      | Pilot (`FT-008`)                                  | This run (`FT-009`)        |
| --------------------------- | ------------------------------------------------- | -------------------------- |
| Total tokens                | 2,975,954                                         | 1,697,800 (57.1% of pilot) |
| Measured dispatches         | 38                                                | 20                         |
| Tool calls                  | 782                                               | 472                        |
| Agent-time                  | 110.0 min                                         | 72.4 min                   |
| Discovery share (frozen)    | 55.9%                                             | 43.8%                      |
| Pre-implementation share    | 72.4% (pilot's first pass)                        | 61.6%                      |
| Rework share (`lead`'s set) | 25.3%                                             | 18.1%                      |
| `FEAT-S6` runs to green     | 4 first cycle, 2 more after the owner's decisions | 3                          |

**What is comparable.** The discovery boundary is the same by stage ID; the rework set is built the same
way (`lead`'s count, gate re-run and judgement calls stated). Both are pure refactors of one module with no
contract change.

**What is not.**

- The pilot's discovery share was taken on its **first pass** (2,380,522 tokens), before its addendum
  added 595,432 more; its 55.9% is therefore not a share of the 2,975,954 total. This run's shares are of
  its full total.
- The pilot ran the full path (research, design, both reviews); this run skipped three discovery stages by
  the owner's choice, so a lower discovery share is the expected shape and says nothing yet about whether the
  trimmed path is better. Whether it was cheaper is confounded by what the pilot paid first: the pilot
  created the layout, the skill and `ADR-0034`; this run reused them.
- This run also carried work the pilot did not: an unplanned style ADR (`ADR-0035`, #4 and #7, 140,079
  tokens) ordered by the owner, and the shared-kernel move of `Clock` and `UuidSource`. Both inflate this
  run's totals relative to a plain second migration.
- The pilot had a research stage, so its first `FEAT-G1` caught a shape blocker; this run has no equivalent
  early gate, and its four plan questions needed the owner, which paused the run overnight. Wall-clock
  includes that pause; agent-time does not.
- Neither record is complete: both exclude `lead`'s orchestration and `FEAT-S6` token cost.

## Acceptance numbers

`pnpm verify` run 3 of 2026-10-16: exit 0 in 123 s on fresh servers; orientation 12 plans; units api 43 /
web 17; api boot 1/1; prettier clean; **173 e2e passed**; audit passed (1 high ignored by config, 2
moderate). Three runs to get there: run 1 red on `AR-API-14` (a defect of the ledger text, fixed by naming
the retired key), run 2 red on `AL-FN-02` (the `BL-058` flake, recurrence noted in the backlog row). The
control experiment of this dispatch: each of `HD-UT-17`…`20` and `AR-API-18`/`19` went red alone and was
reverted byte-identical.

## Observations, as facts rather than proposals

- The trimmed path ran with one plan-review gate and one code-review gate. The plan gate was re-run once, only because the owner's answers changed the plan.
- Four plan questions needing the owner paused the run for about 20 hours; the cost was calendar time, not tokens.
- Product code was 12.2% of the cycle; documents, tests and the checks on them were the rest.
- One of three suite runs was lost to a ledger-text defect (`AR-API-14`, `BL-062`), one to the web flake (`BL-058`, a second occurrence in a different cycle).
- `FEAT-G4` blocker 3 was closed by the reviewer's fallback, not by a fix: the paraphrase stays and is named in `FT-009`.
- Not exercised in the cycle: the interactive browser check (no `apps/web` change).

## Addendum — T7b and the closing runs (2026-10-16)

After the first green verify the owner accepted `ADR-0035`, accepted its three added points, widened the
allow-list (`application/` may import `src/shared/domain/`) and fixed the register-row defect that
`pnpm verify` run 4 exposed, as `FX-051`. That work is the owner's and the orchestrator's and is **not
counted here**. Plan task T7b then ran as five parallel dispatches on disjoint files. The figures for #21–#26
are the lead's dispatch log; #27 (this dispatch) is reported by the lead in the hand-back.

| #   | Stage               | Role                 | Model  | Pass             | Tokens                                | Calls | Seconds   | Note                                                      |
| --- | ------------------- | -------------------- | ------ | ---------------- | ------------------------------------- | ----- | --------- | --------------------------------------------------------- |
| 21  | `FEAT-S7`/`FEAT-S8` | tester-acceptance    | sonnet | first            | 83,619                                | 18    | 270       | control experiment, `FT-009` fill, the record             |
| 22  | `FEAT-S4`           | implementer-api      | sonnet | first (T7b)      | 69,819                                | 13    | 85        | `ADR-0035` accepted, 8 retirements, allow-list fact, lock |
| 23  | `FEAT-S10`          | tester-api           | sonnet | first (T7b)      | 53,305                                | 10    | 95        | resolver, fixture 17/9, re-points                         |
| 24  | `FEAT-S9`           | test-designer        | opus   | correction (T7b) | 65,242                                | 9     | 174       | `AR-API-18` text, re-points                               |
| 25  | `FEAT-S4`           | pipeline-implementer | sonnet | first (T7b)      | 39,707                                | 7     | 23        | skill                                                     |
| 26  | `FEAT-S7`           | tester-acceptance    | sonnet | first (T7b)      | 44,008                                | 6     | 42        | ledger re-points, `FT-009` update                         |
| —   | `FEAT-S6`           | lead                 | opus   | runs 4–5         | n/a                                   | n/a   | 114 / 117 | red (the `FX-051` register row), **green**                |
| 27  | `FEAT-S7`/`FEAT-S8` | tester-acceptance    | sonnet | first            | reported by the lead in the hand-back |       |           | this dispatch                                             |

**Totals #1–#26: 2,053,500 tokens, 535 tool calls, 5,035 s (83.9 min), 26 dispatches.** #21–#26 add 355,700
tokens, 63 calls and 689 s to the 1,697,800 / 472 / 4,346 of #1–#20. The brief for this addendum gave 553
calls; the sum of the per-dispatch call counts above is 535 (472 + 63), and 535 is used here.

### Five `pnpm verify` runs, three red and two green

1. Run 1, red (83 s): `AR-API-14`, the `BL-062` and `FT-009` rows named a fact retired in the same change by its key.
2. Run 2, red (111 s): `AL-FN-02`, a web-project flake of the `BL-058` class, no `apps/web` file touched.
3. Run 3, **green** (123 s): the first green, before the owner's decisions.
4. Run 4, red (114 s): `AR-API-14` again, on the `FX-051` row, which named the retired 404-resolution fact by its key.
5. Run 5, **green** (117 s): 173 e2e passed, units api 43 / web 17, audit passed; the closing run.

### The numbers over the whole cycle (same definitions as above)

| Figure                            | Pilot (`FT-008`, with its addendum)        | This run before T7b (#1–#20) | This run with T7b (#1–#26)         |
| --------------------------------- | ------------------------------------------ | ---------------------------- | ---------------------------------- |
| Total tokens                      | 2,975,954                                  | 1,697,800                    | 2,053,500 (69.0% of pilot)         |
| Measured dispatches               | 38                                         | 20                           | 26                                 |
| Tool calls                        | 782                                        | 472                          | 535                                |
| Agent-time                        | 110.0 min                                  | 72.4 min                     | 83.9 min                           |
| Discovery share (frozen)          | 55.9% (of its first pass, 2,380,522)       | 43.8%                        | **36.2%** (743,140)                |
| Pre-implementation share          | 72.4% (first pass)                         | 61.6%                        | 50.9% (1,045,087)                  |
| Product code share                | 7.6% (181,889, #15, #22 of its first pass) | 12.2% (206,498)              | **13.5%** (276,317, #14, #17, #22) |
| Rework share (`lead`'s set + #24) | 25.3%                                      | 18.1% (307,980)              | **18.2%** (373,222)                |
| Gate cost (#2, #6, #16)           | 27.7%                                      | 25.6%                        | 21.2% (435,087)                    |

Judgement calls, stated as before: the rework set is the earlier six (#3, #7, #8, #17, #18, #20) plus #24, the
one T7b dispatch labelled a correction. Adding #15 gives 411,918 (20.1%); adding the gate re-run #6 as well
gives 521,517 (25.4%), which is the figure comparable to the pilot's own 25.3%. #22 is counted as product code
because the dispatch is `implementer-api`, although most of its edits were corpus and lock text rather than
`apps/api` source; read the 13.5% as an upper bound.

**Comparability.** The pilot's totals **do include** its own post-acceptance work: its addendum of 2026-10-15
added plan task T7, a re-run of the code review and a second `pnpm verify` (595,432 tokens, taking it from
2,380,522 to 2,975,954). T7b is the analogue of that, so the like-for-like comparison is the right-hand
column against the pilot's total: 69.0% of the tokens, 26 dispatches against 38. The pilot's discovery share
of 55.9% was taken on its first pass only, so the like-for-like comparison for it is this run's pre-T7b
43.8%; the 36.2% is a share of a total that includes the T7b work and is not set beside 55.9%. T7b cost
355,700 tokens (17.3% of the cycle), a smaller addendum than the pilot's 595,432 (20.0% of its total); the
owner's own decision work between the first green run (about 13:38) and the T7b dispatch (about 14:50) is not
a dispatch and is in neither figure.

**Wall-clock.** T7b was dispatched about 14:50 and run 5 went green about 15:10 on 2026-10-16: about 20
minutes. Working time for the cycle is the earlier 86 min plus those 20, about 106 min, excluding the owner's
interval before T7b and the overnight pause.

**Observations, as facts.** Two of the three red runs are the same check on different rows (`AR-API-14`, runs 1
and 4), both a ledger or register row naming a retired fact by its key; the run-4 case was fixed by the
owner's `FX-051`, not inside this cycle's dispatches. T7b's five dispatches ran on disjoint files and finished
inside the 20 minutes, the longest being #24 at 174 s.
