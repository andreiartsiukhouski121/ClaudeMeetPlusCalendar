# Profiling: what each development cycle actually cost

**This directory owns the measurements** (`ADR-0020`). `docs/process.md` owns the stages and their
IDs; every record here cites those IDs, and `AR-API-10` fails a record naming a stage that file does
not define.

It exists because the pipeline is slow and nobody could say where. `feature-pipeline` §10 budgets
the implementation half and states outright that the discovery half **is not measured**; `BL-022`
has asked for that figure since `CH-017`. Impressions are not enough to tune against: the first
fully measured cycle disproved the assumption that discovery was the expensive half, and disproved
it in a direction nobody predicted.

## The protocol

**One record per cycle**, at `runs/<YYYY-MM-DD>-<slug>.md`, written at `FEAT-S8` while the
hand-backs are still in front of you. Reconstructing it later means re-reading a whole transcript,
which is the cost this directory exists to remove.

**Records are append-only.** A run is evidence of what happened, including the parts that went
badly. Correcting a number is fine and should say so; tidying a run into a nicer story destroys the
only thing the file is for.

**What every row carries**: the stage or gate ID, the role, the model, wall-clock, tokens, a cost
figure, tool calls, and the outcome. **Rework is recorded against the stage that was reworked, not
the gate that caught it** — the gate's own cost is its row, and separating the two is what makes
"did this gate pay for itself" answerable.

**A stage re-run after its gate gets two rows under the same ID**, first pass and re-run, rather than
one row combining both — and a stage dispatched to more than one role (`FEAT-S1`'s four sweeps,
`FEAT-S5`'s `tester-api`, `tester-unit`, `tester-security`) gets one row per role. `FEAT-S8` gets a
row of its own. No new stage IDs are minted and none is renumbered for this (`ADR-0020`): the split
is by role and by pass within the same ID.

**The table also carries a row for the orchestrator (`lead`)**, covering work done in its own
context rather than in a dispatch — holding gates, sequencing, and, since the fourth tuning round,
running `FEAT-S6` directly. No sub-agent hand-back reports that cost, so it has to be attributed
separately or it disappears from the record entirely.

**A cost column sits beside tokens**, so a change to a role's model has a unit to be judged against;
without it, tokens are the only figure this directory holds and a cheaper model can never be shown
to have saved anything.

**The cycle also carries one further number: elapsed wall-clock for the whole cycle**, from the first
dispatch to the ledger entry, recorded next to the agent-time total at `FEAT-S8`. The per-stage rows
stay agent-time, summed per dispatch; the elapsed figure is the one number in the record that is not
a sum of the rows above it, because dispatches can run in parallel.

**Discovery and implementation are one split, cited by stage ID rather than restated in prose**:
`FEAT-S1`…`FEAT-G3` are discovery, `FEAT-S4`…`FEAT-S8` are everything after. Every record and
`feature-pipeline` §10 use this same boundary. **This boundary is frozen** — the second tuning round
(`TUNE-S3`, 2026-09-29) added `FEAT-S9`, `FEAT-S10` and `FEAT-S11`, and `discovery` is deliberately
**not** redefined to absorb any of them: the first record's 42.3% / 57.7% split stays comparable with
every future one, which is the whole reason this boundary was fixed by ID in the first place.

**A second, separate figure covers the new stages: "pre-implementation"** —
`FEAT-S1`…`FEAT-G3` **plus `FEAT-S9` and `FEAT-S10`**, i.e. everything that runs before `FEAT-S4`
writes any product code. It **overlaps** `discovery` rather than replacing it: every discovery stage
is also pre-implementation, and `FEAT-S9`/`FEAT-S10` are pre-implementation but not discovery. This
is the number proposal 1 of the second round's tuning plan projected rising to 45–47% — state both
figures in a record, state that they overlap, and treat `discovery` as the frozen one for
cross-record comparability and `pre-implementation` as the one to watch for whether the new stages
are creeping the pipeline back toward `CH-004`'s shape.

**A `FIX` record differs from a `FEAT` one only in which stages it rows, not in the protocol above.**
The Flow field reads `FIX`; the stage rows are whichever of `FIX-S1`…`FIX-S11` the cycle actually ran
— `FIX-S8`-`FIX-S11` only above `bugfix-pipeline` §4's threshold, per `docs/process.md`'s `FIX` table.
Gate yield is written as zero by design, not left blank: the defect flow carries no review gate.

**Record what you actually know.** Sub-agent cost arrives in the hand-back; wall-clock is the
harness's duration; the orchestrator's own row and the cost column are the orchestrator's to
attribute, and it has miscounted its own table before (`FX-034`: dispatches 30 → 29, agent-time 190
against a column summing to 190.5). Where a number is unavailable, the cell says so — an invented
figure is worse than a gap, and `FX-027` is the ledger entry for what a wrong number in a measurement
paragraph costs.

**Four numbers are the point of the exercise**, and every record ends with them:

1. **Discovery vs implementation** — where the spend actually sits.
2. **Rework share** — tokens spent redoing a stage after its gate rejected it, as a percentage of
   the total. This is the number that says whether the gates are placed right.
3. **Gate yield** — how many blockers each gate raised, and whether any of them changed the shape
   rather than the prose.
4. **What found each defect** — the same column the ledger's "Found by" carries, so the two can be
   read together.

## The records

| Run                                                           | Change                                    | Flow   | Total tokens | Agent-time  | Rework share |
| ------------------------------------------------------------- | ----------------------------------------- | ------ | ------------ | ----------- | ------------ |
| [2026-09-28](runs/2026-09-28-meetings-detail-participants.md) | `meetings-detail-participants` (`FT-003`) | `FEAT` | 3,478,421    | 190 min     | **29.3%**    |
| [2026-10-03](runs/2026-10-03-design-language-rollout.md)      | `design-language-rollout` (`FT-006`)      | `FEAT` | 1,584,001\*  | 115.7 min\* | 31.8%\*      |

\* Interrupted and resumed across two days; `FEAT-S1`, `FEAT-G1`, the first `FEAT-S2` pass and
`lead`'s own orchestration/`FEAT-S6` cost are unmeasured (hand-backs lost or never produced) and are
**not** in this total. Read the record before comparing this row with the one above it.

## What the records have shown so far

One cycle is not a trend, and nothing here should be treated as one. Stated as observations rather
than conclusions:

- **The implementation half cost more than discovery, not less** — 2.01M against 1.47M. The
  assumption baked into `feature-pipeline` §10, that the implementation half is the measured and
  predictable one, does not match the first measurement of both.
- **Rework after a gate was 29.3% of the whole run.** Every one of the four gates returned
  `accept after blockers`, and every rejected stage was re-run.
- **Product code was 83k tokens — 2.4% of the total.** The rest is discovery, tests, checks and the
  checking of checks.
- **The tests stage (`FEAT-S5`) was the single largest line at 1.15M**, larger than the entire
  discovery half. It also contained the only defect found by running rather than by reading.
