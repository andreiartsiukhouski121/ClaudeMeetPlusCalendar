# Architecture

What the system is made of, which patterns it uses on purpose, and which ones it refuses. Read this
**before planning**: it is the first of the four documents every role works from.

| Document                             | Owns                                                                     |
| ------------------------------------ | ------------------------------------------------------------------------ |
| **this file**                        | the shape of the system, layers, patterns in use, patterns refused       |
| [`adr/README.md`](adr/README.md)     | **why** each of those choices was made, one file per decision, immutable |
| [`data-model.md`](data-model.md)     | entities, field formats, lifetimes, and the data flows between layers    |
| [`api-contract.md`](api-contract.md) | every endpoint: request, response, errors, and the logic behind it       |
| [`../CLAUDE.md`](../CLAUDE.md)       | the nineteen invariants — the rules an implementation must not break     |
| [`security.md`](security.md)         | the threat model and the deliberate gaps                                 |

They do not overlap on purpose. A rule written twice drifts silently — this repository earned
`FX-023` and `FX-027` that way. If you need a fact that is not here, it is in one of the files
above, not in a second copy of this one.

## The shape of the system

```
                    ┌───────────────────────────────────────────┐
  Browser ─────────►│ apps/web — Next.js 16, App Router          │
   (only ever       │                                           │
    talks here)     │  proxy.ts        optimistic cookie gate    │
                    │  app/**          Server Components         │
                    │  lib/dal.ts      session + access check    │
                    │  lib/actions/**  Server Actions (mutations)│
                    │  lib/api-client  the ONLY door outward     │
                    └───────────────┬───────────────────────────┘
                                    │ server-side fetch, Bearer from the cookie
                                    ▼
                    ┌───────────────────────────────────────────┐
                    │ apps/api — Nest.js 12, pure ESM           │
                    │                                           │
                    │  *.controller   HTTP edge, DTO validation │
                    │  *.service      the rules; owns the data  │
                    │  *.mapper       entity → DTO (strips ids) │
                    │  *.seed         the in-memory store       │
                    └───────────────────────────────────────────┘
```

Three properties follow from that picture, and every one of them is checked by a test:

1. **The browser never reaches Nest.** Checked by `HD-FN-11` and `SEC-FN-03`. See `ADR-0002`.
2. **The token never reaches browser JavaScript.** It lives in an httpOnly cookie and travels only
   between the two servers. Checked by `AL-FN-13`, `SEC-FN-01`, `SEC-FN-02`. See `ADR-0003`.
3. **Authorization is decided by the API, from the token**, never from what the client sends.
   Invariant 5; checked by `SEC-API-06`.

## Layers and what each may do

**`apps/api` — controller → service → store, one direction only.**

| Layer      | May                                                   | Must not                                                                                        |
| ---------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Controller | route, validate a DTO, read `@CurrentUser()`, map out | hold rules, touch the store, assemble a response by hand                                        |
| Service    | hold the rules, own the store, sort, count, hash      | know about HTTP, read `Request`, invent status codes beyond the documented ones                 |
| Mapper     | turn an entity into a DTO, dropping internal fields   | be skipped — a response assembled inline leaks `ownerId`                                        |
| DTO        | describe the shape and the validation                 | carry an owner or a role field (invariant 5); omit `@IsOptional()` on an optional (invariant 2) |
| Guard      | reject a request without a valid token                | be optional on a data route (invariant 16)                                                      |

**`apps/web` — the BFF, with a session check on every layer that can be reached directly.**

| Layer            | May                                          | Must not                                                           |
| ---------------- | -------------------------------------------- | ------------------------------------------------------------------ |
| `proxy.ts`       | see whether the cookie exists, bounce a GET  | be treated as security — it cannot tell whether the token is valid |
| Server Component | read through `lib/dal.ts`, render            | call Nest directly; pass a token as a prop                         |
| Server Action    | check the session itself, mutate, revalidate | trust that the proxy already checked (invariant 10)                |
| `api-client.ts`  | be the single `fetch` to Nest                | be bypassed by a second `fetch` somewhere else                     |
| Client component | render, submit a form                        | see the token, or call the API                                     |

The session check appears **three** times on purpose — proxy, DAL, Server Action. That is not
redundancy waiting to be optimized away: `ADR-0004` records what each one is for.

## Patterns in use

| Pattern                            | Where                                                       | Why here                                                                   | ADR        |
| ---------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------- | ---------- |
| Backend for Frontend               | `apps/web` in front of `apps/api`                           | keeps the token off the client and the API off the public internet         | `ADR-0002` |
| Stateless session in a cookie      | `ps_session`, httpOnly, holding the JWT Nest signed         | no session store to run; the API stays the only authority on identity      | `ADR-0003` |
| Defence in depth                   | `proxy.ts` → `dal.ts` → every Server Action                 | the cheap check is not the real one; the real one sits next to the data    | `ADR-0004` |
| Layered modules                    | controller → service → store, per Nest module               | each layer is testable without the one above it                            | `ADR-0006` |
| DTO + mapper at the edge           | `*.mapper.ts`, `toMeetingDto`                               | internal fields (`ownerId`) never leave by accident                        | `ADR-0006` |
| Guard + parameter decorator        | `JwtAuthGuard` + `@CurrentUser()`                           | identity arrives from the signature, not from the payload                  | `ADR-0009` |
| Global pipe as a provider          | `APP_PIPE` in `AppModule`                                   | test modules get the same validation as the server                         | `ADR-0006` |
| In-memory repository + seed        | `*.seed.ts`; services own their arrays                      | a demo with no database, and fixed data the tests can assert on            | `ADR-0007` |
| Test fixture mirroring the seed    | `e2e/fixtures/seed.ts`                                      | the suite depends on data, not on a running order; drift fails `SM-API-02` | `ADR-0007` |
| Executable convention (meta-tests) | `suite-integrity`, `ledger`, `process`, `architecture`      | a convention nobody can break silently beats a style guide                 | `ADR-0010` |
| Decision log + orientation gate    | `docs/CHANGELOG.md`, `docs/BACKLOG.md`, `check-orientation` | the same thing does not get built, or rejected, twice                      | `ADR-0011` |

## Patterns deliberately refused

Each of these looks like an obvious addition. Each was weighed and turned down; proposing it again
costs a review cycle, so the reason is written down.

| Refused                             | Because                                                                                    | Recorded in            |
| ----------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------- |
| CORS, a global API prefix           | no browser origin ever calls Nest; `enableCors()` would open it to every site for nothing  | `ADR-0005`             |
| `@nestjs/passport` + `passport-jwt` | a ~25-line guard covers the whole need; the dependency adds indirection, not safety        | `ADR-0009`             |
| `bcrypt`                            | `node:crypto.scrypt` needs no native build and is already in the platform                  | `ADR-0009`             |
| A database                          | the demo's value is the contract and the process, not persistence; the cost lands on tests | `ADR-0007`             |
| `middleware.ts`                     | deprecated in Next 16 — the file is `proxy.ts` (invariant 9)                               | `ADR-0002`             |
| Client-side calls to Nest           | it would put the token in the browser and end the BFF                                      | `ADR-0002`             |
| React component tests in jsdom      | a second, less trustworthy copy of what the functional suite already checks                | `BACKLOG.md`, Rejected |
| Parallel agents separated by ports  | Next 16 registers its dev server per project directory; only a worktree isolates them      | `ADR-0012`             |

## Where a change goes

| You are adding                  | Touch                                                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| An endpoint                     | controller + service + DTO + mapper; `api-contract.md`; `PROTECTED_ROUTES` if guarded (invariant 16); an api spec  |
| A field on an existing response | the entity, the mapper, `data-model.md`, `api-contract.md`, the cases that assert the key set                      |
| A page                          | `app/**`, `PROTECTED_PAGES` if guarded, a functional spec; a session check in the server layer, not only the proxy |
| A mutation from the UI          | a Server Action with its own session check plus `revalidatePath`; never a client-side fetch                        |
| A cross-cutting rule            | an invariant in `CLAUDE.md` **and** a case in `e2e/security/**` — a rule with no check is a wish                   |
| An architectural choice         | an ADR **first**, then the code: `pnpm adr:new <slug>`                                                             |

## How this file is kept honest

Documentation rots quietly, so whatever can be machine-checked is:

- `e2e/architecture/architecture.api.spec.ts` (`AR-API-*`) checks that every route registered in a
  Nest controller appears in `api-contract.md` and the other way round, that guarded routes match
  `PROTECTED_ROUTES`, and that the ADR log is internally consistent.
- The prose here — layers, patterns, refusals — is not machine-checkable. It is kept true by the
  rule that an architectural change writes its ADR **before** its code, and by the plan-review gate.
