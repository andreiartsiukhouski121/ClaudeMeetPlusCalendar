# ADR-0034 — meeting-files is layered as domain, use cases and adapters behind ports

- **Status:** accepted
- **Date:** 2026-10-14
- **Supersedes:** —
- **Superseded by:** —

## Context

- `FACT-3693` The owner settled the scope on 2026-10-14: `apps/api` only, piloted on
  `apps/api/src/meeting-files` alone; `domain/` and `application/` import nothing from `@nestjs/*`,
  `@prisma/*`, `class-validator`, `class-transformer`, `express` or `multer`, not even
  `@Injectable()`; the boundary is enforced mechanically; a broken rule is a domain error mapped to
  HTTP in one place; where a DTO and an entity rule overlap the entity governs; value objects only
  where a rule exists; the HTTP contract and every existing case stay as they are. — this record,
  the owner's decision of 2026-10-14
- `FACT-3694` The module's rules sit in three places: the upload handler holds the check order, the
  400 and 415 bodies and the cap comparison, whose refusal message spells the cap as a literal `10`;
  `meeting-files.rules.ts` holds the limits, the filename and content-type predicates and the header
  builder; the service issues the id as `fil-` + `randomUUID()` from `node:crypto`, derives
  `sizeBytes`, stamps `uploadedAt` with `new Date()` and orders the listing. —
  `apps/api/src/meeting-files/meeting-files.controller.ts`, `meeting-files.rules.ts` and
  `meeting-files.service.ts` at commit `d58ddbf`
- `FACT-3695` A repository layer over Prisma was refused because its only second implementation
  would be a hand-written fake, which moves the unit tests from testing the code to testing the fake.
  — the "Retired facts" register of `ADR-0027` and the "Retired facts" register of
  `docs/architecture.md`, whose rows keep the refusal verbatim
- `FACT-3696` Under `@nestjs/core` 12.0.1 a `useFactory` provider with `inject` constructs a class
  carrying no decorator; Vitest in `apps/api` runs a spec over a module with no decorators and no
  `reflect-metadata`. — a probe run from `apps/api` on 2026-10-14 against the installed
  `@nestjs/core` 12.0.1 and `vitest` 4.1.11; `apps/api/vitest.config.ts` names no setup file
- `FACT-3697` No unit in the repository touches the database, the Playwright test process has no
  `DATABASE_URL`, and no `*.integration.spec.ts` exists although the `integration` project is
  defined. — `apps/api/src/**/*.spec.ts`, `apps/web/src/**/*.spec.ts`, `playwright.config.ts`
  (`DATABASE_URL` is set only in the api `webServer` entry's environment), `git ls-files` at commit
  `d58ddbf`
- `FACT-3698` `MF-API-01`…`MF-API-19` assert the status and deep-equal the parsed JSON body of every
  handler-thrown error, the listing order, the key sets and the evaluation order against the real
  database; they do not assert key order or the headers of an error response. —
  `e2e/regression/meeting-files/meeting-files.api.spec.ts`,
  `e2e/regression/meeting-files/meeting-files.api.cases.md`
- `FACT-3717` Under `@nestjs/core` and `@nestjs/platform-express` 12.0.1, a filter bound to a
  controller as `@UseFilters(Class)` that extends `BaseExceptionFilter` and hands a mapped
  `HttpException` to `super.catch` replies with the same status, raw body, `content-type` and
  `content-length` as the same exception thrown from an unfiltered handler; an `HttpException` or a
  plain `Error` it does not `@Catch` reaches the default handler with the default 404 and 500 replies.
  No filter existed in `apps/api/src` at commit `d58ddbf`. — a probe run from `apps/api` on
  2026-10-14 against the installed `@nestjs/core`, `@nestjs/common` and `@nestjs/platform-express`
  12.0.1, booting one filtered and one unfiltered controller and comparing status, raw body and
  every header but `date`, `etag`, `connection`, `keep-alive` and `x-powered-by` over five routes;
  `apps/api/src` at commit `d58ddbf`

> **Rationale — not a fact.** The pilot exists to find out whether a domain model with its rules in
> one place pays for its indirection here, on the module whose rules are currently the most
> scattered. It is deliberately one module: the other three keep `ADR-0006` until a change of their
> own decides otherwise.

## Decision

- `FACT-3699` `meeting-files` is the only module laid out by this record; `meetings`, `users` and
  `auth` stay layered by `ADR-0006`. — this record
- `FACT-3700` The module has four layers. `domain/` holds the `MeetingFile` entity, the `FileName`
  and `ContentType` value objects, the limits and the domain errors. `application/` holds one use
  case per route and the ports they call. `infrastructure/` holds the Prisma repository adapter, the
  meeting-access adapter, the clock adapter and the UUID adapter. The module root holds the HTTP
  adapters — controller, DTO, mapper, the error filter and the `Content-Disposition` builder — the
  Nest module, the injection tokens in `meeting-files.tokens.ts` and the seed. — this record
- `FACT-3701` A file under `domain/` imports only from the same module's `domain/` and from `node:`
  built-ins; a file under `application/` imports only from the same module's `domain/` and
  `application/` and from `node:` built-ins; a spec file may also import `vitest`. The rule covers
  static, type-only, re-exporting and dynamic imports alike. — this record
- `FACT-3702` The rule in `FACT-3701` is held by a case in `e2e/architecture/architecture.api.spec.ts`
  that walks every `apps/api/src/*/domain/` and `apps/api/src/*/application/` directory with an
  allow-list, opening with a self-check that the walk found files, and by a permanent fixture in the
  same spec — one forbidden import of every form the rule covers and the allowed ones — driven
  through the same scanner. — this record, `FACT-3189`, `FACT-3504`
- `FACT-3703` `meeting-files` persistence goes through a repository port declared in `application/`
  and implemented by one Prisma adapter in `infrastructure/`, which reads and writes through the one
  injected `PrismaService`; no other `meeting-files` file imports Prisma. — this record
- `FACT-3716` `User`, `Meeting` and `MeetingFile` are tables. The services of the modules layered by
  `ADR-0006` and the repository adapter of `meeting-files` read and write through one injected
  Prisma client and keep no in-process copy of the data. — this record, `ADR-0027`
- `FACT-3704` Ownership of the meeting is asked through a meeting-access port whose adapter
  delegates to `MeetingsService.findById`, so the listing, the upload and the download keep the one
  code path of `FACT-2112` and `ADR-0018`. — this record, `FACT-2112`
- `FACT-3705` The use cases and the adapters are bound in `MeetingFilesModule`: each port by an
  injection token, each use case by a `useFactory` provider. No file under `domain/` or
  `application/` carries a decorator. — this record, `FACT-3696`
- `FACT-3718` The current instant and randomness reach `meeting-files` through two ports declared in
  `application/`: `Clock`, whose `now()` returns a `Date`, and `UuidSource`, whose `next()` returns
  a UUID string. Their adapters live in `infrastructure/` — `SystemClock`, and a source over
  `node:crypto`'s `randomUUID` — and are bound like the other ports, by `Symbol` token and
  `useClass`, while the use cases are `useFactory` providers (`FACT-3705`). `UploadMeetingFile`
  takes both and passes the instant and the UUID to `MeetingFile.upload`, which composes the id as
  `fil-` + that UUID, so the id format of `ADR-0031` (`FACT-3669`, `FACT-3670`) stays in `domain/`.
  — this record, the owner's decision of 2026-10-15
- `FACT-3719` Domain and use cases never read a clock or randomness directly: use cases get them
  through ports, entities get them as arguments. No file under `domain/` imports `node:crypto`, and
  no use case calls `new Date()` or `Date.now()`. — this record, the owner's decision of 2026-10-15
- `FACT-3720` `MeetingFile` is deliberately thin for now. It stores primitives, the fields the
  response is cut from (`FACT-1063`), rather than its value objects; and `upload` receives the
  meeting's current file count as a number rather than the meeting, because the ten-file cap is
  really a rule of the `Meeting` aggregate, which stays in the unmigrated `meetings` module. Both
  are revisited when `meetings` migrates (`BL-050`). — this record, the owner's decision of
  2026-10-15
- `FACT-3706` A broken rule or a missing record is signalled by throwing a domain error. In
  `meeting-files` the adapter returns `undefined`, the use case throws a domain error, and the
  module's one exception filter translates each domain error into the `HttpException` the contract
  documents; in a module layered by `ADR-0006` the service returns `undefined` and the controller
  throws. Status codes, body shapes (invariant 8) and the 404-over-403 bodies live in that filter
  alone. — this record, `ADR-0018`, `FACT-3717`
- `FACT-3707` Errors raised before the handler runs — `JwtAuthGuard`'s 401, `FileInterceptor`'s 413
  and string 400, `ValidationPipe`'s array 400 — are not domain errors, and the filter does not
  catch them. — this record, `FACT-2097`, `FACT-2098`, `FACT-2099`
- `FACT-3708` The limits are declared once, in `domain/`: the ten-file cap, the 1 048 576-byte
  ceiling, the filename length and pattern, and the content-type allow-list. The HTTP layer imports
  them — the interceptor's `limits.fileSize` included — and restates none. — this record
- `FACT-3709` Entities and value objects are unit-tested under Vitest with no storage; a use case is
  exercised against the real database through the existing HTTP cases. Every port has exactly one
  implementation, its adapter in `infrastructure/`: no test double of a port — an in-memory
  repository, a fixed clock, a scripted UUID source — exists anywhere in the repository, and an
  entity's unit passes the instant and the UUID as plain arguments. — this record, `FACT-3698`,
  `FACT-3719`

> **Rationale — not a fact.** `ADR-0027`'s refusal of a repository layer (`FACT-3695`) is answered
> on its own terms. Its objection is to the
> **test** a port invites — a fake standing in for the store, and the unit asserting against the
> fake. This record never writes that test. The port exists for the direction of dependency, so that
> the rules compile and are tested with no framework and no driver loaded; it is not there to be
> substituted. The rules move into the entity and its value objects, which need no store at all to
> test, and the use cases — which are little more than the order of calls — are covered where the
> order matters: against PostgreSQL, through the nineteen HTTP cases that already pin it. What is
> paid is an interface with one implementation, which is indirection and is admitted as such. The
> pre-commit floor stays database-free, which is what `ADR-0027`'s rationale and probe 7 protect.

Rejected:

- `FACT-3710` An in-memory repository for use-case units — exactly the fake `ADR-0027` refused; the
  rules it would exercise now live in the entity, which needs no store. — `FACT-3695`, `ADR-0027`
- `FACT-3711` A Vitest use-case spec against PostgreSQL inside `pnpm test` — the pre-commit hook
  runs `pnpm test` and must pass with no container. — `FACT-3697`, `FACT-3595`
- `FACT-3712` `no-restricted-imports` as the boundary. ESLint 9.39.5's rule can state the
  allow-list as a `regex` pattern and then flags static, type-only, re-exporting, bare and
  multi-line imports, but it listens only to import and export declarations and lets
  `import('express')` pass; the meta-test must catch `import()` regardless, so the rule would be a
  second list beside it that has to agree forever. —
  `eslint/lib/rules/no-restricted-imports.js` in ESLint 9.39.5 (its `regex` and `group` pattern
  options and its import and export declaration listeners); a probe run from `apps/api` on
  2026-10-14 through ESLint 9.39.5's `Linter` with `@typescript-eslint/parser` 8.69.0 over one
  source per import form
- `FACT-3713` A value object for every field — the id, the size and the timestamp carry no rule of
  their own to hold. — this record
- `FACT-3721` The entity calling `randomUUID` and the use case calling `new Date()` — the first
  draft of this record. It leaves two hidden inputs inside the layers the pilot keeps
  framework-free, so an entity's unit could assert the id only by its shape, and time and
  randomness would follow two different rules. — this record, `FACT-3719`
- `FACT-3722` A `UuidSource` that returns the finished `fil-<uuid>` id — the id format of
  `ADR-0031` would move into an adapter in `infrastructure/`, outside the layer that holds the
  rules. — this record, `FACT-3669`, `FACT-3670`

## Consequences

- `FACT-3714` When this record is accepted, five facts retire, each into its own document's
  register and each named there by key rather than here, so this record cites no key it retires:
  from `ADR-0027`, the refused repository layer by `FACT-3703` and the tables-and-one-client fact by
  `FACT-3716`; from `ADR-0018`, the controller-throws fact by `FACT-3706`; from
  `docs/architecture.md`, the layered-modules pattern row and the refused repository-layer row by new
  keys stating the two layouts side by side. In the same change, the row of `ADR-0007`'s register
  whose successor is that `ADR-0027` tables fact is re-pointed: its statement is kept verbatim, its
  status becomes `retired by FACT-3716`, and its "Recorded in" cell becomes `ADR-0027`, `ADR-0034` —
  `ADR-0027` recorded the retirement, this record the new successor. — `ADR-0022`, `FACT-3494`
- `FACT-3715` `ADR-0006`, `ADR-0018` and `ADR-0027` stay `accepted`: each still governs `meetings`,
  `users` and `auth`, and this record retires only the facts it falsifies, the way `ADR-0029`
  retired one fact of `ADR-0006` and `ADR-0031` one of `ADR-0027` while both stayed `accepted`. —
  `ADR-0006`, `ADR-0027`, `ADR-0029`, `ADR-0031`
- `FACT-3724` `ADR-0031`'s identifier facts stay true and are not retired: an upload still issues
  `fil-` followed by a `randomUUID()` body, now drawn through `UuidSource`'s adapter rather than in
  the code that composes the id. — this record, `FACT-3669`, `FACT-3670`, `FACT-3718`

> **Rationale — not a fact.** The inconvenient parts. Two layouts live in one application until the
> other modules move, and a reader has to know which module follows which record; the architecture
> document has to say so in one place. The meta-test catches an import, not a rule placed in the
> wrong layer — a use case that grows an `if` on a business rule passes it and is review's to catch.
> A use case has no test of its own below HTTP; if one ever needs a branch the HTTP cases cannot
> reach, that is the moment to decide on a database-backed harness, not to write a fake.

## Retired facts

The register of the keys this record has allocated and no longer states (`ADR-0022`). The decision
itself stands; the row below is a consequence that a later change made untrue.

| Key         | Stated                                                                                                                                                                                                | Status                 | Recorded in |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ----------- |
| `FACT-3723` | `FACT-3719` is held by review, not by the meta-test of `FACT-3702`: the import rule of `FACT-3701` admits every `node:` built-in, `node:crypto` included, and no import names a call to `new Date()`. | `retired by FACT-0071` | `CH-034`    |
