# Test plan and regression suite structure: login + home page

> **ARCHIVE. Do not cite this document for conventions.**
> It records how the suite was organized in the first iteration and is kept for the "why" rather
> than the "how it works now". The live convention is [`e2e/README.md`](../../e2e/README.md), the
> invariants are [`CLAUDE.md`](../../CLAUDE.md), and the acceptance order is the `regression-verify`
> skill. Its numbers are stale (`FX-013`, `FX-027`). Translated into English in `CH-014` and
> condensed: the convention rationale, the case inventory, the fixture design, the pipeline spec and
> the coverage matrix are preserved; the full case-by-case prose is not, since it was rewritten into
> `e2e/regression/**/*.cases.md` and lives there.

The companion document is [feature-plan-implementation.md](feature-plan-implementation.md).

---

## 1. Suite organization convention

### 1.1–1.3 Directory tree and paired names

One directory per feature under `e2e/regression/<feature>/`, holding four files —
`<feature>.api.cases.md` + `<feature>.api.spec.ts` and `<feature>.functional.cases.md` +
`<feature>.functional.spec.ts` — plus `<feature>.unit.cases.md` where the feature has units.
`e2e/smoke/` holds "the infrastructure is alive", `e2e/fixtures/` the seed and helpers, and
`e2e/suite-integrity.api.spec.ts` the convention meta-test.

Rationale for grouping by feature rather than by test type: editing a feature means opening **one**
directory and seeing every level of checks, units included, with exact paths to them.

### 1.4 The `playwright.config.ts` change

Projects move from `testDir` to `testMatch` by filename suffix: `*.api.spec.ts` → project `api`
(the `request` fixture, no browser), `*.functional.spec.ts` → project `web` (Desktop Chrome). The
default `testMatch` catches any `*.spec.ts`, so it must be overridden in **both** projects — a
browser spec landing in `api` would run `page.goto` against the API port.

The consequence that made the meta-test necessary: a file ending in `.spec.ts` without either suffix
joins **no** project and silently never runs. The run stays green having checked nothing.

### 1.5 The fate of the existing specs

`e2e/api/health.spec.ts` moves to `e2e/smoke/health.api.spec.ts` **with its test title renamed** to
start with `SM-API-01`; only the title changes, the logic does not. The old `e2e/web/home.spec.ts`
is deleted together with its directory: after the switch to suffix-based routing it joins no project
anyway, so its "green" status is purely formal. Its HMR noise filter is **not** discarded — it moves
into `e2e/fixtures/console.ts`, or two console cases become flaky.

### 1.6 File pairing and the convention meta-test

Eight rules, each a separate test so a failure names the exact violation:

1. every spec in `e2e/` carries the `.api.` or `.functional.` suffix;
2. every spec has a paired `.cases.md`;
3. every `.cases.md` has a paired spec (except `*.unit.cases.md`);
4. unit spec paths mentioned in `*.unit.cases.md` exist on disk;
5. every case ID declared in a `.cases.md` appears in the paired spec, unless marked with the single
   recognized "not automated" syntax;
6. no duplicate IDs inside a `.cases.md`;
7. a unit case ID appears in the spec it is listed under;
8. every unit spec in `apps/**/src/**` is mentioned in some `*.unit.cases.md`.

Two explicit exemption lists: `SELF_EXEMPT` for the meta-test itself (rules 1–3 cannot apply to it —
it executes the convention rather than describing a feature) and `UNIT_SPEC_EXEMPT` for the single
scaffold baseline spec. Both are explicit lists rather than regexps, so they cannot silently grow.

A ninth rule was added later: the server address is never recomputed inside the suite but comes from
the config.

### 1.7 Does pairing extend to unit tests

**Partly, and deliberately.** A unit spec stays next to the code and gets **no** markdown of its
own. Instead there is one `<feature>.unit.cases.md` per feature, with cases grouped by spec file and
each group starting with a line naming the spec path.

Why:

- a unit test tests **a function, not a user scenario**. Its "steps" are "call `login(dto)`";
  describing that in prose duplicates the code and goes stale at the first refactor;
- unit specs change with the code, in the same commit, and live in another package. A mirrored
  markdown tree in `e2e/` would inevitably drift — and drifted documentation is worse than none;
- the "one place per feature" requirement still holds: opening `e2e/regression/auth-login/` shows
  every level of checks with exact paths. Rules 4, 7 and 8 of the meta-test make the mapping
  two-way rather than decorative.

**The deviation from the letter of the requirement is named explicitly.** The user asked for
"case file ↔ code file" pairing across all check types. It is read as follows: "two test files per
feature" was stated for the regression suite, while unit tests were requested separately without a
mirrored markdown tree. An alternative — one `.unit.cases.md` per spec — costs 9 extra files and 9
drift points for two features, and would not change a single ID, so it can be adopted later as its
own task.

### 1.8–1.10 The index, tags, and the seed as a precondition

`e2e/README.md` is the suite index: what lives where and how to run it. Tags are set with the `tag`
option on `describe` rather than as text in titles. The seed is the precondition of the entire
suite, and `e2e/fixtures/seed.ts` is its only mirror for tests; drift against the application seed is
what the smoke cases exist to catch.

Running units per feature works by filtering on the case ID (`vitest -t "AL-UT-"`), which only works
together with the rule "a unit test title starts with its case ID".

---

## 2. The case file template

Header (paired spec, project, tags, run command, preconditions), a summary table, and a Cases
section where each case carries its ID, priority, tags, preconditions, numbered steps and an
expected result. A case deliberately left unautomated is marked with the single syntax the meta-test
recognizes.

---

## 3–4. The case inventory

The full inventory lived here: 53 e2e cases (11 + 10 + 16 + 13 + 3) and 38 unit cases after the
reductions of review 1. **That inventory has since been rewritten into
`e2e/regression/**/*.cases.md`, which is where it should be read today** — and the numbers here are
stale, which is precisely what made the "the test count must match the table" blocker impossible to
satisfy (`FX-013`).

What is worth preserving from this section is the reasoning about **which cases should not exist**:

- a case that tests the framework rather than our code (broken JSON → 400 is `body-parser`; an
  unknown method → 404 is the Express router; login on Enter is HTML form behaviour);
- a degenerate version of its neighbour (a header without the `Bearer` scheme and a forged signature
  exercise the same guard branch as a junk token);
- an arithmetic consequence of two others;
- a case phrased with an "or", where both behaviours go green, including a regression from one into
  the other.

And which duplication is **not** redundancy: `total` against `items.length` is checked at all three
levels because each catches a substitution at its own seam, and the indistinguishability of a wrong
password from an unknown email is a security requirement rather than a check.

---

## 5. Test robustness rules

**Locators** by role, label and text only — `apps/web` uses CSS modules with hashed class names, so
a class selector dies on the next build. **Waiting** through web-first assertions only; a fixed pause
is a blocker, held at `error` by the lint. **The console** is collected with a filter for `next dev`
HMR noise.

**Races under `fullyParallel: true`.** The store is shared: the `api` project and the `web` project
(Next → the same Nest) write into one memory, and even tests within one file run in parallel. Three
measures: a dedicated owner per mutating spec file (`planner` for api, `organizer` for web);
`teacher`/`student` are never mutated and are the only ones exact numbers are checked against; and a
new meeting is found by a unique generated title rather than by `total`. A `serial` block is the
backstop.

**How to sign in inside functional tests.** The session cookie is httpOnly and set by a Server
Action, so the browser never sees the JWT. We therefore log in through the UI rather than forging a
cookie: forging one would duplicate production session logic and go red or green at the wrong
moments. The scheme is a worker-scoped cache whose value is a **function** of the user, plus a test
option — the shape was arrived at only after two earlier designs were refuted by actual runs (see
review 2, NB2).

**Other.** Addresses are `127.0.0.1` only, paths in specs are relative, and the ports stay
3100/3101. Every new case gets a control experiment: break the behaviour under test, confirm the
test goes red, revert — a test that is green with the feature broken is worse than no test. Logins,
passwords and meeting titles come only from `e2e/fixtures/seed.ts`; hard-coding them is a review
blocker.

---

## 6. Specification of the verifier skill

The `regression-verify` skill was specified here: its frontmatter, a mandatory run order from
cheapest to most expensive, what counts as a blocker, a code review checklist for the suite, the
"found a problem → file a separate task" rule, and the report format.

Two parts of this specification were later refuted by measurement and are recorded in the ledger:

- the "all eight steps are mandatory, skipping one is a blocker" requirement contradicted the same
  skill's "by default do one `pnpm verify`" and cost 75 s per acceptance pass for zero information
  (`FX-014`). It is now "a green `pnpm verify` is mandatory; the breakdown is a localization tool";
- the blocker "the actual test count must match the table in §6.6" could never be satisfied once the
  security suite was added (`FX-013`). Completeness is now computed by the meta-test.

The live version of this specification is `.claude/skills/regression-verify/SKILL.md`.

---

## 7. Coverage matrix

A matrix mapping each of the 12 specification points to its API, functional and unit cases lived
here. It was later cancelled by the project's own plan template ("a coverage matrix is not needed") —
rules 5 and 7 of the meta-test compute the same thing from the files, and a hand-maintained matrix
goes stale exactly the way the expected-count table did.
