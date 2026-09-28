---
name: regression-verify
description: Accepting a WHOLE feature against the regression suite — a green pnpm verify, a review of the cases.md/spec.ts pairing, a control experiment, a report with numbers. Use when a feature from docs/plans/ is finished, when the user asks "accept the feature", "run the regression", "check the regression suite", "the feature is ready", and always before reporting a feature as done. For checking a single change, use the playwright-verify skill.
---

Accepting a feature as a promise: every level of checks, conformance to the suite convention, a
written report. The difference from `playwright-verify` is that it checks **one change** (MCP
browser plus one spec). Do not substitute one for the other — mixing them turns the quick check
into a ten-minute ritual.

The live suite specification is `e2e/README.md` (naming convention, tags, robustness rules, the
size rule, run economics); the invariants are in `CLAUDE.md`. The plans in `docs/plans/` are an
**archive**: they cannot be cited for conventions, they go stale, and their numbers already diverge
from reality.

**Nothing counts as done without an actual run.** "Verified" without a command and without numbers
in the report is not an acceptable phrasing.

**Who runs what.** This skill is the `tester-acceptance` role's procedure; the level suites belong to
`tester-unit`, `tester-api`, `tester-functional` and `tester-security` (`team-roles`). Acceptance
**fixes nothing** — §5 — and that is a tool boundary, not a promise: the roles that judge do not hold
the files they judge.

For a feature the size of "a page plus two endpoints" a **separate acceptance agent is
unnecessary**: the implementer's DoD with control experiments _is_ the acceptance, and repeating
the same run costs 20 minutes and adds no information. The order of work for a whole feature is in
the `feature-pipeline` skill.

## 1. Identify what is being accepted

`<feature>` is the feature slug: `auth-login` or `home-dashboard`. It doubles as the Playwright tag
(`@auth-login`) and the unit case ID prefix (`AL-UT-`, `HD-UT-`). The mapping is in `e2e/README.md`.

Before running anything, clear orphaned servers left by earlier failures — otherwise
`reuseExistingServer` picks up a process without the right environment variables and the result is
false in either direction:

```bash
netstat -ano | grep :3100        # take the PID from the LISTENING row
netstat -ano | grep :3101
powershell -NoProfile -Command "Stop-Process -Id <pid>"
```

The ports can also be clean while the run is still red: a hung `@playwright/test` from a previous
run holds its `webServer` half up, and project `web` fails with `[TypeError: fetch failed]` while
`api` is green. How to find it is in `playwright-verify`, section 6.

Do not kill every `node` at once, and do not run the `taskkill` that Next prints: those are other
people's servers.

## 2. Runs

**There is one canonical path:**

```bash
pnpm verify
```

Its composition: `check:orientation` → `lint` → `typecheck` → units → the `apps/api` supertest →
`format:check` → the whole `e2e` on a single server start → `audit`. That is enough for acceptance.
The local `verify` and the CI `verify` job are **the same list of steps**; let them drift and
"green locally, red on CI" teaches people to distrust the local gate. A step added in one place is
added in the other (`.github/workflows/ci.yml`).

What is required is the **result** — a green `pnpm verify` — not a walk through every row of the
table below.

### The diagnostic ladder

Unfold it **when `pnpm verify` goes red**, to localize the failure without starting a browser
before the contract is confirmed. On the green path it is redundant: steps 1, 5, 6 and 7 are strict
subsets of step 8, and every `pnpm e2e …` call restarts **both** servers (the cost is in
`e2e/README.md`, "Run economics").

| #   | Step                     | Command                                    | What it catches here                                                                           |
| --- | ------------------------ | ------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| 1   | Suite convention         | `pnpm e2e e2e/suite-integrity.api.spec.ts` | A spec with no paired `.cases.md`; a file with no suffix; a described but unautomated case     |
| 2   | Lint                     | `pnpm lint`                                | `test.only`, `expect` without `await`, `waitForTimeout`, `test.skip`, conditions               |
| 3   | Types                    | `pnpm typecheck`                           | The root (`e2e/**`) plus every package; web runs `next typegen` first                          |
| 4   | Feature units            | `pnpm test:<feature>`                      | Logic in isolation; a failure here makes an e2e run meaningless                                |
| 5   | Smoke                    | `pnpm e2e e2e/smoke`                       | The servers came up and the seed is in place — before dozens of cases                          |
| 6   | Feature API tests        | `pnpm e2e --project=api --grep @<feature>` | The contract. No browser starts                                                                |
| 7   | Feature functional tests | `pnpm e2e --project=web --grep @<feature>` | The UI — after the contract is confirmed, or a UI failure is indistinguishable from an API one |
| 8   | Full run                 | `pnpm e2e`                                 | A regression in a neighbouring feature and races under `fullyParallel`                         |
| 9   | Dependency advisories    | `pnpm audit --audit-level high`            | Known CVEs. A network step: without a network it fails, and that is not about the code         |

When step N fails, steps N+1 and beyond are not run until it is fixed or filed as a task (§5): a
broken contract makes the UI result unreadable.

**Do not run the units separately.** They are inside `pnpm verify` and again inside
`.husky/pre-commit` — the latter over the text `lint-staged` has already fixed. A third manual
`pnpm test` adds no facts; `pnpm test:<feature>` is a localization tool, not a step on the green
path.

**Do not repeat the full suite for another green result.** It adds almost nothing; a control
experiment (step 11) does more.

### Steps beyond `pnpm verify`

- **Step 10 — the interactive check**, mandatory for any UI change. It comes **after** the runs
  rather than alongside them: `pnpm dev` and `pnpm e2e` are mutually exclusive in one tree
  (`CLAUDE.md`). Start `pnpm dev`, then follow `playwright-verify`. If the `browser_*` tools are
  unavailable, say so out loud rather than substituting a mental check.
- **Step 11 — a control experiment** for every new case: break the behaviour under test in the
  source, confirm the run goes **red**, revert. A test that is green with the feature broken is
  worse than no test. For the first two features the control points are fixed: `verifyPassword`
  always returning `true` (`AL-API-02`, `AL-FN-03` must go red), and `countByOwner` replaced with
  `items.length` (`HD-API-05`, `HD-FN-03` must go red).

Two agents at once need **their own git worktree**, not their own ports (`CLAUDE.md`,
`feature-pipeline` §6).

## 3. Blockers

Any of these means "the feature is not accepted". Not "a note for later".

**Runs**

- A red test at any step; a red `pnpm audit --audit-level high`.
- A knowingly red test in a commit. If a check is impossible at this stage, the spec is **not
  created** until the stage where it goes green.
- A green run obtained on a reused server: confirm the `webServer` log shows ports 3100/3101 and
  that the servers started fresh. A run on 3000/3001, or an edit to `playwright.config.ts` in that
  direction.

**Suite convention** (checked by `e2e/suite-integrity.api.spec.ts`)

- A spec with no paired `.cases.md` or the other way round — except files in `SELF_EXEMPT`.
- A file in `e2e/**` without the `.api.spec.ts` / `.functional.spec.ts` suffix: it joins no project
  and silently never runs.
- A case ID described in a `.cases.md` but absent from the spec and not marked with
  `- **Not automated:** <reason + task link>` — the only recognized syntax.
- A unit spec in `apps/**/src/**` mentioned in no `*.unit.cases.md`; a test whose title does not
  start with a case ID — except `SELF_EXEMPT` and `UNIT_SPEC_EXEMPT`.

Comparing the actual test count against a table of numbers in some document is **not** a blocker
and is not done: such a table goes stale with every added case and makes acceptance impossible
(`FX-013`). Automation completeness is computed by the meta-test rather than eyeballed.

**Test quality** — the robustness and data rules live in full in `e2e/README.md`. Blockers here are
violations of them: `test.only`; `test.skip` without a reason and a link; `waitForTimeout`; CSS
locators; `expect(...)` without `await`; absolute counters in `@mutating` cases; mutating
`teacher`/`student`; hard-coded data instead of `e2e/fixtures/seed.ts`; a created meeting not dated 2030.

**Application behaviour**

- The browser reaching `127.0.0.1:3101` directly — a BFF violation, caught by `HD-FN-11`.
- A non-empty list of `console.error` / `pageerror` outside the HMR noise filter in
  `e2e/fixtures/console.ts`.

**Security**

- A red case from `e2e/security/**` — a blocker of the same weight as a failing feature test. These
  checks are cross-feature: they break not when a feature breaks but when an invariant does.
- A new protected endpoint missing from `PROTECTED_ROUTES`, or a new protected page missing from
  `PROTECTED_PAGES` (invariant 16). Those lists are the only thing connecting the suite to a
  growing application.
- A token, a hash or a password in a response body, in the HTML, or in the RSC stream (invariants
  18, 19).
- A secret in a commit: `.env` (other than `.env.example`), a private key, a string shaped like an
  issued JWT.
- A response disclosing the server stack (`X-Powered-By` and similar).
- An authentication rejection branch distinguishable by response time: identical text is not enough.

**The architecture corpus**

- A route added, renamed or removed without the matching row in `docs/api-contract.md`, or a guarded
  route missing from `PROTECTED_ROUTES` — both fail `AR-API-05`/`AR-API-06` and both mean the
  documents have started lying.
- An architectural decision implemented with no ADR, or contradicting an accepted one without
  superseding it. Section 0 of the plan must name the ADR IDs it touches.
- A seed value changed on one side only: `apps/api/src/**/*.seed.ts` and `e2e/fixtures/seed.ts` move
  together or `SM-API-02` goes red.

**The ledger**

- The change is not recorded in `docs/CHANGELOG.md`: a feature without an `FT-`, a process change
  without a `CH-`, a defect found without an `FX-`. An unrecorded defect is a defect that gets
  found again.
- An `FX-` entry with an empty "Found by" column. A closed backlog item not marked closed and not
  referencing an entry. A newly found gap missing from `BACKLOG.md`, or present with an empty
  "Conflicts with".
- A red `LG-API-*` case: a duplicate ID, a reference to a non-existent commit, a dangling reference.

**Reporting**

- Weakening an assertion to match observed behaviour without saying so in the report.
- "Verified" / "everything works" / "the tests passed" without a command and numbers.

## 4. Code review checklist

A green run is not yet acceptance. Read the diff with your eyes.

Structure:

- new files in `e2e/regression/<feature>/` with template-conforming names; `e2e/README.md` gained a
  row for the feature;
- tags `@regression`, `@<feature>`, `@p0` / `@mutating` set through the `tag` option on `describe`,
  not as text in the title;
- `*.unit.cases.md` references existing paths, and every spec is mentioned in the documentation.

Cases against the code:

- **the steps and expected results in `.cases.md` match what the spec actually checks.** A
  divergence is a blocker: the documentation starts lying, and after that nobody believes it;
- negative cases check **both** the status **and** the absence of a side effect (data unchanged, no
  token issued, no cookie set);
- no case depends on the execution order of another;
- `getByTestId` only with a justification in a comment.

Security — beyond the automated cases (`pnpm e2e:security`), read the diff against invariants
16–19:

- a new endpoint: the guard is attached, the DTO accepts no owner or role field, the response goes
  through a mapper that strips sensitive fields;
- a new protected page and a new Server Action: the session is checked **both** in `proxy.ts` **and**
  in the server layer — the proxy only sees that a cookie exists and is not a guarantee;
- a broken session is sent through `/auth/session-expired` rather than straight to `/auth/login`;
- no token is passed as a prop into a client component.

Application code: no new HTTP contract checks in `apps/api/test/app.e2e-spec.ts` (they belong in
`e2e/`); no secrets or hashes leaking into responses or markup.

## 5. Found a problem — file a task, do not rewrite the plan

1. **A case expresses a requirement.** If it is red, the code is wrong by default, not the case.
2. A defect is filed as a **separate task**: the case ID, the reproduction command, expected against
   actual, a link to the trace from `pnpm e2e:report`. The plan's original tasks are not rewritten.
3. Inside acceptance it is acceptable to mark a case `test.fixme` with a link to the filed task.
   `test.skip` without a link is a blocker.
4. A case is edited **only** when it is proven wrong (it contradicts the feature specification).
   Then the `.cases.md` and the spec are edited in one commit and the report gains a line saying
   "assertion changed, and why".
5. "Fixed it while I was there" is forbidden inside acceptance. Acceptance is a reproducible
   assessment of the state, not a continuation of development. The same rule is why a reviewer gets
   read-only permissions (`requesting-code-review`).
6. After a fix — a **green full `pnpm verify`**, not just the failed case: the fix may have broken
   something next door. The diagnostic ladder does not need unfolding for that.

## 6. The report

Mandatory sections:

**Runs** — the command and the result with numbers (`87 passed`, not "ok").

**Coverage** — how many cases are green out of how many; what is not automated and why; whether any
point of the feature specification has no case.

**Interactive check** — which scenario was walked in the browser; the state of the console;
confirmation that the browser made no request to `:3101`; a screenshot if the UI changed.

**Control experiment** — what was broken, which cases went red, whether it was reverted.

**Blockers** — a list with case IDs and task links, or "none".

**Filed tasks** — one per defect found.

**Skipped and why** — explicitly, or "nothing". A skip that is not stated is not a skip but a
misreported result.
