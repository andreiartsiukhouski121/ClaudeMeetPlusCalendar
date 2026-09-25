---
name: feature-pipeline
description: Order of work for NEW functionality — orientation, assumption spike, requirements and architecture, task breakdown, plan review, implementation, code review, acceptance — and which role of the agent team owns each stage. Use when starting a new feature or a set of features, when planning implementation, when asked "plan this feature", "implement the feature", "build the features from this screenshot", or when a multi-agent pipeline is requested. For a defect, use the bugfix-pipeline skill.
---

This skill came out of reviewing the first iteration: two simple features (a login page and a
dashboard with three meetings) took about three hours, of which **100 minutes went to planning and
proofreading the plan and 85 to code**. What follows removes those 100 minutes without losing any
checks.

This is the flow for **new functionality**. If the behaviour is already promised by a case or an
invariant and the code does not match it, that is a defect and the flow is different: the
`bugfix-pipeline` skill. The distinction is not cosmetic — a feature designs behaviour, a bugfix
restores it, which is why a bugfix has no Contract and Data sections but does have Reproduction,
Cause and Impact.

Neighbours: `team-roles` for who does each stage, `project-context` for the documents they work
from, `regression-verify` for feature acceptance, `playwright-verify` for a single change.
Invariants, ports, "who runs what" and the ledger process live in `CLAUDE.md`; the suite convention
and run economics in `e2e/README.md`. They are deliberately not restated here: a copy of a rule
drifts from the original silently, which is how this repository earned `FX-023` and `FX-027`.

## Phases

| Phase                             | Where | Role                     | Input             | Output                                              |
| --------------------------------- | ----- | ------------------------ | ----------------- | --------------------------------------------------- |
| Orientation                       | §0    | `planner`                | a task            | five answers in section 0; or "this is a duplicate" |
| Assumption spike                  | §1    | `planner`                | orientation done  | a table of assumption → how proven → fact           |
| Requirements, architecture, tasks | §2    | `planner`                | the spike's facts | a 100–150 line plan: contract, data, tasks          |
| Plan review — **gate**            | §3    | `plan-reviewer`          | the plan          | blockers, or verdict `accept`                       |
| Implementation                    | §4    | `implementer-api`/`-web` | the plan accepted | code; parallel parts each in their own worktree     |
| Tests per level                   | §4    | the `tester-*` roles     | code ready        | cases plus green runs at each level touched         |
| Code review — **gate**            | §5    | `code-reviewer`          | the diff          | blockers, or verdict `accept`                       |
| Acceptance                        | §6    | `tester-acceptance`      | review passed     | a green `pnpm verify` and a report with numbers     |
| Ledger entry                      | §10   | `lead`                   | acceptance passed | an `FT-`/`CH-` row, closed `BL-` items              |

The `lead` sequences all of it and holds the gates; it writes nothing. Sections §7–§9 are
cross-cutting: what not to cut, the budget, and reporting as you go.

**A gate is passed by an artifact, not by an assurance.** No implementation before the plan review's
verdict; no acceptance before the code review's; no "done" before a green `pnpm verify`.

Phases are never reordered or skipped, but they **shrink with the task**: for a one-line change the
spike is a single run and the plan is three rows in the task section. A skipped phase is named out
loud rather than assumed.

## 0. Orientation — before anything else

**5 minutes.** Read [`docs/CHANGELOG.md`](../../../docs/CHANGELOG.md) and
[`docs/BACKLOG.md`](../../../docs/BACKLOG.md), the Rejected section included, then the architecture
corpus for the area you are touching — `docs/architecture.md`, `docs/adr/README.md`,
`docs/data-model.md`, `docs/api-contract.md` (what each owns is in `project-context`) — and only then
the code. Answer the five questions of section 0 in writing; the form is in
[`docs/plans/TEMPLATE.md`](../../../docs/plans/TEMPLATE.md), and it is what gets checked.

The fifth answer, **Architecture impact**, cites the ADR IDs the change touches or says "no
matches". It is there because re-deriving architecture from code gives you the current behaviour and
never the decision: the code cannot tell you that CORS is off deliberately, or that the third session
check is not redundant (`ADR-0015`).

The step is enforced: a plan is created with `pnpm plan:new <slug>`, and `pnpm check:orientation`
runs in `.husky/pre-commit` and in `pnpm verify`. An empty answer, a brush-off (`—`, `TODO`, `no`),
an answer under 20 characters, or a reference to a non-existent ledger entry fails the commit. What
the check **cannot** do is tell that a task duplicates another in substance: it proves the
orientation was done and written down, and review judges the answers. The line is drawn on purpose
— a check pretending to be smarter than it is does more harm than no check at all.

**If orientation shows a duplicate or a conflict, stop and say so** rather than planning on.
"Already done in `FX-007`" is a result, not a refusal.

Why it is mandatory: the ledger already holds two dozen defects, and half of them are invisible in
a diff (a vacuously passing meta-test, lint rules left at `warn`, a timing oracle, an endless
redirect on a broken cookie). A concrete example: `BL-009` (time zone from the profile) conflicts
with the pinned UTC that three unit cases rest on — visible only from the backlog.

## 1. Assumption spike — before the plan, not after

**7 minutes, throwaway code, no reasoning.** Prove the five to seven riskiest technical assumptions
by probe and hand back a table of assumption → how proven → fact.

Why this comes first: in the first iteration the plan review found nine blockers, and the four most
expensive were library behaviour — `@IsOptional()` on two DTO fields, the `@Max` boundary against a
case value, Playwright refusing to load a spec with a worker-scoped option. Each is provable by
twenty lines of code in minutes. Instead they were described in the plan, then two agents spent 25
minutes each reading it and assembling the same probes, then another spent 29 minutes rewriting the
plan around the findings. **A document review cannot replace running code** — it only catches what
the reader can simulate in their head.

Worth probing almost always:

- validation behaviour on missing, empty and extra fields;
- a framework's default response code (Nest answers POST with 201, not 200);
- test fixture scopes and limits (Playwright rejects `test.use` for a worker-scoped option **at
  runtime**; the types let it through);
- whether special imports resolve in the test runner (`server-only` under Vitest does not);
- how subprocess environments merge (`webServer.env` layers on top of `process.env`, not instead);
- **anything touching security**: whether the framework leaks its stack in headers, what lands in
  an error body, whether authentication rejection branches differ in timing, what is visible in the
  HTML and in the RSC stream. Three real defects here (`X-Powered-By`, the login timing oracle, the
  endless redirect on a broken cookie) were invisible in the diff and in the plan review — only a
  run found them.

Keep the probes in a scratchpad, not in the repository.

## 2. Requirements, architecture and task breakdown

All of it is one document: a plan from `docs/plans/TEMPLATE.md`, **100–150 lines**, built on the
spike's facts. Three things it must pin down, and why those three:

- **Contract** — method, path, authorization, request body, success response and **exact error
  bodies**. Error shapes come from the framework's source rather than memory: this repository broke
  on them twice already (invariants 1 and 8).
- **Data** — the seed as concrete values that tests can rely on. Absolute dates, no `Date.now()`;
  separate owners for mutating cases, since the store is shared.
- **Tasks** — numbered, with dependencies, **files** and a verifiable definition of done. The
  "files" column is not decoration: tasks overlapping on a file are not marked parallel, and a
  shared file (`app.module.ts`, `e2e/README.md`, the unit cases doc) becomes its own merge task.
  Without that column, "independent" tasks collide at merge time — which is what happened in the
  first iteration.

**An architectural decision is written as an ADR before the code, not after.** `pnpm adr:new <slug>`
takes the next number; the plan then cites the ID, and the code reviewer checks the implementation
against it. An ADR written afterwards is a justification, not a decision (`ADR-0015`). What counts as
architectural: the session scheme, module boundaries, the contract format, storage, a refused
dependency, a process rule everyone must follow.

What must **not** be in the plan: a list of test cases (they are written once, straight into
`e2e/regression/<feature>/*.cases.md`), a coverage matrix (that is
`e2e/suite-integrity.api.spec.ts`'s job), or invariants from `CLAUDE.md`.

The longer the plan, the more of it is work unrelated to the feature: three of the nine blockers in
the second review and **both** blockers in the third were bookkeeping introduced by edits to the
document itself — totals drifting apart, a reused case number, a broken table row.

## 3. Plan review — the first gate

**12 minutes, by the `plan-reviewer` agent — read-only, `opus`. The review has four questions:**

1. Completeness against the specification: every point has a task and will have a test.
2. Task dependencies: does a task of feature 1 need artifacts of feature 2 (in the first iteration
   three functional login cases needed the dashboard — their DoD was unreachable).
3. Conformance to the corpus and to the spike's facts: does the plan contradict an accepted ADR
   without superseding it, re-introduce something from the "refused" table in
   `docs/architecture.md`, or invent a second home for a fact that already has one.
4. Security of the new entry points: every endpoint has a guard and a DTO without owner or role
   fields; every protected page is checked in `proxy.ts` **and** in the server layer; every Server
   Action checks the session itself. Four questions, not a full audit — `e2e/security/**` catches
   the rest.

Library behaviour is **not** reviewed; the spike settled it. A second review happens only if the
first found an architecture-changing blocker: the "fixed it → rechecked → fixed it again" loop on
paper is more expensive than the same edits on live code, where a run catches them.

Who to call and how is in `requesting-code-review` and `team-roles`. In short: one plan review per
feature, the reviewer holds `Read`, `Grep` and `Glob` only, and returns a report as text rather than
an edit. Blockers go back to the `planner` unedited — the lead does not soften a verdict.

## 4. Implementation: parallelism means worktrees, and nothing else

The backend and the web side of one feature are almost always independent by file. But **two agents
in one working tree are not parallel**, however many ports they get: Next 16 registers its dev
server per project directory, so a second `next dev` starts on no port at all and Playwright's
`webServer` never comes up (the symptom and details are in `CLAUDE.md`). On top of that:
`test-results/`, `playwright-report/` and `storageState` files are shared paths with identical
names; the shared `JWT_SECRET: 'e2e-secret'` means one run's token is accepted by the other's
server — and that divergence is **silent**; and `.git/index.lock` and `node_modules` collide too.

Hence the rule: **a parallel stage means one git worktree per agent.** Different ports
(`E2E_WEB_PORT=3200 E2E_API_PORT=3201 pnpm e2e`) only matter afterwards, so two worktrees do not
collide on 3100/3101.

How the worktree is created is a property of the machine, not the project. This machine has a
machine-wide `agent-team` skill (the `claude-team` CLI): one worktree and one Windows Terminal
window per agent. It is not part of the project pipeline and does not live in the repository —
another machine may not have it, and there a worktree is created by hand (`git worktree add`). The
requirement is the worktree; `agent-team` is one way to satisfy it.

**What follows from the mechanism rather than from preference:**

- an agent in its own window is a **separate `claude` process with no shared context**. Its prompt
  must be self-contained: the task, the paths, the constraints. "Read `CLAUDE.md` and section `T1`
  of the plan" — yes; retelling eight documents with section numbers — no (the documentation corpus
  is ~250k tokens, and five agents reading half of it is ≈29% of an iteration's spend);
- **you cannot see what it is doing and cannot steer it.** The result is inspected afterwards, from
  its worktree's `git log` and `git diff`. Do not report progress for such agents: you have none;
- merging is a separate deliberate step, not a consequence of a window closing.

Check as well that the tasks do not overlap by file: in the first iteration the backend and the web
side of one feature both needed to edit `e2e/README.md` and the unit cases doc, while
`app.module.ts` was edited by both features. Such files are either assigned to one agent or edited
after the merge.

**Implementers write product code; testers write the tests.** `apps/**/src/**` that is not a spec
belongs to `implementer-api` / `implementer-web`; `e2e/**`, `**/*.spec.ts` and `*.cases.md` belong to
the `tester-*` roles (`ADR-0014`). The two run against each other rather than the same agent grading
its own homework, and the split is by file, so it is checkable. An implementer who notices a missing
case reports it; they do not add it.

## 5. Code review — the second gate

By the `code-reviewer` agent: read-only, `opus`, one review per feature, **after** the implementers
and the testers are done and **before** acceptance. It reads the diff against the accepted plan, the
nineteen invariants and the corpus, and answers whether the code does what was planned, whether a
deviation is an improvement or a problem, and whether the documents stayed behind. The full
checklist is in the agent definition; when to call one at all is in `requesting-code-review`.

It reviews, it does not run. Runs are the testers' step, and their reports are inputs to this one.

## Roles, models and permissions

Roles are **files**, not parameters: `.claude/agents/*.md` fixes each role's tool list and model, so
routing does not depend on the orchestrator remembering to pass one. The contract — who owns which
files, who may not do what, and how a brief is handed over — is in the `team-roles` skill.

Why it is a file and not a convention: in the first iteration all ten agents inherited the parent's
model because the parameter was never passed, and a mechanical markdown edit ran on the most
expensive model available; plan review reached 1,005,347 tokens, 46% of the spend, without a line of
product code. Separately, an audit found the reviewer holding write access to every file — because
"do not fix things while you are there" lived only in prose. A tool list is the mechanism (`ADR-0014`,
closing `BL-014`).

Not every stage needs its own worktree. The spike, the reviews and reading run output are in-process
subagents in the current tree; only stages that **run the application** need isolation, and then the
unit of isolation is a git worktree (§4).

## 6. Acceptance

Through the `regression-verify` skill. What matters for speed: **one `pnpm verify`** rather than a
series of `--grep` calls (measurements are in `e2e/README.md`, "Run economics"); do not run the
units by hand; and a repeated full run adds almost nothing — a targeted control experiment does
more.

For a feature the size of "a page plus two endpoints" a separate acceptance agent is unnecessary:
the implementer's DoD with control experiments _is_ the acceptance. Diff-level security review goes
through the built-in `security-review` skill: it looks at the branch's changes and complements the
automated cases rather than replacing them.

## 7. What not to cut

- **Control experiments.** One `sed` plus a filtered run. They are what exposed the meta-test that
  scanned the wrong directory, found zero files and therefore went green under **any** violation of
  the convention. Neither types, nor lint, nor review sees that.
- **The `.cases.md` ↔ spec pairing and the convention meta-test.** Written once, works forever.
- **An actual run before the word "done".** It separates a result from a report of a result.

## 8. Time budget

For a feature the size of "a page plus two endpoints": spike 7, plan 10, review 12, implementation
25, acceptance 10, security 3 — **about 70 minutes**, and that is the floor. The pipeline audit
recomputed it against observed agent durations (minimum 8.7 minutes, median 21.4) and got **70
minutes with a narrow review and 85 with a full one**. There is no slack in those numbers: going
back to a full plan review costs +15 minutes. If it comes out twice as long, the cause is almost
always the size of the plan or the number of review iterations, not the difficulty of the code.

## 9. Reporting as you go

The user cannot see what happens inside a background agent and cannot tell long work from a loop.
Say what is done and what is left in your interim messages: the stage, how many remain, where the
result lives.

About agents in separate worktrees, say only what you actually know: how many windows are running
and with what tasks. **Their progress is unavailable to you** — do not retell it and do not guess.
When the user asks for a result, the answer lives in that worktree's `git log`/`git diff`, not in a
guess.

## 10. The ledger entry is part of the work

A task is not closed until `docs/CHANGELOG.md` has a row: a feature → `FT-`, a process change →
`CH-`, every defect found → `FX-` with the "Found by" column. A newly discovered gap → a `BL-` item
with "Conflicts with" filled in; a closed backlog item is marked closed with a reference and is
**never deleted**. The full rules are in `CLAUDE.md`, the commit order in the `git-commit` skill.

The "Found by" column is the only way to learn which checks actually work: today's ledger shows the
control experiments and the security suite found three defects each, and diff review found none.
