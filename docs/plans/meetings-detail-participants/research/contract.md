# Contract sweep: meetings-detail-participants

> Promises already made in the area of: (a) a `participants[]` field on the meeting entity/contract,
> (b) a single-meeting-by-id endpoint, (c) whether the target sketch's `date` is `startsAt` under
> another name. Record only what is in the project. No design, no recommendation.

## 1. The Routes table (`docs/api-contract.md`, verbatim)

`docs/api-contract.md:21-27`:

```
| Method | Path          | Guard    | Success | Errors      | Cases            |
| ------ | ------------- | -------- | ------- | ----------- | ---------------- |
| `GET`  | `/`           | none     | `200`   | —           | `SM-API-01`      |
| `POST` | `/auth/login` | none     | `200`   | `400`,`401` | `AL-API-01`…`14` |
| `GET`  | `/auth/me`    | `Bearer` | `200`   | `401`       | `AL-API-10`…`14` |
| `GET`  | `/meetings`   | `Bearer` | `200`   | `400`,`401` | `HD-API-01`…`12` |
| `POST` | `/meetings`   | `Bearer` | `201`   | `400`,`401` | `HD-API-13`…`20` |
```

There is **no** `GET /meetings/:id` row. `docs/api-contract.md:17-19` states this table is compared
against the Nest controllers **in both directions** by `AR-API-05`
(`e2e/architecture/architecture.api.spec.ts:615-620`, function `violationsContractDrift`,
`e2e/architecture/architecture.api.spec.ts:401-437`): a route registered in a controller without a
matching row fails, and a row without a matching controller route also fails. Guarded routes are
additionally checked against `PROTECTED_ROUTES` in `e2e/security/security.api.spec.ts` by
`AR-API-06` (`e2e/architecture/architecture.api.spec.ts:622-627`, invariant 16).

**How the check parses a row** (`e2e/architecture/architecture.api.spec.ts:49-50`, regex
`CONTRACT_ROUTE_ROW`): a table row must match
``| `GET|POST|PUT|PATCH|DELETE` | `path` | guard-cell...`` — method and path each in backticks,
pipe-delimited. The Guard column drives whether the route is treated as guarded: `guarded: match[3].includes('Bearer')` (`e2e/architecture/architecture.api.spec.ts:389`). So a new `GET /meetings/:id`
row would need the literal path in backticks (the code-side scanner in `codeRoutes` derives the path
from the `@Get(...)` decorator argument joined to the controller prefix,
`e2e/architecture/architecture.api.spec.ts:322-326,368-373` — it does not know Nest's `:id`
convention specially, it just reads the decorator's string argument verbatim).

Confirmed against the actual controller: `apps/api/src/meetings/meetings.controller.ts` registers
only `@Get()` (list, line 25) and `@Post()` (create, line 38) on `@Controller('meetings')` (line 20).
No `@Get(':id')` or similar exists in the code either.

## 2. `POST /meetings` and `GET /meetings` — full entries

### `POST /meetings` (`docs/api-contract.md:113-135`)

- **Guard:** class-level `JwtAuthGuard`. **Answers `201`** — no `@HttpCode` on the handler (line 115).
- **Request:** `{ title, startsAt, durationMinutes? }` (line 118).
- Field table (`docs/api-contract.md:120-124`):
  | Field             | Rule                                                   |
  | ----------------- | ------------------------------------------------------ |
  | `title`           | string, 3–100 characters                               |
  | `startsAt`        | ISO 8601                                               |
  | `durationMinutes` | optional integer 15–480; the service defaults it to 60 |
- **"There is no `ownerId` field, and that absence is the protection."** The owner comes from the
  token; `forbidNonWhitelisted` rejects a sent `ownerId` with
  `400 property ownerId should not exist` (invariant 5, `HD-API-16`, `HD-API-17`) —
  `docs/api-contract.md:126-128`.
- `durationMinutes` must carry `@IsOptional()` — omission would 400 every "New meeting" submission
  (`HD-API-20`) — `docs/api-contract.md:130-131`.
- **Logic** (`docs/api-contract.md:133-135`): generate `randomUUID()` id, `ownerId` from
  `@CurrentUser()`, normalize `startsAt` to canonical UTC via `new Date(...).toISOString()`, default
  the duration, store, return through `toMeetingDto` which strips `ownerId`.
- No field named `participants` and no array-valued request field are mentioned anywhere in this
  entry.

### `GET /meetings` (`docs/api-contract.md:93-111`)

- **Guard:** class-level `JwtAuthGuard`, not global (line 95-96).
- **Query:** `limit?`, integer, `1..100`, mandatory `@IsOptional()` (invariant 2), default `3`
  supplied by the service (`docs/api-contract.md:98-101`).
- **Body:** `{ items: MeetingDto[], total: number }` (line 103).
- **Logic** (`docs/api-contract.md:105-111`): filter by `ownerId` from the token → sort `startsAt`
  DESC with `id` ASC as secondary key → slice by `limit`. `total` = `countByOwner`, never
  `items.length` (invariant 4). Secondary sort key exists because equal dates would otherwise flake
  (invariant 7); comparison is on parsed milliseconds, not strings.
- No single-item variant, no `:id` path parameter, and no error entry for "meeting not found" appear
  in this section.

## 3. What the corpus says about 404

- The project-wide error-shapes table in `docs/api-contract.md:34-39` lists exactly four situations —
  `ValidationPipe` 400 (two rows), bad credentials 401, missing/invalid token 401. **No 400/401/403/
  404 row for "resource not found."**
- `HD-API-07` (`e2e/regression/home-dashboard/home-dashboard.api.cases.md:84-89`) explicitly
  addresses 404 by name, but only to rule it out for a different case: "**Expected:** **200**, not
  404 — having no meetings is a normal state, not 'not found' — with an empty `items` and `total` =
  0." This concerns the list endpoint returning zero items for a user, not a single-resource lookup.
- Grepping `docs/` for `404|NotFound` (whole corpus) surfaces no other hit inside
  `api-contract.md`, `data-model.md`, `architecture.md`, or any `docs/adr/*.md` file. The only other
  hits are in unrelated, already-closed planning artifacts about a **different** feature
  (`docs/plans/feature-plan-implementation.md:114`, `docs/plans/plan-review-1.md:194-250`,
  `docs/plans/feature-plan-testing.md:123`), all about Express's own 404 on an unmapped route/method
  such as `GET /auth/login`, not about a Nest `NotFoundException` for a missing meeting.
- `NotFoundException` (the Nest class) is not mentioned anywhere under `docs/` (same grep, zero
  matches beyond the above).
- **Not found:** a documented 404 response body shape for any endpoint — searched
  `docs/api-contract.md`'s error-shapes table and prose, `docs/data-model.md`, `docs/architecture.md`,
  every file in `docs/adr/`, via `grep -i "404|NotFound"` over `docs/`.

## 4. What the corpus says about arrays

- Request side: no array-valued request field is documented anywhere in `docs/api-contract.md` or
  `docs/data-model.md`. `POST /meetings`'s only documented fields are `title` (string),
  `startsAt` (string), `durationMinutes` (optional number) — `docs/api-contract.md:118-124`.
- Response side: `items: MeetingDto[]` in `MeetingsPageDto` (`docs/api-contract.md:103`,
  `docs/data-model.md:43`) is the only array in a documented response body. `HD-API-01`
  (`e2e/regression/home-dashboard/home-dashboard.api.cases.md:41-48`) asserts `items` is an array and
  that each item has **exactly** the keys `durationMinutes`, `id`, `startsAt`, `title`.
- No array-valued **field of a Meeting entity** is documented. No validation rule for an array field
  (e.g., `@IsArray`, `@ArrayMinSize`, nested-DTO validation) is mentioned anywhere in
  `docs/api-contract.md` or `docs/data-model.md`.
- **Not found:** any documented array-valued field on the `Meeting`/`MeetingDto`/`CreateMeetingDto`
  shapes, or any array-validation rule in the DTO conventions — searched `docs/api-contract.md`,
  `docs/data-model.md` for "array"/"Array"/"[]" (see grep results above; the only hits are the
  message-array note for 400 bodies and the `items[]`/in-memory-array store notes, none about a
  meeting-owned array field).

## 5. `docs/data-model.md` — the Meeting entity in full

Entity table (`docs/data-model.md:27-39`):

| Field             | Type     | Format / constraint                             | Leaves the API?                      |
| ----------------- | -------- | ----------------------------------------------- | ------------------------------------ |
| `id`              | `string` | `mtg-<owner>-<n>` in the seed                   | yes                                  |
| `ownerId`         | `string` | a `User.id`; set from the token, never the body | **never** — `toMeetingDto` strips it |
| `title`           | `string` | 3–100 characters                                | yes                                  |
| `startsAt`        | `string` | ISO 8601, UTC, always `…Z` — not a `Date`       | yes                                  |
| `durationMinutes` | `number` | integer, 15–480; optional on input, default 60  | yes                                  |

"`MeetingDto = Omit<Meeting, 'ownerId'>`, checked by key set in `HD-API-01`. `startsAt` is a string
rather than a `Date` deliberately: it survives JSON serialization unchanged and compares stably in
assertions." — `docs/data-model.md:37-39`.

No `participants` field, no `date` field (only `startsAt`), no `updatedAt`/`createdAt` field are
listed.

**`ownerId`-stripping rule, verbatim:** "**never** — `toMeetingDto` strips it" (entity table, row
`ownerId`, `docs/data-model.md:32`), and repeated at `docs/data-model.md:37`: "`MeetingDto =
Omit<Meeting, 'ownerId'>`". Also stated as a general changing-the-model rule at
`docs/data-model.md:147-148`: "Change the entity **and** its mapper. A field that should not travel
must be dropped in the mapper, not remembered at each call site."

**Lifetime/flow:** "There is no database (`ADR-0007`). Each service owns an array, seeded at module
initialization." (`docs/data-model.md:64`). Table at `docs/data-model.md:66-71`: users/meetings live
"in-memory arrays in the services", die "when the API process restarts (`--watch` does it on every
edit)".

**Seed values as documented** (`docs/data-model.md:76-94`, seed table lines 82-87):

| User                          | Name            | Meetings | Role in the suite                                 |
| ----------------------------- | --------------- | -------- | ------------------------------------------------- |
| `teacher@purpleschool.test`   | Anna Teacher    | 5        | read-only; exact counts and the "last 3" ordering |
| `student@purpleschool.test`   | Ivan Student    | 0        | read-only; the empty-state edge case              |
| `planner@purpleschool.test`   | Maria Planner   | 1        | mutation sandbox for `*.api.spec.ts`              |
| `organizer@purpleschool.test` | Peter Organizer | 1        | mutation sandbox for `*.functional.spec.ts`       |

"One password for all four (`Passw0rd!`) ... **`teacher` and `student` are never mutated** —
absolute assertions rest on them." (`docs/data-model.md:89-90`). So `planner` and `organizer` are the
users safe to mutate; this matches `e2e/fixtures/seed.ts:29,44-57` ("mutation sandbox" comments) and
`apps/api/src/meetings/meetings.seed.ts:10-14`.

**Internal entity → DTO flow, stated generally:** "Change the entity **and** its mapper. A field
that should not travel must be dropped in the mapper" (`docs/data-model.md:147-148`); "Update
[`api-contract.md`](api-contract.md) and this file in the same commit" (`docs/data-model.md:149`);
"Update the cases that assert by key set — they are what stops a field escaping silently."
(`docs/data-model.md:151`); "If the change is structural (a new entity, a changed ownership rule,
persistence), it is an ADR first" (`docs/data-model.md:152-153`).

## 6. The `MeetingDto` key set as promised, and closure

- `docs/data-model.md:37`: "`MeetingDto = Omit<Meeting, 'ownerId'>`, checked by key set in
  `HD-API-01`."
- `HD-API-01` (`e2e/regression/home-dashboard/home-dashboard.api.cases.md:41-48`): "Every item has
  **exactly** the keys `durationMinutes`, `id`, `startsAt`, `title` — the full key set rather than
  'has an id', so an `ownerId` leak is caught too."
- The word "exactly" in the case is the corpus's statement that the key set is closed/exhaustive —
  this is the only place closure is stated for `MeetingDto`; no other document (api-contract.md,
  data-model.md, architecture.md) uses "exactly"/"closed"/"exhaustive" language about this key set
  beyond restating "checked by key set."
- Declared shape in code (not corpus, cited for comparison only, not as a promise):
  `apps/api/src/meetings/meeting.types.ts:17` — `export type MeetingDto = Omit<Meeting, 'ownerId'>;`
  — and the mapper `apps/api/src/meetings/meetings.mapper.ts:11-18` builds exactly
  `{ id, title, startsAt, durationMinutes }`.

## 7. `docs/architecture.md` — layer rules and refusals bearing on this change

Layer table for `apps/api`, "controller → service → store, one direction only"
(`docs/architecture.md:53-61`):

| Layer      | May                                                   | Must not                                                                                        |
| ---------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Controller | route, validate a DTO, read `@CurrentUser()`, map out | hold rules, touch the store, assemble a response by hand                                        |
| Service    | hold the rules, own the store, sort, count, hash      | know about HTTP, read `Request`, invent status codes beyond the documented ones                 |
| Mapper     | turn an entity into a DTO, dropping internal fields   | be skipped — a response assembled inline leaks `ownerId`                                        |
| DTO        | describe the shape and the validation                 | carry an owner or a role field (invariant 5); omit `@IsOptional()` on an optional (invariant 2) |
| Guard      | reject a request without a valid token                | be optional on a data route (invariant 16)                                                      |

Relevant note: "invent status codes beyond the documented ones" is listed as something a Service
"Must not" do (`docs/architecture.md:58`) — bearing directly on whether a service may throw
`NotFoundException` for a status not yet documented anywhere.

"Where a change goes" table (`docs/architecture.md:108-117`):

- "An endpoint" → "controller + service + DTO + mapper; `api-contract.md`; `PROTECTED_ROUTES` if
  guarded (invariant 16); an api spec" (`docs/architecture.md:112`).
- "A field on an existing response" → "the entity, the mapper, `data-model.md`, `api-contract.md`,
  the cases that assert the key set" (`docs/architecture.md:113`).
- "An architectural choice" → "an ADR **first**, then the code: `pnpm adr:new <slug>`"
  (`docs/architecture.md:117`).

Patterns explicitly refused (`docs/architecture.md:92-106`) — none directly names arrays,
participants, or a by-id lookup; the closest is the general database refusal (`ADR-0007`,
`docs/architecture.md:102`) and "Client-side calls to Nest" (`docs/architecture.md:104`, `ADR-0002`),
neither of which bears on adding a field or a route within the existing in-memory/BFF shape.

## 8. ADRs constraining the meetings module, contract shape, error shapes, DTO mapping or validation

- **`ADR-0006` — Nest layering: controller, service, mapper, and validation as a provider.**
  Decision: "**Controller** routes, validates through its DTO, reads identity from `@CurrentUser()`,
  and maps the result out. Nothing else." / "**Service** holds the rules and owns the store. It
  knows nothing about HTTP." / "**Mapper** (`toMeetingDto`, `toUserDto`) is the only way an entity
  becomes a response, so internal fields are dropped in one place rather than remembered at each
  call site." (`docs/adr/ADR-0006-nest-layering.md:23-27`). Consequences state invariant 2 and
  invariant 8 follow from this ADR (`docs/adr/ADR-0006-nest-layering.md:37-40`).
- **`ADR-0007` — An in-memory store with a code seed instead of a database.** Decision: "Services own
  plain arrays, seeded at module init from `*.seed.ts`." (`docs/adr/ADR-0007-in-memory-store.md:16`).
  "Test isolation is achieved **through data, not through resets**: `teacher` (5 meetings) and
  `student` (0 meetings) are read-only ... `planner` and `organizer` are the mutation sandboxes"
  (`docs/adr/ADR-0007-in-memory-store.md:23-26`). Rejected explicitly: "a database", "a test-only
  reset endpoint", "one shared user for everything" (`docs/adr/ADR-0007-in-memory-store.md:28-29`).
  Constrains this change: any new entity/field is added to the same in-memory array pattern, not a
  new persistence layer, and any seed change must mirror into `e2e/fixtures/seed.ts`
  (`docs/adr/ADR-0007-in-memory-store.md:20-21`).
- **`ADR-0009` — own guard and scrypt** (title confirmed via `docs/architecture.md:100-101` and the
  ADR file existing at `docs/adr/ADR-0009-own-guard-and-scrypt.md`; not read in full for this sweep
  beyond confirming its subject is the guard/`@CurrentUser()` mechanism used for `ownerId`, which the
  entity table already cites for invariant 5).
- No ADR in `docs/adr/` is titled or found (by filename or the architecture.md ADR column) to concern
  a "participants" field, a plural/nested request shape, or a `GET /:id` pattern specifically.
  Filenames present: `ADR-0001` monorepo, `0002` BFF boundary, `0003` session-JWT-cookie, `0004`
  three session checks, `0005` no-CORS-no-prefix, `0006` Nest layering, `0007` in-memory store,
  `0008` Playwright contract source, `0009` own guard/scrypt, `0010` executable conventions, `0011`
  ledger/orientation, `0012` worktree parallelism, `0013` English-only, `0014` agent roles, `0015`
  architecture corpus, `0016` discovery stages (`docs/adr/*.md` directory listing).
- **Not found:** an ADR addressing array-typed request/response fields, participant/attendee
  modeling, or single-resource-by-id endpoints — searched every filename under `docs/adr/` and the
  ADR column of `docs/architecture.md`'s pattern tables.

## 9. CLAUDE.md invariants bearing on this area

Quoted from the corpus copy supplied in-session (`CLAUDE.md`, "Project invariants" section):

- **Invariant 2:** "Any **optional** DTO field must carry `@IsOptional()`. Without it a missing field
  still runs through `@IsInt`/`@Min`/`@Max` and gives 400 — that is how both `limit` and
  `durationMinutes` 'broke'." Constrains: any new optional field on `CreateMeetingDto` or a new
  query DTO.
- **Invariant 4:** "`total` is the owner's full record count, **never** `items.length`: `items` is
  cut by the limit." Constrains: `MeetingsPageDto.total` on `GET /meetings`, unaffected by adding
  `participants` but binding if a by-id endpoint reuses any listing logic.
- **Invariant 5:** "`ownerId` comes from `@CurrentUser()` — the signed token — and never from the
  request body." Constrains: any new endpoint (including a by-id lookup) must not accept or trust an
  owner value from the client; a by-id endpoint's authorization (which meeting `:id` values a given
  token may fetch) is not addressed by any other invariant or documented rule found in this sweep.
- **Invariant 8:** "Error shape: with a 400 from `ValidationPipe`, `message` is an **array** of
  strings; with a 401 it is a string. Do not rely on one shape." Constrains: any new error response
  must follow one of these two documented shapes; **no third shape (e.g., for 404) is defined by
  this invariant or elsewhere in the corpus** (see §3).
- **Invariant 16:** "Every new protected endpoint is added to `PROTECTED_ROUTES`
  (`e2e/security/security.api.spec.ts`), and every new protected page to `PROTECTED_PAGES`
  (`security.functional.spec.ts`)." Constrains: a new `GET /meetings/:id` (if guarded) must be added
  there, mechanically checked by `AR-API-06` (`e2e/architecture/architecture.api.spec.ts:622-627`).

Also structurally relevant though not in the pay-attention list:

- **Invariant 1** (200 vs 201 on login) — not directly touched by this area, no citation needed
  beyond confirming it is unrelated.
- **Invariant 7:** "Sorting by date always carries a secondary key on `id`" — already implemented for
  `GET /meetings` (`docs/api-contract.md:109-111`); bears on this area only if a participants field
  or a new endpoint introduces new sorting.

## 10. Exact greps for `date` and `participants` naming

- `participants`/`participant`: zero hits anywhere under `docs/` except the three self-referential
  hits inside this very change folder's own scaffolded files (`docs/plans/meetings-detail-
participants/meetings-detail-participants.plan.md:1`, `docs/plans/meetings-detail-
participants/design.md:1`, `docs/plans/meetings-detail-participants/research/README.md:1` — all
  three are just the slug `meetings-detail-participants` in a title line, not a field reference).
  Searched via `grep -i "participants|participant"` over `docs/`.
- `date` as a field name: the corpus never names a meeting field `date`. All non-generic hits are
  about (a) ADR "Date:" metadata lines (`docs/adr/*.md`), (b) `startsAt`'s format being "ISO 8601...
  not a `Date`" (`docs/data-model.md:34,38`), (c) "Seed dates are absolute"
  (`docs/data-model.md:93`), (d) sorting "by date DESC" as prose describing `startsAt` ordering
  (`e2e/regression/home-dashboard/home-dashboard.api.cases.md:63`, case title, not a field name),
  (e) `<input type="datetime-local">` normalization in the create-meeting flow
  (`docs/data-model.md:132`, `docs/api-contract.md` create-meeting Logic note referencing
  `startsAt`). No document equates a field literally named `date` with `startsAt`, and no document
  uses `date` as a request/response key. Searched via `grep -i "\bdate\b"` over `docs/`.
- **Not found:** any corpus statement equating a sketch-level `date` field with the existing
  `startsAt` field, by name or by explicit mapping — searched `docs/api-contract.md`,
  `docs/data-model.md`, `docs/architecture.md`, `docs/adr/*.md` for "date" and "startsAt" occurring
  together in an equivalence statement; none found.

## Divergence between document and code

- **None found** for the areas swept: the Routes table (`docs/api-contract.md:21-27`) and the actual
  `@Controller('meetings')` methods (`apps/api/src/meetings/meetings.controller.ts:20,25,38`) agree —
  both list only `GET /meetings` and `POST /meetings`, guarded, no `:id` route on either side.
  `MeetingDto`'s documented key set (`docs/data-model.md:37`, `docs/api-contract.md` entity/DTO
  notes) matches the mapper's actual output (`apps/api/src/meetings/meetings.mapper.ts:11-18`:
  `{ id, title, startsAt, durationMinutes }`) and the declared type
  (`apps/api/src/meetings/meeting.types.ts:17`). The web-side mirror type
  (`apps/web/src/lib/types.ts:15-21`) matches the same four fields. The `e2e/fixtures/seed.ts` seed
  mirror (`e2e/fixtures/seed.ts:67-83`) matches the counts documented in `docs/data-model.md:82-87`
  and the actual seed data in `apps/api/src/meetings/meetings.seed.ts:16-66` (`usr-teacher`: 5,
  `usr-student`: 0 — not directly enumerated in the seed file since student has none, `usr-planner`:
  1, `usr-organizer`: 1).
- No `participants` or `date` field exists in either the corpus or the code (`Meeting` interface,
  `apps/api/src/meetings/meeting.types.ts:5-11`, has only `id`, `ownerId`, `title`, `startsAt`,
  `durationMinutes`) — corpus and code agree by mutual absence.

## 11. `docs/security.md` — added by the `researcher` on review finding F2

This file was in no sweep's scope on the first pass. It is the only place in the corpus that states
anything about one user reaching another user's data.

The threat model table (`docs/security.md:22-28`) has five rows. Two bear on this change, quoted
verbatim:

> | User data | access with another user's token, owner spoofing through the body | `ownerId` from the signed token; `forbidNonWhitelisted` on every DTO |

> | Account existence | enumeration by response and **by response time** | one message plus a password verification even for an unknown email |

A third row bears on the 404 body specifically:

> | Internal structure | hints to an attacker in headers and error bodies | `x-powered-by` off; error bodies without stack traces or paths |

What this does and does not settle, stated only as far as the text goes:

- The "User data" row names **access with another user's token** as a protected-against threat and
  names two countermeasures. Both countermeasures concern how `ownerId` enters the system
  (`@CurrentUser()`, DTO whitelisting). Neither is a statement about what status code a by-id read
  of another owner's record returns.
- The "Account existence" row is about **accounts**, not meetings, and its countermeasure is about
  the login branch. It does not extend to resource ids by its own wording.
- **Not found:** any statement in `docs/security.md` about a 404, about resource enumeration by id,
  or about meetings by id — searched the whole file for `404`, `meeting`, `enumerat`, `owner`. The
  only `enumerat` hit is the "Account existence" row (`docs/security.md:27`) and the prose at
  `docs/security.md:52` about login timing, both about accounts.

## 12. Identifier format — added by the `researcher` on review finding F3

`docs/data-model.md:54`, the "Value formats" table, verbatim:

> | Identifiers | opaque strings with a type prefix (`usr-`, `mtg-`). Never a number, never guessable-by-increment |

Against that rule, the store holds **two** id formats at once:

- All seven seeded meetings carry prefixed ids — `mtg-teacher-1` … `mtg-teacher-5`,
  `mtg-planner-1`, `mtg-organizer-1` (`apps/api/src/meetings/meetings.seed.ts:18,25,32,39,46,53,60`).
- Every meeting created at runtime gets `id: randomUUID()`
  (`apps/api/src/meetings/meetings.service.ts:70`, import at `:1`) — a bare UUID with no `mtg-`
  prefix.

Both facts are recorded; which of them the rule at `docs/data-model.md:54` is met or broken by is
not something this sweep decides.

## Open questions (uncitable, carried forward)

- Whether a `GET /meetings/:id` would be guarded (and thus require a `PROTECTED_ROUTES` entry) is
  not stated anywhere — no document mentions this route at all, so neither its guard status nor its
  error behavior is promised.
- Whether cross-owner access to `GET /meetings/:id` (a token's owner requesting another owner's
  meeting id) should answer 404 or 403 is not addressed by any document; invariant 5 only says
  ownership is read from the token for _filtering/creation_, not for a by-id authorization check.
  `docs/security.md:26` (§11) names the threat but prescribes no status code, and `SEC-API-09`
  (`tests.md` §1) asserts non-intersecting id sets through the **list** route only.
- Whether `participants[]` would be entity-owned (stored on `Meeting`) or a separate relation is not
  addressed anywhere in `docs/data-model.md`'s entity model, which currently defines only `User` and
  `Meeting` with no join/relation type documented.
