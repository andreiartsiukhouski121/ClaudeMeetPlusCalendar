# Contract research — `meeting-files`

Sweep of the promises (`docs/api-contract.md`, `docs/data-model.md`, `docs/architecture.md`,
`docs/adr/`, `docs/security.md`, the DTO/mapper/types code, the seed and its mirror) that the
area of this change — meeting file attachments, and the move from in-memory seeds to PostgreSQL
via Prisma for both `User` and `Meeting` — already touches. Written to the evidence rule: every
statement below carries a `FACT-` key, an invariant number, an ADR ID, a path, or is marked as
`Not found`. Nothing here proposes a shape for the change.

Documents read in full: `docs/api-contract.md`, `docs/data-model.md`, `docs/architecture.md`,
`docs/security.md`, `docs/adr/README.md`, `ADR-0003`, `ADR-0006`, `ADR-0007`, `ADR-0009`,
`ADR-0017`, `ADR-0021`, `ADR-0022` — 12 documents. Partially read or grepped for specific terms:
`ADR-0013`, `docs/BACKLOG.md`, `docs/CHANGELOG.md`, `e2e/architecture/architecture.api.spec.ts`,
`docs/facts-lock.json`, `scripts/fact-next.mjs`, `apps/api/src/meetings/meeting.types.ts`,
`apps/web/src/lib/types.ts`, `e2e/fixtures/seed.ts`, `apps/api/src/main.ts`,
`pnpm-workspace.yaml`.

## 1. `docs/api-contract.md` — current promises for `/meetings` and `/auth`

Routes table columns, exactly: `Method | Path | Guard | Success | Errors | Cases | Key` —
`FACT-2004`, `FACT-2005`. The `Key` column is last because `AR-API-09` reads the `Cases` column by
position (`docs/api-contract.md:28-30`). Current rows: `GET /` → `FACT-2006`; `POST /auth/login` →
`FACT-2007`; `GET /auth/me` → `FACT-2008`; `GET /meetings` → `FACT-2009`; `POST /meetings` →
`FACT-2010`; `GET /meetings/:id` → `FACT-2011`. No meeting-files route exists in this table or
anywhere in the document — confirmed by full read.

`/auth/login`: `FACT-2019` request `{ email, password }`; `FACT-2021` "Answers `200`, not `201`:
the handler carries `@HttpCode(HttpStatus.OK)`" (invariant 1); `FACT-2022` response
`{ accessToken, user: { id, email, name } }`, no `passwordHash`. Logic: `FACT-2023`…`FACT-2027`
(normalize email, always verify password against real-or-dummy hash, same 401 message, sign
`{sub, email}`).

Error body shapes, exact bodies:

| Key         | Situation                                         | Code | Body                                                                                            |
| ----------- | ------------------------------------------------- | ---- | ----------------------------------------------------------------------------------------------- |
| `FACT-2012` | `ValidationPipe` rejected the payload             | 400  | `{"message": ["email must be an email", …], "error": "Bad Request", "statusCode": 400}`         |
| `FACT-2013` | extra field under `forbidNonWhitelisted`          | 400  | `{"message": ["property ownerId should not exist"], "error": "Bad Request", "statusCode": 400}` |
| `FACT-2014` | bad credentials                                   | 401  | `{"message": "Invalid email or password", "error": "Unauthorized", "statusCode": 401}`          |
| `FACT-2015` | missing/invalid token                             | 401  | `{"message": "Authentication required", "error": "Unauthorized", "statusCode": 401}`            |
| `FACT-2016` | no meeting with that id, or owned by another user | 404  | `{"message": "Meeting not found", "error": "Not Found", "statusCode": 404}`                     |

`FACT-2017` — "`message` is an array on a 400 and a string on a 401 and on a 404" is the key that
states invariant 8. No 409, 413 or 415 appears anywhere in the table or body list — confirmed by
reading the whole Error shapes section and every per-endpoint Errors list.

`GET /meetings`: `FACT-2034` guard on the class; `FACT-2035` `limit?` int 1..100; `FACT-2036`
`@IsOptional()` mandatory (invariant 2); `FACT-2037` default 3 supplied by the service; `FACT-2038`
body `{ items: MeetingDto[], total: number }`, each item the same five keys `GET /meetings/:id`
returns; `FACT-2039` filter by `ownerId` from token → sort `startsAt` desc, `id` asc secondary
(invariant 7); `FACT-2040` `total` = `countByOwner`, never `items.length` (invariant 4);
`FACT-2041` comparison on parsed milliseconds. No `offset`/cursor parameter is documented anywhere
in this section — `limit` is the only query parameter — confirmed by full read.

`POST /meetings`: `FACT-2042` 201 default, no `@HttpCode`; `FACT-2043` request
`{ title, startsAt, durationMinutes?, participants? }`; field rules `FACT-2044`…`FACT-2047`;
`FACT-2048` no `ownerId` field, `forbidNonWhitelisted` rejects one with
`400 property ownerId should not exist` (invariant 5); `FACT-2060` logic — generate a
`randomUUID()` id, take `ownerId` from `@CurrentUser()`, normalize `startsAt` to canonical UTC,
default duration and participants, store, return through `toMeetingDto` which strips `ownerId`.

`GET /meetings/:id`: `FACT-2061` no query/body DTO; `FACT-2062` `:id` unvalidated — no
`ParseUUIDPipe`, no regex, no length rule; `FACT-2063` body on 200 is exactly five keys sorted
`durationMinutes, id, participants, startsAt, title`; `FACT-2064` 401 body; `FACT-2065` 404 body,
one code path for "no such id" and "owned by another user" (byte-identical) — `ADR-0018`;
`FACT-2066` the no-argument `NotFoundException()` form is forbidden, it drops `error` — `ADR-0018`;
`FACT-2067` no 400 on this route; `FACT-2068` a malformed path (`/meetings/a/b`) falls through to
Express's own 404, three keys, not a Nest handler.

"Adding an endpoint" steps (directly relevant to a new attachment route): `FACT-2075` write the
ADR first if structural; `FACT-2076` controller + service + DTO + mapper, per
`docs/architecture.md` layer rules; `FACT-2077` add the Routes-table row — `AR-API-05` fails the
run otherwise; `FACT-2078` add to `PROTECTED_ROUTES` if guarded — `AR-API-06`, invariant 16;
`FACT-2079` cases in `e2e/regression/<feature>/<feature>.api.cases.md` and the paired spec.

Base facts: `FACT-2001` `Content-Type: application/json` on everything except `GET /`; `FACT-2002`
no CORS, no global prefix; `FACT-2000` the executable truth of this contract is
`e2e/regression/**/*.api.spec.ts`, this document is "its prose companion."

## 2. `docs/data-model.md` — entities, field formats, seed

### `User` (source: `apps/api/src/users/users.types.ts`)

| Key         | Field          | Format                                     | Leaves the API?                  |
| ----------- | -------------- | ------------------------------------------ | -------------------------------- |
| `FACT-1000` | `id`           | `usr-<slug>`, stable, assigned by the seed | yes                              |
| `FACT-1001` | `email`        | a valid address, the login identifier      | yes                              |
| `FACT-1002` | `name`         | display name                               | yes                              |
| `FACT-1003` | `passwordHash` | `scrypt`, salted, compared constant-time   | never — `toPublicUser` strips it |

`FACT-1004` `PublicUser = Omit<User, 'passwordHash'>` is what the wire ever sees.

### `Meeting` (source: `apps/api/src/meetings/meetings.types.ts`)

| Key         | Field             | Format                                                           | Leaves the API?                  |
| ----------- | ----------------- | ---------------------------------------------------------------- | -------------------------------- |
| `FACT-1005` | `id`              | `mtg-<owner>-<n>` **in the seed**                                | yes                              |
| `FACT-1006` | `ownerId`         | a `User.id`, set from the token                                  | never — `toMeetingDto` strips it |
| `FACT-1007` | `title`           | 3–100 characters                                                 | yes                              |
| `FACT-1008` | `startsAt`        | ISO 8601, UTC, always `…Z` — **a string, not a `Date`**          | yes                              |
| `FACT-1009` | `durationMinutes` | integer, 15–480; optional on input, default 60                   | yes                              |
| `FACT-1010` | `participants`    | 0–20 free-form strings, 1–100 chars each; optional, default `[]` | yes                              |

`FACT-1011` `MeetingDto = Omit<Meeting, 'ownerId'>`. Note: the code itself issues a bare
`randomUUID()` for a new meeting's id (`FACT-2060`), which is not the `mtg-<owner>-<n>` shape
`FACT-1005`/`FACT-1017` describe for the seed — this divergence is already a tracked backlog item,
`BL-024` (`docs/BACKLOG.md`), and is reported here as a finding, not resolved.

Response wrappers: `FACT-1012` `MeetingsPageDto = { items, total }`; `FACT-1013` `total` is the
owner's full count, never `items.length` (invariant 4); `FACT-1014` `LoginResult =
{ accessToken, user }`; `FACT-1015` `JwtPayload = { sub, email }`; `FACT-1016` the payload is
readable by anyone holding the token, so nothing secret goes in it.

Value formats: `FACT-1017` identifiers are "opaque strings with a type prefix (`usr-`, `mtg-`).
Never a number, never guessable-by-increment"; `FACT-1018` timestamps ISO 8601 UTC, milliseconds
included, "no local time anywhere in storage or on the wire"; `FACT-1019` display dates pinned
`timeZone: 'UTC'`; `FACT-1020` durations whole minutes 15–480; `FACT-1021` email validated +
trimmed on the web side; `FACT-1022` password never trimmed; `FACT-1023` test-created meetings
dated 2030; `FACT-1024` participants free-form, never a `User.id`, never trimmed/deduplicated
(`ADR-0017`).

## 3. Facts that a database bears on — split by what actually happens to them

**This section was restructured after the `FEAT-G1` review.** Its first version was a single table
headed "Facts that a database makes false", introduced by the claim that every row "stops being true
the moment PostgreSQL via Prisma holds the data". The quotations were accurate; the classification
was not. At least eight of those rows state something that a change of storage does not falsify, and
a design sized off the old table would try to retire statements that are still true — which under
`ADR-0022` costs a successor key, a `## Retired facts` row and a lock regeneration each, and which
`AR-API-16` fails outright when the successor is not valid.

The rows are the same rows. Only the classification below is new, plus the three keys added under
"completeness" at the end.

**The distinction being drawn** is the one this sweep already drew correctly for `ADR-0017` in C2 of
`README.md`: a statement whose _premise_ is removed is not the same thing as a statement that becomes
_false_. `ADR-0017` rejected a `User` relation because an in-memory store cannot enforce referential
integrity — removing that premise does not make the rejection wrong, it makes the reasoning stale.
The same applies to several rows here.

**Nothing below is a retirement decision.** Which keys are retired, withdrawn, reworded or left alone
is the design stage's call.

### 3a. Falsified — the statement itself stops being true

| Key         | Document                      | Exact sentence                                                                                                                     |
| ----------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `FACT-1025` | `docs/data-model.md:94`       | "There is no database." — `ADR-0007`                                                                                               |
| `FACT-1026` | `docs/data-model.md:95`       | "Each service owns an array, seeded at module initialization."                                                                     |
| `FACT-1027` | `docs/data-model.md:102`      | "Users, meetings — in-memory arrays in the services — the API process restarts (`--watch` does it on every edit)"                  |
| `FACT-1028` | `docs/data-model.md:103`      | "Password hashes — computed at startup from the seed — with the process; plaintext never persists"                                 |
| `FACT-0030` | `docs/architecture.md:112`    | "In-memory repository + seed" pattern row, "services own their arrays" — `ADR-0007`                                                |
| `FACT-0037` | `docs/architecture.md:149`    | "A database" listed under "Patterns deliberately refused" — `ADR-0007`                                                             |
| `FACT-3121` | `ADR-0007` Decision           | "Services own plain arrays, seeded at module init from `*.seed.ts`."                                                               |
| `FACT-3127` | `ADR-0007` Decision, Rejected | "A database — see Context."                                                                                                        |
| `FACT-3130` | `ADR-0007` Consequences       | "`nest start --watch` restarts on every edit and wipes anything a test created, so no test may depend on data created by another." |

Nine keys. Each asserts either that there is no database, or that the store is an in-memory array, or
that data does not survive a restart — all three of which scoping decisions 1 and 2 reverse directly.

### 3b. Premise removed, but the statement is still true as written

These are the rows the old table got wrong. Each remains literally true after the move; what changes
is the reason behind it, or a condition it was written under.

| Key         | Document                      | Exact sentence                                                                                                                                                 | What changes                                                                                                  |
| ----------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `FACT-0012` | `docs/architecture.md:75`     | Controller "Must not": "hold rules, touch the store, assemble a response by hand"                                                                              | "the store" comes to mean Prisma rather than an array; the prohibition is unaffected                          |
| `FACT-0013` | `docs/architecture.md:76`     | Service layer "May": "hold the rules, own the store, sort, count, hash"                                                                                        | same — the permission stands, its referent changes                                                            |
| `FACT-0026` | `docs/architecture.md:108`    | "Layered modules — controller → service → store, per Nest module" — `ADR-0006`                                                                                 | the layering is untouched by where the store lives                                                            |
| `FACT-3104` | `ADR-0006` Decision           | "Service holds the rules and owns the store, and knows nothing about HTTP."                                                                                    | same                                                                                                          |
| `FACT-3047` | `ADR-0003` Consequences       | "There is no session store and no revocation list: signing out deletes the cookie, and a stolen token stays valid until it expires. This is a deliberate gap." | still true unless this change adds a session store, which no scoping decision asks for                        |
| `FACT-3046` | `ADR-0003` Decision, Rejected | "A server-side session store — there is no database, and an in-memory one would die with every `--watch` restart."                                             | the rejection may stand, but **its stated reason is exactly what this change removes** — cf. `ADR-0017` in C2 |
| `FACT-3120` | `ADR-0007` Context            | "The subject of this project is the contract, the suite and the development process."                                                                          | a Context sentence, not a storage claim; it is the premise `FACT-3127` was argued from                        |
| `FACT-3160` | `ADR-0009` Context            | "hash a handful of passwords" — ties the hashing need to seed size                                                                                             | a Context sentence; "a handful" is a premise about the seed, not a claim about the algorithm                  |
| `FACT-3164` | `ADR-0009` Decision           | "Password hashing is `node:crypto.scrypt` with a constant-time comparison."                                                                                    | **nothing** — unaffected by where data lives; it was in the old table in error                                |
| `FACT-1033` | `docs/data-model.md:114`      | "Drift between the seed and its mirror fails `SM-API-02` / `SM-API-03`."                                                                                       | true for as long as both a seed and a mirror exist                                                            |
| `FACT-3247` | `ADR-0013` Consequences       | "Changing a seed value changes two files — `apps/api/src/**/*.seed.ts` and its mirror `e2e/fixtures/seed.ts` — or `SM-API-02` goes red."                       | same                                                                                                          |
| `FACT-3133` | `ADR-0007` Consequences       | "Replacing the seed with a migration is `BL-004`, marked as conflicting with `e2e/fixtures/seed.ts`."                                                          | true until `BL-004` closes; this change is what would close it                                                |

Twelve keys.

### 3c. Listed for adjacency — truth depends on a design decision not yet taken

These describe the seed mechanism and the identifiers. Whether they survive depends on choices the
design stage has not made (does the `*.seed.ts` file remain, does a migration replace it, how are ids
issued). They are listed so the designer sees them, **not** classified.

| Key                     | Document                     | Exact sentence                                                                                                                                 |
| ----------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `FACT-3122`             | `ADR-0007` Decision          | "Passwords sit in `users.seed.ts` as plaintext and are hashed with `scrypt` at startup, so the store itself never holds a plaintext password." |
| `FACT-1032`             | `docs/data-model.md:112`     | "The seed is `apps/api/src/users/users.seed.ts` and `meetings.seed.ts`, mirrored for the suite in `e2e/fixtures/seed.ts`."                     |
| `FACT-1038`…`FACT-1041` | `docs/data-model.md:126-131` | Seed enumeration: shared plaintext password, `teacher`/`student` never mutated, parallel-project store sharing, absolute seed dates            |
| `FACT-2060`             | `docs/api-contract.md:183`   | "...generate a `randomUUID()` id... store..." — the in-memory array write inside the create logic                                              |
| `FACT-1005`             | `docs/data-model.md:41`      | `id` format "`mtg-<owner>-<n>` **in the seed**" — ties identity format to the seed mechanism (see also `BL-024`, C3)                           |

Five rows, eight keys.

### 3d. Added at review — keys resting on the same restart premise as `FACT-3130`

`FACT-3130` ("`--watch` … wipes anything a test created") is in 3a. Three further keys are written on
top of that same premise and were absent from the first version of this table:

| Key         | Document                | Exact sentence                                                                                                                                                      |
| ----------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FACT-3125` | `ADR-0007` Consequences | "Test isolation is achieved through data, not through resets: `teacher` (5 meetings) and `student` (0 meetings) are read-only and carry the absolute assertions."   |
| `FACT-3126` | `ADR-0007` Consequences | "`planner` and `organizer` are the mutation sandboxes for the API and UI suites respectively, because Playwright runs both projects in parallel against one store." |
| `FACT-3131` | `ADR-0007` Consequences | "Mutating cases use relative counters, never absolute ones."                                                                                                        |

The backlog's **Rejected** section rejects "a state reset endpoint for tests", and `FACT-3128`
("A test-only reset endpoint — a back door in a production API.") records the same rejection in
`ADR-0007`. Both rejections were argued against the in-memory store. Recorded, not resolved.

### 3e. Completeness of this table — stated rather than assumed

**The table is not provably complete, and the method that built it is not exhaustive.** Saying so is
the finding; claiming coverage would not be.

- The corpus holds **611 distinct `FACT-` keys** across `docs/architecture.md`, `docs/data-model.md`,
  `docs/api-contract.md` and `docs/adr/*.md`
  (`grep -rhoE "FACT-[0-9]{4}" … | sort -u | wc -l` → `611`).
- A line-scoped keyword sweep over those four documents for
  `in-memory|in memory|no database|restart|--watch|wipes|seed|store\b|array|process memory|persist|lifetime`
  returns **31** keys. That sweep is demonstrably incomplete on its own: it misses `FACT-0012`,
  `FACT-0013`, `FACT-0026`, `FACT-0030`, `FACT-0037`, `FACT-1005`, `FACT-1027`, `FACT-1028`,
  `FACT-2060`, `FACT-3120`, `FACT-3125`, `FACT-3126`, `FACT-3127`, `FACT-3131`, `FACT-3160` and
  `FACT-3164` — all of which are in this table — because the corpus stores many facts in table rows
  where the keyword sits in a different column from the key.
- Conversely the sweep surfaced keys this table does **not** carry and which were not assessed:
  `FACT-2004`, `FACT-2017`, `FACT-2032`, `FACT-3044`, `FACT-3111`, `FACT-3123`, `FACT-3124`,
  `FACT-3209`, `FACT-3332`, `FACT-3333`, `FACT-3337`, `FACT-3338`, `FACT-3342`, `FACT-3359`,
  `FACT-3360`, `FACT-3362`.
- **`ADR-0007` alone holds 14 keys (`FACT-3120`…`FACT-3133`), and this table covers 11 of them.**
  The three not carried anywhere above are `FACT-3128` (reset endpoint rejected — quoted in 3d),
  `FACT-3129` ("One shared user for everything — parallel projects would race.") and `FACT-3132`
  ("Created meetings are dated 2030.").

So the method was: the contract sweep's reading of the four corpus documents, plus a keyword sweep,
plus the three additions named in 3d. **A key-by-key pass over all 611 was not performed.** Whether
one is needed before retirement is a design-stage question.

`ADR-0022`'s retirement lifecycle — what retiring any of the above actually requires, cited rather
than decided:

- `FACT-3487` "When reality changes, the old fact is **retired** and a new fact with a fresh key
  states what is true now; the retirement names the successor key."
- `FACT-3488` "A fact that stops being true with no replacement is **withdrawn**, and the
  withdrawal names what withdrew it: a ledger entry, an ADR, or a commit."
- `FACT-3489` Retired/withdrawn facts "leave the body of the document and are listed in a
  `## Retired facts` table at its end."
- `FACT-3491` `docs/facts-lock.json` pins every key ever allocated, its status, its successor, and
  a SHA-256 of its statement.
- `FACT-3492` `pnpm fact:lock` regenerates the lock from the corpus; `pnpm fact:check` compares
  the corpus against it offline.
- `FACT-3493`…`FACT-3495` name `AR-API-15`/`16`/`17`, the checks enforcing the register's form
  (absence, successor validity, hash match).
- No fact states which role may perform a retirement — `ADR-0022`'s Decision gives mechanics only
  (open question, below).

## 4. `docs/architecture.md` — layers, patterns used/refused

- Corpus ownership: `FACT-0001`…`FACT-0006` (this file owns layers/patterns; `api-contract.md`
  owns endpoints; `data-model.md` owns entities/lifetimes; `adr/` owns why; `CLAUDE.md` the 19
  invariants; `security.md` the threat model). `FACT-0007` "The four documents do not overlap."
- `apps/api` layer table: `FACT-0012`…`FACT-0016` (Controller/Service/Mapper/DTO/Guard, quoted
  above and in §3).
- "Patterns in use" names no ORM, no repository pattern, and no persistence/data-access
  abstraction anywhere in the table (`FACT-0023`…`FACT-0056` enumerated in full) — confirmed by
  complete read.
- "Patterns deliberately refused": `FACT-0037` "A database" — `ADR-0007` — is the only
  persistence-adjacent refusal on record. No row refuses an ORM or a repository layer by name;
  only "a database" as a whole is named refused.
- Module boundaries: `FACT-0008` names the layout (`apps/web`: `proxy.ts`, `app/**`, `lib/dal.ts`,
  `lib/actions/**`, `lib/api-client.ts`; `apps/api`: `*.controller`, `*.service`, `*.mapper`,
  `*.seed`). No "shared"/"common" Nest module is named anywhere in this document — confirmed by
  full read of the module-layout section and both layer tables.

## 5. `docs/adr/` — relevant records, and `ADR-0017` specifically

Index (`docs/adr/README.md`) read in full; 26 records. Those bearing on persistence, data,
storage, seeds, the contract shape, or configuration: `ADR-0003` (session store), `ADR-0006`
(layering, store ownership), `ADR-0007` (in-memory store), `ADR-0009` (own guard + scrypt),
`ADR-0017` (participants as strings), `ADR-0018` (404-over-403 for ownership), `ADR-0019`
(single-source route listing), `ADR-0021`/`ADR-0022` (fact-keying and lifecycle) — all quoted
above or below.

**`ADR-0017` — Participants are free-form strings on the meeting, not a relation** (accepted).
Key content:

- `FACT-3345` "`participants` is a field of the `Meeting` entity: `participants: string[]`, always
  present internally, never `undefined` and never `null`."
- `FACT-3346` "There is no participant entity, no join type and no reference to `User.id`."
- `FACT-3353` (Rejected) "A relation to `User` (participants as `usr-` ids, or a join entity) —
  the requester ruled it out, and it would put an entity into `docs/data-model.md` that
  **nothing in a seeded in-memory store can enforce referential integrity for**. — this record,
  `ADR-0007`"

**The pressure, named and not resolved here:** `FACT-3353`'s stated reason for rejecting a `User`
relation rests explicitly on `ADR-0007`'s in-memory store having no way to enforce referential
integrity. Once persistence moves to PostgreSQL via Prisma, that premise (no referential-integrity
enforcement available) stops holding the way it did — Postgres foreign keys can enforce it.
`ADR-0017` itself states `FACT-3344`: "It does not fix the numbers: changing 20 entries to 50, or
100 characters to 200, is an edit to `docs/api-contract.md` and `docs/data-model.md`, not a new
ADR" — a change from free-form strings to a relation is explicitly outside that carve-out. Whether
the Prisma migration should supersede `ADR-0017` is left open; this sweep only names the pressure.

**`ADR-0018` — A record the caller does not own answers 404, never 403.** Cited via `FACT-2065`
(the 404 body, one code path for "no such id" and "not owner", byte-identical) and `FACT-2066` (the
no-arg `NotFoundException()` form is forbidden). Not read beyond its citation sites this pass.

> Reworded after the `FEAT-G1` review. The first version added "an 'attachment belongs to a meeting
> owned by another user' case will likely sit next to the same one-code-path 404 pattern" — that is a
> design proposal with a softener on it, not a finding. What the project contains is `FACT-2065` and
> `FACT-2066`, above. Whether a new route reuses that pattern is in **Open questions**.

**`ADR-0019` — The route listing lives in `docs/api-contract.md` alone; other documents link.**
Cited at `FACT-2004`, `FACT-2005`, `FACT-0007`; governs where new attachment routes must be
registered (the Routes table, nowhere else). Not read in full this pass — title and citation
context only.

## 6. `docs/security.md` — uploads, content types, size limits, gaps

Read in full. **Zero `FACT-` keys appear anywhere in this document** — confirmed by grep (count:
0). Per `ADR-0021`, every sentence in it is therefore reasoning, not a corpus fact, and nothing
in it can be cited as a FACT; the document states this of itself: "the document is short on
purpose: everything checkable automatically lives in `e2e/security/`, not in prose"
(`docs/security.md:3-4`, unkeyed).

Content relevant to a new upload endpoint, quoted as prose (not cited as fact):

- Threat-model table: "User passwords — leaking when the store or an API response is read —
  `scrypt` with a per-user salt, `timingSafeEqual`; the mapper strips the hash."
- Deliberate gaps list: "No rate limiting," "No refresh tokens," "No dedicated CSRF token,"
  "`JWT_SECRET` has a default in the code," "**Seed passwords are plaintext** in `users.seed.ts`
  and hashed at startup. ... In a real project the seed file would be a migration with ready
  hashes," "The cookie token is not additionally encrypted," "No security headers," "Rotating
  `JWT_SECRET` signs everyone out."
- Nothing in this document names file upload, content-type restriction, file size limits, or
  content/malware scanning — confirmed by full read.
- The "Accepted dependency advisories" section documents the `multer` override (see §8) but says
  nothing about multer being used for uploads — only that it is a transitive dependency of
  `@nestjs/platform-express` raised for an audit CVE.

## 7. Validation and error-shape conventions — what a new upload endpoint sits next to

- DTO validation messages are documented as concrete JSON bodies per field/rule, not abstractly —
  see `FACT-2055`…`FACT-2058` (the `participants` rejection-body table) as the existing template.
- No endpoint currently documents a `413` (payload too large) or a `415` (unsupported media type)
  anywhere in `docs/api-contract.md` — confirmed by full read of the Routes table and every
  per-endpoint Errors list.
- No endpoint accepts a non-JSON request body: `FACT-2001` states `Content-Type: application/json`
  on everything except `GET /`. No `multipart/form-data` handling, no `FileInterceptor`, no body
  size configuration appears in `apps/api/src/main.ts` (read in full — only CORS/prefix/
  `x-powered-by` are configured; no `bodyParser` limit override).

## 8. `FACT-` numbering mechanics

- `pnpm fact:next` → `scripts/fact-next.mjs` (read in full). Defines four blocks by line range:
  `architecture.md` 0001–0999, `data-model.md` 1000–1999, `api-contract.md` 2000–2999, `adr/`
  3000–3999 (`scripts/fact-next.mjs:19-24`). Scans every `.md` file in a block's target for
  `FACT-\d{4}` and reports one past the highest number ever used **in that block**, not the first
  gap (`scripts/fact-next.mjs:63-69`). It only reports; it never edits a document
  (`scripts/fact-next.mjs:6`).
- `docs/facts-lock.json` (3062 lines): `{ "version": 1, "facts": { "FACT-NNNN": { "status":
"active", "document": "...", "hash": "<sha256 of the statement>" } } }`.
- `scripts/facts-lock.mjs` regenerates the lock (`FACT-3492`); not wired into `pnpm verify`
  (`FACT-3503`: "a command that regenerates the thing being checked cannot run inside its own
  check").
- `AR-API-11`…`AR-API-17` in `e2e/architecture/architecture.api.spec.ts`: `AR-API-11` every key
  unique and inside its document's block; `AR-API-12` every keyed fact names a source; `AR-API-13`
  no key defined inside a rationale block; `AR-API-14` every `FACT-` reference resolves;
  `AR-API-15` the lock and corpus agree (nothing deleted/added/reworded silently); `AR-API-16`
  every retired fact names a valid successor or sourced withdrawal; `AR-API-17` the retirement
  register itself parses (driven by a fixture, since the corpus has no real retirements yet —
  `e2e/architecture/architecture.api.spec.ts:1157-1161`).

## Open questions

- Whether `ADR-0017` (participants as free-form strings, not a `User` relation) should be
  superseded once PostgreSQL enforces referential integrity is unresolved by anything in the
  corpus — the pressure is named in §5, the decision is left for design.
- `docs/data-model.md`'s identifier format (`FACT-1017`: "opaque strings with a type prefix, never
  a number, never guessable-by-increment") versus the live code's bare `randomUUID()`
  (`FACT-2060`) is an already-open, tracked divergence — `BL-024` in `docs/BACKLOG.md`,
  independent of this change, but a Prisma migration touches identity generation directly and will
  interact with whatever `BL-024` eventually decides.
- No fact states which role may perform a `FACT-` retirement under `ADR-0022` — the ADR gives the
  mechanics (append a successor, list in "Retired facts", regenerate the lock) but names no
  owner/role restriction on the act itself.
- Whether multer (already present transitively, overridden in `pnpm-workspace.yaml:25-26` purely
  for a CVE range, with the reason in the comment at `:21-24`, and not wired to any route) is
  expected to be the upload mechanism is not stated anywhere in the corpus — it is a
  dependency-audit artifact, not a documented upload decision.
- Whether a route for an attachment on a meeting the caller does not own reuses `ADR-0018`'s
  one-code-path 404 (`FACT-2065`, `FACT-2066`) is not stated anywhere. No fact extends `ADR-0018`
  beyond `GET /meetings/:id`, and no route for attachments exists to have been decided. Moved here
  from §5 at the `FEAT-G1` review, where it had been written as a prediction.
- How a connection string and a database password reach the API in each of the four places that
  start it — `pnpm dev`, the two `playwright.config.ts` `webServer.env` blocks, and CI — is not
  addressed by any fact. `SEC-API-10` forbids a `.env` file in the repository (see `tests.md` §7),
  and `apps/api/.env.example` plus `apps/api/CLAUDE.md` record `.env` and `@nestjs/config` as
  deliberately absent. Nothing in the corpus describes a mechanism for a secret that is not
  hard-coded.

## Not found

- **Not found:** any endpoint in `docs/api-contract.md` for meeting files/attachments (upload or
  list) — searched the Routes table and every per-endpoint section, full read.
- **Not found:** any corpus statement naming an ORM, Prisma, a repository/data-access-layer
  pattern, adopted or refused — searched `docs/architecture.md` "Patterns in use" and "Patterns
  deliberately refused" tables in full; only "a database" (`FACT-0037`) is refused as a whole.
- **Not found:** any mention of Docker, docker-compose, or PostgreSQL anywhere in `docs/` or
  `docs/adr/` — searched by grep across `docs/**/*.md` for `Prisma|Postgres|docker|bytea`, zero
  matches outside this new change folder itself.
- **Not found:** a "shared"/"common" Nest module pattern described in `docs/architecture.md` —
  searched the module-layout section and both layer tables in full.
- **Not found:** any security posture, size limit, content-type restriction, or threat-model entry
  for file uploads in `docs/security.md` — searched the whole document (which itself carries zero
  `FACT-` keys).
- **Not found:** a documented `413` or `415` status, or any non-JSON request body, anywhere in
  `docs/api-contract.md` — searched the Routes table and all Errors lists in full.
- **Not found:** any role restriction on who may perform a `FACT-` retirement under `ADR-0022` —
  searched the ADR's Decision and Consequences sections in full.
- **Not found:** any existing `docker-compose.yml`, `schema.prisma`, or Prisma-related file
  anywhere in the repository — searched by filename glob at repo root and under `apps/api`.
