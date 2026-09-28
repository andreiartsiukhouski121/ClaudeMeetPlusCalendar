# Design: discovery-pipeline

> The shape of the change: three stages — research, design, plan — in front of implementation, each
> with its own agents and its own review gate, and a folder per change to carry them.

## 1. What the research established

- A change has exactly one artifact today, `docs/plans/<slug>.plan.md`, created by
  `scripts/new-plan.mjs` — [research/code.md](research/code.md). There is nowhere for material that
  is neither a plan nor an archive.
- `scripts/check-orientation.mjs` reads `docs/plans/*.plan.md` one level deep, so a plan moved into
  a subdirectory would silently stop being verified — [research/code.md](research/code.md).
- A subagent can dispatch subagents on this machine; verified by probe —
  [research/code.md](research/code.md).
- The repository already has the "either the thing, or an explicitly marked exception" convention
  (`- **Not automated:**`) and already knows why it must be a fixed syntax —
  [research/contract.md](research/contract.md).
- `AR-API-08` collects role names by a regex limited to `tester-`/`implementer-`, so new role
  families would not be covered and the case would keep passing —
  [research/tests.md](research/tests.md).
- No prior entry, backlog item or rejection covers a research or design stage —
  [research/history.md](research/history.md).
- The record's repeated failure mode is documents that grow, drift and then get believed:
  `CH-004`, `FX-013`, `FX-023`, `FX-027` — [research/history.md](research/history.md).

## 2. The shape

**A folder per change.** `docs/plans/<slug>/` holds the three stages in the order they happen:

```
docs/plans/<slug>/
  research/README.md   stage 1 — the index: questions, sweeps, contradictions, still unknown
  research/*.md        one file per subagent sweep
  design.md            stage 2 — this document's shape, written from research/
  <slug>.plan.md       stage 3 — the task breakdown, written from research/ + design.md
```

Nothing in `apps/api` or `apps/web` changes: no controller, service, DTO, mapper, guard, page,
Server Action or component is touched. This change is entirely process machinery.

**Eight new roles**, each a file in `.claude/agents/` whose limits are its tool list:

| Role                  | Writes                           | Model    |
| --------------------- | -------------------------------- | -------- |
| `researcher`          | `research/README.md`, dispatches | `opus`   |
| `researcher-code`     | `research/code.md`               | `sonnet` |
| `researcher-contract` | `research/contract.md`           | `sonnet` |
| `researcher-tests`    | `research/tests.md`              | `sonnet` |
| `researcher-history`  | `research/history.md`            | `haiku`  |
| `research-reviewer`   | nothing — read-only verdict      | `opus`   |
| `designer`            | `design.md`, `docs/adr/**`       | `opus`   |
| `design-reviewer`     | nothing — read-only verdict      | `opus`   |

`researcher` is the second role after `lead` to hold `Agent`; the sweep subagents do not, so the
dispatch tree stays one level deep and legible. Subagent models are defaults the `researcher`
overrides per sweep with the `model` parameter — raising a thin sweep to `opus`, dropping pure
retrieval to `haiku` — and records the choice in `README.md`.

**ADR authorship moves** from `planner` to `designer`: a structural decision is made while the shape
is decided, not while the order of work is written.

## 3. Contract

No HTTP contract changes — nothing in `docs/api-contract.md` is affected. The contracts this change
does touch are string-level, and each moves in lockstep with its checker:

- `docs/plans/<slug>/` becomes a recognised shape: `check-orientation.mjs` gains a one-level-deep
  scan of subdirectories, and `PR-API-03` requires `research/README.md`, `design.md` and
  `<slug>.plan.md` in every change folder.
- `<!-- fill this in -->` is the marker a scaffolded file carries until its stage is written;
  `PR-API-04` fails while any remain.
- `- **Not found:**` is the marker a research file uses for a sweep that came back empty; `PR-API-06`
  accepts it in place of a citation. The syntax deliberately mirrors `- **Not automated:**`.
- The stage scaffolds are named `SCAFFOLD-*.md`, **not** `TEMPLATE-*.md`: the `TEMPLATE*` glob in
  `PR-API-01` demands section 0 with five orientation labels, which a research index has no business
  carrying.

## 4. Data

No entity, DTO, seed value or format changes. The only data added is documentary: one folder per
change, retained like plans are — `ADR-0011` keeps history rather than deleting it.

## 5. Alternatives rejected

| Alternative                                                     | Why not                                                                                                                                                                 |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Keep the flat `docs/plans/<slug>.plan.md` and add sibling files | Three loose files per change with no boundary; the "context for the next stage" would be assembled by hand and differently each time                                    |
| A separate top-level `research/` tree                           | It splits one change across two places, and the two rot at different speeds — the exact shape of `FX-023` and `FX-027`                                                  |
| Fold research into the `planner` role                           | The planner would gather the facts it then plans from, so nothing independent checks whether the facts are real. `ADR-0014` already separates who does from who judges  |
| One combined `discovery-reviewer` for all three stages          | The three artifacts fail differently — an uncited claim, an unsourced design decision, an unreachable task — and one reviewer with three checklists does the first well |
| Let the sweep subagents also hold `Agent`                       | An unbounded dispatch tree whose cost and depth nobody can see; one level keeps the fan-out legible                                                                     |
| Keep `plan:new` alongside `change:new`                          | Two commands for starting work means two shapes on disk and a checker that must understand both forever                                                                 |
| Machine-check that research contains no speculation             | Not decidable by a regex. The reviewer gate judges it; the machine only checks that **something** is cited, which is `ADR-0010`'s line between form and meaning         |

## 6. Decisions and ADRs

- **`ADR-0016`** — discovery runs as three reviewed stages in one folder per change. It records the
  evidence rule, the folder shape, the stage order and what the machine can and cannot check.
- No accepted ADR is contradicted. `ADR-0014` is extended (eight more roles under the same rule that
  a role's limits are its tools); `ADR-0015` is extended by distinguishing the **durable** corpus
  from the **per-change** folder; `ADR-0010` supplies the rule that each new convention arrives with
  its own check.

## 7. Impact on what already exists

- `PR-API-01`, `PR-API-02` — unaffected in substance, but the scaffolds must avoid the `TEMPLATE*`
  glob or `PR-API-01` would demand orientation labels from them.
- `AR-API-08` — must stop filtering role names by prefix, or it silently covers less than it claims.
- `check-orientation.mjs` — behaviour extended; the five flat legacy plans keep passing unchanged.
- `pnpm plan:new` disappears; every document naming it must move to `change:new`.
- `planner.md` — loses ADR authorship, gains the change folder as its context.
- No invariant (1–19) is touched; no case in `e2e/regression/**` or `e2e/security/**` is affected.

## 8. Open questions and deliberate omissions

- **Not settled:** what the three stages cost in wall-clock for a real feature. No measurement
  exists and none is invented here; the first real use of the flow is the measurement.
- **Deliberate omission:** no machine check that a role wrote only inside its own folder. It is
  `BL-020`'s subject and stays open.
- **Deliberate omission:** the short path is untouched. A defect below the `bugfix-pipeline` §4
  threshold gets no folder and no stages — a red test, the fix, an `FX-` entry.
- **Deliberate omission:** nested dispatch deeper than one level is neither used nor tested.
