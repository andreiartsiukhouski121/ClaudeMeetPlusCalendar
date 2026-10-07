# Research: meeting-files

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

Meeting file attachments, with persistence moved to a real database.

Four scoping decisions arrived **already made by the owner**. They were not re-litigated by any
sweep; what the sweeps researched is what they imply.

1. **The whole domain moves to Prisma** — `users` and `meetings`, not just the new entity. Both live
   in memory today (`apps/api/src/users/users.seed.ts`, `apps/api/src/meetings/meetings.seed.ts`).
2. **PostgreSQL, run via docker-compose.** The repository has no docker-compose, no `.env` and no
   database of any kind today.
3. **File bytes live in the database** — a `bytea`/Prisma `Bytes` column — not on disk and not in S3.
   Metadata in the same row.
4. **Both halves are in scope** — the Nest API (POST/GET endpoints with validation) and `apps/web`
   (an upload form and a file list on the meeting page).

## Questions asked of the project

The record of what was looked for — including what came back empty. A question with no answer is
kept, not deleted.

| #   | Question                                                                                                                   | Area              | Answered in                          | Outcome                                                                                                               |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| 1   | How is data held, created, read, sorted and counted today, end to end?                                                     | code              | `code.md`                            | Answered — `Map<string, T>` seeded in each service constructor                                                        |
| 2   | Where exactly does auth reach a user record?                                                                               | code              | `code.md`                            | Answered — two call sites only                                                                                        |
| 3   | Where do invariants 3, 4 and 5 live in the code?                                                                           | code              | `code.md`                            | Answered — `app.module.ts`, `meetings.service.ts`, `meetings.controller.ts`                                           |
| 4   | How does `apps/web` fetch meetings, and is there a meeting detail page?                                                    | code              | `code.md`                            | Answered — **no detail page exists at all**                                                                           |
| 5   | Does anything in the repo already touch multipart, streams, Buffers or file I/O?                                           | code              | `code.md`                            | **Empty** — no upload/binary surface in product code                                                                  |
| 6   | Is there any database, ORM, env or Docker scaffolding already?                                                             | code              | `code.md`                            | **Empty** — none, and `.env`/`@nestjs/config` are documented as deliberately absent                                   |
| 7   | Does `@prisma/client` generate and import cleanly under `apps/api`'s ESM + NodeNext?                                       | probe             | `code.md` "Probe facts", `probes.md` | Answered — one generator works, the other does not                                                                    |
| 8   | Does `FileInterceptor`/multer work on Nest 12 + Express 5, and at which version?                                           | probe             | `code.md` "Probe facts", `probes.md` | Answered — works; multer 2.4.0 is already installed here                                                              |
| 9   | What does `ValidationPipe` do with a multipart body, and what is the exact 400?                                            | probe             | `code.md` "Probe facts", `probes.md` | Answered — a numeric field fails under the repo's current options                                                     |
| 10  | What is Next 16's Server Action body limit here, and the failure surface?                                                  | probe             | `code.md` "Probe facts", `probes.md` | Partly — the default and the server-side throw; the client surface is **unknown**                                     |
| 11  | Does a Prisma `Bytes` value round-trip, and what is its TypeScript type?                                                   | probe             | `code.md` "Probe facts", `probes.md` | Answered — byte-identical; type is `Uint8Array`, not `Buffer`                                                         |
| 12  | What does `playwright.config.ts` support for a dependency that must precede the servers?                                   | probe             | `code.md` "Probe facts", `probes.md` | Answered — two entries today; the mechanism allows N, started sequentially                                            |
| 13  | What does a Prisma-backed service do under Vitest with no database?                                                        | probe             | `code.md` "Probe facts", `probes.md` | Answered — constructs fine, query rejects with `P1001`                                                                |
| 14  | Is Docker actually runnable on this machine?                                                                               | probe             | `probes.md` probe 0                  | **Answered: no.** Not installed on the host or in WSL                                                                 |
| 15  | What does `docs/api-contract.md` promise for `/meetings` and `/auth`?                                                      | contract          | `contract.md`                        | Answered — six routes, enumerated by `FACT-` key                                                                      |
| 16  | What are the exact error body shapes, by key?                                                                              | contract          | `contract.md`                        | Answered — `FACT-2012`…`FACT-2017`                                                                                    |
| 17  | Which `FACT-` keys stop being true once a database holds the data?                                                         | contract          | `contract.md`                        | Answered — split three ways in §3 (9 falsified, 12 premise-only, 8 design-dependent); completeness stated as unproven |
| 18  | What does `ADR-0022` require to retire a fact, and who may do it?                                                          | contract          | `contract.md`                        | Partly — mechanics answered; **no fact names which role may retire**                                                  |
| 19  | Was a database, an ORM or a repository layer ever named in `docs/architecture.md`?                                         | contract          | `contract.md`                        | Answered — "a database" is **refused** (`FACT-0037`); no ORM or repository pattern named                              |
| 20  | Does the contract document a 413, a 415 or any non-JSON request body?                                                      | contract          | `contract.md`                        | **Empty** — none anywhere                                                                                             |
| 21  | What does `docs/security.md` say about uploads, size limits and content types?                                             | contract          | `contract.md`                        | **Empty** — nothing; and the document carries **zero** `FACT-` keys                                                   |
| 22  | What does `ADR-0017` actually say about `participants` not being a relation?                                               | contract, history | `contract.md`, `history.md`          | Answered — and its stated premise is named as under pressure, not resolved                                            |
| 23  | What covers meetings and auth today, at every level?                                                                       | tests             | `tests.md`                           | Answered — three regression areas plus smoke, security, accessibility                                                 |
| 24  | Which case IDs assert seeded values or counts?                                                                             | tests             | `tests.md`                           | Answered — a ~30-row table                                                                                            |
| 25  | How does `e2e/fixtures/seed.ts` stay in sync with the API seed?                                                            | tests             | `tests.md`                           | Answered — hand-kept mirror; one live check (`SM-API-02`/`SM-API-03`), no static diff                                 |
| 26  | What does `KNOWN_CASE_PREFIXES` hold, and what else must a new feature be added to?                                        | tests             | `tests.md`                           | Answered — nine prefixes, no `MF`-style entry                                                                         |
| 27  | What do the meta-tests require of a new endpoint, ADR and ledger entry?                                                    | tests             | `tests.md`                           | Answered — `AR-API-05/06/09/11-16`, `LG-API-01-06`, `PR-API-01/03/04/06/07`                                           |
| 28  | Is there any test of a file upload, a multipart request or a non-JSON body?                                                | tests             | `tests.md`                           | **Empty** — none anywhere in `e2e/`                                                                                   |
| 29  | What do the ledger, backlog and ADR log say about persistence, seeds and storage?                                          | history           | `history.md`                         | Answered — `ADR-0007`, `BL-004`, `BL-024`                                                                             |
| 30  | Was a database, an ORM, Docker or file storage ever **rejected**, and why?                                                 | history           | `history.md`                         | Answered — rejected in `ADR-0007` (`FACT-3127`); **not** in the backlog's Rejected section                            |
| 31  | Does git history contain any prior attempt at persistence, Docker or uploads?                                              | history           | `history.md`                         | **Empty** — zero hits across 21 searches, in English and Russian                                                      |
| 32  | Do the profiling records say what infrastructure work costs?                                                               | history           | `history.md`                         | **Empty** — no recorded cycle ever added a dependency or a service                                                    |
| 33  | How does CI get a database? (added at `FEAT-G1`)                                                                           | code              | `code.md`                            | **Empty** — both jobs are `ubuntu-latest`, three `verify` steps would need one, no `services:` block exists           |
| 34  | What does `SEC-API-10` assert, and how would `DATABASE_URL` reach the four places that start the API? (added at `FEAT-G1`) | tests, contract   | `tests.md` §1, `contract.md`         | Partly — the rule is recorded (a committed `.env` fails `pnpm verify`); the plumbing is **unanswered**                |
| 35  | How do `pnpm lint` and `pnpm format:check` treat generated code? (added at `FEAT-G1`)                                      | code              | `code.md`                            | Facts recorded (ignore lists, the generator's own headers); only bites if generated output lands in the tree          |

## Sweeps

Which subagent ran, on which model, over what. A thin file from a cheap model is a different fact
from a thin file from an expensive one — the first is fixable by re-running.

| Subagent              | Model                                        | Scope                                                                                                                              | File                                     | Converged after                                                                              |
| --------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------- |
| `researcher-code`     | `sonnet` (default)                           | The in-memory data layer end to end, both apps, module wiring, TS/build config, and every upload-adjacent grep                     | `code.md`                                | 67 files read; repeated greps stopped surfacing new product code on the second pass          |
| `researcher-contract` | `sonnet` (default)                           | `api-contract.md`, `data-model.md`, `architecture.md`, `security.md`, the ADR log, `FACT-` mechanics                               | `contract.md`                            | 12 documents read in full, more grepped                                                      |
| `researcher-tests`    | `sonnet` (default)                           | Every regression/smoke/security/accessibility case, the fixtures, both Vitest configs, `playwright.config.ts`, all four meta-tests | `tests.md`                               | 45 files read directly plus repo-wide greps                                                  |
| `researcher-history`  | **`opus`** (raised from the `haiku` default) | The ledger, the backlog incl. Rejected, the ADR log, git history, the profiling records                                            | `history.md`                             | 10 documents read in full, 21 git searches                                                   |
| probes (`researcher`) | —                                            | **Eight** probes (0-7) per `feature-pipeline` §0, all in the session scratchpad                                                    | `probes.md` + "Probe facts" in `code.md` | Seven settled, one partly (probe 4). Probe 0 was run twice and its answer inverted mid-stage |

**Why `researcher-history` was raised to `opus`:** its brief was not plain retrieval. It had to read
`ADR-0017` in full and report the pressure a relational database puts on it without resolving it,
and to search git history in two languages for absences. Both are judgement-adjacent in a way the
`haiku` default is not sized for, and an absence reported wrongly is indistinguishable from an
absence reported rightly.

**Where the probes live.** Per `research-protocol`, the facts a probe proves belong in `code.md`;
the throwaway code and its raw output belong in the optional, unbudgeted `probes.md`. Both exist.
`code.md`'s "Probe facts" section is marked as added by the `researcher`, not by that sweep's author,
and answers three of the Open questions that sweep had left standing.

## Contradictions found

Where a document and the code, or two documents, disagree. Both sides, with citations —
**named, not resolved.** Resolving one is a decision, and decisions belong to the design stage. If a
document is simply wrong, that is a defect for the lead to route.

### C1 — The corpus states, in four places, that this project has no database; scoping decision 2 gives it one

- `FACT-1025` (`docs/data-model.md:94`): "There is no database. — `ADR-0007`"
- `FACT-0037` (`docs/architecture.md:149`): "A database" is a row in **Patterns deliberately
  refused**, sourced to `ADR-0007`
- `FACT-3127` (`docs/adr/ADR-0007-in-memory-store.md:35`): "A database — see Context." in the
  Rejected list
- `ADR-0007` is **`accepted` and not superseded** by any of the 26 records in the ADR log
  (`history.md`)

Against: the owner's scoping decisions 1 and 2. This is not a documentation error — it is an
in-force decision the requirement reverses.

**Resized at the `FEAT-G1` review.** This entry previously pointed at "the full 25-row table of keys"
in `contract.md` and described all of them as made false. Two things were wrong. The count: the table
held **26 rows covering 29 keys** (one row spans `FACT-1038`…`FACT-1041`). And the classification: at
least eight of those rows state something a change of storage does not falsify. `contract.md` §3 is
now split three ways — **9 keys falsified**, **12 premise-removed but still true as written**, and
**5 rows (8 keys) whose truth depends on a design decision not yet taken** — plus 3 keys added at
review that rest on the same restart premise as `FACT-3130`, and an explicit statement that the table
is **not provably complete** (`contract.md` §3e: the corpus holds 611 keys; a key-by-key pass was not
performed). The three keys above are in the falsified group and C1 stands; what it is _not_ is a
mandate to retire 29 keys.

### C2 — `ADR-0017`'s stated reason for rejecting a `User` relation is a premise this change removes

- `FACT-3353` (`docs/adr/ADR-0017-meeting-participants-strings.md:77`): a relation to `User` was
  rejected because "it would put an entity into `docs/data-model.md` that nothing in a seeded
  in-memory store can enforce referential integrity for. — this record, `ADR-0007`"
- `FACT-3346`: "There is no participant entity, no join type and no reference to `User.id`."
- `apps/api/src/meetings/meeting.types.ts` cites `ADR-0017` as the reason `participants` is
  free-form strings

Against: a PostgreSQL schema can enforce referential integrity with a foreign key — demonstrated in
`probes.md` probe 5e, where `onDelete: Cascade` removed the dependent rows. The scoping decisions say
nothing about `participants`. **Named, not resolved:** whether `ADR-0017` is touched at all is the
design stage's call.

### C3 — Two identifier formats already disagree, and this change touches identity generation

- `FACT-1005` (`docs/data-model.md:41`): `Meeting.id` is `mtg-<owner>-<n>` **in the seed**
- `FACT-1017`: identifiers are "opaque strings with a type prefix (`usr-`, `mtg-`). Never a number,
  never guessable-by-increment."
- `FACT-2060` (`docs/api-contract.md:183`): the create path generates "a `randomUUID()` id"

This divergence is **already tracked as `BL-024`** (`docs/BACKLOG.md:41`) and is not caused by this
change — but a move to Prisma rewrites the code that issues ids, and `HD-UT-07` asserts the UUID
shape (`tests.md`).

### C4 — `docs/security.md` is uncitable, and `architecture.md` assigns it ownership of the threat model

**Reframed at the `FEAT-G1` review.** The first version filed this as a contradiction while its own
closing sentence conceded there was none — `security.md` is not one of the four keyed corpus
documents, so carrying no keys is the expected state, not a disagreement. What it actually contains
is a corpus-boundary observation plus one live tension. Both are below.

**The observation.** `contract.md` reports, by grep over the whole file, that `docs/security.md`
contains **zero** `FACT-NNNN` keys; `history.md` reaches the same finding independently. The four
keyed corpus documents named in `CLAUDE.md` are `architecture.md`, `adr/`, `data-model.md` and
`api-contract.md`, and `security.md` is not among them.

**The tension, which is real and is named not resolved.** `docs/architecture.md`'s corpus-ownership
facts `FACT-0001`…`FACT-0006` assign the threat model to `security.md`, while `ADR-0021` makes every
unkeyed sentence reasoning that "must not be relied on as fact". So the document that owns the threat
model holds nothing citable as fact. This bears on this change directly: a new upload endpoint is a
new attack surface, and `contract.md` §6 records that `security.md` says nothing about uploads, size
limits or content types in the first place. Whether that is intended or is a gap is **not resolved
here**.

### C5 — The repository's current `ValidationPipe` options reject a numeric field sent over multipart

- `apps/api/src/app.module.ts:21-24` registers `ValidationPipe` with
  `whitelist: true, forbidNonWhitelisted: true, transform: true`
- `FACT-2012` fixes the 400 body shape; invariant 8 fixes `message` as an array on a 400
- Measured (`probes.md` probe 3a): with exactly those options, `durationMinutes` sent as a multipart
  field `"60"` returns **400** with three messages, while the same value as JSON returns 200

Not a contradiction between two documents, but between a documented promise and what the stack does
on the body shape scoping decision 4 implies. Both measured coercion routes change behaviour, and one
of them changes the 400 body itself (`probes.md` probe 3e). **Named, not resolved.**

## Still unknown

What remains genuinely open after the sweeps. This section is what the designer inherits as
questions rather than as silence; unknowns that travel unannounced come back as rework.

1. **The client-side surface of Next's 413.** The default (1 MB) and the server-side throw site are
   evidenced exactly (`probes.md` probe 4). What the browser receives, and whether `useActionState`
   surfaces it as state or as a thrown error, was **not probed** — doing so needs a `next dev` against
   `apps/web`, which Next 16 registers per project directory and which risks colliding with a running
   `pnpm dev`.
2. **Whether a Prisma client can be faked in a Vitest unit.** The existing unit specs construct
   services directly. A Prisma-backed service rejects with `P1001` when no database is listening
   (`probes.md` probe 7). No mocking or in-memory-adapter pattern exists in the repository to test
   against, so what happens to `meetings.service.spec.ts` and `users.service.spec.ts` is open.
3. **What Docker's availability does _not_ settle** (`probes.md` probe 0). Docker was installed
   mid-stage and a compose PostgreSQL now serves queries here, so the local half of scoping decision 2
   is exercisable. Still unmeasured: whether the engine is available without the Docker Desktop GUI
   being launched (it was not up until the app was started), whether it survives a reboot unattended,
   and anything about resource limits. **CI is a separate question entirely — see 11.**
4. **Who may retire a `FACT-`.** `ADR-0022` gives the mechanics (successor key, `## Retired facts`
   table, regenerate the lock, `AR-API-15`…`AR-API-17`) but, per `contract.md`, **no fact names a role
   restriction on the act**. C1 implies a large retirement.
5. **Whether the Prisma-backed services keep today's method signatures** (`findRecent`,
   `countByOwner`, `create`, `findById`, `findByEmail`). Nothing in the corpus specifies a service
   contract — `code.md` Open questions.
6. **`nest build` and a generated Prisma client.** `apps/api/nest-cli.json` has no asset
   configuration (`code.md`). The probes exercised `tsc --noEmit` and direct `node` execution, never
   `nest build` followed by `node dist/main` (`probes.md`, "What the probes did not settle").
7. **Prisma's migration workflow.** Only `prisma db push` was exercised. `prisma migrate dev` /
   `deploy`, shadow databases and what they require are unprobed — and `BL-004` is specifically about
   a migration.
8. **`e2e/fixtures/seed.ts` after the move.** It is a hand-kept mirror whose only sync check is live
   over HTTP (`SM-API-02`/`SM-API-03`, `tests.md`), and `BL-004` records it as the thing a
   seed→migration change conflicts with. What it becomes is open.
9. **Whether `e2e/README.md`'s run-command block is stale.** `tests.md` flags that the fenced block at
   `:141-142` omits `pnpm e2e:meetings-detail` / `pnpm test:meetings-detail`, though
   `package.json:24` defines the latter and `e2e/README.md:53` lists it in the feature table. So the
   omission is confined to the command block, and whether it is staleness or intent is not resolvable
   from the documents alone.
10. **No measurement exists for the cost of this kind of change.** `history.md` reports that neither
    profiling record (`FT-003`, `FT-006`) covers a cycle that added a dependency or a service, so
    there is no cost precedent for this shape of work.

Added at the `FEAT-G1` review, where the first version of this index dropped them despite the sweeps
having found them:

11. **How CI gets a database.** Both jobs are `runs-on: ubuntu-latest`
    (`.github/workflows/ci.yml:33`, `:115`) — the one environment in this project where a
    docker-compose Postgres is unambiguously available — and three `verify` steps would talk to a
    database after this change: `pnpm test` (`:83`), `pnpm --filter @purpleschool/api test:e2e`
    (`:86`) and `pnpm e2e` (`:93`). The workflow declares **no `services:` block and no container**.
    Nothing in the repository addresses it, and the local Docker result does not transfer.
12. **Test isolation once the store survives a restart.** `FACT-3130` ("`nest start --watch` restarts
    on every edit and wipes anything a test created") is the premise under `FACT-3125` (read-only
    `teacher`/`student` carrying the absolute assertions), `FACT-3126` (`planner`/`organizer` as the
    two mutation sandboxes, because Playwright runs both projects in parallel against one store) and
    `FACT-3131` (mutating cases use relative counters, never absolute), and under the backlog's
    **Rejected** entry for "a state reset endpoint for tests" plus `FACT-3128`, which reject the same
    thing in `ADR-0007`. A database removes that premise. What replaces the restart as the isolation
    mechanism is named in `history.md`'s Open questions and in `tests.md`, and is open.
13. **How `DATABASE_URL` reaches each process that starts the API.** Four places: `pnpm dev`, the two
    `playwright.config.ts` `webServer.env` blocks (which today carry only `API_URL`, `PORT` and
    `JWT_SECRET`), and CI. `SEC-API-10` (`e2e/security/security.api.spec.ts:350-354`) fails
    `pnpm verify` on any committed `.env` that is not `.env.example`, and `apps/api/.env.example` plus
    `apps/api/CLAUDE.md:38-39` record `.env` and `@nestjs/config` as deliberately absent. The obvious
    move — committing a `.env` for the compose stack — is the one the suite rejects.
14. **Whether `prisma-client-js` is deprecated or supported**, and **what the `prisma-client`
    generator's options allow**. The first determines whether a generator chosen on a probe has a
    shelf life; the second was untested, and `prisma validate` cannot enumerate the options because it
    accepts invented keys without complaint (`probes.md` probe 1c).
15. **Whether `pnpm lint` and `pnpm format:check` would accept generated code**, which matters only if
    generated output lands in the tree. The ignore lists and the generator's own `@ts-nocheck` /
    `eslint-disable` headers are recorded in `code.md`; no existing entry covers a generated _code_
    directory, only the generated markdown `e2e/scenarios-index.md`.
