# ADR-0006 — Nest layering: controller, service, mapper, and validation as a provider

- **Status:** accepted
- **Date:** 2026-09-07
- **Supersedes:** —
- **Superseded by:** —

## Context

- `FACT-3100` Rules held in a controller cannot be unit-tested without HTTP. —
  `apps/api/src/meetings/meetings.service.spec.ts`
- `FACT-3101` `ownerId` reached a response body once, and responses are now asserted against by key
  set. — `docs/CHANGELOG.md`, `HD-API-01`
- `FACT-3102` Validation registered with `app.useGlobalPipes()` in `main.ts` exists only when
  `main.ts` runs; a Nest testing module builds the application without it. — invariant 3,
  `apps/api/test/app.e2e-spec.ts`

> **Rationale — not a fact.** Two things in a Nest application decide whether its tests mean
> anything: where the rules live, and where validation is registered. With the pipe in `main.ts`,
> every "this payload gives 400" check passes in the test module and disagrees with the real server —
> or the other way round, which is worse.

## Decision

- `FACT-3103` **Controller** routes, validates through its DTO, reads identity from
  `@CurrentUser()`, and maps the result out. Nothing else. — `FACT-0012`
- `FACT-3104` **Service** holds the rules and owns the store, and knows nothing about HTTP. —
  `FACT-0013`
- `FACT-3105` **Mapper** (`toMeetingDto`, `toUserDto`) is the only way an entity becomes a response. —
  `FACT-0014`, `apps/api/src/meetings/meetings.mapper.ts`
- `FACT-3106` `ValidationPipe` is registered as an `APP_PIPE` provider in `AppModule`, with
  `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`. — invariant 3,
  `apps/api/src/app.module.ts`

Rejected:

- `FACT-3107` `useGlobalPipes` in `main.ts` — see Context. — this record
- `FACT-3108` Per-controller `@UsePipes` — a new controller silently gets none. — this record
- `FACT-3109` Returning entities directly and "just remembering" to strip fields. — this record

> **Rationale — not a fact.** A testing module that imports `AppModule` then gets exactly the
> server's validation, and internal fields are dropped in one place rather than remembered at each
> call site.

## Consequences

- `FACT-3110` Invariant 2 follows from `whitelist` + `transform`: an optional DTO field without
  `@IsOptional()` still runs through `@IsInt`/`@Min`/`@Max` and answers 400 when the field is simply
  absent. Both `limit` and `durationMinutes` broke that way. — invariant 2, `HD-API-10`,
  `HD-API-20`
- `FACT-3111` Invariant 8 follows from the pipe: a 400 body's `message` is an array, a 401's is a
  string. — invariant 8, `FACT-2017`
- `FACT-3112` Every response shape is checked by key set, so adding a field to an entity without
  adding it to the mapper and the contract fails a case rather than shipping. — `HD-API-01`,
  `AL-API-11`
