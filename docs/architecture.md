# Architecture

What the system is made of, which patterns it uses on purpose, and which ones it refuses. Read this
**before planning**: it is the first of the four documents every role works from.

Every statement of fact here carries a key (`FACT-0001`…) and names its source. A statement with no
key is not a fact of this project and must not be cited as one — reasoning is kept, but in blocks
marked as reasoning. The rule, its blocks and its checks are `ADR-0021`.

## The corpus and who owns what

**Source:** `ADR-0015` — the corpus is the mandatory planning context and the four documents are
disjoint.

| Key         | Document                             | Owns                                                                     |
| ----------- | ------------------------------------ | ------------------------------------------------------------------------ |
| `FACT-0001` | **this file**                        | the shape of the system, layers, patterns in use, patterns refused       |
| `FACT-0002` | [`adr/README.md`](adr/README.md)     | **why** each of those choices was made, one file per decision, immutable |
| `FACT-0003` | [`data-model.md`](data-model.md)     | entities, field formats, lifetimes, and the data flows between layers    |
| `FACT-0004` | [`api-contract.md`](api-contract.md) | every endpoint: request, response, errors, and the logic behind it       |
| `FACT-0005` | [`../CLAUDE.md`](../CLAUDE.md)       | the nineteen invariants — the rules an implementation must not break     |
| `FACT-0006` | [`security.md`](security.md)         | the threat model and the deliberate gaps                                 |

- `FACT-0007` The four documents do not overlap: a fact lives in one of them and the others link to
  it. — `FX-023`, `FX-027`, `ADR-0019`

> **Rationale — not a fact.** A rule written twice drifts silently, and this repository earned two
> ledger entries that way. If you need a fact that is not here, it is in one of the files above, not
> in a second copy of this one.

## The shape of the system

- `FACT-0008` The module layout is the one drawn below: `apps/web` holds `proxy.ts`, `app/**`,
  `lib/dal.ts`, `lib/actions/**` and `lib/api-client.ts`; `apps/api` holds `*.controller`,
  `*.service`, `*.mapper` and `*.seed`. — `apps/web/src`, `apps/api/src`

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

- `FACT-0009` The browser never reaches Nest. — `HD-FN-11`, `SEC-FN-03`, `ADR-0002`
- `FACT-0010` The token never reaches browser JavaScript: it lives in an httpOnly cookie and travels
  only between the two servers. — `AL-FN-13`, `SEC-FN-01`, `SEC-FN-02`, `ADR-0003`
- `FACT-0011` Authorization is decided by the API, from the token, never from what the client
  sends. — invariant 5, `SEC-API-06`

## Layers and what each may do

### `apps/api` — controller → service → store, one direction only

**Source:** `ADR-0006` — the layering, and validation registered as a provider.

| Key         | Layer      | May                                                   | Must not                                                                                        |
| ----------- | ---------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `FACT-0012` | Controller | route, validate a DTO, read `@CurrentUser()`, map out | hold rules, touch the store, assemble a response by hand                                        |
| `FACT-0013` | Service    | hold the rules, own the store, sort, count, hash      | know about HTTP, read `Request`, invent status codes beyond the documented ones                 |
| `FACT-0014` | Mapper     | turn an entity into a DTO, dropping internal fields   | be skipped — a response assembled inline leaks `ownerId`                                        |
| `FACT-0015` | DTO        | describe the shape and the validation                 | carry an owner or a role field (invariant 5); omit `@IsOptional()` on an optional (invariant 2) |
| `FACT-0016` | Guard      | reject a request without a valid token                | be optional on a data route (invariant 16)                                                      |

### `apps/web` — the BFF, with a session check on every layer that can be reached directly

**Source:** `ADR-0002`, `ADR-0004` — the BFF boundary and the three session checks.

| Key         | Layer            | May                                          | Must not                                                           |
| ----------- | ---------------- | -------------------------------------------- | ------------------------------------------------------------------ |
| `FACT-0017` | `proxy.ts`       | see whether the cookie exists, bounce a GET  | be treated as security — it cannot tell whether the token is valid |
| `FACT-0018` | Server Component | read through `lib/dal.ts`, render            | call Nest directly; pass a token as a prop                         |
| `FACT-0019` | Server Action    | check the session itself, mutate, revalidate | trust that the proxy already checked (invariant 10)                |
| `FACT-0020` | `api-client.ts`  | be the single `fetch` to Nest                | be bypassed by a second `fetch` somewhere else                     |
| `FACT-0021` | Client component | render, submit a form                        | see the token, or call the API                                     |

- `FACT-0022` The session check appears three times — proxy, DAL, Server Action — and none of the
  three is removable. — `ADR-0004`, invariant 10

> **Rationale — not a fact.** That is not redundancy waiting to be optimized away. `ADR-0004`
> records what each of the three is for, and it is the record that governs, not this line.

## Patterns in use

**Source:** the ADR named in each row; the path in "Where" is where the pattern is applied.

| Key         | Pattern                                                           | Where                                                               | ADR        |
| ----------- | ----------------------------------------------------------------- | ------------------------------------------------------------------- | ---------- |
| `FACT-0023` | Backend for Frontend                                              | `apps/web` in front of `apps/api`                                   | `ADR-0002` |
| `FACT-0024` | Stateless session in a cookie                                     | `ps_session`, httpOnly, holding the JWT Nest signed                 | `ADR-0003` |
| `FACT-0025` | Defence in depth                                                  | `proxy.ts` → `dal.ts` → every Server Action                         | `ADR-0004` |
| `FACT-0026` | Layered modules                                                   | controller → service → store, per Nest module                       | `ADR-0006` |
| `FACT-0027` | DTO + mapper at the edge                                          | `*.mapper.ts`, `toMeetingDto`                                       | `ADR-0006` |
| `FACT-0028` | Guard + parameter decorator                                       | `JwtAuthGuard` + `@CurrentUser()`                                   | `ADR-0009` |
| `FACT-0029` | Global pipe as a provider                                         | `APP_PIPE` in `AppModule`                                           | `ADR-0006` |
| `FACT-0030` | In-memory repository + seed                                       | `*.seed.ts`; services own their arrays                              | `ADR-0007` |
| `FACT-0031` | Test fixture mirroring the seed                                   | `e2e/fixtures/seed.ts`                                              | `ADR-0007` |
| `FACT-0032` | Executable convention (meta-tests)                                | `suite-integrity`, `ledger`, `process`, `architecture`              | `ADR-0010` |
| `FACT-0033` | Decision log + orientation gate                                   | `docs/CHANGELOG.md`, `docs/BACKLOG.md`, `check-orientation`         | `ADR-0011` |
| `FACT-0052` | Component library + utility CSS                                   | HeroUI v3 on Tailwind v4 in `apps/web`                              | `ADR-0023` |
| `FACT-0055` | Design language declared as tokens                                | `apps/web/src/app/globals.css`                                      | `ADR-0026` |
| `FACT-0056` | Plus Jakarta Sans; icons only through `@phosphor-icons/react/ssr` | `apps/web/src/app/layout.tsx`, every component that imports an icon | `ADR-0026` |

> **Rationale — not a fact.** Why each pattern is here, in one line apiece. This is a reading aid;
> the record that governs is the ADR in the row, and where the two differ the ADR is right.
>
> BFF keeps the token off the client and the API off the public internet. A stateless cookie session
> needs no session store and leaves the API the only authority on identity. Defence in depth exists
> because the cheap check is not the real one and the real one sits next to the data. Layered modules
> make each layer testable without the one above it. The DTO and mapper stop internal fields such as
> `ownerId` leaving by accident. The guard and parameter decorator make identity arrive from the
> signature rather than from the payload. The global pipe as a provider gives test modules the same
> validation as the server. The in-memory repository buys a demo with no database and fixed data the
> tests can assert on. The fixture mirroring the seed lets the suite depend on data rather than on a
> running order. Meta-tests beat a style guide because a convention nobody can break silently beats
> one that asks nicely. The decision log and the orientation gate stop the same thing being built —
> or rejected — twice. A component library gives the accessible markup and the focus handling for
> free, which is what the functional cases address elements by; utility CSS is what it needs, not a
> second preference. The design language as tokens means a palette, radius or font change is one
> declaration rather than a sweep of components; Plus Jakarta Sans and the `/ssr` icon import are
> the two facts that constrain every future surface — the barrel and `dist/csr/*` both fail
> `next build` in a Server Component, which is why only the `/ssr` specifier is a pattern here.

## Patterns deliberately refused

**Source:** the record named in each row.

| Key         | Refused                                                                     | Recorded in             |
| ----------- | --------------------------------------------------------------------------- | ----------------------- |
| `FACT-0034` | CORS, a global API prefix                                                   | `ADR-0005`              |
| `FACT-0035` | `@nestjs/passport` + `passport-jwt`                                         | `ADR-0009`              |
| `FACT-0036` | `bcrypt`                                                                    | `ADR-0009`              |
| `FACT-0037` | A database                                                                  | `ADR-0007`              |
| `FACT-0038` | `middleware.ts`                                                             | `ADR-0002`, invariant 9 |
| `FACT-0039` | Client-side calls to Nest                                                   | `ADR-0002`              |
| `FACT-0040` | React component tests in jsdom                                              | `BACKLOG.md`, Rejected  |
| `FACT-0041` | Parallel agents separated by ports                                          | `ADR-0012`              |
| `FACT-0053` | HeroUI's `Form` and `FieldError`                                            | `ADR-0023`              |
| `FACT-0054` | `ListBox` for the meeting list                                              | `ADR-0023`              |
| `FACT-0057` | HeroUI v2 numeric token names (`text-foreground-500`, `border-default-200`) | `ADR-0026`              |

> **Rationale — not a fact.** Each of these looks like an obvious addition, so the reason it was
> turned down is summarized here; proposing it again costs a review cycle. The governing text is the
> record in the row. The numeric token names are v2; v3 defines `--muted` and `--border` with no
> numeric scale, and a name it does not define compiles to no CSS at all rather than failing loudly —
> which is what made the failure class worth naming here rather than only in the dead class itself.
>
> No browser origin ever calls Nest, so `enableCors()` would open it to every site for nothing. A
> ~25-line guard covers the whole need, and `@nestjs/passport` adds indirection rather than safety.
> `node:crypto.scrypt` needs no native build and is already in the platform, so `bcrypt` buys
> nothing. The demo's value is the contract and the process rather than persistence, and a database's
> cost lands on the tests. `middleware.ts` is deprecated in Next 16 — the file is `proxy.ts`.
> Client-side calls to Nest would put the token in the browser and end the BFF. React component tests
> in jsdom would be a second, less trustworthy copy of what the functional suite already checks. Next
> 16 registers its dev server per project directory, so ports do not separate parallel agents and
> only a worktree does. HeroUI's `Form` owns submission, which belongs to the Server Action, and its
> `FieldError` owns validation, which belongs to Nest — adopting either would put invariant 15 in
> the library's hands. `ListBox` renders `role="listbox"`/`role="option"`, a different
> accessibility contract from the `list`/`listitem` the meeting-list cases assert.

## Where a change goes

**Source:** the invariants and records named in each row.

| Key         | You are adding                  | Touch                                                                                                              |
| ----------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `FACT-0042` | An endpoint                     | controller + service + DTO + mapper; `api-contract.md`; `PROTECTED_ROUTES` if guarded (invariant 16); an api spec  |
| `FACT-0043` | A field on an existing response | the entity, the mapper, `data-model.md`, `api-contract.md`, the cases that assert the key set                      |
| `FACT-0044` | A page                          | `app/**`, `PROTECTED_PAGES` if guarded, a functional spec; a session check in the server layer, not only the proxy |
| `FACT-0045` | A mutation from the UI          | a Server Action with its own session check plus `revalidatePath` (invariant 10); never a client-side fetch         |
| `FACT-0046` | A cross-cutting rule            | an invariant in `CLAUDE.md` **and** a case in `e2e/security/**`                                                    |
| `FACT-0047` | An architectural choice         | an ADR **first**, then the code: `pnpm adr:new <slug>` (`docs/adr/README.md`, "Rules")                             |

> **Rationale — not a fact.** A rule with no check is a wish, which is why the cross-cutting row
> names a case as well as an invariant, and an ADR written after the code is a justification rather
> than a decision.

## How this file is kept honest

- `FACT-0048` `e2e/architecture/architecture.api.spec.ts` (`AR-API-*`) checks that every route
  registered in a Nest controller appears in `api-contract.md` and the other way round, that guarded
  routes match `PROTECTED_ROUTES`, and that the ADR log is internally consistent. —
  `e2e/architecture/architecture.api.cases.md`
- `FACT-0049` Every statement of fact in this file carries a `FACT-` key and a source, and
  `AR-API-11`…`AR-API-14` check the form of that on every `pnpm verify`. — `ADR-0021`
- `FACT-0050` Whether a keyed statement is _true_ is checked by nothing here: the machine checks
  form, review checks meaning. — `ADR-0010`, `ADR-0021`
- `FACT-0051` The prose in the rationale blocks is held true by the rule that an architectural change
  writes its ADR before its code, and by the plan-review gate. — `docs/adr/README.md`, "Rules";
  `docs/process.md`
