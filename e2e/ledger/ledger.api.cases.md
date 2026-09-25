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

| ID        | Title                                                     | Priority |
| --------- | --------------------------------------------------------- | -------- |
| LG-API-01 | both ledger files exist and are not empty                 | P0       |
| LG-API-02 | IDs are unique and match `FT-`/`CH-`/`FX-`/`BL-`          | P0       |
| LG-API-03 | every changelog entry has its commit filled in            | P1       |
| LG-API-04 | commit references resolve in git                          | P1       |
| LG-API-05 | every backlog item has the "Conflicts with" column filled | P0       |
| LG-API-06 | no references to non-existent `BL-`/`FX-`/`FT-`/`CH-`     | P0       |

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
- **Expected:** the column is non-empty: either a hash, or the literal `pending` for an entry added
  by the current change. Additionally, if the ledger file has **no uncommitted edits** — meaning
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
