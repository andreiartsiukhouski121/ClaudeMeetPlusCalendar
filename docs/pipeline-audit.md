# Development pipeline audit

> **ARCHIVE.** An independent review of the **process** (not of the feature code), dated
> 2026-09-08. Kept as a dated record of what was measured and decided; the numbers are those
> measured then and are deliberately not updated. Translated into English in `CH-014` and
> condensed; every finding, number and verdict is preserved.

The reviewer did not take part in the first iteration. Every number below is either the output of a
command run on this repository that day or arithmetic over the supplied measurements. Where
verification was impossible, it says so.

Machine: Windows 11, `pnpm@10.32.1`, Node v24.14.0, warm `.next` (222 MB), working tree on
`master`, ports 3000/3001/3100/3101 free at the start.

---

## 1. Verdict

**Needs rework in one dimension and is ready with caveats in every other.**

The main reason: **the declared parallel development is physically impossible in this working
tree**, and that is not a hypothesis but a reproduced failure. Next 16 registers its dev server
**per project directory** rather than per port, so two `next dev` processes in `apps/web` are
mutually exclusive at any ports. Verified: the second Playwright run dies with
`Process from config.webServer was not able to start`, and — worse — **an ordinary `pnpm dev` on
:3000, which the skills themselves prescribe keeping up for acceptance step 9, blocks `pnpm e2e`
entirely** (rc=1, zero tests executed). That directly refutes `playwright-verify`'s claim that
"ordinary `pnpm dev` on 3000/3001 keeps working in parallel and disturbs nothing".

Second: the suite is **not green**. `SEC-API-05` (timing) failed on the very first control run on an
idle machine (ratio 2.518 against a threshold of 2.5) and again under load; of four completed runs
it went red in two. By `regression-verify` that is a "feature not accepted" blocker, and by §5.1 the
implementer must assume "the code is wrong" — so the pipeline routinely produces a false report that
a timing vulnerability has returned.

Third: the numbers three sections of the documentation rest on ("62 e2e", "41 units", "`pnpm verify`
— 1 m 31 s", the expected-count table in test plan §6.6) are stale. The facts are 77 e2e and 42
units, and `pnpm verify` takes 42.85 s. `regression-verify` itself declares a mismatch with §6.6 a
blocker, so **acceptance cannot be green by its own rules**.

What genuinely works and should be kept: the convention meta-test, the `.cases.md` ↔ spec pairing,
the demand for an actual run before the word "done", control experiments as an idea, and
`e2e/security/**` as a cross-feature suite — it found three real defects, which the commit history
confirms.

---

## 2. Top five findings

1. **P1 — parallelism is declared but impossible:** `pnpm dev` on :3000, or a second Playwright run
   on other ports in the same tree, kills `next dev` outright ("Another next dev server is already
   running", rc=1, 0 tests). See §5 and §7 (verified facts 5–7).
2. **P1 — `SEC-API-05` flakes in 2 runs out of 4 and produces a false report that the timing
   vulnerability is back**; the measurement is also systematically biased by sample order. See §6.
3. **P1 — acceptance cannot be green:** the blocker "the actual test count did not match table
   §6.6" fires every time (53 against 68 e2e, 38 against 42 units). A rule that cannot be satisfied
   teaches people to ignore every other blocker.
4. **P1 — 46% of the tokens (1,005,347) went to plan review, rework and repeat reviews without
   producing a line of product code**, and that whole class of work was routed to the most expensive
   model. Sensible routing plus dropping the redundant iterations gives −48% cost and −33% tokens.
   See §4.
5. **P2 — `regression-verify` holds three mutually contradictory prescriptions** ("all 8 steps are
   mandatory, skipping one is a blocker" / "by default just do one `pnpm verify`" / "after a fix,
   the whole pipeline again from step 1" against "a repeat full run adds almost nothing"). Measured
   cost of following it literally: 118 s of ladder against 43 s of `pnpm verify`. See §3.1.

---

## 3. Findings across seven dimensions

### 3.1 Efficiency

**P2. `regression-verify` gives the implementer two mutually exclusive prescriptions in one skill.**
One line says "steps 1–8 are **mandatory**. Skipping any is a blocker, not a saving". Another says
"**therefore acceptance by default goes like this:** `pnpm verify`" — and lists what `verify`
covers: "steps 2, 3, 4 (in the `pnpm test` part) and 5–8", that is, **it does not cover step 1 at
all** and substitutes step 4 (`pnpm test` instead of `pnpm test:<feature>`). Reading both, the
implementer either runs the ladder and spends twice as long, or runs `pnpm verify` and formally
violates a blocker. Measured that day:

| Path                                                     | Time        | What it covers                           |
| -------------------------------------------------------- | ----------- | ---------------------------------------- |
| The 8-step ladder taken literally (12 calls, 2 features) | **118 s**   | steps 1–8 plus audit                     |
| `pnpm verify`                                            | **42.85 s** | audit, lint, typecheck, 42 units, 77 e2e |

A difference of 75 s per pass. Steps 1, 5, 6 and 7 are **strict subsets** of step 8 (`pnpm e2e` runs
`suite-integrity`, `smoke`, both features and security), so on the green path they yield zero
information. Exact fix: replace "steps 1–8 are mandatory" with "a green `pnpm verify` is mandatory;
the step breakdown is a localization tool", and drop the "skipped step" blocker.

**P2. "Everything again after a fix" contradicts "a repeat run adds no information".** §5 item 6
says "After a fix — the **whole** pipeline again, from step 1". The same file, §2: "What else not to
do: **repeat the full suite** for another green result." Both paragraphs are about the same action.
Fix: keep "after a fix — one `pnpm verify`" and delete the other.

**P1. The "100 minutes of planning against 85 of code" skew is described but not removed — it was
carried into new artifacts as a budget below the observed minimum.** Of the ten agents in the first
iteration, **none** finished faster than 8.7 minutes; the median was 21.4. The new budget
(`feature-pipeline` §7) allots 7 minutes to the spike, 10 to the plan and 12 to the review — three
of six stages placed inside an interval that one agent out of ten reached. More in §3.2.

**P2. The canonical status of the two historical plans is not revoked — it is confirmed in two
places.** `docs/plans/README.md` says "a **historical document** … not to be taken as a model", yet
the same file also says "priority rule on divergence: for tests … the test plan wins",
`regression-verify` says "the suite specification is `feature-plan-testing.md`", and `e2e/README.md`
says "the canonical source of the convention and the full case list is `feature-plan-testing.md`".
The result: every new implementer must read 154 KB of a document declared obsolete. Measured: the
two plans are 309,182 characters ≈ 124k tokens. Fix: move the live convention from test plan §1, §2
and §5 into `e2e/README.md` (where most of it already is), put an "archive, do not cite" banner on
both plans, and remove them from every skill reference.

**P3. The same paragraph duplicated across four files.** The "Measured on this repository … one
`pnpm e2e` — 28 s; seven calls — 99 s; `pnpm verify` — 1 m 31 s" paragraph appears verbatim in
`CLAUDE.md`, `e2e/README.md`, `regression-verify` and `feature-pipeline`. All four copies are now
wrong (see §3.2). Fix: one place (`e2e/README.md`), a reference everywhere else.

**P3. `CLAUDE.md` promises fifteen invariants and contains nineteen.** A trifle, but it is exactly
the class of "bookkeeping introduced by editing the document" that the pipeline itself names as the
main source of overspend.

**P3. The `pnpm verify` description does not mention `pnpm audit`**, which stands **first** in the
script. The consequence is in §3.4.

### 3.2 Speed

**P1. The 68-minute budget is not supported by the first iteration's measurements on three of six
stages.** Observed agent durations: minimum 8.7 min, median 21.4, maximum 28.5. Recomputing the
first iteration "as if it had run through the new pipeline", substituting measured times:

| Stage                       | Budget (§7) | Nearest measured analogue                      | Realistic                   |
| --------------------------- | ----------- | ---------------------------------------------- | --------------------------- |
| Spike                       | 7           | no analogue; the fastest agent was 8.7         | 9                           |
| Plan                        | 10          | the implementation plan author — 16.4          | 16                          |
| Plan review                 | 12          | review 3 (narrow) — 8.7; review 1 — 24.5       | 9 narrow, 24 full           |
| Implementation (back ∥ web) | 25          | max(18.5, 22.8) = 22.8                         | 23                          |
| Acceptance                  | 10          | (`pnpm verify` = 43 s, the rest is agent time) | 10                          |
| Security                    | 3           | —                                              | 3                           |
| **Total**                   | **68**      |                                                | **70 (narrow) … 85 (full)** |

Conclusion: the budget is reachable, **but only if the review stays narrow like review 3** and the
plan stays within 150 lines. There is no slack in 68 minutes: any return to a full review (24.5 min)
pushes the budget to 85. Fix: state a range of 70–85 in §7 and name the condition.

**P1. "Two features ≈ 90 minutes" rests on parallelism this tree does not have.**
`feature-pipeline` §4 and §7 assume the backend and the web side run simultaneously. It was measured
that day that two simultaneous Playwright runs in one tree are impossible in principle (§3.5). While
agents share a tree, "parallel implementation" means "writing code in parallel with no way to verify
it by running" — that is, sequential verification. Fix: make a worktree a **mandatory** condition of
the parallel stage rather than an option "if files might overlap".

**P2. The run measurements in the documentation are roughly double the truth.** Measured that day:
`pnpm verify` — **42.85 s** (claimed 1 m 31 s); `pnpm e2e` — **27 s** (claimed 28 s, agrees); the
8-step ladder — 118 s. The declared composition of `verify` ("41 units + 62 e2e") does not match the
fact: 42 units and 77 e2e. Fix: measure once, record in one place, add the measurement date.

**P2. Stages that cannot be compressed.** Every `pnpm e2e …` call starts **both** `webServer`s,
`next dev` included, even for `--project=api`: across a 12-call ladder `next dev` started **7
times** (= the number of e2e calls). That is a fixed ~9–10 s per call and explains why the step
breakdown is expensive. Only a config change can fix it (moving the web `webServer` into the `web`
project), not discipline.

**P3. The claimed compression "19 + 23 → 23 minutes" is not supported**, because it runs into §3.5:
without a worktree, one of the two agents cannot run e2e at all. Formally the 19-minute saving
exists only for the stage "write code without verifying it".

### 3.3 Cost: tokens, models, routing

The full calculation is in §4. In short:

**P1. 1,005,347 tokens (46.5% of the spend) went to plan reviews 1–3 and the rework agent.** They
produced no product code. In time that is 83.1 minutes out of 193 (43%).

**P1. Not one of the ten agents was passed a `model` parameter** — by the `Agent` tool's contract
they all inherited the parent's model (Opus class). A mechanical markdown edit (the rework agent,
288,292 tokens — second largest in the list) ran on the same model as writing code.

**P1. The planners were launched as the read-only `Plan` type and could not write files** — the lead
agent retyped their output by hand (~2000 lines). That is not only its time: retyped text becomes
output tokens in the most expensive context and is then paid for again as input on every later turn.
Fix: give the planner a type with write access and an explicit "write the file at
`docs/plans/<feature>.md` and return only the path plus a five-line summary".

**P2. There are no `.claude/agents/*.md` in the repository** (`ls .claude/agents` → no such
directory). Besides pinning the model, they would give: a trimmed tool set (a plan reviewer needs no
`Write`, `Edit` or `Bash`), a stable system prompt instead of a ~1500-word prompt per call, and
reproducibility — today the pipeline's behaviour depends on what the lead agent happens to put in
the prompt.

### 3.4 Security of the development process itself

**P1. `.mcp.json` installs an unpinned package from the network on every start.**
`"command": "npx", "args": ["-y", "@playwright/mcp@latest", …]`. `-y` suppresses the install
confirmation and `@latest` removes any version control. In practice: code that gets access to the
browser and to this project's page content updates silently and without confirmation; a compromised
package or a major-version mistake arrives at the next Claude Code start. Fix: pin the version and
drop `-y`, making updates a deliberate step; better still, install it into the root devDependencies
and run `pnpm exec`, so the version falls under `pnpm-lock.yaml` and `pnpm audit`.

**P1. Subagent permissions are unrestricted.** All ten agents of the first iteration were
`general-purpose` with the full tool set. Concretely excessive: the plan reviewer (three calls,
717,055 tokens) needs only `Read`/`Grep`/`Glob`, yet was granted write access to any file and the
ability to run any command. Fix: agent definitions in `.claude/agents/` with a `tools` field;
read-only for the reviewer. That also removes the "the reviewer decided to fix it while it was
there" risk, which `regression-verify` §5 item 5 forbids in words but not by mechanism.

**P1. The `pre-commit` hook silently changes the content of a commit.** `.husky/pre-commit` runs
`pnpm lint-staged`, which runs `eslint --fix` and `prettier --write` over all staged files.
lint-staged by design returns the modified files to the index, so what is committed is **not** what
the implementer read and verified by running. For an agent that is especially dangerous: it reports
"a green run on this diff" while a different diff was committed. The check on a live commit was not
performed (the audit's terms forbid changing the repository), so this finding rests on the
configuration and on lint-staged's documented behaviour. Fix: replace `--fix`/`--write` with
checking variants and fail instead of fixing; do the formatting explicitly with `pnpm format` before
committing.

**P2. `Stop-Process` by PID from `netstat` is sound practice, but the pipeline nudges towards the
worse variant.** `regression-verify` §1 and `playwright-verify` §7 give the right recipe (find the
PID, kill one) and both honestly warn about `Get-Process node | Stop-Process -Force`. The real risk
turned up elsewhere: when two runs collide, **Next itself prints a ready-made command**
`taskkill /PID 18932 /F to stop it and start a new one` (recorded in probe 1's log). An agent
following the tool's suggestion will kill another agent's or the user's dev server. Fix: state
explicitly in the skills that the PID from Next's hint must not be killed — the right answer is your
own worktree.

**P2. `pnpm verify` begins with a network step and does not run at all offline.** The script is
`pnpm audit … && pnpm lint && …`. Verified: `pnpm audit --audit-level high` with an unreachable
registry → `rc=1`; consequently not a single test runs, and the implementer gets a network stack
trace instead of a check result. Fix: move `audit` to the end of the chain or into a separate
`verify:deps` script.

**What the pipeline lacks — what is needed and what is cargo cult:**

| Check                                          | Verdict          | Why                                                                                                                                                        |
| ---------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scanning for secrets **in git history**        | **needed**       | `SEC-API-10` only looks at the working tree. One `git log -p -S` over key patterns in CI is enough; today a leaked and deleted `.env` would never be found |
| Pinning the MCP package version                | **needed**       | see above — the only unpinned executable code in the development loop                                                                                      |
| `pnpm install --frozen-lockfile` in acceptance | **needed**       | not done anywhere today; a lock file divergence surfaces "eventually"                                                                                      |
| CI (`.github/workflows`)                       | **needed later** | no remote yet; the omission is named explicitly and correctly in `docs/plans/README.md`                                                                    |
| SAST                                           | **needed later** | on 288 statements of code the return is lower than from the type-aware ESLint already in place                                                             |
| Licence checks                                 | **cargo cult**   | a private learning monorepo with no distribution                                                                                                           |
| Lock file integrity by signature               | **cargo cult**   | no CI, no publishing; `--frozen-lockfile` covers the practical part                                                                                        |

### 3.5 Isolation of parallel development

This dimension was checked by running things rather than by reading. The results refute the
pipeline's claims.

**P1. `.next` is not isolated by ports. The second run does not start at all.** Probe: two
`pnpm e2e` at once in one tree, with `E2E_WEB_PORT=3200/3201` and `3300/3301`. Result: run B —
`77 passed`; run A — **rc=1, zero tests**:

```
[WebServer] ✓ Ready in 584ms
[WebServer] ⨯ Another next dev server is already running.
[WebServer] - Local:        http://localhost:3300
[WebServer] - PID:          18932
[WebServer] - Dir:          C:\GIT\PurpleSchool\apps\web
Error: Process from config.webServer was not able to start. Exit code: 1
```

The `Dir:` line is the key: dev server registration is bound to the **project directory**, not the
port. So `E2E_WEB_PORT` isolates nothing, and the claim in `CLAUDE.md` / `feature-pipeline` §4 /
`e2e/README.md` ("two agents get their own port ranges … verified by a run") is **false** for the
`web` project. It was also verified that this is not Playwright-specific: an ordinary `pnpm dev`
(web) on :3000 kills `pnpm e2e` with the same message (probe 5) — meaning acceptance step 9 (the
interactive check on `pnpm dev`) and step 8 (`pnpm e2e`) are **mutually exclusive in one tree**,
while `playwright-verify` states the opposite verbatim.

**P1. If an agent forgets the ports, the two runs corrupt each other — and one failure looks like a
security defect.** Probe: two `pnpm e2e` on the default ports, the second started 12 s later.
Result: A — `77 passed (54.0s)` (twice as slow as a solo run); B — `3 failed, 1 did not run,
73 passed`, namely:

- `SEC-API-05` — "medians: unknown email 309 ms, wrong password 114 ms — the difference reveals the
  account exists". A false report that the timing vulnerability is back;
- `HD-FN-07` (mutating, meeting creation) — `element(s) not found`: both runs wrote into one
  in-memory store through one Nest on :3101;
- `SEC-FN-05` — `page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:3100/`: run A finished
  first and tore down the servers run B was reusing through `reuseExistingServer`.

So `reuseExistingServer: !isCI` with matching ports does not merely "give someone else's results" —
it **aborts the run the moment the neighbour finishes**.

**P2. `test-results/`, `playwright-report/`, `blob-report/` are shared and carry no run identity.**
Verified: `playwright-report/index.html` is a single file (whoever finishes later overwrites the
first); `test-results/.last-run.json` is single; session state files are named
`auth-state-w<worker index>-<user>.json`, so two runs collide. Playwright clears `outputDir` on
start, so starting a second run deletes the session state of a running first. Fix: `outputDir` and
`reporter.outputFolder` with a port suffix — or, more reliably, a worktree.

**P2. A shared `JWT_SECRET` turns "someone else's state" from a loud failure into a silent one.**
`playwright.config.ts` pins `JWT_SECRET: 'e2e-secret'` for every run. Verified by probe: a token
issued by server A (:3401) was accepted by server B (:3501) — `GET /auth/me` → `200` — although
their stores differ (`total` 2 against 1). So picked-up foreign session state is not rejected but
authenticates against a different database. Fix: derive the secret from the port, and a foreign
token gives 401, making the failure loud.

**P2. The in-memory store is isolated between processes — the only thing that held up.** Probe: two
Nest instances on :3401 and :3501, a meeting created only on the first → `total` 2 against 1. Within
**one** run the store is shared between the `api` and `web` projects (both talk to one Nest), which
the documentation describes correctly, and the measures (`planner`/`organizer`, `serial`, relative
counters) are adequate.

**P2. A shared git index: the failure is loud but the agent's work is interrupted.** Probe in a
separate repository: two simultaneous `git add -A` → one `rc=0`, the other `rc=128`,
`fatal: Unable to create '.git/index.lock': File exists`. In one tree that also means a shared
working branch: one agent's `git checkout -b feat/…` switches files under the other, and `pre-commit`
with `--fix` touches the neighbour's staged files.

**P2. `node_modules` is not isolated, and the failure is silent.** Probe: two simultaneous
`pnpm install --frozen-lockfile` in one tree. Both returned **rc=0**, but the second printed
`WARN Failed to create bin at …\apps\api\node_modules\.bin\vitest. ENOENT`. So the race for bin shims
ends in "success" with a warning; the tree stayed usable (`pnpm test` → 29 + 13 passed), but nobody
guarantees that is reproducible. Since adding a dependency is a routine feature step, this is a real
scenario.

**P2. The dependency graph of implementation plan §5 yields formally independent tasks that conflict
by file.** Verified from the commit history: `apps/api/src/app.module.ts` was edited by **both**
feature 1 (`7c4fc5b`, +26 lines) and feature 2 (`4bedc02`, +3); `e2e/README.md` was edited by both
feature commits and three more on top. In the graph, `T1.3` and `T2.2` are formally parallel yet
touch one file. The same holds for `e2e/README.md` (the acceptance checklist item "`e2e/README.md`
gained a row" applies per feature) and for `*.unit.cases.md`, which both the backend and the web
side must extend. Fix: add a mandatory "files" column to the plan template **with an overlap check**
— tasks sharing a file are not marked parallel, and a shared file becomes its own merge task.

**P2. The `agent-team` skill closes the main risk but is mentioned in the wrong place and lives
outside the repository.** `feature-pipeline` §4 calls it optional ("if files might overlap"), while
the measurements show a worktree is the **only** way to run two runs at all. The skill itself lives
in the user directory rather than in the repository's `.claude/skills/`: on another machine or in a
fresh clone the pipeline would reference a non-existent skill. Fix: (1) make a worktree mandatory for
any parallel stage in `feature-pipeline` §4, `CLAUDE.md` and `TEMPLATE.md`, explaining the `Dir:`
registration; (2) either move `agent-team` into the repository or stop referring to it as part of
the project pipeline.

### 3.6 Completeness of the checks

**P1. `SEC-API-05` is not a "flake risk" but a measured 50% flake, and its measurement is
systematically biased.** Observations that day: a solo run on an idle machine — **failed** (141 ms
against 56 ms, ratio 2.518 against a threshold of 2.5); a run under parallel load — **failed** (309
against 114, ratio 2.71); two other runs passed (in one, the case took 735 ms). Two failures out of
four completed runs. The cause is not load as such: the spec measures five requests for the unknown
email first and only then five for the wrong password. The first series pays the warm-up (JIT, the
first `scrypt`), the second does not, and the ratio is computed as `max/min`, so it fires in
**either** direction. Hence the inverted sign of the observed difference: the "vulnerability" shows
the _unknown_ email as slower, which is exactly what the defence was built against. A threshold of
2.5 against a baseline difference of 2.5 is a threshold set flush against the measured quantity.
Fix: interleave the samples, discard the first two as warm-up, take 15 samples, compare medians
against a threshold of 2.0 **and** add an absolute floor ("a difference under 50 ms is not a
signal"). Until then, drop `@p0` and move the case into a separate script that does not block
acceptance.

**P1. The blocker "the actual test count did not match table §6.6" is impossible to satisfy.** The
table expects 53 e2e and 38 units (+1 baseline). Measured: `pnpm e2e` → **77 tests** (68 feature,
smoke and security, plus 9 meta), `pnpm test` → **42** (29 api + 13 web). The cause is the
`e2e/security/**` suite (15 cases) added after the table was written. Until the table is updated,
any honest implementer must declare the feature not accepted. Fix: delete the expected-count table
and move the check into the meta-test (it can count files and IDs), or drop the item from the
blockers — "comparing against a number in markdown" is exactly the bookkeeping the pipeline itself
names as a source of false blockers.

**P1. Coverage is not measured in the pipeline, and what was measured is half of what it looks
like.** The absence of the metric is itself a finding: the pipeline claims "every level of checks"
without a single number. Measured that day:

| What                        | Command                                             | Result                    |
| --------------------------- | --------------------------------------------------- | ------------------------- |
| api, as the task suggests   | `pnpm --filter @purpleschool/api test:cov`          | **96.07%** stmts (98/102) |
| api, across all `src` files | the same plus `--coverage.include='src/**/*.ts'`    | **68.53%** stmts (98/143) |
| web, across all `src` files | `vitest run --coverage --coverage.include='src/**'` | **26.20%** stmts (38/145) |
| both applications together  | arithmetic                                          | **47.2%** (136/288)       |

That is, the stock `test:cov` counts only the files the tests **imported** in the denominator: 96% is
the coverage of six files, not of the application. The actual holes: `apps/api/src/config/auth.config.ts`
— **0%** (the "`JWT_SECRET` unset → warn + dev default" branch, unverifiable over HTTP),
`apps/api/src/auth/password.service.ts` — 50%, and in web `lib/actions/auth.ts`,
`lib/actions/meetings.ts`, `lib/dal.ts` and `proxy.ts` (all 0%) — that is, **the whole server-side
session check layer** that invariants 10 and 19 rest on. It is covered by e2e, and e2e coverage is
not measured at all. Fix: set `coverage.include: ['src/**']` and thresholds in both vitest configs,
add `@vitest/coverage-v8` to `apps/web` devDependencies, and record the number once in the
acceptance report. A threshold as a blocker is not needed; "the number is stated" is enough.

**P2. The suite size rule contradicts the suite's own contents, and "in the first pass" does not save
it.** `e2e/README.md` says "**in the first pass, only `@p0`, and no more than eight cases per
file**". The fact: `home-dashboard.api.spec.ts` — 16 tests (9 of them `@p0`),
`home-dashboard.functional.spec.ts` — 13 (8 `@p0`), `auth-login.api.spec.ts` — 11 (5 `@p0`),
`auth-login.functional.spec.ts` — 10 (5 `@p0`). Not one feature file obeys the rule, and "in the
first pass" does not distinguish "this feature's first pass" from "the suite's first version". Fix:
rewrite it as a limit on the **increment** ("a new feature: no more than 8 cases per file in the
first commit; more requires a justification in the `.cases.md`") and do not try to automate it — a
mechanical cap on case count is trivially bypassed by splitting the file.

**P2. What the meta-test does not catch — three gaps, one of which fires on the very next feature.**
Verified by running the regexes taken from the file itself
(`CASE_ID_SOURCE = '(?:AL|HD|SM|SEC)-(?:API|FN|UT)-\d{2}'`):

- **a new feature prefix is invisible.** `## PR-API-01 …` is recognized neither as a case heading nor
  as a table row. For a third feature, rules 5, 6 and 7 become **vacuously green**: zero declared
  IDs means nothing to check. That is exactly the failure the "walk self-check" was written against
  — but it checks the file list is non-empty, not the ID list;
- **numbers ≥ 100 are invisible** (`\d{2}`): `## AL-API-100` is not recognized;
- **rule 5 is satisfied by an ID mentioned in a comment**: the check is `specText.includes(id)`, so
  `// AL-API-07 to be automated later` in a spec counts as automation. A commented-out test passes
  the same way.

Beyond that, the meta-test does not check: the presence of tags (`@regression`/`@<slug>`/`@p0`, an
acceptance checklist item that is not automated), that a spec is non-empty, `test.fixme` without a
task link (the `no-skipped-test` ESLint rule does not see it, which is deliberately documented), and
— most importantly — **the completeness of `PROTECTED_ROUTES`/`PROTECTED_PAGES`**. Fix: (1) collect
prefixes from the directory names under `e2e/regression/*` rather than from a literal, and use
`\d{2,3}`; (2) match rule 5 against `test('<ID> — ` rather than `includes`; (3) add a rule 9 that
enumerates routes from the `@Controller/@Get/@Post` decorators and requires every protected one to
appear in `PROTECTED_ROUTES`. Today "the only thing connecting the security suite to a growing
application" is manual discipline, and it is called the only connection in four documents, none of
which contains a check.

**P2. Control experiments are the main claimed value, yet they do not exist as an artifact.**
`feature-pipeline` §6 names them first among "what not to cut", `regression-verify` step 10
prescribes them for **every new case**, and both features have prescribed control points
(`verifyPassword` → `true`; `countByOwner` → `items.length`). Yet there is no file, no script and no
record in the repository that any experiment was performed; the report lives in a chat. Whether they
were done cannot be verified — there is no trace. The concrete risk: a test that is green with the
feature broken is discovered only by another manual experiment, and "from the implementer's memory"
is exactly the kind of omission the pipeline forbids leaving unstated. Fix: make them executable — a
`pnpm mutate:<point>` script that applies a patch from `e2e/mutations/<name>.patch`, runs
`pnpm e2e --grep <expected IDs>`, requires a **red** result and reverts the patch; the acceptance
report then carries that script's output. It is the same "one `sed` plus a filtered run", only
reproducible and verifiable.

**What is missing entirely — what is needed and what is not:**

| Missing                           | Verdict                  | Reasoning                                                                                                                                                                                                                                                                                                                                                              |
| --------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CI (`.github/workflows`)          | needed later             | no remote; the omission is named explicitly. The `isCI` branches in the config are already prepared                                                                                                                                                                                                                                                                    |
| A coverage metric                 | **needed now**           | measured at 47.2%; without a number the phrase "every level of checks" is unverifiable                                                                                                                                                                                                                                                                                 |
| An `.env.example` sync check      | needed now, cheap        | compare `grep -o 'process\.env\.[A-Z_]*'` with the `.env.example` keys: today `TZ` is read in code but absent from the file, and a comment mentions `SESSION_MAX_AGE_SECONDS`, which is not in the code. Ten lines in the meta-test                                                                                                                                    |
| Contract tests web↔api beyond e2e | **cargo cult here**      | web reaches api only through `api-client.ts`, and `HD-FN-11` already pins that the browser never reaches :3101. A separate pact contract would add a third artifact to the same two sides in one repository                                                                                                                                                            |
| React component tests             | **the refusal is right** | the components in `apps/web/src/components` are branchless markup (`meeting-list.tsx` — 27 lines, `logout-button.tsx` — 21); their behaviour is fully checked by `*.functional.spec.ts` through roles and labels. But the refusal must be recorded together with its price: 0% unit coverage of the server actions is not "components", and that is what needs closing |
| Mutation testing                  | needed later             | control experiments are its manual analogue; automate those first, then discuss Stryker                                                                                                                                                                                                                                                                                |
| a11y checks                       | needed later, cheap      | the suite is already entirely on `getByRole`/`getByLabel`, so half the work is done; `@axe-core/playwright` on two pages is one case                                                                                                                                                                                                                                   |
| Visual regression                 | **cargo cult here**      | hashed CSS modules, two pages, and screenshots on a Windows agent would flake on fonts                                                                                                                                                                                                                                                                                 |
| Load and performance              | **cargo cult here**      | an in-memory store and no deployment. The one performance-sensitive case (`SEC-API-05`) has already shown this rig cannot measure time under the load of a run                                                                                                                                                                                                         |

### 3.7 Engineering against ritual

**Real engineering** (it yields information obtainable no other way):

- `e2e/suite-integrity.api.spec.ts` — catches a class of failure invisible to types, lint and review
  (a file without a suffix silently never runs). Written once, works forever. The gaps from §3.6 are
  treatable rather than fatal to the idea;
- `e2e/security/**` — three defects in live code (`X-Powered-By`, timing, `ERR_TOO_MANY_REDIRECTS`),
  confirmed by commit `daf86b2`. The only part of the pipeline with proven return;
- the demand for an actual run before the word "done" — it separates a result from a report of one;
- the `.cases.md` ↔ spec pairing — it keeps the documentation from drifting, by machine;
- the "Project invariants" section in `CLAUDE.md` — 19 rules instead of 2000 lines of plans. The
  direction is right (see §4.4 on why it is not yet enough).

**Ritual** (it reproduces the form without the substance):

- **the 8-step ladder** on the green path: steps 1, 5, 6 and 7 are subsets of step 8, cost 75 s and
  add no observation;
- **"after a fix, the whole pipeline again from step 1"** — it directly contradicts the same skill's
  own observation that a repeat run is useless;
- **the expected-test-count table** — comparing markdown against reality by hand; already diverged
  and already makes acceptance formally impossible;
- **the coverage matrix** (test plan §7) — 40 lines, cancelled by the project's own template
  ("a coverage matrix is not needed") yet still sitting in the "canonical source";
- **the three plan review documents** (1416 lines) — 46.5% of the first iteration's tokens; their
  content either moved into the invariants or was bookkeeping about the documents themselves;
- **four copies of the "Run economics" paragraph**, all four with stale numbers;
- **the claim "verified by a run" about parallel ports** — the most expensive kind of ritual: a
  reference to a check that never happened in the form described.

---

## 4. Cost

### 4.1 Models and prices

Source: the `claude-api` skill (cache of 2026-06-24), list Claude API rates:

| Model            | ID                 | Input $/1M | Output $/1M | Blended at 90/10 |
| ---------------- | ------------------ | ---------- | ----------- | ---------------- |
| Claude Opus 5    | `claude-opus-5`    | 5.00       | 25.00       | **7.00**         |
| Claude Sonnet 5  | `claude-sonnet-5`  | 2.00       | 10.00       | **2.80**         |
| Claude Haiku 4.5 | `claude-haiku-4-5` | 1.00       | 5.00        | **1.40**         |
| Claude Fable 5.1 | `claude-fable-5-1` | 10.00      | 50.00       | 14.00            |

Assumptions, stated explicitly: (1) 2,161,851 is the total token count with no input/output split,
so 90% input / 10% output is assumed — typical for agentic subagents, where the context is resent
every turn; at 95/5 every sum below falls by 14%; (2) prompt caching is not accounted for — there is
no `cache_read_input_tokens` data, and with an active cache the input part drops to ~10%, so the
absolute sums fall while the **relative** saving from routing holds; (3) the parent model is Opus
class.

### 4.2 Cost of the first iteration, and of the same work with sensible routing

| Role                       | Tokens        | Min     | Actual: Opus 5 | Proposed model | Cost with routing |
| -------------------------- | ------------- | ------- | -------------- | -------------- | ----------------- |
| Test plan author           | 59,733        | 8.7     | $0.42          | Sonnet 5       | $0.17             |
| Implementation plan author | 115,530       | 16.4    | $0.81          | **Opus 5**     | $0.81             |
| Plan review 1              | 232,729       | 24.5    | $1.63          | Sonnet 5       | $0.65             |
| Plan rework agent          | 288,292       | 28.5    | $2.02          | Haiku 4.5      | $0.40             |
| Plan review 2              | 276,118       | 21.4    | $1.93          | Sonnet 5       | $0.77             |
| Plan review 3 (narrow)     | 208,208       | 8.7     | $1.46          | Sonnet 5       | $0.58             |
| Suite scaffold T0          | 174,354       | 16.1    | $1.22          | Sonnet 5       | $0.49             |
| Feature 1 backend          | 226,880       | 18.5    | $1.59          | **Opus 5**     | $1.59             |
| Feature 1 web              | 261,229       | 22.8    | $1.83          | **Opus 5**     | $1.83             |
| Feature 2 end to end       | 318,778       | 27.3    | $2.23          | **Opus 5**     | $2.23             |
| **Total**                  | **2,161,851** | **193** | **$15.13**     |                | **$9.52 (−37%)**  |

Scenario "new pipeline + routing" (a ~60k-token spike on Sonnet added; review 2, review 3 and the
rework agent dropped as a class of work; the test plan as a document abolished, its 59,733 tokens
re-labelled as "writing `.cases.md`"):

| Scenario                           | Tokens           | Cost (90/10)     | Cost (95/5) |
| ---------------------------------- | ---------------- | ---------------- | ----------- |
| A. As it was: everything on Opus 5 | 2,161,851        | **$15.13**       | $12.97      |
| B. Same volume, sensible routing   | 2,161,851        | **$9.52** (−37%) | $8.16       |
| C. New pipeline + routing          | 1,449,233 (−33%) | **$7.93 (−48%)** | $6.80       |

**An honest caveat about money.** The absolute sums are small: fifteen dollars for two features is
not a figure worth redesigning a process over. The real currency here is **wall-clock (193 minutes of
agent time) and context**, with money only as their indicator. So the main conclusion of §4 is not
"−48% cost" but "−33% tokens and −83 minutes spent reading and editing documents". Routing is the
second lever; the first is not doing work that yields no information.

### 4.3 The role → model matrix

| Role                               | Nature of the work                            | Model                                       | Reasoning                                                                                                                                                                                      |
| ---------------------------------- | --------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Assumption spike                   | write 20 lines, run them, read the error      | **Sonnet 5**                                | verification is external (the runtime); a weak model's mistake is caught by the run in seconds                                                                                                 |
| Implementation plan                | architecture, trade-offs, feature boundaries  | **Opus 5**                                  | a mistake costs a whole implementation iteration, and a plan cannot be verified by running it                                                                                                  |
| Writing `.cases.md`                | list cases against a template                 | **Sonnet 5**                                | the template is rigid; pairing and IDs are checked by the meta-test                                                                                                                            |
| Plan review (one, three questions) | reading a document for contradictions         | **Sonnet 5**, Opus 5 on architectural doubt | after the spike, the "library behaviour" class left the review (4 of the 5 most expensive findings of review 1). What remains is completeness and dependencies — attention work, not invention |
| Mechanical markdown edits          | apply a prepared list of fixes                | **Haiku 4.5**, better: not a separate agent | 288,292 tokens for "apply edits to a document" was the second largest line. The planner, who already has the document in context, should apply them                                            |
| Feature implementation             | product code                                  | **Opus 5**                                  | a mistake reaches the product; invariants 1–19 require holding a large context                                                                                                                 |
| Suite scaffold, fixtures           | code against an established convention        | **Sonnet 5**                                | the convention is written down; deviation is caught by the meta-test and the lint                                                                                                              |
| Acceptance                         | run `pnpm verify`, read output, check numbers | **Haiku 4.5**, or no separate agent at all  | the judge is an exit code, not a model                                                                                                                                                         |
| Diff-level security review         | reading a diff for a class of vulnerability   | **Opus 5**                                  | exactly the case where a model's mistake is caught by nothing automatic                                                                                                                        |

**Is `.claude/agents/*.md` worth introducing: yes, and not for the price.** Beyond −37% it gives:
(1) a pinned model — today behaviour depends on whether the lead agent remembers `model` (in the
first iteration it never did); (2) a trimmed tool set — a reviewer without `Write`/`Edit` physically
cannot "fix it while it is there", which today is forbidden only by text; (3) it removes a ~1500-word
prompt from every call — an agent's system prompt is written once and versioned; (4) it makes the
pipeline reproducible: an agent definition lands in git and in review, a prompt in a chat does not;
(5) it removes a concrete defect of the first iteration — a planner launched as the read-only `Plan`
type could not write a file, and 2000 lines had to be retyped by hand.

### 4.4 What reading the same documents costs

Measured with `wc -c`; tokens are estimated as characters / 2.5 (for Cyrillic markdown; no exact
tokenizer was available on the machine, so the numbers are ±20%):

| Document                                    | Characters  | ≈ tokens     |
| ------------------------------------------- | ----------- | ------------ |
| `docs/plans/feature-plan-implementation.md` | 154,708     | ≈61,900      |
| `docs/plans/feature-plan-testing.md`        | 154,474     | ≈61,800      |
| `docs/plans/plan-review-1..3.md`            | 201,094     | ≈80,400      |
| `e2e/README.md`                             | 23,523      | ≈9,400       |
| `.claude/skills/regression-verify/SKILL.md` | 22,812      | ≈9,100       |
| `CLAUDE.md`                                 | 15,129      | ≈6,100       |
| `.claude/skills/playwright-verify/SKILL.md` | 14,416      | ≈5,800       |
| `.claude/skills/feature-pipeline/SKILL.md`  | 13,563      | ≈5,400       |
| `docs/security.md`                          | 7,970       | ≈3,200       |
| `docs/plans/{README,TEMPLATE}.md`           | 13,639      | ≈5,500       |
| **The whole corpus**                        | **621,328** | **≈248,000** |

The first iteration's agent prompts listed eight documents. If each of five agents read even half
the corpus, that is ≈620k tokens — **29% of the entire spend** — on reading the same thing. If each
read both large plans in full, that is the same 620k on those alone.

**Did the "Project invariants" section help?** Partly, and not where it was needed. It saves
**re-deriving** rules (its goal, and it is achieved: 19 rules instead of searching 2000 lines) but
**does not reduce reading**, because: (1) `CLAUDE.md` itself grew to 15 KB and is always read;
(2) the two large plans are still declared canonical by `regression-verify` and `e2e/README.md`
(§3.1), so they get opened anyway; (3) `regression-verify` (22.8 KB) duplicates blockers already
listed in `e2e/README.md` and in test plan §6.3 — three copies of one list.

The edit with the largest context saving: (1) archive both plans and all three reviews — ≈204k
tokens out of the mandatory-reading zone; (2) gather the blockers into one file; (3) in an agent's
prompt, not a list of documents but exactly two addresses: `CLAUDE.md` and the plan section for its
task, as `feature-pipeline` §4 already prescribes — the prescription is right, it simply cannot help
while the plans are canonical.

---

## 5. Parallelism matrix

| Resource                                                                | Isolated?                         | Evidence                                                                                                                                                                                                                               | What to do                                                                                                                     |
| ----------------------------------------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `apps/web/.next` (the Next dev server)                                  | **No, and it is fatal**           | Two `pnpm e2e` on 3200/3201 and 3300/3301 in one tree: one run `77 passed`, the other `⨯ Another next dev server is already running`, `Dir: …apps\web`, rc=1, 0 tests. Separately: `pnpm dev` on :3000 + `pnpm e2e` → the same failure | **a worktree per agent is mandatory**, not optional. Ports do not solve it: registration is bound to the project directory     |
| Ports 3100/3101 with forgotten variables                                | No                                | Two default `pnpm e2e`: A `77 passed (54 s)`, B `3 failed, 1 did not run` — including `ERR_CONNECTION_REFUSED` after A tore down the shared servers                                                                                    | `reuseExistingServer: false` when `E2E_*_PORT` is set; and do not treat ports as an isolation mechanism                        |
| `test-results/`                                                         | No                                | One `.last-run.json`; state files named `auth-state-w<index>-<user>.json` collide between any two runs; Playwright clears `outputDir` on start                                                                                         | `outputDir` with a port suffix                                                                                                 |
| `playwright-report/`, `blob-report/`                                    | No                                | `playwright-report/` holds a single `index.html` (597 KB), overwritten by every run                                                                                                                                                    | `outputFolder` with a port suffix                                                                                              |
| Session state between runs                                              | No, and the failure is **silent** | `JWT_SECRET: 'e2e-secret'` is constant for any run. Probe: a token from :3401 accepted by :3501 (`/auth/me` → 200) with different store contents                                                                                       | Derive the secret from the port: a foreign token then gives 401 and the failure is loud                                        |
| Nest in-memory store (between processes)                                | **Yes**                           | A meeting created only on :3401 → `total` 2 against 1 on :3501                                                                                                                                                                         | nothing; the documentation describes it correctly                                                                              |
| In-memory store within one run                                          | No (by design)                    | the `api` and `web` projects talk to one Nest                                                                                                                                                                                          | the measures already exist: `planner`/`organizer`, `serial`, relative counters. Keep them                                      |
| The git index                                                           | No, failure is loud               | Two `git add -A`: rc=0 and rc=128, `Unable to create '.git/index.lock'`                                                                                                                                                                | a worktree (each has its own index). In one tree, `checkout -b` and `pre-commit --fix` are also unsafe                         |
| `node_modules` / the pnpm store                                         | No, failure is **silent**         | Two `pnpm install --frozen-lockfile`: both rc=0, the second warned `Failed to create bin … .bin\vitest ENOENT`                                                                                                                         | only the lead agent installs dependencies, before the parallel stage starts; in a worktree, its own `node_modules`             |
| Shared task files (`app.module.ts`, `e2e/README.md`, `*.unit.cases.md`) | No                                | `git log --stat`: `app.module.ts` edited by both feature commits; `e2e/README.md` by both plus three more                                                                                                                              | add a mandatory "files" column to the task table and the rule "files overlap → not parallel"; shared files become a merge task |

---

## 6. What to delete

Artifacts and rules that create work without information, ordered by the size of the win.

1. **`docs/plans/plan-review-1.md`, `plan-review-2.md`, `plan-review-3.md`** (1416 lines, ≈80k
   tokens). They did their job; the substantive findings already live in the `CLAUDE.md` invariants
   and in code comments. As a source of knowledge they are dangerous: they describe a state of the
   plans that no longer exists.
2. **The canonical status of `feature-plan-implementation.md` and `feature-plan-testing.md`**
   (309 KB). The files may stay as history, but every reference to them as "the canonical source" in
   `regression-verify`, `e2e/README.md` and `docs/plans/README.md` must go. The live convention is
   `e2e/README.md`, the live invariants are `CLAUDE.md`.
3. **The expected-test-count table** (test plan §6.6) and the blocker tied to it in
   `regression-verify` §3. It has already diverged (53 against 68, 38 against 42) and makes
   acceptance formally impossible. Numbers should be checked by the meta-test, not by a human
   comparing markdown.
4. **The coverage matrix** (test plan §7, ~40 lines). Cancelled by the project's own template; rules
   5 and 7 of the meta-test do its job.
5. **The requirement "steps 1–8 are mandatory, skipping any is a blocker"** (`regression-verify` §2
   and §3). Replace with "a green `pnpm verify`"; keep the breakdown as a debugging tool. The
   measured price of the ritual is 75 s per acceptance pass, and acceptance runs after every fix.
6. **The item "After a fix — the whole pipeline again, from step 1"** (`regression-verify` §5 item
   6). It contradicts §2 of the same file.
7. **Three redundant copies of the "Run economics" paragraph** — keep one, in `e2e/README.md`, with
   a measurement date.
8. **`@p0` on `SEC-API-05`** — until the measurement is rebuilt (interleaved samples, discarded
   warm-up, an absolute floor). A case that goes red in half the runs while being declared a
   "feature not accepted" blocker teaches the implementer to distrust blockers in general.
9. **The "verified by a run" claims about parallel ports** — in `CLAUDE.md`, `feature-pipeline` §4,
   `e2e/README.md` and `playwright-verify`. Either delete them or replace them with the measured
   fact: "parallel work only in separate worktrees; in one tree a second `next dev` starts on no
   port at all".

What **not** to delete, tempting though it is: the meta-test (treat it, do not remove it),
`e2e/security/**` (the only part with proven return), the `.cases.md` ↔ spec pairing, the demand for
an actual run, and the invariants in `CLAUDE.md`.

---

## 7. Verified facts

| #   | Pipeline claim                                                  | Result                                                                                                                                       | Verdict                                                  |
| --- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 1   | "one `pnpm e2e` — 28 s"                                         | 27 s, 77 tests                                                                                                                               | confirmed                                                |
| 2   | "`pnpm verify` end to end — 1 m 31 s (41 units + 62 e2e)"       | **42.85 s**, 42 units, 77 e2e                                                                                                                | refuted                                                  |
| 3   | "the suite is green" (an acceptance condition)                  | **1 failed**: `SEC-API-05`, 141 ms against 56 ms, ratio 2.518 against a threshold of 2.5                                                     | refuted                                                  |
| 4   | "`SEC-API-05` — the threshold is loose on purpose"              | 2 failures in 4 runs; under load 309 against 114 (ratio 2.71)                                                                                | refuted (50% flake)                                      |
| 5   | "two agents get their own port ranges … verified by a run"      | one run 77 passed, the other rc=1, `⨯ Another next dev server is already running`, `Dir: …apps\web`, 0 tests                                 | **refuted**                                              |
| 6   | "ordinary `pnpm dev` on 3000/3001 … disturbs nothing"           | `pnpm e2e` rc=1, `Another next dev server is already running`, 0 tests                                                                       | **refuted**                                              |
| 7   | "if an agent forgets the ports it gets someone else's results"  | worse: A 77 passed (54 s); B 3 failed + 1 did not run, including `ERR_CONNECTION_REFUSED` after A finished                                   | confirmed and strengthened                               |
| 8   | in-memory store shared within a run / isolated across processes | `total` 2 against 1 — isolated per process                                                                                                   | confirmed                                                |
| 9   | "a reused server gives a false result in either direction"      | `GET /auth/me` → **200** with different store contents                                                                                       | confirmed (the failure is silent)                        |
| 10  | the git index with two agents                                   | rc=0 and rc=128, `Unable to create '.git/index.lock'`                                                                                        | confirmed (the failure is loud)                          |
| 11  | `node_modules` under simultaneous install                       | both rc=0, the second warned `Failed to create bin … .bin\vitest ENOENT`                                                                     | confirmed (the failure is silent)                        |
| 12  | "every `pnpm e2e …` starts both `webServer`s"                   | 7 `next dev` starts = 7 e2e calls, `--project=api` included                                                                                  | confirmed                                                |
| 13  | "the step breakdown costs more than one run"                    | 118 s against 42.85 s                                                                                                                        | confirmed                                                |
| 14  | "api coverage — 96%"                                            | 96.07% (98/102) against **68.53%** (98/143)                                                                                                  | refuted (the denominator counts only imported files)     |
| 15  | web coverage                                                    | **26.20%** (38/145); `actions/auth.ts`, `actions/meetings.ts`, `dal.ts`, `proxy.ts` — 0%                                                     | measured for the first time                              |
| 16  | "the meta-test catches convention violations"                   | `## PR-API-01` — **not caught** (rules 5–7 go vacuous for a new feature); `AL-API-100` — not caught; an ID in a comment passes as automation | partly refuted                                           |
| 17  | "the actual test count = table §6.6" (a blocker)                | 68 e2e against 53; 42 units against 38                                                                                                       | refuted                                                  |
| 18  | "no more than eight cases per file"                             | 16 / 13 / 11 / 10 — not one feature file obeys it                                                                                            | refuted                                                  |
| 19  | "`CLAUDE.md` — fifteen rules"                                   | 19                                                                                                                                           | refuted                                                  |
| 20  | "`pnpm verify` — the whole check on one server start"           | `pnpm audit` with an unreachable registry → rc=1, not a single test runs                                                                     | confirmed as a defect                                    |
| 21  | "15 security cases" (`docs/security.md`)                        | `Total: 15 tests in 2 files`                                                                                                                 | confirmed                                                |
| 22  | control experiments as the main value                           | no file, no script, no record; whether they happened cannot be checked                                                                       | **unverifiable**                                         |
| 23  | the `pre-commit` hook changes commit content                    | not tested on a live commit (the audit must not change the repository); the conclusion comes from the configuration                          | **not verified; the risk is confirmed by configuration** |
| 24  | `.mcp.json` installs an unpinned version                        | `npx -y @playwright/mcp@latest`                                                                                                              | confirmed                                                |
| 25  | the presence of CI and agent definitions                        | neither exists                                                                                                                               | confirmed                                                |

---

## Appendix: probes

Every probe ran from a scratchpad; the repository was not modified (apart from creating this file).
Orphaned processes started by the probes (ports 3401, 3501, 3000) were killed by PID; afterwards
`netstat` showed no LISTENING on 3000/3001/3100/3101/3200/3201/3300/3301/3401/3501.
