# Run 2026-09-28 — `meetings-detail-participants`

- **Flow:** `FEAT` · **Ledger:** `FT-003`, `FX-031`, `FX-032`, `FX-033`, `BL-024`, `BL-025`
- **Commit:** `48d9256` · **Decisions taken:** `ADR-0017`, `ADR-0018`, `ADR-0019`
- **Shipped:** `participants: string[]` on the meeting; `GET /meetings/:id` answering 404 identically
  for an unknown id and another owner's; two documentation defects fixed in scope.
- **Recorded at:** `FEAT-S8`, from the agents' own hand-backs.

Reading note: this is the **first** cycle measured end to end, and the first to run all nine stages.
Nothing here is a trend.

## Per stage

Wall-clock is the harness's duration per dispatch, summed. It is **agent-time, not elapsed time** —
two pairs ran in parallel, so the clock on the wall was lower.

| ID        | Stage / gate    | Role                               | Model    | Dispatches | Tokens        | Calls | Agent-time  | Outcome                          |
| --------- | --------------- | ---------------------------------- | -------- | ---------- | ------------- | ----- | ----------- | -------------------------------- |
| `FEAT-S1` | Research        | `researcher` + 4 sweeps            | mixed    | 2          | 303,500       | 92    | 16.0 min    | accepted after `FEAT-G1`         |
| `FEAT-G1` | Research review | `research-reviewer`                | `opus`   | 1          | 158,585       | 68    | 8.2 min     | **accept after blockers** (2)    |
| `FEAT-S2` | Design          | `designer`                         | `opus`   | 2          | 428,268       | 90    | 21.7 min    | accepted after `FEAT-G2`         |
| `FEAT-G2` | Design review   | `design-reviewer`                  | `opus`   | 1          | 151,795       | 45    | 8.0 min     | **accept after blockers** (2)    |
| `FEAT-S3` | Plan            | `planner`                          | `opus`   | 2          | 304,155       | 116   | 29.3 min    | accepted after `FEAT-G3`         |
| `FEAT-G3` | Plan review     | `plan-reviewer`                    | `opus`   | 1          | 126,135       | 33    | 6.1 min     | **accept after blockers** (2)    |
| `FEAT-S4` | Implementation  | `implementer-api`, `-web`          | `sonnet` | 5          | 324,046       | 77    | 8.7 min     | green                            |
| `FEAT-S5` | Tests per level | `tester-api`, `-unit`, `-security` | mixed    | 11         | 1,146,931     | 336   | 66.1 min    | green; found `FX-033`            |
| `FEAT-G4` | Code review     | `code-reviewer`                    | `opus`   | 1          | 159,360       | 45    | 5.8 min     | **accept after blockers** (2)    |
| `FEAT-S6` | Acceptance      | `tester-acceptance`                | `sonnet` | 2          | 286,179       | 67    | 15.0 min    | one green `pnpm verify`          |
| `FEAT-S7` | Ledger          | `tester-acceptance`                | `sonnet` | 1          | 89,467        | 25    | 5.6 min     | 5 rows, `pnpm e2e e2e/ledger` ok |
| **Total** |                 | 21 distinct agents                 |          | **30**     | **3,478,421** | 994   | **190 min** |                                  |

`FEAT-S8` (this record) was written by the orchestrator and is not separately measured.

## The four numbers

### 1. Discovery vs implementation

| Half                                    | Tokens    | Share |
| --------------------------------------- | --------- | ----- |
| Discovery + its three gates (`S1`-`G3`) | 1,472,438 | 42.3% |
| Implementation onward (`S4`-`S7`)       | 2,005,983 | 57.7% |

The pipeline's own budget (`feature-pipeline` §10) treats the implementation half as the known,
bounded one and says the discovery half is unmeasured. The first measurement of both puts the larger
number on the side that was assumed to be predictable.

**Product code was 83,098 tokens — 2.4% of the run.** One agent, two minutes, six files.

### 2. Rework share — 1,018,067 tokens, 29.3% of the run

| Reworked stage        | Caught by | Rework tokens | What was wrong                                                                                                         |
| --------------------- | --------- | ------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `FEAT-S1`             | `FEAT-G1` | 183,652       | a "no case asserts a 404" claim that was false; a cluster of bad `path:line` pointers                                  |
| `FEAT-S2`             | `FEAT-G2` | 257,359       | a mechanical guarantee claimed for a check that does not perform it; a functional spec ordered for a change with no UI |
| `FEAT-S3`             | `FEAT-G3` | 169,549       | a DoD unreachable at its own commit; an incomplete "same commit" set                                                   |
| `FEAT-S5`/`S6`/corpus | `FEAT-G4` | 407,507       | a cases doc describing the inverse of its own check; a corpus sentence this change's own fix invalidated               |

**Every gate returned `accept after blockers`. Not one passed clean.** Two readings, and this run
cannot distinguish them: the gates are catching real defects that would otherwise ship, or the
stages before them are being run too loosely because a gate is known to follow.

### 3. Gate yield

| Gate      | Blockers | Changed the shape? | Notable                                                                        |
| --------- | -------- | ------------------ | ------------------------------------------------------------------------------ |
| `FEAT-G1` | 2        | yes — one          | found two security cases the sweep never opened; they constrained the 404 body |
| `FEAT-G2` | 2        | yes — one          | found the seed-mirror guarantee was vacuous; the fix made it real              |
| `FEAT-G3` | 2        | no                 | both were commit-ordering errors; cheap to fix, expensive to discover later    |
| `FEAT-G4` | 2        | no                 | both prose; the code was correct on every point pressed                        |

`FEAT-G4` also found a **fifth copy site** in the service that the plan had not named and the
implementer had added correctly on its own.

### 4. What found each defect

| Defect   | Found by                       | Would a diff review have found it?               |
| -------- | ------------------------------ | ------------------------------------------------ |
| `FX-031` | `FEAT-S1` research sweep       | no — the drift was in a document nothing checked |
| `FX-032` | `FEAT-S1` research sweep       | no — same                                        |
| `FX-033` | running the suite at `FEAT-S5` | no — a race, invisible statically                |

Nine control experiments were run by the roles that owned each artifact. Three caught something a
code review could not have: a unit test that was a false positive against the bug it targeted, a new
check whose own documentation polluted the set it scanned, and a `pnpm test:<feature>` script that
exits 0 with zero tests run.

## Where the time actually went

`FEAT-S5` at 66 minutes is the largest single line — **larger than the entire discovery half**. Of
that, 24 minutes was `FX-033`: a defect this change created in the existing suite by becoming the
second spec file to mutate a shared sandbox, then reproduced, fixed and verified across twelve full
suite runs.

`FEAT-S3` at 29 minutes is the second largest, for a 150-line document. `CH-004` recorded 100
minutes of planning against 85 of code and was the reason the pipeline was rewritten; the ratio here
is better, but the absolute number is not small.

## Observations for `TUNE-S1`

Recorded as facts, not as recommendations — proposing changes is `TUNE-S2`'s job.

- Four gates, four `accept after blockers`, zero clean passes.
- Two of the eight blockers changed the shape of the work; six were corrections to documents.
- Rework is the second-largest cost centre in the run, after the tests stage.
- The orchestrator made two process errors that no gate caught, both in the transcript: acceptance
  was run **before** the code review, contrary to `docs/process.md`'s order; and four tasks were
  nearly dispatched in parallel on the strength of a plan line that was true about files and false
  about server runs.
- One agent refused an instruction from the orchestrator to touch product code for a control
  experiment, citing its role boundary. The refusal was correct; the instruction was not.
