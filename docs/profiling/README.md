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

**What every row carries**: the stage or gate ID, the role, the model, wall-clock, tokens, tool
calls, and the outcome. **Rework is recorded against the stage that was reworked, not the gate that
caught it** — the gate's own cost is its row, and separating the two is what makes "did this gate
pay for itself" answerable.

**Record what you actually know.** Sub-agent cost arrives in the hand-back; wall-clock is the
harness's duration. Where a number is unavailable, the cell says so — an invented figure is worse
than a gap, and `FX-027` is the ledger entry for what a wrong number in a measurement paragraph
costs.

**Four numbers are the point of the exercise**, and every record ends with them:

1. **Discovery vs implementation** — where the spend actually sits.
2. **Rework share** — tokens spent redoing a stage after its gate rejected it, as a percentage of
   the total. This is the number that says whether the gates are placed right.
3. **Gate yield** — how many blockers each gate raised, and whether any of them changed the shape
   rather than the prose.
4. **What found each defect** — the same column the ledger's "Found by" carries, so the two can be
   read together.

## The records

| Run                                                           | Change                                    | Flow   | Total tokens | Agent-time | Rework share |
| ------------------------------------------------------------- | ----------------------------------------- | ------ | ------------ | ---------- | ------------ |
| [2026-09-28](runs/2026-09-28-meetings-detail-participants.md) | `meetings-detail-participants` (`FT-003`) | `FEAT` | 3,478,421    | 190 min    | **29.3%**    |

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
