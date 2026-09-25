# Data model and data flows

Entities, field formats, where each value is allowed to travel, and what moves along the wire in
each scenario. Read this before designing anything that stores, returns or renders data.

Neighbours: [`architecture.md`](architecture.md) (the shape of the system),
[`api-contract.md`](api-contract.md) (the endpoints themselves), [`adr/`](adr/README.md) (why), and
`CLAUDE.md` (the invariants). Nothing here is repeated there.

## Entities

Types live in `apps/api/src/**/*.types.ts`. This table is the prose version: formats, constraints and
what each field is for.

### `User`

| Field          | Type     | Format / constraint                        | Leaves the API?                      |
| -------------- | -------- | ------------------------------------------ | ------------------------------------ |
| `id`           | `string` | `usr-<slug>`, stable, assigned by the seed | yes                                  |
| `email`        | `string` | a valid address; the login identifier      | yes                                  |
| `name`         | `string` | display name                               | yes                                  |
| `passwordHash` | `string` | `scrypt`, salted, compared constant-time   | **never** — `toPublicUser` strips it |

`PublicUser = Omit<User, 'passwordHash'>` is what the wire ever sees. `AL-API-11` asserts the key
set, so a new field on `User` does not escape by accident.

### `Meeting`

| Field             | Type     | Format / constraint                             | Leaves the API?                      |
| ----------------- | -------- | ----------------------------------------------- | ------------------------------------ |
| `id`              | `string` | `mtg-<owner>-<n>` in the seed                   | yes                                  |
| `ownerId`         | `string` | a `User.id`; set from the token, never the body | **never** — `toMeetingDto` strips it |
| `title`           | `string` | 3–100 characters                                | yes                                  |
| `startsAt`        | `string` | ISO 8601, UTC, always `…Z` — not a `Date`       | yes                                  |
| `durationMinutes` | `number` | integer, 15–480; optional on input, default 60  | yes                                  |

`MeetingDto = Omit<Meeting, 'ownerId'>`, checked by key set in `HD-API-01`. `startsAt` is a string
rather than a `Date` deliberately: it survives JSON serialization unchanged and compares stably in
assertions.

### Response wrappers

- `MeetingsPageDto` = `{ items: MeetingDto[], total: number }`. **`total` is the owner's full count,
  never `items.length`** — `items` is cut by `limit`. That is invariant 4, and it is covered at three
  levels (`HD-UT-03`, `HD-API-05`, `HD-FN-03`) because it is the classic mistake here.
- `LoginResult` = `{ accessToken: string, user: PublicUser }`.
- `JwtPayload` = `{ sub: <user id>, email }`. Nothing secret goes in: the payload is readable by
  anyone holding the token.

## Value formats

| Value         | Rule                                                                                                                                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identifiers   | opaque strings with a type prefix (`usr-`, `mtg-`). Never a number, never guessable-by-increment                                                                                                                    |
| Timestamps    | ISO 8601 in **UTC**, milliseconds included. No local time anywhere in storage or on the wire                                                                                                                        |
| Display dates | formatted with `Intl.DateTimeFormat('en-GB', …, { timeZone: 'UTC' })` — pinned, or tests depend on the machine's zone                                                                                               |
| Durations     | whole minutes, 15–480                                                                                                                                                                                               |
| Email         | validated by `@IsEmail()` on input; `trim`med on the web side before submission                                                                                                                                     |
| Password      | validated only as a non-empty string on login — a strength rule would turn a wrong password into a 400 and make `AL-API-02` unverifiable. **Never trimmed**: trimming silently alters what was typed (invariant 15) |
| Created dates | tests create meetings dated **2030**, so they never collide with the seed's "recent" assertions                                                                                                                     |

## Storage and lifetime

There is no database (`ADR-0007`). Each service owns an array, seeded at module initialization.

| Datum           | Lives in                               | Dies when                                                  |
| --------------- | -------------------------------------- | ---------------------------------------------------------- |
| Users, meetings | in-memory arrays in the services       | the API process restarts (`--watch` does it on every edit) |
| Password hashes | computed at startup from the seed      | with the process; plaintext never persists                 |
| Session         | the `ps_session` cookie in the browser | it expires (1 h) or sign-out deletes it                    |
| Nothing else    | —                                      | —                                                          |

Two consequences the suite is built around: **no test may depend on data another test created**, and
mutating cases must use **relative** counters.

## Seed data

`apps/api/src/users/users.seed.ts` and `meetings.seed.ts`; mirrored for the suite in
`e2e/fixtures/seed.ts`. The mirror is not a convenience — it is the only source of logins, passwords
and titles for tests, and drift between the two fails `SM-API-02`/`SM-API-03`.

| User                          | Name            | Meetings | Role in the suite                                 |
| ----------------------------- | --------------- | -------- | ------------------------------------------------- |
| `teacher@purpleschool.test`   | Anna Teacher    | 5        | read-only; exact counts and the "last 3" ordering |
| `student@purpleschool.test`   | Ivan Student    | 0        | read-only; the empty-state edge case              |
| `planner@purpleschool.test`   | Maria Planner   | 1        | mutation sandbox for `*.api.spec.ts`              |
| `organizer@purpleschool.test` | Peter Organizer | 1        | mutation sandbox for `*.functional.spec.ts`       |

One password for all four (`Passw0rd!`): different ones would add noise to the cases and no branch.
**`teacher` and `student` are never mutated** — absolute assertions rest on them. Two separate
sandboxes exist because Playwright runs the `api` and `web` projects in parallel against one store.

Seed dates are absolute (January 2026) and never computed from `Date.now()`, or the ordering and
top-three assertions would drift with the calendar.

## Data flows

### Signing in

```
Browser  form POST ──► Server Action loginAction
                        │ parse + trim email (password untouched)
                        ├─► api-client: POST /auth/login {email, password}
                        │                 ◄── 200 {accessToken, user}
                        ├─ cookies().set('ps_session', accessToken, httpOnly, sameSite=lax,
                        │                secure = NODE_ENV === 'production', maxAge = 1 h)
                        └─ redirect('/')   ← called OUTSIDE try/catch (invariant 11)
```

What must not happen: the token reaching the response body, the HTML or an RSC payload
(`SEC-FN-02`); the two rejection branches differing in text **or** in timing (`SEC-API-05`).

### Rendering the dashboard

```
Browser  GET / ──► proxy.ts        cookie present? no → 307 /auth/login   (optimistic only)
                 └► page.tsx (Server Component)
                     ├─► dal.getCurrentUser()  ──► GET /auth/me        (Bearer from the cookie)
                     └─► dal.getMeetings()     ──► GET /meetings?limit=3
                          401 from either ──► /auth/session-expired → clears the cookie → /auth/login
```

`total` comes from the API, not from counting `items`. The three most recent are chosen by the
service, sorting on `startsAt` **with `id` as a secondary key** — equal dates would otherwise order
non-deterministically and the case would flake (invariant 7).

### Creating a meeting

```
Browser  form POST ──► Server Action createMeetingAction
                        ├─ its own session check (the proxy proves nothing here)
                        ├─ normalize <input type="datetime-local"> → ISO 8601 UTC
                        ├─► POST /meetings {title, startsAt, durationMinutes?}   (Bearer)
                        │      ownerId is taken from the token; sending one is rejected 400
                        └─ revalidatePath('/')  → the counter and the list re-render
```

### Session ending

Sign-out deletes the cookie and redirects to `/auth/login`. An **invalid** session goes through the
`/auth/session-expired` Route Handler, which clears the cookie first — redirecting straight to the
login page produces `ERR_TOO_MANY_REDIRECTS`, because the proxy sees the cookie again and sends the
visitor back (invariant 17, `SEC-FN-05`).

## Changing the data model

1. Change the entity **and** its mapper. A field that should not travel must be dropped in the
   mapper, not remembered at each call site.
2. Update [`api-contract.md`](api-contract.md) and this file in the same commit.
3. If the seed changes, change `e2e/fixtures/seed.ts` with it, or `SM-API-02`/`SM-API-03` goes red.
4. Update the cases that assert by key set — they are what stops a field escaping silently.
5. If the change is structural (a new entity, a changed ownership rule, persistence), it is an ADR
   first: `pnpm adr:new <slug>`.
