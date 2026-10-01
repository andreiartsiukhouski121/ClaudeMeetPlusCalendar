# API contract

Every endpoint `apps/api` exposes: what it takes, what it answers, what it does internally, and what
depends on it.

Neighbours: [`architecture.md`](architecture.md) (why the API looks like this),
[`data-model.md`](data-model.md) (the shapes), [`adr/`](adr/README.md) (the decisions), `CLAUDE.md`
(invariants 1–8).

Every statement of fact here carries a key (`FACT-2000`…) and names its source; anything without a
key is reasoning and must not be cited as fact (`ADR-0021`).

- `FACT-2000` The executable truth of this contract is `e2e/regression/**/*.api.spec.ts`; this file
  is its prose companion and the planning context. — `ADR-0008`
- `FACT-2001` `Content-Type: application/json` on everything except `GET /`. —
  `apps/api/src/main.ts`, `SM-API-01`
- `FACT-2002` No CORS and no global prefix. — `ADR-0005`
- `FACT-2003` The base URL is `http://127.0.0.1:3001` in development and `:3101` under Playwright. —
  `apps/api/src/main.ts`, `playwright.config.ts`

## Routes

- `FACT-2004` The table below is compared against the Nest controllers in both directions: a route
  added to the code without a row here, or a row without a route, fails `pnpm verify`. — `AR-API-05`
- `FACT-2005` Guarded routes are additionally matched against `PROTECTED_ROUTES`. — `AR-API-06`,
  invariant 16

**Source:** `apps/api/src/**/*.controller.ts`, checked by `AR-API-05`. The `Key` column is last in
this one table because `AR-API-09` reads the `Cases` column by position
(`e2e/architecture/architecture.api.spec.ts`, `violationsCasesCitations`).

| Method | Path            | Guard    | Success | Errors      | Cases                                                | Key         |
| ------ | --------------- | -------- | ------- | ----------- | ---------------------------------------------------- | ----------- |
| `GET`  | `/`             | none     | `200`   | —           | `SM-API-01`                                          | `FACT-2006` |
| `POST` | `/auth/login`   | none     | `200`   | `400`,`401` | `AL-API-01`…`04`, `AL-API-07`…`08`, `AL-API-10`…`11` | `FACT-2007` |
| `GET`  | `/auth/me`      | `Bearer` | `200`   | `401`       | `AL-API-10`, `AL-API-13`…`15`                        | `FACT-2008` |
| `GET`  | `/meetings`     | `Bearer` | `200`   | `400`,`401` | `HD-API-01`…`10`                                     | `FACT-2009` |
| `POST` | `/meetings`     | `Bearer` | `201`   | `400`,`401` | `HD-API-13`…`17`, `HD-API-20`                        | `FACT-2010` |
| `GET`  | `/meetings/:id` | `Bearer` | `200`   | `401`,`404` | `MD-API-01`…`07`                                     | `FACT-2011` |

## Error shapes

**Source:** `HttpException.createBody` in `@nestjs/common`, read rather than recalled; invariants 1
and 8.

| Key         | Situation                                             | Code  | Body                                                                                            |
| ----------- | ----------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------- |
| `FACT-2012` | `ValidationPipe` rejected the payload                 | `400` | `{"message": ["email must be an email", …], "error": "Bad Request", "statusCode": 400}`         |
| `FACT-2013` | An extra field under `forbidNonWhitelisted`           | `400` | `{"message": ["property ownerId should not exist"], "error": "Bad Request", "statusCode": 400}` |
| `FACT-2014` | Bad credentials                                       | `401` | `{"message": "Invalid email or password", "error": "Unauthorized", "statusCode": 401}`          |
| `FACT-2015` | Missing or invalid token                              | `401` | `{"message": "Authentication required", "error": "Unauthorized", "statusCode": 401}`            |
| `FACT-2016` | No meeting with that id, or one owned by another user | `404` | `{"message": "Meeting not found", "error": "Not Found", "statusCode": 404}`                     |

- `FACT-2017` `message` is an array on a 400 and a string on a 401 and on a 404. — invariant 8

> **Rationale — not a fact.** This project broke on the error shapes twice. Do not write a client
> that assumes one shape.

---

## `GET /` — liveness

- `FACT-2018` No auth. Answers `200 text/plain: Hello World!`. — `SM-API-01`

> **Rationale — not a fact.** It exists so the suite can tell "the server is up" from "the server is
> up and correct" before running dozens of cases. A global prefix would break it, which is one of the
> reasons there is none (`ADR-0005`).

## `POST /auth/login` — sign in

- `FACT-2019` Request: `{ "email": string, "password": string }`, validated by `LoginDto` with
  `@IsEmail()` on the email and a non-empty string on the password. —
  `apps/api/src/auth/dto/login.dto.ts`
- `FACT-2020` There are no password strength rules on this route. —
  `apps/api/src/auth/dto/login.dto.ts`, `AL-API-02`
- `FACT-2021` Answers `200`, not `201`: the handler carries `@HttpCode(HttpStatus.OK)`. —
  invariant 1, `AL-API-01`
- `FACT-2022` Body: `{ "accessToken": string, "user": { "id", "email", "name" } }`, with no
  `passwordHash` — the mapper strips it. — `AL-API-11`

**Logic — source:** `apps/api/src/auth/auth.service.ts`.

| Key         | Step                                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------------- |
| `FACT-2023` | Normalize the email (lowercase, trimmed) and look the user up                                                 |
| `FACT-2024` | Always verify the password: against the real hash when the user exists, against a dummy hash when it does not |
| `FACT-2025` | The dummy hash is computed once at module load from random bytes                                              |
| `FACT-2026` | On either failure throw `401` with the **same** message                                                       |
| `FACT-2027` | Sign `{ sub: user.id, email }` and return it with the public user                                             |

- `FACT-2028` Before the dummy-hash verification existed, unknown emails answered in 52 ms against
  86–114 ms for a wrong password, and accounts were enumerable by clock. — `SEC-API-05`,
  invariants 6 and 18
- `FACT-2029` There is no rate limiting: brute force is currently unlimited. — `BL-001`

> **Rationale — not a fact.** Steps 2 and 3 are one rule, not two: an identical message alone left
> the timing oracle open. Strength rules are absent because they would turn a wrong password into a
> `400` and make "an error is shown on bad credentials" unverifiable. `BL-001` is the only open item
> considered a production blocker.

## `GET /auth/me` — the current profile

- `FACT-2030` Guard: `JwtAuthGuard` on the method. Answers `200 { id, email, name }`. —
  `apps/api/src/auth/auth.controller.ts`, `AL-API-13`
- `FACT-2031` The id is read from `@CurrentUser()` — that is, from the signed token — and the user is
  loaded with it. — invariant 5, `apps/api/src/auth/auth.controller.ts`
- `FACT-2032` If the token is valid but the user is gone from the store, the answer is `401`, never a
  `500`. — `AL-API-15`
- `FACT-2033` `lib/dal.ts` calls this on every protected page render, and a `401` here is what sends
  the visitor through `/auth/session-expired`. — invariant 17, `apps/web/src/lib/dal.ts`

> **Rationale — not a fact.** A wiped store after a restart is not a server fault the client can act
> on, so it answers 401 rather than 500.

## `GET /meetings` — the owner's recent meetings

- `FACT-2034` Guard: `JwtAuthGuard` on the whole controller class, not registered globally. —
  `apps/api/src/meetings/meetings.controller.ts`
- `FACT-2035` Query: `limit?`, integer, `1..100`. — `apps/api/src/meetings/dto/list-meetings.dto.ts`
- `FACT-2036` `@IsOptional()` on `limit` is mandatory: without it a request with no `limit` runs
  through `@IsInt/@Min/@Max` and answers `400`. — invariant 2, `HD-API-10`
- `FACT-2037` The default of `3` is supplied by the service, not the DTO. —
  `apps/api/src/meetings/meetings.service.ts`
- `FACT-2038` Body: `{ items: MeetingDto[], total: number }`; each item carries the same five keys
  `GET /meetings/:id` returns, `participants` included. — `HD-API-01`, `FACT-1012`
- `FACT-2039` Logic: filter by `ownerId` from the token → sort `startsAt` descending with `id`
  ascending as the secondary key → slice by `limit`. — invariant 7,
  `apps/api/src/meetings/meetings.service.ts`
- `FACT-2040` `total` is `countByOwner`, the owner's full count, never `items.length`. —
  invariant 4, `HD-API-05`
- `FACT-2041` Comparison is on parsed milliseconds rather than on strings. —
  `apps/api/src/meetings/meetings.service.ts`

> **Rationale — not a fact.** Registering the guard globally would break `GET /` and
> `POST /auth/login`. A DTO default does not survive `plainToInstance` predictably, which is why the
> service supplies it. The secondary sort key is not decoration: with equal dates the order would
> fall back to insertion and `HD-FN-05` would flake. Milliseconds rather than strings, because a
> client may send an offset date (`+03:00`) that sorts wrongly as text.

## `POST /meetings` — create a meeting

- `FACT-2042` Guard: the class-level `JwtAuthGuard`. Answers `201` — POST's default — and there is
  no `@HttpCode` on this handler. — `HD-API-13`
- `FACT-2043` Request: `{ title, startsAt, durationMinutes?, participants? }`. —
  `apps/api/src/meetings/dto/create-meeting.dto.ts`

**Source:** `apps/api/src/meetings/dto/create-meeting.dto.ts`, `meetings.service.ts`.

| Key         | Field             | Rule                                                                                                  |
| ----------- | ----------------- | ----------------------------------------------------------------------------------------------------- |
| `FACT-2044` | `title`           | string, 3–100 characters                                                                              |
| `FACT-2045` | `startsAt`        | ISO 8601                                                                                              |
| `FACT-2046` | `durationMinutes` | optional integer 15–480; the service defaults it to 60                                                |
| `FACT-2047` | `participants`    | optional array of strings, at most 20 entries, each 1–100 characters; the service defaults it to `[]` |

- `FACT-2048` There is no `ownerId` field, and `forbidNonWhitelisted` rejects an attempt to send one
  with `400 property ownerId should not exist`. — invariant 5, `HD-API-16`, `HD-API-17`
- `FACT-2049` `durationMinutes` carries `@IsOptional()`; the shipped "New meeting" form omits the
  field. — `HD-API-20`
- `FACT-2050` `participants` carries `@IsOptional()` for the same reason: the shipped form sends
  `{ title, startsAt }` only. — invariant 2, `ADR-0017`

**`participants` — accepted inputs, all `201`. Source:** `ADR-0017`, probes A10/A11/PF6/PF7.

| Key         | Sent            | Stored                                                               |
| ----------- | --------------- | -------------------------------------------------------------------- |
| `FACT-2051` | field absent    | `[]`                                                                 |
| `FACT-2052` | `[]`            | `[]`                                                                 |
| `FACT-2053` | `["Nina Cole"]` | verbatim, order preserved                                            |
| `FACT-2054` | `null`          | `[]` — an explicit `null` is treated the same as absent (`ADR-0017`) |

**`participants` — rejected inputs, all `400`. Source:** `ADR-0017`, probes PF10–PF14.

| Key         | Sent                                                       | Body                                                                                                                                                                                                            |
| ----------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FACT-2055` | not an array (e.g. a string)                               | `{"message":["participants must contain no more than 20 elements","participants must be an array"],"error":"Bad Request","statusCode":400}`                                                                     |
| `FACT-2056` | an array holding a non-string element                      | `{"message":["each value in participants must be longer than or equal to 1 and shorter than or equal to 100 characters","each value in participants must be a string"],"error":"Bad Request","statusCode":400}` |
| `FACT-2057` | an element under 1 or over 100 characters (including `""`) | `{"message":["each value in participants must be longer than or equal to 1 and shorter than or equal to 100 characters"],"error":"Bad Request","statusCode":400}`                                               |
| `FACT-2058` | more than 20 entries                                       | `{"message":["participants must contain no more than 20 elements"],"error":"Bad Request","statusCode":400}`                                                                                                     |

- `FACT-2059` A case asserts membership in `message`, not its length or the order of its entries. —
  `e2e/regression/meetings-detail/meetings-detail.api.cases.md`
- `FACT-2060` Logic: generate a `randomUUID()` id, take `ownerId` from `@CurrentUser()`, normalize
  `startsAt` to canonical UTC via `new Date(...).toISOString()`, default the duration, default
  `participants` to `[]`, store, and return through `toMeetingDto`, which strips `ownerId`. —
  `apps/api/src/meetings/meetings.service.ts`

> **Rationale — not a fact.** A body may carry more than one of the rejection messages at once, which
> is why the cases assert membership. Normalizing `startsAt` on the way in keeps the store from ever
> holding mixed formats.

## `GET /meetings/:id` — a single meeting

- `FACT-2061` Guard: the class-level `JwtAuthGuard`. No body and no query DTO, so anything sent as a
  query string is ignored. — `apps/api/src/meetings/meetings.controller.ts`, `MD-API-01`
- `FACT-2062` `:id` is not validated: no `ParseUUIDPipe`, no regex, no length rule. —
  `apps/api/src/meetings/meetings.controller.ts`, `MD-API-05`
- `FACT-2063` Body on `200`: a `MeetingDto`, exactly five keys sorted `durationMinutes`, `id`,
  `participants`, `startsAt`, `title`. — `MD-API-01`, `FACT-1011`

```json
{
  "id": "mtg-teacher-1",
  "title": "Intro to algebra",
  "startsAt": "2026-01-12T09:00:00.000Z",
  "durationMinutes": 60,
  "participants": ["Nina Cole", "guest.parent@purpleschool.test"]
}
```

- `FACT-2064` `401` (no token, or a broken one):
  `{"message":"Authentication required","error":"Unauthorized","statusCode":401}`, answered by the
  guard before the handler runs. — `MD-API-06`, `FACT-2015`
- `FACT-2065` `404` (no meeting with that id, or one owned by another user — one code path,
  byte-identical): `{"message":"Meeting not found","error":"Not Found","statusCode":404}`, from
  `new NotFoundException('Meeting not found')`. — `ADR-0018`, `MD-API-03`, `MD-API-04`
- `FACT-2066` The no-argument `NotFoundException()` form is forbidden: it drops `error` and breaks
  the error-shape rule. — `ADR-0018`, `FACT-2017`
- `FACT-2067` There is no `400` on this route. — `MD-API-05`
- `FACT-2068` `GET /meetings/a/b` falls through to Express's own 404 handler, not to any Nest
  handler: `{"message":"Cannot GET /meetings/a/b",…}`, three keys. — `MD-API-07`

> **Rationale — not a fact.** Every seeded id is `mtg-<owner>-<n>`-shaped rather than a UUID, so a
> validating pipe would 400 the seed instead of 404-ing an unknown id — and its 400 would carry a
> string `message`, contradicting `FACT-2017`. A malformed id is simply an id no meeting has.

---

## Who calls what

**Source:** `apps/web/src/lib/**`, `playwright.config.ts`.

| Key         | Caller                                            | Endpoint                | When                                   |
| ----------- | ------------------------------------------------- | ----------------------- | -------------------------------------- |
| `FACT-2069` | `lib/actions/auth.ts` → `loginAction`             | `POST /auth/login`      | the login form is submitted            |
| `FACT-2070` | `lib/dal.ts` → `getCurrentUser`                   | `GET /auth/me`          | every protected page render            |
| `FACT-2071` | `lib/dal.ts` → `getMeetings`                      | `GET /meetings?limit=3` | the dashboard renders                  |
| `FACT-2072` | `lib/actions/meetings.ts` → `createMeetingAction` | `POST /meetings`        | the "Create meeting" form is submitted |
| `FACT-2073` | Playwright `request` fixture                      | all of them             | the `api` project                      |

- `FACT-2074` Nothing else may call Nest; the browser never does. — `ADR-0002`, `FACT-0009`,
  `SEC-FN-03`

> **Rationale — not a fact.** A second `fetch` helper alongside `api-client.ts` is a defect, not a
> shortcut.

## Adding an endpoint

**Source:** the checks named in each step.

| Key         | Step                                                                                                                         |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `FACT-2075` | Write the ADR if the change is structural: `pnpm adr:new <slug>` (`docs/adr/README.md`, "Rules")                             |
| `FACT-2076` | Controller + service + DTO + mapper, following the layer rules in [`architecture.md`](architecture.md)                       |
| `FACT-2077` | Add the row to the **Routes** table above and the section describing the logic — `AR-API-05` fails the run otherwise         |
| `FACT-2078` | If it is guarded, add it to `PROTECTED_ROUTES` in `e2e/security/security.api.spec.ts` — `AR-API-06` checks it (invariant 16) |
| `FACT-2079` | Cases in `e2e/regression/<feature>/<feature>.api.cases.md` and the paired spec                                               |

> **Rationale — not a fact.** Negative cases assert both the status and the absence of a side effect;
> a status alone does not prove nothing was written.
