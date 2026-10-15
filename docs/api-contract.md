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

| Method | Path                                  | Guard    | Success | Errors                        | Cases                                                | Key         |
| ------ | ------------------------------------- | -------- | ------- | ----------------------------- | ---------------------------------------------------- | ----------- |
| `GET`  | `/`                                   | none     | `200`   | —                             | `SM-API-01`                                          | `FACT-2006` |
| `POST` | `/auth/login`                         | none     | `200`   | `400`,`401`                   | `AL-API-01`…`04`, `AL-API-07`…`08`, `AL-API-10`…`11` | `FACT-2007` |
| `GET`  | `/auth/me`                            | `Bearer` | `200`   | `401`                         | `AL-API-10`, `AL-API-13`…`15`                        | `FACT-2008` |
| `GET`  | `/meetings`                           | `Bearer` | `200`   | `400`,`401`                   | `HD-API-01`…`10`                                     | `FACT-2009` |
| `POST` | `/meetings`                           | `Bearer` | `201`   | `400`,`401`                   | `HD-API-13`…`17`, `HD-API-20`                        | `FACT-2010` |
| `GET`  | `/meetings/:id`                       | `Bearer` | `200`   | `401`,`404`                   | `MD-API-01`…`07`                                     | `FACT-2011` |
| `POST` | `/meetings/:id/files`                 | `Bearer` | `201`   | `400`,`401`,`404`,`413`,`415` | `MF-API-01`, `MF-API-07`, `MF-API-09`…`19`           | `FACT-2080` |
| `GET`  | `/meetings/:id/files`                 | `Bearer` | `200`   | `401`,`404`                   | `MF-API-02`…`05`                                     | `FACT-2081` |
| `GET`  | `/meetings/:id/files/:fileId/content` | `Bearer` | `200`   | `401`,`404`                   | `MF-API-06`, `MF-API-08`, `SEC-API-11`               | `FACT-2082` |

## Error shapes

**Source:** `HttpException.createBody` in `@nestjs/common`, read rather than recalled; invariants 1
and 8.

| Key         | Situation                                             | Code  | Body                                                                                                                                     |
| ----------- | ----------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `FACT-2012` | `ValidationPipe` rejected the payload                 | `400` | `{"message": ["email must be an email", …], "error": "Bad Request", "statusCode": 400}`                                                  |
| `FACT-2013` | An extra field under `forbidNonWhitelisted`           | `400` | `{"message": ["property ownerId should not exist"], "error": "Bad Request", "statusCode": 400}`                                          |
| `FACT-2014` | Bad credentials                                       | `401` | `{"message": "Invalid email or password", "error": "Unauthorized", "statusCode": 401}`                                                   |
| `FACT-2015` | Missing or invalid token                              | `401` | `{"message": "Authentication required", "error": "Unauthorized", "statusCode": 401}`                                                     |
| `FACT-2016` | No meeting with that id, or one owned by another user | `404` | `{"message": "Meeting not found", "error": "Not Found", "statusCode": 404}`                                                              |
| `FACT-2083` | The meeting is owned, the file id is not on it        | `404` | `{"message": "File not found", "error": "Not Found", "statusCode": 404}`                                                                 |
| `FACT-2084` | An uploaded file over 1 048 576 bytes                 | `413` | `{"message": "File too large", "error": "Payload Too Large", "statusCode": 413}`                                                         |
| `FACT-2085` | An uploaded content type outside the allow-list       | `415` | `{"message": "Unsupported file type: upload a PDF, PNG, JPEG or plain text file", "error": "Unsupported Media Type", "statusCode": 415}` |

- `FACT-2086` `message` is an **array** on every `400` except the ones `@nestjs/platform-express`
  raises from a multipart limit, which carry a string — as do `401`, `404`, `413` and `415`. The
  array `400`s are not only `ValidationPipe`'s: a handler throwing
  `new BadRequestException([...])` produces the same body shape by a different route. — invariant 8,
  `MF-API-09`, `MF-API-12`, `MF-API-15`

> **Rationale — not a fact.** This project broke on the error shapes twice. Do not write a client
> that assumes one shape. The successor above is phrased as "every 400 except the multipart-limit
> one" rather than "the `ValidationPipe` 400" on purpose: the second wording would be born false,
> because four of the upload route's array bodies are raised by the handler rather than by the pipe.

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
- `FACT-2123` Logic: generate an `mtg-` + `randomUUID()` id (`ADR-0031`), take `ownerId` from `@CurrentUser()`, normalize
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
  the error-shape rule. — `ADR-0018`, `FACT-2086`
- `FACT-2067` There is no `400` on this route. — `MD-API-05`
- `FACT-2068` `GET /meetings/a/b` falls through to Express's own 404 handler, not to any Nest
  handler: `{"message":"Cannot GET /meetings/a/b",…}`, three keys. — `MD-API-07`

> **Rationale — not a fact.** Every seeded id is `mtg-<owner>-<n>`-shaped rather than a UUID, so a
> validating pipe would 400 the seed instead of 404-ing an unknown id — and its 400 would carry a
> string `message`, contradicting `FACT-2086`. A malformed id is simply an id no meeting has.

## `POST /meetings/:id/files` — attach a file to a meeting

- `FACT-2087` Guard: `JwtAuthGuard` on the whole `MeetingFilesController` class. Answers `201` —
  POST's default — and there is no `@HttpCode` on this handler; invariant 1 is a login-only rule. —
  `apps/api/src/meeting-files/meeting-files.controller.ts`, `MF-API-01`
- `FACT-2088` Request: `multipart/form-data` carrying exactly one file part named `file`. This is
  the first and only request body in this contract that is not `application/json`. — `ADR-0029`,
  `FACT-3641`
- `FACT-2089` `UploadFileDto` declares **no properties at all**, so `whitelist` +
  `forbidNonWhitelisted` turn any text part into the `FACT-2013` body. That works only because
  `ValidationPipe` hard-codes `forbidUnknownValues: false` ahead of the caller's options;
  class-validator's own default is `true`, under which a propertyless class rejects every payload
  and every upload would answer `400`. — `apps/api/src/meeting-files/dto/upload-file.dto.ts`,
  `MF-API-11`
- `FACT-2090` The stored filename is `file.originalname` and must be 1–100 characters matching
  `^[A-Za-z0-9](?:[A-Za-z0-9._ -]*[A-Za-z0-9._-])?$` — no path separator, no quote, no control
  character, no non-ASCII (`CH-014`). — `apps/api/src/meeting-files/domain/file-name.ts`,
  `MF-API-10`
- `FACT-2091` The rule is written against the **decoded** form: `busboy` has already applied
  `basename()` and prefers a percent-decoded RFC 5987 `filename*`, and `multer` decodes `%0A`, `%0D`
  and `%22` back into a literal newline, carriage return and double quote. Those three characters
  can therefore really arrive, which is what makes rejecting them the actual header-injection
  defence rather than a precaution. — `FACT-3648`, `MF-UT-02`
- `FACT-2092` The separator and empty-name clauses cannot fire over HTTP for the same reason:
  `../etc/passwd` is stored as `passwd` and `a\b.txt` as `b.txt`, both `201`, and a name reducing to
  `.` or `..` is discarded by `multer` and answers "file is required". They stay asserted at the unit
  level as defence in depth, with `multer`'s `preservePath` as the named trigger that would make
  both reachable. — `FACT-3648`, `MF-API-10`, `MF-UT-02`
- `FACT-2093` Content types are compared on the media type alone — cut at the first `;`, trimmed,
  lower-cased — against `application/pdf`, `image/png`, `image/jpeg` and `text/plain`, and it is
  that normalized value that is stored, never the client's raw header. So
  `application/pdf; charset=utf-8` and `APPLICATION/PDF` are both accepted. — `FACT-3631`,
  `MF-API-14`, `MF-API-17`
- `FACT-2094` A part whose own `Content-Type` is absent, empty or unparseable is accepted as
  `text/plain`: `busboy` initialises a part's type to that literal, so the contract cannot
  distinguish "declared nothing" from "declared `text/plain`". — `FACT-3647`, `FACT-3649`
- `FACT-2095` The largest accepted file is 1 048 576 bytes, enforced by the interceptor's
  `limits.fileSize`, so the `413` body is the framework's rather than one written by hand. —
  `FACT-3629`, `MF-API-13`
- `FACT-2096` An upload is refused when the meeting **already holds ten files**. The check is a count
  followed by an insert rather than a transaction, so the contract promises the refusal, not an exact
  ceiling under concurrency. — `FACT-3642`, `MF-API-15`

**Evaluation order.** It decides which body a request with two faults receives.

**Source:** `apps/api/src/meeting-files/meeting-files.controller.ts`,
`apps/api/src/meeting-files/application/upload-meeting-file.ts`, `MF-API-16`.

| Key         | Step                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------- |
| `FACT-2097` | `JwtAuthGuard` — `401`, before the handler is invoked                                             |
| `FACT-2098` | `FileInterceptor` — `413` for an oversized file, and the **string** `400` for a wrong field name  |
| `FACT-2099` | `ValidationPipe` against the empty DTO — the array `400` for any extra text part                  |
| `FACT-2100` | the handler: missing file → filename → content type (`415`) → ownership (`404`) → the cap (`400`) |

- `FACT-2101` Ownership is checked **before** the cap, so the cap cannot be used to probe whether a
  meeting exists; and a stranger uploading an oversized file gets `413` rather than `404`, which
  leaks nothing because that answer does not depend on the meeting. — `ADR-0018`, `MF-API-16`

**Error bodies**, read from the framework rather than recalled.

**Source:** `apps/api/src/meeting-files/meeting-files.error-filter.ts`,
`apps/api/node_modules/@nestjs/platform-express/multer/multer/multer.utils.js`, `MF-API-09`…`19`.

| Key         | Situation                                                                                                                 | Code  | Body                                                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------- |
| `FACT-2102` | no `file` part at all; a `file` part with no `filename` and `application/octet-stream`; or a name reducing to `.` or `..` | `400` | `{"message":["file is required"],…}` — `multer` discards a file part whose filename is falsy after `basename()`                   |
| `FACT-2103` | a `file` part with no `filename`, or an empty `filename=""`, and any other content type                                   | `400` | `{"message":["property file should not exist"],…}` — `busboy`'s filename check is truthy, so the part arrives as a text **field** |
| `FACT-2104` | the filename fails `FACT-2090`                                                                                            | `400` | `{"message":["filename must be 1 to 100 characters of letters, digits, dot, underscore, hyphen or space"],…}`                     |
| `FACT-2105` | any extra text field in the multipart body                                                                                | `400` | `{"message":["property label should not exist"],…}` — `FACT-2013`'s shape over multipart                                          |
| `FACT-2106` | a file part sent under a different field name                                                                             | `400` | `{"message":"Unexpected field - attachment",…}` — **a string**, from `@nestjs/platform-express`                                   |
| `FACT-2107` | the meeting already held ten files                                                                                        | `400` | `{"message":["a meeting may hold at most 10 files"],…}`                                                                           |

- `FACT-2108` Three of those bodies are **unreachable through the shipped form** and are diagnostics
  rather than UI copy: the two `property … should not exist` bodies and `Unexpected field - …` all
  describe a request shape the form cannot produce. The Server Action renders whichever message
  arrives verbatim, so if one of them ever reaches a user, our client is wrong and that is the right
  thing for them to see. — `apps/web/src/lib/actions/meeting-files.ts`, `MF-FN-06`

> **Rationale — not a fact.** The `415` names the four formats it will take rather than only
> refusing: "unsupported" with no list is the one message a user cannot act on. The filename message
> stays exact for the opposite reason to invariant 6's — it describes the user's own input rather
> than our data, nothing is enumerable through it, and telling someone precisely how to fix their
> file is worth more than the nothing an attacker learns. Adding `forbidUnknownValues: true` to the
> global pipe is a plausible future hardening edit that would break this endpoint and nothing else,
> which is why `FACT-2089` says so out loud.

## `GET /meetings/:id/files` — the meeting's attachments

- `FACT-2109` Guard: the class-level `JwtAuthGuard`. Body on `200`: `{ "items": MeetingFileDto[] }`
  with no `total` and no bytes. — `FACT-1065`, `MF-API-04`
- `FACT-2110` Order: `uploadedAt` descending with `id` ascending as the secondary key (invariant 7),
  so the seeded `notes.txt` lists before `syllabus.pdf`. —
  `apps/api/src/meeting-files/infrastructure/prisma-meeting-file.repository.ts`, `MF-API-04`
- `FACT-2111` A meeting the caller owns that holds no files answers `200` with an empty `items`,
  never a `404`. — `MF-API-05`
- `FACT-2112` An unknown meeting and one owned by another user answer the byte-identical
  `Meeting not found` `404` of `FACT-2016` — one code path, resolved through
  `MeetingsService.findById` rather than a query of its own. — `ADR-0018`, `MF-API-03`

## `GET /meetings/:id/files/:fileId/content` — the bytes

- `FACT-2113` Guard: the class-level `JwtAuthGuard`. Answers `200` with the stored bytes as the
  response body — the only endpoint in this contract that does. — `ADR-0029`, `FACT-3627`,
  `MF-API-06`
- `FACT-2114` Four response headers: `Content-Type` = the stored (normalized) `contentType`;
  `Content-Length` = the length of the buffer actually sent, never the stored `sizeBytes`;
  `Content-Disposition: attachment; filename="…"; filename*=UTF-8''…`; and
  `X-Content-Type-Options: nosniff`. Never `inline`. — `FACT-3627`, `MF-API-06`
- `FACT-2115` `Content-Disposition` is **built**, never interpolated, in three steps: drop everything
  up to the last `/` or `\` (and substitute `file` for an empty, `.` or `..` remainder);
  percent-encode that base per RFC 8187 for `filename*`; replace every character outside
  `A-Za-z0-9._-` and space with `_`, capped at 100 characters, for the ASCII `filename`. Because
  neither `"` nor `\` survives the third step, the quoted string cannot terminate early. —
  `apps/api/src/meeting-files/meeting-files.content-disposition.ts`, `MF-UT-08`, `MF-UT-09`, `MF-UT-10`
- `FACT-2116` There is therefore **no error status for a hostile stored filename**: RFC 6266's
  pairing can represent every byte sequence, so every value in the column answers `200`. — `ADR-0029`,
  `FACT-3650`, `SEC-API-11`

**What the builder emits.** All six answer `200`.

**Source:** `apps/api/src/meeting-files/meeting-files.seed.ts` (the stored column) and `SEC-API-11`
(the asserted header).

| Stored                          | `Content-Disposition`                                                                                      |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `syllabus.pdf`                  | `attachment; filename="syllabus.pdf"; filename*=UTF-8''syllabus.pdf`                                       |
| `report".txt`                   | `attachment; filename="report_.txt"; filename*=UTF-8''report%22.txt`                                       |
| `evidence.log\r\nX-Injected: 1` | `attachment; filename="evidence.log__X-Injected_ 1"; filename*=UTF-8''evidence.log%0D%0AX-Injected%3A%201` |
| `minutes.txt\nSet-Cookie: a=b`  | `attachment; filename="minutes.txt_Set-Cookie_ a_b"; filename*=UTF-8''minutes.txt%0ASet-Cookie%3A%20a%3Db` |
| `../../etc/passwd`              | `attachment; filename="passwd"; filename*=UTF-8''passwd`                                                   |
| `déjà-vu.png`                   | `attachment; filename="d_j_-vu.png"; filename*=UTF-8''d%C3%A9j%C3%A0-vu.png`                               |

- `FACT-2117` A file id that exists on another meeting, or none at all, answers
  `{"message":"File not found","error":"Not Found","statusCode":404}` — a different body from
  `FACT-2016`'s, because by then the caller has been shown to own the meeting. — `MF-API-08`,
  `FACT-2083`

> **Rationale — not a fact.** The `filename` column has **more than one writer** — the upload route
> validates what it admits, the seed writes rows the upload route would have refused — so the read
> path validates its own output instead of inheriting the write path's guarantees (`FACT-3650`).
> Before that, the controller interpolated the stored value and the only thing between a stored
> `\r\n` and a split response was Node's own `setHeader` throwing, which is a defence this code does
> not own and which answered `500` on two seeded rows. `Content-Length` comes from the buffer rather
> than the column for the same reason: if the two ever disagreed, the column would truncate the body
> or hang the client instead of failing loudly.

---

## Who calls what

**Source:** `apps/web/src/lib/**`, `playwright.config.ts`.

| Key         | Caller                                                     | Endpoint                                  | When                                   |
| ----------- | ---------------------------------------------------------- | ----------------------------------------- | -------------------------------------- |
| `FACT-2069` | `lib/actions/auth.ts` → `loginAction`                      | `POST /auth/login`                        | the login form is submitted            |
| `FACT-2070` | `lib/dal.ts` → `getCurrentUser`                            | `GET /auth/me`                            | every protected page render            |
| `FACT-2071` | `lib/dal.ts` → `getMeetings`                               | `GET /meetings?limit=3`                   | the dashboard renders                  |
| `FACT-2072` | `lib/actions/meetings.ts` → `createMeetingAction`          | `POST /meetings`                          | the "Create meeting" form is submitted |
| `FACT-2118` | `lib/dal.ts` → `getMeetingById`                            | `GET /meetings/:id`                       | the meeting detail page renders        |
| `FACT-2119` | `lib/dal.ts` → `getMeetingFiles`                           | `GET /meetings/:id/files`                 | the meeting detail page renders        |
| `FACT-2120` | `lib/actions/meeting-files.ts` → `uploadMeetingFileAction` | `POST /meetings/:id/files`                | the "Attach a file" form is submitted  |
| `FACT-2121` | `app/meetings/[id]/files/[fileId]/route.ts`                | `GET /meetings/:id/files/:fileId/content` | a download link is followed            |
| `FACT-2073` | Playwright `request` fixture                               | all of them                               | the `api` project                      |

- `FACT-2074` Nothing else may call Nest; the browser never does. — `ADR-0002`, `FACT-0009`,
  `SEC-FN-03`
- `FACT-2122` The download Route Handler calls Nest with an inline `fetch` rather than through
  `api-client.ts`: `apiFetch` always does `response.json()`, and a binary body has nothing to parse.
  It is the one named exception to `FACT-2074`'s single door, and it lives in the BFF layer like
  every other caller. — `apps/web/src/app/meetings/[id]/files/[fileId]/route.ts`, `FACT-3633`

> **Rationale — not a fact.** A second `fetch` helper alongside `api-client.ts` is a defect, not a
> shortcut. The Route Handler is not that: it is one call site with one reason — bytes cannot go
> through a JSON parser — rather than a parallel client with its own base URL and header policy.

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

## Retired facts

The register of the keys this document has allocated and no longer states (`ADR-0022`). A fact is
never edited in place and never deleted; it is closed here, naming the key that replaced it.

| Key         | Stated                                                                                                                                                                                                                                                                      | Status                 | Recorded in |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ----------- |
| `FACT-2017` | `message` is an array on a 400 and a string on a 401 and on a 404.                                                                                                                                                                                                          | `retired by FACT-2086` | `ADR-0029`  |
| `FACT-2060` | Logic: generate a `randomUUID()` id, take `ownerId` from `@CurrentUser()`, normalize `startsAt` to canonical UTC via `new Date(...).toISOString()`, default the duration, default `participants` to `[]`, store, and return through `toMeetingDto`, which strips `ownerId`. | `retired by FACT-2123` | `ADR-0031`  |
