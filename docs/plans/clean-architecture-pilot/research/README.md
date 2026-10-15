# Research: clean-architecture-pilot

> The index of the research stage. Created by `pnpm change:new <slug>`, filled by the `researcher`
> agent before any design exists. The area files next to it (`code.md`, `contract.md`, `tests.md`,
> `history.md`) are written by the research subagents.
>
> **One rule governs this whole folder: record only what is in the project, never what you concluded
> from it.** Every statement carries a citation — `path:line`, a document section, a case ID, a
> `FT-`/`CH-`/`FX-`/`BL-`/`ADR-` ID, or a commit. Anything you cannot cite goes under
> **Open questions** or `- **Not found:** …` instead. "Nothing in this repository covers X" is a
> finding, often the most valuable one.

## Requirement, as received

Settled by the owner on 2026-10-14; recorded as received, not questioned.

Move `apps/api` toward Clean Architecture with a rich domain model, piloted on ONE module:
`apps/api/src/meeting-files`. Layers: entities (fields, methods, business rules in one place) → use
cases (orchestrate entities, talk to the outside via ports) → interface adapters (Prisma repository
implementing ports, controllers, DTOs, response mappers) → frameworks/drivers (Nest wiring, Prisma
client, `main.ts`). Dependencies point inward only. `domain/` and `application/` import nothing from
`@nestjs/*`, `@prisma/*`, `class-validator`/`class-transformer`, express/multer (not even
`@Injectable()`); wiring via Nest factory providers/tokens; the boundary is enforced mechanically
(ESLint import restriction and/or meta-test). Entities raise domain errors; one adapter maps them to
HTTP. The domain is the source of truth for limits; DTOs import constants from `domain/`. Value
objects only where a real rule exists (`FileName` first candidate). Use cases preferably exercised
against the real database rather than hand-written fakes. `meetings`, `users`, `auth` are not
migrated now. `apps/web` is out of scope. Pure refactor behind a fixed contract: no existing case
expectation may change. A new `clean-architecture` skill and an `implementer-api` definition update
are approved as later stages.

## Questions asked of the project

The record of what was looked for — including what came back empty. A question with no answer is
kept, not deleted.

| #   | Question                                                                                                                                                                                                                       | Area              | Answered in                 | Outcome                                                                                                                                                                                                                                                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Exact shape of `apps/api/src/meeting-files`: every file, its exports, who imports it (incl. `meeting-files.seed.ts` consumers), what it imports from other modules; where business rules live; which comments cite "design §N" | code              | `code.md`                   | answered — exports/importers incl. `prisma/seed.ts:45`; 17 "design §" comment lines in 6 files                                                                                                                                                                                                                                            |
| 2   | Every error the module returns (status, message shape, where produced); 404-over-403 (`ADR-0018`) as applied there                                                                                                             | code, contract    | `code.md`, `contract.md`    | answered — every error thrown in the controller; 404-over-403 keys `FACT-3380`…`FACT-3392`, `FACT-2112`                                                                                                                                                                                                                                   |
| 3   | Which corpus facts state the current layering and the refusal of a repository layer (keys, verbatim), and the recorded "hand-written fake" argument (exact wording, location)                                                  | contract, history | `contract.md`, `history.md` | answered — `FACT-0059`, `FACT-3589` (keyed); same argument unkeyed in `docs/architecture.md` "Patterns deliberately refused" Rationale                                                                                                                                                                                                    |
| 4   | Which cases (unit, api, functional, security, integration) cover meeting-files; what the unit specs import; whether any `*.integration.spec.ts` / `integration` project exists and runs today                                  | tests             | `tests.md`                  | answered — `MF-API-01`…`19`, `MF-FN-01`…`15`, `MF-UT-01`…`10`, `SEC-API-07`/`-11`, `SM-API-03`; no integration spec exists, project defined at `playwright.config.ts:70`                                                                                                                                                                  |
| 5   | How ESLint is configured for `apps/api`; whether an import-restriction rule is installed; how `e2e/architecture/**` meta-tests read source files                                                                               | code, tests       | `code.md`, `tests.md`       | answered — flat config, core `no-restricted-imports` available, no import restriction today; meta-tests read files via `node:fs`, none reads `apps/**` imports                                                                                                                                                                            |
| 6   | How Nest DI is wired for meeting-files and Prisma; how multer/file upload is handled in the controller                                                                                                                         | code              | `code.md`                   | answered — `PrismaModule` not global; no `useFactory`/token/`@Inject(` precedent in `apps/api`; bytes to a Prisma `Bytes` column                                                                                                                                                                                                          |
| 7   | What `AR-API-07` / `AR-API-08` check about skills and agent definitions                                                                                                                                                        | tests             | `tests.md`                  | answered — `AR-API-07` agent frontmatter; `AR-API-08` team-roles table vs `.claude/agents`; no test registers skills                                                                                                                                                                                                                      |
| 8   | The meeting-files contract and data model as keyed facts (endpoints, limits, seed)                                                                                                                                             | contract          | `contract.md`               | answered — routes `FACT-2080`…`FACT-2082`, order `FACT-2097`…`FACT-2100`, limits keyed; no keyed fact on where limits live                                                                                                                                                                                                                |
| 9   | Ledger, backlog (incl. Rejected) and git history touching meeting-files, repository layer, architecture, Prisma                                                                                                                | history           | `history.md`                | answered — `FT-007` (Checks: 18 service-layer units retired/relocated/withdrawn), `FX-041`…`FX-046`, `CH-033` (`e4aa852`), `BL-019`/`040`/`043`/`044`/`046`/`047`, probes 0e/1e/5/7 of the prior folder; repository layer refused in `FACT-3589`, `FACT-0059`, `docs/plans/meeting-files/design.md:604`; nothing on Clean/hexagonal/ports |
| 10  | Which keyed facts carry meeting-files paths or symbols in their locked (hashed) text, and what the lock rule says happens when that text changes                                                                               | contract          | `contract.md` §H            | answered — 15 module-specific keys + 3 generic layout keys; hashing `scripts/facts-parse.mjs:71-73`, `:126-129`; check `AR-API-15`                                                                                                                                                                                                        |
| P1  | Probe: does a `no-restricted-imports` rule under the `apps/api` ESLint config fail a `domain/` file importing `@nestjs/common`?                                                                                                | code              | `probes.md`                 | yes — error on a real temp file; `--stdin` cannot decide it (type-aware parser)                                                                                                                                                                                                                                                           |
| P2  | Probe: can a Nest `useFactory` provider with `inject: [Token]` construct a plain class with no `@Injectable()`?                                                                                                                | code              | `probes.md`                 | yes — `@nestjs/core` 12.0.1, `injector.js:126`, `:444-445`; script printed `isPlain true`                                                                                                                                                                                                                                                 |
| P3  | Probe: can Vitest in `apps/api` import a plain TS module with no decorators / `reflect-metadata`?                                                                                                                              | code              | `probes.md`                 | yes — 1 test passed                                                                                                                                                                                                                                                                                                                       |

## Sweeps

Which subagent ran, on which model, over what. A thin file from a cheap model is a different fact
from a thin file from an expensive one — the first is fixable by re-running.

| Subagent              | Model    | Scope                                                                                                                                                          | File                                             | Converged after                                                                                            |
| --------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `researcher-code`     | `sonnet` | `apps/api/src/meeting-files/**`, Prisma/DI wiring, ESLint, tsconfig/Vitest, probes P1–P3 (~38 files)                                                           | `code.md` (probe outputs inline; no `probes.md`) | first pass, 7 Not-found lines                                                                              |
| `researcher-contract` | `sonnet` | corpus keys on layering, meeting-files contract/data, ADR-0006/0010/0018/0021/0022/0027/0029/0031                                                              | `contract.md`                                    | first pass, 128 keys cited, 6 Not-found lines                                                              |
| `researcher-tests`    | `sonnet` | `e2e/regression/meeting-files/**`, security, smoke, meta-tests, Playwright projects (14 files)                                                                 | `tests.md`                                       | first pass, 8 Not-found lines                                                                              |
| `researcher-history`  | `sonnet` | `docs/CHANGELOG.md`, `docs/BACKLOG.md` (incl. Rejected), 10 ADRs, `docs/plans/meeting-files/` probes, git log of module/ESLint/tsconfig/meta-tests/fact parser | `history.md`                                     | second pass (first pass on `haiku` rejected at the research review as incomplete); ~50 entries, 11 commits |

## Contradictions found

Where a document and the code disagree. Both sides, with citations — **named, not resolved.**
Resolving one is a decision, and decisions belong to the design stage. If a document is simply
wrong, that is a defect for the lead to route.

1. **Requirement vs accepted ADR.** The requirement asks for a Prisma repository implementing ports.
   `FACT-3589` (`docs/adr/ADR-0027-postgres-prisma-store.md:94`, Rejected) refuses "a repository or
   data-access layer between the service and Prisma", and `FACT-0059` states the same refusal
   (`contract.md` §A). The "hand-written fake" argument is keyed in `FACT-3589` and repeated unkeyed
   in the Rationale block at `docs/architecture.md:176`. Further keys the requirement departs from
   are listed in `contract.md` §B: `FACT-0012`, `FACT-0013`, `FACT-0026`, `FACT-0058`, `FACT-1067`,
   `FACT-3103`, `FACT-3104`, `FACT-3386`, `FACT-3572`, `FACT-3628`, `FACT-3629`.
2. **Corpus vs code: where rules run.** `FACT-0012` (controller must not hold rules) and `FACT-0013`
   (service holds the rules) versus `meeting-files.controller.ts` `upload`, which calls
   `isValidFilename`, `isAllowedContentType`, `normalizeContentType` and the `MAX_FILES_PER_MEETING`
   comparison and builds the 400/415 itself, while `meeting-files.service.ts` holds persistence only
   (`contract.md` Divergence 1; `code.md` error table).
3. **Code vs CLAUDE.md "Comments in code".** 17 comment lines in 6 module files cite "design §N" or
   the fork label `C5` (`code.md` §1), which CLAUDE.md forbids. The record already holds this as open
   work: `BL-040` counts "23 'design §N' comment lines in 12 files" under `apps/*/src` and adds a grep
   guard on `design §\d`; the convention itself is `CH-033` item 12 (`e4aa852`) (`history.md` §1, §2).
4. **Constant vs literal.** The 10-file cap message is a string literal, not derived from
   `MAX_FILES_PER_MEETING` (`code.md`, error table).
5. **Rules-file convention is unkeyed.** "pure rules with no Nest or Prisma imports" for `*.rules.ts`
   exists only in `apps/api/CLAUDE.md`, which carries no keys; the corpus states no keyed fact about
   a rules file as a layer (`contract.md` §A).
6. **Corpus vs meta-test cases: which check holds the lock.** `FACT-3495`
   (`docs/adr/ADR-0022-fact-lifecycle.md:72`) says `AR-API-17` fails when a fact's text no longer
   matches the lock hash; `e2e/architecture/architecture.api.cases.md:243-258` gives that comparison
   to `AR-API-15` and defines `AR-API-17` as the retirement-register fixture check (`:271-282`)
   (`contract.md` §E, `tests.md` §5).
7. **Corpus vs code: the download response.** `FACT-3105` (`docs/adr/ADR-0006-nest-layering.md:29`,
   mapper "is the only way an entity becomes a response") and `FACT-0012` (`docs/architecture.md:82`,
   controller must not "assemble a response by hand") versus `MeetingFilesController.download`, which
   calls no mapper and sets four headers with `res.set` then returns `new StreamableFile(content)`
   (`meeting-files.controller.ts:170-177`). The corpus states no fact relating either key to a bytes
   response (`contract.md` Divergence 2).

8. **ADR vs ledger: the installed multer.** `ADR-0029` (`:25-26`, `:51-52`, `:67-68`, e.g.
   `FACT-3618`) cites `multer@2.4.0` as installed; `FX-043` (`docs/CHANGELOG.md:122`) and
   `pnpm-workspace.yaml:59` (`multer: '2.3.0'`) pin it to exactly 2.3.0, because platform-express
   maps the wrong-field error by exact string match (`history.md` §6).
9. **ADR vs backlog: `BL-004`.** `FACT-3594` (`docs/adr/ADR-0027-postgres-prisma-store.md:113`) says
   "`BL-004` stays open"; the `BL-004` row in `docs/BACKLOG.md:70` says "Closed by `CH-031` —
   rejected" (`history.md` §6).

## Still unknown

What remains genuinely open after the sweeps. This section is what the designer inherits as
questions rather than as silence; unknowns that travel unannounced come back as rework.

- **Not found:** any keyed fact, ADR, ledger or backlog entry on ports, use cases, domain errors,
  value objects, DI tokens, dependency inversion, Clean/hexagonal architecture or a
  `domain/`/`application/` directory — searched the four corpus documents, `docs/adr/`,
  `docs/CHANGELOG.md`, `docs/BACKLOG.md` (`contract.md`, `history.md` Not found). The Rejected
  section of the backlog has no row on any of them (`history.md` "Rejected").
- **Not found:** a ledger, backlog or ADR entry on an ESLint import boundary in `apps/api`; the
  nearest is `BL-047` (lint bans for invariants 3, 13, 15; "Open cost: lint and `pnpm verify` time,
  unmeasured"). `apps/api/eslint.config.mjs` has one commit, `fe07cfe` (`history.md` §2, §5).
- **Not found:** a guard for a directory outside every `tsconfig` `include` — `BL-046`: "`FX-045`
  has no guard today" (`history.md` §2).
- **Open:** what the prior research measured about substituting Prisma: probe 7
  (`docs/plans/meeting-files/research/probes.md:678-711`) records that a Prisma client substituted
  without a database (mocking, `vi.mock`, an in-memory driver adapter) was not probed;
  `docs/plans/meeting-files/design.md:605` rejects `vi.mock('@prisma/client')` (`history.md` §4).
- **Open:** the retired unit tests. `FT-007`'s Checks cell: "18 service-layer units against the old
  store retired/relocated/withdrawn"; split 11/3/4 at `docs/plans/meeting-files/meeting-files.plan.md:11`
  (`history.md` §1).
- **Not found:** a precedent in `apps/api` for `useFactory`, `useClass`, injection tokens or
  `@Inject(` — the only custom provider is `APP_PIPE` with `useValue` (`code.md` §3).
- **Not found:** any `*.integration.spec.ts`, and any test that opens the database directly; the
  test process has no `DATABASE_URL` (`tests.md` §2, comment at `e2e/security/security.api.spec.ts:720`).
  Exercising a use case against the real database has no existing pattern in the repository.
- **Not found:** a keyed fact on how the unit layer treats the database; only unkeyed text in
  `e2e/README.md:163`, root `CLAUDE.md` and ADR-0027's Rationale (`contract.md` Not found).
- **Not found:** an import-boundary check of any kind, ESLint or meta-test (`code.md`, `tests.md`).
  `eslint-plugin-import@2.32.0` is in the pnpm store but resolves from neither `apps/api` nor
  `packages/eslint-config` (`code.md`).
- **Not found:** where shared constants/limits must live; and whether `apps/web` mirrors the file
  limits — three `apps/web/src` hits on `MAX_`/`1048576` were not read in depth (`contract.md`).
- **Open:** `AR-API-05`/`AR-API-06` locate controllers by `*.controller.ts` under `apps/api/src` and
  expect a one-line `@Controller(...)`, `export class ` at line start and `@UseGuards(` near the
  decorators (`e2e/architecture/architecture.api.spec.ts:368-370`, `tests.md` §5).
- **Open:** a moved unit spec must stay named in `meeting-files.unit.cases.md` (`:57`; suite-integrity
  rules 4, 7, 8) and keep `MF-UT-NN — ` titles for `pnpm test:meeting-files` (`package.json:24`)
  (`tests.md` §4).
- **Open:** an observed run of decorated-class DI under Vitest. Two specs build decorated Nest
  classes through DI — `apps/api/src/app.controller.spec.ts:9-14` (in `pnpm test`) and
  `apps/api/test/app.e2e-spec.ts:13-18` (`test:e2e`, in `pnpm verify`) — but no suite was run in
  this research, and no such spec exists for a meeting-files class (`code.md` §6, Not found).
- **Open:** superseding an accepted ADR is stated only in the unkeyed "Rules" prose of
  `docs/adr/README.md`, with `ADR-0027` superseding `ADR-0007` as precedent (`contract.md` §G);
  `FACT-0047` keys "ADR before code".
- **Open:** the fact lock. 15 keyed facts carry a `meeting-files` module path or symbol inside
  their hashed statement text, three more name the `*.controller`/`*.service`/`*.mapper` file
  kinds, and three block `**Source:**` lines name module files outside the hash (`contract.md` §H).
  `AR-API-15` fails on any hash difference; its case text names two responses, `pnpm fact:lock` or
  retire-and-restate under `ADR-0022` (`e2e/architecture/architecture.api.cases.md:243-258`).
- **Coverage of this pass:** `researcher-code` did not open the fact keys cited in the module's
  comments (`code.md` Not found); `contract.md` cites all of them, `FACT-3647` included
  (`ADR-0029:47-50`, opened in the re-run).
