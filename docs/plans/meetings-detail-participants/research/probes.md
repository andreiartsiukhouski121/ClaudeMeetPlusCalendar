# Research probes: meetings-detail-participants

> Throwaway code, run outside the repository, in the session scratchpad
> `C:\Users\User\AppData\Local\Temp\claude\c--GIT-PurpleSchool\454becda-bb68-44be-a019-e21d120bac23\scratchpad\probe`.
> Nothing here was added to the repository. **The command and its printed output are the citation**
> — every line below is transcribed from a run, not from documentation or memory. Where the probe
> printed nothing about a question, that question is a `Not found` line or an open question.

## What was run and against which versions

The probe directory carries a junction to the repository's own installed dependencies, so the probe
exercised **the same package versions the API runs on**, not a fresh install:

```
cmd /c mklink /J node_modules C:\GIT\PurpleSchool\apps\api\node_modules
```

Printed by `node -e "console.log(require('./node_modules/<pkg>/package.json').version)"` in the
probe directory:

| Package                        | Version    |
| ------------------------------ | ---------- |
| `@nestjs/common`               | `12.0.1`   |
| `class-validator`              | `0.15.1`   |
| `class-transformer`            | `0.5.1`    |
| `typescript` (`tsc --version`) | `6.0.3`    |
| `node --version`               | `v24.14.0` |

The probe's `tsconfig.json` extends the repository's own `@purpleschool/tsconfig/nestjs.json`
(`packages/tsconfig/nestjs.json`), so `emitDecoratorMetadata` and `experimentalDecorators` match
`apps/api/tsconfig.json:2`.

The probe registered `ValidationPipe` with the identical options the API uses — copied verbatim from
`apps/api/src/app.module.ts:19-26`:

```ts
new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
```

Commands:

```
./node_modules/.bin/tsc -p tsconfig.json
node dist/app.js    # probes A, B, C
node dist/app2.js   # probes D, E
```

Full transcripts are in the scratchpad as `probe-output.txt` and `probe-output-2.txt`.

---

## Probe A — what `class-validator` does for an array field under this pipe config

DTO used (probe `src/dto.ts`):

```ts
class RequiredArrayDto {
  @IsString() title!: string;
  @IsISO8601() startsAt!: string;
  @IsArray()
  @IsString({ each: true })
  participants!: string[];
}
```

Every row below is a `POST` with `content-type: application/json` to the probe controller. `status`
and `body` are verbatim from the run.

| #   | Request body (participants value)       | Status | Body                                                                                                                                                                                                     |
| --- | --------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | `["a@b.c"]`                             | 201    | handler ran; `dto.participants` is `["a@b.c"]`                                                                                                                                                           |
| A2  | **field absent**                        | 400    | `{"message":["each value in participants must be a string","participants must be an array"],"error":"Bad Request","statusCode":400}`                                                                     |
| A3  | `[]` (empty array)                      | 201    | handler ran; `dto.participants` is `[]`                                                                                                                                                                  |
| A4  | `"a@b.c"` (a string, not an array)      | 400    | `{"message":["participants must be an array"],"error":"Bad Request","statusCode":400}`                                                                                                                   |
| A5  | `[1,2]`                                 | 400    | `{"message":["each value in participants must be a string"],"error":"Bad Request","statusCode":400}`                                                                                                     |
| A6  | `["ok",5,null]`                         | 400    | `{"message":["each value in participants must be a string"],"error":"Bad Request","statusCode":400}`                                                                                                     |
| A7  | `null`                                  | 400    | `{"message":["each value in participants must be a string","participants must be an array"],...}`                                                                                                        |
| A8  | `["a"]` **plus an unknown key** `extra` | 400    | `{"message":["property extra should not exist"],"error":"Bad Request","statusCode":400}`                                                                                                                 |
| A9  | `[{"email":"a@b.c"}]`                   | 400    | `{"message":["each value in participants must be a string"],"error":"Bad Request","statusCode":400}`                                                                                                     |
| A14 | request body is the JSON array `["a"]`  | 400    | `{"message":["property 0 should not exist","title must be a string","startsAt must be a valid ISO 8601 date string","each value in participants must be a string","participants must be an array"],...}` |

Facts this establishes, stated only as far as the output goes:

- **A2 confirms invariant 2 holds for arrays specifically.** With no `@IsOptional()`, an absent
  `participants` produced **400**, exactly as invariant 2 (`CLAUDE.md`, Nest invariant 2) describes
  for `limit` and `durationMinutes`. The control case A13 reproduced the invariant's own example:
  `IntNoOptionalDto` with `@IsInt() @Min(1) @Max(100)` and an empty body `{}` gave
  `{"message":["limit must not be greater than 100","limit must not be less than 1","limit must be an integer number"],"error":"Bad Request","statusCode":400}`.
- **An absent array trips two validators, not one** (A2, A7): both `@IsArray` and the `each: true`
  `@IsString` report, so `message` carried two strings.
- **An empty array `[]` passed** (A3) — `@IsArray()` + `@IsString({each:true})` alone impose no
  minimum length.
- `transform: true` did **not** coerce a string into an array (A4) nor numbers into strings (A5).
- `forbidNonWhitelisted` reported the unknown key **instead of** the array errors when both were
  present (A8): the message array had one entry, `property extra should not exist`.

With `@IsOptional()` added (`OptionalArrayDto`, `@IsOptional() @IsArray() @IsString({each:true})`):

| #   | participants value | Status | Body                                                                                       |
| --- | ------------------ | ------ | ------------------------------------------------------------------------------------------ |
| A10 | **field absent**   | 201    | handler ran; `dto` is `{"title":"t"}` — the key is absent from the instance                |
| A11 | `null`             | 201    | handler ran; `dto` is `{"title":"t","participants":null}` — **`null` reached the handler** |
| A12 | `"x"`              | 400    | `{"message":["participants must be an array"],"error":"Bad Request","statusCode":400}`     |

- **A11 is the sharp edge:** `@IsOptional()` in `class-validator` 0.15.1 skips validation for both
  `undefined` **and** `null`, so an explicit `"participants": null` was accepted and arrived at the
  handler as `null` rather than as an array or as absent.

## Probe B — the actual `NotFoundException` body on `@nestjs/common` 12.0.1

Invariant 8 (`CLAUDE.md`) states the error shape differs between a 400 and a 401; the 404 shape was
not assumed, it was printed.

| #   | Thrown                                       | Status | Body verbatim                                                          | `typeof message` | Keys                               |
| --- | -------------------------------------------- | ------ | ---------------------------------------------------------------------- | ---------------- | ---------------------------------- |
| B1  | `new NotFoundException('Meeting not found')` | 404    | `{"message":"Meeting not found","error":"Not Found","statusCode":404}` | `"string"`       | `["message","error","statusCode"]` |
| B2  | `new NotFoundException()` (no argument)      | 404    | `{"message":"Not Found","statusCode":404}`                             | `"string"`       | `["message","statusCode"]`         |

- With a message argument the body carries **three** keys and `message` is a **string** (not an
  array, unlike the 400 shape in probe A).
- With **no** argument the body carries **two** keys — the `error` key is absent entirely.
- `content-type` was `application/json; charset=utf-8` in both cases.

Express's own unmatched-route 404 has the same three keys but a generated message: probe C7 printed
`{"message":"Cannot GET /meetings/a/b","error":"Not Found","statusCode":404}`, and C9 printed
`{"message":"Cannot DELETE /meetings/abc","error":"Not Found","statusCode":404}`.

## Probe C — does `GET /meetings/:id` collide with anything, and what does a non-UUID `:id` do

The probe controller declared, **in this order**, `@Get()`, `@Post()`, `@Post('optional')`,
`@Post('int')`, `@Get(':id')` — the list route declared before the parameterised one, mirroring how
a detail route would be appended to `apps/api/src/meetings/meetings.controller.ts`.

| #   | Request                             | Status | Which handler ran / body                                                          |
| --- | ----------------------------------- | ------ | --------------------------------------------------------------------------------- |
| C1  | `GET /meetings`                     | 200    | the **list** handler — `{"items":[],"total":0,"handler":"list"}`                  |
| C2  | `GET /meetings/exists`              | 200    | the **`:id`** handler — `{"handler":"findOne","id":"exists"}`                     |
| C5  | `GET /meetings/` (trailing slash)   | 200    | the **list** handler                                                              |
| C3  | `GET /meetings/abc` (non-UUID word) | 404    | the **`:id`** handler ran — `{"message":"Meeting not found",…}`                   |
| C4  | `GET /meetings/123`                 | 404    | the **`:id`** handler ran — `{"message":"Meeting not found",…}`                   |
| C6  | `GET /meetings/a%2Fb`               | 404    | the **`:id`** handler ran — `{"message":"Meeting not found",…}`                   |
| C8  | `GET /meetings/%20`                 | 404    | the **`:id`** handler ran — `{"message":"Meeting not found",…}`                   |
| C7  | `GET /meetings/a/b`                 | 404    | **no handler** — Express fallback `{"message":"Cannot GET /meetings/a/b",...}`    |
| C9  | `DELETE /meetings/abc`              | 404    | **no handler** — Express fallback `{"message":"Cannot DELETE /meetings/abc",...}` |

How C3/C4/C6/C8 are read, narrowed by the `research-reviewer` on finding F5: the probe handler
echoes the received `id` **only** on the `exists` branch (C2). For every other value it throws
before echoing, so the transcript prints only `{"message":"Meeting not found",…}`. What those four
rows establish is therefore that **the `:id` handler ran** rather than the list handler or the
Express fallback — not what string the handler received. C6 in particular does not show whether the
handler saw `a%2Fb` or `a/b`; only that the request did not fall through to the two-segment route.

- No collision was observed: `GET /meetings` and `GET /meetings/` both still reached the list
  handler with `@Get(':id')` registered on the same controller.
- **Without a pipe, `:id` arrives as an arbitrary raw string.** Any value — a word, a number, an
  encoded slash, a space — reached the handler body, so the handler, not the framework, decides what
  a malformed id does. (C2 is the row that shows the raw value arriving: `{"handler":"findOne","id":"exists"}`.)

## Probe D — what `ParseUUIDPipe` would do instead

| #   | Request                                          | Status | Body                                                                                        |
| --- | ------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------- |
| D1  | `GET /uuid/3f2504e0-4f89-41d3-9a0c-0305e82c3301` | 404    | pipe passed it through; the handler's `NotFoundException` body was returned                 |
| D2  | `GET /uuid/abc`                                  | 400    | `{"message":"Validation failed (uuid is expected)","error":"Bad Request","statusCode":400}` |
| D3  | `GET /uuid/123`                                  | 400    | `{"message":"Validation failed (uuid is expected)","error":"Bad Request","statusCode":400}` |

- With `@Param('id', ParseUUIDPipe)` a malformed id gives **400 with `message` as a string**, not
  the array shape that `ValidationPipe` produces for a body (probe A). Two different 400 shapes are
  therefore reachable from one API — relevant to invariant 8.

This probe records what the pipe does. It is **not** a statement that the repository uses it: the
code sweep found no `@Param` anywhere in `apps/api/src` (`research/code.md`).

## Probe E — does a guard run before the `:id` handler

A controller carrying a class-level guard that throws `UnauthorizedException('Invalid or expired
token')`, with a `@Get(':id')` handler that would throw `NotFoundException`:

| #   | Request            | Status | Body                                                                             |
| --- | ------------------ | ------ | -------------------------------------------------------------------------------- |
| E1  | `GET /guarded/abc` | 401    | `{"message":"Invalid or expired token","error":"Unauthorized","statusCode":401}` |

- The guard's 401 was returned; the handler's `NotFoundException` never ran. The 401 `message` was a
  **string**, matching invariant 8's description of the 401 shape.

## What the probes did not establish

- **Not found:** whether a cross-owner id should give 404 or 403 — no probe can answer this, and no
  document or code was found stating it (see `research/contract.md`, `research/code.md`).
- **Not found:** the `class-validator` decorator the repository would use for `participants` element
  format (email vs free string) — the probe used `@IsString({ each: true })` because that is what
  the requirement's brief named; nothing in the repository specifies an element format.
- **Not found:** whether the repository's ids are UUIDs at all in a form `ParseUUIDPipe` accepts —
  probe D used a synthetic UUID, not a seed id. The seed values are in `research/code.md`.
- The probes ran against a **throwaway controller**, not against `MeetingsController`. They
  establish framework and library behaviour under this repository's exact versions and pipe options;
  they establish nothing about the repository's own routes, which are cited in `research/code.md`.
