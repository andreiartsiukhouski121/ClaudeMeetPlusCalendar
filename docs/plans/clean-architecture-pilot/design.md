# Design: clean-architecture-pilot

> The shape of the change. Created by `pnpm change:new <slug>`, written by the `designer` agent from
> the accepted `research/` folder, and reviewed before any plan is written.
>
> **This is not a plan.** No tasks, no order of work, no dependencies, no estimates, no file list —
> those come next, from the `planner`. It is also not a restatement of the research: cite it.
>
> Every load-bearing fact traces to `research/`. A fact appearing for the first time here is an
> assumption, and the review will treat it as one.

The decision is `ADR-0034` (proposed). This design is the shape that record constrains; where the
two say the same thing, the ADR's keyed line governs.

## 1. What the research established

- **The requirement and the owner's seven settled decisions** — `research/README.md`, "Requirement,
  as received"; keyed as `FACT-3693`.
- **Where the rules sit today** — split between the upload handler, `meeting-files.rules.ts` and the
  service (`research/code.md` §1 "Business rules", error table §2; README contradictions 2 and 4).
- **The repository layer was refused, and why** — `FACT-3589`, `FACT-0059`, the unkeyed rationale in
  `docs/architecture.md` and `docs/plans/meeting-files/design.md:604-605` (`research/history.md`,
  "Rejected").
- **The facts this departs from** — `research/contract.md` §A, §B.
- **The contract the refactor must keep** — routes `FACT-2080`…`FACT-2082`, evaluation order
  `FACT-2097`…`FACT-2101`, bodies `FACT-2083`…`FACT-2086`, `FACT-2102`…`FACT-2107`, list and
  download `FACT-2109`…`FACT-2117` (`research/contract.md` §C, §D).
- **The cases pinning it** — `MF-API-01`…`19`, `MF-FN-01`…`15`, `MF-UT-01`…`10`, `SEC-API-01`,
  `-07`, `-11`, `SM-API-03`, `AR-API-05`/`06` (`research/tests.md` §1, §6).
- **What the framework allows** — probes P1 (core `no-restricted-imports` fails a `domain/` file),
  P2 (`useFactory` builds an undecorated class), P3 (Vitest runs a decorator-free module)
  (`research/code.md`, "Probes").
- **No database in units, no integration spec, no import-boundary check of any kind** —
  `research/tests.md` §2, §3; `research/README.md`, "Still unknown".
- **The fact lock and the 15 path-naming keys** — `research/contract.md` §H.
- **Pinned paths** — `prisma/seed.ts:45`, `meeting-files.unit.cases.md:57`, `e2e/README.md:55`,
  the controller suffix scan (`research/tests.md` §4, §5).

### Probes run at design time

Scratch scripts outside the repository, run with `node` from `apps/api` against the installed
packages; nothing landed. Raised by the first design review, which asked for them rather than an
assertion.

- **F1 — the filter.** `filter-probe.mjs` imports `@nestjs/core`, `@nestjs/common`,
  `@nestjs/platform-express` 12.0.1 from `apps/api/node_modules` and boots one app with two
  controllers. `Filtered` carries `@UseFilters(DomainErrorFilter)`, a class reference; the filter is
  `@Catch(MeetingFileError)`, extends `BaseExceptionFilter`, maps the error's `kind` to a
  `BadRequestException(['…'])` or `NotFoundException('…')` and returns `super.catch(mapped, host)`.
  `Baseline` has no filter and throws those same `HttpException`s directly, as the controller does
  today. Five routes on each — domain 400, domain 404, a non-matching `NotFoundException`, a
  non-matching plain `Error`, a 200 — fetched over HTTP, comparing status, the raw body text and
  every header except `date`, `etag`, `connection`, `keep-alive`, `x-powered-by`. **Outcome: all five
  pairs identical** — e.g. `400 {"message":["filename is invalid"],"error":"Bad Request","statusCode":400}`,
  `content-type: application/json; charset=utf-8`, `content-length: 74` on both; the unmatched
  `NotFoundException` gives the default 404 body and the plain `Error` the default
  `500 {"statusCode":500,"message":"Internal server error"}` on both. Nest instantiated the filter
  from the class with no provider declared. `grep -rn "APP_FILTER\|useGlobalFilters\|UseFilters\|ExceptionFilter" apps/api/src`
  returns nothing, so no existing filter interacts with it. Keyed as `FACT-3717`.
- **L1 — the lint rule.** `lint-probe.mjs` runs ESLint 9.39.5's `Linter` with
  `@typescript-eslint/parser` 8 and only `no-restricted-imports`, over eleven one-line sources as
  `src/meeting-files/domain/x.ts`. Two allow-list forms: `patterns: [{ regex: '^(?!node:|\\./)' }]`
  and `patterns: [{ group: ['*', '!node:*', '!./*'] }]`. **Outcome:** both flag a static import, an
  unlisted package, `import type { Response } from 'express'`, `export * from '@nestjs/common'`,
  `export { … } from`, `import 'reflect-metadata'`, a multi-line import and
  `../infrastructure/…`; both pass `node:crypto` and **both pass `import('express')`**. The `regex`
  form passes `./file-name`; the `group` form wrongly flags it. This matches the rule's source:
  `regex` and `group` at `no-restricted-imports.js:97`, `:311`, `:317-320`, and listeners only for
  `ImportDeclaration`, `ExportNamedDeclaration`, `ExportAllDeclaration` (and TS `import =`) at
  `:817-823`. So an allow-list **is** expressible; `import()` is not seen. Keyed in `FACT-3712`.

**Gaps to carry forward:** both research-gate verdict files
(`docs/profiling/verdicts/2026-10-14-unknown-unknown-a6616cbf-UNPARSED.md`, `…-a9257a5b-…`) hold
only the capture header — no verdict text was stored. This design worked from the research's own
"Still unknown" list instead; every item there is either answered below or carried in §8.

## 2. The shape

### Layout (`apps/api/src/meeting-files/`)

| Layer               | Where                        | Holds                                                                                                                                         |
| ------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain              | `domain/`                    | `MeetingFile` entity; `FileName`, `ContentType` value objects; the limits; the domain errors; the pure predicates `MF-UT-01`…`03` already pin |
| Application         | `application/`               | three use cases — `UploadMeetingFile`, `ListMeetingFiles`, `GetMeetingFileContent` — and two ports, `MeetingFileRepository`, `MeetingAccess`  |
| Infrastructure      | `infrastructure/`            | `PrismaMeetingFileRepository` (the port over `PrismaService`), `MeetingsServiceAccess` (the port over `MeetingsService.findById`)             |
| HTTP adapters, root | `meeting-files.*.ts`, `dto/` | controller, `UploadFileDto`, mapper, the error filter, the `Content-Disposition` builder, the module (wiring), the seed                       |

**The module root keeps its file names.** `meeting-files.controller.ts`, `meeting-files.mapper.ts`,
`dto/upload-file.dto.ts`, `meeting-files.module.ts` and `meeting-files.seed.ts` stay where they are,
so the controller suffix scan (`AR-API-05`/`06`), `prisma/seed.ts:45`'s literal dynamic import and
eleven of the fifteen path-naming facts (§6) are untouched. What leaves the root:
`meeting-files.service.ts` (split into the use cases and the Prisma adapter),
`meeting-files.rules.ts` (split into `domain/` and the header builder), `meeting-file.types.ts`
(the entity replaces `MeetingFile`; `MeetingFileDto` moves beside its mapper).

### Domain

- **`MeetingFile`** — readonly `id`, `meetingId`, `filename`, `contentType`, `sizeBytes`, `content`
  (`Uint8Array`), `uploadedAt` (ISO 8601 UTC string). Two ways in:
  - `upload(…)` — the only creation path. Takes a `FileName`, a `ContentType`, the bytes, the
    meeting id, the count of files the meeting already holds and the current instant. It refuses the
    eleventh file (`FileLimitReached`, `FACT-3642`), issues the id as `fil-` + `randomUUID()` from
    `node:crypto` (`FACT-3670`), derives `sizeBytes` from the bytes (`FACT-1060`). The instant is
    passed in, so the entity's units need no clock.
  - `restore(…)` — rebuilds a stored row with **no** validation. The column has more than one
    writer and the seed's hostile names must load (`FACT-3650`, `FACT-1073`); a read path that
    re-validated would turn `SEC-API-11`'s 200s into errors.
  - Its fields stay primitives, so `MeetingFileDto = Omit<MeetingFile, 'meetingId' | 'content'>`
    remains literally true (`FACT-1063`).
- **`FileName`** — the rule of `FACT-2090`: 1…100 characters, the pattern, decoded form
  (`FACT-2091`). Built from a raw string or throws `InvalidFileName`. `isValidFilename` and
  `FILENAME_RULE_MESSAGE` stay exported beside it, unchanged in name and behaviour.
- **`ContentType`** — the rule of `FACT-2093`/`FACT-3631`: cut at `;`, trim, lower-case, then the
  four-value allow-list; its value is the normalized string, which is what is stored (`MF-API-17`).
  Throws `UnsupportedContentType`. `normalizeContentType` and `isAllowedContentType` stay exported,
  unchanged.
- **Limits** — `MAX_FILES_PER_MEETING = 10`, `MAX_FILE_SIZE_BYTES = 1_048_576`, the filename length
  and pattern, the allow-list: declared here once (`FACT-3708`).
- **The size ceiling is not re-checked by the entity.** The domain owns the number; the interceptor
  enforces it, because the 413 must be `@nestjs/platform-express`'s own body and the bytes must not
  be buffered past the limit (`FACT-3629`, `FACT-2084`). An entity check could never fire and would
  need a hand-written 413 — the thing `FACT-3629` avoids.
- **Domain errors** — one abstract base, `MeetingFileError`, and six subclasses, each carrying a
  literal `kind`: `FileRequired`, `InvalidFileName`, `UnsupportedContentType`, `MeetingNotFound`,
  `FileLimitReached`, `MeetingFileNotFound`. They carry no status code and no HTTP text.

### Application

- **Ports** — `MeetingFileRepository`: count the files in a meeting; add a file; list a meeting's
  files newest first with `id` ascending as the tie-break (invariant 7, `FACT-2110`); find one file
  **within** a meeting, `undefined` when absent or on another meeting (`FACT-2117`).
  `MeetingAccess`: does this owner own this meeting — one answer for absent and foreign
  (`FACT-3381`).
- **`UploadMeetingFile`** — input: owner id, meeting id, and the uploaded file as
  `{ originalName, declaredType, bytes } | undefined`. The order is `FACT-2100`'s, exactly: no file
  → `FileRequired`; `FileName` → `ContentType` → ownership (`MeetingNotFound`) → count →
  `MeetingFile.upload` (`FileLimitReached`) → add. Ownership strictly before the count
  (`FACT-2101`, `MF-API-16`). Count then insert, no transaction (`FACT-3642`). Returns the entity.
- **`ListMeetingFiles`** — ownership, then the listing. **`GetMeetingFileContent`** — ownership,
  then the file within the meeting (`MeetingFileNotFound`).
- The current instant is read here (`new Date()`), not in the entity.

### Infrastructure

- **`PrismaMeetingFileRepository`** — the only `meeting-files` code that imports Prisma
  (`FACT-3703`). Owns the `orderBy` of `FACT-2110`, the `new Uint8Array(…)` write conversion the
  service carries today, and `MeetingFile.restore` on read. The listing still reads whole rows;
  selecting fewer columns is a behaviour change and out of scope.
- **`MeetingsServiceAccess`** — calls `MeetingsService.findById(ownerId, meetingId)` and answers
  whether it returned a meeting. This is how the use cases reach the unmigrated `meetings` module:
  `ADR-0018`'s one code path is reused, not re-derived (`FACT-2112`, `FACT-3704`).
- Both may carry `@Injectable()`; only `domain/` and `application/` are decorator-free.

### HTTP adapters (module root)

- **Controller** — same class name, prefix, class-level `@UseGuards(JwtAuthGuard)`, same three
  handlers, same `FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE_BYTES } })` with the
  constant now imported from `domain/`, same empty `@Body() UploadFileDto`. Each handler turns
  request parts into a use-case input, calls it and maps the result out (`FACT-0012` now holds for
  this controller, which it did not — README contradiction 2). Download keeps its four headers and
  the `Buffer.from` conversion here and nowhere else (`FACT-3628`, `FACT-2114`). It no longer
  imports `MeetingsService` or `MEETING_NOT_FOUND_MESSAGE`.
- **Error filter** — `@Catch(MeetingFileError)`, bound to the controller class with `@UseFilters`
  between `@Controller` and `export class` (where `AR-API-05`'s scan reads class decorators). It
  maps each `kind` to the `HttpException` §3 lists and hands that to Nest's `BaseExceptionFilter`,
  so the reply goes through the framework's default path exactly as a thrown exception does today
  (probe F1, `FACT-3717`: same status, raw body and headers; unmatched exceptions untouched).
  The mapping is exhaustive over `kind`: a new domain error with no row fails `pnpm typecheck`.
  `FILE_NOT_FOUND_MESSAGE` moves here; `MEETING_NOT_FOUND_MESSAGE` is imported from
  `meetings.controller.ts` (HTTP layer to HTTP layer).
- **`Content-Disposition` builder** — `buildContentDisposition` and its private steps move unchanged
  to the root, beside the controller: header syntax is HTTP, not domain. `FACT-2115`, `FACT-3650`
  hold as written.
- **Mapper** — `toMeetingFileDto` unchanged (`FACT-1063`, `FACT-3626`).
- **DTO** — `UploadFileDto` stays empty (`FACT-2089`); it has no limit to import.

### Wiring

`MeetingFilesModule` keeps importing `AuthModule`, `PrismaModule`, `MeetingsModule`. The two ports
are bound to `Symbol` injection tokens declared in the HTTP/wiring layer (not in `application/`,
which may not know Nest); the adapters are classes behind them. Each use case is a `useFactory`
provider whose token is the use-case class itself, `inject`ing the two port tokens — so the
controller receives use cases by constructor type with no `@Inject` (`FACT-3705`, probe P2). This is
the first `useFactory`/token in `apps/api` (`research/code.md` §3).

### Boundary enforcement

**A meta-test, not a lint rule** (`FACT-3701`, `FACT-3702`). One new case in
`e2e/architecture/architecture.api.spec.ts`:

- walks every `apps/api/src/*/domain/` and `*/application/` — so a later migrated module is held
  with no edit — and fails if the walk finds nothing (`FACT-3189`);
- extracts every specifier from `import … from`, `import '…'`, `import type`, `export … from` and
  `import(…)`;
- **allow-list**: `node:` built-ins; relative specifiers that resolve inside the same module's
  `domain/` (from `domain/`) or `domain/` + `application/` (from `application/`); `vitest` in
  `*.spec.ts` only. Anything else fails, naming the file and the specifier;
- **the control is a permanent fixture in the spec**, the `AR-API-17` / `FACT-3504` precedent, not a
  one-off run: in-memory sources with a pretended path, driven through the same extraction and
  allow-list as the walk, kept in the spec rather than under `apps/api/src` so it is never part of
  the code. Every form `FACT-3701` claims has a forbidden control, and the case asserts each is
  objected to and nothing else is:
  - from `domain/`: `import { Injectable } from '@nestjs/common'`;
    `import type { Response } from 'express'`; `export * from '@nestjs/common'`;
    `export { PrismaClient } from '@prisma/client'`; bare `import 'reflect-metadata'`; a multi-line
    `import {⏎ Injectable,⏎ Inject,⏎ } from '@nestjs/common'`; `import('express')`;
    `import … from '../infrastructure/…'`; `import … from '../application/…'`; `vitest` in a file
    not ending `.spec.ts`;
  - from `application/`: `import … from '../infrastructure/…'`; `import … from '../meeting-files.module'`;
  - allowed, must pass: `node:crypto` and `./file-name` from `domain/`; `../domain/…` and
    `./meeting-file.repository` from `application/`; `vitest` in a `domain/*.spec.ts`.

  The fixture goes red on the mechanism even while the real walk finds only compliant files, which
  is what `ADR-0010`'s control experiment needs to stay true after the change lands.

What it catches that the lint rule would not: `import()` — probe L1 shows core
`no-restricted-imports` can state the same allow-list with a `regex` pattern and flags every other
form, but passes a dynamic import. Cost: one `node:fs` walk over roughly a dozen files inside a run
that already walks the repository; nothing added to `pnpm lint` (`BL-047`'s unmeasured cost is not
touched). What it gives up: feedback in the editor and the pre-commit hook. The case sits in the
`api` Playwright project, so it runs only inside `pnpm verify` or `pnpm e2e` — with Docker up and
both servers started by `webServer`, although it reads no HTTP itself (root `CLAUDE.md`,
`FACT-3595`).

### Tests, by level (`FACT-3709`)

- **Entities and value objects** — new Vitest units under `domain/`, no storage, no fakes; inside
  the pre-commit floor. Case IDs continue `MF-UT-11` onward, titles `MF-UT-NN — …`, written by the
  test designer.
- **Moved units** — `MF-UT-01`…`03` move with the predicates to a spec under `domain/`;
  `MF-UT-08`…`10` move with the builder to a spec at the module root. Bodies and titles unchanged.
- **Use cases** — no test double and no new harness. Their every branch is already asserted against
  PostgreSQL over HTTP (`MF-API-01`…`19`, `SEC-API-07`, `SEC-API-11`, `SM-API-03`; `FACT-3698`).
  The `integration` project is not used: it reaches the API over HTTP on `:3101` like `api`, so a
  spec there would duplicate `MF-API-*`.
- **The error filter and wiring** — covered by the same HTTP cases, which assert the status and
  deep-equal the parsed body (`toEqual`, e.g. `meeting-files.api.spec.ts:367`, `:507`, `:786`) —
  not key order and not error-response headers (`FACT-3698`). Those two are what probe F1 compared
  raw, so the gap is covered by the probe, not by a case; no new case is proposed for it.

### Comments

The 17 "design §N"/`C5` lines in six module files (`research/code.md` §1) are rewritten as the code
moves, citing `FACT-`/`ADR-` keys, invariant numbers and case IDs (root `CLAUDE.md`, "Comments in
code"). That takes `BL-040`'s count from 23 to 6, all outside this module.

### Does not change

`apps/web` (all of it); every route, status and body; the Prisma schema; the seed's content and
path; `ValidationPipe` and its options (invariant 3); `JwtAuthGuard`; `meetings`, `users`, `auth`;
`PROTECTED_ROUTES`.

## 3. Contract

**The HTTP contract does not change.** Every route, header and body is cited, not restated:
`FACT-2080`…`FACT-2117`. The only new thing is **where** each handler-thrown body is produced — one
filter instead of three handlers — and each row constructs the same exception class with the same
argument the controller constructs today (`research/code.md` §2):

| Domain error             | Thrown by               | Filter constructs                                                                                        | Body                     |
| ------------------------ | ----------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------ |
| `FileRequired`           | `UploadMeetingFile`     | `new BadRequestException(['file is required'])`                                                          | `FACT-2102`              |
| `InvalidFileName`        | `FileName`              | `new BadRequestException([FILENAME_RULE_MESSAGE])`                                                       | `FACT-2104`              |
| `UnsupportedContentType` | `ContentType`           | `new UnsupportedMediaTypeException('Unsupported file type: upload a PDF, PNG, JPEG or plain text file')` | `FACT-2085`              |
| `MeetingNotFound`        | all three use cases     | `new NotFoundException(MEETING_NOT_FOUND_MESSAGE)`                                                       | `FACT-2016`, `FACT-3382` |
| `FileLimitReached`       | `MeetingFile.upload`    | ``new BadRequestException([`a meeting may hold at most ${MAX_FILES_PER_MEETING} files`])``               | `FACT-2107`              |
| `MeetingFileNotFound`    | `GetMeetingFileContent` | `new NotFoundException(FILE_NOT_FOUND_MESSAGE)`                                                          | `FACT-2083`              |

Invariant 8 holds by construction: the three 400s pass an array, the 404s and the 415 a string
(`FACT-2086`, `FACT-3651`); the argument form of `NotFoundException` is kept (`FACT-3383`). The cap
message is now built from the constant and renders the identical string (README contradiction 4,
`BL-044`). Not caught by the filter, untouched: 401 (`FACT-2015`), 413 (`FACT-2084`), the string
400 (`FACT-2106`), the pipe's array 400s (`FACT-2103`, `FACT-2105`) — `FACT-3707`.

## 4. Data

Nothing changes in the schema, the rows or the seed. `MeetingFile`'s fields and formats are
`FACT-1057`…`FACT-1062`, now carried by the entity rather than an interface; the mapper strips
`meetingId` and `content` as before (`FACT-1063`, `FACT-3626`). Ids stay `fil-` + `randomUUID()`
at runtime (`FACT-3670`); `uploadedAt` stays an ISO 8601 UTC string (`FACT-1062`, `FACT-3582`). The
seed gains nothing and keeps its path. No new case mutates data: the new units touch no storage, so
no owner is claimed; existing mutating cases keep `planner` (api) and `organizer` (functional)
(`FACT-1071`, `FACT-1037`).

## 5. Alternatives rejected

| Alternative                                                                  | Why not                                                                                                                                                                                                                                                                                          |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Keep `ADR-0006` and do `BL-044` only — move the order into `rules.ts`        | Fixes the scattering and the literal `10` at a tenth of the cost, but the owner asked for the layered pilot, and `BL-044`'s outcome is a subset of this one. Recorded so `BL-044` is closed by this change rather than done twice.                                                               |
| Use cases unit-tested against an in-memory repository                        | The cheapest way to test a use case in isolation, and exactly what `FACT-3589` refused: the units would test the fake. The rules a fake would exercise now sit in the entity, testable with no store (`FACT-3710`).                                                                              |
| Use cases tested against PostgreSQL in a Vitest config run by `pnpm test`    | Tests the use case directly with no fake — the owner's leaning — but `pnpm test` runs in the pre-commit hook, which must pass with no container (`FACT-3711`, probe 7). A separate DB-backed config is left open in §8.                                                                          |
| Use-case specs in the `integration` Playwright project                       | Real database, existing project. But it drives the API over HTTP on `:3101`, identical to `api`, so each spec would restate a `MF-API-*` case under another name.                                                                                                                                |
| `no-restricted-imports` in `apps/api/eslint.config.mjs` (probes P1, L1)      | Immediate feedback in the editor and the hook, zero new dependencies, and a `regex` pattern does express the allow-list (L1). But it passes `import()` (L1, rule source `:817-823`), so the meta-test is needed anyway, and the two would be two lists that must agree (`FX-023`) (`FACT-3712`). |
| Both the lint rule and the meta-test                                         | Best feedback and best coverage, at the price of two lists that must agree forever. Revisit if the late feedback proves costly.                                                                                                                                                                  |
| Per-handler `try/catch` calling one `toHttpException()`                      | No framework hook to reason about; but three copies of the catch, and a fourth handler that forgets it leaks a 500. The filter is bound once on the class.                                                                                                                                       |
| The filter writing the response itself (`response.status().json()`)          | Fewer moving parts than `BaseExceptionFilter`, but it re-implements the reply the framework already does, and imports `express` types into the filter for nothing.                                                                                                                               |
| Keeping `MeetingFilesService` as an `@Injectable()` façade over use cases    | Minimal wiring change; violates the owner's strict rule — a decorator in `application/` — or adds a layer that does nothing.                                                                                                                                                                     |
| `buildContentDisposition` in `domain/`                                       | Keeps all six moved units in one spec; but it is RFC 6266 header syntax, and putting HTTP in the domain is the dependency this pilot exists to remove.                                                                                                                                           |
| Moving every file into `http/`, `domain/`, `application/`, `infrastructure/` | Symmetric; but it re-points `prisma/seed.ts:45`, the seed path in three facts and the controller and DTO paths in four more, for no gain in the boundary, which concerns only `domain/` and `application/`.                                                                                      |
| Value objects for `id`, `sizeBytes`, `uploadedAt`                            | Uniform; but none has a rule of its own — the id format is one line in `upload`, the size is derived (`FACT-3713`).                                                                                                                                                                              |
| The entity re-checking the 1 048 576 ceiling                                 | "The domain governs" taken literally; unreachable behind the interceptor, and a fired check would need a hand-made 413 (`FACT-3629`).                                                                                                                                                            |
| Superseding `ADR-0006`, `ADR-0018`, `ADR-0027` whole                         | Cleaner header links; false for `meetings`, `users`, `auth`, which those records still govern. Retiring only the falsified facts follows `ADR-0029` → `FACT-3111` and `ADR-0031` → `FACT-3583` (`FACT-3715`).                                                                                    |

## 6. Decisions and ADRs

**`ADR-0034`** — `docs/adr/ADR-0034-meeting-files-ports-and-adapters.md`, **proposed**, new keys
`FACT-3693`…`FACT-3717`, locked. `FACT-3716` (the successor to `FACT-3572`) and `FACT-3717` (probe
F1) were added in the correction pass; `FACT-3698`, `FACT-3702`, `FACT-3706`, `FACT-3712` and
`FACT-3714` were reworded in place, which a proposed record allows, and re-locked. Its rationale answers `FACT-3589` head-on: the port exists for the
direction of dependency, and its second implementation is never written.

Second correction pass (the owner's decisions of 2026-10-15): new keys `FACT-3718` (`Clock` and
`UuidSource` ports, their adapters, the entity composing `fil-` + the UUID), `FACT-3719` (the rule:
domain and use cases never read a clock or randomness directly), `FACT-3720` (the entity is
deliberately thin until `BL-050`), `FACT-3721` and `FACT-3722` (rejected: the first draft's direct
calls; a `UuidSource` issuing the whole id), `FACT-3723` (the rule is held by review, not the
meta-test) and `FACT-3724` (`ADR-0031`'s identifier facts stay true). Reworded in place: `FACT-3694`
(the cap literal is in the message, not the comparison; the service's `new Date()`), `FACT-3700`
(the two new adapters), `FACT-3709` (one implementation per port, no test double, a fixed clock
included), `FACT-3717` ("no filter at `d58ddbf`" rather than "today"), and the sources of
`FACT-3693`, `FACT-3694`, `FACT-3696`, `FACT-3697`, `FACT-3712`, `FACT-3717`, none of which cites a
change folder any longer.

**Facts, key by key.** Applied when the owner accepts `ADR-0034`, in the same change as the code —
not before, so the corpus never describes a layout the code does not have.

| Key                                                                                         | Where                              | Treatment                                 | Successor / reason                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------- | ---------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FACT-3589`                                                                                 | `ADR-0027`                         | **retire** into its register              | `FACT-3703`                                                                                                                                                                                                                                                                                           |
| `FACT-3386`                                                                                 | `ADR-0018`                         | **retire** into a new register            | `FACT-3706` (states both layouts). `ADR-0018` has no `## Retired facts` table yet; `FACT-3489` makes it the document's register, so one is created                                                                                                                                                    |
| `FACT-3572`                                                                                 | `ADR-0027`                         | **retire** into its register              | `FACT-3716`: "the services read and write" stops being true of `MeetingFile`, which the adapter reads and writes; the successor names both                                                                                                                                                            |
| `FACT-0026`                                                                                 | `architecture.md`                  | **retire**                                | new key A1: "Layered modules — controller → service → store — `meetings`, `users`, `auth` — `ADR-0006`"                                                                                                                                                                                               |
| `FACT-0059`                                                                                 | `architecture.md`                  | **retire**                                | new key A2 in "Patterns in use": "Ports and adapters around a domain model — `meeting-files` — `ADR-0034`"                                                                                                                                                                                            |
| —                                                                                           | `architecture.md` "Layers"         | **add**                                   | new key A3 scoping the existing table to `ADR-0006` modules, and new keys A4… for a second table: entity/value object, use case, port, repository adapter, error filter — may / must not                                                                                                              |
| `FACT-2090`, `FACT-2110`, `FACT-2115`                                                       | `api-contract.md`                  | **re-point the source, `pnpm fact:lock`** | the meaning stays true; only the trailing path moves. The trailer is inside the hashed text (a list item's statement takes its continuation lines, `scripts/facts-parse.mjs:161-173`), so the hash changes, and `FACT-3501` says a wording fix regenerates the lock while a change of meaning retires |
| `FACT-3665`                                                                                 | `ADR-0031` Context                 | **untouched**                             | a historical statement, true of the commit it describes; accepted ADRs are not edited                                                                                                                                                                                                                 |
| `FACT-3669`, `FACT-3670`, `FACT-1081`, `FACT-1082`                                          | `ADR-0031`, `data-model.md`        | **untouched**                             | an upload still issues `fil-` + a `randomUUID()` body; only where the call sits moves, which none of them states (`FACT-3724`)                                                                                                                                                                        |
| `FACT-1057`, `1063`, `1065`, `1070`, `1075`, `2087`, `2089`, `2098`, `2112`, `3618`, `3650` | various                            | **untouched**                             | path or symbol unchanged (§2 layout) and statement still true                                                                                                                                                                                                                                         |
| `FACT-0012`…`0016`, `FACT-3103`…`3105`                                                      | `architecture.md`, `ADR-0006`      | **kept**                                  | they state what a controller, service, mapper, DTO and guard may do; `meeting-files` has no service and its controller now obeys `FACT-0012`. A3 scopes them                                                                                                                                          |
| `FACT-1067`, `FACT-0058`                                                                    | `data-model.md`, `architecture.md` | **kept**                                  | `FACT-1067` quantifies over services and stays true of the three that remain; `FACT-0058` says "one injected client", still true                                                                                                                                                                      |
| `FACT-3628`, `FACT-3629`, `FACT-2100`                                                       | `ADR-0029`, `api-contract.md`      | **kept**                                  | the conversion stays in the controller, the limit in the interceptor, the order in the handler's call                                                                                                                                                                                                 |
| `FACT-0008`                                                                                 | `architecture.md`                  | **kept**                                  | `apps/api` still holds those file kinds; A2 names the new directories                                                                                                                                                                                                                                 |

A1…A4 take numbers from `pnpm fact:next architecture` when written. Unhashed `**Source:**` lines
re-pointed in the same edit: `docs/data-model.md:56`, `docs/api-contract.md:284`, `:299`.

**A1…A4, drafted** so the plan does not invent them (wording may be tightened, not changed in
meaning):

- **A1** (replaces `FACT-0026`, "Patterns in use"): Layered modules | controller → service → store, in
  `meetings`, `users` and `auth` | `ADR-0006`.
- **A2** (replaces `FACT-0059`, "Patterns in use"; the "Refused" row leaves): Ports and adapters
  around a domain model | `apps/api/src/meeting-files`: `domain/`, `application/`,
  `infrastructure/`, HTTP adapters at the module root | `ADR-0034`.
- **A3** (above the existing "Layers" table): the table below governs the modules layered by
  `ADR-0006` — `meetings`, `users`, `auth`; `meeting-files` is governed by the table after it. —
  `ADR-0006`, `ADR-0034`.
- **A4…** — one key per row of a second table, source `ADR-0034`:

| Element                     | Lives in          | May                                                                                                                                                                                                     | Must not                                                                                                                                                                   |
| --------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entity, value object        | `domain/`         | hold the rules and the limits; validate on creation; throw a domain error; import `domain/` and `node:`; receive the current instant and a UUID as arguments, and compose the prefixed id from the UUID | import any package; carry a decorator; know a status code; read a clock or randomness itself — no `new Date()`, `Date.now()` or `node:crypto`                              |
| Domain error                | `domain/`         | carry a literal `kind` and the data its message needs                                                                                                                                                   | carry a status code or HTTP text                                                                                                                                           |
| Use case                    | `application/`    | call ports and entities in the contract's evaluation order; take the current instant from the `Clock` port and a UUID from the `UuidSource` port and pass them to the entity; throw a domain error      | import any package; carry a decorator; hold a rule the entity can hold; return a DTO; read a clock or randomness directly — no `new Date()`, `Date.now()` or `node:crypto` |
| Port                        | `application/`    | declare what a use case needs, in domain types — storage, another module's answer, the current instant (`Clock`), a UUID (`UuidSource`)                                                                 | name a Prisma, Nest or `express` type; return a finished prefixed id                                                                                                       |
| Repository / access adapter | `infrastructure/` | implement one port over `PrismaService` or another module's service; restore stored rows without validation; carry `@Injectable()`                                                                      | hold a business rule; throw an `HttpException`; be imported by `domain/` or `application/`                                                                                 |
| Clock / UUID adapter        | `infrastructure/` | implement `Clock` over the system clock and `UuidSource` over `node:crypto`'s `randomUUID`; be the one implementation of its port                                                                       | add the id prefix; have a test double anywhere in the repository; be imported by `domain/` or `application/`                                                               |
| Error filter                | module root       | map each domain error `kind` to one `HttpException` and hand it to `BaseExceptionFilter`                                                                                                                | catch anything but the module's domain errors; write the response itself                                                                                                   |
| Controller                  | module root       | turn request parts into a use-case input; map the result out; convert bytes for the download                                                                                                            | call Prisma, a port or another module's service directly; throw for a business rule                                                                                        |

**Rationale copies in `docs/architecture.md`** (unkeyed, so no register; rewritten in the same edit
as A1/A2 so they do not contradict them): `:132-133` "Layered modules make each layer testable
without the one above it" gains "ports and adapters keep the rules testable with no framework and
no driver loaded (`ADR-0034`)"; `:175-177` "A repository layer over Prisma would have exactly one
second implementation…" stays as the reason `ADR-0027` gave and gains that `ADR-0034` builds the
port for the direction of dependency and never writes the fake.

**Approved deliverables named, not written here:** a `clean-architecture` skill holding the
canonical examples — entity, value object, domain error, use case, port, Prisma repository adapter,
controller and mapper, error filter, module wiring — drawn from this pilot; and an update to
`.claude/agents/implementer-api.md` pointing at it and at `ADR-0034` (frontmatter held by
`AR-API-07`).

**Follow-up backlog rows** (filed by the ledger stage): migrate `meetings`; migrate `users`; migrate
`auth` — each its own change under `ADR-0034`, each retiring what it falsifies.

## 7. Impact on what already exists

| Artifact family                       | Grep or command run                                                                                                                                                                                   | IDs returned                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing specs and case preconditions | `grep -rn "meeting-files\.rules\|meeting-files\.service\|MeetingFilesService\|meeting-file\.types"` over `*.ts`, `*.md`, `*.mjs`, `*.json` outside `docs/plans`, `apps/api/src/meeting-files`, `dist` | **Case expectations: none change.** Pointers only: `meeting-files.unit.cases.md:46-48`, `:53-55` ("Where automated") and `:57` (spec path heading, held by suite-integrity rules 4, 7, 8) — `MF-UT-01`…`03`, `08`…`10`; `e2e/README.md:55`. Comments only: `e2e/security/security.api.spec.ts:535`, `:754`. `MF-UT-03`'s prose "the controller normalizes a string first" becomes the value object's doing — a prose edit to the case text, not an expectation change; its assertions do not move               |
| Corpus keys                           | `scripts/facts-parse.mjs` path scan (`research/contract.md` §H); `grep -n "FACT-3589\|FACT-0059\|FACT-0026\|FACT-3386"`                                                                               | Retire `FACT-3589`, `FACT-3572`, `FACT-3386`, `FACT-0026`, `FACT-0059`; re-point and re-lock `FACT-2090`, `FACT-2110`, `FACT-2115`; new `FACT-3693`…`FACT-3717` (locked) and A1…A4. Counting words: `FACT-0008` ("holds `*.controller`, `*.service`…") stays true; `FACT-1067` ("Each service…") quantifies over services and stays true. Not affected: `FACT-2119`, `FACT-2120` (web callers of the unchanged routes); `ADR-0014`, `ADR-0015`, `ADR-0016`, `ADR-0032` (roles, corpus, stages, verdict capture) |
| Hand-kept lists                       | `PROTECTED_ROUTES`, `PROTECTED_PAGES`, `POST_ROUTES`, `KNOWN_CASE_PREFIXES`, `UNIT_SPEC_EXEMPT`, `apps/api/CLAUDE.md` Map                                                                             | No route, page or prefix added: lists unchanged. `apps/api/CLAUDE.md` Map row for `*.rules.ts` and the meeting-files row change to the four-layer layout. `BL-040` count 23 → 6; `BL-044` closed by this change; `BL-043` (`issueId` in `src/common/`) **now conflicts** — `domain/` may not import `src/common/`                                                                                                                                                                                               |
| Framework output                      | —                                                                                                                                                                                                     | Bodies are the same `HttpException` instances handed to the same default reply path (`BaseExceptionFilter`), so status, headers and JSON are unchanged: probe F1 compared raw body and headers (`FACT-3717`), and `MF-API-02`…`19` keep asserting status and the deep-equal parsed body (`FACT-3698`). The boot check `apps/api/test/app.e2e-spec.ts` now also resolves the factory providers.                                                                                                                  |

Invariants: 1 (no `@HttpCode` added — upload stays 201, `FACT-2087`), 3 (pipe untouched), 4, 5
(`ownerId` from `@CurrentUser()` into the use case input), 7 (`FACT-2110` in the adapter), 8 (§3),
16 (routes unchanged) — all held, none edited.

## 8. Open questions and deliberate omissions

**For the owner:**

1. **A database-backed harness for use cases.** This design tests use cases only through HTTP. If
   the owner wants a use case exercised directly against PostgreSQL, it needs a Vitest config run
   inside `pnpm verify` with a `DATABASE_URL` and a database that does not collide with
   `purpleschool_e2e`'s per-run reset — no pattern exists (`FACT-3697`). Proposed as a backlog row,
   not built.
2. **Boundary feedback timing.** The meta-test is in the `api` Playwright project, so it fires only
   inside `pnpm verify` / `pnpm e2e` — with Docker running and both servers up — never at commit or
   under `pnpm lint`. If that proves too late, adding the lint rule (a `regex` allow-list, probe L1)
   is the rejected "both" option and needs a decision on the second list.
3. **Supersession form.** `ADR-0034` retires four facts and supersedes no record whole (§5, last
   row). If the owner wants `ADR-0006` marked superseded, that is a different record with a
   different scope.

**Carried from research, not settled here:** README contradictions 6 (`FACT-3495` vs `AR-API-15`),
8 (multer version in `ADR-0029`), 9 (`BL-004`) — outside this change. Contradiction 7 (the download
response and `FACT-3105`) is left as it is: the bytes route keeps its headers in the controller.

**The filter is probed, not assumed** (probe F1, `FACT-3717`). What the probe does not cover is
the real module — `JwtAuthGuard`, `FileInterceptor` and the `APP_PIPE` around the handler; those
raise before the handler and are outside the filter by `FACT-3707`, and `MF-API-*` and `SEC-API-*`
exercise them. **What the fallback would cost**, if the real module still disagreed: the
per-handler `try/catch` (§5) falsifies "the module's one exception filter" in `FACT-3700` and
`FACT-3706`. Before acceptance that is an in-place rewording of a proposed record plus a re-lock;
after acceptance it is a new record retiring both keys (`ADR-0022`). It is a design change, not a
swap of one §5 row.

**Corpus facts citing this change folder.** `FACT-3693`, `FACT-3694`, `FACT-3696`, `FACT-3712` and
`FACT-3717` name `docs/plans/clean-architecture-pilot/` as their source, as `ADR-0029` cites
`docs/plans/meeting-files/research/probes.md`. The root `CLAUDE.md` forbids that in **code
comments**, not in corpus sources; flagged in case the lead reads it otherwise.

**Deliberately not done:** `apps/web`; the other three modules; selecting fewer columns for the
listing; a transaction around the cap; the remaining six `BL-040` lines; `BL-043`; the
`clean-architecture` skill and the `implementer-api` edit (approved deliverables of later stages).
