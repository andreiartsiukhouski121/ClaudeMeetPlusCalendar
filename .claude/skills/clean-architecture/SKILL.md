---
name: clean-architecture
description: How a ports-and-adapters module in apps/api is written here — entity, value object, domain error, use case, port, Prisma repository adapter, controller, mapper, error filter and module wiring — with the real files of meeting-files as the canonical examples. Use when writing, migrating or reviewing anything under apps/api/src/meeting-files, or any module a later change migrates under ADR-0034. It does not apply to meetings, users or auth.
---

The pattern is decided by `ADR-0034`, whose status is **accepted (2026-10-15)**. It governs
**`meeting-files` only**, until `BL-050`…`BL-052` migrate the rest. `meetings`, `users` and `auth`
still follow `ADR-0006` (controller → service → store) and are written that way until a change
migrates them. Do not apply this skill to them on your own.

**The real files are the examples.** This skill names each one by path and symbol and states the rule
it teaches; it does not copy the code, because a copy drifts from it (`FX-023`). Open the file, then
write yours to match. Paths are under `apps/api/src/meeting-files/`.

## The dependency rule

Dependencies point inward: HTTP and infrastructure know the application, the application knows the
domain, the domain knows nothing. `domain/` and `application/` are **decorator-free and
framework-free** — no `@nestjs/*`, no Prisma, no `express`, no `src/common/`. Allowed: `node:`
built-ins, and relative imports inside `domain/` (from `domain/`) or `domain/` plus `application/`
(from `application/`); `vitest` in `*.spec.ts` only. `AR-API-18` (`FACT-3701`) enforces it across
every module's `domain/` and `application/`, `import()` included, and fails naming the file and the
specifier. It runs inside `pnpm verify`, not at commit.

## The components

| Component                     | Canonical example                                                                                             | What it teaches                                                                                                                                                                                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entity                        | `domain/meeting-file.ts` — `MeetingFile`                                                                      | private constructor; `upload(...)` is the only creation path and holds the rule (cap, id, derived size); `restore(...)` rebuilds a stored row with no validation; the instant is an argument, never read from a clock                                   |
| Value object                  | `domain/file-name.ts` — `FileName`; `domain/content-type.ts` — `ContentType`                                  | construction validates and throws a domain error; exposes `.value`; the pure predicates stay exported beside it                                                                                                                                         |
| Limits                        | `domain/limits.ts`                                                                                            | every number and pattern a rule uses is declared once here                                                                                                                                                                                              |
| Domain error                  | `domain/meeting-file.errors.ts` — `MeetingFileError` and subclasses                                           | abstract base with a literal `kind`; no status code, no HTTP text                                                                                                                                                                                       |
| Use case                      | `application/upload-meeting-file.ts` — `UploadMeetingFile`                                                    | plain class, constructor takes ports, one `execute(command)`; calls ports and entities in the contract's evaluation order; takes the instant from `Clock` and the uuid from `UuidSource` and passes both to the entity; returns the entity, never a DTO |
| Port                          | `application/meeting-file.repository.ts`, `application/meeting-access.ts`                                     | an interface in domain types; names no Prisma, Nest or `express` type                                                                                                                                                                                   |
| Clock and randomness ports    | `application/clock.ts` — `Clock`; `application/uuid-source.ts` — `UuidSource`                                 | the only way a use case gets the instant and a uuid; bound to `SystemClock` and `CryptoUuidSource` under the `CLOCK` and `UUID_SOURCE` tokens                                                                                                           |
| Clock and randomness adapters | `infrastructure/system-clock.ts` — `SystemClock`; `infrastructure/crypto-uuid-source.ts` — `CryptoUuidSource` | `implements` the port; the only code that reads the real clock or `node:crypto`                                                                                                                                                                         |
| Repository adapter            | `infrastructure/prisma-meeting-file.repository.ts` — `PrismaMeetingFileRepository`                            | `@Injectable()`, `implements` the port, the only code that imports Prisma; owns `orderBy` and the write-side conversions; `restore` on read                                                                                                             |
| Access adapter                | `infrastructure/meetings-service.access.ts` — `MeetingsServiceAccess`                                         | reaches an unmigrated module through its existing service, reusing its one code path                                                                                                                                                                    |
| Controller                    | `meeting-files.controller.ts` — `MeetingFilesController`                                                      | request parts in, use-case input, call, map out; receives use cases by constructor type; bytes become a `Buffer` here and nowhere else                                                                                                                  |
| Mapper                        | `meeting-files.mapper.ts` — `toMeetingFileDto`                                                                | the only way an entity leaves; fields listed explicitly                                                                                                                                                                                                 |
| Error filter                  | `meeting-files.error-filter.ts` — `MeetingFilesErrorFilter`                                                   | `@Catch(<module error base>)`, exhaustive `switch` over `kind` ending in a `never` check, hands the built `HttpException` to `BaseExceptionFilter`                                                                                                      |
| Wiring                        | `meeting-files.module.ts`, `meeting-files.tokens.ts`                                                          | `Symbol` tokens for ports, `useClass` for adapters, `useFactory` per use case                                                                                                                                                                           |

## Rules by component

**Entity and value object.** Imports only `node:` and `domain/`. Fields stay primitives, so the DTO is
the entity minus keys. A rule the entity can hold lives in the entity, not in a use case. Do not
re-check a limit that a framework layer enforces earlier and could never fire here.

**Clock and randomness.** Domain and use cases never read a clock or randomness directly: use cases
get them through ports, entities get them as arguments (`FACT-3719`, ports in `FACT-3718`). The use
case calls `Clock` and `UuidSource` and hands the results to `MeetingFile.upload`, which composes
`fil-` + the uuid it is given, so the id format stays in the domain (`FACT-3670`). No file under
`domain/` or `application/` imports `node:crypto` or calls `new Date()`, `Date.now()`,
`performance.now()`, `Math.random()`, `randomUUID` or `getRandomValues`; `AR-API-19` fails the run
naming the file and the form (`FACT-0071`). Spec files are exempt. `new Date(value)` parses a value
and is allowed.

**The entity is thin on purpose.** `MeetingFile` stores primitives, the fields the response is cut
from (`FACT-1063`), and `upload` takes the meeting's file count as a number, because the ten-file cap
is really a rule of the `Meeting` aggregate. Both are revisited when `meetings` migrates (`BL-050`,
`FACT-3720`). Do not "improve" it ahead of that change.

**Domain error.** Add a kind by adding a class and a union member; the filter's exhaustive switch
then fails `pnpm typecheck` until the new kind has a row. That is the point.

**Use case.** The shape is `UploadMeetingFile` in `application/upload-meeting-file.ts`: a plain class
whose constructor takes the ports typed by interface, and a single `execute`. No decorator, no
`@Inject`. Throw a domain error for a broken rule; never an `HttpException`. Where
the contract fixes an evaluation order, the order of calls in `execute` is that order.

**Repository adapter.** Holds no business rule and throws no `HttpException`. Ordering that the
contract pins (invariant 7) is written here. It is never imported by `domain/` or `application/`.

**Controller.** Keeps invariants 5 and 16: `ownerId` from `@CurrentUser()`, the route added to
`PROTECTED_ROUTES`. It never calls Prisma, a port or another module's service, and never throws for
a business rule. The filter is bound on the class with `@UseFilters` between `@Controller` and
`export class`, where `AR-API-05`'s scan reads decorators.

**Error filter.** Catches only the module's domain errors. The guard's 401, the interceptor's 413 and
the pipe's 400 are raised before the handler and are untouched (`FACT-3707`). It builds the exception
and hands it to `BaseExceptionFilter` rather than writing the response, so status, body and headers
are those of a thrown exception (`FACT-3717`). Invariant 8 holds in the mapping: an array for the
400s, a string for the 404s.

**Module wiring.** The shape is the `providers` array of `meeting-files.module.ts`: each port bound to
its adapter with `useClass` under a `Symbol` token, each use case provided under its own class with a
`useFactory` that calls `new` and an `inject` list of those tokens. Tokens live in the module root,
never in `application/`, which may not know Nest (`FACT-3705`).
Wiring only; no logic in the module.

## Tests

Entities and value objects get Vitest units under `domain/` with no storage and no fake (see
`domain/meeting-file.spec.ts`, `domain/value-objects.spec.ts`). Use cases are not unit-tested against
an in-memory repository: their branches are asserted over HTTP against PostgreSQL by the
`MF-API-*` cases, and a fake would test itself. Specs and cases are not yours to write
(`implementer-api` boundaries).

## Migrating another module

A migration is its own change under `ADR-0034`: it retires the facts it falsifies and moves its
files by the layout above. Until that change exists, leave the module as it is, and report a pattern question rather than settling it in code.
