# API contract

Every endpoint `apps/api` exposes: what it takes, what it answers, what it does internally, and what
depends on it. The executable truth is `e2e/regression/**/*.api.spec.ts` (`ADR-0008`); this file is
its prose companion and the planning context.

Neighbours: [`architecture.md`](architecture.md) (why the API looks like this),
[`data-model.md`](data-model.md) (the shapes), [`adr/`](adr/README.md) (the decisions), `CLAUDE.md`
(invariants 1–8).

`Content-Type: application/json` on everything except `GET /`. No CORS and no global prefix, on
purpose (`ADR-0005`). The base URL is `http://127.0.0.1:3001` in development and `:3101` under
Playwright.

## Routes

The table below is compared against the Nest controllers in **both directions** by `AR-API-05`: a
route added to the code without a row here — or a row without a route — fails `pnpm verify`. Guarded
routes are additionally matched against `PROTECTED_ROUTES` by `AR-API-06` (invariant 16).

| Method | Path          | Guard    | Success | Errors      | Cases            |
| ------ | ------------- | -------- | ------- | ----------- | ---------------- |
| `GET`  | `/`           | none     | `200`   | —           | `SM-API-01`      |
| `POST` | `/auth/login` | none     | `200`   | `400`,`401` | `AL-API-01`…`14` |
| `GET`  | `/auth/me`    | `Bearer` | `200`   | `401`       | `AL-API-10`…`14` |
| `GET`  | `/meetings`   | `Bearer` | `200`   | `400`,`401` | `HD-API-01`…`12` |
| `POST` | `/meetings`   | `Bearer` | `201`   | `400`,`401` | `HD-API-13`…`20` |

## Error shapes

Taken from `HttpException.createBody`, not from memory — this project broke on them twice
(invariants 1 and 8).

| Situation                                   | Code  | Body                                                                                            |
| ------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------- |
| `ValidationPipe` rejected the payload       | `400` | `{"message": ["email must be an email", …], "error": "Bad Request", "statusCode": 400}`         |
| An extra field under `forbidNonWhitelisted` | `400` | `{"message": ["property ownerId should not exist"], "error": "Bad Request", "statusCode": 400}` |
| Bad credentials                             | `401` | `{"message": "Invalid email or password", "error": "Unauthorized", "statusCode": 401}`          |
| Missing or invalid token                    | `401` | `{"message": "Authentication required", "error": "Unauthorized", "statusCode": 401}`            |

**`message` is an array on a 400 and a string on a 401.** Do not write a client that assumes one
shape.

---

## `GET /` — liveness

No auth. Answers `200 text/plain: Hello World!`.

It exists so the suite can tell "the server is up" from "the server is up and correct" before running
dozens of cases. A global prefix would break it, which is one of the reasons there is none
(`ADR-0005`).

## `POST /auth/login` — sign in

**Request:** `{ "email": string, "password": string }`. Validated by `LoginDto`: `@IsEmail()` on the
email, non-empty string on the password. There are deliberately **no** strength rules — they would
turn a wrong password into a `400` and make "an error is shown on bad credentials" unverifiable.

**Answers `200`**, not `201`. Nest defaults POST to 201, so the handler carries
`@HttpCode(HttpStatus.OK)`; removing the decorator breaks the contract silently and only a status
assertion catches it (invariant 1, `AL-API-01`).

**Body:** `{ "accessToken": string, "user": { "id", "email", "name" } }`. No `passwordHash` — the
mapper strips it and `AL-API-11` asserts the key set.

**Logic:**

1. Normalize the email (lowercase, trimmed) and look the user up.
2. **Always verify the password**, against the real hash when the user exists and against a dummy
   hash when it does not. The dummy is computed once at module load from random bytes.
3. On either failure throw `401` with the **same** message.
4. Sign `{ sub: user.id, email }` and return it with the public user.

Steps 2 and 3 are one rule, not two. An identical message alone left unknown emails answering in
52 ms against 86–114 ms for a wrong password, and accounts were enumerable by clock (`SEC-API-05`,
invariants 6 and 18).

**Not here:** rate limiting. Brute force is currently unlimited — `BL-001`, the only open item
considered a production blocker.

## `GET /auth/me` — the current profile

**Guard:** `JwtAuthGuard` on the method. **Answers** `200 { id, email, name }`.

Reads the id from `@CurrentUser()` — that is, from the signed token — and loads the user. If the
token is valid but the user is gone from the store, the answer is still `401`, never a `500`: a
restart wiped the store, and that is not a server fault the client can act on.

Used by `lib/dal.ts` on every protected page render. A `401` here is what sends the visitor through
`/auth/session-expired` (invariant 17).

## `GET /meetings` — the owner's recent meetings

**Guard:** `JwtAuthGuard` on the whole controller class — not registered globally, which would break
`GET /` and `POST /auth/login`.

**Query:** `limit?`, integer, `1..100`. `@IsOptional()` is **mandatory**: without it a request with
no `limit` still runs through `@IsInt/@Min/@Max` and answers `400`, so the dashboard would not load
at all (invariant 2, verified by probe, `HD-API-10`). The default of `3` is supplied by the
**service**, not the DTO — a DTO default does not survive `plainToInstance` predictably.

**Body:** `{ items: MeetingDto[], total: number }`.

**Logic:** filter by `ownerId` from the token → sort `startsAt` **descending with `id` ascending as
the secondary key** → slice by `limit`. `total` is `countByOwner`, the owner's **full** count, never
`items.length` (invariant 4).

The secondary sort key is not decoration: with equal dates the order would fall back to insertion and
`HD-FN-05` would flake (invariant 7). Comparison is on parsed milliseconds rather than on strings,
because a client may send an offset date (`+03:00`) that sorts wrongly as text.

## `POST /meetings` — create a meeting

**Guard:** the class-level `JwtAuthGuard`. **Answers `201`** — POST's default, and correct here;
there is no `@HttpCode` on this handler on purpose (`HD-API-13`).

**Request:** `{ title, startsAt, durationMinutes? }`.

| Field             | Rule                                                   |
| ----------------- | ------------------------------------------------------ |
| `title`           | string, 3–100 characters                               |
| `startsAt`        | ISO 8601                                               |
| `durationMinutes` | optional integer 15–480; the service defaults it to 60 |

**There is no `ownerId` field, and that absence is the protection.** The owner comes from the token,
and `forbidNonWhitelisted` rejects an attempt to send one with
`400 property ownerId should not exist` (invariant 5, `HD-API-16`, `HD-API-17`).

`durationMinutes` must carry `@IsOptional()` — the "New meeting" form omits it, so without the
decorator the button would answer 400 every time (`HD-API-20`).

**Logic:** generate a `randomUUID()` id, take `ownerId` from `@CurrentUser()`, normalize `startsAt`
to canonical UTC (`new Date(...).toISOString()`) so the store never holds mixed formats, default the
duration, store, and return through `toMeetingDto` — which strips `ownerId`.

---

## Who calls what

| Caller                                            | Endpoint                | When                                   |
| ------------------------------------------------- | ----------------------- | -------------------------------------- |
| `lib/actions/auth.ts` → `loginAction`             | `POST /auth/login`      | the login form is submitted            |
| `lib/dal.ts` → `getCurrentUser`                   | `GET /auth/me`          | every protected page render            |
| `lib/dal.ts` → `getMeetings`                      | `GET /meetings?limit=3` | the dashboard renders                  |
| `lib/actions/meetings.ts` → `createMeetingAction` | `POST /meetings`        | the "Create meeting" form is submitted |
| Playwright `request` fixture                      | all of them             | the `api` project                      |

Nothing else may call Nest. The browser never does (`ADR-0002`), and a second `fetch` helper
alongside `api-client.ts` is a defect, not a shortcut.

## Adding an endpoint

1. Write the ADR if the change is structural (`pnpm adr:new <slug>`).
2. Controller + service + DTO + mapper, following the layer rules in
   [`architecture.md`](architecture.md).
3. Add the row to the **Routes** table above and the section describing the logic — `AR-API-05`
   fails the run otherwise.
4. If it is guarded, add it to `PROTECTED_ROUTES` in `e2e/security/security.api.spec.ts`
   (invariant 16) — `AR-API-06` checks that too.
5. Cases in `e2e/regression/<feature>/<feature>.api.cases.md` and the paired spec. Negative cases
   assert **both** the status and the absence of a side effect.
