# History sweep — `meeting-files`

**Requirement, in two sentences (as given):** Add meeting file attachments (upload + list on a
meeting), and at the same time move the whole domain's persistence from the in-memory seeds to a
real PostgreSQL database via Prisma, run through docker-compose. File bytes live in the database as
a `bytea`/Prisma `Bytes` column; both the Nest API and `apps/web` are in scope. Four scoping
decisions (users + meetings both move; Postgres via docker-compose; bytes in the DB; both API and
web in scope) are given as already made and are not re-litigated here.

This is retrieval only. Nothing below is a recommendation or a judgement about whether the
requirement should proceed — only what the project's written record already says.

## Scope of this sweep

Documents read in full: `docs/CHANGELOG.md` (169 lines, both tables plus the "found during
implementation" table), `docs/BACKLOG.md` (full, including Closed and Rejected), `docs/adr/README.md`
(the log/index), `docs/adr/ADR-0017-meeting-participants-strings.md` (full), `docs/adr/ADR-0007-in-memory-store.md`
(full), `docs/security.md` (full), `docs/process.md` (full), `docs/profiling/README.md` (full), and
both profiling run records in `docs/profiling/runs/`. That is **10 documents**.

Git searches run: **21** — 1 path-scoped log (`meetings/`, `users/`, `auth/`), 14 `-i --grep` passes
in English (`prisma`, `postgres`, `database`, `docker`, `compose`, `orm`, `persist`, `storage`,
`upload`, `file`, `multipart`, `seed`, `env`, `deps`, `revert`), 3 in Russian (`база`, `файл`,
`загруз`), and 2 `--diff-filter=D` passes (one scoped to `*docker*`/`*compose*`/`*prisma*`/`*.sql`
paths, one unscoped across the whole history).

---

## 1. Changelog — features, process changes, defects touching this area

### Features (`FT-`)

- **`FT-003`** (2026-09-28, `48d9256`) — `GET /meetings/:id` plus `participants: string[]` on
  `MeetingDto`. Decisions taken: `ADR-0017`, `ADR-0018`, `ADR-0019`. Directly on the meetings
  domain, and `ADR-0017` (below) is the record that governs `participants` as free-form strings
  rather than a relation — load-bearing for this requirement because a relational `User` table puts
  that choice under new pressure.
- **`FT-002`** (2026-09-07, `4bedc02`) — Home dashboard: meeting list, counter, creation. The
  changelog's own gloss: "In-memory meetings with a seed of 4 users. `total` comes from
  `countByOwner`, not from the length of `items`." This is the in-memory/seed shape the requirement
  proposes to replace.
- **`FT-001`** (2026-09-07, `7c4fc5b`) — Login page and `POST /auth/login` contract. Established
  `scrypt` password hashing with a per-user salt, the BFF session cookie shape — both touch the
  users/auth domain this requirement also migrates.
- `FT-004`, `FT-005`, `FT-006` concern `apps/web` styling (HeroUI adoption, UI rework, design
  language). None touches persistence, the seed, storage, or file handling. Listed for completeness
  only; not otherwise relevant here.

### Process/infrastructure (`CH-`)

None of `CH-001`…`CH-030` adds a dependency, a service, a database, Docker, or file handling.
`CH-030` and `BL-033`/`BL-032` concern a dependency-advisory exception (`braces`) and dead CSS
classes — unrelated to this sweep's subject beyond general "new dependency" scanning, which they
are not. **Not found:** any `CH-` entry about adding a database, an ORM, Docker/docker-compose, or
a storage layer — searched the full Process and infrastructure table.

### Defects (`FX-`), with "Found by"

No `FX-` entry concerns persistence, the seed, file handling, or Docker. The closest in subject
matter:

- **`FX-029`** (2026-09-16, `7126d8a`) — `pnpm audit` red: `multer@2.2.0` with two high advisories
  pulled transitively from `@nestjs/platform-express@12.0.1`. Found by: `pnpm audit` inside
  `pnpm verify`. **Multer is already a transitive dependency of this API** (via
  `@nestjs/platform-express`) — relevant background if file upload work in this change would use
  Nest's `multer`-backed `FileInterceptor`, though nothing in the ledger says this directly; noting
  the fact only.
- **`FX-036`**, **`FX-037`** — later dependency-advisory defects (`brace-expansion`, `next`'s `og`
  RCE), both found by `pnpm audit` inside `pnpm verify`. General evidence that `pnpm audit` is the
  mechanism that catches new-dependency CVEs — relevant once Prisma and any Postgres driver land as
  new dependencies.
- **`FX-032`**/**`FX-031`** (2026-09-28, `48d9256`) — both found by the research sweep of
  `meetings-detail-participants`, both about documentation drift (a dead endpoints table; dead case
  IDs), not persistence.

**Not found:** an `FX-` entry whose defect is in persistence, the in-memory store, the seed, or file
handling. **Not found:** an `FX-` entry mentioning Prisma, Postgres, Docker or an upload.

---

## 2. Backlog — leads to verify and expand, plus Rejected

### `BL-004`, verbatim

From the Open table (row for `BL-004`):

> `BL-004` | P2 | security | Seed → migration with pre-computed hashes instead of plaintext in
> `users.seed.ts` | **Depends on:** a database | **Conflicts with:** **yes:** `e2e/fixtures/seed.ts`
> mirrors the seed; change both or `SM-API-02` goes red

So `BL-004` is explicitly blocked on "a database" (Depends on column) and explicitly conflicts with
`e2e/fixtures/seed.ts`, the test-suite's seed mirror, via `SM-API-02`. This requirement supplies the
database `BL-004` was waiting on; the stated conflict (the fixture mirror and `SM-API-02`) is a
concrete thing this change will touch.

`BL-004` also appears, same wording in substance, inside `ADR-0007`'s Consequences:

> `FACT-3133` Replacing the seed with a migration is `BL-004`, marked as conflicting with
> `e2e/fixtures/seed.ts`. — `docs/BACKLOG.md`, `BL-004`

### The "deliberate concession" line, verbatim

Location: `docs/BACKLOG.md`, directly under the Closed table, before the Rejected section:

> `BL-001` is the only item I consider a production blocker. Everything else under security is a
> deliberate concession of a demo without a database, listed in [security.md](security.md).

What `docs/security.md` actually says (the specific line on the seed, under "Deliberate gaps"):

> - **Seed passwords are plaintext** in `users.seed.ts` and hashed at startup. The store itself holds
>   no plaintext. In a real project the seed file would be a migration with ready hashes.

This sentence carries no `FACT-` key — it sits in `docs/security.md`'s prose "Deliberate gaps"
list, which is not part of the four-document keyed corpus (`docs/architecture.md`,
`docs/adr/`, `docs/data-model.md`, `docs/api-contract.md`); `docs/security.md` is a fifth,
unkeyed document. **No `FACT-` key attaches to the plaintext-seed statement or to the "demo without
a database" framing** — both are prose, not keyed fact, by the corpus's own rule (`ADR-0021`).

### Other backlog items bearing on persistence, storage, files, uploads, meetings detail, dependencies

- **`BL-024`** (P2, api, Open) — "Two identifier formats coexist: `docs/data-model.md:54` mandates
  opaque strings with a type prefix (`usr-`, `mtg-`), never guessable by increment;
  `meetings.service.ts` issues a bare `randomUUID()` at runtime, so the store holds both shapes and
  no seed id is a UUID." **Conflicts with:** "yes: `HD-UT-07` asserts the UUID shape and would need
  rewriting; `data-model.md:31`'s `id` row was deliberately left verbatim by
  `meetings-detail-participants` pending this decision." Directly bears on the identifier scheme a
  Prisma schema would need to settle (prefixed opaque strings vs. UUID).
- **`BL-018`** (P3, process, Open) — "Drop the `multer` override from `pnpm-workspace.yaml` once
  `@nestjs/platform-express` raises its range." **Depends on:** a Nest release. Confirms `multer` is
  currently pinned via an override in `pnpm-workspace.yaml` (closing `FX-029`'s CVE), relevant if
  file upload uses Nest's multer integration.
- **`BL-007`** (P2, feature, Open) — "Editing and deleting a meeting." **Conflicts with:** "yes:
  `PROTECTED_ROUTES` will need extending; inherits `ADR-0018` for its own 404 branches... the
  `apps/api/README.md` endpoint list it used to also touch is gone (`ADR-0019`)." Adjacent
  meetings-domain backlog item, not persistence-specific, but shares the meetings surface this
  change touches.
- **`BL-008`** (P2, feature, Open) — "Real sign-up: an `/auth/register` page plus
  `POST /auth/register`." Touches the users/auth domain this requirement also migrates to Prisma.
- No backlog item mentions file attachments, uploads, `bytea`/`Bytes` columns, Prisma, or
  docker-compose anywhere in the Open, Closed, or Rejected sections.

**Not found:** a backlog item proposing meeting file attachments. **Not found:** a backlog item
proposing Prisma, Postgres, or docker-compose by name.

### Rejected section — full, with reasons

Quoted verbatim (table order as in the document):

1. "Unit coverage for `lib/dal.ts`, `proxy.ts`, `lib/actions/*`" — "The modules are `server-only` or
   Server Actions — Vitest cannot resolve them in principle. `SEC-FN-04`, `SEC-FN-05`, `HD-FN-01`,
   `HD-FN-08` go through them. Extracting logic for a metric would make the code worse."
2. "React component tests in jsdom" — "The UI is covered by functional Playwright tests in a real
   browser; jsdom would give a second, less trustworthy copy of the same checks."
3. "Deleting `docs/plans/plan-review-*.md` (1416 lines)" — "They record **why** decisions came out
   this way... Marked as archive — that is enough."
4. "Pluralizing the meeting counter" — locator-format reason, unrelated here.
5. "Mutation testing" — cost/role-overlap reason, unrelated here.
6. "A global `fullyParallel: false` to remove races" — unrelated here.
7. **"A state reset endpoint for tests"** — "A test back door in a production API. Isolation is
   achieved through data: dedicated owners for mutations." This is the same rejection `ADR-0007`
   cites (`FACT-3128`) against a reset endpoint — directly relevant: a migration to Postgres raises
   the same reset-for-tests question, and the project's answer so far has been "no, use data, not a
   reset mechanism."
8. "`pnpm audit --audit-level=low` in `verify`" — threshold reasoning, unrelated here.
9. "Removing one or more of the four `FEAT` review gates (`P2`, 2a-2d)" — pipeline-tuning item,
   unrelated here.
10. "Dropping `FEAT-S6` acceptance below a named size (`P4`)" — pipeline-tuning item, unrelated.
11. "Changing a role's model (`P5`)" — pipeline-tuning item, unrelated.
12. "`TUNE-S3` writing a profiling record for the tuning round (`P8`)" — pipeline-tuning item,
    unrelated.

**No rejection in this section names a database, an ORM, Docker, docker-compose, or file storage
directly.** The closest in spirit is the reset-endpoint rejection (#7 above) and `ADR-0007`'s own
Rejected sub-list (next section) — which _does_ reject a database outright, as the then-current
decision.

---

## 3. ADRs

Full index from `docs/adr/README.md`, 26 records, all `accepted`, none `superseded` or `rejected`
at the status level (the table shows no `superseded`/`rejected` status in the current log):

| ID       | Title                                                                          |
| -------- | ------------------------------------------------------------------------------ |
| ADR-0001 | A pnpm monorepo with two applications and shared config packages               |
| ADR-0002 | The browser talks only to Next: a BFF in front of Nest                         |
| ADR-0003 | The session is the API's own JWT in an httpOnly cookie                         |
| ADR-0004 | The session is checked three times, not once                                   |
| ADR-0005 | No CORS and no global prefix on the API                                        |
| ADR-0006 | Nest layering: controller, service, mapper, and validation as a provider       |
| ADR-0007 | An in-memory store with a code seed instead of a database                      |
| ADR-0008 | Playwright at the root, on dedicated ports, owns the contract                  |
| ADR-0009 | Our own guard and `node:crypto` instead of passport and bcrypt                 |
| ADR-0010 | Conventions are executable: meta-tests instead of a style guide                |
| ADR-0011 | A ledger, and an orientation gate before any planning                          |
| ADR-0012 | Parallel agents are isolated by git worktree, never by port                    |
| ADR-0013 | The project is English-only                                                    |
| ADR-0014 | Roles are fixed agent definitions with their own tools and model               |
| ADR-0015 | The architecture corpus is the mandatory planning context                      |
| ADR-0016 | Discovery runs as three reviewed stages in a folder per change                 |
| ADR-0017 | Participants are free-form strings on the meeting, not a relation              |
| ADR-0018 | A record the caller does not own answers 404, never 403                        |
| ADR-0019 | The route listing lives in the API contract alone; other documents link        |
| ADR-0020 | Stage inventory and profiling                                                  |
| ADR-0021 | Every fact in the corpus carries a key; inference is marked                    |
| ADR-0022 | A fact is appended and retired, never deleted or rewritten in place            |
| ADR-0023 | HeroUI v3 replaces CSS Modules in `apps/web`                                   |
| ADR-0024 | An external skill set is wired in through an adapter and pinned by a lock file |
| ADR-0025 | Accessibility is checked by a scanner in the suite, not by reading a guideline |
| ADR-0026 | One design language for `apps/web`, declared as tokens                         |

No ADR's Status column reads `superseded` or `rejected` — all 26 are `accepted`. **No ADR has been
superseded.**

### Bearing on data, persistence, storage, the seed, dependencies, configuration, the contract, test infrastructure

- **`ADR-0007` — An in-memory store with a code seed instead of a database.** Directly the ADR this
  requirement's "move to Postgres" puts under pressure. Full text summarised below (section
  "ADR-0007, the one this change reverses").
- **`ADR-0017` — Participants are free-form strings, not a relation.** Full text below, as
  instructed — this is the one ADR a relational database puts pressure on; no resolution is stated
  here, only the pressure.
- **`ADR-0019` — The route listing lives in the API contract alone.** Process/contract-shape
  decision; relevant if new routes (upload, list-files) are added — the contract table is the single
  source, not a second README copy.
- **`ADR-0021`, `ADR-0022`** — the corpus fact-keying and lifecycle rules. Any data-model change this
  requirement makes must retire/append `FACT-` keys in `docs/data-model.md` rather than edit them in
  place, per these two.
- **`ADR-0024`** — external skill adapters (Prisma is not a skill, but if a "prisma" or "nestjs
  prisma" external skill were ever wired in, this is the rule it would go through).

Not bearing on this sweep: ADR-0001–0006, 0008–0016, 0018, 0020, 0023, 0025, 0026 — module layout,
session/BFF/auth design, process/pipeline, UI styling. Listed in the index above for completeness,
not summarised further.

### `ADR-0017`, in full (as required)

**Context** (facts, each keyed, each cited):

- `FACT-3330` A target API sketch adds `participants[]` to the meeting — from this change's own
  prior research.
- `FACT-3331` No `participants` field existed anywhere in the codebase before.
- `FACT-3332` No array-valued field existed on any entity or DTO before this — "this would be the
  first."
- `FACT-3333` No ADR addressed array fields or participant modelling before this one.
- `FACT-3334` `docs/data-model.md` documented exactly two entities, `User` and `Meeting`, and **no
  join or relation type**.
- `FACT-3335` "The requester settled the semantics before this record was written: an element is a
  free-form string — a name or an email — with no relation to the `User` entity."
- `FACT-3336`–`FACT-3342` — validation-probe facts pinning `@IsOptional()`/`@IsArray()` behaviour
  under this repository's exact installed `class-validator`/`ValidationPipe` versions.

**Decision:**

- `FACT-3343` "This record fixes that participants are strings on the meeting rather than a
  relation, that the field is optional on input, that its contents are stored verbatim, and that it
  is bounded."
- `FACT-3345` "`participants` is a field of the `Meeting` entity: `participants: string[]`, always
  present internally, never `undefined` and never `null`."
- `FACT-3346` "There is no participant entity, no join type and no reference to `User.id`."
- Rejected explicitly in this same ADR (`FACT-3353`): "A relation to `User` (participants as
  `usr-` ids, or a join entity) — **the requester ruled it out, and it would put an entity into
  `docs/data-model.md` that nothing in a seeded in-memory store can enforce referential integrity
  for.**" Cites this record and `ADR-0007` together.

**Consequences** (selected, bearing on this sweep):

- `FACT-3359` "Three mirrors of the shape move in the same change or drift: the seed
  (`apps/api/src/meetings/meetings.seed.ts`), its test mirror `e2e/fixtures/seed.ts`, and
  `apps/web/src/lib/types.ts`."
- `FACT-3360` The store hands out shallow copies and every exit path must clone `participants` — an
  in-memory-store-specific consequence that would not exist in the same form under Prisma.
- Closing rationale (unkeyed, reasoning block): "A later change wanting 50 participants edits the
  contract and the data model and cites this record; one wanting participants to _be_ users
  **supersedes it**."

**The pressure, named and not resolved:** `ADR-0017`'s own stated rejection reason for a relational
`participants` — "it would put an entity into `docs/data-model.md` that nothing in a seeded
in-memory store can enforce referential integrity for" — is exactly the condition this requirement
removes: a real Postgres database, via Prisma, _can_ enforce referential integrity. The ADR itself
says a change "wanting participants to be users supersedes it." Nothing in this sweep's documents
states whether that supersession is in scope for `meeting-files`; the four scoping decisions given
to this sweep do not mention `participants` at all. This is reported as a tension found in the
record, not a decision to be made here.

### `ADR-0007`, in full (as background to the same pressure)

**Context:**

- `FACT-3120` "The subject of this project is the contract, the suite and the development process."
- Rationale block (unkeyed): "A database would add a container, migrations, a connection lifecycle
  and a reset story for tests, none of which teaches anything the project is about — while costing
  every contributor a working Docker."

**Decision:**

- `FACT-3121` "Services own plain arrays, seeded at module init from `*.seed.ts`."
- `FACT-3122` Passwords sit in `users.seed.ts` as plaintext, hashed with `scrypt` at startup.
- `FACT-3123` The suite gets a mirror seed at `e2e/fixtures/seed.ts`.
- `FACT-3124` "Drift between the seed and its mirror fails `SM-API-02` / `SM-API-03`."
- `FACT-3125`, `FACT-3126` — test-isolation-by-data scheme: read-only users (`teacher`, `student`)
  carry absolute assertions; `planner`/`organizer` are mutation sandboxes, because Playwright runs
  the `api` and `web` projects in parallel **against one store**.
- Rejected in this ADR: `FACT-3127` "A database — see Context"; `FACT-3128` "A test-only reset
  endpoint — a back door in a production API"; `FACT-3129` "One shared user for everything —
  parallel projects would race."

**Consequences:**

- `FACT-3130` `nest start --watch` restarts on every edit and wipes anything a test created — no
  test may depend on data created by another.
- `FACT-3131` Mutating cases use relative counters, never absolute ones.
- `FACT-3132` Created meetings are dated 2030 (for predictable sort order against the seed).
- `FACT-3133` "Replacing the seed with a migration is `BL-004`, marked as conflicting with
  `e2e/fixtures/seed.ts`."

This is the ADR this requirement's "move to PostgreSQL via Prisma" directly reverses. It is
`accepted`, not `superseded`, as of this sweep. Per the ADR rules in `docs/adr/README.md`: "An
accepted ADR is not edited in substance... A decision that changes gets a **new** ADR whose
`Supersedes` names the old one." **Not found:** any ADR, proposed or accepted, superseding
`ADR-0007`.

---

## 4. Git history

### Path-scoped history: `apps/api/src/meetings/ apps/api/src/users/ apps/api/src/auth/`

```
48d9256 feat(api): add participants[] and GET /meetings/:id
39e9e0c chore: whole project migrated to English and comments condensed
daf86b2 feat(security): security-проверки в пайплайне + три найденных дефекта
4bedc02 feat(meetings): главная страница со списком встреч и контракт /meetings
7c4fc5b feat(auth): страница логина /auth/login и контракт POST /auth/login
```

Five commits total touch these three directories across the project's whole history: the domain's
code was built in `7c4fc5b` (auth), `4bedc02` (meetings), touched for security hardening in
`daf86b2`, translated to English in `39e9e0c`, and extended with `participants`/`GET /:id` in
`48d9256`. No commit in this list concerns persistence technology.

### Term searches (`git log --oneline --all -i --grep`)

Hits:

- **`compose`** → `38d86d4` "feat(web): replace CSS Modules with HeroUI v3 on Tailwind v4" — matched
  because the commit body discusses React's `compose`/HeroUI's `Form` "does not compose with
  `action={formAction}`." Not about docker-compose; confirmed by reading the full commit message.
- **`file`** (word-bounded) → `5624a7a`, `48d9256`, `7ecfe48`, `08148c7`, `9c526a9` — all generic uses
  of "file" (a config file, a document file, a shallow-clone fix); none concerns file _upload_ or
  attachment handling.
- **`seed`** → `7917bd5`, `48d9256`, `39e9e0c`, `b46addb` — all about the existing in-memory seed
  (process documentation, participants feature, English migration, changelog/backlog creation); none
  introduces a migration-based seed.
- **`env`** → `60bd98c` (CI job setup) — generic match, not an env-var/config feature.
- **`deps`** → `6d6377c` (braces advisory acceptance), `60bd98c` (CI) — dependency-advisory handling,
  not a new persistence dependency.
- **`revert`** → `71960db`, `b044922`, `7ecfe48`, `08148c7` — all process/pipeline commits using the
  word "revert" in the sense of a control-experiment revert-and-recheck, not a dependency revert.
- **`storage`** → `e622344` — matched Playwright's `storageState` session-persistence mechanism in a
  pipeline-audit fix commit; unrelated to file/data storage.

Empty (**Not found**, searched `git log --oneline --all -i --grep '<term>'`):

- **`prisma`** — not found anywhere in commit history.
- **`postgres`** — not found anywhere in commit history.
- **`database`** — not found anywhere in commit history.
- **`docker`** — not found anywhere in commit history.
- **`orm`** — not found anywhere in commit history.
- **`persist`** — not found anywhere in commit history.
- **`upload`** — not found anywhere in commit history.
- **`multipart`** — not found anywhere in commit history.

### Russian-language searches (pre-`CH-014` commits are in Russian)

- **`база`** (database/base) — **Not found** — searched `git log --oneline --all -i --grep 'база'`.
- **`файл`** (file) — hits: `ce9f08f`, `9c526a9`, `60bd98c`, `825a498`, `daf86b2`, `9d4b752`,
  `7813fc3`, `892ee9c`, `36e83b4`. All generic uses of "файл" (a config file, a ledger file, a
  `.gitattributes` file). None concerns file upload or attachment storage; read each subject line to
  confirm.
- **`загруз`** (upload/load) — **Not found** — searched `git log --oneline --all -i --grep 'загруз'`.

### Deleted files

```
git log --diff-filter=D --oneline -- '*docker*' '*compose*' '*prisma*' '*.sql'
```

**Not found** — no output. Nothing matching those path patterns was ever added and then deleted.

```
git log --diff-filter=D --oneline   # unscoped, whole repo
```

Three commits show deletions somewhere in their diff: `38d86d4` (CSS Modules files deleted, per
`FT-004`'s own changelog line: "all five `*.module.css` deleted"), `7ecfe48` (discovery-stage
restructuring), `36e83b4` (early e2e scaffold). None is database- or Docker-related; all three are
accounted for by features already in the changelog (`FT-004`, `CH-017`, `CH-002`).

### Dependency add-then-revert

No commit subject combines `deps` and `revert`, and the `deps`/`revert` searches above returned
disjoint, unrelated commit sets. **Not found:** evidence that any dependency was ever added and then
backed out.

---

## 5. Profiling — cost of past cycles

Two records exist: `docs/profiling/runs/2026-09-28-meetings-detail-participants.md` (`FT-003`) and
`docs/profiling/runs/2026-10-03-design-language-rollout.md` (`FT-006`).

- **`FT-003` record:** 3,478,421 total tokens, 190 min agent-time, 21 distinct agents, 29
  dispatches. Discovery (`FEAT-S1`-`FEAT-G3`) was 42.3% (1,472,438 tokens), implementation onward
  57.7% (2,005,983 tokens) — "the implementation half cost more than discovery, not less." Product
  code was 83,098 tokens, 2.4% of the run. Rework share was **29.3%** (1,018,067 tokens) across four
  gates, every one of which returned `accept after blockers` ("not one passed clean"). The single
  largest stage line was `FEAT-S5` (tests per level) at 1,146,931 tokens / 66.1 minutes — "larger
  than the entire discovery half" — which included 24 minutes attributed to fixing `FX-033`, a race
  this same change introduced into the existing suite by becoming a second spec file mutating a
  shared sandbox user.
- **`FT-006` record:** 1,584,001 tokens measured (explicitly a floor — a session interruption lost
  the `FEAT-S1`/`FEAT-G1`/first-`FEAT-S2`-pass hand-backs), 115.7 min measured agent-time, rework
  share **31.8%** (503,865 tokens) across three gates, again all `accept after blockers`.

**Neither record mentions a new dependency or a new service making a stage expensive.** The closest
statement in either record is `FT-003`'s observation that the _tests_ stage (not a dependency or
infra stage) was the most expensive line, and `FT-006`'s note that a format-check failure on
uninstalled research files cost "a full extra `pnpm verify` run." **Not found:** any profiling record
discussing the cost of adding a dependency, a database, an ORM, or a container service — because
neither of the two cycles on record added one.

`docs/profiling/README.md` states the frozen discovery/implementation boundary by stage ID, the
rework-share definition ("tokens spent redoing a stage after its gate rejected it... whether the
gates are placed right"), gate yield, and "what found each defect" as the four numbers every record
must report — procedural context for whatever record this change eventually produces, not a finding
about this requirement specifically.

---

## 6. Process — stage IDs

From `docs/process.md`, full inventory:

**`FEAT` (new functionality)** — `FEAT-S1` Research, `FEAT-G1` Research review (gate), `FEAT-S2`
Design, `FEAT-G2` Design review (gate), `FEAT-S3` Plan, `FEAT-G3` Plan review (gate), `FEAT-S9` Test
design, `FEAT-S10` Red tests (unit, API), `FEAT-S4` Implementation, `FEAT-S11` Integration and
end-to-end tests, `FEAT-S5` — **retired**, "folded into `FEAT-S10` and `FEAT-S11` above" — kept
because the first profiling record cites it and `AR-API-10` fails a record naming an undefined
stage, `FEAT-G4` Code review (gate), `FEAT-S6` Acceptance, `FEAT-S7` Ledger, `FEAT-S8` Profiling
record.

**`FIX` (a defect)** — `FIX-S1` Orientation, `FIX-S2` Reproduction, `FIX-S3` Cause, `FIX-S4` Impact,
`FIX-S8` Research, `FIX-S9` Design, `FIX-S10` Plan, `FIX-S5` Red test, `FIX-S6` Fix, `FIX-S7`
Acceptance + entry, `FIX-S11` Profiling record (above-threshold only).

**`TUNE` (pipeline change)** — `TUNE-S1` Pipeline review, `TUNE-S2` Tuning plan, `TUNE-G1` Owner's
approval (human gate), `TUNE-S3` Implementation.

Retired ID: `FEAT-S5` only, kept per `ADR-0020`'s no-renumber/no-reuse rule, "because the first
profiling record cites it."

---

## Open questions

- Whether `participants` moving to a real relation (`User` ids) is in scope for `meeting-files`, or
  whether it stays free-form strings under `ADR-0017` even on Postgres — the four given scoping
  decisions name users, meetings, Postgres, bytes-in-DB and both-halves-in-scope, but say nothing
  about `participants`' shape. `ADR-0017` itself names the condition under which it would need
  superseding; this sweep cannot determine from the record whether that condition now holds.
- Whether `BL-004` (seed → migration with pre-computed hashes) is folded into this change or
  remains separate, given its "Depends on: a database" is now satisfied and its stated conflict
  (`e2e/fixtures/seed.ts`, `SM-API-02`) is squarely inside this change's blast radius.
- Whether `BL-024` (the `usr-`/`mtg-` opaque-id-prefix convention vs. the meetings service's bare
  `randomUUID()`) is resolved by a Prisma schema's own id strategy, left as is, or is itself now a
  precondition — the item is marked as pending exactly this kind of decision ("`data-model.md:31`'s
  `id` row was deliberately left verbatim... pending this decision").
- Whether the Rejected section's reasoning against "a state reset endpoint for tests" and `ADR-0007`'s
  rejection of "one shared user for everything" (parallel-project races) still hold once the store is
  a real database rather than a process-local array — the record states the reasons that applied to
  the in-memory store; this sweep does not evaluate whether they transfer.

## Not found

- **Not found:** any `FT-`, `CH-`, or `FX-` ledger entry mentioning Prisma, Postgres, Docker,
  docker-compose, an ORM, file upload, multipart, or a `bytea`/`Bytes` column — searched the full
  `docs/CHANGELOG.md`.
- **Not found:** any backlog item (Open, Closed, or Rejected) proposing meeting file attachments,
  Prisma, Postgres, or docker-compose by name — searched the full `docs/BACKLOG.md`.
- **Not found:** any ADR, proposed, accepted or rejected, superseding `ADR-0007` (the in-memory-store
  decision) — searched `docs/adr/README.md`'s full index (26 records, all status `accepted`).
- **Not found:** `git log --oneline --all -i --grep` hits for `prisma`, `postgres`, `database`,
  `docker`, `orm`, `persist`, `upload`, `multipart`, `база`, `загруз` — all nine searches returned no
  commits.
- **Not found:** any commit deleting a path matching `*docker*`, `*compose*`, `*prisma*`, or `*.sql`
  — searched `git log --diff-filter=D --oneline` scoped to those patterns.
- **Not found:** any commit subject indicating a dependency was added and later reverted — searched
  `deps` and `revert` term hits for overlap; none.
- **Not found:** any profiling record discussing the cost of adding a dependency, a database, or a
  container service — searched both records in `docs/profiling/runs/` in full; neither cycle added
  one.
