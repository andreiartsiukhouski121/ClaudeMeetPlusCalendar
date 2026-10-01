---
name: research-protocol
description: How the research stage is run in this repository — the evidence rule (record only what is in the project, never what you concluded), the four sweeps and their models, the change folder, and what counts as a finding. Use when requirements arrive and before any design or plan exists, when dispatching or writing a research sweep, or when asked "what do we already have for this".
---

Research is the first stage of a change: **what does this project already contain that bears on this
requirement.** It runs before any design, and its output is the design's context (`ADR-0016`).

## The evidence rule

**Record only what is in the project. Never what you concluded from it.**

Every statement carries a citation — `path:line`, a document section, a case ID, an `FT-`/`CH-`/
`FX-`/`BL-`/`ADR-` entry, or a commit. A statement you cannot cite does not belong in a findings
section; it goes under **Open questions** or as:

```
- **Not found:** <the question> — searched <where, how>
```

That syntax is fixed, and deliberately mirrors `- **Not automated:**` in the suite meta-test: free
prose would let any paragraph switch the check off. `PR-API-06` accepts a citation or this marker
and fails a research file that has neither.

**Citing the corpus means citing a key.** The four corpus documents carry a `FACT-NNNN` on every
statement of fact (`ADR-0021`). A research finding that rests on the corpus cites the key, not the
document — `docs/data-model.md` says a dozen things about `startsAt`, `FACT-1008` says one. An
unkeyed sentence in the corpus is reasoning and is not evidence; if a sweep needs it, the finding is
"the corpus reasons X but states no fact", which is an open question.

**"Nothing in this repository covers X" is a finding**, often the most valuable one — it is the
difference between a design that knows it is inventing something and one that assumes it is
following a pattern.

Three habits that break the rule while looking like research:

- **Softeners.** "probably", "seems to", "is likely", "presumably" mean you are inferring.
- **Purpose attribution.** "the intent here is…", "this exists so that…" — unless a comment or an
  ADR says so, and then cite it.
- **Placement advice.** "so this should live in…" is design, not research.

A sweep that quietly designs makes the design unreviewable: its reasoning arrives already wrapped in
a conclusion, and the `design-reviewer` can no longer tell which facts were checked.

## Where it goes

```
docs/plans/<slug>/
  research/README.md   the index — questions, sweeps, contradictions, still unknown
  research/code.md     researcher-code
  research/contract.md researcher-contract
  research/tests.md    researcher-tests
  research/history.md  researcher-history
```

`pnpm change:new <slug>` (add `--bug` for a defect) scaffolds `research/README.md` and `design.md`
only — `PR-API-03` requires exactly those two, and `PR-API-05` keeps the scaffolder and the check
equal. The four sweep files above are written by the sweeps themselves at `FEAT-S1`, not scaffolded
in advance. The folder is the change's working context and is kept afterwards, like plans and ledger
entries.

**Probes** (`feature-pipeline` §0 mandates five to seven of them) have the same home as any other
finding: the fact they prove lands in `research/code.md`, in `researcher-code`'s own voice. A
separate file holding the throwaway code itself, `research/probes.md`, is allowed alongside it —
unscaffolded and unbudgeted, so no check and no line limit applies to it.

## The four sweeps

| Sweep                 | Question it answers                                                          | Default model |
| --------------------- | ---------------------------------------------------------------------------- | ------------- |
| `researcher-code`     | where does the change land, what already exists there, who calls what        | `sonnet`      |
| `researcher-contract` | what is already promised: endpoints, shapes, formats, invariants, ADRs       | `sonnet`      |
| `researcher-tests`    | what is already checked, at which level, and where coverage stops            | `sonnet`      |
| `researcher-history`  | what the ledger, the backlog, the Rejected table and git history already say | `haiku`       |

The `researcher` dispatches them — in parallel, since they only read and each writes its own file —
and **overrides the model per sweep** with the `model` parameter: raise one to `opus` when a first
pass came back thin or the area is dense and interlinked; drop one to `haiku` when it is plain
retrieval. Record which model ran each sweep in `README.md`: a thin file from a cheap model is a
different fact from a thin file from an expensive one, and only the first is fixable by re-running.

## The index

`research/README.md` carries the requirement as received, the **questions asked** (including the
ones that came back empty — a question with no answer is kept, not deleted), the sweep table,
**contradictions found**, and **still unknown**.

Contradictions are **named, not resolved.** Where a document disagrees with the code, report both
sides with citations and stop: resolving one is a decision, and decisions belong to the design
stage. If a document is simply wrong, that is a defect for the lead to route — not something the
sweep corrects on its way past.

## What research does not do

- It does not propose an approach, weigh options, or estimate effort.
- It does not write, edit or run anything outside `research/` — not product code, not tests, not the
  corpus. `researcher-tests` in particular **does not run the suite**: a red run during a sweep is
  noise, not a finding.
- It does not judge adequacy. "Covered by `HD-API-05`" is a finding; "adequately covered" is a
  verdict, and verdicts belong to the reviewers.

## When to skip it

A defect below the `bugfix-pipeline` §4 threshold gets no change folder and no stages: a red test,
the fix, an `FX-` entry. Documentation, config and renames likewise. The stages are worth their cost
on work that designs behaviour; on work that does not, they are the failure `CH-004` was written
about.

## The gate

`research-reviewer` — read-only, `opus` — verifies citations by opening them, hunts for inference
recorded as fact, checks the requirement's surface was covered, and confirms contradictions were
named rather than resolved. Its verdict comes back unedited, and its **Gaps to carry forward**
section is what the designer inherits as questions rather than as silence.
