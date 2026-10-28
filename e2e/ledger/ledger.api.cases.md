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

| ID        | Title                                                            | Priority |
| --------- | ---------------------------------------------------------------- | -------- |
| LG-API-01 | both ledger files exist and are not empty                        | P0       |
| LG-API-02 | IDs are unique and match `FT-`/`CH-`/`FX-`/`BL-`                 | P0       |
| LG-API-03 | every changelog entry has its commit filled in                   | P1       |
| LG-API-04 | commit references resolve in git                                 | P1       |
| LG-API-05 | every backlog item has the "Conflicts with" column filled        | P0       |
| LG-API-06 | no references to non-existent `BL-`/`FX-`/`FT-`/`CH-`            | P0       |
| LG-API-07 | every `FX-` row numbered 48 and above names the path it took     | P1       |
| LG-API-08 | every ledger and backlog record is a task of exactly one feature | P1       |
| LG-API-09 | every `FT-` from 011 and `CH-` from 045 carries one `Tier:`      | P1       |
| LG-API-10 | every small-depth row carries exactly one `Cost:` clause         | P1       |
| LG-API-11 | the board's `readEpics` reads `EPICS.md` as `LG-API-08` does     | P1       |

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
  four literal forms:
  1. `Path: full (docs/plans/<slug>)`;
  2. `Path: medium (docs/plans/<slug>)` — the defect medium depth (`change-router`);
  3. `Path: short, below the threshold`;
  4. `Path: short, threshold overridden by the owner: criteria <n>[, <n>…]`, where each `<n>` is
     a criterion number of `bugfix-pipeline` §4. The numbers keep their meaning, now mapped there to
     the router's ids: 1 = `C6` (cause slow to find), 2 = `C1`, 3 = `C3`, 4 = `C4`.
- **Expected — passes:** the row carries **exactly one** marker, and
  - for `full` and `medium`, the directory `docs/plans/<slug>/` exists;
  - for `below the threshold`, nothing further;
  - for `overridden`, the list names at least one criterion and every criterion is an integer 1–4.
- **Expected — fails, naming the row and the reason:** no marker; two or more markers (of the same
  form or of different forms); a `full` or `medium` marker whose `docs/plans/<slug>/` does not
  exist; an `overridden` marker with an empty criteria list, or with a criterion outside 1–4 (`0`,
  `5`, a non-number).
- **Why:** `FX-046` took the short path although criteria 2 and 4 of the threshold held, and the
  ledger row recorded nothing that would show it. The owner's decision of 2026-10-13
  (`docs/profiling/plans/2026-10-12-tuning-5.plan.md`, "`FX-046` follow-up", option A) is that the
  short path above the threshold exists only as an explicit owner override, and that from the next
  `FX-` row on the row says which path was taken — held by this meta-test, not by care. A `full`
  marker pointing at no folder is the same lie in the other direction: a claimed plan nobody can
  open.
- **Vacuity guard, two parts** — the same class `AR-API-17` closes for the retirement register:
  1. **The matcher is driven over a fixture written into the spec** (not under `docs/`, so it is
     never mistaken for part of the ledger): one sample row per passing form — a `full` and a
     `medium` marker, each whose slug is a folder that really exists under `docs/plans/`, a `below
the threshold` marker, an `overridden` marker with `criteria 2, 4` — and one per failing form:
     no marker, two markers, `full` with a slug that has no folder, `medium` with a slug that has no
     folder, `overridden` with no criteria, `overridden` with `criteria 5`. Assert the four sound
     rows pass and each of the six broken rows is rejected for its own reason.
  2. **The real table parsed:** before judging the rows in scope, assert the Defects table yielded
     at least one `FX-` row at all, so a moved or reworded table cannot make the case green by
     reading zero rows — the same guard `AR-API-10` and `AR-API-11` carry.
- **Control experiment:** add a scratch `FX-` row numbered 48 or more with no marker and confirm the
  case goes red naming it; add the `below the threshold` marker and confirm green; then remove the
  row.

### LG-API-08 — every ledger and backlog record is a task of exactly one feature

- **Priority:** P1
- **Steps:** parse `docs/EPICS.md` into its `## EP-NN · Name` epics, each with a `Kind` line and
  `### F-NNN · Title` features, each with a `Tasks` line; collect every `FT-`/`CH-`/`FX-`/`BL-` row
  ID of `docs/CHANGELOG.md` and `docs/BACKLOG.md`.
- **Expected:** every record is a task of exactly one feature; no feature lists an ID no row
  defines; feature IDs are unique; every epic holds at least one feature and its `Kind` is
  `product` or `technical`. A failure names the record, the feature or the epic.
- **Why:** the owner reads the task board (`docs/board.html`) as a product owner, by feature
  (`CH-042`). A record in no feature is invisible there, so this check is what makes "add the new
  entry to its feature" a rule rather than a habit.
- **Vacuity guard:** a fixture in the spec — a record in two features, a record in none, an unknown
  task, a reused feature ID, an epic with no feature and a wrong kind — must each be reported; and
  the real files must parse into at least one feature and one record.

### LG-API-09 — every `FT-` from 011 and `CH-` from 045 carries exactly one tier marker

- **Priority:** P1
- **Steps:** take every row of the Features table with an `FT-` numeric part of **11 or more**, and
  of the Process table with a `CH-` numeric part of **45 or more**; earlier rows are out of scope
  and never rewritten (`CH-043` and `CH-044` are the change that introduces the rule). In each, find
  every marker `Tier: <depth>; criteria: <list>`, anywhere in the row's cells.
- **Expected — passes:** exactly one marker; `<depth>` is `small`, `medium` or `large`; `<list>` is
  the literal `none` or a comma-separated list of ids, each one of `C1`…`C5` (`change-router`).
- **Expected — fails, naming the row and the reason:** no marker; two or more markers; a depth
  outside the three words; an id outside `C1`…`C5` (`C6`, `C0`, `X1`); an empty criteria list.
- **Why:** `TUNE-S2` round 6, item 2b (approved by the owner 2026-10-27): before it no ledger row
  classified a change by size, so no later round could check the tiering. `C6` is defect-only and
  is recorded on `FX-` rows through `LG-API-07`'s `Path:` marker instead.
- **Vacuity guard, two parts:** (1) a fixture in the spec — one row per depth with a sound list,
  one with `criteria: none`, one with `criteria: C1, C3` — passes; one row per failing form above
  is rejected for its own reason. Today no row is in scope, so without the fixture the case would
  pass having judged nothing. (2) The real Features and Process tables each parsed at least one row.
- **Control experiment:** add a scratch `CH-` row numbered 45 or more with no marker, confirm red
  naming it; add `Tier: small; criteria: none` and confirm green; then remove the row.

### LG-API-10 — every small-depth row carries exactly one `Cost:` clause

- **Priority:** P1
- **Steps:** take the rows `LG-API-09` holds in scope whose tier is `small`, and every `FX-` row
  numbered **56 or more** whose marker is `Path: short, below the threshold` — the small depth of a
  defect (`change-router`). Find every `Cost:` clause anywhere in the row's cells.
- **Expected — passes:** exactly one clause, either `Cost: <n> tokens, <n> dispatches, <n> min`
  with each `<n>` an integer in plain digits, or the literal `Cost: not measured` (the change was
  made in the main session with no completion notices to read).
- **Expected — fails, naming the row and the reason:** no clause; two or more clauses; a figure
  that is not an integer (`~5k`, `n/a`, `1.5`, `2,005,983`, empty). `medium` and `large` tiers, and
  `FX-` rows marked `full`, `medium` or `threshold overridden`, are not judged.
- **Why:** item 2c of the same round: a small change writes no profiling record, so this clause is
  the only way the small tier ever gets a cost figure (`docs/profiling/README.md`, "The Size block").
- **Vacuity guard:** a fixture — a sound measured row, a `not measured` row, one row per failing
  form, a short-path `FX-` row with a clause (passes) and one without (fails); plus a `medium` row
  and a `full` `FX-` row, both with no clause, that pass, so both filters are proven to run.
- **Control experiment:** a scratch `small` row without `Cost:` goes red naming it; add
  `Cost: not measured` and it goes green; then remove the row.

### LG-API-11 — the board's `readEpics` reads `docs/EPICS.md` as `LG-API-08` does

- **Priority:** P1
- **Steps:** import `readEpics` from `scripts/board.mjs` and run it over the real `docs/EPICS.md`;
  run the spec's own `parseEpics` (the parser `LG-API-08` uses) over the same text.
- **Expected — passes:** both yield the same epic IDs in the same order, and for each epic the same
  feature IDs in the same order and, per feature, the same task IDs.
- **Expected — fails, naming the first epic or feature that differs:** a different epic count
  (`board.mjs read 0 epics, the ledger spec read 11`), an epic missing or out of order, a feature
  missing from an epic, or a feature whose task list differs.
- **Why:** `FX-057`. `CH-043` (commit `741ef26`) saved `board.mjs` with mojibake — `·` became `Â·`
  inside both heading regexes — so `readEpics` matched no epic and the shipped board showed 0 epics,
  0 To Do tickets and every ticket in Done. `LG-API-08` checks `EPICS.md` with its own parser, and
  `readEpics`' comment cites `LG-API-08` though nothing exercised it: the board's correctness rested
  on review alone, and `CH-043` proved review does not catch it.
- **Vacuity guard:** before comparing, assert the spec's own parse of the real file found at least
  one epic and one feature (it finds 11 epics today), so two empty results cannot agree into green.
- **Control experiment:** on today's `board.mjs` the case is red with the 0-epics message; with `·`
  restored in both regexes it is green.
