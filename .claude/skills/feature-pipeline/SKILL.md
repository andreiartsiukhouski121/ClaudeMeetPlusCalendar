---
name: feature-pipeline
description: Order of work for NEW functionality — orientation, assumption spike, requirements and architecture, task breakdown, plan review, test design, red tests, implementation, integration and end-to-end tests, code review, acceptance — and which role of the agent team owns each stage. Use when starting a new feature or a set of features, when planning implementation, when asked "plan this feature", "implement the feature", "build the features from this screenshot", or when a multi-agent pipeline is requested. For a defect, use the bugfix-pipeline skill.
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

Each stage's artifact is the next stage's context, and the whole of it lives in one folder:
`docs/plans/<slug>/`, created by `pnpm change:new <slug>`.

The stages, their gates, their order and their IDs (`FEAT-S1`…`FEAT-S11`, `FEAT-G1`…`FEAT-G4`)
are in [`docs/process.md`](../../../docs/process.md) — the single home for that inventory
(`ADR-0020`). They are not repeated here: this file owns the **procedure**, what each stage does and
what it costs to run it badly, and a second table of stages would drift against the first the way
`FX-023`, `FX-027`, `FX-031` and `FX-032` all did.

A cycle also ends with a profiling record (`FEAT-S8`, `ADR-0020`): the numbers exist only while the
hand-backs are still in front of you, and `docs/profiling/` is what the `pipeline-tuning` skill reads
when this flow is itself the thing being changed.

The `lead` sequences all of it and holds the gates; it writes nothing. Sections §9–§11 are
cross-cutting: what not to cut, the budget, and reporting as you go.

**A gate is passed by an artifact, not by an assurance.** No design before the research review's
verdict; no plan before the design review's; no implementation before the plan review's; no
acceptance before the code review's; no "done" before a green `pnpm verify`.

**Every blocker in a verdict carries a label, `shape` or `correction`.** `shape` means the artifact's
decisions change; `correction` means the artifact is right and a statement in it is wrong, mispointed
or stale. A verdict with any `shape` blocker re-runs the stage, as today. A verdict whose blockers
are **all** `correction` is answered by a narrow dispatch to the role that owns the artifact — naming
the blockers and the file, without re-reading the change folder. The label is the reviewer's call;
`lead` holds the gate, and a `correction` blocker that turns out to change a decision is escalated
the way a disputed test already is (§6).

Phases are never reordered or skipped, but they **shrink with the task**: for a small change the
research is one sweep and the plan is three rows in the task section. A skipped phase is named out
loud rather than assumed — and for work below the `bugfix-pipeline` §4 threshold, the whole
discovery half is skipped by design, not by omission.

## 0. Research — the first thing that happens

**Before anything else, including orientation.** The requirement arrives; the question is what this
project already contains that bears on it. Run by the `researcher` agent, which dispatches four
sweeps — code, contract, tests, history — and assembles `docs/plans/<slug>/research/README.md`. The
procedure is in the `research-protocol` skill.

**The rule that makes it worth having: record only what is in the project, never what you concluded
from it.** Every statement carries a citation; anything uncitable is an open question or a
`Not found` line, and "nothing here covers X" is a finding. A sweep that quietly designs makes the
design unreviewable, because its reasoning arrives already wrapped in a conclusion.

**Probes belong here.** Five to seven of the riskiest technical assumptions are proven with
throwaway code in a scratchpad, and the command with its output becomes the citation. In the first
iteration the plan review found nine blockers, and the four most expensive were library behaviour —
`@IsOptional()` on two DTO fields, the `@Max` boundary against a case value, Playwright refusing to
load a spec with a worker-scoped option. Each was provable in minutes by twenty lines of code.
Instead they were described in the plan, two agents spent 25 minutes each re-deriving them, and a
third spent 29 minutes rewriting the plan around the findings. **A document review cannot replace
running code** — it only catches what the reader can simulate in their head.

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

Probe code stays in a scratchpad and never lands in the repository; the **fact** lands in
`research/code.md`.

## 1. Research review — the first gate

By `research-reviewer`: read-only, `opus`. It opens citations and checks they say what they are
quoted as saying, hunts for inference recorded as fact, checks the requirement's surface was
covered, and confirms contradictions were **named rather than resolved**.

Its **Gaps to carry forward** section is part of the deliverable: unknowns that reach the designer
unannounced come back as rework.

Its verdict labels each blocker `shape` or `correction` ("Phases", above); only a `shape` blocker
sends the research back for a full re-run.

## 2. Design — the shape, not the order

By `designer`, from the accepted research folder. The sections and the rules are in the
`design-protocol` skill; the scaffold is `docs/plans/SCAFFOLD-DESIGN.md`. In short, it pins down:

- **Contract** — method, path, authorization, request body, success response and **exact error
  bodies**. Error shapes come from the framework's behaviour rather than memory: this repository
  broke on them twice already (invariants 1 and 8).
- **Data** — the seed as concrete values that tests can rely on. Absolute dates, no `Date.now()`;
  separate owners for mutating cases, since the store is shared.
- **Alternatives rejected**, each with a reason that would still make sense to someone who preferred
  it. This is what stops the same option being re-proposed at every later gate.

**An architectural decision is written as an ADR before the code, not after.** `pnpm adr:new <slug>`
takes the next number; the design cites the ID, and the code reviewer checks the implementation
against it. An ADR written afterwards is a justification, not a decision (`ADR-0015`). What counts as
architectural: the session scheme, module boundaries, the contract format, storage, a refused
dependency, a process rule everyone must follow.

Every load-bearing fact traces to `research/`. A fact appearing for the first time in the design is
an assumption, and the gate treats it as one.

## 3. Design review — the second gate

By `design-reviewer`: read-only, `opus`. Five questions — does it follow from the research, does it
fit the architecture and the ADRs, are the contract and the data exact, were the alternatives real,
is anything new secure (invariants 16–19).

This is the last gate before the shape becomes expensive to change: a blocker here costs a
paragraph; the same blocker during implementation costs an iteration.

Its verdict labels each blocker `shape` or `correction` ("Phases", above); only a `shape` blocker
sends the design back for a full re-run.

## 4. The plan — orientation and the task breakdown

By `planner`, from `research/` and `design.md`, into `<slug>.plan.md`. **100–150 lines.**

**Section 0 "Orientation" is where the record gets judged.** The history sweep already _retrieved_
the ledger, the backlog and the ADR log; orientation _decides_ what follows from them — is this a
duplicate, does it conflict with something shipped or planned, which decisions does it touch. That
split is deliberate: retrieval is cheap and mechanical, judgement is neither.

The step is enforced. `pnpm check:orientation` runs in `.husky/pre-commit` and in `pnpm verify`: an
empty answer, a brush-off (`—`, `TODO`, `no`), an answer under 20 characters, untouched template
text, a citation of a non-existent ledger entry or a non-existent ADR all fail the commit. What the
check **cannot** do is tell that a task duplicates another in substance: it proves the orientation
was done and written down, and review judges the answers. The line is drawn on purpose — a check
pretending to be smarter than it is does more harm than no check at all.

**If orientation shows a duplicate or a conflict, stop and say so** rather than planning on.
"Already done in `FX-007`" is a result, not a refusal. A concrete example of why it is worth the
minutes: `BL-009` (time zone from the profile) conflicts with the pinned UTC that three unit cases
rest on — visible only from the backlog.

The rest of the plan is **tasks**: numbered, with dependencies, **files** and a verifiable definition
of done. The "files" column is not decoration — tasks overlapping on a file are not marked parallel,
and a shared file (`app.module.ts`, `e2e/README.md`, the unit cases doc) becomes its own merge task.
Without that column, "independent" tasks collide at merge time, which is what happened in the first
iteration.

What must **not** be in the plan: a re-statement of the design, a coverage matrix (that is
`e2e/suite-integrity.api.spec.ts`'s job), or invariants from `CLAUDE.md`. Scenarios are designed at
`FEAT-S9`, by `test-designer`, into the homes §5a below names — the plan still does not restate them,
it only names the tasks that will need one. The task table itself gains no new column for this:
after it, the plan carries a short subsection, **"Tests this change is expected to break"** — case
IDs, why each goes red, and which task closes the window (`docs/plans/TEMPLATE.md`). Most changes
write "none" there; it exists for the ones that do not, so an expected break is distinguished from
an unmarked one when a red test is found later.

The longer the plan, the more of it is work unrelated to the feature: three of the nine blockers in
the second review and **both** blockers in the third were bookkeeping introduced by edits to the
document itself — totals drifting apart, a reused case number, a broken table row.

## 5. Plan review — the third gate

**By the `plan-reviewer` agent — read-only, `opus`. Four questions:**

1. Completeness against the design: every part of the shape has a task and will have a test.
2. Task dependencies: does a task of feature 1 need artifacts of feature 2 (in the first iteration
   three functional login cases needed the dashboard — their DoD was unreachable).
3. Conformance: does the plan quietly re-decide the design, contradict an accepted ADR without
   superseding it, or invent a second home for a fact that already has one.
4. Security of the new entry points: every endpoint has a guard and a DTO without owner or role
   fields; every protected page is checked in `proxy.ts` **and** in the server layer; every Server
   Action checks the session itself. Four questions, not a full audit — `e2e/security/**` catches
   the rest.

Library behaviour is **not** reviewed; the probes in §0 settled it. A second review happens only if
the first found a blocker that changes the shape — and then it goes back to the design stage, not
round again here: the "fixed it → rechecked → fixed it again" loop on paper is more expensive than
the same edits on live code, where a run catches them.

Who to call and how is in `requesting-code-review` and `team-roles`. Blockers go back to the role
that owns the artifact, unedited — the lead does not soften a verdict.

Its verdict labels each blocker `shape` or `correction` ("Phases", above); only a `shape` blocker
sends the plan back for a full re-run — the "second review happens only if the first found a blocker
that changes the shape" rule above is now the mechanical reading of that label, not a separate
judgement.

## 5a. Test design, then the red run

Two stages, both before the implementer touches a file.

**`FEAT-S9`, test design, by `test-designer`.** From the accepted plan and design, before any spec
or product code exists: scenarios for every level the change touches, written straight into their
`.cases.md` homes — unit, API and functional keep their present homes
(`e2e/regression/<feature>/<feature>.{unit,api,functional}.cases.md`); a module-level check exercised
without a browser is **integration**, `e2e/regression/<feature>/<feature>.integration.cases.md`, IDs
typed `-INT-`, run by the `integration` Playwright project (the `request` fixture, no browser — the
same mechanism the `api` project already uses, just its own project so the filename suffix keeps
routing the file); an end-to-end journey that crosses **two or more features** gets its own
extendable area file, `e2e/journeys/<area>/<area>.functional.cases.md`, read and extended rather than
duplicated — a scenario that stays inside one feature stays in that feature's own
`.functional.cases.md`. A new area or feature prefix goes into `KNOWN_CASE_PREFIXES`
(`e2e/suite-integrity.api.spec.ts`), or the unregistered-prefix guard goes red — by design.

Tags reuse the vocabulary that already exists rather than adding synonyms: `@unit`, `@api`, `@e2e`
and `@integration` for the level (Vitest units carry none — the case ID already encodes it and
`pnpm test:<feature>` filters on that), the existing per-feature tag, `@p0`/`@mutating` where they
apply. A meta-test checks that a level tag matches the file's own suffix, so a tag cannot drift from
the project the spec actually runs in. Budget: scenario text for one feature stays at or under 200
lines per level file, the same discipline the plan and the design already carry — this stage inherits
the `bugfix-pipeline` §4 threshold too: below it there is no change folder and no test design, only a
red test, the fix, an `FX-` entry.

**`FEAT-S10`, red tests (unit and API), by `tester-unit` and `tester-api`.** Specs for the scenarios
`test-designer` wrote, each one run and recorded failing **for the reason it was written for** — not
a 404, a typo or an import error, which is a broken test rather than a red one. Integration and
end-to-end specs are not written yet; they wait for `FEAT-S11`, after the implementation below is
green at this level.

## 6. Implementation: parallelism means worktrees, and nothing else

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
  is ~250k tokens, and five agents reading half of it is ≈29% of an iteration's spend — measured
  2026-09-08, `docs/pipeline-audit.md`, marked ARCHIVE);
- **you cannot see what it is doing and cannot steer it.** The result is inspected afterwards, from
  its worktree's `git log` and `git diff`. Do not report progress for such agents: you have none;
- merging is a separate deliberate step, not a consequence of a window closing.

Check as well that the tasks do not overlap by file: in the first iteration the backend and the web
side of one feature both needed to edit `e2e/README.md` and the unit cases doc, while
`app.module.ts` was edited by both features. Such files are either assigned to one agent or edited
after the merge.

**Implementers write product code; testers write the specs and run them; the test designer writes the
scenario text.** `apps/**/src/**` that is not a spec belongs to `implementer-api` /
`implementer-web`; `e2e/**` and `**/*.spec.ts` belong to the `tester-*` roles; `*.cases.md` belongs to
`test-designer` (`ADR-0014`). The three run against each other rather than the same agent grading its
own homework, and the split is by file, so it is checkable. An implementer who notices a missing case
reports it; they do not add it.

**A test that goes red and was not marked to break at `FEAT-S3` is not edited by whoever finds it.**
Rule out the ordinary infrastructure causes first — an orphaned server, a hung `@playwright/test`, a
parallel `pnpm dev`, a measurement-order flake — and only then judge whether the test or the code is
wrong. If the implementer believes the test is wrong, it reports rather than fixes: `lead` files a
`BL-` row (`team-roles`, the boundaries section) and the owner decides. Acceptance does not proceed
on a disputed test in the meantime.

## 6a. Integration and end-to-end tests

**`FEAT-S11`, by `tester-functional`, `tester-api` and `tester-security` as the levels the change
touches require.** Entry condition: the unit and API specs of `FEAT-S10` are green against the
implementation. What runs here: the integration specs (`*.integration.spec.ts`, project
`integration`) and the functional/journey specs (`*.functional.spec.ts`, project `web`) that
`test-designer` wrote scenarios for at `FEAT-S9`, plus any security case the change touches.

`FEAT-S5` — the single "tests per level" stage this replaces — is retired in `docs/process.md`, not
deleted: the row stays, marked retired, because the existing profiling record cites it and
`AR-API-10` would fail otherwise. Nothing here removes a check `FEAT-S5` used to run; the same work
now has two IDs instead of one, split by when it happens relative to `FEAT-S4`.

## 7. Code review — the fourth gate

By the `code-reviewer` agent: read-only, `opus`, one review per feature, **after** the implementers
and the testers are done and **before** acceptance. It reads the diff against the accepted plan, the
nineteen invariants and the corpus, and answers whether the code does what was planned, whether a
deviation is an improvement or a problem, and whether the documents stayed behind. The full
checklist is in the agent definition; when to call one at all is in `requesting-code-review`.

It reviews, it does not run. Runs are the testers' step, and their reports are inputs to this one.

Its verdict labels each blocker `shape` or `correction` ("Phases", above); only a `shape` blocker
sends the change back for a full re-run.

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

Not every stage needs its own worktree. The research sweeps, the reviews and reading run output are
in-process subagents in the current tree; only stages that **run the application** need isolation,
and then the unit of isolation is a git worktree (§6).

## 8. Acceptance

**`FEAT-S6`** is run by `lead` directly, through the `regression-verify` skill, with no dispatch:
`lead` already holds `Bash`, and running `pnpm verify` writes no file, so `ADR-0014`'s reason for
keeping acceptance off the orchestrator — "then nothing gates the work, and the lead's judgement is
about its own code" — does not reach here, because `lead` writes no code in this flow. What matters
for speed is unchanged: **one `pnpm verify`** rather than a series of `--grep` calls (measurements
are in `e2e/README.md`, "Run economics"); do not run the units by hand; and a repeated full run adds
almost nothing — a targeted control experiment does more.

**`FEAT-S7`** (the ledger entry) and **`FEAT-S8`** (the profiling record) stay `tester-acceptance`'s:
both need `Write`, which `lead` does not hold. The earlier wording here — "for a small feature the
implementer's DoD _is_ the acceptance" — is still exactly the self-grading `ADR-0014` removed: running
the check through the orchestrator is a different thing from skipping it, which is why `pnpm verify`
itself runs unchanged and a dedicated role still closes the cycle.

Diff-level security review goes through the built-in `security-review` skill: it looks at the
branch's changes and complements the automated cases rather than replacing them.

## 9. What not to cut

- **Control experiments.** One `sed` plus a filtered run. They are what exposed the meta-test that
  scanned the wrong directory, found zero files and therefore went green under **any** violation of
  the convention. Neither types, nor lint, nor review sees that.
- **The `.cases.md` ↔ spec pairing and the convention meta-test.** Written once, works forever.
- **An actual run before the word "done".** It separates a result from a report of a result.

## 10. Time budget

**Plan through acceptance**, for a feature the size of "a page plus two endpoints": plan 10, plan
review 12, implementation 25, acceptance 10, security 3 — **about 60 minutes**, and that is the
floor. This groups stages by when they run, not by the discovery-versus-implementation split
`docs/profiling/README.md` defines by stage ID (`FEAT-S1`…`FEAT-G3` against `FEAT-S4`…`FEAT-S8`):
the plan and plan review counted here fall on the discovery side of that split. The pipeline audit
recomputed the total against observed agent durations (minimum 8.7 minutes, median 21.4) and got 70
minutes with a narrow review and 85 with a full one, including the probes that now live in §0. There
is no slack in those numbers: going back to a full plan review costs +15 minutes.

**§5a's test design (`FEAT-S9`) adds a line no record has measured yet: projected 10–25 minutes**,
bracketed against `FEAT-S3` (the closest analogue — a document, written by one role, from accepted
artifacts). The red run it feeds (`FEAT-S10`) and the run-boundary `FEAT-S11` adds are not a new
line here: the plan that introduced them projects the same total work as the retired `FEAT-S5`,
reordered, plus a few seconds per extra filtered run — negligible against the totals above. So the
floor moves to a **projected 70–85 minutes**, not measured, and the first record after this change
either confirms the bracket or falsifies it.

**The discovery half is now measured.** `docs/profiling/` holds one record per cycle (`ADR-0020`,
closing `BL-022`), and the first put discovery and its three gates at 1.47M tokens against 2.01M for
everything after — the larger figure on the side this budget treats as the predictable one. What
follows is the original wording, kept because the budget above still rests on it: no estimate was
given here rather than an invented one, and the first features through this flow were to be the
measurement (`ADR-0016`). They were. The measurements live in `docs/profiling/`, **not** in
`e2e/README.md` — that page is the suite's run economics, and `ADR-0020` keeps the two apart
deliberately.

If the whole comes out at twice the floor, the cause is almost always the size of a document or the
number of review iterations, not the difficulty of the code — which is what `CH-004` was written
about.

## 11. Reporting as you go

The user cannot see what happens inside a background agent and cannot tell long work from a loop.
Say what is done and what is left in your interim messages: the stage, how many remain, where the
result lives.

About agents in separate worktrees, say only what you actually know: how many windows are running
and with what tasks. **Their progress is unavailable to you** — do not retell it and do not guess.
When the user asks for a result, the answer lives in that worktree's `git log`/`git diff`, not in a
guess.

## 12. The ledger entry is part of the work

A task is not closed until `docs/CHANGELOG.md` has a row: a feature → `FT-`, a process change →
`CH-`, every defect found → `FX-` with the "Found by" column. A newly discovered gap → a `BL-` item
with "Conflicts with" filled in; a closed backlog item is marked closed with a reference and is
**never deleted**. The full rules are in `CLAUDE.md`, the commit order in the `git-commit` skill.

The "Found by" column is the only way to learn which checks actually work: today's ledger shows the
control experiments and the security suite found three defects each, and diff review found none.

## Facts in the corpus

A feature that changes what the system does changes the corpus. The stage that owns it is implementation, not a follow-up commit: the fact lands with the code (`FACT-1052`), under a number from `pnpm fact:next`, with `pnpm fact:lock` run afterwards so the register matches.

Where the feature contradicts something the corpus already states, the old fact is **retired** into that document's "Retired facts" register naming the key that replaces it. It is never edited in place and never deleted (`ADR-0022`) — `AR-API-15` fails the run on either. The design stage names which keys will move; the plan carries it in section 3a; the code review reads the corpus diff.

The rules are `ADR-0021` and `ADR-0022`, explained in the `project-context` skill. Do not restate them here.
