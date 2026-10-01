# Data model and data flows

Entities, field formats, where each value is allowed to travel, and what moves along the wire in
each scenario. Read this before designing anything that stores, returns or renders data.

Neighbours: [`architecture.md`](architecture.md) (the shape of the system),
[`api-contract.md`](api-contract.md) (the endpoints themselves), [`adr/`](adr/README.md) (why), and
`CLAUDE.md` (the invariants). Nothing here is repeated there.

Every statement of fact here carries a key (`FACT-1000`…) and names its source; anything without a
key is reasoning and must not be cited as fact (`ADR-0021`).

## Entities

Types live in `apps/api/src/**/*.types.ts`. This table is the prose version: formats, constraints and
what each field is for.

### `User`

**Source:** `apps/api/src/users/users.types.ts`; the key set is asserted by `AL-API-11`.

| Key         | Field          | Type     | Format / constraint                        | Leaves the API?                      |
| ----------- | -------------- | -------- | ------------------------------------------ | ------------------------------------ |
| `FACT-1000` | `id`           | `string` | `usr-<slug>`, stable, assigned by the seed | yes                                  |
| `FACT-1001` | `email`        | `string` | a valid address; the login identifier      | yes                                  |
| `FACT-1002` | `name`         | `string` | display name                               | yes                                  |
| `FACT-1003` | `passwordHash` | `string` | `scrypt`, salted, compared constant-time   | **never** — `toPublicUser` strips it |

- `FACT-1004` `PublicUser = Omit<User, 'passwordHash'>` is what the wire ever sees. —
  `apps/api/src/users/users.types.ts`, `AL-API-11`

> **Rationale — not a fact.** `AL-API-11` asserts the key set rather than the absence of one field,
> so a new field added to `User` cannot escape by accident.

### `Meeting`

**Source:** `apps/api/src/meetings/meetings.types.ts`; the key set is asserted by `HD-API-01`.

| Key         | Field             | Type       | Format / constraint                                                            | Leaves the API?                      |
| ----------- | ----------------- | ---------- | ------------------------------------------------------------------------------ | ------------------------------------ |
| `FACT-1005` | `id`              | `string`   | `mtg-<owner>-<n>` in the seed                                                  | yes                                  |
| `FACT-1006` | `ownerId`         | `string`   | a `User.id`; set from the token, never the body                                | **never** — `toMeetingDto` strips it |
| `FACT-1007` | `title`           | `string`   | 3–100 characters                                                               | yes                                  |
| `FACT-1008` | `startsAt`        | `string`   | ISO 8601, UTC, always `…Z` — a string, not a `Date`                            | yes                                  |
| `FACT-1009` | `durationMinutes` | `number`   | integer, 15–480; optional on input, default 60                                 | yes                                  |
| `FACT-1010` | `participants`    | `string[]` | 0–20 free-form strings, 1–100 characters each; optional on input, default `[]` | yes                                  |

- `FACT-1011` `MeetingDto = Omit<Meeting, 'ownerId'>`. — `apps/api/src/meetings/meetings.types.ts`,
  `HD-API-01`

> **Rationale — not a fact.** `startsAt` is a string rather than a `Date` deliberately: it survives
> JSON serialization unchanged and compares stably in assertions.

### Response wrappers

**Source:** `apps/api/src/meetings/meetings.types.ts`, `apps/api/src/auth/auth.types.ts`.

- `FACT-1012` `MeetingsPageDto` = `{ items: MeetingDto[], total: number }`. —
  `apps/api/src/meetings/meetings.types.ts`
- `FACT-1013` `total` is the owner's full record count, never `items.length` — `items` is cut by the
  limit. — invariant 4, `HD-UT-03`, `HD-API-05`, `HD-FN-03`
- `FACT-1014` `LoginResult` = `{ accessToken: string, user: PublicUser }`. —
  `apps/api/src/auth/auth.types.ts`
- `FACT-1015` `JwtPayload` = `{ sub: <user id>, email }`. — `apps/api/src/auth/auth.types.ts`
- `FACT-1016` The JWT payload is readable by anyone holding the token, so nothing secret goes in
  it. — `ADR-0003`

> **Rationale — not a fact.** `total` is covered at three levels because it is the classic mistake
> here: the count that is easiest to write is the wrong one.

## Value formats

**Source:** the DTOs in `apps/api/src/**/dto`, plus the invariant named in the row.

| Key         | Value         | Rule                                                                                                                                                                        |
| ----------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FACT-1017` | Identifiers   | opaque strings with a type prefix (`usr-`, `mtg-`). Never a number, never guessable-by-increment                                                                            |
| `FACT-1018` | Timestamps    | ISO 8601 in **UTC**, milliseconds included. No local time anywhere in storage or on the wire                                                                                |
| `FACT-1019` | Display dates | formatted with `Intl.DateTimeFormat('en-GB', …, { timeZone: 'UTC' })`, pinned                                                                                               |
| `FACT-1020` | Durations     | whole minutes, 15–480                                                                                                                                                       |
| `FACT-1021` | Email         | validated by `@IsEmail()` on input; `trim`med on the web side before submission                                                                                             |
| `FACT-1022` | Password      | validated only as a non-empty string on login, and **never trimmed** (invariant 15)                                                                                         |
| `FACT-1023` | Created dates | tests create meetings dated **2030**                                                                                                                                        |
| `FACT-1024` | Participants  | free-form strings, a name or an email, 1–100 characters, at most 20 per meeting. Never a `User.id`, never validated as an email, never trimmed or deduplicated (`ADR-0017`) |

> **Rationale — not a fact.** Display dates are pinned to UTC or both the units and the e2e depend on
> the machine's time zone. A password strength rule would turn a wrong password into a 400 and make
> `AL-API-02` unverifiable, and trimming a password silently alters what was typed — the same
> argument that keeps participants untrimmed. Tests use 2030 so their data never collides with the
> seed's "recent" assertions.

## Storage and lifetime

- `FACT-1025` There is no database. — `ADR-0007`
- `FACT-1026` Each service owns an array, seeded at module initialization. —
  `apps/api/src/meetings/meetings.service.ts`, `apps/api/src/users/users.service.ts`

**Source:** `ADR-0007`; the cookie's lifetime is set in `apps/web/src/lib/session-cookie.ts`.

| Key         | Datum           | Lives in                               | Dies when                                                  |
| ----------- | --------------- | -------------------------------------- | ---------------------------------------------------------- |
| `FACT-1027` | Users, meetings | in-memory arrays in the services       | the API process restarts (`--watch` does it on every edit) |
| `FACT-1028` | Password hashes | computed at startup from the seed      | with the process; plaintext never persists                 |
| `FACT-1029` | Session         | the `ps_session` cookie in the browser | it expires (1 h) or sign-out deletes it                    |

- `FACT-1030` No test may depend on data another test created. — `e2e/README.md`, `ADR-0007`
- `FACT-1031` Mutating cases follow the robustness rules for asserting against a shared sandbox. —
  `e2e/README.md`

## Seed data

- `FACT-1032` The seed is `apps/api/src/users/users.seed.ts` and `meetings.seed.ts`, mirrored for the
  suite in `e2e/fixtures/seed.ts`. — `ADR-0007`
- `FACT-1033` Drift between the seed and its mirror fails `SM-API-02` / `SM-API-03`. —
  `e2e/smoke/seed.api.spec.ts`

**Source:** `apps/api/src/users/users.seed.ts`, `e2e/fixtures/seed.ts`.

| Key         | User                          | Name            | Meetings | Role in the suite                                 |
| ----------- | ----------------------------- | --------------- | -------- | ------------------------------------------------- |
| `FACT-1034` | `teacher@purpleschool.test`   | Anna Teacher    | 5        | read-only; exact counts and the "last 3" ordering |
| `FACT-1035` | `student@purpleschool.test`   | Ivan Student    | 0        | read-only; the empty-state edge case              |
| `FACT-1036` | `planner@purpleschool.test`   | Maria Planner   | 1        | mutation sandbox for `*.api.spec.ts`              |
| `FACT-1037` | `organizer@purpleschool.test` | Peter Organizer | 1        | mutation sandbox for `*.functional.spec.ts`       |

- `FACT-1038` All four users share one password, `Passw0rd!`. — `e2e/fixtures/seed.ts`
- `FACT-1039` `teacher` and `student` are never mutated. — `e2e/README.md`, `SM-API-02`
- `FACT-1040` Playwright runs the `api` and `web` projects in parallel against one store, so there
  are two separate mutation sandboxes. — `playwright.config.ts`, `ADR-0008`
- `FACT-1041` Seed dates are absolute (January 2026) and never computed from `Date.now()`. —
  `apps/api/src/meetings/meetings.seed.ts`

> **Rationale — not a fact.** The mirror is not a convenience: it is the only source of logins,
> passwords and titles for tests. One password for all four would add noise to the cases and no
> branch if it differed. Absolute assertions rest on `teacher` and `student`, which is why they are
> never mutated, and computed seed dates would drift with the calendar and take the ordering and
> top-three assertions with them.

## Data flows

### Signing in

- `FACT-1042` The sign-in path is the one drawn below. —
  `apps/web/src/lib/actions/auth.ts`, `apps/web/src/lib/session-cookie.ts`

```
Browser  form POST ──► Server Action loginAction
                        │ parse + trim email (password untouched)
                        ├─► api-client: POST /auth/login {email, password}
                        │                 ◄── 200 {accessToken, user}
                        ├─ cookies().set('ps_session', accessToken, httpOnly, sameSite=lax,
                        │                secure = NODE_ENV === 'production', maxAge = 1 h)
                        └─ redirect('/')   ← called OUTSIDE try/catch (invariant 11)
```

- `FACT-1043` The token must not reach the response body, the HTML or an RSC payload. —
  `SEC-FN-02`, invariant 19
- `FACT-1044` The two rejection branches must differ neither in text nor in timing. —
  `SEC-API-05`, invariants 6 and 18

### Rendering the dashboard

- `FACT-1045` The dashboard render path is the one drawn below. — `apps/web/src/app/page.tsx`,
  `apps/web/src/lib/dal.ts`, `apps/web/src/proxy.ts`

```
Browser  GET / ──► proxy.ts        cookie present? no → 307 /auth/login   (optimistic only)
                 └► page.tsx (Server Component)
                     ├─► dal.getCurrentUser()  ──► GET /auth/me        (Bearer from the cookie)
                     └─► dal.getMeetings()     ──► GET /meetings?limit=3
                          401 from either ──► /auth/session-expired → clears the cookie → /auth/login
```

- `FACT-1046` The three most recent meetings are chosen by the service, sorting on `startsAt` with
  `id` as a secondary key. — invariant 7, `HD-FN-05`,
  `apps/api/src/meetings/meetings.service.ts`

> **Rationale — not a fact.** `total` comes from the API rather than from counting `items`
> (`FACT-1013`). With equal dates the order would otherwise be undefined and the case would flake,
> which is what the secondary key is for.

### Creating a meeting

- `FACT-1047` The create path is the one drawn below. —
  `apps/web/src/lib/actions/meetings.ts`

```
Browser  form POST ──► Server Action createMeetingAction
                        ├─ its own session check (the proxy proves nothing here)
                        ├─ normalize <input type="datetime-local"> → ISO 8601 UTC
                        ├─► POST /meetings {title, startsAt, durationMinutes?}   (Bearer)
                        │      ownerId is taken from the token; sending one is rejected 400
                        └─ revalidatePath('/')  → the counter and the list re-render
```

- `FACT-1048` `ownerId` is taken from the token, and sending one in the body is rejected with a 400. — invariant 5, `HD-API-16`, `HD-API-17`

### Session ending

- `FACT-1049` Sign-out deletes the cookie and redirects to `/auth/login`. —
  `apps/web/src/lib/actions/auth.ts`
- `FACT-1050` An invalid session goes through the `/auth/session-expired` Route Handler, which clears
  the cookie first. — invariant 17, `SEC-FN-05`

> **Rationale — not a fact.** Redirecting an invalid session straight to the login page produces
> `ERR_TOO_MANY_REDIRECTS`, because the proxy sees the cookie again and sends the visitor back.

## Changing the data model

**Source:** the checks named in each step.

| Key         | Step                                                                                                                                   |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `FACT-1051` | Change the entity **and** its mapper (`ADR-0006`); a field that must not travel is dropped in the mapper, not at each call site        |
| `FACT-1052` | Update [`api-contract.md`](api-contract.md) and this file in the same commit                                                           |
| `FACT-1053` | If the seed changes, change `e2e/fixtures/seed.ts` with it, or `SM-API-02` / `SM-API-03` goes red                                      |
| `FACT-1054` | Update the cases that assert by key set — `AL-API-11`, `HD-API-01`                                                                     |
| `FACT-1055` | If the change is structural (a new entity, a changed ownership rule, persistence), write the ADR first (`docs/adr/README.md`, "Rules") |

> **Rationale — not a fact.** The key-set assertions are what stops a field escaping silently, which
> is why they are listed as a step rather than left to be noticed.
