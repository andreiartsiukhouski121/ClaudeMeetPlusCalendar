# Design: meetings-detail-participants

> The shape of the change. Created by `pnpm change:new <slug>`, written by the `designer` agent from
> the accepted `research/` folder, and reviewed before any plan is written.
>
> **This is not a plan.** No tasks, no order of work, no dependencies, no estimates, no file list —
> those come next, from the `planner`. It is also not a restatement of the research: cite it.
>
> Every load-bearing fact traces to `research/`. A fact appearing for the first time here is an
> assumption, and the review will treat it as one.

The delta: **`participants[]` on the meeting**, **`GET /meetings/:id`**, and two documentation
defects the research found (**C1**, **C3**) that the requester put in scope. `POST /meetings` and
`GET /meetings` already ship (`FT-002`); `startsAt` stays and is not renamed to the sketch's `date`
(`research/README.md`, "Clarifications from the requester", row #1).

## 1. What the research established

The findings this design rests on. Links, not copies.

**The code as it is** (`research/code.md`)

- `MeetingsController` declares exactly two routes, `@Get()` and `@Post()`, both under a class-level
  `@UseGuards(JwtAuthGuard)`; `ownerId` comes from `@CurrentUser()` on both (§1).
- `Meeting = { id, ownerId, title, startsAt, durationMinutes }`;
  `MeetingDto = Omit<Meeting, 'ownerId'>`; the mapper lists the four outward fields explicitly (§1).
- The service exposes `findRecent`, `countByOwner`, `create` and a private `byOwner` that returns
  **copies** (`meetings.service.ts:83-87`). Nothing looks a meeting up by its own id (§1, "Not
  found").
- **No `@Param`, no `:id`, no `NotFoundException` anywhere in `apps/api/src`** — this would be the
  first of each (§4).
- **No array-valued field anywhere in `apps/api/src`** — this would be the first (§5).
- `apps/web` has one meetings DAL function, `getMeetings` (`dal.ts:71-90`), one Server Action that
  posts `{ title, startsAt }` only, and no `[id]` route anywhere (§3, "Not found").

**The contract as promised** (`research/contract.md`)

- The Routes table has no `/meetings/:id` row and is diffed against the controllers in both
  directions by `AR-API-05`; guarded rows are matched against `PROTECTED_ROUTES` by `AR-API-06` (§1).
- The corpus documents **no 404 at all**: the error-shapes table holds two 400s and two 401s, and
  `NotFoundException` appears nowhere under `docs/` (§3).
- No array-valued entity field and no array validation rule is documented anywhere (§4).
- `docs/data-model.md:54` requires identifiers to be "opaque strings with a type prefix (`usr-`,
  `mtg-`)"; the store holds **two** formats at once — seven prefixed seed ids and `randomUUID()` at
  runtime (§12).
- A service "must not … invent status codes beyond the documented ones"
  (`docs/architecture.md:58`, §7); the mapper is the only way an entity becomes a response
  (`ADR-0006`, §8).
- `docs/security.md:26` names access with another user's token as a threat and prescribes no status
  code (§11).

**The suite as it stands** (`research/tests.md`)

- Exactly two assertions pin the meeting key set: `HD-API-01` (`home-dashboard.api.spec.ts:102`) and
  `HD-API-20` (`:408`), both `Object.keys(...).sort()` against
  `MEETING_KEYS = ['durationMinutes','id','startsAt','title']` (§2).
- `SEC-API-06` requires **every** error body it samples to hold exactly `statusCode`/`message`/
  `error` (`security.api.cases.md:80-86`, asserted at `security.api.spec.ts:227`) (§1).
- `SEC-API-09` (P0) asserts two users' meeting id sets do not intersect and says in its own text
  that the invariant "must hold once new resources appear"; it walks the **list** route only (§1).
- `PROTECTED_ROUTES` holds three entries, `PROTECTED_PAGES` holds `['/']` (§1).
- `KNOWN_CASE_PREFIXES` is a closed list of seven with nothing for this change
  (`suite-integrity.api.spec.ts:43`) (§5).
- `home-dashboard.api.cases.md:16`: "16 cases. Numbers `11`, `12`, `18`, `19` are **never reused**."

**Framework behaviour, measured** (`research/probes.md`, run against this repository's own
`@nestjs/common` 12.0.1 / `class-validator` 0.15.1 and its exact `ValidationPipe` options)

- Probe A — arrays: invariant 2 holds for arrays (A2); `[]` passes (A3); `transform` coerces
  neither a string into an array (A4) nor numbers into strings (A5); `forbidNonWhitelisted` reports
  an unknown key instead of the array errors (A8); with `@IsOptional()`, absent arrives absent (A10)
  and **an explicit `null` reaches the handler as `null`** (A11).
- Probe B — `new NotFoundException('Meeting not found')` gives three keys with a **string**
  `message` (B1); `new NotFoundException()` gives **two** keys, no `error` (B2).
- Probe C — `@Get(':id')` after `@Get()` collides with nothing; `GET /meetings` and `GET /meetings/`
  both still reach the list handler (C1, C5); a two-segment path falls through to Express's own 404
  (C7); **without a pipe `:id` arrives as an arbitrary raw string** (C2).
- Probe D — `ParseUUIDPipe` answers 400 with a **string** `message` (D2, D3).
- Probe E — the class-level guard's 401 precedes the `:id` handler (E1).

**Requirement input, from the requester** (`research/README.md`, "Clarifications"): `startsAt` stays;
participants are free-form strings with no relation to `User`; a by-id request for another owner's
meeting answers 404, indistinguishable from a missing id.

### Probe F — measured at design time, not by the research

The design review found (F6) that one load-bearing claim — "`durationMinutes` already treats an
explicit `null` as absent" — was an inference sitting beside cited probe rows, and that it was about
to be frozen into an ADR. `research/probes.md` probe A measured `@IsOptional() @IsArray()`;
`durationMinutes` additionally carries `@Type(() => Number)` (`create-meeting.dto.ts:25`), which no
probe exercised, and class-transformer coercing `null` to `0` would have turned the claim inside out
(`@Min(15)` would 400). So it was measured rather than labelled.

**Method.** `ValidationPipe` — the very class `AppModule` registers as `APP_PIPE`, with the same
three options — driven **directly** rather than over HTTP: `pipe.transform(body, { type: 'body',
metatype })`, printing the resulting instance or the `BadRequestException`'s response body. The DTO
is `create-meeting.dto.ts` copied verbatim, plus a second class with `participants` added. The probe
directory carries a junction to `apps/api/node_modules`, so the versions are this repository's own
(`@nestjs/common` 12.0.1, `class-validator` 0.15.1, `class-transformer` 0.5.1, Node v24.14.0 — the
same set `research/probes.md` records). Nothing was added to the repository. Output, verbatim:

| #    | Input                                     | Result                                                                                                                                                                                              |
| ---- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PF1  | `durationMinutes` absent                  | accepted; the key is absent from the instance                                                                                                                                                       |
| PF2  | `durationMinutes: null`                   | **accepted**; arrives as `null` (`typeof` `object`) — `@Type(() => Number)` did **not** coerce it                                                                                                   |
| PF3  | `durationMinutes: 45`                     | accepted; `45`                                                                                                                                                                                      |
| PF4  | `durationMinutes: "45"`                   | accepted; transformed to the number `45`                                                                                                                                                            |
| PF5  | `durationMinutes: 0`                      | `400` `{"message":["durationMinutes must not be less than 15"],"error":"Bad Request","statusCode":400}`                                                                                             |
| PF6  | `participants: null`                      | accepted; arrives as `null`                                                                                                                                                                         |
| PF7  | `participants` absent                     | accepted; key absent                                                                                                                                                                                |
| PF8  | `participants: ["a","b"]`                 | accepted; `["a","b"]`, order preserved                                                                                                                                                              |
| PF9  | `participants: []`                        | accepted; `[]`                                                                                                                                                                                      |
| PF10 | `participants: [""]`                      | `400` `{"message":["each value in participants must be longer than or equal to 1 and shorter than or equal to 100 characters"],"error":"Bad Request","statusCode":400}`                             |
| PF11 | `participants`: 21 entries                | `400` `{"message":["participants must contain no more than 20 elements"],"error":"Bad Request","statusCode":400}`                                                                                   |
| PF12 | `participants: ["x"×101]`                 | `400`, the same message as PF10                                                                                                                                                                     |
| PF13 | `participants: [1,2]`                     | `400` `{"message":["each value in participants must be longer than or equal to 1 and shorter than or equal to 100 characters","each value in participants must be a string"],…}` — **two** messages |
| PF14 | `participants: "x"` (a string, not array) | `400` `{"message":["participants must contain no more than 20 elements","participants must be an array"],…}` — **two** messages                                                                     |

What it changes in this design: **PF2** turns the C4 argument from an inference into a measurement;
**PF10**, **PF11**, **PF13** and **PF14** pin the message text the earlier draft declined to pin —
and correct two rows that had been carried over from probe A's decorator set, because probe A had no
`@ArrayMaxSize`/`@Length` and therefore printed one message where this design's decorators print
two. The order of the strings inside `message` is not a promise: a case asserts membership, not
position.

## 2. The shape

### `apps/api` — changed

| Layer          | What changes                                                                                                                                                                                                                                                                                                           |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entity         | `Meeting` gains `participants: string[]` — required internally, never `undefined`, never `null`. `MeetingDto = Omit<Meeting, 'ownerId'>` is untouched and therefore gains it too (`ADR-0017`).                                                                                                                         |
| DTO (in)       | `CreateMeetingDto` gains `participants?: string[]`, validated as in §3. `title`, `startsAt`, `durationMinutes` are unchanged.                                                                                                                                                                                          |
| Service input  | `CreateMeetingInput` gains `participants?: string[]`. It still carries no `ownerId` (invariant 5).                                                                                                                                                                                                                     |
| Service        | `create` normalizes `input.participants ?? []` into the stored entity, the way it already defaults `durationMinutes`. A new `findById(ownerId, id): Meeting \| undefined` performs **one** owner-scoped lookup and returns a copy. Both copy paths clone the array rather than sharing it (§4).                        |
| Mapper         | `toMeetingDto` lists `participants` explicitly alongside the other four. It keeps stripping `ownerId`, and it stays the only way an entity becomes a response (`ADR-0006`).                                                                                                                                            |
| Controller     | A third route, `@Get(':id')`, declared **after** `@Get()` and `@Post()` — the order probe C exercised. It reads `@Param('id')` as a raw string with **no pipe**, calls `findById`, throws `NotFoundException('Meeting not found')` on `undefined`, and maps the hit out. No `@HttpCode`: Nest's GET default 200 holds. |
| Guard          | Nothing. The route inherits the class-level `JwtAuthGuard`, which probe E shows runs first.                                                                                                                                                                                                                            |
| Module, wiring | Nothing. `MeetingsModule` and `AppModule` already import what the new route needs (`research/code.md` §1-2).                                                                                                                                                                                                           |
| Seed           | All seven `SEED_MEETINGS` entries gain a `participants` value — exact strings in §4.                                                                                                                                                                                                                                   |

**Who throws.** The service returns `undefined`; the **controller** raises the HTTP exception. A
service "must not … invent status codes" (`docs/architecture.md:58`, `research/contract.md` §7), and
`ADR-0006` keeps HTTP out of it.

**One lookup, not two.** `findById` takes the owner and the id together and has a single return
path: a meeting that does not exist and a meeting owned by somebody else both produce `undefined`.
The ownership comparison exists — it has to, somewhere — but it lives **inside** that one method and
never reaches the controller, so the controller has one `undefined` to translate and cannot grow a
second branch. That is what makes `ADR-0018`'s indistinguishability structural rather than a
convention; a case makes it mechanical (§2, suite surfaces).

### `apps/web` — one line, and nothing else

`apps/web/src/lib/types.ts` mirrors `MeetingDto` field for field (`research/code.md` §3), so its
`Meeting` interface gains `participants: string[]`. That is the whole web change.

Deliberately unchanged: `proxy.ts`, `lib/dal.ts` (no `getMeeting(id)` — nothing would call it),
`lib/actions/meetings.ts` (it keeps posting `{ title, startsAt }`; participants are optional exactly
so that it can), `lib/api-client.ts` (`ApiFetchOptions.method` stays `'GET' | 'POST'` — the question
raised as Still-unknown #9 does not arise, because no web code calls the new route), `app/page.tsx`,
`components/meeting-list.tsx`, `components/create-meeting-form.tsx`, and `PROTECTED_PAGES`.

**Why no web surface at all.** The requirement names three API routes and no page
(`research/README.md`, "Requirement, as received"); `apps/web` has no `[id]` route to extend
(`research/code.md` §3, "Not found"); and a detail page would pull in `BL-023` (HeroUI v3 needs an
ADR and moves the functional cases with it). A page is a separate change with its own requirement,
and this design does not smuggle one in. Keeping the mirror type in sync is not a surface: it is the
anti-drift rule that `FX-023`/`FX-027` exist for.

### The corpus — changed in the same commit

- `docs/api-contract.md`: a Routes row for `GET /meetings/:id`; a **404 row in the error-shapes
  table**; a new endpoint section; `participants` in the `POST /meetings` field table — with the
  rejection messages measured in probe F — and in the `GET /meetings` response note; the Cases
  column defect C1 corrected (§6).
- `docs/data-model.md`: `participants` in the `Meeting` entity table; a `Participants` row in "Value
  formats". The `id` row is **not** touched (§4).
- `apps/api/README.md`: the Endpoints table and the error-shapes paragraph removed in favour of a
  link (`ADR-0019`).
- **`CLAUDE.md`, invariant 8** — one sentence: `message` is an array on a 400 and a string on a 401
  **and on a 404**. Decided rather than skipped (review finding F9): by disjointness the error
  **bodies** belong to `docs/api-contract.md` alone and are not copied into `CLAUDE.md`, but
  invariant 8 is not a copy of that table — it is the read-before-you-code list, it names the shapes
  without their bodies, and leaving it saying "400 and 401" while a third shape ships is how this
  repository broke on error shapes twice. The invariant points at the contract for the bodies.
- `docs/adr/`: `ADR-0017`, `ADR-0018`, `ADR-0019` (§6).

### Suite surfaces this change creates or moves

Named here because they are part of the shape, not because this design writes them — cases and specs
belong to the tester roles.

- `PROTECTED_ROUTES` gains `{ method: 'GET' as const, path: '/meetings/:id' }` — invariant 16. The
  entry's path must read `/meetings/:id` **literally**: `AR-API-06` strips a query string and then
  compares the path verbatim against the route the controller scanner derived
  (`architecture.api.spec.ts:443-446`, confirmed in the code at design time — `research/tests.md` §3
  records the check's existence, not this line). At runtime `SEC-API-01` therefore requests the
  literal path `/meetings/:id` and gets 401 from the guard before any handler runs (probe E).
- `MEETING_KEYS` becomes `['durationMinutes','id','participants','startsAt','title']`.
- `KNOWN_CASE_PREFIXES` gains **`MD`**. Reasoning: `HD-` is the _home dashboard_ feature, and a
  case's prefix follows the feature it belongs to, not the route it calls — `SEC-API-07` already
  covers `POST /meetings` from outside `HD-` (`research/tests.md` §1). The `participants` validation
  cases on `POST /meetings` are this change's behaviour and are `MD-`; the two `HD-` assertions that
  must move (§7) are edits to existing cases, not new ones.
- **`e2e/regression/meetings-detail/` holds three files, not four** (review blocker B2): the pair
  `meetings-detail.api.cases.md` + `meetings-detail.api.spec.ts`, and `meetings-detail.unit.cases.md`.
  **No functional pair.** Rules 1-3 of `suite-integrity.api.spec.ts` (`:261-292`) are _pairing_
  rules — a spec needs a cases doc and the other way round — and nothing requires a `.functional.*`
  pair to exist. With no page, no DAL function and nothing rendered, a functional spec here could
  only invent browser cases for a UI that did not change or re-run the dashboard's under a new
  prefix. `PROTECTED_PAGES` stays `['/']` for the same reason.
- **Unit cases are `MD-UT-`, in `meetings-detail.unit.cases.md`, listing the existing
  `apps/api/src/meetings/meetings.service.spec.ts`** (the B2 sub-question). That spec file is already
  listed in `home-dashboard.unit.cases.md`, and two cases docs may name one spec: rule 7 checks that
  each ID listed under a path appears in that file, rule 8 that each spec is named somewhere — both
  hold, and rule 6 is safe because the prefixes differ. `home-dashboard.unit.cases.md` already spans
  two spec files; one spec spanning two docs is the same relation read the other way. The
  alternative — `HD-UT-17`+ in the dashboard's doc — would file `findById`'s units under a feature
  they do not belong to purely to keep one doc per file. Consequence: a `pnpm test:meetings-detail`
  script (`pnpm -r test -t "MD-UT-"`), matching `test:auth-login` / `test:home-dashboard`, and a row
  in `e2e/README.md`'s "What lives where" table (`e2e/README.md:38-41`) — without it `pnpm
test:<feature>` cannot filter the new cases, which is the reason that title convention exists
  (`suite-integrity.api.spec.ts:388`).
- **A `MD-API-` case, P0, makes `ADR-0018`'s indistinguishability mechanical** (review finding F7).
  It requests one owner's real meeting id with another owner's token, and a plainly non-existent id
  with the same token, and asserts the two responses are **equal**: same status, and
  `expect(bodyA).toEqual(bodyB)` on the parsed bodies rather than two separate shape checks. Without
  it the central promise of `ADR-0018` is held by construction and review only, which is what the
  invariant list in `CLAUDE.md` is a monument to. `SEC-API-06` checks key sets of unrelated
  responses and `SEC-API-09` compares id sets; neither would notice the two bodies drifting apart.
- `SEC-API-09` gains the by-id route: its own text says the invariant "must hold once new resources
  appear" (`research/tests.md` §1), and this change is that appearance. It keeps comparing id sets —
  the byte-equality promise is the `MD-API-` case above.
- **`e2e/fixtures/seed.ts` gains the participant values, and `SM-API-03` is extended to read them**
  (review blocker B1). As it stands `SM-API-03` asserts `teacher.total`, `arrayContaining` over
  titles, `student.total` and `items === []`, and its `MeetingsPageBody` is typed
  `items?: { title: string }[]` (`e2e/smoke/seed.api.spec.ts:14-17`) — it reads no field beyond
  `title`, so mirrored participant values would sit in the fixture with nothing comparing them. The
  earlier draft claimed that mirror was guarded; it was not. The type widens to carry
  `participants?: string[]` and the case compares, per title, the array the API returned against the
  fixture's. `ADR-0007`'s mirror rule is what requires the values to be there; this is what makes the
  requirement real rather than decorative, and a mirror nothing compares is precisely `FX-023` /
  `FX-027`. It stays in the smoke suite rather than moving into a `MD-API-` case because the subject
  is seed drift — the failure must say "the seed moved", not "the detail endpoint is wrong".
- A new architecture check, **`AR-API-09`**, for defect C1 (§6).

## 3. Contract

### `GET /meetings/:id` — new

- **Method and path:** `GET /meetings/:id`. `:id` is an opaque string. Declared after the existing
  two routes; probe C1/C5 show `GET /meetings` and `GET /meetings/` still reach the list handler.
- **Auth:** `Bearer` — the class-level `JwtAuthGuard`. Listed in `PROTECTED_ROUTES` (§2).
- **Request:** no body, no query parameters. Anything sent as a query string is ignored; there is no
  query DTO on this route, so `forbidNonWhitelisted` has nothing to reject.
- **Nothing validates `:id`.** No `ParseUUIDPipe`, no regex, no length rule. Two facts force this:
  every seeded id is `mtg-teacher-1`-shaped and **no seed id is a UUID**
  (`research/contract.md` §12), so the pipe would 404-proof the seed by 400-ing it; and the pipe's
  400 carries a **string** `message` (probe D2/D3) against invariant 8 and `docs/api-contract.md:41`,
  which is contradiction C2. A malformed id is simply an id no meeting has.

**Success — `200`**, `application/json`, body is a `MeetingDto`:

```json
{
  "id": "mtg-teacher-1",
  "title": "Intro to algebra",
  "startsAt": "2026-01-12T09:00:00.000Z",
  "durationMinutes": 60,
  "participants": ["Nina Cole", "guest.parent@purpleschool.test"]
}
```

Exactly five keys, sorted: `durationMinutes`, `id`, `participants`, `startsAt`, `title`. No
`ownerId` — the mapper strips it (`ADR-0006`).

**Errors**

| Situation                                                 | Code  | Body, exactly                                                                                                            |
| --------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------ |
| No token, or a broken one                                 | `401` | `{"message":"Authentication required","error":"Unauthorized","statusCode":401}`                                          |
| No meeting with that id, **or** one owned by another user | `404` | `{"message":"Meeting not found","error":"Not Found","statusCode":404}`                                                   |
| Request path has a second segment (`GET /meetings/a/b`)   | `404` | `{"message":"Cannot GET /meetings/a/b","error":"Not Found","statusCode":404}` (Express's own fallback — no handler runs) |

- The 401 body is the existing guard's, unchanged (`docs/api-contract.md:38`); probe E confirms the
  guard answers before the handler, so an anonymous caller learns nothing about any id.
- The 404 body comes from `new NotFoundException('Meeting not found')` — three keys, `message` a
  **string** (probe B1). **The no-argument form is forbidden**: it returns two keys and no `error`
  (probe B2), which `SEC-API-06` would fail. `ADR-0018` fixes this.
- The two 404 situations are byte-identical by construction (§2, "One lookup, not two").
- The Express fallback row is recorded because it is reachable by mistyping, not because it is ours;
  probe C7 shows it keeps the same three keys, so `SEC-API-06` stays satisfied.
- **There is no `400` on this route.** The Routes-table Errors cell reads `401`,`404`.

### `POST /meetings` — request gains one optional field

Unchanged: path, guard, `201` (no `@HttpCode` — Nest's POST default is the correct answer here,
`HD-API-13`), `title` (3-100), `startsAt` (ISO 8601), `durationMinutes` (optional, 15-480, defaults
to 60), and the absence of `ownerId`.

**New field:** `participants`, optional, an array of strings, at most 20 entries, each 1-100
characters. Decorators, in this order:
`@IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @Length(1, 100, { each: true })`.

`@IsOptional()` is not optional: probe A2 printed the 400 an absent array gives without it, which is
invariant 2 for arrays. Without it, every `POST /meetings` the shipped web form makes would 400
(`research/code.md` §3 — the Server Action sends `{ title, startsAt }`).

**Success — `201`**, body is the created `MeetingDto`, including `participants` as stored.

**Accepted inputs:**

| Sent            | Result                                                                |
| --------------- | --------------------------------------------------------------------- |
| field absent    | `201`; stored as `[]` (A10, PF7 — the key does not reach the handler) |
| `[]`            | `201`; stored as `[]` (A3, PF9)                                       |
| `["Nina Cole"]` | `201`; stored verbatim, order preserved (A1, PF8)                     |
| `null`          | `201`; stored as `[]` (A11, PF6 — `@IsOptional()` skips `null` too)   |

`"participants": null` behaving as absent is contradiction C4 made deliberate. The reason is
measured, not assumed (probe **PF2**): `durationMinutes` — which carries `@Type(() => Number)` on
top of `@IsOptional()` — also accepts an explicit `null` and passes it through untouched, so
`input.durationMinutes ?? 60` already yields 60 today. `ADR-0017` refuses to give one field a
different null rule from its neighbour. It is documented in `api-contract.md`, so it is a promise
rather than an accident.

**Rejected inputs — measured against this design's exact decorator set (probe F):**

| Sent                                       | Code  | Body                                                                                                                                                                              |
| ------------------------------------------ | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `"x"` (a string, not an array)             | `400` | `{"message":["participants must contain no more than 20 elements","participants must be an array"],"error":"Bad Request","statusCode":400}` (PF14)                                |
| `[1,2]`                                    | `400` | `{"message":["each value in participants must be longer than or equal to 1 and shorter than or equal to 100 characters","each value in participants must be a string"],…}` (PF13) |
| `[""]`, or any element over 100 characters | `400` | `{"message":["each value in participants must be longer than or equal to 1 and shorter than or equal to 100 characters"],…}` (PF10, PF12)                                         |
| 21 or more entries                         | `400` | `{"message":["participants must contain no more than 20 elements"],…}` (PF11)                                                                                                     |
| a valid body plus an unknown key           | `400` | `{"message":["property extra should not exist"],…}` — the unknown key **instead of** the field errors (A8)                                                                        |

`message` is an **array** on these 400s, per invariant 8 and the existing contract.

> Two of these rows differ from `research/probes.md`. Probe A's DTO carried only
> `@IsArray() @IsString({ each: true })`, so a string-not-array printed **one** message (A4, and A12
> on the optional DTO) and a numeric element printed **one** (A5); with `@ArrayMaxSize` and
> `@Length` added, both print **two**. The design's own probe F is the authority for this decorator
> set; probe A remains the authority for the decorators it ran. A case asserts membership in
> `message`, never its length or the order of its entries.

### `GET /meetings` — response only

Path, guard, `limit` (1-100, default 3), `total` (invariant 4) and the sort (invariant 7) are all
unchanged. Each item in `items` now carries `participants` — the same five keys as above, because
one `MeetingDto` and one mapper serve all three routes.

### Routes table, as it will read

```
| `GET`  | `/meetings`     | `Bearer` | `200`   | `400`,`401` | …              |
| `POST` | `/meetings`     | `Bearer` | `201`   | `400`,`401` | …              |
| `GET`  | `/meetings/:id` | `Bearer` | `200`   | `401`,`404` | `MD-API-…`     |
```

The path must be the literal `` `/meetings/:id` `` in backticks: `AR-API-05` reads the decorator's
string argument verbatim and joins it to the controller prefix
(`research/contract.md` §1), so the document and the code agree only on that exact spelling. The
Cases cells are filled by enumeration, not ranges — see C1 in §6.

## 4. Data

### `Meeting`, after the change

| Field              | Type       | Format / constraint                                                                | Leaves the API?                      |
| ------------------ | ---------- | ---------------------------------------------------------------------------------- | ------------------------------------ |
| `id`               | `string`   | `mtg-<owner>-<n>` in the seed — **`docs/data-model.md:31` keeps this wording**     | yes                                  |
| `ownerId`          | `string`   | a `User.id`; from the token, never the body                                        | **never** — `toMeetingDto` strips it |
| `title`            | `string`   | 3-100 characters                                                                   | yes                                  |
| `startsAt`         | `string`   | ISO 8601, UTC, always `…Z`                                                         | yes                                  |
| `durationMinutes`  | `number`   | integer, 15-480; optional on input, default 60                                     | yes                                  |
| **`participants`** | `string[]` | **0-20 free-form strings, 1-100 characters each; optional on input, default `[]`** | yes                                  |

`MeetingDto = Omit<Meeting, 'ownerId'>` is unchanged as a rule and now resolves to five fields. The
mapper strips `ownerId` and nothing else.

**The `id` row above is the entity as the code stands, not a proposed edit.** `docs/data-model.md`
gains exactly two things — the `participants` row and the `Participants` value-format row — and its
`id` row (`:31`) is left **verbatim**. Saying so matters because §8 parks the two-id-format question
as undecided: a planner copying this table into the document would otherwise settle it silently, in
the direction of "both formats are fine", which is not this design's call to make (review finding
F1).

`docs/data-model.md`'s "Value formats" table gains: **Participants** — "free-form strings, a name or
an email, 1-100 characters, at most 20 per meeting. Never a `User.id`, never validated as an email,
never trimmed or deduplicated: like a password, trimming would silently alter what was sent."

### Copying, because the store is in-memory

`byOwner` returns `{ ...meeting }` today (`research/code.md` §1) — a shallow copy, which was
complete while every field was a scalar. With an array field a shallow copy **shares the array**, so
a caller can mutate stored data through a returned object.

There are **four** such paths, not two (review finding F5). Each copies as
`{ ...meeting, participants: [...meeting.participants] }`:

| Path                                    | Why it matters                                                                                                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| the constructor's `{ ...seed }` (`:39`) | the sharpest one: a shallow copy shares the array with the module-level `SEED_MEETINGS` constant, so a mutation through any later read could reach the seed itself |
| `byOwner` (`:83-87`)                    | the existing copy point, cited in the code's own comment                                                                                                           |
| `create`'s return (`:77-79`)            | it hands back the object it just stored                                                                                                                            |
| the new `findById`                      | the by-id read                                                                                                                                                     |

Harmless over HTTP today — the mapper serializes and nothing holds the object — which is exactly why
an implementer following a two-item list would leave the other two sharing a reference. This is
design reasoning from `research/code.md` §1 plus `ADR-0007`, not a research finding.

### Seed — exact values

The seven rows keep their existing `id`/`ownerId`/`title`/`startsAt`/`durationMinutes`
(`research/code.md` §1) and gain:

| id                | title                  | `participants`                                                 |
| ----------------- | ---------------------- | -------------------------------------------------------------- |
| `mtg-teacher-1`   | Intro to algebra       | `['Nina Cole', 'guest.parent@purpleschool.test']`              |
| `mtg-teacher-2`   | Homework review        | `['Nina Cole']`                                                |
| `mtg-teacher-3`   | Geometry workshop      | `['Nina Cole', 'Omar Vance', 'guest.tutor@purpleschool.test']` |
| `mtg-teacher-4`   | Pre-exam consultation  | `[]`                                                           |
| `mtg-teacher-5`   | Module wrap-up session | `['Nina Cole', 'Omar Vance']`                                  |
| `mtg-planner-1`   | Sprint retro           | `['Ruth Delgado', 'guest.coach@purpleschool.test']`            |
| `mtg-organizer-1` | Team standup           | `['Ruth Delgado', 'Omar Vance']`                               |

Why these and not others:

- One meeting (`mtg-teacher-4`) has **`[]`**, so "no participants recorded" is a seeded state rather
  than something only a mutating case can reach — the same reason `student` has zero meetings.
- Sizes vary (0, 1, 2, 3) on a read-only owner, so a case can assert an exact array without creating
  anything.
- Names and emails are mixed, because the requester's answer is "names or emails".
- **No participant string is any `SEED_USERS[*].name` or `.email`.** The emails are deliberately not
  seed logins (`guest.*@purpleschool.test`) — a seeded login in a meeting body would collide with
  `SEC-API-01`'s "this 401 body contains no teacher email" (`security.api.spec.ts:77`) and with the
  heading locators of `HD-FN-02`/`HD-FN-09` if participants are ever rendered. The **names** avoid
  `Anna Teacher`, `Ivan Student`, `Maria Planner` and `Peter Organizer` for the same reason and not
  a weaker one: a future "no other user's identity appears in this owner's data" check, or a
  `getByText` on a rendered list, fails the same way on a name as on an address. The earlier draft
  guarded the emails and reused the names — the same collision class, caught in review.
- No string contains `ownerId`, `passwordHash`, `password` or `Passw0rd!`: `HD-API-01` asserts the
  raw response text carries none of them (`research/tests.md` §1), and `SECRET_MARKERS`
  (`e2e/security/security.api.spec.ts:43`) is the literal list — `['scrypt', 'passwordHash',
'password', SEED_USERS.teacher.password]`, confirmed in the code at design time.
- The values are absolute and dateless. Nothing is derived from `Date.now()`.

`e2e/fixtures/seed.ts` gains the same values — `ADR-0007`'s mirror rule — and `SM-API-03` is
extended to compare them, because today it reads nothing but `title` (§2, and review blocker B1).
The fixture constant's shape is the tester's call; the values are these.

### Which owner mutating cases may use

Unchanged: `teacher` and `student` are read-only, `planner` is the sandbox for `*.api.spec.ts` and
`organizer` for `*.functional.spec.ts` (`research/contract.md` §5). Every case created for this
change follows that split, and created meetings keep the 2030 date constant.

**Ids are never hard-coded in a case.** The e2e fixture holds no meeting id and deliberately imports
nothing from `apps/api` (`e2e/fixtures/seed.ts` header). A by-id case obtains its id from
`GET /meetings` first; a cross-owner case takes one owner's id that way and requests it with the
other owner's token.

## 5. Alternatives rejected

| Alternative                                                                             | Why not                                                                                                                                                                                                                                                                                                                                                                                                              |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`participants` as a relation to `User`** (ids, or a join entity)                      | Ruled out by the requester, and the store has no way to enforce referential integrity: services own plain arrays seeded at module init (`ADR-0007`). It would also make a participant necessarily an account holder, which is not what a meeting note is.                                                                                                                                                            |
| **`participants` as objects `{ name, email }`**                                         | The stronger case for it — that a name and an address are different things and a string conflates them — is real, and it still loses: the sketch writes `participants[]`, the requester answered "free-form strings", and it would open the first nested-validation site in the repository for a requirement nobody has stated.                                                                                      |
| **`participants` required on `POST /meetings`**                                         | The sketch lists it among the accepted fields, so requiring it is a defensible reading. But probe A2 shows an absent array without `@IsOptional()` gives 400, and the shipped Server Action sends `{ title, startsAt }` (`research/code.md` §3): creating a meeting from the UI would break the day this lands (`HD-FN-07`).                                                                                         |
| **`@ValidateIf` so that an explicit `null` 400s**                                       | It is the more precise validation, and it would make `participants` the only field where `null` is rejected while `durationMinutes: null` is accepted — now measured rather than assumed (probe **PF2**). One rule per concept beats a locally better rule (invariant 2 names `@IsOptional()` literally).                                                                                                            |
| **A separate `MeetingDetailDto` with participants, leaving the list's four keys alone** | It avoids touching `HD-API-01`/`HD-API-20` and keeps list payloads small — a real benefit at a real size. It costs two mappers and two key-set truths for one entity, breaks `MeetingDto = Omit<Meeting,'ownerId'>` (`docs/data-model.md:37`), and forces `POST /meetings` to hide what it was just sent. Two assertions are cheaper.                                                                                |
| **Unbounded `participants` (no `@ArrayMaxSize`/`@Length`)**                             | It matches probe A exactly and invents no number. But every other value in this model is bounded — `title` 3-100, `durationMinutes` 15-480, `limit` 1-100 — and an unbounded array is the one field where a request body would have no ceiling. The numbers themselves are assumption **A2** and are revisable in the contract without superseding `ADR-0017`; that the field is bounded **at all** is the decision. |
| **`@Param('id', ParseUUIDPipe)`**                                                       | It is the idiomatic Nest guard against junk ids. Here it rejects **every seeded id** (`mtg-teacher-1` is not a UUID, `research/contract.md` §12) and introduces a 400 whose `message` is a string (probe D2), contradicting invariant 8 — contradiction C2 turned into shipped behaviour.                                                                                                                            |
| **Prefix runtime ids (`mtg-<uuid>`) so one format is canonical**                        | It would settle Still-unknown #6 and satisfy `docs/data-model.md:54` literally. It also changes `create()` behaviour that `HD-UT-07` asserts, for a divergence that predates this change and that the by-id route does not depend on — the route treats `:id` as opaque. Parked in §8 rather than smuggled in here.                                                                                                  |
| **403 for another owner's meeting**                                                     | It is the honest status for "exists, not yours", and it is exactly the enumeration oracle invariant 6 refuses for accounts. The requester chose 404 (`ADR-0018`).                                                                                                                                                                                                                                                    |
| **`new NotFoundException()` without a message**                                         | Shorter, and it returns two keys with no `error` (probe B2) — `SEC-API-06` states every error body holds exactly three.                                                                                                                                                                                                                                                                                              |
| **C3: patch the missing `401`s into `apps/api/README.md`**                              | Cheapest, and it restores a correct unchecked copy — which is the state that drifted in the first place. `FX-023` and `FX-027` are both that story (`ADR-0019`).                                                                                                                                                                                                                                                     |
| **C3: make `apps/api/README.md`'s table machine-checked as well**                       | It keeps the convenience of a local table and closes the drift. It also means writing a parser to reconcile two deliberately different wordings, and leaves two copies in place — a check written to preserve a duplicate (`ADR-0019`).                                                                                                                                                                              |
| **C1: correct the Cases column text and add no check**                                  | It is the smallest fix and matches the requester's minimum. Nothing then stops the next edit re-breaking it — the column has never been checked, which is why four IDs could be cited for two years. See §6.                                                                                                                                                                                                         |
| **C1: delete the Cases column**                                                         | A column nothing checks is a liability, so deleting it is coherent. But it is the contract's own index into the suite — the thing that lets a reader of a route find its cases — and `ADR-0019`'s whole argument is that this document owns that index.                                                                                                                                                              |
| **A `/meetings/[id]` page in `apps/web`**                                               | It is what a user would eventually want. The requirement names no page, no route exists to extend, and it drags in `BL-023` (HeroUI v3, which needs its own ADR and moves the functional cases). A separate change with its own requirement.                                                                                                                                                                         |
| **Extending `HD-` rather than opening the `MD-` prefix**                                | The new routes touch the same module, so `HD-` is arguable. But `HD` is the _home dashboard_ feature, the new cases live in their own feature folder, and `SEC-API-07` already shows a route's cases spanning features. A prefix follows the feature, not the URL.                                                                                                                                                   |
| **`HD-UT-17`+ for the `findById` units, in `home-dashboard.unit.cases.md`**             | It keeps one cases doc per spec file, which is tidier and is how the repository reads today. It also files this change's units under the dashboard feature, so `pnpm test:home-dashboard` runs them and `pnpm test:meetings-detail` cannot — the prefix rule inverted for a filing convenience. Two docs may name one spec (§2).                                                                                     |
| **A functional pair in `e2e/regression/meetings-detail/`**                              | Symmetry with the other feature folders, and rules 1-3 would be satisfied. Nothing requires it (they are pairing rules, not existence rules), and with no page the spec could only invent browser cases for a UI that did not change — a task that cannot be done honestly is worse than an asymmetric folder.                                                                                                       |
| **Reusing the dead numbers `HD-API-11`, `12`, `18`, `19`**                              | They would make the ranges in the contract true with no other edit. `home-dashboard.api.cases.md:16` says they are "**never reused**", and `plan-review-3.md:147` is a recorded blocker for having reused `HD-API-18` once already. The document is wrong, not the numbering.                                                                                                                                        |

## 6. Decisions and ADRs

Three records, written before the code, `proposed` until this design passes its gate — the lead
flips them to `accepted` in the file and in the index row.

- **`ADR-0017` — Participants are free-form strings on the meeting, not a relation.** The storage
  shape, the validation, and the treatment of an absent/`null` value. Governs §3's `POST /meetings`
  entry and §4.
- **`ADR-0018` — A record the caller does not own answers 404, never 403.** The status, the exact
  body, the mandatory `NotFoundException` call form, and the rule that the two 404 situations share
  one code path. Reaches past this change: `BL-007`'s edit and delete inherit it.
- **`ADR-0019` — The route listing lives in the API contract alone; other documents link.** The
  cause-side fix for C3.

### C1 — the Cases column cites four case IDs that do not exist

**Decided: the dead numbers are not reusable, the cells are corrected by enumeration, and the column
gets a check.**

- `home-dashboard.api.cases.md:16` states `11`, `12`, `18`, `19` are "**never reused**", and
  `docs/plans/plan-review-3.md:147` is a recorded blocker raised for reusing `HD-API-18` once
  (`research/README.md`, C1 and Still-unknown #8). The document's ranges are wrong; the numbering is
  not.
- The meetings cells become explicit enumerations: `GET /meetings` → `HD-API-01`…`10`;
  `POST /meetings` → `HD-API-13`…`17`, `HD-API-20`. Those are the sixteen IDs the research's own
  grep returned (C1, suite side). A range may only span numbers that all exist.
- **New check `AR-API-09`** in `e2e/architecture/architecture.api.spec.ts`: every case ID cited in
  the Cases column — a bare ID, or every number a range spans — exists verbatim in some
  `e2e/**/*.cases.md`. This is an extension of the existing architecture meta-test and needs no ADR:
  `BL-019` proposes the same kind of extension and its "Conflicts with" cell reads "no; extends the
  architecture meta-test" (`research/history.md`). `ADR-0010` is the standing reason to prefer a
  check over a convention.
- The reverse direction is **not** checked: a case may exist without being cited (`SEC-API-07`
  exercises `POST /meetings` and belongs to the security feature).

**Warning to whoever implements it.** Confirmed at design time, not by the research: the same defect
sits in the two `/auth/*` rows. `grep -o 'AL-API-[0-9]*' e2e/regression/auth-login/auth-login.api.cases.md | sort -u`
returns `01`-`04`, `07`, `08`, `10`, `11`, `13`, `14`, `15` — so `AL-API-01`…`14` claims five IDs
that do not exist (`05`, `06`, `09`, `12`) and misses one that does (`15`), and `AL-API-10`…`14`
claims `12`. `AR-API-09` will therefore go red on **four** rows, not two, and all four cells must be
re-derived from the case files. That is the check doing its job on first run. This paragraph is a
design-time finding, produced by running the same command the research ran for the `HD-` rows; it is
labelled as such because it is in no research file.

C1 gets its own `FX-` ledger entry, found by: research sweep of this change.

### C3 — two route listings, one checked

**Decided: fix the cause. `ADR-0019`.** The Endpoints table at `apps/api/README.md:12-20` and the
error-shapes paragraph below it are replaced by a link to `docs/api-contract.md`; the README keeps
what is local to the package.

Scope line, drawn deliberately: `ADR-0019` governs **enumerations** of the contract. The three
"easy to break unnoticed" bullets further down that README restate invariants 1, 4 and 5 in their
own words — the same class of duplication, but explanation rather than enumeration. They stay, and
they are named in §8 as residual duplication with a backlog candidate rather than left silent.

Sharpened on review finding F3: the paragraph being removed
(`apps/api/README.md:31-34`) is **two** things — the 400-array/401-string enumeration, and the
`APP_PIPE`-not-`useGlobalPipes` rationale, which is explanation and by the boundary above would
stay. It goes with the enumeration it sits inside, because it is a verbatim restatement of
invariant 3 that also lives in `docs/architecture.md`'s patterns table: **an explanation that only
repeats an invariant follows the enumeration it is attached to.** `ADR-0019` says so in as many
words, so the boundary and what it deletes agree.

C3 gets its own `FX-` ledger entry, found by: research sweep of this change.

### Ledger and the measured literals

- **Three ledger entries, not two:** an `FT-` for the feature (`participants[]` and the by-id route
  — `FT-002` is the last shipped), plus the two `FX-` above. The earlier draft named only the `FX-`
  pair, which would have shipped a feature with no `FT-` row.
- **Who writes the measured 400 messages into the contract** (review finding F8): the exact strings
  are now in §3 and in probe F, and `docs/api-contract.md` owns error bodies under `ADR-0019`, so
  they go into its `POST /meetings` entry **with the code, by whoever adds the decorators** — not
  into a case file first. The case then asserts against the contract's text. If an implementation
  run prints anything other than what probe F printed, the contract is what gets corrected, and the
  difference is worth a line in the report: it would mean a dependency moved under us.

## 7. Impact on what already exists

**Cases that must change (they will fail, and that is the point)**

| Case         | Where                            | Why                                                                                                    |
| ------------ | -------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `HD-API-01`  | `home-dashboard.api.spec.ts:102` | `Object.keys(item).sort()` against `MEETING_KEYS`; every list item now carries `participants`          |
| `HD-API-20`  | `home-dashboard.api.spec.ts:408` | the same assertion on the `POST /meetings` response body                                               |
| `SEC-API-09` | `security.api.spec.ts:259-281`   | not broken by the change; extended by it — its text says the invariant must hold once resources appear |

Those two are the only assertions in the repository that pin the meeting key set
(`research/tests.md` §2). Both change to the five-key array; nothing else in `HD-API-*`,
`HD-FN-*`, `HD-UT-*`, `SM-*` or `SEC-*` asserts a key set of a meeting.

**Cases that stay green, checked one by one** (`research/tests.md` §1-2)

- `HD-API-13` — checks individual properties of the created meeting, not a key set.
- `HD-API-15` — empty body `{}` → 400 whose `message` **contains** `title` and `startsAt`;
  `participants` being optional adds no entry (probe A10), and `contains` would tolerate one anyway.
- `HD-API-16`, `SEC-API-07` — extra-field rejection on the **request** DTO; probe A8 shows an
  unknown key still wins over any array error.
- `HD-API-03`…`10` — counts, ordering, `total`, all value assertions (invariant 4 is untouched: no
  new field affects `countByOwner`).
- `SM-API-03` — **not broken** by the field as written, since it reads only `title`. It is
  nonetheless **extended** by this change so that the fixture's participant values are compared
  against the API's (§2, blocker B1); that is an addition, not a repair.
- `HD-FN-*` — no `Object.keys` assertion exists in the functional spec; the UI reads `title`,
  `startsAt`, `durationMinutes` only, and the create form still submits two fields.
- `HD-UT-01`…`09` — service units; `findRecent`, `countByOwner`, `create` keep their signatures and
  their behaviour. `create` gains one normalized field.
- `SEC-API-06` — satisfied by construction: the new 404 carries exactly `statusCode`/`message`/
  `error` (probe B1), and the Express fallback it samples today is unchanged (probe C7).
- `AL-*` — untouched by the code change; their **Cases cells** in the contract move under C1 (§6).

**Invariants this change touches**

| #   | How                                                                                                                                                                                      |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2   | `participants` is optional and therefore carries `@IsOptional()`; probes A2 and PF6/PF7 are the measurement                                                                              |
| 4   | untouched — `total` stays `countByOwner`; the by-id route computes no total                                                                                                              |
| 5   | `findById` takes the owner from `@CurrentUser()`; the id comes from the path, the owner never does                                                                                       |
| 6   | extended in spirit to records: the 404 branches are indistinguishable (`ADR-0018`)                                                                                                       |
| 8   | a third documented shape appears — 404 with a **string** `message`. `ADR-0018` adds the body to the contract's table, and the invariant's own sentence gains "or a 404" (§2, finding F9) |
| 16  | `PROTECTED_ROUTES` gains `GET /meetings/:id`, mechanically required by `AR-API-06`. `PROTECTED_PAGES` unchanged — no page                                                                |
| 19  | untouched: nothing new crosses into a client component                                                                                                                                   |

**Meta-tests and mechanical gates**

- `AR-API-05` fails until the Routes table carries `` `GET` | `/meetings/:id` `` exactly.
- `AR-API-06` fails until `PROTECTED_ROUTES` carries the literal path.
- `suite-integrity` rules 2-3 require each of the new folder's files to have its pair — which is why
  the folder is three files and not four (§2). Rules 7-8 hold with `meetings.service.spec.ts` named
  in two cases docs. The prefix test fails until `MD` joins `KNOWN_CASE_PREFIXES`.
- `AR-API-09` is new and will go red on four Routes rows until their Cases cells are re-derived (§6).
- `AR-API-03` requires the three new ADRs to appear in `docs/adr/README.md` — `pnpm adr:new` already
  wrote those rows.
- **`SM-API-03` does not currently read participants and will not fail on their drift** — it asserts
  totals and titles only (`e2e/smoke/seed.api.spec.ts:36-76`, type at `:14-17`). Extending it is
  part of this change (§2, blocker B1); until that extension lands, the fixture mirror is unguarded.
- `e2e/README.md`'s suite index gains the new feature and its `pnpm test:meetings-detail` row
  (`e2e/README.md:38-41`, `research/tests.md` §3), and `package.json` gains the script.

**Backlog**

- `BL-007` (editing and deleting a meeting): its "Conflicts with" cell loses the
  `apps/api/README.md` clause under `ADR-0019`, and it inherits `ADR-0018` for its own by-id
  authorization.
- `BL-023` (HeroUI v3): **not touched** — this change puts nothing on screen.
- `BL-019` (a drift check for `docs/data-model.md`): unaffected, and `AR-API-09` is the same kind of
  extension it proposes.

## 8. Open questions and deliberate omissions

**Assumptions this design makes** — labelled, because they are not in `research/`:

- **A1 — `durationMinutes` stays.** The sketch omits it; the shipped endpoint accepts it as an
  optional field; the question was never put to the requester
  (`research/README.md`, "Clarifications", closing note). Removing a shipped optional field is a
  contract break that would take `HD-API-13`, `HD-API-20` and the documented default of 60 with it.
  This design changes nothing about it. **If the requester meant the sketch as the complete request
  shape, this assumption is wrong and the answer is needed before implementation.**
- **A2 — the bounds `@ArrayMaxSize(20)` and 1-100 characters per participant.** Nobody asked for a
  limit. They are chosen for consistency with every other bounded value in `docs/data-model.md`, and
  a reviewer who prefers an unbounded array has a coherent position (§5). **`ADR-0017` marks the
  numbers revisable**: changing 20 to 50 is a contract edit in `docs/api-contract.md` and
  `docs/data-model.md`, not a superseding ADR. What the record freezes is that the field is bounded,
  not by how much — otherwise an admitted guess would sit permanently inside a document that is
  never edited in substance.
- **A3 — the seed participant strings** in §4. Invented for this change; constrained by the rules
  listed beside them.
- **A4 — the `MD` prefix and the `e2e/regression/meetings-detail/` folder name.** No convention
  document addresses either (`research/README.md`, Still-unknown #7).
- **A5 — the participants field name and its position in `MeetingDto`.** The sketch's spelling,
  taken as given.

**Left unsettled on purpose**

- **The two id formats.** `docs/data-model.md:54` wants a `mtg-` prefix; `create()` issues a bare
  `randomUUID()` (`research/contract.md` §12, Still-unknown #6). The by-id route treats `:id` as
  opaque, so it works with both and this design does not choose. It is a pre-existing divergence
  between a document and the code, and it wants a lead's routing decision — plausibly an `FX-`, but
  a reading of `docs/data-model.md:54` ("opaque … never guessable-by-increment", which a UUID
  satisfies) could as easily call it compliant. **Not decided here.**
- **Response-time equality for the by-id route.** `ADR-0018` makes the two 404s identical in body,
  status and code path, but does not equalize timing; `docs/security.md`'s threat model names
  timing enumeration for **accounts** only (invariant 18). Named so its absence is a decision.
- **The rest of `apps/api/README.md`.** Three copies survive `ADR-0019` because it governs
  enumerations, not explanations — and all three deserve a backlog row rather than silence:
  1. the three "easy to break unnoticed" bullets, restating invariants 1, 4 and 5 in their own words;
  2. the storage-and-seed note, restating `ADR-0007`;
  3. **the seeded-users table (`apps/api/README.md:46-51`)** — added on review finding F4 and
     confirmed at design time: it repeats the four users, their meeting counts and their sandbox
     roles from `docs/data-model.md:82-88`, and prints `Passw0rd!` in a column of its own where the
     corpus table carries the display name instead. The largest remaining copy in that file, outside
     `ADR-0019`'s contract scope, and the one most likely to be read and believed while stale.
- **Validation coverage that was already missing.** No case exists for `title` bounds, a non-ISO
  `startsAt`, or `durationMinutes` out of range (`research/tests.md` §4). This change adds cases for
  its own field and does not backfill those; naming it here so the gap is not re-discovered as a
  finding of this change.
- **No web surface.** Justified in §2. `apps/web/src/lib/types.ts` is the only file that moves, and
  no UI renders `participants`.
- **`ApiFetchOptions.method`** (Still-unknown #9) does not arise: no web code calls the new route.

**Questions for the lead, not answerable from `research/`**

1. **A1 above** — is `durationMinutes` meant to survive the sketch? A yes needs no action; a no is a
   contract break and a different design.
2. **The two id formats** — route it as an `FX-`, a `BL-` row, or leave it.
3. **`AR-API-09` will turn two unrelated `/auth/*` rows red** (§6). Fixing them is bookkeeping in a
   feature branch and touches another feature's documentation. Acceptable inside this change, or a
   separate `FX-` commit first?
