# Development plans

| Document                                                         | What it owns                                                                                                 |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| [TEMPLATE.md](TEMPLATE.md)                                       | **The feature plan template** — 100–150 lines, the assumption spike first; `pnpm plan:new <slug>`            |
| [TEMPLATE-BUGFIX.md](TEMPLATE-BUGFIX.md)                         | **The bugfix plan template** — reproduction, cause, impact, "why it was not caught"; `pnpm plan:new … --bug` |
| [feature-plan-implementation.md](feature-plan-implementation.md) | **Archive.** How the first two features were built: architecture, contract, data model, tasks                |
| [feature-plan-testing.md](feature-plan-testing.md)               | **Archive.** How the suite looked in the first iteration: convention, case list, acceptance spec             |

**Both large plans are an archive, not a source of truth.** The live suite convention (names, tags,
robustness rules, case composition, run economics) is in [`e2e/README.md`](../../e2e/README.md); the
invariants are in [`CLAUDE.md`](../../CLAUDE.md); the acceptance order is in the `regression-verify`
skill. They must not be cited for conventions: they already drifted from reality in their numbers
and made acceptance impossible (`FX-013`, `FX-027`). Read them for **why**, not for **how it works
now**.

## What was built

Two features:

1. **`/auth/login`** — an email and password form, a sign-in button, a link to sign-up, a call to
   `POST /auth/login`, a redirect to `/` after signing in, and a visible error on bad credentials.
2. **`/`** — available only to authenticated users: a greeting with the email, the meeting count,
   the three most recent meetings, a "Create meeting" button and a sign-out button.

## Order of work

Strictly sequential: feature 1 end to end (implementation → verification → **a separate fix task**
→ re-verification until green → merge), and only then feature 2. Neither the plan nor the test
cases are rewritten when a problem is found; a separate fix task is filed instead.

## Why these two plans are the size they are

`feature-plan-implementation.md` and `feature-plan-testing.md` are a **historical record**: they
describe how the first two features were built and, together with `plan-review-*.md`, show what
changed and why. They are not a model to follow.

Two simple features took about three hours, of which **100 minutes went to planning and
proofreading the plan against 85 for the code**. The two documents grew to ~2000 lines, and that
cost more than it saved:

- four of the five most expensive review findings were library behaviour (`@IsOptional()` on two
  fields, the `@Max` boundary against a case value, Playwright refusing a spec with a worker-scoped
  option) — each provable by a twenty-line probe in minutes, yet described in the plan and only
  found on the third proofreading pass;
- three of the nine blockers in the second review and **both** blockers in the third were not
  architectural defects but bookkeeping introduced by edits to the document itself: totals drifting
  apart, a reused case number, a broken table row;
- 69 test cases were listed in the plan, cut to 53 by review — and rewritten a second time anyway
  in `e2e/regression/**/*.cases.md`.

Hence the order of work for later features: **a spike of assumptions in throwaway code → a compact
plan from [TEMPLATE.md](TEMPLATE.md) → one review → implementation → acceptance through a single
`pnpm verify`**. The detail, with a time budget per stage, is in the `feature-pipeline` skill.
