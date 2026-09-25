# Plan: skills-cleanup

Bringing the seven skills in `.claude/skills/` into a consistent state: remove mutually exclusive
prescriptions, consolidate duplicated facts into one source, make restoring the external sets
possible. A process task — it touches no product code.

## 0. Orientation: what the project already has

- **Duplicate:** partly. `CH-005` and `FX-013`/`FX-014` closed findings of the pipeline audit of
  2026-09-08, but three of its fixes were never applied (the measurements paragraph living in four
  files, the canonical status of the archived plans, `agent-team` living outside the repository),
  and `CH-011` added a new layer the audit never saw. Nothing closes the task in full.
- **Conflicts with shipped:** touches `.claude/skills/**`, `CLAUDE.md`, `README.md`,
  `e2e/README.md`, `docs/plans/README.md`, both archived plans and `skills-lock.json`. No invariant
  changes in substance — what changes is where it is stored: copies become references. Test cases
  are untouched apart from `LG-API-*`, which sees new ledger entries.
- **Conflicts with planned:** `BL-013` (worktree tooling) overlaps partly — the plan fixes
  worktrees as the only path to parallelism but builds no tooling, so the item stays open;
  `BL-014` (`.claude/agents/*.md` definitions) stays open and is now referenced by the rewritten
  `feature-pipeline` §5. No other matches.
- **Open questions:** the term "parallel development" is used for two different mechanisms —
  worktree agents (separate processes with no shared context) and in-process subagents of the
  `Agent` tool. The customer chose the first as the only one; the second stays for sequential
  roles. "Adapter" is clarified too: an adapter must work without `.agents/`.

The Rejected section of the backlog does not contain this task.

## 1. Spike: how the risky assumptions were proven

| Assumption                                         | How it was proven                          | Fact                                                                |
| -------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------- |
| "41 units + 62 e2e" is still true                  | `pnpm exec playwright test --list`         | **85 tests in 10 files**; 42 units — every copy was wrong           |
| `pnpm verify` takes "1 m 31 s"                     | timing the full run                        | **137 s**, and it was **red**: `pnpm audit` found 3 high            |
| `skills.sh` exists in this environment             | `which`, search in repo and `~/.local/bin` | It exists nowhere                                                   |
| The lock file can restore a set                    | reading the file                           | Neither a `ref` nor a commit — only a content hash                  |
| Upstream SHAs are reachable without the GitHub API | `git ls-remote <url> HEAD`                 | Yes; the REST API meanwhile returns `rate limit exceeded`           |
| `heroui-react` is used in the project              | `grep -r "@heroui" apps/ packages/`        | Zero occurrences; no adapter either                                 |
| `multer` is a direct dependency                    | `pnpm why multer -r`                       | Transitive from `@nestjs/platform-express@12.0.1` → override needed |

## 2. Contract

Not applicable: no HTTP endpoints are added or changed.

## 3. Data

Not applicable: the seed and the fixtures are untouched.

## 4. Tasks

| ID  | What to do                                                                                    | Files                                                                | Done when                                                            | Depends on |
| --- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------- |
| S1  | Remove the parallelism contradiction: worktrees are the only path; rewrite the agent guidance | `feature-pipeline` §4, §5, §9                                        | One mechanism across §4/§5/§9; §9 no longer reports foreign progress | —          |
| S2  | Make reviewer permissions agree (read-only)                                                   | `feature-pipeline` §5, `requesting-code-review`                      | Both texts say `Read`/`Grep`/`Glob` and say where the report goes    | —          |
| S3  | Strip the archived plans of canonical status                                                  | `e2e/README.md`, `docs/plans/README.md`, both `feature-plan-*.md`    | No live document sends the reader to the plans for conventions       | —          |
| S4  | Consolidate run measurements into one source and re-measure                                   | `e2e/README.md` (canonical) plus the four referring documents        | The numbers appear once, match reality and carry a measurement date  | S9         |
| S5  | Deduplicate facts: ports, Next's directory registration, locators, `PROTECTED_*`, the ledger  | the three own skills, `CLAUDE.md`, `e2e/README.md`                   | Each fact lives in one place, the rest reference it                  | S4         |
| S6  | Separate the triggers of `playwright-verify` and `regression-verify`                          | the `description` of both skills                                     | No phrase leads into both at once                                    | —          |
| S7  | Make restoring the external skills possible                                                   | `scripts/skills-sync.mjs`, `skills-lock.json`, `package.json`        | `pnpm skills:check` green; each set has a `ref` and a commit         | —          |
| S8  | Drop `heroui-react` and make the inventory match                                              | `skills-lock.json`, `.agents/`, `CLAUDE.md`                          | Four sets, four adapters, the count adds up                          | S7         |
| S9  | Fix the red `pnpm audit`: override `multer` ≥ 2.3.0                                           | `pnpm-workspace.yaml`, `pnpm-lock.yaml`                              | `pnpm audit --audit-level high` green                                | —          |
| S10 | Small fixes: "three questions" → four, "seventeen defects" → 23, the `verify` composition     | `feature-pipeline`, `TEMPLATE.md`, `regression-verify`, `git-commit` | Numbers and lists match reality                                      | —          |
| S11 | Ledger entries: `FX-024`…`FX-029`, `CH-012`, `BL-018`                                         | `docs/CHANGELOG.md`                                                  | `pnpm e2e e2e/ledger` green                                          | S1–S10     |
| S12 | Acceptance: `pnpm format`, one `pnpm verify`, commit, `pnpm ledger:fill`                      | —                                                                    | `pnpm verify` green end to end                                       | S11        |

Parallelism is unnecessary here: every task edits an overlapping set of markdown files
(`CLAUDE.md` is touched by S4, S5 and S8), so they run sequentially in one tree.

## 5. Risks

- **Deduplication can carry the meaning away.** A reference instead of a copy works while the
  source is guaranteed to be in context. `CLAUDE.md` always is, `e2e/README.md` is not, so the
  skills keep one line of substance plus the reference rather than a bare pointer.
- **`skills-sync` goes to the network.** The script is not wired into `pnpm verify`: otherwise the
  check would stop working offline — exactly the mistake the audit already found with `pnpm audit`.
- **The `multer` override changes the dependency tree** of a transitive Nest library. It is checked
  by the same `pnpm verify`: the supertest module check and the whole API suite go through
  platform-express.

## 6. Assumptions and deliberate omissions

- **Halving the skills was never the goal and did not happen.** The three own skills went from 726
  lines to 588 (−19%), and there is nothing left to cut: the remainder is troubleshooting, the
  blocker list and the review checklist — content that exists nowhere else. The criterion for S5 is
  "no facts duplicated from `CLAUDE.md` and `e2e/README.md`", not a line count.
- **`agent-team` is not moved into the repository.** It is machine-wide and not tied to this
  project. Instead the skills stop treating it as part of the project pipeline: worktrees are the
  requirement, `agent-team` is one way to get one.
- **`BL-013` and `BL-014` are not closed** — the worktree tooling and the `.claude/agents/*.md`
  definitions are out of scope.
- **The suite size rule, the meta-test gaps and automating the control experiments** (audit
  findings) are untouched: that is work on the suite, not on the skills.
- **The external sets are not vendored**, with one exception: the reviewer prompt template moved
  into the adapter, because without it `requesting-code-review` loses its subject.
