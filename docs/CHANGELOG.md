# Changelog

What has been done in this project: features, process changes and **every defect found, with its
cause**.

Why the file exists: without it every new task starts with a guess — "did we do this already?" —
and the project ends up with a second `format:check`, a second way to check the session, a second
timing fix. The Defects section matters more than the Features section: it says what has **already**
broken here, and half the entries are mistakes that cannot be seen in a diff.

**Rules**

- New entries go at the **top** of their table: parallel edits then conflict on one line rather
  than across the file.
- IDs are never reused after an entry is deleted.
- **The `Commit` column is last in every ledger table.** Both `LG-API-03` and `pnpm ledger:fill`
  depend on that: they address a position rather than guessing the column by content. Guessing
  already broke — the description of `FX-019` contains the word `pending`, and the parser took the
  description for the commit column (`FX-022`). Change the column order and you change the checks.
- Every entry must carry a `Commit`, or it is a promise rather than a change. An entry added by the
  current change gets the literal `pending`, and the **next commit** replaces it with the real
  hash: the hash cannot be known before the commit, and `--amend` would change it again. That edit
  needs no ledger entry of its own. Substitute it with **`pnpm ledger:fill`** rather than a
  file-wide replace: the command only edits table rows. A global replace has twice corrupted the
  text of these very rules, because the word `pending` appears in them too.
- A defect found by a check goes into Defects **together with what found it**: that is the only way
  to learn which checks actually work.
- A closed backlog item moves here and is marked closed in [BACKLOG.md](BACKLOG.md) with a
  reference to its ID here.
- The file structure is checked by `e2e/ledger/ledger.api.spec.ts` on every `pnpm verify`.

---

## Features

| ID     | Date       | What                                                                   | Checks                          | Commit    |
| ------ | ---------- | ---------------------------------------------------------------------- | ------------------------------- | --------- |
| FT-002 | 2026-09-07 | Home `/`: greeting, meeting counter, 3 most recent, creation, sign-out | 16 API, 13 functional, 13 units | `4bedc02` |
| FT-001 | 2026-09-07 | Login page `/auth/login` + `POST /auth/login`, `GET /auth/me` contract | 11 API, 10 functional, 27 units | `7c4fc5b` |

**FT-001.** BFF layout: the browser never talks to Nest, the session lives in an httpOnly cookie,
login and sign-out are Server Actions. Passwords use `scrypt` with a per-user salt. A wrong password
and an unknown email give one message. `/auth/register` is a placeholder (see `BL-008`).

**FT-002.** In-memory meetings with a seed of 4 users. `total` comes from `countByOwner`, not from
the length of `items`. `ownerId` always comes from the signed token. The gate for unauthenticated
visitors is `src/proxy.ts` (not `middleware.ts`, deprecated in Next 16), plus a duplicate check in
`lib/dal.ts` and inside every Server Action.

---

## Process and infrastructure changes

| ID     | Date       | What                                                                                                                                                                                                                                                | Commit    |
| ------ | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| CH-018 | 2026-09-28 | `heroui-react` restored as a fifth external set with an adapter; `skills-lock.json` and `skills:sync` learned non-git sources (skills.sh publishes it; it is in no commit of `heroui-inc/heroui`)                                                   | `74da9e4` |
| CH-017 | 2026-09-28 | Discovery stages before implementation: research (a `researcher` plus four sweeps), design and plan, each in `docs/plans/<slug>/` behind its own review gate; `pnpm change:new` replaces `plan:new`; eight new roles; `PR-API-03`…`06` (`ADR-0016`) | `7ecfe48` |
| CH-016 | 2026-09-25 | Agent team: eleven roles in `.claude/agents/` with fixed tools and model, the `team-roles` skill, two review gates, pipelines rewritten around roles (`ADR-0014`, closes `BL-014`)                                                                  | `08148c7` |
| CH-015 | 2026-09-25 | Architecture corpus: `docs/architecture.md`, `docs/adr/` (15 records, `pnpm adr:new`), `data-model.md`, `api-contract.md`; section 0 gained "Architecture impact"; `AR-API-01…08` meta-test (`ADR-0015`)                                            | `08148c7` |
| CH-014 | 2026-09-25 | The whole project switched to English: docs, skills, comments, test titles, UI strings, API messages and the seed; comments compressed                                                                                                              | `39e9e0c` |
| CH-013 | 2026-09-16 | Two named workflows: the `bugfix-pipeline` skill and `TEMPLATE-BUGFIX.md` (`pnpm plan:new <slug> --bug`), phases named in `feature-pipeline`, the fork documented in rules                                                                          | `5c860e6` |
| CH-012 | 2026-09-16 | Skill audit: the parallelism conflict removed, measurements consolidated in `e2e/README.md`, plans marked archive, `skills:sync`/`skills:check` added with commit pinning                                                                           | `7126d8a` |
| CH-011 | 2026-09-15 | External skills wired in as adapters in `.claude/skills/` (4), `.agents/` in `.gitignore`, `skills-lock.json` in git                                                                                                                                | `7126d8a` |
| CH-010 | 2026-09-15 | A `CLAUDE.md` per application: package map, its quirks and where tests go — without copies of the root invariants                                                                                                                                   | `7126d8a` |
| CH-009 | 2026-09-14 | The `pre-commit` hook runs units (`pnpm test` after `lint-staged`, `.md` commits skipped); "who runs what" recorded in the rules                                                                                                                    | `7126d8a` |
| CH-008 | 2026-09-08 | CI on GitHub Actions: a `verify` job step by step plus a production build with an artifact; the local `verify` aligned with CI                                                                                                                      | `60bd98c` |
| CH-007 | 2026-09-08 | Orientation made mandatory: `check-orientation.mjs` in pre-commit and in `verify`, `pnpm plan:new`                                                                                                                                                  | `825a498` |
| CH-006 | 2026-09-08 | The changelog and backlog plus mandatory orientation before planning                                                                                                                                                                                | `b46addb` |
| CH-005 | 2026-09-08 | The cross-feature security suite `e2e/security/` (15 cases) plus `pnpm audit` in `verify`                                                                                                                                                           | `daf86b2` |
| CH-004 | 2026-09-08 | Pipeline speed-up: the `feature-pipeline` skill, the plan template, invariants in `CLAUDE.md`, `pnpm verify`                                                                                                                                        | `9d4b752` |
| CH-003 | 2026-09-07 | The `regression-verify` skill — feature acceptance with a mandatory run of all three levels                                                                                                                                                         | `36e83b4` |
| CH-002 | 2026-09-07 | Regression suite grouped by feature: paired `.cases.md`/`.spec.ts`, Playwright projects routed by filename suffix                                                                                                                                   | `36e83b4` |
| CH-001 | 2026-09-07 | The convention meta-test `e2e/suite-integrity.api.spec.ts`                                                                                                                                                                                          | `36e83b4` |

---

## Defects and fixes

Found by **checks**, not by reviewing diffs. The "Found by" column is the most useful in the file.

| ID     | Date       | Defect                                                                                                                                                                         | Found by                               | Commit    |
| ------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- | --------- |
| FX-030 | 2026-09-16 | The skills' troubleshooting missed the "project `web` red on `fetch failed`, ports clean" failure: a hung `@playwright/test` from a previous run holds its `webServer` half up | acceptance run                         | `7126d8a` |
| FX-029 | 2026-09-16 | `pnpm audit` red: `multer@2.2.0` with two high advisories pulled transitively from `@nestjs/platform-express@12.0.1`, making acceptance impossible                             | `pnpm audit` inside `pnpm verify`      | `7126d8a` |
| FX-028 | 2026-09-16 | Restoring external skill sets was impossible: the `skills.sh` referenced by the adapters does not exist here, and the lock file held neither a branch nor a commit             | skill audit                            | `7126d8a` |
| FX-027 | 2026-09-16 | The run measurements paragraph lived in four copies with three different number sets, and all were wrong: actually 85 e2e and 42 units, `pnpm verify` 137 s                    | skill audit                            | `7126d8a` |
| FX-026 | 2026-09-16 | Archived plans were declared canonical in three live documents while `regression-verify` called them obsolete                                                                  | skill audit                            | `7126d8a` |
| FX-025 | 2026-09-16 | Reviewer permissions contradicted between skills: `requesting-code-review` demanded read-only, `feature-pipeline` granted `Write`                                              | skill audit                            | `7126d8a` |
| FX-024 | 2026-09-16 | `feature-pipeline` described parallel implementation with two incompatible mechanisms: §4 required worktrees, §5a and §9 described in-process subagents                        | skill audit                            | `7126d8a` |
| FX-023 | 2026-09-14 | The server address was duplicated in FOUR places (config, `fixtures/api.ts`, `security.functional.spec.ts` and a literal in `SEC-FN-05`), kept in sync by a comment            | user review                            | `7126d8a` |
| FX-022 | 2026-09-08 | `LG-API-03` located the commit column **by content** and took the description of `FX-019` for it, where the word `pending` appears in prose                                    | CI run                                 | `ce9f08f` |
| FX-021 | 2026-09-08 | `pnpm ledger:fill` replaced the **first occurrence** of `pending` in a row rather than the hash column, corrupting a description                                               | manual check after a `ledger:fill` run | `f3f675c` |
| FX-020 | 2026-09-08 | `pnpm ledger:fill` stamped `HEAD` on every entry: an entry introduced by the previous commit got a foreign hash                                                                | filling an entry named by `LG-API-03`  | `aa13e34` |
| FX-019 | 2026-09-08 | The `pending` invariant made **the first push of any new entry red by construction**: on CI the tree is always clean while the hash is filled by the next commit               | first CI run                           | `9c526a9` |
| FX-018 | 2026-09-08 | `LG-API-04` declared the whole ledger broken on CI: `actions/checkout` does a shallow clone and `git cat-file` finds no old commit                                             | first CI run                           | `9c526a9` |
| FX-017 | 2026-09-08 | An untouched plan template **passed** the orientation check: its prompt text is longer than the threshold and contains the phrase "no matches" from the instructions           | control experiment                     | `825a498` |
| FX-016 | 2026-09-08 | `@playwright/mcp@latest` pulled unpinned code from the network on every start                                                                                                  | pipeline audit                         | `e622344` |
| FX-015 | 2026-09-08 | `pnpm verify` began with `pnpm audit`: without a network not a single test ran                                                                                                 | pipeline audit                         | `e622344` |
| FX-014 | 2026-09-08 | `regression-verify` held three mutually exclusive prescriptions about runs                                                                                                     | pipeline audit                         | `e622344` |
| FX-013 | 2026-09-08 | The blocker "test count = the table in the plan" was impossible to satisfy: 77 e2e against 53                                                                                  | pipeline audit                         | `e622344` |
| FX-012 | 2026-09-08 | The meta-test would not have seen a third feature: ID prefixes were hard-coded and rules 5–7 would go vacuously green                                                          | audit plus control experiment          | `e622344` |
| FX-011 | 2026-09-08 | `SEC-API-05` flaked in about half the runs (2.518 against a threshold of 2.5) and falsely signalled "the vulnerability is back"                                                | pipeline audit                         | `e622344` |
| FX-010 | 2026-09-08 | The claim "parallelism through ports" was false: Next 16 registers a dev server per directory, and `pnpm dev` blocks `pnpm e2e` entirely                                       | audit plus experience                  | `e622344` |
| FX-009 | 2026-09-08 | Meta-test rule 5 treated any mention of an ID as a case declaration, so a prose cross-reference failed the run                                                                 | adding the security suite              | `daf86b2` |
| FX-008 | 2026-09-08 | `X-Powered-By: Express` on every response                                                                                                                                      | `SEC-API-08`                           | `daf86b2` |
| FX-007 | 2026-09-08 | A timing oracle on login: 52 ms for an unknown email against 86–114 ms for a wrong password                                                                                    | `SEC-API-05`                           | `daf86b2` |
| FX-006 | 2026-09-08 | `ERR_TOO_MANY_REDIRECTS` on an invalid cookie: the user was locked out and could not reach the login form                                                                      | `SEC-FN-05`                            | `daf86b2` |
| FX-005 | 2026-09-07 | `pnpm format:check` could never be green: `core.autocrlf` against `endOfLine: lf`                                                                                              | feature 2 acceptance                   | `892ee9c` |
| FX-004 | 2026-09-07 | `loginAction` trimmed whitespace from the **password**: a password with an edge space silently changed                                                                         | feature 1 acceptance, code review      | `7c4fc5b` |
| FX-003 | 2026-09-07 | Four `eslint-plugin-playwright` rules sat at `warn` and ESLint exited 0 — `waitForTimeout` and `test.skip` passed the lint                                                     | T0, control experiment                 | `36e83b4` |
| FX-002 | 2026-09-07 | A duplicated `--passWithNoTests` breaks `vitest@4`: `Expected a single value`                                                                                                  | T0, run                                | `36e83b4` |
| FX-001 | 2026-09-07 | The meta-test scanned `e2e/e2e`, found zero files and **passed vacuously** under any violation of the convention                                                               | T0, control experiment                 | `36e83b4` |

### Found during implementation, before the code reached a branch

These were found by plan review and by the spike, before they entered the codebase. Recorded
because each will return on the next similar task.

| Defect                                                                                                                    | How it was found                     |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `@IsOptional()` missing on `limit` and `durationMinutes` — `GET /meetings` without a parameter and form creation gave 400 | probe against real Nest in review    |
| `@Max(50)` against cases using `limit=100`                                                                                | probe                                |
| Three functional cases of feature 1 required feature 2's dashboard — their DoD was unreachable                            | plan review                          |
| Playwright rejects `test.use` for a worker-scoped option: the whole spec fails to load                                    | probe on Playwright 1.62.1           |
| `import 'server-only'` does not resolve under Vitest                                                                      | reading the `next` sources           |
| `middleware.ts` is deprecated in Next 16 and renamed to `proxy.ts`                                                        | reading the installed `next` docs    |
| POST in Nest answers 201 by default, not 200                                                                              | reading the `@nestjs/common` sources |
| `getByRole('alert')` gives a strict-mode violation: App Router keeps its own route announcer                              | first functional run                 |
| `JwtModule.register({ signOptions: { expiresIn } })` does not compile: `jsonwebtoken@9` types it as a template literal    | typecheck                            |
