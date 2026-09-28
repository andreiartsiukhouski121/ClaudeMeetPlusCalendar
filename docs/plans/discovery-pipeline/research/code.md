# Research — code

What the repository already contains around "where a change's working material lives and who writes
it". Every statement cites what it came from.

## Where a change's paperwork lives today

- One flat file per change: `scripts/new-plan.mjs` copies a template to
  `docs/plans/<slug>.plan.md` — `scripts/new-plan.mjs`, the `target` it builds from `PLANS_DIR` and
  `${slug}.plan.md`.
- Five such files exist: `docs/plans/ci-pipeline.plan.md`, `english-migration.plan.md`,
  `skills-cleanup.plan.md`, `work-flows.plan.md`, `architecture-context.plan.md`.
- `docs/plans/` also holds two plan templates (`TEMPLATE.md`, `TEMPLATE-BUGFIX.md`), `README.md`,
  and four archive documents marked "ARCHIVE. Do not cite this document for conventions".
- **Not found:** anywhere for material that is neither a plan nor an archive — no directory, no
  convention, no command. Searched `docs/`, `scripts/`, `docs/plans/README.md`.

## What creates and what validates it

- Creation: `scripts/new-plan.mjs`, wired as `plan:new` in `package.json`. It substitutes the slug
  into the template heading and prints the next step.
- Validation: `scripts/check-orientation.mjs`. It reads `docs/plans/*.plan.md` — `activePlans()`
  filters `readdirSync(dir)` by the `.plan.md` suffix, **one level, no recursion**. A plan in a
  subdirectory would not be seen.
- It runs in `.husky/pre-commit` and inside `pnpm verify` (`package.json`, the `verify` script).

## Roles and what each may touch

- Eleven definitions in `.claude/agents/`: `lead.md`, `planner.md`, `implementer-api.md`,
  `implementer-web.md`, `plan-reviewer.md`, `code-reviewer.md`, `tester-unit.md`, `tester-api.md`,
  `tester-functional.md`, `tester-security.md`, `tester-acceptance.md`.
- A role's limits are its frontmatter `tools` list: `plan-reviewer.md` and `code-reviewer.md`
  declare `Read, Grep, Glob`; `lead.md` declares `Read, Grep, Glob, Bash, Agent, Skill` — no
  `Write`.
- `lead.md` is the only definition holding `Agent`, so it is the only role that currently dispatches.
- `planner.md` owns `docs/plans/**` and `docs/adr/**` and is the role that creates ADRs
  (`pnpm adr:new`).

## Whether a subagent can dispatch subagents

- **Verified by probe on this machine** (Claude Code 2.1.273): a `researcher` definition holding
  `Agent` dispatched `researcher-history` and returned its reply. The probe printed `NESTED-OK PING`.
- The same probing method established earlier that `.claude/agents/*.md` frontmatter is honoured and
  that the declared `tools` list is what the agent receives — recorded as the spike table in
  `docs/plans/architecture-context.plan.md`.

## Adjacent machinery a new stage would touch

- `scripts/new-adr.mjs` reads the ADR directory for the next free number and appends the index row.
- `scripts/fill-ledger-hash.mjs` addresses the ledger's last column by position.
- `.husky/pre-commit` runs orientation and `lint-staged`, and skips units when the index holds only
  markdown.
