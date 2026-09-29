---
name: bugfix-pipeline
description: Order of work for a defect — reproduction, cause, impact, a red test before the fix, the fix, acceptance, an FX- entry — and which role of the agent team owns each step. A defect is not only a red test: it can be noticed in the running application, in the code, from an owner's report, or during unrelated work. Use when something is broken, when the user says "bug", "it does not work", "fix it", "figure out why", "a test failed", "regression", "this looks broken", "found this while doing something else", or when a defect is found during acceptance. For new functionality, use the feature-pipeline skill.
---

The flow for a defect. It differs from `feature-pipeline` in that it **designs nothing**: the
promised behaviour is already described by a case, an invariant or a specification, and the job is
to bring the code back to it. That is why there are no Contract and Data sections here, and four
other ones instead: reproduction, cause, impact, and why it was not caught earlier.

Invariants, ports and "who runs what" live in `CLAUDE.md`; the suite convention in `e2e/README.md`;
the acceptance rules in `regression-verify`; the role contract in `team-roles`; the documents each
role works from in `project-context`. This file holds only the order of steps.

## Eleven steps

The steps, their roles and their IDs (`FIX-S1`…`FIX-S11`) are in
[`docs/process.md`](../../../docs/process.md), the single home for the stage inventory (`ADR-0020`).
Only seven of them (`FIX-S1`…`FIX-S7`) run below `bugfix-pipeline` §4's threshold; the other four are
discovery and the profiling record, above it only (see below). This file owns what each step means
for a defect and why the order is what it is.

## Where the discovery stages fit

Above `bugfix-pipeline` §4's threshold a defect gets a change folder (`pnpm change:new <slug> --bug`)
and three stages of its own — `FIX-S8`, `FIX-S9`, `FIX-S10` — placed **after** impact (`FIX-S4`)
rather than before reproduction: the threshold's first condition is "the cause was not found in about
15 minutes", which cannot be judged before the cause is looked for.

- **`FIX-S8`, Research** — by `researcher`, with sweeps chosen by the defect rather than the feature
  flow's fixed four; the `researcher-history` sweep is always one of them, because "has this been
  fixed before" is answered from the record, not from memory. Written into `research/**`: what was
  promised and where, what the code does, what the history says.
- **`FIX-S9`, Design** — usually one line: _restore the promised behaviour at the cause._ It becomes
  real work, dispatched to `designer`, only when the fix has a shape — a changed contract, a new
  guard, a moved check — and then it needs its own ADR like any other decision. When it stays one
  line, `planner` writes it at `FIX-S10` instead: budget `design.md` at or under 50 lines unless it
  carries an ADR.
- **`FIX-S10`, Plan** — by `planner`, into `<slug>.plan.md` from `TEMPLATE-BUGFIX.md` (60-100 lines).
  For most defects this is the red test, the fix and the entry.

**No review gate sits behind any of the three** — the defect flow keeps the property it has always
had, zero gates against the feature flow's four. What stands in for one is mechanical and specific to
this flow: the red test at `FIX-S5` must fail on current code, and the control experiment at `FIX-S7`
reverts the fix and requires the test to go red again. A wrong cause fails both.

**Two paths**, named because the table's Role column otherwise reads as if every row always runs:

- **the short path**, below the threshold — `FIX-S1` through `FIX-S7` run; `FIX-S8`-`FIX-S10` and the
  profiling record `FIX-S11` do not; there is no change folder and no team, per `team-roles`, "When
  the team is the wrong tool".
- **the full path**, above it — the same seven steps, plus `FIX-S8`-`FIX-S10` between impact and the
  red test, plus `FIX-S11` at the end. The Role column names the full path's team roles; on the short
  path one agent performs all of them.

A document for a one-line fix costs more than the fix — that is what `CH-004` moved away from, and
naming these stages makes repeating it cheaper, not harder: it is the threshold that keeps the short
path honest, not the absence of a name for the stages above it.

## 1. Orientation — like a feature, only shorter

**A defect reaches this step from any source** — a failing test, an observation made while using the
running application, a reading of the code, a report from the owner, or something noticed during
unrelated work. Not only a suite failure: whichever way it was found, the same seven (or eleven)
steps apply from here.

Read [`docs/CHANGELOG.md`](../../../docs/CHANGELOG.md) and
[`docs/BACKLOG.md`](../../../docs/BACKLOG.md), and — for the area the defect is in — the corpus that
says what the behaviour was supposed to be: `docs/api-contract.md`, `docs/data-model.md`,
`docs/architecture.md`, `docs/adr/`. A defect is a gap between a promise and the code, so you need
the promise in writing before you can call anything a defect.

Three possible answers, and all three change what happens next:

- **the defect was fixed before** (an `FX-` exists) — this is a **regression**, and the first
  question is not "how do I fix it" but "why did the previous fix's test not hold". Fixing without
  answering that is preparing a third round;
- **the defect is known as a `BL-` item** — it was already weighed and deferred with a reason.
  Either there is a new reason (name it), or it gets fixed in turn rather than because someone
  remembered it;
- **new** — continue with the steps.

If it reaches a written plan (§4), those answers go into section 0 — the same five-question form as a
feature, **Architecture impact** included, read by `pnpm check:orientation`. If the fix turns out to
change a decision rather than restore one, it is not a bugfix: it needs an ADR and the feature flow.

## 2. Reproduction — before anything else

**Until the defect is reproduced there is nothing to fix.** A hypothesis without a reproduction is a
`BL-` item, not a bugfix, and should be filed as one.

**A defect is not only a red test.** Where a test already touches the area, reproduction is the
command and its red run, as below. **Where nothing does, reproduction is a written, repeatable
procedure instead** — the exact steps, the observed result and the expected one, with a reference to
the case, the invariant or the contract the behaviour broke — and it counts as evidence on the same
footing, not a lesser one: it is checked the same way a red run is, by someone else repeating the
steps and getting the same result. §5 says what each path produces at the red-test step.

You need, either way: the exact command, scenario or procedure, the expected result (with a reference
to a case or an invariant), the actual result verbatim, stability, and the environment. The forms are
in `docs/plans/TEMPLATE-BUGFIX.md` §1.

Two traps specific to this repository, both of which have fired:

- **"a red test" ≠ "a defect".** A run goes red from an orphaned server, from a hung
  `@playwright/test` (`FX-030`), and from a `pnpm dev` running in parallel. Rule those out before
  looking for a cause in the code — `playwright-verify`, section 6;
- **a flickering defect.** "Sometimes red" is not a property of the defect but an absence of
  knowledge about what it depends on. `SEC-API-05` failed in two runs out of four, and the cause
  was the order of the measurements rather than the code. Until you know **what it depends on**, a
  fix is a guess.

## 3. Cause, not symptom

The cause is why the behaviour differs from what was promised, not the place where it crashed.
Localize by experiment rather than by reading: narrow the input, disable a layer,
`git log -S '<string>'` to find the offending commit, read the trace from `pnpm e2e:report`.

A symptom is treated **only** when the cause is outside our code, and then it is said outright,
with reasoning. Half the `FX-` entries in the ledger are defects invisible in a diff (a vacuously
passing meta-test, lint rules at `warn`, a timing oracle): in each, the crash site and the cause
were in different files.

## 4. Impact — and the decision whether a plan is needed

What else rests on this cause: neighbouring features, cases, invariants, data. Whether the user can
see it and whether there is a workaround. Whether security is involved — then the fix follows
invariants 16–19 and is checked by `pnpm e2e:security`.

**A change folder (`pnpm change:new <slug> --bug`) — research, design and a written plan — is
needed if any of these hold:**

1. the cause was not found in about 15 minutes;
2. the fix changes a contract, an invariant, or behaviour that another feature's cases rely on;
3. the defect involves security;
4. more than one module or both applications are affected.

Otherwise **no plan is needed**: a red test, the fix and an `FX-` entry are enough. The threshold
is not a loophole but protection from what `CH-004` moved away from — 100 minutes of planning
against 85 of code. A document for a one-line fix costs more than the fix.

## 5. The red test — before the fix, not after

The scenario is written **first**, by `test-designer`, as a row in the paired `.cases.md` — the same
split `team-roles` states for the feature flow, applied here (`FIX-S5`). Below `bugfix-pipeline` §4's
threshold there is no team and no `test-designer` dispatch: the fixer writes the case row with the
spec, one agent doing what two would otherwise split. Above it, the spec and its run are a tester's:
written against a scenario it did not author, and it must fail on current code. It is the same
control experiment as in acceptance, only reversed: there the code is broken to check the test, here
the code is already broken and the test is checked by it.

**Where the area was already covered, this reddens the shape of an existing check; where nothing
touched it, this is new coverage — the first case there — not a repair of one.** Either way the test
must be red on current code, for the reason it was written for, before the fix exists.

Where it goes is decided by `e2e/README.md`: behaviour over HTTP → `<feature>.api.spec.ts`; a
module-level check exercised without a browser → `*.integration.spec.ts` (project `integration`, case
type `-INT-`); UI → `*.functional.spec.ts`; a pure function → a unit next to the code. A new case
needs an ID, a row in the paired `.cases.md`, and a title starting with that ID, or the convention
meta-test fails the run. Level tags (`@unit`, `@api`, `@e2e`, `@integration`) are optional but
checked where present — `suite-integrity` rule 10 only fires once a tag exists, so an untagged spec
still passes without one.

If the defect is cross-feature — not "this page" but "any protected page" — it belongs in
`e2e/security/**` or in the `PROTECTED_ROUTES` / `PROTECTED_PAGES` lists rather than in one
feature's directory.

**A test that is green on broken code is not a test.** Seeing green before the fix means you are
checking the wrong place; go back to step 3.

## 6. The fix — minimal and at the cause

- Fix the cause, not the symptom, and nothing else. **"While I was there" is forbidden**: a
  neighbouring defect is a separate `BL-` item or a separate pass through this skill, not another
  line in the same diff.
- Refactoring around the fix is not part of the fix. A bugfix diff should read in a minute —
  otherwise a reviewer cannot tell a correction from a rewrite.
- If the correct behaviour contradicts an existing case, **the case is right** until proven
  otherwise. Proving it is not something the agent that finds the contradiction does on its own: it
  reports the case ID, the exact command, the verbatim output and the argument that the
  implementation is right; `lead` files a `BL-` row (`docs/BACKLOG.md`); and acceptance does not
  proceed until the owner decides (`team-roles`, the boundaries section). Only once approved is the
  case and its `.cases.md` edited — by `test-designer`, the role that owns the file — in one commit,
  with a line saying "assertion changed, and why" (`regression-verify` §5).

## 7. Acceptance and the entry

- **Control experiment:** revert the fix, confirm the new test goes red again, restore it. Without
  that there is no knowing whether the test holds this particular defect.
- **One full `pnpm verify`**, not just the new case: the fix may have broken something next door. If
  a `.cases.md` changed at step 5, run `pnpm scenarios:index` first and commit the refreshed
  `e2e/scenarios-index.md` — `PR-API-07` fails `pnpm verify` on a stale one.
- **An `FX-` entry** in `docs/CHANGELOG.md` with the "Found by" column filled. That column is not a
  formality: it shows which checks work, and today it says the control experiments and the security
  suite found three defects each while diff review found none. **Where step 2's reproduction was a
  procedure rather than a red run, say so by name here** (e.g. "observed in the running application;
  no test covered this path") rather than in a separate `BL-` item: the area being uncovered is
  itself a finding, and one line already carried by every entry is cheaper than a second ledger row
  for what the new case at step 5 has already started to close.
- **A `BL-` item** for the missing check, if "why it was not caught earlier" showed there was
  nothing to catch it with. One fix closes one defect; a repaired check closes a class.
- If the defect was known as a `BL-` item, that item is marked closed with a reference to the `FX-`
  entry and is **not deleted**.
- If the cause was a document rather than the code — the contract said one thing and the code another
  — the document is corrected in the same change, and the `FX-` entry says which one. A corpus that
  is wrong twice stops being read.

## What this flow deliberately lacks

- **Its own severity scale.** Urgency is the backlog's `P1`/`P2`/`P3`, the same as everything else.
- **A separate ledger entry type.** `FX-` already means defect.
- **A mandatory plan for every bug** — see the threshold in §4.
