# ADR-0035 — Each migrated apps/api module is layered as domain, use cases and adapters

- **Status:** accepted
- **Date:** 2026-10-16
- **Supersedes:** —
- **Superseded by:** —

## Context

- `FACT-3725` The owner decided on 2026-10-16 that the layout piloted in `meeting-files` is the
  architectural style repeated for every `apps/api` module, with one shared kernel for the generic
  time and randomness ports so that only one pattern exists. — this record, the owner's decision of
  2026-10-16
- `FACT-3726` The pilot shipped: `meeting-files` is laid out by `ADR-0034` with its HTTP contract and
  every existing case unchanged, `AR-API-18` holds its import boundary and `AR-API-19` its no-clock
  rule. — `FT-008`, `CH-034`, `ADR-0034`
- `FACT-3727` `AR-API-18`'s resolver admits a relative import only when it resolves inside the
  importing module's own `domain/` (and, from `application/`, its own `application/`), so one module
  cannot import another's port. `AR-API-18` and `AR-API-19` both judge the files `boundedFiles`
  returns: every `apps/api/src/*/domain` and `apps/api/src/*/application` directory, one level below
  `apps/api/src`, whatever the module directory is called. — `e2e/architecture/architecture.api.spec.ts`, `importObjection` and
  `boundedFiles`, at commit `37d462a`
- `FACT-3728` The `Clock` and `UuidSource` ports are declared in
  `apps/api/src/meeting-files/application/clock.ts` and `uuid-source.ts`, and their adapters
  `SystemClock` and `CryptoUuidSource` in `apps/api/src/meeting-files/infrastructure/`. — those
  files at commit `37d462a`

> **Rationale — not a fact.** `ADR-0034` was scoped to one module on purpose, to learn whether the
> indirection pays here. The owner has judged that it does, and a second module now needs the same
> two ports. Under `FACT-3727` it can only copy them, and two copies of one interface drift (`FX-023`).
> This record lifts the style out of the pilot so that each migration cites one record, and leaves
> `ADR-0034` as the record of the pilot itself.

## Decision

- `FACT-3729` This record governs every `apps/api` module that its own migration change has moved to
  it; `meeting-files` was the first, and `ADR-0034` is its pilot record. A module not yet migrated
  stays layered by `ADR-0006` until that change, which retires the facts it falsifies. — this
  record, the owner's decision of 2026-10-16
- `FACT-3730` A module has four layers: `domain/` holds the entities, the value objects, the limits
  and the domain errors; `application/` holds one use case per route and the module's own ports;
  `infrastructure/` holds the adapters that implement those ports; the module root holds the HTTP
  adapters — controller, DTOs, mapper, the error filter — the injection tokens and the Nest module.
  — this record, `ADR-0034`
- `FACT-3731` Dependencies point inward only. No file under `domain/` or `application/` imports a
  framework or a driver or carries a decorator; each port is bound to its adapter by `Symbol` token
  and `useClass`, each use case by a `useFactory` provider, in the module's own Nest module. — this
  record, `FACT-3696`, `FACT-3705`
- `FACT-3732` A file under a module's `domain/` imports only from that module's `domain/`, from
  `apps/api/src/shared/domain/` and from `node:` built-ins. A file under a module's `application/`
  imports only from that module's `domain/` and `application/`, from `apps/api/src/shared/domain/`,
  from `apps/api/src/shared/application/` and from `node:` built-ins. A file under
  `apps/api/src/shared/domain/` imports only from that directory and from `node:` built-ins; a file
  under `apps/api/src/shared/application/` imports only from `apps/api/src/shared/domain/`, from that
  directory and from `node:` built-ins. A spec file may also import `vitest`. Nothing else is
  admitted — `apps/api/src/shared/infrastructure/` is forbidden to every one of them, and every other
  module with it — and the rule covers static, type-only, re-exporting and dynamic imports alike. —
  this record, the owner's decision of 2026-10-16
- `FACT-3733` `AR-API-18` holds `FACT-3732`: its resolver admits exactly the two shared prefixes
  above, each only from the layers `FACT-3732` names. Its permanent fixture exercises every import
  form and the walk self-check, and holds seventeen forbidden rows and nine allowed ones, where the
  pilot's fixture had thirteen and five. Allowed: `src/shared/domain/` from `domain/` and from
  `application/`, `src/shared/application/` from `application/`, and `src/shared/domain/` from
  `src/shared/application/`. Forbidden among the rows the two exceptions add: `src/shared/application/`
  from `domain/`, `src/shared/infrastructure/` from `application/`, `src/shared/application/` from
  `src/shared/domain/` and `src/shared/infrastructure/` from `src/shared/application/`. `AR-API-19`
  holds the no-clock rule over the same walk, which reaches `src/shared/domain/` and
  `src/shared/application/` (`FACT-3727`). — this record, `FACT-3727`, `FACT-0071`
- `FACT-3734` The shared kernel: `apps/api/src/shared/application/` declares `Clock`, whose `now()`
  returns a `Date`, and `UuidSource`, whose `next()` returns a UUID string, as interfaces only;
  `apps/api/src/shared/infrastructure/` holds their one implementation each, `SystemClock` and
  `CryptoUuidSource` over `node:crypto`'s `randomUUID`. The kernel holds no entity, no use case, no
  token and no Nest module: a module that needs either port binds it to the shared adapter under its
  own token in its own Nest module. — the owner's decision of 2026-10-16 for the kernel and its two
  ports, and the owner's acceptance of this record on 2026-10-16 for the kernel holding no token and
  no Nest module; `FACT-3731`
- `FACT-3735` A broken rule or a missing record is a thrown domain error: an adapter returns
  `undefined`, the use case throws, and the module's one exception filter — a `BaseExceptionFilter`
  subclass bound by `@UseFilters` on the controller — maps each domain error to the `HttpException`
  the contract documents. Status codes and bodies live in that filter alone; errors raised before the
  handler are not domain errors and it does not catch them. — this record, `FACT-3706`,
  `FACT-3707`, `FACT-3717`
- `FACT-3736` The lower layer is the source of truth: every limit a rule uses is declared once in
  `domain/`, and the DTOs and interceptors import it and restate none; where a DTO and an entity
  rule overlap, the entity governs. — this record, `FACT-3693`, `FACT-3708`
- `FACT-3737` A value object exists only where a rule exists; a field with no rule of its own stays
  a primitive. — this record, `FACT-3693`, `FACT-3713`
- `FACT-3738` Domain and use cases never read a clock or randomness directly: use cases get them
  through the shared `Clock` and `UuidSource` ports, entities get them as arguments, and an entity
  composes its own prefixed id from the UUID it is given (`ADR-0031`). — `FACT-3721`, `FACT-3722`;
  the owner's acceptance of this record on 2026-10-16 for extending the prefixed-id composition to
  every entity
- `FACT-3739` Entities and value objects are unit-tested under Vitest with no storage, the instant
  and the UUID passed as plain arguments; use cases are exercised over HTTP against the real
  database by the feature's API cases. Every port has exactly one implementation, its adapter, and
  no hand-written test double of a port exists anywhere in the repository. — this record,
  `FACT-3697`, `FACT-3710`, `FACT-3711`
- `FACT-3740` In `meeting-files`, `Clock`, `UuidSource`, `SystemClock` and `CryptoUuidSource` move
  into the shared kernel, so its `application/` holds the three use cases, the repository port and
  the meeting-access port, and its `infrastructure/` the Prisma repository adapter and the
  meeting-access adapter; its `domain/` keeps the entity, the value objects, the limits and the domain
  errors, and its module root the controller, the DTOs, the mapper, the error filter, the tokens and
  the Nest module, as `FACT-3730` lays a module out. — this record, the owner's decision of
  2026-10-16, `FACT-3728`

Rejected:

- `FACT-3741` Each module declaring its own `Clock` and `UuidSource` and their adapters — the pilot's
  shape, which a second module would have to copy (`FACT-3727`), leaving two patterns and identical
  interfaces free to drift. — the owner's decision of 2026-10-16, `FACT-3727`
- `FACT-3742` A module importing another module's port, `meetings` reusing `meeting-files`'
  `UuidSource` — it couples two application layers over a port that belongs to neither, and
  `AR-API-18` forbids it. — `FACT-3727`
- `FACT-3743` Admitting `src/shared/infrastructure/` into `application/` — a use case could then
  construct `CryptoUuidSource` or `SystemClock` itself and read randomness or the clock one import
  away. — this record, `FACT-3738`
- `FACT-3744` The rejections `ADR-0034` recorded hold for every module: `FACT-3710`, `FACT-3711`,
  `FACT-3712`, `FACT-3713`, `FACT-3721` and `FACT-3722`. — `ADR-0034`; the owner's acceptance
  of this record on 2026-10-16 for extending them beyond `meeting-files`

## Consequences

- `FACT-3745` When this record is accepted, eight facts retire, from `ADR-0034`, each into that
  record's register with its successor here, and are named by description rather than by key so that
  this record cites nothing it retires: its scope, its four-layer layout, its import rule, its
  meta-test, its `Clock` and `UuidSource` placement, its no-clock rule, its testing rule and its
  statement that the older records stay accepted. No other register names any of them as a successor.
  Every living document citing one of them is re-pointed in the same commit, because `AR-API-14`
  fails a living document that cites a retired key. — `ADR-0022`, `docs/facts-lock.json`,
  `e2e/architecture/architecture.api.spec.ts` (`violationsFactReferences`)
- `FACT-3746` `ADR-0034` stays `accepted` as the pilot's record and keeps its `meeting-files` facts;
  `ADR-0006` stays `accepted` and governs the modules not yet migrated; `ADR-0018` and `ADR-0027` stay
  `accepted` and govern every module, migrated or not, apart from the single facts `ADR-0034` and
  each migration change retire. None is superseded, the way `ADR-0034` itself retired single facts of `ADR-0018` and `ADR-0027`. —
  `ADR-0022`, `ADR-0034`

> **Rationale — not a fact.** The inconvenient parts. Two layouts live in one application until the
> last migration, and each migration pays for its own retirements. The shared kernel is a magnet:
> anything that looks generic will be proposed for it, and only review holds the line that it takes
> a port with no module's domain type in it. `AR-API-18`'s resolver gains a named exception, which
> is one more thing the meta-test's fixture must keep exercising, or it passes vacuously.
