# Bugfix: <short defect name>

> Bugfix plan template. Created by `pnpm plan:new <slug> --bug`. **Not every bug needs one** — the
> threshold is in the `bugfix-pipeline` skill §4: the cause is not obvious, the fix changes a
> contract or an invariant, security is involved, or more than one module is affected. Otherwise
> the flow is shorter: red test, fix, `FX-` entry.
>
> **Target: 60–100 lines.** The sections below each answer a question whose absence has already
> made a fix land in the wrong place. "Contract" and "Data" from the feature template are missing
> on purpose: a bugfix does not design behaviour, it restores what was already promised.

## 0. Orientation: what the project already has

Filled in **first**. Sources: [`docs/CHANGELOG.md`](../CHANGELOG.md) (every defect found, with the
"Found by" column), [`docs/BACKLOG.md`](../BACKLOG.md), the corpus that says what the behaviour was
supposed to be ([`api-contract.md`](../api-contract.md), [`data-model.md`](../data-model.md),
[`architecture.md`](../architecture.md), [`adr/`](../adr/README.md)), then the code.

Five answers. **Do not change the form** — `pnpm check:orientation` reads it and sits in
`.husky/pre-commit`.

- **Duplicate:** has this defect been fixed before? Cite the `FX-` entries, or say "no matches". A
  defect that was fixed and came back is a regression, and it is handled differently: first find
  out why the previous fix's test did not hold.
- **Conflicts with shipped:** which invariants (`CLAUDE.md`), cases and files the fix touches. If
  correct behaviour contradicts an existing case, the case is right until proven otherwise.
- **Conflicts with planned:** which `BL-` items this defect overlaps, cancels or makes urgent, or
  "no matches". A defect already known as a `BL-` item is closed by it, not filed again.
- **Architecture impact:** which `ADR-` decisions the promised behaviour rests on, and whether the
  corpus describes it correctly — if the document was wrong, that is part of the defect. Cite ADR
  IDs, or say "no matches" and why. If the fix would **change** a decision rather than restore it,
  this is not a bugfix: it needs an ADR and the feature flow.
- **Open questions:** what in the report is an observation and what is someone's conclusion about
  the cause; what is missing to reproduce it.

## 1. Reproduction

**Until the defect is reproduced there is nothing to fix.** A hypothesis without a red run is a
`BL-` item, not a bugfix.

| What                | Value                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Command or scenario | the exact line: `pnpm e2e --grep "…"`, browser steps, request         |
| Expected            | per the feature spec or an invariant, with a reference                |
| Actual              | verbatim: error text, response code, screenshot                       |
| Stability           | always / N times out of M — if it flickers, give the number           |
| Environment         | what differs from normal: ports, seed state, servers left from before |

A flickering defect is fixed only once you know **what** it depends on: "sometimes red" is a
coincidence, not a cause.

## 2. Cause

Not the symptom and not the place it crashed, but why the behaviour differs from what was promised.

- **Cause:**
- **How it was localized:** the experiment that proved it (narrowed input, disabled layer,
  `git log -S`, a trace from `pnpm e2e:report`).
- **When it appeared:** the commit, if it can be found; "always been there" is also an answer.

A symptom is treated only if the cause is outside our code — and then it is said outright, with
reasoning.

## 3. Impact

- **What else rests on this cause:** neighbouring features, cases, invariants, data.
- **Is it visible to the user:** what exactly they see, and whether there is a workaround.
- **Security:** whether authentication, sessions, other people's data or a leak into a response or
  the HTML are involved. If yes, the fix follows invariants 16–19 and `pnpm e2e:security`.
- **Urgency:** `P1` blocks production or the next feature, `P2` can wait, `P3` is incidental.

## 4. Why it was not caught earlier

The section that turns one fix into a closed class of defects.

- **Which check should have caught it and did not:** and why — it did not exist, it looked in the
  wrong place, it passed vacuously, it was set to `warn`.
- **What we do about it:** a new case in this same fix, or a `BL-` item to repair the check itself.

"Nothing should have caught it" is a legitimate answer, but it has to be explicit: then the "Found
by" column gains a new value, and it becomes visible which kind of check actually works.

## 5. Fix plan

| ID  | What to do | Files | Done when | Depends on |
| --- | ---------- | ----- | --------- | ---------- |

- **What we do NOT touch:** neighbouring defects, refactoring, anything "while we are here". Each
  such temptation is a separate `BL-` item, not a line in this diff.

## 6. Verification

- **Red test before the fix:** the case ID and the file it will live in. The test is written
  **first** and must fail on current code — otherwise it is not testing the defect.
- **Control experiment after the fix:** revert the fix, confirm the test goes red again, restore it.
- **Acceptance:** one full `pnpm verify` — the fix may have broken something next door.

## 7. Risks and deliberate omissions

What the fix does not close and why; what stays as a backlog item. An omission not stated is not an
omission — it is a misreported result.

---

On completion: an `FX-` entry in [`CHANGELOG.md`](../CHANGELOG.md) with the "Found by" column
filled, a `BL-` item for the missing check from §4, and the backlog item marked closed with a
reference if the defect was known there. The full order of work is the `bugfix-pipeline` skill.
