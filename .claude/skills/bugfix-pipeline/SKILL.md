---
name: bugfix-pipeline
description: Order of work for a defect — reproduction, cause, impact, a red test before the fix, the fix, acceptance, an FX- entry — and which role of the agent team owns each step. Use when something is broken, when the user says "bug", "it does not work", "fix it", "figure out why", "a test failed", "regression", or when a defect is found during acceptance. For new functionality, use the feature-pipeline skill.
---

The flow for a defect. It differs from `feature-pipeline` in that it **designs nothing**: the
promised behaviour is already described by a case, an invariant or a specification, and the job is
to bring the code back to it. That is why there are no Contract and Data sections here, and four
other ones instead: reproduction, cause, impact, and why it was not caught earlier.

Invariants, ports and "who runs what" live in `CLAUDE.md`; the suite convention in `e2e/README.md`;
the acceptance rules in `regression-verify`; the role contract in `team-roles`; the documents each
role works from in `project-context`. This file holds only the order of steps.

## Seven steps

The seven steps, their roles and their IDs (`FIX-S1`…`FIX-S7`) are in
[`docs/process.md`](../../../docs/process.md), the single home for the stage inventory (`ADR-0020`).
This file owns what each step means for a defect and why the order is what it is.

## Where the discovery stages fit

Above the §4 threshold a defect gets a change folder (`pnpm change:new <slug> --bug`) and the same
three stages a feature gets, mapped onto the steps above:

| Stage        | For a defect it means                                                                                                                                                                                                                     |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Research** | steps 1–3 written down with citations: what was promised and where, what the code does, what the history says. The `researcher-history` sweep is how "has this been fixed before" gets answered from the record rather than from memory   |
| **Design**   | usually short, and often one line: _restore the promised behaviour at the cause._ It becomes real work only when the fix has a shape — a changed contract, a new guard, a moved check — and then it needs its ADR like any other decision |
| **Plan**     | the task breakdown, which for most defects is the red test, the fix and the entry                                                                                                                                                         |

Below the threshold none of it applies: no folder, no stages, no team. A document for a one-line fix
costs more than the fix — that is what `CH-004` moved away from, and adding stages makes repeating
it cheaper, not harder.

## 1. Orientation — like a feature, only shorter

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

**Until the defect is reproduced there is nothing to fix.** A hypothesis without a red run is a
`BL-` item, not a bugfix, and should be filed as one.

You need: the exact command or scenario, the expected result (with a reference to a case or an
invariant), the actual result verbatim, stability, and the environment. The forms are in
`docs/plans/TEMPLATE-BUGFIX.md` §1.

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

The test is written **first**, by a tester rather than by whoever will fix it, and must fail on
current code. It is the same control experiment as in acceptance, only reversed: there the code is
broken to check the test, here the code is already broken and the test is checked by it.

Where it goes is decided by `e2e/README.md`: behaviour over HTTP → `<feature>.api.spec.ts`, UI →
`*.functional.spec.ts`, a pure function → a unit next to the code. A new case needs an ID, a row in
the paired `.cases.md`, and a title starting with that ID, or the convention meta-test fails the
run.

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
  otherwise. Once proven, the case and its `.cases.md` are edited in one commit and the report
  gains a line saying "assertion changed, and why" (`regression-verify` §5).

## 7. Acceptance and the entry

- **Control experiment:** revert the fix, confirm the new test goes red again, restore it. Without
  that there is no knowing whether the test holds this particular defect.
- **One full `pnpm verify`**, not just the new case: the fix may have broken something next door.
- **An `FX-` entry** in `docs/CHANGELOG.md` with the "Found by" column filled. That column is not a
  formality: it shows which checks work, and today it says the control experiments and the security
  suite found three defects each while diff review found none.
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
