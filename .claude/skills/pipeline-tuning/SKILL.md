---
name: pipeline-tuning
description: Changing the development pipeline itself from measured evidence — review the profiling records, propose numbered changes, get the owner's approval, implement only what was approved. Use when the process feels slow, when a profiling record is written, when asked to "optimize the pipeline", "why does this take so long", "tune the process", or before adding any stage, gate or role.
---

The pipeline is a thing this repository builds, and like anything else it gets changed from evidence
rather than from impressions. This skill is that loop: three stages and one human gate, listed as
`TUNE-S1`…`TUNE-S3` and `TUNE-G1` in [`docs/process.md`](../../../docs/process.md).

It exists because of a specific failure. `CH-004` records a process that had grown heavier than the
work it guarded — 100 minutes of planning against 85 of code — and nobody noticed until it was
measured. `ADR-0016` then rebuilt the flow, and `BL-022` asked for the measurement that would tell
whether the rebuild helped. `ADR-0020` created `docs/profiling/`, and this skill is what reads it.

## The three roles, and why they are separate agents

| Stage     | Role                   | Does                                           | Must not                              |
| --------- | ---------------------- | ---------------------------------------------- | ------------------------------------- |
| `TUNE-S1` | `pipeline-reviewer`    | gathers what the records and artifacts say     | conclude, recommend, propose, or edit |
| `TUNE-S2` | `pipeline-planner`     | turns observations into numbered proposals     | implement, or re-gather evidence      |
| `TUNE-G1` | the repository owner   | approves, rejects or amends each proposal      | be simulated by an agent              |
| `TUNE-S3` | `pipeline-implementer` | applies the approved proposals, and only those | design, add, improve, or re-scope     |

**The split between S1 and S2 is the whole point.** A reviewer that also recommends delivers its
evidence pre-wrapped in a conclusion, and the conclusion is what gets read. The research stage learnt
this first: `research-protocol`'s evidence rule exists because a sweep that quietly designs makes the
design unreviewable. `TUNE-S1` inherits that rule exactly.

## `TUNE-S1` — review: evidence only

By `pipeline-reviewer`. **Record only what is in the records and the artifacts, never what you
concluded from it.** Every statement carries a citation: a profiling record and its row, a stage ID
from `docs/process.md`, a ledger ID, an ADR, a line in a skill or an agent definition, a commit.

What it reads: `docs/profiling/runs/**` first, then `docs/process.md`, the pipeline skills, the agent
definitions in `.claude/agents/`, `docs/CHANGELOG.md`'s `CH-` entries and `docs/BACKLOG.md`'s process
rows — including the **Rejected** section, so a proposal already turned down is not revived without
knowing it was.

What it produces: observations, open questions, and `Not found` lines. "Nothing measures X" is a
finding, and usually the most valuable one. Anything uncitable is an open question, not a hunch
stated softly.

**Forbidden phrasings**, because they are conclusions wearing an observation's clothes: "this
suggests", "the gate is too expensive", "we should", "it would be better if". The correct form is
`FEAT-G3` cost 126,135 tokens and raised two blockers, both commit-ordering errors — with a
citation, and nothing after it.

**One record is not a trend**, and the review says so whenever it has only one. A change made on a
single observation is a guess with a table attached.

## `TUNE-S2` — the plan: numbered proposals with expected savings

By `pipeline-planner`, from the accepted review. Each proposal carries:

1. **What changes**, precisely enough to check afterwards — which file, which stage ID, which role.
2. **The evidence it rests on**, cited to the review, not re-gathered.
3. **The expected effect**, as a number where the records support one. "Saves roughly the 169,549
   tokens `FEAT-S3` spent on rework" is a claim the next record can falsify; "speeds up planning" is
   not.
4. **What it costs or risks** — including what stops being caught. A proposal that removes a gate
   says what that gate found.
5. **How the next run will show whether it worked**, in terms of a number in the profiling record.

**Proposals are separable.** The owner approves them one at a time, so a plan whose items only work
as a bundle has to say so and justify it.

**The bias to state out loud:** the cheapest change to propose is always "add a step", and that is
how `CH-004` happened. A proposal that adds a stage, a gate, a document or a role carries the
argument for why the thing it prevents is worth its cost on **every** future change, not just the one
that prompted it.

## `TUNE-G1` — the owner's approval

**A human gate. It is never simulated, inferred, or read off a previous message.** An agent may not
approve a pipeline change, and neither may the orchestrator on the owner's behalf.

The plan is presented as a list the owner can answer item by item. Approval is explicit and per
proposal; silence is not approval, and "sounds good" about the plan as a whole should be confirmed
against the list before anything is implemented.

The reason this gate is human and the other four are not: a pipeline change alters how every later
change is built, and its cost is paid by work that does not exist yet. That is a judgement about
priorities, which is the owner's, not a judgement about correctness, which an agent can make.

## `TUNE-S3` — implementation: the approved items, and nothing else

By `pipeline-implementer`. It applies exactly the approved proposals. **Anything it notices but was
not approved is reported, not done** — including obvious improvements, and especially those, because
an implementer that improves as it goes makes `TUNE-G1` meaningless.

Where the edits land, and what each owns:

- `docs/process.md` — the stage and gate inventory (`ADR-0020`). **The only home.** A stage table in
  a skill is drift.
- the pipeline skills — the procedure for a stage, and the reasons behind it.
- `.claude/agents/*.md` — a role's tools and model. **Tools are the boundary, not prose**
  (`ADR-0014`): a rule an agent can ignore in its prompt belongs in its tool list instead.
- `docs/profiling/` — the protocol. Existing **records are append-only** and are not rewritten to
  match a new format.

**Mechanical gates a pipeline change trips**, all of which fail `pnpm verify`:

- `AR-API-07`/`AR-API-08` compare `.claude/agents/*.md` against the roles table in the `team-roles`
  skill **in both directions** — a new agent without a row, or a row without a file, is red.
- `AR-API-10` checks every stage ID cited in `docs/profiling/**` exists in `docs/process.md`.
- `PR-API-01`…`PR-API-06` hold the plan templates and the change-folder shape; a stage change that
  touches what a template asks for touches these too.
- `pnpm check:orientation` reads section 0 of every plan and runs in the pre-commit hook.

## When this skill is the wrong tool

- **A single slow run is not evidence.** One record supports "look again next time", not a change.
- **A defect in the pipeline's own code** — a broken script, a red meta-test — is a defect, and
  `bugfix-pipeline` handles it. This skill is for changing what the process _is_.
- **The change is one word in one skill.** Fix it and note it; three agents and a human gate for a
  typo is the shape `CH-004` warned about, applied to itself.

## The ledger

A pipeline change is a process change: **`CH-` in `docs/CHANGELOG.md`**, citing the profiling records
it rests on. A proposal the owner rejects goes to the **Rejected** section of `docs/BACKLOG.md` with
the reason, so it is not proposed again — that section exists for exactly this.
