# ADR-0006 — Nest layering: controller, service, mapper, and validation as a provider

- **Status:** accepted
- **Date:** 2026-09-07
- **Supersedes:** —
- **Superseded by:** —

## Context

Two things in a Nest application decide whether its tests mean anything: where the rules live, and
where validation is registered.

Rules in a controller cannot be unit-tested without HTTP. Responses assembled inline leak internal
fields — `ownerId` reached a response body once and is now asserted against by key set.

Validation registered with `app.useGlobalPipes()` in `main.ts` exists only when `main.ts` runs. A
Nest testing module builds the application without it, so every "this payload gives 400" check
passes in the test module and disagrees with the real server — or the other way round, which is
worse.

## Decision

- **Controller** routes, validates through its DTO, reads identity from `@CurrentUser()`, and maps
  the result out. Nothing else.
- **Service** holds the rules and owns the store. It knows nothing about HTTP.
- **Mapper** (`toMeetingDto`, `toUserDto`) is the only way an entity becomes a response, so internal
  fields are dropped in one place rather than remembered at each call site.
- **`ValidationPipe` is registered as an `APP_PIPE` provider in `AppModule`**, with
  `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`. A testing module that imports
  `AppModule` then gets exactly the server's validation.

Rejected: `useGlobalPipes` in `main.ts` (see Context); per-controller `@UsePipes` (a new controller
silently gets none); returning entities directly and "just remembering" to strip fields.

## Consequences

- Invariant 2 follows from `whitelist` + `transform`: an optional DTO field without `@IsOptional()`
  still runs through `@IsInt`/`@Min`/`@Max` and answers 400 when the field is simply absent. Both
  `limit` and `durationMinutes` broke that way.
- Invariant 8 follows from the pipe: a 400 body's `message` is an **array**, a 401's is a string.
- Every response shape is checked by key set (`HD-API-01`), so adding a field to an entity without
  adding it to the mapper and the contract fails a case rather than shipping.
