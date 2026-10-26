# Research history: e2e test architecture

> **Re-run after the research review (2026-10-21, `researcher`, no sub-dispatch).** Corrected: the `FACT-1036` quote (§6a), the storage-state statement in §3d (moved to Not found), the `FACT-3642` count (superseded by `contract.md` §7). Gaps of this `haiku` sweep that other sweeps answer are marked **answered elsewhere** in place.

Stage FEAT-S1, sweep "history". Retrieval only. Every statement carries its ID, path:line or commit.

## 1. Backlog

### 1a. Target rows (`docs/BACKLOG.md`, section Open)

| ID     | P   | Area | Status                 | Row text (quoted, abridged where marked …)                                                                                                                                                                                                                               | Conflicts with (quoted)                                                                                                                                                 |
| ------ | --- | ---- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BL-058 | P2  | e2e  | **Closed by `FX-052`** | "Was: A web-project load flake in `pnpm verify` … Cause not found: first-compile latency of a route under `next dev` and load from `fullyParallel` are candidates, neither confirmed" (`docs/BACKLOG.md:39`)                                                             | "no; any fix touches the `webServer` or worker settings in `playwright.config.ts`, where the 3100/3101 ports stay (`CLAUDE.md`)"                                        |
| BL-063 | P3  | e2e  | open                   | "Next 16.3.8 with Turbopack answers its own HTML 404 for a route that exists … when several first compiles run concurrently under CPU load … `FX-052` works around it by removing the concurrency. Open: the Next-internal mechanism is unproven" (`docs/BACKLOG.md:34`) | "none" in the column; the row's last cell: "no; an upstream report or a Next upgrade is independent of every planned item"                                              |
| BL-064 | P3  | e2e  | open                   | "`pnpm e2e --project=integration` reports "No tests found" … no `*.integration.spec.ts` appears to exist" (`docs/BACKLOG.md:33`)                                                                                                                                         | "none" in the column; the row's last cell: "no; touches only `playwright.config.ts` and `e2e/README.md` if the project is retired"                                      |
| BL-066 | P3  | ci   | open                   | "Whether the CI runner sets `CI`: `playwright.config.ts` branches on it (`reuseExistingServer: !isCI`) while `.github/workflows/ci.yml` sets no `CI=`" (`docs/BACKLOG.md:31`)                                                                                            | "none" in the column; the row's last cell: "no; any change touches `ci.yml` or the `isCI` line in `playwright.config.ts`, where the ports 3100/3101 stay (`CLAUDE.md`)" |
| BL-067 | P3  | e2e  | open                   | "A `suite-integrity` rule that the hand-kept route list in `e2e/fixtures/warm-up.ts` matches the `page.tsx` and `route.ts` files … a route added there with no line in the warm-up goes back to compiling under load, silently (`FX-052`)" (`docs/BACKLOG.md:30`)        | "none" in the column; the row's last cell: "`BL-030`, `BL-048` (the same class of list); no conflict with shipped work"                                                 |
| BL-068 | P3  | docs | open                   | "The premise 'a feature with no delete' is false since `FT-010` … `FACT-3642` (`ADR-0029`, the cap of ten files) and `docs/security.md:92` … `FACT-3642` is retired by the `ADR-0022` route (`FACT-3487` …)" (`docs/BACKLOG.md:29`)                                      | "none" in the column; the row's last cell: "`BL-060` (cap into a `Meeting` aggregate) touches the same fact; no conflict with shipped work"                             |

Note on the status column: the Open table has no status column. "Closed by" is written inside the row text (BL-058 only among the six).

### 1b. Other open rows touching tests, e2e, fixtures, login, workers, seed users, storage state, cleanup or flake

| ID                         | P   | Area     | Row text (quoted, abridged)                                                                                                         | Conflicts with (quoted) |
| -------------------------- | --- | -------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| BL-007                     | P2  | feature  | "Editing a meeting (deleting is closed by `FT-010`: `DELETE /meetings/:id` …" (`docs/BACKLOG.md:87`)                                | not read in full        |
| BL-013                     | P3  | process  | "Tooling for a worktree per agent: creation, ports, teardown" (`docs/BACKLOG.md:82`)                                                | not read in full        |
| BL-028                     | P3  | process  | "Nothing checks `e2e/README.md`'s 'Adding a feature to the suite' against the conventions" (`docs/BACKLOG.md:69`)                   | not read in full        |
| BL-030                     | P2  | web      | "A check that `PROTECTED_PAGES` and `AUDITED_PAGES` list every page the application serves" (`docs/BACKLOG.md:67`); cited by BL-067 | not read in full        |
| BL-037                     | P2  | process  | "`e2e/suite-integrity.api.spec.ts` rule 5 is satisfied by a prose cross-reference" (`docs/BACKLOG.md:59`)                           | not read in full        |
| BL-048                     | P2  | web      | "A check that every rendered error state of `apps/web` is scanned by axe" (`docs/BACKLOG.md:49`); cited by BL-067                   | not read in full        |
| BL-004 (Rejected, see §1c) | —   | security | the seed password, cross-referenced under the Rejected section                                                                      | —                       |

Not found in Open: no row mentions a test pool, storage state, seeded browser user pool, worker count, per-test cleanup via API, or the warm-up beyond BL-058, BL-063, BL-067. Searched `docs/BACKLOG.md` by grep for `test|e2e|fixture|login|worker|seed|storage|cleanup|clean|flake|planner|organizer|eraser|teacher|student|sandbox|warm|port`.

### 1c. Rejected section rows that touch this area

Quoted "Why rejected" text, in `docs/BACKLOG.md` lines 114–123.

| What (quoted)                                                            | Line | Why rejected (quoted)                                                                                                                                        |
| ------------------------------------------------------------------------ | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| "A global `fullyParallel: false` to remove races"                        | :122 | "It would slow the whole suite down for the sake of five mutating cases. The races are solved by dedicated owners, a `serial` block and relative counters"   |
| "A state reset endpoint for tests"                                       | :123 | "A test back door in a production API. Isolation is achieved through data: dedicated owners for mutations"                                                   |
| "Moving the seed's plaintext password out of `users.seed.ts` (`BL-004`)" | :120 | "`e2e/fixtures/seed.ts` must hold the same plaintext for every login case … The real risk … is closed instead by `assertSeedAllowed` (`AL-UT-32`, `CH-031`)" |

No Rejected row names UI login in tests, storage state, a user pool, or a worker count. Searched the Rejected section by reading all rows at `docs/BACKLOG.md:110-125`.

## 2. Changelog

### 2a. Requested entries

| ID                                           | Summary                                                                                                                                                                                                                                                                                              | Found by                                                                                                                                                                                                    | Commit                                                                          |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| FT-010 (`docs/CHANGELOG.md:38`, 2026-10-16)  | `DELETE /meetings/:id` and `DELETE /meetings/:id/files/:fileId`. "The e2e fixtures gained `e2e/fixtures/cleanup.api.ts` (cases remove what they create) and the seed gained the dedicated `eraser` user for the totals case, mirrored in `apps/api/src/users/users.seed.ts`"                         | not a defect entry; FT rows carry no Found-by column                                                                                                                                                        | `39acdbb` (per `git log -S 'eraser'` and `--diff-filter=A` on `cleanup.api.ts`) |
| FX-052 (`docs/CHANGELOG.md:125`)             | "The web project went red in `pnpm verify` at random … with up to 14 workers the first requests to never-compiled routes all arrived at once … Fixed: a serial `globalSetup` warm-up (`e2e/fixtures/warm-up.ts`, wired in `playwright.config.ts`) … no timeout, `workers` or `fullyParallel` change" | "`pnpm verify` during the unrelated acceptance runs of `clean-architecture-pilot` and `meetings-clean-architecture`; reproduced by the CPU-load procedure in `docs/plans/web-e2e-flake/research/probes.md`" | `344240c`                                                                       |
| FX-033 (`docs/CHANGELOG.md:141`, 2026-09-28) | "`meetings-detail.api.spec.ts` became a second, and under `fullyParallel: true` one file's inserts land inside the other's window" (two api specs mutating `planner`)                                                                                                                                | "T4 run of `meetings-detail-participants` (`HD-API-14`, `pnpm e2e --project=api`, `Expected: 2, Received: 4`)"                                                                                              | `48d9256`                                                                       |
| FX-030 (`docs/CHANGELOG.md:144`)             | "a hung `@playwright/test` from a previous run holds its `webServer` half up"                                                                                                                                                                                                                        | "acceptance run"                                                                                                                                                                                            | `7126d8a`                                                                       |
| FX-011 (`docs/CHANGELOG.md:163`)             | "`SEC-API-05` flaked in about half the runs (2.518 against a threshold of 2.5)"                                                                                                                                                                                                                      | "pipeline audit"                                                                                                                                                                                            | `e622344`                                                                       |
| FX-010 (`docs/CHANGELOG.md:164`)             | "The claim 'parallelism through ports' was false: Next 16 registers a dev server per directory, and `pnpm dev` blocks `pnpm e2e` entirely"                                                                                                                                                           | "audit plus experience"                                                                                                                                                                                     | `e622344`                                                                       |
| FX-013 (`docs/CHANGELOG.md:161`)             | "The blocker 'test count = the table in the plan' was impossible to satisfy: 77 e2e against 53"                                                                                                                                                                                                      | "pipeline audit"                                                                                                                                                                                            | `e622344`                                                                       |
| FX-049 (`docs/CHANGELOG.md:122`)             | `ACC-FN-03` red on `main` in CI; login form error state; colour contrast                                                                                                                                                                                                                             | not expanded here (contrast, not isolation)                                                                                                                                                                 | not read in full                                                                |

Not found in Changelog: no FT/CH/FX row names UI login in tests, storage state, a user pool, a seed-user pool of ten, the worker count 7, or the planner/organizer/teacher/student sandbox introduction. The `planner`/`organizer` sandbox rule first appears in `git log -S 'mutation sandbox'` at `36e83b4`'s successors (see §3); no ledger row records it.

Searched `docs/CHANGELOG.md` by grep for `FT-010|FX-052|e2e|fixture|login|worker|parallel|flake|seed|sandbox|planner@|organizer|eraser|teacher|student|isolat|warm|port|storage|cleanup`, and read every matching row.

### 2b. Ports entries

| ID                               | Summary                                                                          | Found by              | Commit    |
| -------------------------------- | -------------------------------------------------------------------------------- | --------------------- | --------- |
| FX-010                           | see 2a                                                                           | audit plus experience | `e622344` |
| CH-012 (`docs/CHANGELOG.md:101`) | "the parallelism conflict removed, measurements consolidated in `e2e/README.md`" | —                     | not read  |

## 3. Git history

### 3a. `git log --oneline -- e2e/fixtures playwright.config.ts` (complete, 10 commits)

| Commit    | Subject (verbatim)                                                     |
| --------- | ---------------------------------------------------------------------- |
| `39acdbb` | feat(api): delete a meeting and a meeting file                         |
| `344240c` | fix(e2e): compile web routes once before the parallel suite            |
| `18b27f6` | feat: store meetings in PostgreSQL via Prisma and add file attachments |
| `58ac94f` | chore: second tuning round — test design, TDD and an integration level |
| `48d9256` | feat(api): add participants[] and GET /meetings/:id                    |
| `39e9e0c` | chore: whole project migrated to English and comments condensed        |
| `7126d8a` | chore: аудит скилов — сняты противоречия и дубли, добавлен skills:sync |
| `7c4fc5b` | feat(auth): страница логина /auth/login и контракт POST /auth/login    |
| `36e83b4` | chore(e2e): каркас регрессионного сьюта и план двух фич (T0)           |
| `fe07cfe` | chore: baseline монорепозитория (web + api + e2e-каркас)               |

### 3b. `git log -S 'workers' -- playwright.config.ts`

| Commit    | Subject                                                                                                    |
| --------- | ---------------------------------------------------------------------------------------------------------- |
| `344240c` | fix(e2e): compile web routes once before the parallel suite (adds the warm-up; `warm-up.ts` is wired here) |
| `fe07cfe` | chore: baseline монорепозитория (web + api + e2e-каркас) (first appearance)                                |

The config's `fullyParallel` string appears only in `fe07cfe` (`git log -S 'fullyParallel' -- playwright.config.ts`). The current worker count was not read from the config (**answered elsewhere:** `code.md` §4, `playwright.config.ts:31`); the meeting-files research quotes `workers: isCI ? 1 : undefined` (`docs/plans/meeting-files/research/tests.md:219`), and `docs/plans/ci-pipeline.plan.md:13` quotes `workers: 1` for CI.

### 3c. Sandbox and eraser users

| String (`git log -S`) | Commits, oldest last                                                                                                                                                      | Subject of the earliest commit                                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `eraser`              | `39acdbb` only                                                                                                                                                            | feat(api): delete a meeting and a meeting file (Wed Oct 21 2026; the seed row `usr-eraser`, "dedicated `eraser` user for the totals case", `FT-010`) |
| `organizer`           | `36e83b4` (earliest of 13: `39acdbb`, `f6fa71d`, `18b27f6`, `fb94ca2`, `48d9256`, `08148c7`, `39e9e0c`, `e622344`, `daf86b2`, `7813fc3`, `4bedc02`, `7c4fc5b`, `36e83b4`) | chore(e2e): каркас регрессионного сьюта и план двух фич (T0)                                                                                         |
| `planner@`            | `36e83b4` (earliest of 7: `18b27f6`, `48d9256`, `08148c7`, `39e9e0c`, `7813fc3`, `7c4fc5b`, `36e83b4`)                                                                    | chore(e2e): каркас регрессионного сьюта и план двух фич (T0)                                                                                         |
| `mutation sandbox`    | `39e9e0c` (earliest of 7: `39acdbb`, `18b27f6`, `fb94ca2`, `d5334d3`, `48d9256`, `08148c7`, `39e9e0c`)                                                                    | chore: whole project migrated to English and comments condensed                                                                                      |

The rationale for the sandboxes is quoted in `FACT-3126` (`ADR-0007`, `docs/adr/ADR-0007-in-memory-store.md:25-26`): "`planner` and `organizer` are the mutation sandboxes for the API and UI suites respectively, because Playwright runs both projects in parallel against one store." Its successor facts are `FACT-1071` (planner, `docs/data-model.md:162`) and `FACT-1037` (organizer, `docs/data-model.md:163`); `FACT-1085` is `eraser` (`docs/data-model.md:164`).

Not found: a commit subject stating the reason for the sandbox introduction. Searched `git log -S 'mutation sandbox'` and read the earliest commit subject only.

### 3d. Introduction of the fixtures

| File                           | Introduced at (`--diff-filter=A`) | Subject                                                                                   |
| ------------------------------ | --------------------------------- | ----------------------------------------------------------------------------------------- |
| `e2e/fixtures/auth.fixture.ts` | `36e83b4`                         | chore(e2e): каркас регрессионного сьюта и план двух фич (T0)                              |
| `e2e/fixtures/seed.ts`         | `36e83b4`                         | same                                                                                      |
| `e2e/fixtures/cleanup.api.ts`  | `39acdbb`                         | feat(api): delete a meeting and a meeting file                                            |
| `e2e/fixtures/warm-up.ts`      | `344240c`                         | fix(e2e): compile web routes once before the parallel suite (`2026-10-16 17:34:43 +0200`) |

`e2e/fixtures/auth.fixture.ts` documents the UI login (lines 11-12: "UI login walks the real path 'form → Server Action → POST /auth/login → cookie'") and the `authStateFor` worker fixture (lines 21-25) in its content at HEAD `548195c`. The file itself was introduced at `36e83b4` (table above). Not found: whether the storage-state mechanism was present at `36e83b4`, and the commit that first added `storageState` to `auth.fixture.ts`. Searched `git log -S 'storageState' -- playwright.config.ts` (no commit) and did not run `-S` on the fixture file.

## 4. Profiling records (`docs/profiling/runs/`)

No record measures a pool, a per-test cleanup, a storage-state build, or a worker count of 7.

| Record                                      | Line       | Measurement (quoted)                                                                                                                                             |
| ------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `2026-10-03-design-language-rollout.md`     | :73, :161  | "one green `pnpm verify`: 128 e2e in 30.6s"; "128 e2e tests passed in 30.6s"                                                                                     |
| `2026-10-06-meeting-files.md`               | :147, :287 | "`pnpm verify`: exit 0, 1 min 47 s (… was ~66 s before this change"; "`pnpm verify` grew 66 s → 1 min 47 s"                                                      |
| `2026-10-13-danger-contrast.md`             | :119, :121 | run 2 red at 85 s; "Run 3 was green: 124 s, exit 0, 170 e2e passed"                                                                                              |
| `2026-10-14-clean-architecture-pilot.md`    | :67, :125  | verify runs 2, 3, 4 at 138 / 155 / 143 s; "run 4 exit 0 in 143 s … 171 e2e passed"                                                                               |
| `2026-10-14-clean-architecture-pilot.md`    | :166       | "verify, green … 107 s, exit 0, 172 e2e"                                                                                                                         |
| `2026-10-16-delete-meetings-and-files.md`   | :42        | "`pnpm verify` exit 0 in 112 s … 184 e2e passed"                                                                                                                 |
| `2026-10-16-meetings-clean-architecture.md` | :61, :149  | verify runs 1, 2, 3 at 83 / 111 / 123 s; "exit 0 in 123 s on fresh servers … 173 e2e passed"                                                                     |
| `2026-10-16-web-e2e-flake.md`               | :13        | "Elapsed wall-clock for the cycle: 95 min 30 s"                                                                                                                  |
| `2026-10-16-web-e2e-flake.md`               | :91–:92    | runs 2, 3, 4 green "at 91 s / 97 s / 99 s … with the e2e step at 53.8 s / 1.0 min / 57.8 s. The warm-up costs about 6.2 s per run on an unloaded, fresh `.next`" |
| `2026-10-16-web-e2e-flake.md`               | :37        | reproduction "red 3 of 5 under 7 busy-loops at default workers, unloaded green 3 of 3"                                                                           |
| `2026-10-16-web-e2e-flake.md`               | :8         | "a serial `globalSetup` warm-up, `e2e/fixtures/warm-up.ts`"                                                                                                      |

Worker figures: `2026-10-16-web-e2e-flake.md:37` (default workers under load); `docs/CHANGELOG.md:125` (FX-052, "up to 14 workers"); `docs/BACKLOG.md:34` (BL-063, "14 busy-loops"). The record gives no per-worker timing.

Not found: a profiling record that measures the warm-up's necessity, or a run with a per-test cleanup step timed. Searched `docs/profiling/` for `e2e|worker|playwright|verify|seconds`.

## 5. Previous plans (`docs/plans/`)

| Source (file:line)                                                                     | Quoted text                                                                                                                                      |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `docs/plans/delete-meetings-and-files/delete-meetings-and-files.plan.md:19-20`         | "The suite reshaping (API login, user pool, storage state) is the owner's follow-up and not filed by this plan."                                 |
| `docs/plans/feature-plan-testing.md:151`                                               | "We therefore log in through the UI rather than forging a cookie"                                                                                |
| `docs/plans/feature-plan-testing.md:153-155`                                           | "The scheme is a worker-scoped cache whose value is a **function** of the user, plus a test option"                                              |
| `docs/plans/plan-review-2.md:127`                                                      | "For a **worker-scoped** option, Playwright 1.62.1 rejects"                                                                                      |
| `docs/plans/plan-review-2.md:153`                                                      | "Replace the scheme … with a **worker-scoped cache keyed by**"                                                                                   |
| `docs/plans/plan-review-1.md:202`                                                      | "M4 — `authedPage` as a worker-scoped fixture cannot be parameterized per user."                                                                 |
| `docs/plans/plan-review-1.md:227`                                                      | "`test.use({ storageState: undefined })` is a no-op, since there is no global `storageState`"                                                    |
| `docs/plans/meeting-files/research/tests.md:206-207`                                   | "`authedPage` (test fixture, fresh context per test from the cached state). UI login walks the real form path"                                   |
| `docs/plans/design-language-rollout/research/tests.md:173`                             | "`authedPage` is produced by a UI login through this exact form"                                                                                 |
| `docs/plans/meeting-files/research/history.md:361`                                     | "`storage` → `e622344` — matched Playwright's `storageState` session-persistence mechanism"                                                      |
| `docs/plans/feature-plan-testing.md:145`                                               | "a dedicated owner per mutating spec file (`planner` for api, `organizer` for web)"                                                              |
| `docs/plans/meetings-detail-participants/meetings-detail-participants.plan.md:146-147` | "Two of the seven fixture arrays stay unguarded — `planner`'s and `organizer`'s … those two are mutating sandboxes (T9). A decision, not a gap." |

Not found: a previous plan proposing a seeded pool of browser users, or a plan with the workers figure 7. Searched `docs/plans` for `test pool|user pool|pool of|storageState|storage state|workers|sandbox`.

## 6. Decisions (ADRs) touching the area

| ADR      | Title (from filename)                                                                | Relevant line (quoted)                                                                                                                                                |
| -------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ADR-0012 | worktree-parallelism ("Parallel agents are isolated by git worktree, never by port") | `docs/adr/ADR-0012-worktree-parallelism.md:15`: `FACT-3221` "In one tree, two runs share `test-results/`, `playwright-report/` and the `storageState` files by name." |
| ADR-0007 | in-memory-store (superseded by ADR-0027 per `FT-007`)                                | `FACT-3126` (line 25-26), see §3c                                                                                                                                     |
| ADR-0027 | postgres-prisma-store                                                                | `FACT-3580`: "Test isolation stays isolation-through-data" (`docs/adr/ADR-0027-postgres-prisma-store.md:69`)                                                          |
| ADR-0029 | file-bytes-in-the-database                                                           | `FACT-3642` (`docs/adr/ADR-0029-file-bytes-in-the-database.md:109`): "An upload is refused when the meeting already holds ten files"                                  |
| ADR-0022 | fact-lifecycle                                                                       | `FACT-3487` (`docs/adr/ADR-0022-fact-lifecycle.md:42`): retirement route used by BL-068                                                                               |
| ADR-0035 | api-ports-and-adapters-style                                                         | constrains `DELETE` layering in `FT-010`                                                                                                                              |

Not found: an ADR stating "every UI flow once, elsewhere via API" or a separate e2e API layer. Searched `docs/adr` and the corpus (`docs/architecture.md`, `docs/data-model.md`, `docs/api-contract.md`, `docs/security.md`, `docs/process.md`, `e2e/README.md`) for `storageState|API login|UI login|log in through|user pool|workers|fullyParallel|warm-up|cleanup`. The hits were `ADR-0012:15`, `e2e/README.md:123`, `:226`, `:241-245` (cleanup rules), `:340` (warm-up in "Run economics").

### 6a. Facts about the seed users and the cap

| Fact        | Text (quoted)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Source                                                             |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `FACT-1036` | "`planner@purpleschool.test` owns one meeting and is the mutation sandbox for `*.api.spec.ts`." (retired by `FACT-1071`; re-run correction, the first pass misquoted it as "owns two meetings")                                                                                                                                                                                                                                                                                                                                                                               | `docs/data-model.md:326`                                           |
| `FACT-1038` | "All four users share one password" (retired by `FACT-1086`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `docs/data-model.md:332`                                           |
| `FACT-1040` | "Playwright runs the `api` and `web` projects in parallel against one store, so there are two separate mutation sandboxes." (retired by `FACT-1087`)                                                                                                                                                                                                                                                                                                                                                                                                                          | `docs/data-model.md:333`                                           |
| `FACT-1086` | "All five users share one password, `Passw0rd!`."                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `docs/data-model.md:187`                                           |
| `FACT-1085` | `eraser@purpleschool.test`, "owns no meetings; used by `HD-API-23` alone"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `docs/data-model.md:164`                                           |
| `FACT-1071` | `planner@purpleschool.test`, "mutation sandbox for `*.api.spec.ts`"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `docs/data-model.md:162`                                           |
| `FACT-1037` | `organizer@purpleschool.test`, "mutation sandbox for `*.functional.spec.ts`"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `docs/data-model.md:163`                                           |
| `FACT-3642` | occurrences found by grep outside the ADR: `docs/api-contract.md:301` ("`FACT-3642`, `MF-API-15`"); `docs/plans/clean-architecture-pilot/design.md:102, 138`; `docs/plans/clean-architecture-pilot/research/contract.md:78`. `BL-068` counts "ten living citations across five roles"; this grep found fewer, so the full count is Not found. **Superseded (re-run):** this grep covered `docs/` only. A repository grep outside `docs/plans` and `docs/profiling` finds ten living citing files plus `docs/facts-lock.json`, matching `BL-068`'s ten — see `contract.md` §7. | `docs/adr/ADR-0029-file-bytes-in-the-database.md:109` (definition) |

Note: `FACT-1040` and `FACT-1038` are retired by `FACT-1087` and `FACT-1086` respectively. `FACT-1087` was not read here (**answered elsewhere:** `contract.md` §1 quotes it, `docs/data-model.md:189-191`).

Not found: the retirement of `FACT-3642` (BL-068's route) has not been performed in the corpus. `docs/security.md:92` was not read; the grep for `FACT-3642` in `docs/` did not return it (**answered elsewhere:** `contract.md` "The ten-file cap" and §3 quote `docs/security.md:92`, which carries no key).

## 7. Recent changes (last commits on the named files)

- `39acdbb` feat(api): delete a meeting and a meeting file — created `cleanup.api.ts` and the `eraser` seed user.
- `344240c` fix(e2e): compile web routes once before the parallel suite — added `e2e/fixtures/warm-up.ts`, wired in `playwright.config.ts`.
- `18b27f6` feat: store meetings in PostgreSQL via Prisma and add file attachments — `purpleschool_e2e` database reset and reseeded per run (`docs/CHANGELOG.md:41`, FT-007).
- `48d9256` feat(api): add participants[] and GET /meetings/:id — one of the `mutation sandbox` string commits (§3c); `docs/plans/meetings-detail-participants/` is the plan that cites the sandboxes.
- `39e9e0c` chore: whole project migrated to English and comments condensed.

## Not found

- **Not found:** an FT, CH or FX entry recording a seeded pool of ten browser users, a Playwright storage state built from an API token, or per-test API cleanup as a shipped change — searched `docs/CHANGELOG.md` (all rows matching `e2e|fixture|login|worker|seed|sandbox|cleanup|storage|pool`) and `git log --grep` not run for this term.
- **Not found:** a BL row, Rejected row or ADR for "UI login only once, everything else via API" — searched `docs/BACKLOG.md` (Open, Closed, Rejected at `:110-125`) and `docs/adr/` by grep for `UI login|API login|log in through|user pool`.
- **Not found:** a worker count of 7 in any record — searched `docs/profiling/`, `docs/plans/`, `docs/CHANGELOG.md` and `docs/BACKLOG.md` for `workers` and `7 workers`.
- **Not found:** a measurement of the warm-up's necessity with the warm-up removed — searched `docs/profiling/` (`2026-10-16-web-e2e-flake.md`) and `docs/CHANGELOG.md:125` (FX-052 control experiment: "control experiment (the `globalSetup` line disabled) green, green, red on run 3"; that is a control, not a timing).
- **Not found:** the commit that first added `storageState` to `e2e/fixtures/auth.fixture.ts` — searched `git log -S 'storageState' -- playwright.config.ts` (no commit).
- **Not found:** the commit subject stating why `eraser` was added beyond "feat(api): delete a meeting and a meeting file" — searched `git log -S 'eraser'`; the reason is only in `docs/plans/delete-meetings-and-files/delete-meetings-and-files.plan.md:76-77`.
- ~~**Not found:** the full set of `FACT-3642` citations (BL-068 says ten) — searched `grep -rn FACT-3642 docs`; found six occurrences.~~ **Superseded (re-run):** the repository-wide list is in `contract.md` §7: ten living citing files plus `docs/facts-lock.json`.
- **Not found:** the current `workers` value in `playwright.config.ts` — not read; only the planning quotes at `docs/plans/meeting-files/research/tests.md:219` were found. **Answered elsewhere:** `code.md` §4 and `tests.md` §7 read `playwright.config.ts:31`, `workers: isCI ? 1 : undefined`.
