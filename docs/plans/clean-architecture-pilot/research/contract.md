# Contract sweep — clean-architecture-pilot (`apps/api/src/meeting-files`)

Facts cited by key. Unkeyed corpus text is reported as "the corpus reasons X, states no fact". Nothing here proposes a design.

## A. Current layering and the refusal of a repository layer

| Key                     | Document                                        | Verbatim                                                                                                                                                                                                                                                              |
| ----------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FACT-0012`             | architecture.md "Layers"                        | Controller — May: "route, validate a DTO, read `@CurrentUser()`, map out"; Must not: "hold rules, touch the store, assemble a response by hand"                                                                                                                       |
| `FACT-0013`             | architecture.md                                 | Service — May: "hold the rules, own the store, sort, count, hash"; Must not: "know about HTTP, read `Request`, invent status codes beyond the documented ones"                                                                                                        |
| `FACT-0014`             | architecture.md                                 | Mapper — May: "turn an entity into a DTO, dropping internal fields"; Must not: "be skipped — a response assembled inline leaks `ownerId`"                                                                                                                             |
| `FACT-0015`             | architecture.md                                 | DTO — May: "describe the shape and the validation"; Must not: "carry an owner or a role field (invariant 5); omit `@IsOptional()` on an optional (invariant 2)"                                                                                                       |
| `FACT-0026`             | architecture.md "Patterns in use"               | "Layered modules — controller → service → store, per Nest module" (`ADR-0006`)                                                                                                                                                                                        |
| `FACT-0027`             | architecture.md                                 | "DTO + mapper at the edge — `*.mapper.ts`, `toMeetingDto`" (`ADR-0006`)                                                                                                                                                                                               |
| `FACT-0058`             | architecture.md                                 | "Prisma client + seed script — one injected client; `*.seed.ts` applied by `db:seed`" (`ADR-0027`)                                                                                                                                                                    |
| `FACT-0059`             | architecture.md "Patterns deliberately refused" | "A repository layer between a service and Prisma" — recorded in `ADR-0027`                                                                                                                                                                                            |
| `FACT-3589`             | ADR-0027 Decision, Rejected                     | "A repository or data-access layer between the service and Prisma — the service already owns the store, and an interface whose only second implementation is a hand-written fake moves the unit tests from testing the code to testing the fake." (cites `FACT-0013`) |
| `FACT-3572`             | ADR-0027                                        | "`User`, `Meeting` and `MeetingFile` are tables. The services read and write through one injected Prisma client and keep no in-process copy of the data."                                                                                                             |
| `FACT-1067`             | data-model.md                                   | "Each service reads and writes through one injected Prisma client and keeps no in-process copy of the data."                                                                                                                                                          |
| `FACT-0008`             | architecture.md                                 | "`apps/api` holds `*.controller`, `*.service`, `*.mapper` and `*.seed`."                                                                                                                                                                                              |
| `FACT-3103`–`FACT-3105` | ADR-0006 Decision                               | Controller "routes, validates through its DTO, reads identity from `@CurrentUser()`, and maps the result out. Nothing else."; Service "holds the rules and owns the store, and knows nothing about HTTP."; Mapper "is the only way an entity becomes a response."     |

Rationale blocks (unkeyed), where the same argument is repeated: architecture.md "Patterns deliberately refused" rationale: "A repository layer over Prisma would have exactly one second implementation — a hand-written fake — which moves the unit tests from testing the code to testing the fake, and the service already owns the store." The keyed form is `FACT-3589`; the architecture.md prose copy is in a Rationale block. ADR-0027's closing Rationale (unkeyed) says "That holds for the unit layer, which probe 7 measured" (no unit needs the container).

Unkeyed layering text: `apps/api/CLAUDE.md` Map says `src/<feature>/*.rules.ts` is "pure rules with no Nest or Prisma imports, so they carry units" (no key; CLAUDE.md is not a keyed document). The corpus states no fact about a `rules` file as a layer; `FACT-0013` places rules in the service.

## B. Facts/ADRs the requirement would touch (not resolved)

- `FACT-0059`, `FACT-3589` — repository layer refused (requirement: Prisma repository adapter behind ports).
- `FACT-0013`, `FACT-3104` — "Service holds the rules and owns the store" (requirement: rules in entities, use cases with ports).
- `FACT-0012`, `FACT-3103` — controller "Nothing else"; "hold rules, touch the store" forbidden (requirement keeps controllers as adapters).
- `FACT-0026` — layering is "controller → service → store, per Nest module" (requirement: domain/application/infrastructure shape).
- `FACT-0008` — module layout is `*.controller`, `*.service`, `*.mapper`, `*.seed`.
- `FACT-0058`, `FACT-3572`, `FACT-1067` — services use one injected Prisma client directly.
- `FACT-3386` (ADR-0018) — "The controller throws and the service returns `undefined`: translating absence into HTTP is the controller's job." (requirement: entities raise domain errors, one adapter maps them to HTTP).
- `FACT-2099`/`FACT-2089` — `UploadFileDto` is deliberately empty, relies on `ValidationPipe` `forbidUnknownValues: false`.
- `FACT-3628` — "converted to a `Buffer` at the controller boundary and nowhere else."
- `FACT-3650` — read path validates its own output (`buildContentDisposition`, in `meeting-files.rules.ts`).
- `FACT-3629` — 1 048 576 limit "enforced by the file interceptor's `limits.fileSize`, so the 413 body is the one `@nestjs/platform-express` already produces rather than one written by hand."
- `FACT-1076`, `FACT-1030`, `FACT-3580` — test isolation by data (own meeting per mutating case; no test depends on another's data).
- No refused-pattern or pattern key mentions "DI tokens", "ports", "use case", "domain error" or "value object" (grep of architecture.md, data-model.md, api-contract.md: only `FACT-0059` / rationale lines hit "repositor"). The corpus states no fact on these.
- Code vs `FACT-0012`/`FACT-0013`: see Divergence.

## C. The meeting-files contract

Routes table (api-contract.md, keys `FACT-2080`–`FACT-2082`); all `Bearer`, class-level `JwtAuthGuard` (`FACT-2087`, `FACT-2109`, `FACT-2113`):

| Route                                     | Key         | Success                                                        | Errors listed           |
| ----------------------------------------- | ----------- | -------------------------------------------------------------- | ----------------------- |
| `POST /meetings/:id/files`                | `FACT-2080` | `201` (no `@HttpCode`; invariant 1 is login-only, `FACT-2087`) | 400, 401, 404, 413, 415 |
| `GET /meetings/:id/files`                 | `FACT-2081` | `200`                                                          | 401, 404                |
| `GET /meetings/:id/files/:fileId/content` | `FACT-2082` | `200`                                                          | 401, 404                |

Upload request: `multipart/form-data`, exactly one part `file` (`FACT-2088`); `UploadFileDto` has no properties (`FACT-2089`). Filename = `file.originalname`, 1–100 chars matching `^[A-Za-z0-9](?:[A-Za-z0-9._ -]*[A-Za-z0-9._-])?$` (`FACT-2090`), judged on the decoded form (`FACT-2091`; separator/empty clauses unreachable over HTTP, `FACT-2092`). Content type: media type cut at `;`, trimmed, lower-cased, one of `application/pdf`, `image/png`, `image/jpeg`, `text/plain`, normalized value stored (`FACT-2093`, `FACT-3631`); absent/unparseable part type accepted as `text/plain` (`FACT-2094`, `FACT-3649`). Size ≤ 1 048 576 bytes via `limits.fileSize` (`FACT-2095`, `FACT-3629`). Count: refused when the meeting already holds ten; count then insert, no transaction (`FACT-2096`, `FACT-3642`). Upload response `201` body is `MeetingFileDto` (`FACT-1063`).

Evaluation order (`FACT-2097`–`FACT-2100`): guard 401 → `FileInterceptor` (413; string 400 wrong field) → `ValidationPipe` on empty DTO (array 400) → handler: missing file → filename → content type (415) → ownership (404) → cap (400). `FACT-2101`: ownership before cap; oversized stranger gets 413.

Error bodies (verbatim from keyed rows):

- `FACT-2102` 400 `{"message":["file is required"],…}`; `FACT-2103` 400 `["property file should not exist"]`; `FACT-2104` 400 `["filename must be 1 to 100 characters of letters, digits, dot, underscore, hyphen or space"]`; `FACT-2105` 400 `["property label should not exist"]`; `FACT-2106` 400 `{"message":"Unexpected field - attachment",…}` (string); `FACT-2107` 400 `["a meeting may hold at most 10 files"]`.
- `FACT-2084` 413 `{"message": "File too large", "error": "Payload Too Large", "statusCode": 413}`.
- `FACT-2085` 415 `{"message": "Unsupported file type: upload a PDF, PNG, JPEG or plain text file", "error": "Unsupported Media Type", "statusCode": 415}`.
- `FACT-2016` 404 `{"message": "Meeting not found", "error": "Not Found", "statusCode": 404}`; `FACT-2083` 404 `{"message": "File not found", "error": "Not Found", "statusCode": 404}` (`FACT-2117`: file on another meeting or absent).
- `FACT-2015` 401 `{"message": "Authentication required", …}`; `FACT-2012`/`FACT-2013` array 400 shapes.
- `FACT-2086`: `message` is an array on every 400 except multipart-limit ones raised by `@nestjs/platform-express`; string on 401/404/413/415; a handler throwing `new BadRequestException([...])` yields the array shape (`FACT-3651`). `FACT-2066`: no-argument `NotFoundException()` forbidden.
- `FACT-2108`: three of the 400 bodies are unreachable through the web form.

List: `FACT-2109` `{ "items": MeetingFileDto[] }`, no `total`, no bytes (`FACT-1065`, invariant 4); `FACT-2110` `uploadedAt` desc, `id` asc secondary (invariant 7); `FACT-2111` owned meeting with no files → 200 empty `items`; `FACT-2112` unknown/foreign meeting → the `FACT-2016` 404 "resolved through `MeetingsService.findById` rather than a query of its own".

Download: `FACT-2113` 200 bytes; `FACT-2114` headers `Content-Type` = stored, `Content-Length` = buffer length, `Content-Disposition: attachment; filename="…"; filename*=UTF-8''…`, `X-Content-Type-Options: nosniff`; `FACT-2115` header built in three steps; `FACT-2116` no error status for a hostile stored name; builder table (6 rows, no key per row, source `meeting-files.seed.ts`, `SEC-API-11`).

Data model (`MeetingFile`, data-model.md): `FACT-1081` `id` `fil-` + `randomUUID()` (seed `fil-<owner>-<n>-<k>`, `ADR-0031`/`FACT-3670`, ids application-issued, no schema `@default`); `FACT-1057` `meetingId` text, cascade, never leaves API; `FACT-1058` `filename`; `FACT-1059` `contentType` normalized, one of four; `FACT-1060` `sizeBytes` integer 1 … 1 048 576 "written from the length of the stored buffer"; `FACT-1061` `content` bytea, `Uint8Array` on read; `FACT-1062` `uploadedAt` ISO 8601 UTC text; `FACT-1018` timestamps ISO UTC ms; `FACT-3582` string columns; `FACT-1064` index `MeetingFile(meetingId)`; `FACT-1068` lifetime: rows die with compose volume or `db:reset`; `FACT-3617` cascade removes files with the meeting.

Where each limit is stated as fact:

- size 1 048 576: `FACT-2095`, `FACT-3629`, `FACT-2084`, `FACT-1060`.
- filename length 1–100 + pattern: `FACT-2090`, `FACT-2104`, `FACT-1058` (links to api-contract).
- count 10: `FACT-2096`, `FACT-3642`, `FACT-2107`.
- content types: `FACT-2093`, `FACT-3631`, `FACT-2085`, `FACT-1059`.
- ASCII `filename` fallback capped at 100: `FACT-2115`.

Shapes as declared in code: `apps/api/src/meeting-files/meeting-file.types.ts` — `MeetingFile {id, meetingId, filename, contentType, sizeBytes, content: Uint8Array, uploadedAt}`; `MeetingFileDto = Omit<MeetingFile,'meetingId'|'content'>`; `CreateMeetingFileInput {filename, contentType, content: Buffer}`. Mapper `meeting-files.mapper.ts` `toMeetingFileDto` lists five keys explicitly (strips `meetingId`, `content`; `FACT-1063`). `dto/upload-file.dto.ts`: `export class UploadFileDto {}`. Constants `MAX_FILES_PER_MEETING = 10`, `MAX_FILE_SIZE_BYTES = 1_048_576`, `FILENAME_RULE_MESSAGE`, predicates and `buildContentDisposition` live in `meeting-files.rules.ts`; unit spec `meeting-files.rules.spec.ts` (cases `MF-UT-01`–`03`, `08`–`10`, `e2e/regression/meeting-files/meeting-files.unit.cases.md`). Module imports `AuthModule`, `PrismaModule`, `MeetingsModule`; controller depends on `MeetingsService` and `MeetingFilesService`.

Seed (data-model.md): `FACT-1072` `mtg-teacher-3` 2 files (`syllabus.pdf` 1024 B, `notes.txt` 48 B); `FACT-1073` `mtg-planner-2` 5 files, hostile names written straight through Prisma, "never uploaded"; `FACT-1074` every other meeting 0 files; `FACT-1075` deterministic bytes; `FACT-1070` seed modules + `prisma/seed.ts`. Safe to mutate: `FACT-1071` `planner` (api specs), `FACT-1037` `organizer` (functional specs); `FACT-1039` `teacher` and `student` are never mutated; `FACT-1076` a mutating file case makes its own meeting; `FACT-1038` shared password `Passw0rd!`.

## D. 404 over 403 for meeting-files

`ADR-0018`: `FACT-3380` (owner-scoped read of a single record answers 404 for absent and foreign alike, 403 not used), `FACT-3381` (same body/status/headers/code path), `FACT-3382` (exact body, `new NotFoundException('Meeting not found')`), `FACT-3383`, `FACT-3386`, `FACT-3392` ("Every future owner-scoped by-id route answers 404 the same way ... a route that wants 403 has to supersede this record"). Meeting-files specifics: `FACT-2112` (list), `FACT-2101` (upload, ownership before cap), `FACT-2117` / `FACT-2083` (file id not on an owned meeting: different body "File not found"). `FACT-3395`: timing is not equalized for record ids.

## E. ADRs

- `ADR-0022` (fact lifecycle): `FACT-3487` a changed reality retires the old fact and a new fact with a fresh key replaces it; `FACT-3488` withdrawn facts; `FACT-3489` retired facts listed in the document's register; `FACT-3495` (`docs/adr/ADR-0022-fact-lifecycle.md:72`) "`AR-API-17` fails when a stated fact's text no longer matches the hash the lock holds" — whereas `e2e/architecture/architecture.api.cases.md:243-258` gives the lock-hash comparison to `AR-API-15`, and `:271-282` defines `AR-API-17` as the retirement-register fixture check (contradiction, not resolved; see README); `FACT-3501` correcting a fact costs a decision. Touches the requirement only if a layering fact (`FACT-0012`/`0013`/`0026`/`0059`) changes.
- `ADR-0027`: Postgres via Prisma replaces in-memory store; `FACT-3572` services use one injected Prisma client; `FACT-3589` refuses a repository layer; `FACT-3581` client never connected eagerly (no `$connect`, no `OnModuleInit`); `FACT-3577` no service constructor touches the DB; `FACT-3580` isolation through data; `FACT-3595` Docker required for `pnpm e2e`/`verify`.
- `ADR-0029`: file bytes in `bytea`, never in JSON; `FACT-3626` mapper drops `content`; `FACT-3627` one bytes endpoint with four headers; `FACT-3628` `Buffer` conversion at the controller boundary only; `FACT-3629` size via interceptor; `FACT-3631` allow-list + normalization; `FACT-3647` (`ADR-0029:47-50`) a part with absent, empty or unparseable `Content-Type` "reaches the handler as `file.mimetype === 'text/plain'`" (busboy default, multer passes it through); `FACT-3642` ten-file cap; `FACT-3650` read path validates own output; `FACT-3619` multer limit errors mapped by `@nestjs/platform-express`; `FACT-3639` rejecting content type in `fileFilter` → 500 (rejected); `FACT-3640` routes in `PROTECTED_ROUTES`.
- `ADR-0031`: `FACT-3669`/`FACT-3670` `fil-` + `randomUUID()` from a runtime create path, ids application-issued, schema declares no `@default`; `FACT-3591` schema-issued ids rejected. Touches the id generation location (currently `meeting-files.service.ts` `create`).
- `ADR-0006`: layering, validation as `APP_PIPE`: `FACT-3103`–`FACT-3106`, rejected `FACT-3107`–`FACT-3109`; `FACT-3651` array vs string `message`.
- `ADR-0010`: `FACT-3184`–`FACT-3188` meta-tests; `FACT-3194` a feature registers its case prefix in `KNOWN_CASE_PREFIXES`. `ADR-0021`: `FACT-3460`/`FACT-3461` keyed facts only; unkeyed is not a fact.

## F. Shared constants/limits and DTO validation

- No keyed fact says where shared limits or constants live (module, domain or DTO). Corpus-stated: `FACT-1060` and `FACT-2095` state the numbers; `apps/api/CLAUDE.md` Map (unkeyed) `src/common/` "code shared by two or more features and owned by none".
- DTO validation: `FACT-0015` (DTO describes shape + validation; invariants 2, 5); `FACT-3106` `ValidationPipe` `APP_PIPE`, `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true` (invariant 3); `FACT-3110` invariant 2 consequence; `FACT-2012`, `FACT-2013`, `FACT-2086` (invariant 8 shapes); `FACT-2089` empty-DTO dependency.
- The only DTO of this feature is `UploadFileDto {}`; the filename, size and count limits are not in a DTO (they are in `meeting-files.rules.ts` and the controller). The requirement's "DTOs import constants from domain" has no existing DTO use to compare against.

## G. How an architectural change is recorded

- `FACT-0047` "An architectural choice — an ADR **first**, then the code: `pnpm adr:new <slug>`". `FACT-0051` the rationale blocks are held true "by the rule that an architectural change writes its ADR before its code, and by the plan-review gate".
- `docs/adr/README.md` "Rules" (unkeyed prose, no fact key): accepted ADR is not edited in substance; a changed decision is a new ADR whose `Supersedes` names the old one, and the old one's status becomes `superseded`. Precedent: `ADR-0027` header `Supersedes: ADR-0007`; `FACT-3593`.
- `FACT-3487`–`FACT-3489` (ADR-0022) for retiring and replacing facts; `FACT-3492` `pnpm fact:lock`.
- `FACT-0042` for an endpoint and `FACT-0043` for a response field: the touch lists; neither covers a refactor with a fixed contract. Corpus states no fact on refactors that change no contract.

## H. Keyed facts whose locked text names meeting-files paths or symbols

The lock rule, as written in the repository:

- `docs/facts-lock.json` holds per key `status`, `document`, `hash` (`:1-8`). The hash is `sha256` over the statement with whitespace collapsed (`scripts/facts-parse.mjs:71-73`; written at `:301`).
- What the statement is: a list item contributes itself and its continuation lines (`facts-parse.mjs:162-174`), so a trailing `— path, case-ID` source inside the item is hashed. A table row contributes the row alone; it inherits the nearest `**Source:**` line above its table "for the source check only — the hash covers the row alone" (`:126-129`; `statement: line`, `scope: ${blockSource}\n${line}` at `:197-198`).
- The check: `AR-API-15` "rebuild the lock from the corpus through the same parser `pnpm fact:lock` uses, and compare … statement hashes that differ. Expected: no differences" (`e2e/architecture/architecture.api.cases.md:243-258`; spec title at `e2e/architecture/architecture.api.spec.ts:1137`). "Failure means: if the words changed but the fact did not, run `pnpm fact:lock` … If the fact changed, retire the key and state the new one under a fresh number (`ADR-0022`)" (`architecture.api.cases.md:254-256`). `pnpm fact:lock` = `node scripts/facts-lock.mjs write` (`package.json:30`).

Hashed statements naming a module path or symbol (scan: every fact from `allStatedFacts` in `scripts/facts-parse.mjs`, 787 stated facts, regex over the statement for `apps/api/src/meeting-files`, `meeting-files.{controller,service,rules,mapper,module,seed,types}`, `upload-file.dto`, `MeetingFiles{Service,Controller,Module}`, `toMeetingFileDto`, `buildContentDisposition`, the rules predicates and constants, `UploadFileDto`, `findByIdForMeeting`, `FILE_NOT_FOUND_MESSAGE`, `SEED_MEETING_FILES`, `MeetingsService.findById`, `FileInterceptor`, `StreamableFile`, `.rules.ts`; `docs/plans/meeting-files/...` references masked out first):

| Key         | Location (statement lines)                              | Form  | Path / symbol in the hashed text                                                   |
| ----------- | ------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------- |
| `FACT-1057` | `docs/data-model.md:62`                                 | table | `toMeetingFileDto`                                                                 |
| `FACT-1063` | `docs/data-model.md:69-71`                              | list  | `apps/api/src/meeting-files/meeting-files.mapper.ts`                               |
| `FACT-1065` | `docs/data-model.md:93-96`                              | list  | `apps/api/src/meeting-files/meeting-files.controller.ts`                           |
| `FACT-1070` | `docs/data-model.md:147-151`                            | list  | `meeting-files.seed`                                                               |
| `FACT-1075` | `docs/data-model.md:176-178`                            | list  | `apps/api/src/meeting-files/meeting-files.seed.ts`                                 |
| `FACT-2087` | `docs/api-contract.md:241-243`                          | list  | `MeetingFilesController`, `apps/api/src/meeting-files/meeting-files.controller.ts` |
| `FACT-2089` | `docs/api-contract.md:247-252`                          | list  | `UploadFileDto`, `apps/api/src/meeting-files/dto/upload-file.dto.ts`               |
| `FACT-2090` | `docs/api-contract.md:253-256`                          | list  | `apps/api/src/meeting-files/meeting-files.rules.ts`                                |
| `FACT-2098` | `docs/api-contract.md:289`                              | table | `FileInterceptor`                                                                  |
| `FACT-2110` | `docs/api-contract.md:329-331`                          | list  | `apps/api/src/meeting-files/meeting-files.service.ts`                              |
| `FACT-2112` | `docs/api-contract.md:334-336`                          | list  | `MeetingsService.findById`                                                         |
| `FACT-2115` | `docs/api-contract.md:347-352`                          | list  | `apps/api/src/meeting-files/meeting-files.rules.ts`                                |
| `FACT-3618` | `docs/adr/ADR-0029-file-bytes-in-the-database.md:24-27` | list  | `FileInterceptor`                                                                  |
| `FACT-3650` | `docs/adr/ADR-0029-file-bytes-in-the-database.md:82-86` | list  | `apps/api/src/meeting-files/meeting-files.seed.ts`                                 |
| `FACT-3665` | `docs/adr/ADR-0031-prefixed-identifiers.md:13-17`       | list  | `apps/api/src/meeting-files/meeting-files.service.ts`                              |

Generic layout facts whose hashed text names the `*.controller`/`*.service`/`*.mapper` file kinds: `FACT-0008` (`docs/architecture.md:33`), `FACT-0027` (`:116`), `FACT-3667` (`docs/adr/ADR-0031-prefixed-identifiers.md:21`).

Block `**Source:**` lines naming module files, outside the hash but inside the `AR-API-12` source scope (`facts-parse.mjs:198`): `docs/api-contract.md:284` (controller, above the `FACT-2097`…`FACT-2100` table), `:299-300` (controller and `multer.utils.js`, above the error-body table), `:359-360` (`meeting-files.seed.ts`, above the builder table, whose rows carry no key).

Not scanned: facts naming module symbols in prose without one of the strings above (e.g. "the mapper", "the controller" in words); ADR-0027/0028/0029 statements citing `docs/plans/meeting-files/` (masked out — 7, 7 and 9 such lines respectively by `grep -c`) are change-folder references, not module paths.

## Divergence (both sides, no verdict)

1. `FACT-0012` controller "Must not: hold rules, touch the store" and `FACT-0013` "Service: hold the rules" versus `meeting-files.controller.ts` `upload` (lines 85–111): the controller calls `isValidFilename`, `isAllowedContentType`, `normalizeContentType`, builds the 400/415 and compares `existingCount >= MAX_FILES_PER_MEETING`; `meeting-files.service.ts` holds persistence only (count/create/find) and its header says ownership "is not this service's business". `meeting-files.rules.ts` holds the rules as pure functions.
2. Download path versus `FACT-3105` and `FACT-0012`, both sides, not resolved.
   - Corpus side: `FACT-3105` (`docs/adr/ADR-0006-nest-layering.md:29`) "**Mapper** (`toMeetingDto`, `toUserDto`) is the only way an entity becomes a response." `FACT-0012` (`docs/architecture.md:82`) Controller, Must not: "hold rules, touch the store, assemble a response by hand". `FACT-3627` (ADR-0029, section E) states one bytes endpoint with four headers; `FACT-3628` puts the `Buffer` conversion at the controller boundary.
   - Code side: `MeetingFilesController.download` takes the `MeetingFile` from `findByIdForMeeting` (`apps/api/src/meeting-files/meeting-files.controller.ts:155`), converts `file.content` with `Buffer.from` (`:162`), sets `Content-Type`, `Content-Length`, `Content-Disposition` (from `buildContentDisposition`) and `X-Content-Type-Options` with `res.set` (`:170-175`), and returns `new StreamableFile(content)` (`:177`). No mapper is called on this path.
   - The corpus states no fact on whether a bytes response falls under `FACT-3105` or `FACT-0012`'s "assemble a response by hand" (grep of `docs/architecture.md`, `docs/adr/ADR-0006-nest-layering.md`, `docs/adr/ADR-0029-file-bytes-in-the-database.md` for `FACT-3105`/`FACT-0012`: no sentence relates either to the download route).
   - Separately: `FACT-3386`/`FACT-0013` "service returns `undefined`" — `findByIdForMeeting` returns `undefined` for an absent or foreign file (`meeting-files.service.ts:64-67`, per `code.md` §2).
3. `FACT-0013` service "know about HTTP: Must not" — the service files import `@nestjs/common` `Injectable` and `PrismaService` only; no HTTP types (consistent). Controller-side count `FACT-2096` check lives in the controller, not the service.
4. `FACT-1067`/`FACT-3572` "services ... through one injected Prisma client": `MeetingFilesService` does; the controller additionally depends on `MeetingsService` (`FACT-2112`).
5. Comments in `meeting-files.*.ts` cite "design §2/§3/§8.14", which `CLAUDE.md` "Comments in code" forbids (section of a change folder); recorded as a code-vs-CLAUDE.md fact, outside the requirement's scope.

## Not found

- **Not found:** a keyed fact stating how the unit layer treats the database ("units need no container") — searched architecture.md, data-model.md, api-contract.md, ADR-0027 by grep for `DATABASE_URL`/"database"/"real database". Only unkeyed text: `e2e/README.md:163` ("no unit touches the database"), root `CLAUDE.md`, and ADR-0027's closing Rationale block.
- **Not found:** any keyed fact on ports, use cases, domain errors, value objects, DI tokens, or a `domain/` / `application/` directory — searched architecture.md, data-model.md, api-contract.md, `docs/adr/` by grep (only `FACT-0059`/`FACT-3589` hit "repositor").
- **Not found:** where shared constants/limits must live — searched architecture.md ("limit", "constant"), data-model.md ("shared", "constants"). `apps/api/CLAUDE.md` Map is unkeyed.
- **Not found:** an import-boundary check (domain imports nothing from Nest/Prisma) — searched `e2e/architecture/*.ts`, `e2e/suite-integrity.api.spec.ts` for "domain" / "no Nest"; no hit. ESLint config of `apps/api` not read.
- **Not found:** a keyed fact for a Prisma-backed meeting-files service unit test — only `meeting-files.rules.spec.ts` exists; `MeetingFilesService` has no spec in the directory listing.
- **Not found:** a keyed fact that the web side mirrors the file limits — searched the four corpus documents for a web-side limit; a grep of `apps/web/src` for `MAX_`/`1048576` matched only `format-file-size.spec.ts`, `session-cookie.ts`, `session.spec.ts`, none of which was read in depth, so whether `apps/web` holds a copy of a file limit remains unknown.
