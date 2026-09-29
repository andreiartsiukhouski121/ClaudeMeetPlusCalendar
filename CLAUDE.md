# PurpleSchool

A pnpm monorepo: `apps/web` (Next.js 16) + `apps/api` (Nest.js 12). Shared configs live in
`packages/eslint-config` and `packages/tsconfig`. Package specifics are in
[`apps/api/CLAUDE.md`](apps/api/CLAUDE.md) and [`apps/web/CLAUDE.md`](apps/web/CLAUDE.md): the
module map and whatever concerns only one application.

The project is English-only (`CH-014`): documents, comments, test titles, UI strings and the seed.
Commits before that entry are in Russian and are not rewritten.

## Commands

| Command                        | What it does                                                                 |
| ------------------------------ | ---------------------------------------------------------------------------- |
| `pnpm dev`                     | both applications in parallel                                                |
| `pnpm dev:web`                 | Next.js on `http://127.0.0.1:3000`                                           |
| `pnpm dev:api`                 | Nest.js on `http://127.0.0.1:3001`                                           |
| `pnpm lint` / `pnpm lint:fix`  | ESLint over the root and every package                                       |
| `pnpm typecheck`               | `tsc` over the root (e2e) and over each package                              |
| `pnpm test`                    | unit tests (Vitest in `apps/api` and `apps/web`)                             |
| `pnpm test:<feature>`          | one feature's units: `test:auth-login`, `test:home-dashboard`                |
| `pnpm change:new <slug>`       | scaffold a change folder: research, design, plan                             |
| `pnpm change:new <slug> --bug` | the same, with the bugfix plan template                                      |
| `pnpm adr:new <slug>`          | record an architecture decision; takes the next free number                  |
| `pnpm check:orientation`       | section 0 of the plans is filled in substance (in pre-commit and verify)     |
| `pnpm verify`                  | **the whole check on a single server start**: lint + typecheck + units + e2e |
| `pnpm e2e`                     | E2E through Playwright on ports 3100/3101; it starts the servers itself      |
| `pnpm e2e:security`            | cross-feature security invariants (API + browser)                            |
| `pnpm audit`                   | known CVEs in the dependencies (high and above)                              |
| `pnpm e2e:report`              | the HTML report of the last Playwright run                                   |
| `pnpm skills:sync`             | fetch the external skill sets into `.agents/` by the lock file               |
| `pnpm skills:check`            | offline: verify what is on disk matches the lock file                        |

Write addresses as `127.0.0.1`, never `localhost`: on Windows `localhost` resolves to `::1`, where
`next dev` does not listen.

Playwright runs on **dedicated ports 3100 (web) and 3101 (api)** and starts the servers itself, so
it never reuses whatever is on 3000/3001. If `next start` is sitting on 3000 it serves a stale
build, and the run goes falsely green on broken code. Do not move `playwright.config.ts` to
3000/3001.

Verify with a single `pnpm verify` rather than a series of `--grep` calls: the per-feature split is
for localizing a failure, not for acceptance.

Run measurements and the suite composition live **in one place** — [`e2e/README.md`](e2e/README.md),
"Run economics". They are deliberately not restated here: four diverging copies of that paragraph
already produced `FX-027`.

**Isolating parallel agents is possible ONLY through a separate git worktree, never through ports.**
Proven by experience: Next 16 registers its dev server per **project directory**, not per port.
While one `next dev` is running in `apps/web`, a second one starts on no port at all:
`Another next dev server is already running`, Playwright's `webServer` never comes up, and the run
fails with `Exit code: 1` and **zero tests executed**. Two consequences:

1. Before `pnpm e2e`, a running `pnpm dev` must be **stopped** — otherwise there is no run at all.
2. Different ports are not enough for two agents: each needs its own git worktree, and only then do
   ports matter — so two worktrees do not collide on 3100/3101. How the worktree is created is a
   property of the machine: this one has the machine-wide `agent-team` skill, the repository has
   nothing, and in a fresh clone it is `git worktree add` by hand.

`E2E_WEB_PORT` / `E2E_API_PORT` do work (a run on 3200/3201 is green) and are useful inside a
worktree, but on their own they give no parallelism.

```bash
# inside your own worktree, if 3100/3101 are taken by a neighbour
E2E_WEB_PORT=3200 E2E_API_PORT=3201 pnpm e2e
```

## Two workflows: feature and bugfix

Before planning, decide which one you are in. The fork turns on a single question: **has this
behaviour already been promised?**

|                    | Feature                                          | Bugfix                                        |
| ------------------ | ------------------------------------------------ | --------------------------------------------- |
| When               | the behaviour is in no case and no invariant yet | the behaviour is promised, the code disagrees |
| Skill              | `feature-pipeline`                               | `bugfix-pipeline`                             |
| How it starts      | `pnpm change:new <slug>`                         | `pnpm change:new <slug> --bug`                |
| The first step     | research of what already exists                  | reproducing the defect                        |
| What gets designed | the contract and the data                        | nothing: behaviour is restored                |
| The test           | written alongside the code                       | written **before** the fix and must go red    |
| Ledger entry       | `FT-` (or `CH-` for process)                     | `FX-` with the "Found by" column              |

What they share: the three discovery stages in a change folder (below), section 0 "Orientation"
(identical in form in both templates and read by `pnpm check:orientation`), acceptance through one
`pnpm verify`, and a mandatory ledger entry.

## Discovery: research, design, plan — in that order

A change of any size starts with `pnpm change:new <slug>`, which creates the folder the work is
developed in:

```
docs/plans/<slug>/
  research/README.md   stage 1 — what the project already contains, one file per sweep
  design.md            stage 2 — the shape of the change, written from research/
  <slug>.plan.md       stage 3 — the task breakdown, written from research/ + design.md
```

**Each stage's artifact is the next stage's context, and each has its own review gate**:
`research-reviewer` → `design-reviewer` → `plan-reviewer`. The procedures are in the
`research-protocol` and `design-protocol` skills; the roles are in `team-roles`.

The rule that makes research worth the stage: **record only what is in the project, never what you
concluded from it.** Every statement carries a citation — a path and line, a document section, a
case ID, a ledger or ADR entry, a commit — and anything uncitable is an open question or a
`Not found` line. "Nothing here covers X" is a finding, not a failure. `PR-API-06` fails a research
file that cites nothing and marks nothing.

`PR-API-03`…`PR-API-05` hold the rest of the shape: every change folder has all three stages, no
scaffolded file is left unfilled, and the scaffolder cannot drift from what the check requires.

**Not every change needs this.** A defect below the `bugfix-pipeline` §4 threshold gets no folder and
no stages — a red test, the fix, an `FX-` entry. So do documentation, config and renames. Adding
stages makes `CH-004`'s failure (100 minutes of planning against 85 of code) cheaper to repeat, not
harder.

**Not every bugfix needs a plan.** The threshold is in `bugfix-pipeline` §4: the cause was not found
in about fifteen minutes, a contract or an invariant is touched, security is involved, or more than
one module is affected. Otherwise the flow is shorter: a red test, the fix, an `FX-` entry. A
document for a one-line fix costs more than the fix — exactly what `CH-004` moved away from.

## Architecture: the corpus every task starts from

Four documents hold the facts this project runs on. They are **read, not re-derived**: code shows
current behaviour and never the decision behind it — it cannot tell you that CORS is off on purpose,
or that the third session check is not redundant.

| Document                                       | Owns                                                               |
| ---------------------------------------------- | ------------------------------------------------------------------ |
| [`docs/architecture.md`](docs/architecture.md) | the shape of the system, layer rules, patterns used and refused    |
| [`docs/adr/`](docs/adr/README.md)              | one immutable record per decision: context, decision, consequences |
| [`docs/data-model.md`](docs/data-model.md)     | entities, formats, lifetimes, seed, and the flows between layers   |
| [`docs/api-contract.md`](docs/api-contract.md) | every endpoint: request, response, error bodies, internal logic    |

They are **disjoint**: a fact lives in one of them and the others link. Two copies of a rule drift
silently — that is `FX-023` and `FX-027`. Which role reads which, and what a behaviour change must
update, is in the `project-context` skill.

**An architectural decision is written as an ADR before the code** (`pnpm adr:new <slug>`), and the
plan cites the ID. Written afterwards it is a justification, not a decision. An accepted ADR is
never edited in substance: a changed decision is a **new** record that supersedes the old one.

Two things hold this in place mechanically: section 0 of every plan answers **Architecture impact**
with ADR IDs or "no matches" (`pnpm check:orientation`), and
`e2e/architecture/architecture.api.spec.ts` compares the Routes table in `docs/api-contract.md`
against the Nest controllers in both directions, the guarded ones against `PROTECTED_ROUTES`, and
the ADR log against itself. The prose is not machine-checkable and is held by review.

## The agent team

Work larger than a one-line fix is done by roles, not by one agent doing everything. Each role is a
file in `.claude/agents/`, and its limits are its **tool list** rather than its prompt: prose has
already failed here — the reviewer was found holding write access while the rules forbade it in
words.

| Role                                                             | Does                                        | Cannot, by tools              |
| ---------------------------------------------------------------- | ------------------------------------------- | ----------------------------- |
| `lead`                                                           | sequences, dispatches, holds gates, reports | write files                   |
| `planner`                                                        | the plan and the ADRs                       | run the app, review, dispatch |
| `test-designer`                                                  | test scenarios (`*.cases.md`), every level  | write specs, run, dispatch    |
| `implementer-api`, `implementer-web`                             | product code                                | write tests, dispatch         |
| `plan-reviewer`, `code-reviewer`                                 | verdicts, in text                           | edit or run anything          |
| `tester-unit`, `-api`, `-functional`, `-security`, `-acceptance` | tests and runs                              | touch product code, dispatch  |
| `pipeline-reviewer`, `pipeline-planner`                          | evidence, then proposals for the owner      | edit the pipeline             |
| `pipeline-implementer`                                           | the pipeline changes the owner approved     | decide what to change         |

Two boundaries are choices rather than consequences: **scenarios belong to the test designer, specs
and runs to the testers** (`*.cases.md` to `test-designer`; `e2e/**` and `**/*.spec.ts` to the
`tester-*` roles) and product code to the implementers; and **reviewers are read-only** in the
literal sense. The full contract — models per role, the handoff format, when the team is the wrong
tool — is the `team-roles` skill.

## The process itself: stages, gates and what they cost

The pipeline is a thing this repository builds, so it is documented and measured like anything else.
Two documents, disjoint from the architecture corpus above and from the skills:

| Document                                      | Owns                                                                            |
| --------------------------------------------- | ------------------------------------------------------------------------------- |
| [`docs/process.md`](docs/process.md)          | **the inventory**: which stages and gates exist, in what order, under which IDs |
| [`docs/profiling/`](docs/profiling/README.md) | **the measurements**: one append-only record per development cycle              |

The skills own the **procedure** — how a stage is run and what it costs to skip — and link to the
inventory rather than restating it (`ADR-0020`). A stage table anywhere else is drift, which is what
`FX-023`, `FX-027`, `FX-031` and `FX-032` are all entries about.

The IDs (`FEAT-S1`…`FEAT-S11`, `FEAT-G1`…`FEAT-G4`, `FIX-S1`…`FIX-S11`, `TUNE-S1`…`TUNE-S3`) are the
join key between a measurement and the thing measured. They are **never renumbered or reused**, and
`AR-API-10` fails a profiling record citing a stage the inventory does not define. `FEAT-S5` is
retired rather than deleted: the ID stays in `docs/process.md` because the first profiling record
cites it.

**A profiling record is part of finishing a cycle** (`FEAT-S8`), like the ledger entry: the numbers
exist only while the hand-backs are still in front of you. The first record measured `FT-003` at
3.48M tokens across 21 distinct agents and 29 dispatches, of which product code was 2.4% and rework
after a gate was 29.3%.

Changing the pipeline goes through the `pipeline-tuning` skill: evidence, then proposals, then
**the owner's approval**, then implementation of exactly what was approved. That gate is human and is
never simulated — `CH-004` is the entry for a process that outgrew the work it guarded, and a person
noticed.

## What has been done: the ledger and the backlog

**Two files are read before planning any task**, not after:

- [`docs/CHANGELOG.md`](docs/CHANGELOG.md) — shipped features, process changes and **every defect
  found**, with the "Found by" column. Half the entries are about things invisible in a diff: a
  vacuously passing meta-test, lint rules left at `warn`, a login timing oracle, an endless redirect
  on a broken cookie.
- [`docs/BACKLOG.md`](docs/BACKLOG.md) — what is ahead (with the "Conflicts with" column) and a
  **Rejected** section with reasons: it exists so the same idea is not proposed again.

The orientation form is section 0 of [`docs/plans/TEMPLATE.md`](docs/plans/TEMPLATE.md): five
written answers about duplication, conflicts with shipped work, conflicts with planned work,
architecture impact, and open questions.

**The step cannot be skipped technically.** A change folder is created with `pnpm change:new <slug>`,
and
`pnpm check:orientation` runs in `.husky/pre-commit` and in `pnpm verify`: an empty answer, a
brush-off (`—`, `TODO`, `no`), an answer under 20 characters, untouched template text, and a
reference to a non-existent ledger entry all **fail the commit**. For the duplication and planned
questions the answer must either cite an existing ID or say "no matches" outright, and the
architecture question must cite `ADR-` IDs the same way — otherwise there is no telling whether the
ledger and the decision log were opened at all.

If the task turns out to be a duplicate, say so and stop: "already done in `FX-007`" is a complete
result, not a refusal to work.

**A ledger entry is mandatory when the task is done:** a feature → `FT-`, a process change → `CH-`,
every defect found → `FX-` with what found it. A closed backlog item is marked closed with a
reference but is **never deleted**. The structure is checked by `e2e/ledger/ledger.api.spec.ts` on
every `pnpm verify`; the machine does not check what the entries mean — orientation and review do.

## Project invariants

Nineteen rules that implementations have already broken. Each cost its own investigation, so read
them **before** writing code rather than re-deriving them from documents.

**Nest (`apps/api`)**

1. `POST /auth/login` answers **200**, not 201: `@HttpCode(HttpStatus.OK)` on the method. Nest
   defaults POST to 201, and removing the decorator breaks the contract silently.
2. Any **optional** DTO field must carry `@IsOptional()`. Without it a missing field still runs
   through `@IsInt`/`@Min`/`@Max` and gives 400 — that is how both `limit` and `durationMinutes`
   "broke".
3. `ValidationPipe` is registered as an `APP_PIPE` provider in `AppModule`, not via
   `useGlobalPipes`: otherwise test modules boot the app without validation and the 400 checks
   disagree with the server.
4. `total` is the owner's full record count, **never** `items.length`: `items` is cut by the limit.
5. `ownerId` comes from `@CurrentUser()` — the signed token — and never from the request body.
6. A wrong password and an unknown email give **the same** message, or responses can be used to
   enumerate accounts.
7. Sorting by date always carries a secondary key on `id`: with equal dates the order is otherwise
   undefined and the test flakes.
8. Error shape: with a 400 from `ValidationPipe`, `message` is an **array** of strings; with a 401
   and a 404 it is a string. Do not rely on one shape.

**Next.js (`apps/web`)**

9. The gate for unauthenticated visitors lives in `src/proxy.ts` — `middleware.ts` is deprecated in
   Next 16. The matcher is narrow, or the proxy fires on `_next/static` and breaks CSS; the bounce
   back is `GET`-only, or a POST Server Action gets a redirect instead of executing.
10. `proxy.ts` is an "optimistic" check, not security: all it sees is that a cookie exists. The real
    check is duplicated in `lib/dal.ts` and **inside every Server Action**.
11. `redirect()` is called strictly **outside** `try/catch`: it works by throwing `NEXT_REDIRECT`,
    and a `catch` inside the block swallows it. The symptom is "login does nothing but the cookie is
    set".
12. A cookie's `secure` is `process.env.NODE_ENV === 'production'`, not an unconditional `true`.
13. A file with `'use server'` exports **only** async functions: types and constants go to
    `lib/types.ts` and `lib/session-cookie.ts`.
14. `import 'server-only'` **does not resolve under Vitest**. Keep everything testable in modules
    without it (`api-client.ts`, `session-cookie.ts`, `format-date.ts`); `session.ts` and `dal.ts`
    have it and therefore have no units.
15. Form fields carry no `required`, and email is `type="text"`: with either, the browser blocks
    submission, the server validation branch never runs, and the test checks browser behaviour
    rather than our code. The password is **never trimmed** (`trim` applies to email only) —
    trimming silently alters what was typed.

Date display is pinned to `timeZone: 'UTC'`, or both the units and the e2e depend on the machine's
time zone.

**Security**

16. Every new protected endpoint is added to `PROTECTED_ROUTES`
    (`e2e/security/security.api.spec.ts`), and every new protected page to `PROTECTED_PAGES`
    (`security.functional.spec.ts`). Those lists are the only thing connecting the cross-feature
    security suite to a growing application: forget a line and the check silently stops covering
    what is new.
17. A broken session is sent through the `/auth/session-expired` Route Handler, which erases the
    cookie, and **not** straight to `/auth/login`: `proxy.ts` only sees that a cookie exists and
    would send the user back to `/` — that is `ERR_TOO_MANY_REDIRECTS`, and signing in again becomes
    impossible.
18. Authentication rejection branches differ **neither in text nor in response time**: the password
    is always verified, against a dummy hash when the user is unknown. An identical message is not
    enough.
19. The token is never passed as a prop into a client component: it would travel in the RSC stream
    and become available to any script on the page.

The threat model, what the automated checks found and the list of deliberate gaps are in
[`docs/security.md`](docs/security.md). Run them with `pnpm e2e:security` and
`pnpm audit --audit-level high`.

## Verifying a change is mandatory

Any change under `apps/web` or `apps/api` that affects runtime behaviour is verified by actually
running Playwright through the **`playwright-verify`** skill, before reporting readiness. A diff
does not prove the page rendered or the endpoint answered.

Rules:

- A change counts as done only after a **green `pnpm e2e`**. Do not write "verified" without an
  actual run.
- UI changes additionally go through an interactive browser check with the Playwright MCP
  (`browser_navigate`, `browser_snapshot`, `browser_console_messages`).
- Every behavioural change gets a new or updated spec in `e2e/regression/<feature>/`. A one-off
  browser check does not protect against a regression.
- Purely configuration, type or documentation edits may skip the check, but **the skip must be named
  explicitly** in the report rather than passed over.

The procedure, the locator rules and the common failures are in
`.claude/skills/playwright-verify/SKILL.md`.

### Who runs what

Three layers, each with its own job. Keep them in mind before typing another run command: almost
everything you might want to run by hand is already part of one of them.

| Layer               | What it runs                                                                   | When               | Cost  |
| ------------------- | ------------------------------------------------------------------------------ | ------------------ | ----- |
| `.husky/pre-commit` | orientation + `lint-staged` (`eslint --fix`, `prettier --write`) + `pnpm test` | every `git commit` | ~6 s  |
| `pnpm verify`       | orientation + lint + typecheck + units + supertest + format + all e2e + audit  | accepting a change | ~66 s |
| CI, job `verify`    | the same list of steps as the local `pnpm verify`                              | push and PR        | —     |

**The hook is a floor, not acceptance.** A red unit **fails the commit**. But the full `pnpm lint`
(49 s), typecheck and e2e are deliberately not in the hook: a hook longer than ten seconds starts
getting bypassed with `--no-verify`, and then none of its checks run. A green hook does not replace
`pnpm verify` — it runs no e2e at all.

**The units run twice per cycle — in `pnpm verify` and again in the hook — and that is not an
oversight.** `lint-staged` edits files with `--fix`/`--write` **after** `verify` has finished, so
the hook runs the units against different content — exactly what will go into the commit. Hence:

- **do not run `pnpm test` by hand**, before or after `pnpm verify` — that would be a third run of
  the same 42 tests adding no new fact;
- `pnpm test:<feature>` is justified **only for localizing** a failure that already happened;
- a commit holding only `.md` files skips the units: none of the 11 specs reads markdown, and the
  ledger process prescribes a docs commit (`pnpm ledger:fill`) after every feature.

## Skills: our own and external

There are fourteen in `.claude/skills/`. Nine are ours — `feature-pipeline`, `bugfix-pipeline`,
`pipeline-tuning`, `team-roles`, `project-context`, `research-protocol`, `design-protocol`,
`playwright-verify`, `regression-verify`. The other five are **adapters** to external sets: `git-commit`,
`heroui-react`, `nestjs-best-practices`, `requesting-code-review`, `vercel-react-best-practices`.

**An external skill is wired in through an adapter, never a copy.** A copied rule drifts from the
original silently (`FX-023`), and an external set is updated without us besides. An adapter holds
only the local part: what is wrong here, what the set does not know about this repository, and when
to call it at all. **An adapter must keep working without `.agents/`** — anything it would lose its
subject without lives next to it in git.

The sets themselves live in `.agents/skills/`, a directory in `.gitignore` like `node_modules`. The
source, branch, commit and `treeHash` of each are in `skills-lock.json`, which is in git:

```bash
pnpm skills:sync     # fetch the sets into .agents/ by the lock file (needs a network)
pnpm skills:check    # offline: compare the treeHash on disk with the lock file
```

Restoration is reproducible: the lock file records a branch, a **commit** and a `treeHash` — the
hash of the whole directory, computed by `scripts/skills-sync.mjs` and therefore verifiable.
Neither step is wired into `pnpm verify` on purpose: `sync` needs the network, and `check` needs a
directory a fresh clone does not have.

One set is not git-backed: `heroui-react` is published through the skills.sh registry and exists in
no commit of `heroui-inc/heroui`, so its entry carries an `install` command instead of a commit and
`skills:sync` prints it rather than trying to check it out. `skills:check` still pins its contents by
`treeHash`, so drift is caught the same way.

**The invariants of this file outrank any rule of an external skill.** Four rules of
`nestjs-best-practices` directly contradict the code here and are listed by name in its adapter;
the reviewer call policy in `requesting-code-review` is replaced with "one review per feature,
reviewer read-only".

## Tests: what lives where

- `e2e/` (at the root) — Playwright. **The canonical source of truth for the API HTTP contract and
  for the whole UI.** Grouped by feature: `e2e/regression/<feature>/` holds four files —
  `<feature>.api.cases.md` + `<feature>.api.spec.ts` and `<feature>.functional.cases.md` +
  `<feature>.functional.spec.ts` — plus `<feature>.unit.cases.md` referencing the unit specs.
  `e2e/smoke/` is "the infrastructure is alive", `e2e/fixtures/` is the seed and helpers, and
  `e2e/suite-integrity.api.spec.ts`, `e2e/ledger/`, `e2e/process/` and `e2e/architecture/` are the
  meta-tests that hold the conventions, the ledger, the plan templates and the corpus. The suite index with run commands
  is `e2e/README.md`.
- **The Playwright project is chosen by the filename suffix, not by the directory:**
  `*.api.spec.ts` → project `api` (the `request` fixture, `:3101`), `*.functional.spec.ts` →
  project `web` (browser, `:3100`), `*.integration.spec.ts` → project `integration` (the `request`
  fixture, `:3101`, no browser — several modules exercised together). A file ending in `.spec.ts`
  without one of those suffixes joins **no** project and silently never runs. The meta-test catches
  that; review does not. An end-to-end scenario that crosses two or more features lives in its own
  extendable area file, `e2e/journeys/<area>/<area>.functional.cases.md`, rather than in one
  feature's directory.
- `*.cases.md` — the scenario text, at every level — is written by `test-designer` at `FEAT-S9`,
  before any spec exists; the paired spec and the run belong to the `tester-*` roles.
- Every case doc has a spec of the same name and the other way round. A spec without a paired
  `.cases.md` is a blocker.
- `apps/api/src/**/*.spec.ts`, `apps/web/src/**/*.spec.ts` — Vitest units (services, providers, pure
  helpers). A unit test title starts with its case ID (`AL-UT-09 — …`), or neither
  `pnpm test:<feature>` nor the pairing check works.
- `apps/api/test/app.e2e-spec.ts` — Vitest + supertest, kept for exactly one purpose: proving
  `AppModule` boots in a test module. **New HTTP contract checks go into
  `e2e/regression/<feature>/<feature>.api.spec.ts`**, not here, or coverage spreads across two sets
  of differing freshness.
- Accepting a whole feature goes through the **`regression-verify`** skill: a mandatory run of the
  units, the API and the functional tests in a fixed order. `playwright-verify` is the quick check
  of one change; neither replaces the other.

Playwright lives at the **root** of the monorepo rather than in `apps/*`: the root is outside the
`pnpm-workspace.yaml` globs, so `pnpm -r` does not touch it and one `playwright.config.ts` serves
both applications.
