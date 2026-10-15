# Research: history — clean-architecture-pilot

Re-run after the research review. Every statement below was read in the file named; line numbers
are `path:line`. Nothing here is a count or summary of a document that was not opened. Ledger
tables put whole entries on one line, so ledger and backlog citations are by ID (the row is on a
single line of `docs/CHANGELOG.md` / `docs/BACKLOG.md`) with the line number of that row.

## Rejected — read this first

**A repository layer between the service and Prisma is in the Rejected record.** It was weighed and
refused at three places:

- `docs/adr/ADR-0027-postgres-prisma-store.md:94-96`, `FACT-3589` (under `Rejected:`, line 79):
  "A repository or data-access layer between the service and Prisma — the service already owns the
  store, and an interface whose only second implementation is a hand-written fake moves the unit
  tests from testing the code to testing the fake. — this record, `FACT-0013`". Status of ADR-0027
  is `accepted` (`:3`), `Supersedes: ADR-0007` (`:5`), `Superseded by: —` (`:6`).
- `docs/architecture.md:157`, `FACT-0059`, in "Patterns deliberately refused" (`:148`):
  "A repository layer between a service and Prisma" — recorded in `ADR-0027`. Reasoning block at
  `docs/architecture.md:175-176` (not a fact, `> **Rationale — not a fact.**`): "A repository layer
  over Prisma would have exactly one second implementation — a hand-written fake — which moves the
  unit tests from testing the code to testing the fake, and the service already owns the store."
- `docs/plans/meeting-files/design.md:604`: "A repository layer between the services and Prisma |
  Its only second implementation would be a hand-written fake, which moves the unit tests from
  testing the code to testing the fake. `FACT-0013` already says the service owns the store."
  Same table, `:605`: "`vi.mock('@prisma/client')` to keep the service units | The same
  objection, plus: the assertions would become 'the service called `count` with this `where`',
  which is the restatement-of-the-implementation shape the backlog already rejected for `dal.ts`
  and for jsdom component tests."

The requirement as briefed names a Prisma repository adapter behind ports. This file reports that
the three entries above exist and what they say; it does not say whether they still hold.

`docs/BACKLOG.md` "Rejected" section (`:90` onward, all rows read): none of its rows concerns a
repository layer, ports, adapters, use cases, a domain model or an import boundary. The rows are:
unit coverage for `lib/dal.ts`/`proxy.ts`/`lib/actions/*`; React component tests in jsdom; deleting
`docs/plans/plan-review-*.md`; pluralizing the meeting counter; moving the seed's plaintext
password (`BL-004`); mutation testing; global `fullyParallel: false`; a state reset endpoint;
`pnpm audit --audit-level=low`; removing a `FEAT` review gate (`P2`); dropping `FEAT-S6` acceptance
(`P4`); changing a role's model (`P5`); a `TUNE` profiling record (`P8`).

Rejected rows with a stated reason that touch adjacent ground (quoted from `docs/BACKLOG.md`
Rejected):

- "Unit coverage for `lib/dal.ts`, `proxy.ts`, `lib/actions/*` | The modules are `server-only` or
  Server Actions — Vitest cannot resolve them in principle. ... Extracting logic for a metric would
  make the code worse".
- "A state reset endpoint for tests | A test back door in a production API. Isolation is achieved
  through data: dedicated owners for mutations".
- "Mutation testing | The 'prove the tests do not pass blindly' role is already filled by the
  mandatory control experiments".

## 1. Ledger (`docs/CHANGELOG.md`)

Tables: Features (`:36`), Process (`:72`), Defects (`:110` heading). Feature table columns:
ID, Date, What, Checks, Commit. Defects table columns: ID, Date, What, Found by, Commit (read from
the rows below).

### Already built

**FT-007** (`docs/CHANGELOG.md:38`), 2026-10-06, commit `18b27f6` (git:
`18b27f6 2026-10-07 feat: store meetings in PostgreSQL via Prisma and add file attachments`).
What cell, quoted: "`apps/api`'s in-memory meetings/users store replaced by PostgreSQL through
Prisma (`ADR-0027`, supersedes `ADR-0007`; `ADR-0028` for the generate-prefixed scripts) ... New
feature on top of it: meeting file attachments — `POST /meetings/:id/files`,
`GET /meetings/:id/files`, `GET /meetings/:id/files/:fileId/content` (`ADR-0029`, bytes stored in
the database), a ten-file cap per meeting, a built (never interpolated) `Content-Disposition`
header, and the upload form, meeting detail page and download Route Handler in `apps/web`. Eleven
corpus keys retired or withdrawn across `docs/data-model.md`, `docs/api-contract.md`,
`docs/architecture.md` and two ADR registers (design §6/§3a), three re-pointed citations in the
same commit".
Checks cell, quoted exactly where it concerns units: "55 new/relocated e2e cases (167 across 16
files, up from 112/13 — independently recounted by file, not taken on faith); 43 unit tests (down
from 51 — 18 service-layer units against the old store retired/relocated/withdrawn per design §7,
10 new pure-function units for the filename/content-type/header rules and `formatFileSize`);
`pnpm verify` green, 1 min 47 s end to end with Docker up". The cell also opens with: "`AL-API-20`
is the one case this migration opened and closed **after** the store had already moved rather than
before it — the window task 7 guarded could not reach it (plan §4a)".
Cross-reference in the prior change's plan, `docs/plans/meeting-files/meeting-files.plan.md:11`:
"the 18 units in `meetings.service.spec.ts` (11 retire, 3 relocate, 4 are withdrawn — design §7)".

**CH-031** (`docs/CHANGELOG.md:76`), 2026-10-09, commit `9fc454e` (git:
`9fc454e 2026-10-09 fix: issue prefixed ids at runtime and guard the seed against production`).
Quoted: "`ADR-0030` supersedes `ADR-0017` ... `apps/api/prisma/seed.ts` now calls
`assertSeedAllowed` (`src/config/seed-guard.ts`) and refuses to run with `NODE_ENV=production`,
covered by `AL-UT-32`. The third question, identifier format, is `FX-046`."

**CH-033** (`docs/CHANGELOG.md:74`), 2026-10-13, commit cell `e4aa852`. Verified with git:
`e4aa852 2026-10-13 chore: tune the pipeline, round five, and capture gate verdicts`
(`git log --oneline -S'CH-033' -- docs/CHANGELOG.md` returns `73abca0`, `e4aa852`; `git log --grep CH-033`
returns `73abca0`, `0272e23`; the commit that introduced the row is `e4aa852`, and `0272e23` is the
hash-fill commit "docs: fill in the commit hash for CH-033 and FX-047"). The reviewer's hash
matches the ledger cell. Items touching this area, quoted:

- "**Item 12 (convention only):** `CLAUDE.md` gains 'Comments in code' — cite keys, invariant
  numbers, case IDs and symbols, never a line number or 'design §N'."
- "**Item 4:** `implementer-api` and `implementer-web` point at the invariants in `CLAUDE.md`
  instead of restating them".
- "Items 8–10, 12's cleanup, 13–15 are product or check work and become `BL-` rows through the
  normal flow." (those rows are `BL-034`, `BL-030`, `BL-039`, `BL-040`, `BL-041`…`BL-047` below)
- "every effect below is projected from those records, not measured."

**CH-024** (`docs/CHANGELOG.md:83`), 2026-09-30, `d5334d3`: fact lock. Quoted: "`docs/facts-lock.json`
pins all 547 keys with a SHA-256 of each statement ... `pnpm fact:lock` writes it, `pnpm fact:check`
compares offline. `AR-API-15` catches a deleted or silently reworded fact, `AR-API-16` a retirement
naming no successor or a dead one, `AR-API-17` drives both over an in-spec fixture" and "The parser
now lives once in `scripts/facts-parse.mjs`, read by both the lock and the meta-test".
**CH-025** (`:82`, `d5334d3`): "`docs/facts-lock.json` goes from 547 `active` and zero retired to 546
and one, and `AR-API-16`/`AR-API-17` run against live data".
**CH-023** (`:84`, `d5334d3`): "`FACT-NNNN` key ... `AR-API-11`…`AR-API-14`".
**CH-015** (`:92`, `08148c7`): "Architecture corpus: `docs/architecture.md`, `docs/adr/` (15 records,
`pnpm adr:new`), `data-model.md`, `api-contract.md`; section 0 gained 'Architecture impact';
`AR-API-01…08` meta-test (`ADR-0015`)".
**CH-010** (`:97`, `7126d8a`): "A `CLAUDE.md` per application: package map, its quirks and where
tests go — without copies of the root invariants".

### Already broken here

Found-by is the Defects table's fourth column.

- **FX-041** (`:124`, 2026-10-06, `18b27f6`). Found by: "`SEC-API-11`, written specifically against
  the **write path that bypasses the controller** — the seed inserts the five hostile filenames
  straight through Prisma". What: "The meeting-file download controller built `Content-Disposition`
  by interpolating the stored filename directly ... both rows answered **500** instead of the
  contracted 200. Fixed by building the header per RFC 6266's `filename`/`filename*` pairing instead
  of interpolating (`buildContentDisposition`, `meeting-files.rules.ts`)".
- **FX-042** (`:123`, 2026-10-06, `18b27f6`). Found by: "`MF-FN-15`, the browser-level
  empty-selection scenario — invisible to any API-level case, since the substitution happens inside
  the browser's own `FormData` encoding before the request leaves the client". What: "Next's Server
  Action `FormData` decoder substitutes the literal filename `'blob'` for any part submitted with
  `filename=\"\"` ... `'blob'` passes the filename rule's own shape check, so submitting the upload
  form with no file chosen reached the 415 (unsupported content type) branch instead of the
  documented 400 `file is required`".
- **FX-043** (`:122`, 2026-10-06, `18b27f6`). Found by: "`MF-API-12`, written red against the
  documented 400 body before the module existed (`FEAT-S10`); went red for exactly this reason
  rather than a missing route or a typo". What, quoted: "`2.4.0` renamed its `LIMIT_UNEXPECTED_FILE`
  error message, and `@nestjs/platform-express` matches that string by **exact equality** to convert
  it into Nest's documented 400. The mismatch meant the conversion never fired and an upload under
  the wrong field name answered Nest's default **500** instead of the contracted
  `{\"message\":\"Unexpected field - <name>\",\"statusCode\":400}`. Fixed by pinning `multer` to
  exactly `2.3.0` in `pnpm-workspace.yaml`". Present state: `pnpm-workspace.yaml:59` reads
  `multer: '2.3.0'`; comment at `pnpm-workspace.yaml:26-28`.
- **FX-044** (`:121`, 2026-10-06, `18b27f6`). Found by: "planning, while building the corpus table
  for design §3a/§6 — not by any test: nothing checks a corpus sentence against the spec it
  describes". What: a retired `ADR-0017` fact claimed `SM-API-03` "reads only titles"; "the case
  actually compared `participants` verbatim already (`seed.api.spec.ts:63-77`)".
- **FX-045** (`:120`, 2026-10-06, `18b27f6`). Found by: "implementation, while wiring
  `prisma/**/*` into the typecheck scope". What: "`apps/api/tsconfig.json`'s `include` was
  `[\"src/**/*\", \"test/**/*\", \"*.ts\"]`: `*.ts` matches top-level files only, so `pnpm typecheck`
  passed **vacuously** over any nested directory outside `src/` and `test/` — proven with
  `tsc --listFiles` before and after the fix, not inferred. Adding `prisma/**/*` immediately
  surfaced two real type errors the generated Prisma types had been hiding." Present state:
  `apps/api/tsconfig.json:7` `"include": ["src/**/*", "test/**/*", "prisma/**/*", "*.ts"]`;
  `git show 18b27f6 -- apps/api/tsconfig.json` changed that line and the `types` array
  (`"vitest/globals", "node"` to `"vitest/globals", "node", "multer"`).
- **FX-046** (`:119`, 2026-10-09, `9fc454e`). Found by: "planning of `meeting-files` (design §8),
  which carried the divergence forward as `BL-024` rather than settling it". What: "the data model's
  identifier rule required a type prefix, while `POST /meetings` and `POST /meetings/:id/files`
  issued a bare `randomUUID()` ... `ADR-0031` settles on the prefix: runtime ids are now `mtg-<uuid>`
  and `fil-<uuid>` ... Taken through the light bugfix path by the owner's choice: no change folder,
  no research, design or plan stages, although a contract fact moved".
- **FX-029** (`:136`, 2026-09-16, `7126d8a`). Found by: "`pnpm audit` inside `pnpm verify`":
  "`multer@2.2.0` with two high advisories pulled transitively from `@nestjs/platform-express@12.0.1`".
- **FX-001** (`:164`, `36e83b4`), Found by "T0, control experiment": "The meta-test scanned
  `e2e/e2e`, found zero files and **passed vacuously**". **FX-012** (`:153`, `e622344`), Found by
  "audit plus control experiment": "rules 5–7 would go vacuously green". **FX-003** (`:162`,
  `36e83b4`), Found by "T0, control experiment": "Four `eslint-plugin-playwright` rules sat at `warn`
  and ESLint exited 0".

Ledger search results that touch the other listed topics, by keyword over `docs/CHANGELOG.md`:
"no-restricted" none; "layering" none; "mapper" none; "import rule" none; "tsconfig" only `FX-045`;
"Prisma" only `FT-007`, `FX-045`, `FX-041`; "design §" in `FT-007`, `CH-033`, `FX-046`, `FX-044`;
"facts.lock" in `CH-024`, `CH-025`; "facts-parse" only `CH-024`. `CH-030`/`CH-032` mention
`eslint-config-next`/`eslint` only as dependency paths of an audit advisory, not `apps/api`'s
lint config.

## 2. Backlog (`docs/BACKLOG.md`)

Open table columns: ID, P, Area, What, Depends on, Conflicts with. Closed items also sit in the
Open table with a "Closed by" prefix (e.g. `BL-024`, `BL-033`) and three rows sit in the Closed
table (`BL-022`, `BL-010`, `BL-014`), none relevant.

- **BL-019** (P3, process): "Drift check for `docs/data-model.md` against the DTO and entity types,
  the way `AR-API-05` checks routes" — Depends on `CH-015`; Conflicts with: "no; extends the
  architecture meta-test".
- **BL-040** (P3, process): "Rewrite the 23 'design §N' comment lines in 12 files and the
  line-number pointers under `apps/*/src` so a comment states why and cites `FACT-`/`ADR-` keys,
  invariant numbers, case IDs and symbol names (tuning round 5, item 12; review §9 rows 4, 8, 10),
  and add a grep guard on `design §\d` under `apps/*/src`, which makes the corresponding
  `code-reviewer.md` check-3 clause removable. ... Counted: 23 → 0". Depends on: "the convention
  paragraph in root `CLAUDE.md` from the same round". Conflicts with: "no; a comment-only change in
  product code, so no behaviour spec, but it still goes through review and `pnpm verify`".
- **BL-043** (P3, api): "`issueId(prefix)` in `apps/api/src/common/`: the id prefixes `mtg-` and
  `fil-` are literals in two services (tuning round 5, item 13c; review §9 row 3) — the shape of
  `FX-046` ... Counted: 2 literals → 1". Conflicts with: "no; `BL-024` is closed by `FX-046` and
  this keeps its format, `mtg-`/`fil-` + `randomUUID()` (`ADR-0031`)".
- **BL-044** (P3, api): "Move the upload rule order from `meeting-files.controller.ts` into
  `meeting-files.rules.ts`, and build the size message from `MAX_FILES_PER_MEETING` rather than a
  hard-coded '10' (tuning round 5, item 13d; review §9 row 5). The controller then holds no rule of
  its own". Conflicts with: "**no:** the response bodies are unchanged, so `MF-API-*` stays as
  written; a product change with its own review and run".
- **BL-046** (P3, process): "A check that every directory holding `.ts` files is in some `tsconfig`
  `include` (tuning round 5, item 14a; review §7 class 2, 'checks that pass when they should fail').
  `FX-045` has no guard today — **Not found** in the review: a directory outside every `include` is
  neither typechecked nor linted and nothing says so". Conflicts with: "no; it adds a meta-test
  beside `AR-API-05`/`06` and moves no rule".
- **BL-047** (P3, web): "Lint bans for three invariants now held by prose (tuning round 5, item
  14b; review §7 class 1): invariant 3 (`useGlobalPipes` in `apps/api`), invariant 13 ... and
  invariant 15 ... Open cost: lint and `pnpm verify` time, unmeasured. Each ban gets a control
  experiment that goes red". Depends-on cell: "shares its shape with `BL-034`: lint configuration
  with a control experiment per rule". Conflicts with: "**`BL-034`:** both edit `apps/web`'s lint
  config; land one, then the other, or fold in and say so".
- **BL-034** (P2, web): "No mechanical guard against a dead class, a raw colour literal or a wrong
  font ... also adds `@typescript-eslint/no-deprecated` on `apps/web` and a pattern ban ... Open
  cost: a type-aware rule may slow `pnpm lint` (49 s today; plan Q2)". Conflicts with: "**no:**
  nothing planned adds a check here".
- **BL-037** (P2, process): "`e2e/suite-integrity.api.spec.ts` rule 5 is satisfied by a prose
  cross-reference ... for the eight `MF-API-*` cases it cannot tell 'automated as a test' from 'named
  in a comment'". Conflicts with: "no; tightens an existing meta-test rule rather than adding one".
- **BL-030** (P2, web): lists-vs-pages check; Conflicts with: "**yes, and it has already happened
  once:** the `meeting-files` change added `/meetings/[id]`, and both lists plus the `proxy.ts`
  matcher were extended by hand with nothing to check them".
- **BL-024** (P2, api): "**Closed by `FX-046` (`ADR-0031`):** runtime ids are now `mtg-`/`fil-` +
  `randomUUID()`" — Conflicts with: "**yes:** `HD-API-21` asserts the UUID shape ... (it replaced
  `HD-UT-07`, retired with the in-memory store)". **BL-038** (P3, api): "**Closed by `FX-046`**" —
  Conflicts with: "no; a corpus wording gap tracking an open decision".
- **BL-004** (P2, security): "**Closed by `CH-031` — rejected, see Rejected.**" The row also says:
  "`meeting-files` gave the seed a database ... deliberately kept out of that change's scope (plan
  §0, 'Conflicts with planned')"; Conflicts with: "**yes:** `e2e/fixtures/seed.ts` mirrors the
  seed".
- **BL-018** (P3, process): "Drop the `multer` override from `pnpm-workspace.yaml` once
  `@nestjs/platform-express` raises its range"; Conflicts with: "no; the override only raises a
  version inside the range and changes no behaviour".
- **BL-039** (P2, process): AR-API check that each process row's Role file holds `Write`/`Edit`;
  Conflicts with: "no; it runs inside the existing architecture spec beside `AR-API-07`/`08`".
- **BL-041** (`withSession` for Server Actions), **BL-042** (one non-2xx path in `api-client.ts`),
  **BL-045** (rename `session.spec.ts`): `apps/web` items, out of scope of the requirement.

Searched in `docs/BACKLOG.md` (whole file read) for repository layer, port, adapter, use case,
domain model, fake, import boundary: no row proposes or rejects any of them.

## 3. Decisions (`docs/adr/README.md` and the files)

Log read in full (`docs/adr/README.md:35` onward).

- **ADR-0006** "Nest layering: controller, service, mapper, and validation as a provider" —
  accepted, 2026-09-07, no supersession (`:3-6`). Decision: `FACT-3103` "**Controller** routes,
  validates through its DTO, reads identity from `@CurrentUser()`, and maps the result out. Nothing
  else."; `FACT-3104` "**Service** holds the rules and owns the store, and knows nothing about HTTP.";
  `FACT-3105` "**Mapper** (`toMeetingDto`, `toUserDto`) is the only way an entity becomes a
  response."; `FACT-3106` `ValidationPipe` as `APP_PIPE` (`:25-33`). Rejected `FACT-3109` "Returning
  entities directly and 'just remembering' to strip fields." (`:39`). Context `FACT-3100` "Rules held
  in a controller cannot be unit-tested without HTTP." (`:10`). Consequence `FACT-3112` "Every response
  shape is checked by key set" (`:55`). `FACT-3111` retired by `FACT-3651` (`:66`).
  Matching table in `docs/architecture.md:80-85` (`FACT-0012`…`FACT-0016`), heading `:76`
  "controller → service → store, one direction only", pattern `FACT-0026` "Layered modules" (`:115`).
- **ADR-0007** "An in-memory store with a code seed instead of a database" — **superseded** by
  ADR-0027 (`:3`, `:6`).
- **ADR-0027** "PostgreSQL via Prisma, run by docker-compose, replaces the in-memory store" —
  accepted, 2026-10-05, supersedes ADR-0007. Decision `FACT-3572` (`:48-49`): "`User`, `Meeting` and
  `MeetingFile` are tables. The services read and write through one injected Prisma client and keep
  no in-process copy of the data."; `FACT-3581` (`:74-75`): "The Prisma client is never connected
  eagerly: no `$connect()`, no `OnModuleInit` and no `enableShutdownHooks()`"; `FACT-3577` "No
  service constructor and no lifecycle hook touches the database."; `FACT-3582` `startsAt`/`uploadedAt`
  are `String` columns. Refused repository layer: `FACT-3589` (`:94-96`, quoted under Rejected above).
  Rationale block `:119-128`: "That holds for the unit layer, which probe 7 measured; that the
  supertest spec also boots `AppModule` through Nest DI and exits cleanly with an undisposed adapter
  pool is an inference and is recorded as one".
- **ADR-0028** "Prisma is pinned exactly and generated with prisma-client-js into node_modules" —
  accepted. `FACT-3604` `prisma`, `@prisma/client`, `@prisma/adapter-pg` pinned to `7.10.0`;
  `FACT-3605` "No generated code enters the repository tree."; `FACT-3606` schema at
  `apps/api/prisma/schema.prisma`, driver adapter for the runtime client; `FACT-3602`
  (`:36-38`) ".prettierignore and the eslint ignore lists carry no entry for a generated _code_
  directory".
- **ADR-0029** "File bytes live in a bytea column and never cross the JSON boundary" — accepted,
  2026-10-05. `FACT-3626` (`:74-76`) "The listing endpoint returns metadata only, through a mapper
  that drops `content` the way `toMeetingDto` drops `ownerId`."; `FACT-3628` (`:87-88`) "The
  `Uint8Array` Prisma hands back is converted to a `Buffer` at the controller boundary and nowhere
  else."; `FACT-3629` 1 048 576 bytes enforced by `limits.fileSize`; `FACT-3631` content-type
  allow-list; `FACT-3642` ten-file cap, "the check is a count before the insert rather than a
  transaction"; `FACT-3650` read path validates its own output; `FACT-3619` platform-express maps
  `LIMIT_FILE_SIZE` to `PayloadTooLargeException('File too large')`.
- **ADR-0031** "Every identifier carries its type prefix, including the ones issued at runtime" —
  accepted, 2026-10-09. `FACT-3669` `<prefix><body>`; `FACT-3670` runtime path issues the prefix
  followed by `randomUUID()`, "Ids stay application-issued and the schema declares no `@default`";
  `FACT-3665` names `apps/api/src/meetings/meetings.service.ts` and
  `apps/api/src/meeting-files/meeting-files.service.ts`. `FACT-3583` of ADR-0027 retired by
  `FACT-3670` (`ADR-0027:137`).
- **ADR-0018** "A record the caller does not own answers 404, never 403" — accepted. `FACT-3382`
  body exactly `{ "message": "Meeting not found", "error": "Not Found", "statusCode": 404 }`,
  "produced by `new NotFoundException('Meeting not found')`"; `FACT-3383` "The argument form is
  mandatory"; `FACT-3386` (`:59-60`) "The controller throws and the service returns `undefined`:
  translating absence into HTTP is the controller's job. — `FACT-0013`, `ADR-0006`"; `FACT-3381`
  "one lookup scoped by the owner from the token, one `undefined` result".
- **ADR-0010** "Conventions are executable: meta-tests instead of a style guide" — accepted.
  `FACT-3189` "A meta-test must prove it found something: each one starts with a self-check that the
  walk returned a non-empty set."; `FACT-3190` "Machines check form, humans check meaning."; Rejected
  `FACT-3192` "Lint rules at `warn`."; Table `FACT-3187` `e2e/architecture/architecture.api.spec.ts`
  "the ADR log, the API contract doc, the agent definitions".
- **ADR-0021** "Every fact in the architecture corpus carries a key, and inference is marked as
  inference" — accepted. `FACT-3460`, `FACT-3461` ("A statement with no key is not a fact of this
  project and must not be relied on"), `FACT-3462`, `FACT-3466` ADR block `3000-3999`.
- **ADR-0022** "A fact is appended and retired, never deleted or rewritten in place" — accepted.
  `FACT-3487` retire with successor key; `FACT-3491` `docs/facts-lock.json`; `FACT-3492`
  `pnpm fact:lock`/`pnpm fact:check` (`scripts/facts-lock.mjs`); `FACT-3493` `AR-API-15`, `FACT-3494`
  `AR-API-16`, `FACT-3495` `AR-API-17` "fails when a stated fact's text no longer matches the hash
  the lock holds for it".
- **ADR-0015**, **ADR-0014** (roles), **ADR-0032** (verdict hook), **ADR-0016** (discovery stages):
  in the log as `accepted`; their texts were not read for this sweep beyond the keyword search below.

Rule for any change that alters a decision: `docs/adr/README.md` "Rules" — "An accepted ADR is not
edited in substance ... A decision that changes gets a **new** ADR whose `Supersedes` names the old
one" and "An architectural change writes its ADR before its code."

## 4. Prior change folder `docs/plans/meeting-files/`

`research/probes.md`, lines read as quoted (733 lines in the file).

- **Probe 7 — "A Prisma-backed service under Vitest with no database"** (`:678-711`).
  `:680-682`: "The repository's unit specs construct services directly
  (`apps/api/src/meetings/meetings.service.spec.ts`, `users.service.spec.ts`). The probe mirrored
  that shape: a hand-rolled `MeetingsService` holding a `PrismaClient`, under `vitest@4.1.2`."
  `:684-693`: "**Construction and import succeed; the query rejects.**" with `Tests 2 passed (2)`,
  `PR-1` asserting `typeof client.meeting.count === 'function'`, `PR-2` asserting
  `rejects.toThrow()`. `:700-702`: `QUERY ERROR name: PrismaClientKnownRequestError`, `code: P1001`.
  `:705-707`: "So a service method that reaches Prisma throws `PrismaClientKnownRequestError` with
  code `P1001` when nothing is listening. Constructing the client does not connect — the connection
  is attempted at first query." `:709-711` **Not probed:** "whether a Prisma client can be
  substituted in a Vitest unit without a database (mocking, `vi.mock`, an in-memory driver adapter)
  was not tested; no such pattern exists in the repository today to test against."
  Restated at `:719-720`: "Whether a Prisma client can be faked in a Vitest unit, and what the
  existing unit specs would become — probe 7."
- **Probe 1e** (`:296-309`): "the import and the construction succeed under Vitest with nothing
  listening."
- **Probe 0e** (`:154-158`): "the `embedded-postgres` npm package ships a native server binary and
  ran a real PostgreSQL 18.4 on this machine with no Docker at all — see probe 5. Recorded as a fact
  about the machine, not as a proposal."
- **Probe 5** (`:526-632`): `:528-529` "Docker is unavailable (probe 0), so a real PostgreSQL was
  obtained from the `embedded-postgres` package"; `:540-541` "recorded as a fact about **this
  machine**, not as a proposal for the repository"; 5c (`:574-602`) `Buffer` goes in, `Uint8Array`
  out, `isBuffer: false`, "SHA-256 of 1 MiB matches"; `runtime.Bytes` is `Uint8Array`
  (`node_modules/@prisma/client/runtime/client.d.ts:183`); 5d (`:604-616`) `JSON.stringify` yields
  `{"content":{"0":1,"1":2,"2":3}}`, "Whether Nest's serializer produces the same bytes for a
  `Uint8Array` was **not probed**"; 5e (`:618-625`) metadata-only select and cascade work; 5f
  (`:627-632`) "`startsAt` ... read back as a `Date` ... The repository today stores `startsAt` as an
  ISO **string**, not a `Date` (`FACT-1008`)".
- `research/README.md:193-197` open question 2: "**Whether a Prisma client can be faked in a Vitest
  unit.** ... No mocking or in-memory-adapter pattern exists in the repository to test against, so
  what happens to `meetings.service.spec.ts` and `users.service.spec.ts` is open."
- `design.md:604-605`: repository layer and `vi.mock('@prisma/client')` both listed as rejected
  (quoted under Rejected above). `design.md:904-908` (read): `AL-UT-17` and `AL-UT-19` "survive,
  re-pointed"; `auth.service.spec.ts` "is untouched — it already injects a cast fake for
  `UsersService`"; `:908` is that line. `design.md:911` also states `pnpm test:meetings-detail`
  "loses its subject and goes".
- `docs/plans/meeting-files/meeting-files.plan.md:11` (quoted under FT-007).

## 5. Git history

`git log --format='%h %ad %s' --date=short -- apps/api/src/meeting-files` (all commits):

- `9fc454e 2026-10-09 fix: issue prefixed ids at runtime and guard the seed against production`
  (touches `meeting-files.service.ts`, 3 insertions / 3 deletions)
- `18b27f6 2026-10-07 feat: store meetings in PostgreSQL via Prisma and add file attachments`

`git log --grep 'meeting-files'` on subjects: no commit.

`apps/api/eslint.config.mjs` (file exists): `fe07cfe 2026-09-07 chore: baseline монорепозитория (web + api + e2e-каркас)` — the only commit.

`apps/api/tsconfig*.json`:

- `18b27f6 2026-10-07 feat: store meetings in PostgreSQL via Prisma and add file attachments`
- `fe07cfe 2026-09-07 chore: baseline монорепозитория (web + api + e2e-каркас)`

`e2e/architecture/`:

- `d5334d3 2026-10-01 chore: keyed corpus facts, their lifecycle, and the fourth tuning round`
- `91d3191 2026-09-29 fix: correct five contradictions CH-019 shipped`
- `7917bd5 2026-09-29 chore: document and measure the development process`
- `48d9256 2026-09-29 feat(api): add participants[] and GET /meetings/:id`
- `7ecfe48 2026-09-28 feat: research, design and plan become three reviewed stages`
- `08148c7 2026-09-25 feat: architecture corpus and an agent team with fixed roles`

`scripts/facts-parse.mjs`: `d5334d3 2026-10-01 chore: keyed corpus facts, their lifecycle, and the fourth tuning round` (only commit).

Neighbouring areas, for orientation of who else touched `apps/api/src/meetings` and `users`:
`9fc454e`, `18b27f6`, `48d9256 2026-09-29 feat(api): add participants[] and GET /meetings/:id`.

Most recent commits on `main` at the time of the sweep (from the session's git status):
`d58ddbf docs: fill in the commit hash for FX-049`, `7aa3872 fix: meet AA contrast for error text and
the button hover`, `f8cd6ab`, `73abca0 fix: reject a bare pending in the ledger commit cell`,
`0272e23`. `docs/plans/clean-architecture-pilot/` is untracked.

## 6. Contradictions between documents (named, not resolved)

1. `docs/adr/ADR-0029-file-bytes-in-the-database.md:25-26` (`FACT-3618`) and `:51-52`, `:67-68`
   cite `multer@2.4.0` as installed; `FX-043` (`docs/CHANGELOG.md:122`) and
   `pnpm-workspace.yaml:59` pin `multer` to exactly `2.3.0`. ADR-0029 is dated 2026-10-05,
   `FX-043` 2026-10-06.
2. `docs/adr/ADR-0027-postgres-prisma-store.md:113-115` (`FACT-3594`): "`BL-004` stays open";
   `docs/BACKLOG.md` BL-004 row: "Closed by `CH-031` — rejected".
3. Requirement versus corpus (not between two documents): the requirement names a Prisma repository
   adapter; `FACT-3589`, `FACT-0059` and `design.md:604` of the prior change record a repository
   layer as refused. Reported in "Rejected" above; no view taken.

## Not found

- **Not found:** Clean Architecture, hexagonal, ports-and-adapters, use case, rich domain model,
  anemic model, value object, domain error, injection token, dependency inversion, DDD — searched
  `docs/CHANGELOG.md`, `docs/BACKLOG.md`, `docs/architecture.md`, `docs/adr/ADR-*.md` and
  `docs/adr/README.md` (case-insensitive regex over "hexagon|clean architecture|use case|use-case|
  value object|domain error|injection token|dependency inversion|rich domain|anemic|
  no-restricted-imports|boundaries"); only two irrelevant hits (`ADR-0014:39` "two boundaries",
  `docs/adr/README.md:6` "Module boundaries").
- **Not found:** a ledger, backlog or ADR entry about an ESLint import boundary or
  `no-restricted-imports` in `apps/api` — same files; `BL-047` is the nearest (lint bans, invariant
  3 `useGlobalPipes` in `apps/api`).
- **Not found:** any ADR or ledger entry on `useFactory`/factory providers or DI tokens — searched
  the same files for "useFactory", "factory provider", "InjectionToken", "dependency injection".
- **Not found:** a "domain" layer or directory in any ADR, `docs/architecture.md` or the ledger —
  searched "domain" in `docs/BACKLOG.md`, ADR-0006/0010/0018/0021/0022/0027/0028/0029/0031 and
  `docs/architecture.md` (hits for "entity" only, as in "mapper: entity → DTO").
- **Not found:** an existing guard for `BL-046`'s class (a directory outside every `tsconfig`
  `include`) — `BL-046` states "`FX-045` has no guard today".
- **Not found:** a test or case that fakes a Prisma client — `probes.md:709-711` and
  `research/README.md:193-197` of the prior change state no such pattern existed then; not re-searched
  in code by this sweep.
- **Not found:** any commit on `apps/api/eslint.config.mjs` after the baseline `fe07cfe`.
- **Not found:** a commit whose subject contains "meeting-files"; the two commits touching
  `apps/api/src/meeting-files` are `18b27f6` and `9fc454e`.
- **Not found:** the answer to whether the 18 retired/relocated/withdrawn units in `FT-007` are the
  full set of service-layer units now; only `meeting-files.plan.md:11` and `FT-007` Checks state it.
- **Not found:** whether ADR-0014, ADR-0015, ADR-0016 or ADR-0032 constrain this area — their bodies
  were not read for this sweep.
