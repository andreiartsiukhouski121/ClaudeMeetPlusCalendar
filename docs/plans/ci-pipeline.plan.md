# Plan: ci-pipeline

Closes `BL-010`. The goal is the same set of checks as the local pipeline, but on GitHub's side,
plus delivery of the build as an artifact.

## 0. Orientation: what the project already has

- **Duplicate:** no matches — the task was filed as `BL-010` and waited for a remote, which now
  exists. There is no `CH-` entry about CI; the closest is `CH-004`, which is about the local
  `pnpm verify` rather than CI.
- **Conflicts with shipped:** touches only the new `.github/workflows/` directory; no invariant and
  no test case changes. It relies on the existing `isCI` branches in `playwright.config.ts`
  (`forbidOnly`, `retries: 2`, `workers: 1`, `reuseExistingServer: false`), which were written for
  CI and need no edits.
- **Conflicts with planned:** `BL-006` (remove the default `JWT_SECRET` for production) depends on
  this task and becomes doable afterwards; `BL-011` (licences/SBOM) and `BL-012` (secrets in git
  history) are the natural next steps that will join the same workflow, so the file must stay
  extensible rather than monolithic.
- **Architecture impact:** confirms `ADR-0010` (a convention that matters is executable) and `ADR-0011` — CI runs the same step list as the local `pnpm verify`, gates included, so neither register can be satisfied by skipping the other. Changes no decision and adds none; recorded retrospectively when section 0 gained this question in `CH-015`.
- **Open questions:** the term "CD" has no subject in this project yet — there is no deployment
  platform and no secrets for one. Confirm with the customer where to deploy; until then delivery
  stops at a production build and an artifact, and that is said out loud rather than faked.

## 1. Spike: how the risky assumptions were proven

| Assumption                                         | How it was proven              | Fact                                      |
| -------------------------------------------------- | ------------------------------ | ----------------------------------------- |
| The `gh` token can push workflow files             | `gh auth status`               | The `workflow` scope is present — yes     |
| The repository is empty; a push overwrites nothing | `gh repo view --json isEmpty`  | `isEmpty: true`, `defaultBranchRef` empty |
| The code holds no real secrets for a public repo   | `pnpm e2e --grep SEC-API-10`   | Green: no private keys and no issued JWTs |
| `pnpm verify` passes on a clean install            | local run                      | 84 e2e + 42 units green                   |
| Playwright is CI-ready without config edits        | reading `playwright.config.ts` | The `isCI` branches already exist         |

## 2. Contract

Not an HTTP contract but the workflow's:

| Trigger                  | What it does               | Blocks a merge            |
| ------------------------ | -------------------------- | ------------------------- |
| `push` to `main`         | job `verify`, then `build` | —                         |
| `pull_request` to `main` | job `verify`, then `build` | yes — this is the PR gate |
| `workflow_dispatch`      | the same, manually         | —                         |

The `verify` job repeats the local pipeline **step by step** rather than as one `pnpm verify` call.
The reason: the "one `pnpm verify`" rule saves **dev server starts**, and only the `pnpm e2e` step
makes those. `lint`, `typecheck`, `test` and `audit` start no servers, so splitting them is free and
the GitHub UI shows which stage failed — there is no asking interactively there.

## 3. Data

No secrets are needed: `playwright.config.ts` passes `JWT_SECRET` (`'e2e-secret'`) and `API_URL`
for the run. No step reaches an external service other than the npm registry (`pnpm install`,
`pnpm audit`) and `fonts.googleapis.com` (`next/font/google` on the first build).

## 4. Tasks

| ID  | What to do                                                  | Files                                  | Done when                                    | Depends on |
| --- | ----------------------------------------------------------- | -------------------------------------- | -------------------------------------------- | ---------- |
| C1  | Workflow `ci.yml`: a step-by-step `verify` job plus `build` | `.github/workflows/ci.yml`             | the file passes `pnpm format:check`          | —          |
| C2  | Attach the remote, rename `master` → `main`                 | `.git/config`                          | `git remote -v` shows the repository         | C1         |
| C3  | Push the history and the workflow                           | —                                      | branch `main` on GitHub, workflow visible    | C2         |
| C4  | Wait for the run and read the result                        | —                                      | the run is **green**; on failure, a fix task | C3         |
| C5  | Record a `CH-` entry, close `BL-010`, file any new gaps     | `docs/CHANGELOG.md`, `docs/BACKLOG.md` | `pnpm e2e e2e/ledger` green                  | C4         |

A fix task for a failing run is filed separately and does not rewrite this plan.

## 5. Risks

- **The `.next` cache is always cold on CI.** The first Turbopack build plus fetching
  `next/font/google` over the network; the config allows `timeout: 180_000` on `webServer` for
  that. If it still runs out, that is a server failure rather than a test failure, and the cure is
  caching, not editing test timeouts.
- **`pnpm audit` breaks the run on a new CVE in someone else's dependency.** Deliberate: the step
  runs last, so by the time it fails every other result is visible.
- **`husky` during `pnpm install` on CI.** The `prepare` script installs hooks that are useless
  there. Disabled with `HUSKY=0`, or the install can fail on a missing `.git/hooks`.
- **Different operating systems.** Development on Windows, CI on Ubuntu. The project stopped
  depending on Windows specifics after `.gitattributes` with `eol=lf` (`FX-005`), and the first run
  is what verifies that.
- **`workers: 1` on CI** makes the run slower but removes races on a weak runner.

## 6. Assumptions and deliberate omissions

- **CD in the sense of deployment is not done**, because there is no platform and no secrets for
  one. The `build` job produces a production build and uploads an artifact — delivery without
  deployment. A real deploy needs a customer decision: where, with what, and with which secrets.
  Inventing a Vercel deploy with non-existent tokens would look like it works and would not.
- **Branch protection is not configured.** It changes repository settings rather than code, and is
  filed as its own backlog item.
- **No OS or Node version matrix.** One `ubuntu-latest` runner and the version from `.nvmrc`: a
  matrix makes sense for a library, not for an application with a single target environment.
