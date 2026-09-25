# Plan: architecture-context

> A process change rather than a feature: it adds the documents every later task plans from, and the
> roles that do the planning. Written against `docs/plans/TEMPLATE.md`; the Contract and Data
> sections are answered in terms of documents and role boundaries, since no runtime behaviour
> changes.

## 0. Orientation: what the project already has

- **Duplicate:** no matches for the corpus itself — `docs/` held `CHANGELOG.md`, `BACKLOG.md`,
  `security.md` and the archived plans, none of which describes the architecture as current state.
  The closest existing work is `CH-012` (the skills cleanup, which removed duplicated rules) and
  `CH-013` (the two workflows); this extends both rather than repeating them. The agent-role half
  has a direct predecessor in the backlog rather than the changelog — see below.
- **Conflicts with shipped:** touches `check-orientation.mjs` and both plan templates (a fifth
  section-0 question), `e2e/process/process.api.spec.ts` (`REQUIRED_LABELS`), `suite-integrity`'s
  `KNOWN_CASE_PREFIXES`, `e2e/README.md`, the root and package `CLAUDE.md` files, and five skills.
  No invariant changes and no runtime code is touched. The four existing plans need the new answer
  backfilled or `pnpm check:orientation` fails on them.
- **Conflicts with planned:** closes `BL-014` (verify the `.claude/agents` frontmatter schema and
  define role→model agents) — the schema is now verified on this machine rather than guessed.
  Adjacent to `BL-013` (worktree tooling), which stays open: this change defines the roles, not how
  a worktree is created for them.
- **Architecture impact:** the change **is** two decisions, written first as `ADR-0014` (roles are
  fixed agent definitions with their own tools and model) and `ADR-0015` (the corpus is the
  mandatory planning context). It also records thirteen decisions already in force but never written
  down — `ADR-0001` through `ADR-0013` — so the log describes the system as it is before it is used
  to judge anything new. No accepted decision is changed or superseded.
- **Open questions:** "tests" is ambiguous in a role split — the resolution taken is that test
  artifacts (`e2e/**`, `**/*.spec.ts`, `*.cases.md`) belong to the tester roles and product code to
  the implementers, which is stated in `ADR-0014` rather than left implied. "Architecture" was also
  ambiguous between the shape of the system and the reasoning behind it; the corpus splits them
  (`architecture.md` versus `adr/`).

## 1. Spike: how the risky assumptions were proven

| Assumption                                           | How it was proven                                                                       | Fact                                                            |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `.claude/agents/*.md` frontmatter is honoured here   | wrote a probe agent, ran `claude -p` asking for the agent-type listing                  | registered as a `subagent_type`; this closes `BL-014`           |
| the declared `tools` list is what the agent gets     | asked the listing to print the tool list verbatim                                       | printed exactly as declared, MCP tool names included            |
| eleven definitions all load                          | re-ran the listing after writing them                                                   | all eleven appear; none was dropped for a bad field             |
| routes can be compared to the contract by string     | scanned `@Controller`/`@Get`/`@Post` and the Routes table, compared both ways           | exact match — possible only because there is no global prefix   |
| the new meta-test fails when the documents drift     | control experiment: renamed a route in the contract, deleted a `PROTECTED_ROUTES` entry | `AR-API-05` and `AR-API-06` both went red; reverted, both green |
| a fifth orientation label does not break the checker | added it, ran `pnpm check:orientation` against the four existing plans                  | failed with the expected message until each plan answered it    |

## 2. Contract

No HTTP contract changes. The contract this change introduces is between roles and documents:

- **`docs/architecture.md`** owns the shape, the layers, the patterns used and refused.
- **`docs/adr/`** owns the reasoning, one immutable record per decision, created by `pnpm adr:new`.
- **`docs/data-model.md`** owns entities, formats, lifetimes and the flows.
- **`docs/api-contract.md`** owns the endpoints — and its Routes table is now the machine-checked
  mirror of the controllers.
- Every document is **disjoint**: a fact lives in one, the rest link.

## 3. Data

No seed or entity changes. The data added is the ADR log itself: fifteen records, numbered
`ADR-0001`…`ADR-0015`, each with Status, Date, Supersedes, Superseded by, and the three mandatory
sections. Numbering comes from `pnpm adr:new`, never by hand.

## 4. Tasks

| ID  | What to do                                             | Files                                                                                                     | Done when                                                | Depends on |
| --- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ---------- |
| T1  | Write the corpus                                       | `docs/architecture.md`, `docs/adr/**`, `data-model.md`, `api-contract.md`                                 | four documents exist, disjoint, cross-linked             | —          |
| T2  | Define the eleven roles                                | `.claude/agents/*.md`                                                                                     | all eleven register as `subagent_type`                   | —          |
| T3  | Add the `team-roles` and `project-context` skills      | `.claude/skills/*/SKILL.md`                                                                               | both load; roles and documents match T1/T2               | T1, T2     |
| T4  | Rewire the existing skills to the roles and the corpus | `feature-pipeline`, `bugfix-pipeline`, `requesting-code-review`, `regression-verify`, `playwright-verify` | each stage names its role; no rule is copied             | T3         |
| T5  | Add the fifth orientation question                     | both templates, `check-orientation.mjs`, `process.api.spec.ts`                                            | `PR-API-01` green; the checker demands the answer        | T1         |
| T6  | Backfill the four existing plans                       | `docs/plans/*.plan.md`                                                                                    | `pnpm check:orientation` green                           | T5         |
| T7  | Add `pnpm adr:new`                                     | `scripts/new-adr.mjs`, `package.json`                                                                     | creates a numbered record and its index row              | T1         |
| T8  | Add the `AR-API-*` meta-test                           | `e2e/architecture/**`, `suite-integrity`, `e2e/README.md`                                                 | 8 cases green; control experiment red then green         | T1, T2, T7 |
| T9  | Update the rules files                                 | root and package `CLAUDE.md`, `docs/plans/README.md`                                                      | the corpus and the team are findable from the root       | T1–T8      |
| T10 | Ledger and acceptance                                  | `docs/CHANGELOG.md`, `docs/BACKLOG.md`                                                                    | `CH-015`, `CH-016`, `BL-014` closed, green `pnpm verify` | T1–T9      |

T1 and T2 do not overlap by file and could run in parallel; everything after T3 shares files with
its predecessors and is sequential.

## 5. Risks

- **The corpus becomes a fifth place a rule lives.** Mitigated by making the documents disjoint and
  by linking rather than restating; the risk is real and is exactly what `FX-023` and `FX-027` were.
- **The role split slows small changes.** Mitigated by the explicit short path: `bugfix-pipeline` §4
  and the "when the team is the wrong tool" section of `team-roles`.
- **`AR-API-05` compares by string**, so a route built from a template or a dynamic prefix would not
  be seen. Acceptable while there is no global prefix (`ADR-0005`); it is named as a known gap.

## 6. Assumptions and deliberate omissions

- The prose of `architecture.md` is **not** machine-checked; only the ADR log, the routes and the
  agent definitions are. Stated rather than implied.
- `docs/data-model.md` has no drift check against the DTO types — filed as a backlog item rather
  than built now: matching prose tables to TypeScript shapes reliably is a larger job than the
  routes comparison.
- The role file-ownership boundary is enforced by the tool lists and by review, not by a path check
  in CI. Also filed.
- Nothing in `apps/**/src/**` changes, so no new regression or security cases were needed; the
  meta-test is the only new suite.
