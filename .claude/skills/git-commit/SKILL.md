---
name: git-commit
description: Committing in this repository — conventional commits plus the mandatory ledger process. Use when the user asks to commit, mentions "/commit", or when finished work needs to land in git.
---

Adapter for the external `git-commit` skill (`github/awesome-copilot`). The original is at
`.agents/skills/git-commit/SKILL.md`, restored with `pnpm skills:sync`. **This file is
self-contained:** everything needed for a commit is here, and the original is only for comparing
against upstream. The message format comes from it; everything else is stricter, because here a
commit is part of the ledger process rather than just a git record.

## The message

Conventional commits: `<type>(<scope>): <description>`, types
`feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert`. **Descriptions are in English**, in
the imperative, up to 72 characters in the subject. The repository switched to English in `CH-014`;
commits before that are Russian and are not rewritten.

**Keep the `Co-Authored-By` trailer** — it appears in nearly the whole history, and a commit
without it stands out. The line comes from the environment's requirements and goes last, after a
blank line.

## The ledger process is part of the commit, not an afterthought

1. **A `docs/CHANGELOG.md` entry is mandatory**: a feature → `FT-`, a process change → `CH-`, every
   defect found → `FX-` with the "Found by" column. The `Commit` column of a new entry is the
   literal `pending`.
2. **The next commit runs `pnpm ledger:fill`.** The hash cannot be known before the commit, and
   `--amend` would change it again. That ledger edit needs no entry of its own.
3. **Do not split work into commits without reason.** Rule `LG-API-03`: `pending` is legitimate
   only while it was introduced by the `HEAD` commit. Any intermediate commit that does not fill
   the hashes makes the entries stale and fails the run. "One logical commit per change" from the
   original skill means **one change, one commit** here, not a split by file type.

## Prohibitions

- **Never `--no-verify`.** The `pre-commit` hook runs orientation, `lint-staged` and the units; if
  it fails, fix the cause. It is the lower bound of quality (see "Who runs what" in `CLAUDE.md`).
- **Never `--amend`** on work already handed over: the ledger references the hash.
- **No blind `git add -A`.** A parallel agent may be working in this tree — on 2026-09-15 that is
  how someone else's edits reached the index. Read `git status` and add paths by name.
- Secrets are never committed: `.env`, keys, tokens. `SEC-API-10` inspects the working tree, not the
  history (`BL-012`).

## The order

```bash
git status --short          # whose edits are in the tree besides yours
git diff --staged           # what will actually go in
git add <paths>             # by name
git commit -m "<type>: <description>

Co-Authored-By: ..."
pnpm ledger:fill            # as the next commit, if an entry was added
```
