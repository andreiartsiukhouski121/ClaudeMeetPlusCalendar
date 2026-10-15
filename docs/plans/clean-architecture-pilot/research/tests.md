# Research: existing checks around `apps/api/src/meeting-files`

Sweep of tests only. No suite was run. 14 files read.

## 1. Cases that touch meeting-files

### API level (`*-API-*`), project `api`

- Doc `e2e/regression/meeting-files/meeting-files.api.cases.md`, spec `meeting-files.api.spec.ts` (same dir). `MF-API-01`…`MF-API-19` (header line 43: "19 cases"; summary table :47-:66).
- Statuses and messages asserted byte-for-byte (cases.md line numbers):
  - `MF-API-01` (:71) 201, exactly five keys `contentType, filename, id, sizeBytes, uploadedAt`, `id` matches `/^fil-<uuid>$/`.
  - `MF-API-02` (:83) 401 `{ message: 'Authentication required', error: 'Unauthorized', statusCode: 401 }` on all three routes, guard before interceptor.
  - `MF-API-03` (:93) 404 `Meeting not found`, identical for unknown and other-owner meeting (`ADR-0018`).
  - `MF-API-04` (:103) 200, only key `items` (no `total`), seeded `notes.txt` then `syllabus.pdf`, no `content`/`meetingId`/`%PDF` in text.
  - `MF-API-05` (:115) 200 `items: []` for a meeting with no files.
  - `MF-API-06` (:123) download headers: `Content-Type`, `Content-Length`, `X-Content-Type-Options: nosniff`, `Content-Disposition: attachment; filename="syllabus.pdf"; filename*=UTF-8''syllabus.pdf`.
  - `MF-API-07` (:145) upload → list → download byte-identical (includes `0x00` and a byte above `0x7f`).
  - `MF-API-08` (:154) 404 `File not found` for unknown file id and another meeting's file id.
  - `MF-API-09` (:163) 400 `['file is required']` with empty multipart.
  - `MF-API-10` (:173) filename rule: parser-rewritten names (201, stored `passwd`/`dir.txt`/`b.txt`), `.`/`..`/`files/` give 400 `file is required`, empty `filename=""` gives `MF-API-19`'s body, others 400 `filename must be 1 to 100 characters of letters, digits, dot, underscore, hyphen or space`.
  - `MF-API-11` (:217) 400 `['property label should not exist']`.
  - `MF-API-12` (:229) 400 string `Unexpected field - attachment`.
  - `MF-API-13` (:242) 1 048 576 bytes 201, 1 048 577 bytes 413 `File too large`, nothing stored.
  - `MF-API-14` (:253) allow-list after normalization: nine 201s, three 415 `Unsupported file type: upload a PDF, PNG, JPEG or plain text file`.
  - `MF-API-15` (:280) eleventh file 400 `['a meeting may hold at most 10 files']`, listing stays ten (`FACT-3642`); sequential on purpose.
  - `MF-API-16` (:290) stranger with oversized file gets 413; stranger with a legal file gets the 404.
  - `MF-API-17` (:300) stored content type normalized (`APPLICATION/PDF; charset=utf-8` → `application/pdf`) in 201 body, listing and download header.
  - `MF-API-18` (:313) no `filename` + `application/octet-stream` → 400 `['file is required']`.
  - `MF-API-19` (:327) no `filename` + other type → 400 `['property file should not exist']`.
- No `- **Not automated:**` marker in any of the three meeting-files case docs (read in full).
- Spec imports (`meeting-files.api.spec.ts:1-10`): `@playwright/test`, `../../fixtures/auth.api.js`, `../../fixtures/multipart.js`, `../../fixtures/seed.js`.

### UI level (`*-FN-*`), project `web`

- Doc `meeting-files.functional.cases.md`, spec `meeting-files.functional.spec.ts`. `MF-FN-01`…`MF-FN-15` (header: "15 cases"; table :43-:59). Page `/meetings/<id>` and the download Route Handler; the browser never calls Nest (`ADR-0002`, `FACT-3633`).
  - `MF-FN-01` link row from dashboard; `MF-FN-02` one `h1`, one `main`, h2 "Files"; `MF-FN-03` list "Attachments" two items, `48 B` and `1.0 KiB`.
  - `MF-FN-04` empty state; `MF-FN-05` upload adds a row; `MF-FN-06` one `role="alert"` inside the form with the exact 415 text.
  - `MF-FN-07` same-origin download, full `Content-Disposition`, `nosniff`, `Cache-Control: private, no-store`.
  - `MF-FN-08` unauthenticated → `/auth/login`; `MF-FN-09` broken session → `/auth/session-expired` → login (invariant 17).
  - `MF-FN-10` form: label "Attachment", `name="file"`, button "Upload", `noValidate`, no `required`/`accept`.
  - `MF-FN-11` unknown meeting id → not-found page, no `pageerror`; `MF-FN-12` stale file id → 404 empty body.
  - `MF-FN-13` "Back to dashboard"; `MF-FN-14` no console problems; `MF-FN-15` empty selection shows API's `file is required`.
  - The cases document states 413 is the one message the web substitutes, with `That file is larger than the 1 MiB limit` (functional.cases.md:29-33). **Not found:** that string in `apps/web/src` or in any `e2e/**/*.spec.ts` (grep `larger than the 1 MiB`: only `meeting-files.functional.cases.md:33`).
- Spec imports (`meeting-files.functional.spec.ts:9-13`): fixtures `api.js`, `auth.api.js`, `auth.fixture.js`, `console.js`, and a further import block starting at :13.

### Unit level (`*-UT-*`)

- Doc `meeting-files.unit.cases.md` (no paired spec by design, :3). `MF-UT-01`…`MF-UT-10` (:42-:55), "6 in `apps/api` (`01`…`03`, `08`…`10`) and 4 in `apps/web` (`04`…`07`)" (:16).
- `apps/api/src/meeting-files/meeting-files.rules.spec.ts` carries `MF-UT-01`, `-02`, `-03`, `-08`, `-09`, `-10` (titles at :23, :35, :64, :104, :139, :180). Imports, exact lines:
  - `:1` `import { describe, expect, it } from 'vitest';`
  - `:3-8` `import { buildContentDisposition, isAllowedContentType, isValidFilename, normalizeContentType } from './meeting-files.rules.js';` (one name per line)
  - It imports no Nest, Prisma, multer, service or DTO.
- What it asserts: `isValidFilename` (`MF-UT-01`/`02`), `normalizeContentType` + `isAllowedContentType` incl. the four-value set and an `undefined` cast (`MF-UT-03`), `buildContentDisposition` fixtures (`MF-UT-08`/`09`/`10`, `FACT-3650`, `SEC-API-11`).
- Case doc vs spec: no disagreement found for the six IDs; the doc's `MF-UT-09` items (`***` → `___`, 150-character cap at 100) are in the spec at :148-:159.
- `MF-UT-04`…`07` are in `apps/web/src/lib/format-file-size.spec.ts` (doc :125); they share the case doc and the `pnpm test:meeting-files` filter.
- Other `apps/api/src` specs (`app.controller`, `auth.service`, `jwt-auth.guard`, `token.service`, `password`, `users.service`, `seed-guard`) do not import from `meeting-files` (Grep over `apps/api/src/**/*.spec.ts`: only `meeting-files.rules.spec.ts:8`).
- `apps/api/test/app.e2e-spec.ts` imports only `AppModule` (:7); no `meeting-files` match. It is the boot check.

### Neighbouring suites that name meeting-files

- `e2e/security/security.api.spec.ts`:
  - `PROTECTED_ROUTES` entries at :45-:47: `POST /meetings/:id/files`, `GET /meetings/:id/files`, `GET /meetings/:id/files/:fileId/content`. `SEC-API-01` (:86) walks them.
  - `POST_ROUTES` deliberately omits the upload route (:53-:56); `SEC-API-07` (:273) second branch posts multipart to it (:303-:324).
  - `SEC-API-11` (:429) asserts the stored hostile filename cannot break the header over HTTP; rows are read over HTTP, "no `DATABASE_URL` in the test process" (:716-:722). Comments cite `meeting-files.rules.ts` at :535, :754.
- `e2e/smoke/seed.api.spec.ts`: `SM-API-03` reads `GET /meetings/:id/files` (:72) and names `apps/api/src/meeting-files/meeting-files.seed.ts` in a failure message (:49). Doc `seed.api.cases.md:38`.
- `e2e/fixtures/seed.ts` mirrors `meeting-files.seed.ts` (:110, :145); its header says it imports nothing from `apps/api` (:7). `e2e/fixtures/multipart.ts:9` is shared by the MF API spec and the security spec.
- `e2e/README.md:65` says `meetings-detail` has no functional pair "since `meeting-files` landed".
- Journeys: `e2e/journeys/**` has no files (Glob). Smoke: `e2e/smoke/health.api.*` and `seed.api.*` only.

## 2. Integration level and database access

- `*.integration.spec.ts` / `*.integration.cases.md`: none (Glob `**/*.integration.*` over the repo).
- Project defined at `playwright.config.ts:70`: `{ name: 'integration', testMatch: /.*\.integration\.spec\.ts$/, use: { baseURL: API_URL } }`; comment :66-:69 says request fixture, no browser, "several modules exercised together", `TUNE-S3` 2026-09-29. Routing comment :55.
- `pnpm verify` (`package.json:37`): `check:orientation && lint && typecheck && pnpm test && api test:e2e && format:check && e2e && audit`. `e2e` is `playwright test` (:38) with no `--project` filter, so every defined project is in scope; with zero integration specs nothing runs under it. `scripts/scenarios-index.mjs:34` maps `.integration.cases.md` → `integration`. `suite-integrity.api.spec.ts` knows the suffix (:273, :474), the `INT` type (:46-:51) and the `@integration` tag (:474).
- Direct DB access from a test: none. Grep `PrismaClient|DATABASE_URL|@prisma` over `e2e/**/*.ts`, `apps/api/src/**/*.spec.ts`, `apps/api/test/**` matches only a comment at `security.api.spec.ts:720`. `e2e/fixtures/seed.ts:5-8` says the suite treats the server as a black box over HTTP. `apps/api/CLAUDE.md`: no unit touches the database, the Prisma client connects lazily, `db:reset` needs `DATABASE_URL`, and `src/config/database.config.ts` reads it from the process environment.
- `apps/api` Vitest: `vitest.config.ts:9` includes `**/*.spec.ts`; `vitest.config.e2e.ts` includes `**/*.e2e-spec.ts`. `test` script `pnpm prisma:generate && vitest run` (`apps/api/package.json:18`).

## 3. Meta-tests that could hold an import boundary

All read sources with `node:fs` and find the root by walking up to `pnpm-workspace.yaml` (`architecture.api.spec.ts:102-115`, `suite-integrity.api.spec.ts:89-107`). Each carries its own copy of `walk(root, relDir)` (recursive `readdirSync`, skipping `.git/.next/dist/node_modules/test-results`) and `read()` (`architecture.api.spec.ts:94,117-139`; `suite-integrity.api.spec.ts:68-128`). No glob library. All are `*.api.spec.ts`.

### `e2e/architecture/architecture.api.spec.ts` (cases: `architecture.api.cases.md`)

- Walk self-check (:981).
- `AR-API-01` ADR files named `ADR-NNNN-slug.md`, numbers unique.
- `AR-API-02` every ADR has heading, known status, Context/Decision/Consequences.
- `AR-API-03` ADR index and directory agree both ways.
- `AR-API-04` superseded records link to replacement and back.
- `AR-API-05` every `*.controller.ts` route under `apps/api/src` (regex scan, :365-:407) is in the contract Routes table and vice versa, guard flag equal.
- `AR-API-06` every guarded route is in `PROTECTED_ROUTES` (invariant 16).
- `AR-API-07` every `.claude/agents/*.md` has frontmatter `name`, `description`, `tools`, `model` (`AGENT_REQUIRED_FIELDS` :92, check :646-:672, test :1040), and `name` equals the filename without `.md`. Doc `architecture.api.cases.md:116-124`.
- `AR-API-08` first-column backticked names of the roles table in `.claude/skills/team-roles/SKILL.md` (regex :687) and the files in `.claude/agents/` agree in both directions (`violationsRolesExist` + `violationsRolesDocumented`, :696-:725; test :1047). Doc `:126-138`. It reads no other file under `.claude/skills/`.
- `AR-API-09` IDs in the contract Cases column exist in some `.cases.md`.
- `AR-API-10` stages cited in `docs/profiling` exist in `docs/process.md`.
- `AR-API-11`…`17` fact keys: unique and in block, source named, none in rationale, references resolve, lock agrees, retirement integrity, register parser non-vacuous. The lock comparison is `AR-API-15` here (`architecture.api.cases.md:243-258`); `FACT-3495` (`docs/adr/ADR-0022-fact-lifecycle.md:72`) attributes it to `AR-API-17` (README, contradiction 6).

### `e2e/suite-integrity.api.spec.ts` (no paired case doc, `SELF_EXEMPT` :26)

- Rule 1 suffix is api, functional or integration; 2 spec has `.cases.md`; 3 case doc has spec (except `*.unit.cases.md`); 4 unit spec paths named in `*.unit.cases.md` exist; 5 every declared ID appears in the paired spec unless `- **Not automated:**`; 6 no duplicate IDs; 7 a unit ID appears in the spec it is listed under; 8 every `apps/*/src/**/*.spec.ts` is mentioned in some `*.unit.cases.md` (except `UNIT_SPEC_EXEMPT` = `apps/api/src/app.controller.spec.ts`, :32); 9 no port formula or quoted `127.0.0.1` in `e2e/**/*.ts`; 10 level tag matches suffix. Plus a prefix-registry test (`KNOWN_CASE_PREFIXES` :43, includes `MF`).
- Nothing in it reads import statements of `apps/**` source.

### `e2e/process/process.api.spec.ts`

- `PR-API-01` section 0 labels across templates; `-02` templates registered in `check-orientation.mjs`; `-03` every change folder has the three stages; `-04` no scaffold left unfilled; `-05` scaffolder equals required stage files; `-06` research files carry evidence or `Not found`; `-07` `e2e/scenarios-index.md` matches `scripts/scenarios-index.mjs check` (titles :260-:343). None reads `apps/**`.
- `e2e/scenarios-index.md` lists every MF case (:138-:181), so a new or retitled case ID feeds `PR-API-07`.

### Lint

- No `no-restricted-imports`, `boundaries` or `import/` rule found in `eslint.config.mjs`, `apps/api/eslint.config.mjs` (spreads `nestConfig`), `packages/eslint-config/{base,nest}.js`; only `explicit-module-boundary-types: 'off'` (`nest.js:23`).
- The only stated boundary is prose: `*.rules.ts` is "pure rules with no Nest or Prisma imports" (`apps/api/CLAUDE.md`, Map table); spec header says "no Nest, no Prisma, no multer" (`meeting-files.rules.spec.ts:14`).

### Skills and agents registration, as far as tests go

- The links from `.claude/**` to tests: `AR-API-07`, `AR-API-08` (above), and the ledger spec's dangling-reference scan over `['docs', '.claude/skills', 'e2e']` (`e2e/ledger/ledger.api.spec.ts:40`). `pnpm skills:check` / `scripts/skills-sync.mjs` covers external sets by `skills-lock.json` and is not in `verify` (root `CLAUDE.md`).
- A new agent file needs the four frontmatter fields with `name` = filename (`AR-API-07`) and a first-column backticked cell in the `team-roles` roles table (`AR-API-08`). No test found that registers or counts a new skill.

## 4. What a moved unit spec must satisfy

- Title prefix `MF-UT-NN — …` (`meeting-files.unit.cases.md:6`; `apps/api/CLAUDE.md` "Where tests go"). `pnpm test:meeting-files` is `pnpm -r test -t "MF-UT-"` (`package.json:24`), filtering by title across both packages.
- Rule 4 (`suite-integrity.api.spec.ts:305-321`): every `apps/...spec.ts` path written in a `*.unit.cases.md` (regex `APPS_SPEC_PATH` :66) must exist. The current path is written at `meeting-files.unit.cases.md:57` and in `e2e/README.md:55`.
- Rule 7 (:384-:405): each ID listed after a path line must appear as a substring in that file.
- Rule 8 (:407-:422): every `apps/*/src/**/*.spec.ts` must be named by path in some `*.unit.cases.md`, or be in `UNIT_SPEC_EXEMPT` (comment :29-:31: new specs do not go there). Pattern `^apps/[^/]+/src/.*(?<!\.e2e)\.spec\.ts$` (:141).
- Vitest picks up `**/*.spec.ts` under `apps/api` (`vitest.config.ts:9`).

## 5. Tests asserting paths or names inside `apps/api/src/meeting-files`

- `meeting-files.unit.cases.md:57` and `e2e/README.md:55`: the literal path `apps/api/src/meeting-files/meeting-files.rules.spec.ts`; the first is checked by rules 4 and 7.
- `meeting-files.rules.spec.ts:8`: relative import `./meeting-files.rules.js`.
- `e2e/smoke/seed.api.spec.ts:49`: path `apps/api/src/meeting-files/meeting-files.seed.ts` inside a failure-message string, not an assertion on the file.
- `e2e/fixtures/seed.ts:110,145`, `e2e/security/security.api.spec.ts:535,754`: comments naming `meeting-files.seed.ts` / `meeting-files.rules.ts`; no assertion.
- `architecture.api.spec.ts:368-370`: finds controllers by suffix `.controller.ts` anywhere under `apps/api/src`; expects `@Controller(...)` on one line, `export class ` at line start, and `@UseGuards(` among the class-level decorator lines or within -3/+4 lines of each method decorator (:381-:396). The current controller is `apps/api/src/meeting-files/meeting-files.controller.ts`.
- Current directory contents (Glob): `meeting-file.types.ts`, `meeting-files.mapper.ts`, `dto/upload-file.dto.ts`, `meeting-files.module.ts`, `meeting-files.seed.ts`, `meeting-files.controller.ts`, `meeting-files.rules.ts`, `meeting-files.rules.spec.ts`, `meeting-files.service.ts`.

## 6. Assertions that pin the current state

- Exact bodies and statuses: `MF-API-02`, `-03`, `-08`, `-09`, `-10`, `-11`, `-12`, `-13`, `-14`, `-15`, `-19`. Key sets: `MF-API-01` (five keys), `MF-API-04` (only `items`). Order: `MF-API-04` (`uploadedAt` desc, `id` asc, invariant 7). Headers: `MF-API-06`, `MF-FN-07`. Stored normalized type: `MF-API-17`. Evaluation order: `MF-API-16` (413 before 404; ownership before count).
- `MF-API-15`: count-then-insert, sequential, "not a transaction" (api.cases.md:288).
- `MF-UT-01`/`02`/`03`/`08`/`09`/`10` pin the exported names `isValidFilename`, `normalizeContentType`, `isAllowedContentType`, `buildContentDisposition` and the module specifier `./meeting-files.rules.js` (spec :3-8).
- `MF-API-10` / `MF-API-18` prose states `file.originalname` is never undefined at the handler (api.cases.md:322-:325) and the `preservePath` coupling (:187-:188).
- `SEC-API-01`, `AR-API-05`, `AR-API-06` depend on three routes staying registered as listed (`security.api.spec.ts:45-47`).
- `SM-API-03` depends on the seed rows (`seed.api.spec.ts:49,72`).

## 7. Fixtures and data, and which owner they mutate

- Read-only, `teacher`: "Geometry workshop" (`mtg-teacher-3`) with seeded `notes.txt` (48 B) and `syllabus.pdf` (1024 B) (api.cases.md:9-12, `seed.ts:110-145`). `student` is read-only.
- Mutating API cases run as `planner`, each creating its own meeting (api.cases.md:16-22). `mtg-planner-1` stays the empty-state fixture; the header-safety meeting holds the `fil-planner-2-*` rows, owned by `SEC-API-11` and asserted exactly by `SM-API-03` (api.cases.md:20-22, `seed.ts:145`).
- Mutating functional cases run as `organizer`, each creating its own meeting; `mtg-organizer-1` keeps zero files (functional.cases.md:11-14; `FACT-3126`).
- Helpers: `e2e/fixtures/{api,auth.api,auth.fixture,console,multipart,seed}.ts`. The database is reset and seeded by `start:e2e` before the run (`apps/api/CLAUDE.md`); `fullyParallel: true` (api.spec.ts comment :73), so the owner is the isolation unit.

## 8. Where coverage stops

- No unit spec for `meeting-files.service.ts`, `meeting-files.mapper.ts`, `meeting-files.controller.ts`, the DTO or the module: the only spec in the directory is `meeting-files.rules.spec.ts` (Glob). Their behaviour is asserted only over HTTP (`MF-API-*`).
- The ten-file cap and ownership check (`FACT-3642`) are asserted only by `MF-API-15` / `MF-API-16`; no unit.
- No `- **Not automated:**` line in any meeting-files case doc.

## Not found

- **Not found:** any `*.integration.spec.ts` or `*.integration.cases.md` — searched whole repo, Glob `**/*.integration.*`.
- **Not found:** a test that talks to the database directly — searched `e2e/**/*.ts`, `apps/api/src/**/*.spec.ts`, `apps/api/test/**` for `PrismaClient|DATABASE_URL|@prisma`; only a comment at `security.api.spec.ts:720`.
- **Not found:** an existing test that reads import statements of `apps/**` source — searched `e2e/architecture`, `e2e/process`, `e2e/suite-integrity.api.spec.ts`.
- **Not found:** an ESLint import-restriction or boundary rule — searched `eslint.config.mjs`, `apps/api/eslint.config.mjs`, `packages/eslint-config/*.js` for `no-restricted|boundaries|import/`.
- **Not found:** any journey spec — searched `e2e/journeys/**`.
- **Not found:** a test that checks the skills directory, a skill count or skill registration — searched `e2e/**/*.ts` and `scripts/*.mjs` for `.claude/skills`; only `AR-API-08`, the ledger reference scan and `skills-sync.mjs`.
- **Not found:** a test that checks `e2e/README.md` against the case docs — searched `e2e/**/*.ts` for `README`.
- **Not found:** a unit spec for service, mapper, controller or DTO of meeting-files — Glob `apps/api/src/meeting-files/**`.
