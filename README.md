# PurpleSchool

A pnpm workspaces monorepo.

## Structure

```
.
├── apps
│   ├── web          # Next.js 16 (App Router, TypeScript) — http://127.0.0.1:3000
│   └── api          # Nest.js 12 (TypeScript, Vitest)     — http://127.0.0.1:3001
├── packages
│   ├── eslint-config  # shared ESLint configs (base / next / nest)
│   └── tsconfig       # shared tsconfig (base / nextjs / nestjs)
├── pnpm-workspace.yaml  # the package list plus a catalog of tool versions
├── .prettierrc          # one Prettier config for the whole repository
└── eslint.config.mjs    # ESLint for the root files and packages/*
```

## Requirements

- Node.js >= 22 (see `.nvmrc`)
- pnpm 10 (`corepack enable`)

## Installation

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
```

## Scripts (from the root)

| Command                             | What it does                             |
| ----------------------------------- | ---------------------------------------- |
| `pnpm dev`                          | runs web and api in parallel             |
| `pnpm dev:web` / `pnpm dev:api`     | runs one application                     |
| `pnpm build`                        | builds every package                     |
| `pnpm start`                        | runs the built applications              |
| `pnpm lint` / `pnpm lint:fix`       | ESLint over every package                |
| `pnpm typecheck`                    | type checking (`tsc --noEmit`)           |
| `pnpm verify`                       | the whole check on a single server start |
| `pnpm e2e:security`                 | cross-feature security invariants        |
| `pnpm audit`                        | CVEs in the dependencies                 |
| `pnpm test`                         | unit tests (Vitest in api and web)       |
| `pnpm test:auth-login`              | one feature's units                      |
| `pnpm e2e`                          | the whole regression suite               |
| `pnpm e2e:auth-login`               | one feature's e2e                        |
| `pnpm e2e:report`                   | the HTML report of the last run          |
| `pnpm format` / `pnpm format:check` | Prettier                                 |

Commands inside one application: `pnpm --filter @purpleschool/web <script>`.

## What is built

Two features, each described by a plan in [`docs/plans/`](docs/plans/) and covered by the
regression suite.

**Login `/auth/login`** — an email and password form, an error on bad credentials, a redirect to `/`
after signing in, and a link to sign-up. The browser never talks to Nest: the login goes through a
Server Action and the JWT lands in an httpOnly cookie that JavaScript cannot read.

**Home `/`** — authenticated users only: a greeting with the email, a meeting counter, the three
most recent meetings, meeting creation and sign-out. `src/proxy.ts` sends unauthenticated visitors
to the login page, but that is an optimistic check: Nest confirms the token's validity, so the check
is duplicated in `lib/dal.ts` and inside every Server Action.

There is no database — the data is in-memory with a seed of four users, see
[`apps/api/README.md`](apps/api/README.md).

## Tests

```
e2e/
├── suite-integrity.api.spec.ts   the meta-test: keeps the suite convention from drifting
├── fixtures/                     the seed and helpers, the only source of logins and passwords
├── smoke/                        "the infrastructure is alive": servers up, seed in place
└── regression/<feature>/         per feature, API and functional tests
    ├── <feature>.api.cases.md       cases: steps and expected results
    ├── <feature>.api.spec.ts        the paired executable spec
    ├── <feature>.functional.cases.md
    ├── <feature>.functional.spec.ts
    └── <feature>.unit.cases.md      unit cases; the specs themselves sit next to the code
```

Every case doc has a spec of the same name — that is enforced by `suite-integrity`, not by review.
**The Playwright project is chosen by the filename suffix:** `*.api.spec.ts` goes to project `api`,
`*.functional.spec.ts` to `web`. A `.spec.ts` without either suffix joins no project and silently
never runs.

The e2e ports are **3100 and 3101**, not the usual 3000/3001: a `next start` with a stale build may
be sitting on 3000, and the run would go falsely green on broken code.

### Security

`e2e/security/` holds the cross-feature invariants that must hold for every new endpoint and every
new page: authorization on all protected routes, rejection of forged tokens, no secrets in
responses or in the HTML, data isolation between users, and authentication rejection branches that
are indistinguishable **by response time**. The threat model and the list of deliberate gaps are in
[`docs/security.md`](docs/security.md).

This suite found three defects invisible in a diff: an endless redirect on an invalid cookie, a
timing oracle on login, and `X-Powered-By` in the responses.

Acceptance is **one `pnpm verify`**: lint, typecheck, units, the whole e2e on a single server start,
and `pnpm audit`. Splitting by `--grep` is for localizing a failure, not for acceptance. The
measurements and the suite composition are in [`e2e/README.md`](e2e/README.md), "Run economics";
those numbers are not duplicated in other documents.

**Stop `pnpm dev` before `pnpm e2e`.** Next 16 will not start a second dev server for the same
directory on any port, and Playwright's `webServer` simply never comes up. Two agents at once need
their own git worktree, not their own ports.

There are two workflows, and the fork turns on whether the behaviour has already been promised:

- **new functionality** — the `feature-pipeline` skill: orientation, an assumption spike,
  requirements and architecture in a plan from `docs/plans/TEMPLATE.md`, a task breakdown, one
  review, implementation (each agent in its own git worktree), acceptance;
- **a defect** — the `bugfix-pipeline` skill: reproduction, cause, impact, a red test **before** the
  fix, a minimal edit at the cause, acceptance and an `FX-` entry. A plan
  (`pnpm plan:new <slug> --bug`) is not needed for every bug — the threshold is in the skill.

Acceptance in both cases goes through the `regression-verify` skill (`.claude/skills/`): one
`pnpm verify` and a report with numbers. The quick check of a single change is `playwright-verify`.

## Code quality

- **ESLint 10** (flat config) — shared rules in `packages/eslint-config`, type-aware rules for api
  and `eslint-config-next` for web.
- **Prettier** — one config at the root; conflicting ESLint style rules are switched off through
  `eslint-config-prettier`.
- **husky** — `.husky/pre-commit` runs three steps on every commit: the plan orientation check,
  lint-staged (`eslint --fix` and `prettier --write` over staged files) and the **unit tests**
  (`pnpm test`, 42 tests, 5.5 s; a commit holding only `.md` files skips them, since no spec reads
  markdown). A red unit fails the commit. The full `pnpm lint` (49 s) and the e2e are deliberately
  out of the hook — that is the job of `pnpm verify` and CI.
- **`.gitattributes` with `eol=lf`** — without it, Windows `core.autocrlf` substitutes CRLF on every
  checkout while Prettier demands LF, and `format:check` goes red on dozens of files right after
  cloning.
