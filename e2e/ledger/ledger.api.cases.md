# Changelog and backlog — integrity checks

- **Spec:** `e2e/ledger/ledger.api.spec.ts`
- **Playwright project:** `api` (no browser, plain `node:fs`)
- **Tags:** `@ledger`
- **Run:** `pnpm e2e e2e/ledger` (part of `pnpm verify`)

Checks the structure of [`docs/CHANGELOG.md`](../../docs/CHANGELOG.md) and
[`docs/BACKLOG.md`](../../docs/BACKLOG.md).

Why a machine check rather than trusting care: a hand-maintained table of expected numbers already
rotted in this project — it drifted from reality (77 tests against 53) and made an acceptance
blocker impossible to satisfy (`FX-013`). An unchecked ledger degrades the same way: first a
duplicate ID, then a reference to a non-existent item, then nobody believes it and a second one
gets started.

What these cases do **not** check: the meaning of the entries. Whether a task duplicates another in
substance is settled by step 0 "Orientation" in the `feature-pipeline` skill — written answers in
the plan, visible in review. The machine checks the form, a human checks the content.

## Summary

| ID        | Title                                                        | Priority |
| --------- | ------------------------------------------------------------ | -------- |
| LG-API-01 | both ledger files exist and are not empty                    | P0       |
| LG-API-02 | IDs are unique and match `FT-`/`CH-`/`FX-`/`BL-`             | P0       |
| LG-API-03 | every changelog entry has its commit filled in               | P1       |
| LG-API-04 | commit references resolve in git                             | P1       |
| LG-API-05 | every backlog item has the "Conflicts with" column filled    | P0       |
| LG-API-06 | no references to non-existent `BL-`/`FX-`/`FT-`/`CH-`        | P0       |
| LG-API-07 | every `FX-` row numbered 48 and above names the path it took | P1       |

## Cases

### LG-API-01 — both ledger files exist and are not empty

- **Priority:** P0
- **Steps:** read `docs/CHANGELOG.md` and `docs/BACKLOG.md`.
- **Expected:** both files exist and each holds at least one entry with an ID. An empty ledger is
  worse than none: it suggests there is no history.

### LG-API-02 — IDs are unique and well formed

- **Priority:** P0
- **Steps:** collect every ID from the table rows of both files, check shape and repeats.
- **Expected:** every ID is `FT-NNN`, `CH-NNN`, `FX-NNN` (changelog) or `BL-NNN` (backlog), with no
  repeats. A duplicate ID means two different entries read as one.

### LG-API-03 — every changelog entry has its commit filled in

- **Priority:** P1
- **Steps:** take the commit column of every row in the Features, Process and Defects tables.
- **Expected:** the column is non-empty and is **exactly** one of two forms, both in backticks: a
  hash (7–40 hex characters), or `` `pending` `` for an entry added by the current change. A bare
  `pending` fails here, with a message about the format: `pnpm ledger:fill` fills only the
  backticked form, so a bare one would otherwise go red one commit later as "stale" (`BL-026`,
  `FX-048`). Additionally, if the ledger file has **no uncommitted edits** — meaning
  the change is finished — it must contain no `pending`.
- **Three rejected formulations of this rule**, each caught by a run. Recorded so nobody returns to
  them:
  1. "at most one `pending`" — broke on the first commit that carried a process change and a defect
     at once;
  2. "no `pending` entries at `HEAD~1`" — off by one: `HEAD~1` is exactly the commit where
     `pending` is legitimate;
  3. "a file without uncommitted edits contains no `pending`" — broke on CI, where the tree is
     **always** clean: the rule made the first push of any entry red by construction (`FX-019`).
- **Final formulation:** `pending` is legitimate while the change that introduced the entry is
  still happening — either the file is still being edited, or the entry was introduced by the
  current `HEAD` (found via `git log -S<ID>`, which locates the commit that added the mention
  rather than the one that replaced `pending` with a hash).

### LG-API-04 — commit references resolve in git

- **Priority:** P1
- **Steps:** run `git cat-file -e <hash>` for every hash in the ledger.
- **Expected:** every hash exists in the repository. A reference to a missing commit means the
  entry was rewritten after a rebase and lost its link to the change.
- **In a shallow clone the check has no subject** and is skipped: the old commits are simply not
  there, and "the commits do not exist" would tell a lie about the ledger instead of the truth
  about the clone. CI therefore uses `fetch-depth: 0` (`FX-018`).

### LG-API-05 — every backlog item has the "Conflicts with" column filled

- **Priority:** P0
- **Steps:** take the last column of every row in the Open table.
- **Expected:** the column is non-empty — an explicit "no" is fine. An empty column means nobody
  weighed the item against the rest of the project, and that is where a second implementation of
  the same thing comes from. Hence P0 rather than cosmetics.

### LG-API-06 — no references to non-existent entries

- **Priority:** P0
- **Steps:** walk `docs/**/*.md`, `.claude/skills/**/*.md`, `CLAUDE.md` and `e2e/**/*.md`,
  collecting every mention of `BL-NNN`, `FX-NNN`, `FT-NNN`, `CH-NNN`.
- **Expected:** every mentioned ID is declared in the matching ledger file. A dangling reference
  means an entry was deleted instead of having its status changed, and the reasoning was lost.

### LG-API-07 — every `FX-` row numbered 48 and above names the path it took

- **Priority:** P1
- **Steps:** take every row of the Defects and fixes table in `docs/CHANGELOG.md` whose ID is `FX-`
  with a numeric part of **48 or more**; rows `FX-001`…`FX-047` are out of scope and never
  rewritten. In each row in scope, find every path marker, anywhere in the row's cells, of one of
  three literal forms:
  1. `Path: full (docs/plans/<slug>)`;
  2. `Path: short, below the threshold`;
  3. `Path: short, threshold overridden by the owner: criteria <n>[, <n>…]`, where each `<n>` is
     a criterion number of `bugfix-pipeline` §4 (1 — cause not found in about 15 minutes; 2 — a
     contract, invariant or relied-on behaviour changes; 3 — security; 4 — more than one module or
     both applications).
- **Expected — passes:** the row carries **exactly one** marker, and
  - for `full`, the directory `docs/plans/<slug>/` exists;
  - for `below the threshold`, nothing further;
  - for `overridden`, the list names at least one criterion and every criterion is an integer 1–4.
- **Expected — fails, naming the row and the reason:** no marker; two or more markers (of the same
  form or of different forms); a `full` marker whose `docs/plans/<slug>/` does not exist; an
  `overridden` marker with an empty criteria list, or with a criterion outside 1–4 (`0`, `5`, a
  non-number).
- **Why:** `FX-046` took the short path although criteria 2 and 4 of the threshold held, and the
  ledger row recorded nothing that would show it. The owner's decision of 2026-10-13
  (`docs/profiling/plans/2026-10-12-tuning-5.plan.md`, "`FX-046` follow-up", option A) is that the
  short path above the threshold exists only as an explicit owner override, and that from the next
  `FX-` row on the row says which path was taken — held by this meta-test, not by care. A `full`
  marker pointing at no folder is the same lie in the other direction: a claimed plan nobody can
  open.
- **Vacuity guard, two parts** — the same class `AR-API-17` closes for the retirement register:
  1. **The matcher is driven over a fixture written into the spec** (not under `docs/`, so it is
     never mistaken for part of the ledger): one sample row per passing form — a `full` marker
     whose slug is a folder that really exists under `docs/plans/`, a `below the threshold` marker,
     an `overridden` marker with `criteria 2, 4` — and one per failing form: no marker, two markers,
     `full` with a slug that has no folder, `overridden` with no criteria, `overridden` with
     `criteria 5`. Assert the three sound rows pass and each of the five broken rows is rejected
     for its own reason. Today the ledger has no row numbered 48 or above, so without this the case
     would pass having judged nothing.
  2. **The real table parsed:** before judging the rows in scope, assert the Defects table yielded
     at least one `FX-` row at all, so a moved or reworded table cannot make the case green by
     reading zero rows — the same guard `AR-API-10` and `AR-API-11` carry.
- **Control experiment:** add a scratch `FX-` row numbered 48 or more with no marker and confirm the
  case goes red naming it; add the `below the threshold` marker and confirm green; then remove the
  row.
