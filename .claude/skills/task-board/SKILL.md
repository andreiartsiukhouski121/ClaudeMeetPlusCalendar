---
name: task-board
description: Picking work from the owner's task board — "the board" here is always docs/board.html, the scrum board generated from the ledger, the backlog and the epics; never GitHub, Jira or any other tracker. Use when the owner asks what to take next ("какую задачу взять с борды", "what's next", "what's on the board"), names a ticket to take ("возьми F-043", "берём BL-069"), or asks what is in progress, blocked or open.
---

# The task board

**"The board" in this repository is one thing:** [`docs/board.html`](../../../docs/board.html), the
scrum board `scripts/board.mjs` builds from three files (`CH-040`, `CH-042`, `CH-043`):

| Source              | Gives the board                                                        |
| ------------------- | ---------------------------------------------------------------------- |
| `docs/EPICS.md`     | epics → features → tasks; a **Feature** ticket is an `F-NNN` there     |
| `docs/BACKLOG.md`   | open tasks with priority, `Depends on`, `Conflicts with`; **Bug** rows |
| `docs/CHANGELOG.md` | what is done; a row on `pending` is still in progress                  |

There is no issue tracker behind it. If the owner says "the board", "борда", "доска", they mean this
page, and the answer comes from these files, not from a guess about what they remember.

## Reading it: `pnpm board:todo`

Never parse the HTML. Run:

```bash
pnpm board:todo
```

It prints the In Progress and To Do columns as text from the same code that builds the page, so the
two cannot disagree: every ticket with its type (Feature or Bug), priority, epic and done/total
count, and under each feature its open tasks with priority, area, title, `BLOCKED by open BL-NNN`
when its `Depends on` names a row still open, and its `Conflicts with`.

A feature's priority is its most urgent open task. A Bug is an open backlog row whose `What` opens
with `**Defect.**`; once fixed it becomes an `FX-` row in Done.

## "Which task should I take?"

Recommend **one** ticket and say why in two or three lines; name at most two alternatives. Order:

1. **Priority**: P1 (blocks production or the next feature), then P2, then P3. A ticket's priority
   is its most urgent open task, whichever column it sits in.
2. **At the same priority, finish what is in progress** before starting anything: an In Progress
   ticket is a feature half done, so its Done card is not yet true.
3. **Then bugs before features** — a promised behaviour that does not hold.
4. **Skip what is blocked**: a task marked `BLOCKED by open BL-NNN` waits for that row; recommend the
   blocker instead if it is worth taking.
5. **Read the conflicts**: a `Conflicts with` naming another open row means the two are planned
   together or one after the other; say which.
6. **Size it** with `change-router`'s criteria before answering, briefly — "small, no criteria" or
   "large: C1, C3" — so the owner knows what taking it costs.

Before recommending, open the task's full row in `docs/BACKLOG.md` (the board line is cut) and check
the **Rejected** section, so a rejected idea is not brought back. Recommend a feature by its `F-NNN`
and name the task inside it you would start with.

## "Take this one"

The owner may name a feature (`F-043`), a task (`BL-069`) or describe one in words. Resolve it
against the files above:

- **`F-NNN`** — take its open tasks; start with the most urgent, unblocked one.
- **`BL-NNN`** — that row. If it is closed (`**Closed by …**` or the Closed table), say so with the
  closing ID and stop: "already done in `FX-007`" is a complete answer.
- **Words** — find the matching row; if two fit, ask which one, quoting both IDs.

Then the usual path: `change-router` sizes it, and a defect (the behaviour is promised) goes to
`bugfix-pipeline`, anything else to `feature-pipeline`.

## Keeping it current

The board is **generated, never edited**: `.husky/pre-commit` rebuilds it on every commit. It moves
only when the files move — the ledger row (`FT-`/`CH-`/`FX-`), the backlog row closed by it, and the
task added to its feature's `Tasks` line in `docs/EPICS.md` (`LG-API-08`). A finished task that is
missing from any of the three is missing from the board.
