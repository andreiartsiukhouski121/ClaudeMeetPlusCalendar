# History: meetings-detail-participants

Reference document for the requirement. What the project record shows about:
(a) a `participants[]` field on the meeting entity/contract,
(b) a single-meeting-by-id endpoint,
(c) whether the sketch's `date` field is the existing `startsAt` under another name.

Record only what is in the project. Citations to every statement.

> **Assembly note (`researcher`).** This file was written by the `researcher-history` sweep on
> `haiku` and then edited by the `researcher` in one respect only: five lines beginning
> "Bearing on this area: …" were **removed**. Each drew a consequence for this change from a quoted
> ADR ("a detail endpoint must be callable from `lib/dal.ts`", "any new field must be added to the
> entity, the mapper and the cases", and three more of the same form). Those are design, not
> record. The ADR quotations they hung off are untouched below. Two backlog rows the sweep did not
> list (`BL-019`, `BL-021`) were added with citations, and `BL-023` was added later on review finding F1.

---

## Already built

Features and process changes that touched the meetings area.

**FT-002** (commit `4bedc02`, 2026-09-07): **Home `/`: greeting, meeting counter, 3 most recent, creation, sign-out**

Full text from `docs/CHANGELOG.md:38,45-48`:

> | FT-002 | 2026-09-07 | Home `/`: greeting, meeting counter, 3 most recent, creation, sign-out | 16 API, 13 functional, 13 units | `4bedc02` |
>
> **FT-002.** In-memory meetings with a seed of 4 users. `total` comes from `countByOwner`, not from
> the length of `items`. `ownerId` always comes from the signed token. The gate for unauthenticated
> visitors is `src/proxy.ts` (not `middleware.ts`, deprecated in Next 16), plus a duplicate check in
> `lib/dal.ts` and inside every Server Action.

**CH-015** (commit `08148c7`, 2026-09-25): **Architecture corpus** — established the four documents constraining the meetings area

From `docs/CHANGELOG.md:59`:

> | CH-015 | 2026-09-25 | Architecture corpus: `docs/architecture.md`, `docs/adr/` (15 records, `pnpm adr:new`), `data-model.md`, `api-contract.md`; section 0 gained "Architecture impact"; `AR-API-01…08` meta-test (`ADR-0015`) | `08148c7` |

---

## Already broken here

Defects found in this area, with what found them.

None yet recorded specifically touching a `participants` field, a by-id endpoint, or the shape of errors returned by such an endpoint. However, the following defects were found in the meetings/DTO/validation area itself:

**FX-027** (found by "skill audit", commit `7126d8a`): Corpus documents drifted internally

From `docs/CHANGELOG.md:81,86`:

> | FX-027 | 2026-09-16 | The run measurements paragraph lived in four copies with three different number sets, and all were wrong: actually 85 e2e and 42 units, `pnpm verify` 137 s | skill audit | `7126d8a` |

**Found during implementation, before the code reached a branch** (`docs/CHANGELOG.md:114-129`):

The following were caught by plan review and spike, not by running code:

> | `@IsOptional()` missing on `limit` and `durationMinutes` — `GET /meetings` without a parameter and form creation gave 400 | probe against real Nest in review |
> | `@Max(50)` against cases using `limit=100` | probe |

---

## Deferred

Backlog items overlapping the meetings area. Full texts with "Conflicts with" column.

**BL-007** (P2, feature, from `docs/BACKLOG.md:43`):

> | BL-007 | P2 | feature | Editing and deleting a meeting | — | **yes:** `PROTECTED_ROUTES` and the endpoint list in `apps/api/README.md` will need extending |

**BL-009** (P3, web, from `docs/BACKLOG.md:41`):

> | BL-009 | P3 | web | Display time zone from the user profile instead of hard-pinned UTC | — | **yes:** `HD-UT-10`…`HD-UT-12` and `formatMeetingDateTime` depend on `timeZone: 'UTC'`; change together |

Other backlog items touching the meetings/API area:

**BL-004** (P2, security): "Seed → migration with pre-computed hashes instead of plaintext in `users.seed.ts`"

- Conflicts with: "yes: `e2e/fixtures/seed.ts` mirrors the seed; change both or `SM-API-02` goes red"
- Source: `docs/BACKLOG.md:46`

**BL-008** (P2, feature): "Real sign-up: an `/auth/register` page plus `POST /auth/register`"

- Conflicts with: "yes: `/auth/register` is a placeholder checked by `AL-FN-06`; the case will need rewriting"
- Source: `docs/BACKLOG.md:42`

**BL-019** (P3, process, `docs/BACKLOG.md:33`) — added by the `researcher` during assembly; the
sweep did not list it:

> | BL-019 | P3 | process | Drift check for `docs/data-model.md` against the DTO and entity types, the way `AR-API-05` checks routes | `CH-015` | no; extends the architecture meta-test |

**BL-023** (P2, web, `docs/BACKLOG.md:29`) — added by the `researcher` on review finding F1. It is
the highest-priority open backlog row whose "Conflicts with" cell names the test suite:

> | BL-023 | P2 | web | Decide whether to adopt HeroUI v3 in `apps/web` — it replaces CSS Modules with Tailwind v4 and React Aria, so it needs an ADR first | a product decision | **yes:** the functional cases address controls by accessible name; React Aria markup changes what `getByRole` sees, so the suite moves in the same change |

Whether this change has a web surface at all is not stated in the requirement as received
(`README.md`, "Requirement, as received" — the sketch names three API routes and no page), and no
`apps/web` meeting-detail route exists (`code.md` §3). The row is recorded here because it is the
only planned-work conflict that would apply if one were added; whether it applies is not this
sweep's call.

**BL-021** (P3, process, `docs/BACKLOG.md:31`) — added by the `researcher` during assembly; it is
the only backlog row naming `docs/plans/` change folders:

> | BL-021 | P3 | process | Retire or archive change folders once their work is long shipped, if `docs/plans/` grows unwieldy | `CH-017` | no; `ADR-0011` keeps history, so this is about where it lives rather than whether it is kept |

---

## Rejected

Ideas considered and declined, with stated reasons. From `docs/BACKLOG.md:65-79` (Rejected section):

The **Rejected** section of `docs/BACKLOG.md` contains no entries specifically mentioning `participants`, `detail` endpoints, or single-resource-by-id lookups. The section covers:

- Unit coverage for `lib/dal.ts`, `proxy.ts`, `lib/actions/*` (rejected: `server-only`/Server Actions cannot be tested with Vitest in principle)
- React component tests in jsdom (rejected: functional Playwright tests already cover the UI)
- Deleting archived plans (rejected: they record decisions needed to understand why past calls went as they did)
- Pluralizing the meeting counter (rejected: breaks the locator in `HD-FN-03`)
- Mutation testing (rejected: control experiments already fill the role)
- Global `fullyParallel: false` (rejected: would slow the suite; races solved by dedicated owners)
- A state reset endpoint for tests (rejected: a test back door in production)
- `pnpm audit --audit-level=low` (rejected: would block on every advisory rather than genuine threats)

---

## Decisions constraining this area

Architecture decisions in force. From `docs/adr/README.md`, the following ADRs have been read and touch the meetings module, API contract, error handling, validation, or DTO mapping:

**ADR-0002 — The browser talks only to Next: a BFF in front of Nest** (accepted, 2026-09-07)

Constraining decision (from `docs/adr/ADR-0002-bff-boundary.md:20-23`):

> The browser addresses **only** `apps/web`. Every call to Nest is made server-side by
> `lib/api-client.ts`, the single door outward. The gate for unauthenticated visitors is `src/proxy.ts`
> — Next 16 deprecated `middleware.ts` — and its matcher is kept narrow so the proxy does not fire on
> `_next/static` and break the CSS.

**ADR-0005 — No CORS and no global prefix on the API** (accepted, 2026-09-07)

Constraining decision (from `docs/adr/ADR-0005-no-cors-no-prefix.md:24`):

> Neither is enabled. `main.ts` also disables the `x-powered-by` header, which was a real finding
> (`SEC-API-08`).

**ADR-0006 — Nest layering: controller, service, mapper, and validation as a provider** (accepted, 2026-09-07)

Constraining decision (from `docs/adr/ADR-0006-nest-layering.md:23-27`):

> - **Controller** routes, validates through its DTO, reads identity from `@CurrentUser()`, and maps
>   the result out. Nothing else.
> - **Service** holds the rules and owns the store. It knows nothing about HTTP.
> - **Mapper** (`toMeetingDto`, `toUserDto`) is the only way an entity becomes a response, so internal
>   fields are dropped in one place rather than remembered at each call site.
> - **`ValidationPipe` is registered as an `APP_PIPE` provider in `AppModule`**, with
>   `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`.

**ADR-0007 — An in-memory store with a code seed instead of a database** (accepted, 2026-09-07)

Constraining decision (from `docs/adr/ADR-0007-in-memory-store.md:15-21`):

> Services own plain arrays, seeded at module init from `*.seed.ts`. Passwords sit in `users.seed.ts`
> as plaintext and are hashed with `scrypt` at startup, so the store itself never holds a plaintext
> password.
>
> The suite gets a **mirror** of the seed in `e2e/fixtures/seed.ts` — the single source of logins,
> passwords and meeting titles for tests. Drift between the two fails `SM-API-02`/`SM-API-03`.

**ADR-0015 — The architecture corpus is the mandatory planning context** (accepted, 2026-09-25)

Constraining decision (from `docs/adr/ADR-0015-architecture-corpus.md:20-30`):

> Four documents, disjoint by subject, are the context every role starts from:
>
> | Document               | Owns                                                                |
> | ---------------------- | ------------------------------------------------------------------- |
> | `docs/architecture.md` | the shape of the system, layers, patterns used and patterns refused |
> | `docs/adr/`            | why each of those choices was made, one immutable file per decision |
> | `docs/data-model.md`   | entities, field formats, lifetimes, and the flows between layers    |
> | `docs/api-contract.md` | every endpoint: request, response, errors, and the logic behind it  |

The following ADRs are listed in `docs/adr/README.md` but do not bear directly on the meetings module, error shapes, or DTO mapping:

- **ADR-0001** — A pnpm monorepo with two applications and shared config packages
- **ADR-0003** — The session is the API's own JWT in an httpOnly cookie
- **ADR-0004** — The session is checked three times, not once
- **ADR-0008** — Playwright at the root, on dedicated ports, owns the contract
- **ADR-0009** — Our own guard and `node:crypto` instead of passport and bcrypt
- **ADR-0010** — Conventions are executable: meta-tests instead of a style guide
- **ADR-0011** — A ledger, and an orientation gate before any planning
- **ADR-0012** — Parallel agents are isolated by git worktree, never by port
- **ADR-0013** — The project is English-only
- **ADR-0014** — Roles are fixed agent definitions with their own tools and model
- **ADR-0016** — Discovery runs as three reviewed stages in a folder per change

---

## Recent changes touching this area

Commits that shaped the meetings module and API contract. From `git log --oneline -- apps/api/src/meetings docs/api-contract.md docs/data-model.md e2e/regression/home-dashboard`:

| Commit    | Subject                                                                                                                                                                          |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `08148c7` | feat: architecture corpus and an agent team with fixed roles                                                                                                                     |
| `39e9e0c` | chore: whole project migrated to English and comments condensed                                                                                                                  |
| `7126d8a` | chore: audit of skills — contradictions and duplicates removed, `skills:sync` added [translated from Russian: "аудит скилов — сняты противоречия и дубли, добавлен skills:sync"] |
| `4bedc02` | feat(meetings): home page with meetings list and contract `/meetings` [translated from Russian: "главная страница со списком встреч и контракт /meetings"]                       |

---

## Not found

Searched explicitly; no record found.

- **Not found:** a `participants` field anywhere in `apps/api/src/meetings/**`, `apps/web/src`, `docs/api-contract.md`, or `docs/data-model.md` — searched via `grep -rn "participants" apps/api apps/web docs/ --include="*.ts" --include="*.tsx" --include="*.md"` (no code matches; only the scaffolded change folder's own slug `meetings-detail-participants` in titles).

- **Not found:** a `GET /meetings/:id` (or `GET /meetings/{id}`) route in either `docs/api-contract.md` or `apps/api/src/meetings/meetings.controller.ts` — the Routes table in `api-contract.md:21-27` lists only `GET /meetings` (list) and `POST /meetings` (create), both guarded. The controller registers only `@Get()` (line 25) and `@Post()` (line 38) on the `@Controller('meetings')` prefix; no `@Get(':id')` exists.

- **Not found:** a method on `MeetingsService` that looks up a single meeting by id (`findById`, `getById`, `find`, `getOne`) — the full service code (`apps/api/src/meetings/meetings.service.ts:33-88`) contains only `findRecent()`, `countByOwner()`, `create()`, and `byOwner()` (private).

- **Not found:** a documented 404 response body shape — the error-shapes table in `docs/api-contract.md:34-39` lists `ValidationPipe` 400, extra field 400, bad credentials 401, missing/invalid token 401. No "resource not found" row. `NotFoundException` (Nest's HTTP exception) is not mentioned anywhere in `docs/`.

- **Not found:** any array-valued field on the `Meeting`/`MeetingDto` entities — the entity table in `docs/data-model.md:27-39` lists `id`, `ownerId`, `title`, `startsAt`, `durationMinutes` only. No `participants` or plural field. `MeetingDto = Omit<Meeting, 'ownerId'>` (`docs/data-model.md:37`), so it inherits the same five fields; the documented key set is "exactly" `durationMinutes`, `id`, `startsAt`, `title` (`e2e/regression/home-dashboard/home-dashboard.api.cases.md:45`).

- **Not found:** any corpus statement equating a `date` field (from the sketch) with the existing `startsAt` field — searched `docs/` for "date" and "startsAt" occurring together in an equivalence context. All corpus mentions of "date" in the meetings area refer to `startsAt`, or `<input type="datetime-local">` normalization, or "Seed dates are absolute (January 2026)". No field is literally named `date` in the code or documents.

- **Not found:** an ADR addressing array-typed request/response fields, participants/attendees modeling, or single-resource-by-id endpoints — the ADR titles in `docs/adr/README.md` and the subject lines of ADR files cover monorepo, BFF boundary, session, guards, CORS/prefix, Nest layering, in-memory store, Playwright contracts, scrypt, conventions, ledger, worktrees, English, agent roles, architecture corpus, and discovery stages. None addresses a plural entity field or a parameterized route pattern.

---

## Open questions (uncitable, carried forward)

From the contract research sweep (`docs/plans/meetings-detail-participants/research/contract.md:319-330`):

- Whether a `GET /meetings/:id` would be guarded (and thus require a `PROTECTED_ROUTES` entry) is not stated anywhere — no document mentions this route at all.

- Whether cross-owner access to `GET /meetings/:id` (a token's owner requesting another owner's meeting id) should answer 404 or 403 is not addressed by any document; invariant 5 only says ownership is read from the token for _filtering/creation_, not for a by-id authorization check.

- Whether `participants[]` would be entity-owned (stored on `Meeting`) or a separate relation is not addressed anywhere in `docs/data-model.md`'s entity model, which currently defines only `User` and `Meeting` with no join/relation type documented.
