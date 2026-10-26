# Research: contract sweep — e2e-test-architecture

Scope: what the corpus, ADRs and code already promise in the area of the requirement. No design, no
recommendation. A statement without a `FACT-` key is marked "reasoning".

> **Re-run after the research review (2026-10-21, `researcher`, no sub-dispatch).** Added §7, the
> per-key table of who cites `FACT-3125`, `3126`, `3131`, `3580`, `1071`, `1073`, `1037`, `1085`,
> `1086`, `1087` and `3642`. Nothing above §7 was changed.

## 1. Existing promises, by key

### Test isolation, sandboxes, baselines

| Key                       | Statement (quoted)                                                                                                                                                                                                                                                | Held in                                                                                                                             |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `FACT-3125`               | "Test isolation is achieved through data, not through resets: `teacher` (5 meetings) and `student` (0 meetings) are read-only and carry the absolute assertions."                                                                                                 | `docs/adr/ADR-0007-in-memory-store.md:22` (ADR-0007 status: superseded by ADR-0027; the key is not in its `## Retired facts` table) |
| `FACT-3126`               | "`planner` and `organizer` are the mutation sandboxes for the API and UI suites respectively, because Playwright runs both projects in parallel against one store."                                                                                               | `ADR-0007-in-memory-store.md:25`                                                                                                    |
| `FACT-3131`               | "Mutating cases use relative counters, never absolute ones."                                                                                                                                                                                                      | `ADR-0007-in-memory-store.md:37`                                                                                                    |
| `FACT-3580`               | "Test isolation stays isolation-through-data: `FACT-3125`, `FACT-3126` and `FACT-3131` are carried forward unchanged, and the per-run reset replaces only the restart that used to clear the store."                                                              | `docs/adr/ADR-0027-postgres-prisma-store.md:69`                                                                                     |
| `FACT-3128` / `FACT-3584` | Rejected: "A test-only reset endpoint — a back door in a production API." / "still a back door in a production API; … the reset happens outside the running application."                                                                                         | `ADR-0007:33`; `ADR-0027:79`                                                                                                        |
| `FACT-3129`               | Rejected: "One shared user for everything — parallel projects would race."                                                                                                                                                                                        | `ADR-0007` Decision, Rejected                                                                                                       |
| `FACT-3130`               | retired by `FACT-3579` ("no test may depend on data created by another")                                                                                                                                                                                          | `ADR-0007` `## Retired facts`                                                                                                       |
| `FACT-1030`               | "No test may depend on data another test created."                                                                                                                                                                                                                | `docs/data-model.md:142`                                                                                                            |
| `FACT-1031`               | "Mutating cases follow the robustness rules for asserting against a shared sandbox."                                                                                                                                                                              | `docs/data-model.md:143`                                                                                                            |
| `FACT-1076`               | "A mutating file case creates **its own** meeting under its sandbox owner … a listing over a meeting the case made itself has an exact expected count rather than a relative one. `FACT-3131` still governs anything counted across an owner's whole collection." | `docs/data-model.md:181`                                                                                                            |
| `FACT-1039`               | "`teacher` and `student` are never mutated."                                                                                                                                                                                                                      | `docs/data-model.md:188`                                                                                                            |
| `FACT-1087`               | "Playwright runs the `api` and `web` projects in parallel against one store, so there are two separate mutation sandboxes, `planner` and `organizer`, and a third user, `eraser`, mutated by `HD-API-23` alone."                                                  | `docs/data-model.md:189`                                                                                                            |
| `FACT-1023`               | "tests create meetings dated **2030**" (also `FACT-3132`)                                                                                                                                                                                                         | `docs/data-model.md:116`; `ADR-0007:38`                                                                                             |
| `FACT-1084`               | A meeting or file dies by its `DELETE` (files cascade); every row dies on volume removal or `db:reset`; "no route deletes a user"                                                                                                                                 | `docs/data-model.md:138`                                                                                                            |
| `FACT-3579`               | "The suite's database is dropped, re-pushed and re-seeded once per run, before the API starts"                                                                                                                                                                    | `ADR-0027:67`                                                                                                                       |
| `FACT-3595`               | "Every contributor and every CI run now needs a working Docker to run `pnpm e2e` or `pnpm verify`." (also `FACT-1066`)                                                                                                                                            | `ADR-0027:111`; `docs/data-model.md:129`                                                                                            |

Non-keyed (reasoning / e2e README, not the four corpus documents): `e2e/README.md:227-244` states
"Absolute counter assertions in `@mutating` cases are forbidden"; that cases from
`delete-meetings-and-files` on "delete it when it ends, also on failure"; that older mutating cases
(`MD-API-05`…`08`, `HD-API-13` onward, `MF-API-01`, `MF-API-07`…`19`) "do not clean up"; and that
`withCleanup` in `fixtures/cleanup.api.ts` is the one implementation. `e2e/README.md` carries no keys.

### Session cookie, token, login

- `FACT-3041` `POST /auth/login` returns the JWT Nest signed; `apps/web` puts that exact token into
  `ps_session`. `FACT-3042` "httpOnly, `sameSite=lax`, `path=/`". `FACT-3043` `secure` tied to
  `NODE_ENV === 'production'` (invariant 12). `FACT-3044` "The cookie's lifetime matches
  `JWT_EXPIRES_IN`." — `docs/adr/ADR-0003-session-jwt-cookie.md:19-25`.
- `FACT-1029` Session: "the `ps_session` cookie in the browser", dies "it expires (1 h) or sign-out
  deletes it" — `docs/data-model.md:140`. `FACT-0024` stateless session in a cookie —
  `docs/architecture.md:138`.
- `FACT-1042` sign-in path (drawn): `cookies().set('ps_session', accessToken, httpOnly,
sameSite=lax, secure = NODE_ENV === 'production', maxAge = 1 h)` — `docs/data-model.md:205-215`.
- `FACT-1043` "The token must not reach the response body, the HTML or an RSC payload." —
  `docs/data-model.md:218` (invariant 19).
- Code: `SESSION_COOKIE_NAME = 'ps_session'`, `SESSION_MAX_AGE_SECONDS = 60 * 60`, options
  `{httpOnly: true, sameSite: 'lax', path: '/', maxAge, secure: nodeEnv === 'production'}` —
  `apps/web/src/lib/session-cookie.ts:11,19,32-40`. API default `DEFAULT_JWT_EXPIRES_IN = '1h'`,
  overridable by `process.env.JWT_EXPIRES_IN` — `apps/api/src/config/auth.config.ts:13,35`. A bare
  JWT lifetime fact (the API side, not the cookie) with its own key: **not found** (see §6).
- `FACT-2019` login request `{email, password}`; `FACT-2021` answers `200` (invariant 1);
  `FACT-2022` body `{ "accessToken": string, "user": { "id", "email", "name" } }`, no `passwordHash`
  — `docs/api-contract.md:85-92`. `FACT-2007` is the Routes-table row — `:35`.
- `FACT-1014` `LoginResult` = `{ accessToken, user: PublicUser }` — `docs/data-model.md:89`.
- Invariants touching this area (`CLAUDE.md`): 10 (proxy sees only that a cookie exists; real check
  in `dal.ts` and every Server Action), 12 (`secure` by `NODE_ENV`), 17 (broken session goes through
  `/auth/session-expired`), 19 (token never a prop into a client component), 15 (login form rules:
  no `required`, email `type="text"`, password never trimmed).

### The two DELETE endpoints (FT-010)

- `DELETE /meetings/:id`, `Bearer`, `204`, errors `401`,`404`, cases `MD-API-09`…`11`, `HD-API-23`,
  `SEC-API-12` (`FACT-2128`); `DELETE /meetings/:id/files/:fileId`, `Bearer`, `204`, `401`,`404`,
  cases `MF-API-20`…`25`, `SEC-API-12` (`FACT-2129`) — `docs/api-contract.md:43-44`.
- `FACT-2130` meeting delete: class-level `JwtAuthGuard`, no body DTO; `204` empty body; `404` of
  `FACT-2016` is "the one answer for an absent, a foreign and an already-deleted id, so a second
  `DELETE` is `404` (`ADR-0018`)"; files removed with it by `onDelete: Cascade` —
  `docs/api-contract.md:240-247`. `FACT-2131` file delete: `204`; order guard, meeting ownership
  (`404` `FACT-2016`), then file (`404` `FACT-2083`); second `DELETE` is `404` — `:249-257`.
- Controllers declare both: `apps/api/src/meetings/meetings.controller.ts:84`,
  `apps/api/src/meeting-files/meeting-files.controller.ts:129`.

### The ten-file cap

- `FACT-3642` "An upload is refused when the meeting already holds ten files, so a feature with no
  delete cannot grow the database without bound; the check is a count before the insert rather than a
  transaction, so the rule is stated as a refusal rather than as an exact ceiling." —
  `docs/adr/ADR-0029-file-bytes-in-the-database.md:109` (ADR-0029 status: accepted).
- `FACT-2096` same refusal in the contract, cites `FACT-3642`, `MF-API-15` — `docs/api-contract.md:299-301`;
  `FACT-2107` the `400` body `["a meeting may hold at most 10 files"]` — `:333`; `FACT-2132`
  "deleting a file frees exactly one slot" — `:303`.
- `docs/security.md:92`: "**A cap of ten files per meeting**, so a feature with no delete cannot
  grow the database without bound." Unkeyed (security.md carries no keys in the lines read).
- `BL-068` (`docs/BACKLOG.md:29`) already records: the premise is false since `FT-010`; retire
  `FACT-3642` by `ADR-0022` route (`FACT-3487`); `docs/security.md:92` edited in the same change;
  ten living citations across five roles re-pointed.
- Source files citing `FACT-3642` (grep, outside `docs/plans` and profiling):
  `apps/api/src/meeting-files/{application/upload-meeting-file.ts,domain/limits.ts,domain/meeting-file.ts,infrastructure/prisma-meeting-file.repository.ts}`,
  `docs/api-contract.md`, `docs/BACKLOG.md`, `docs/CHANGELOG.md`,
  `e2e/regression/meeting-files/meeting-files.{api,functional,unit}.cases.md`.

### Playwright: workers, ports, warm-up

- `FACT-3143` Playwright starts its servers on 3100 (web) and 3101 (api); `FACT-3144`
  `E2E_WEB_PORT`/`E2E_API_PORT` shift the pair; `FACT-3145` project chosen by filename suffix;
  `FACT-3146` other suffix joins no project — `docs/adr/ADR-0008-playwright-contract-source.md:22-32`.
  `FACT-3149` `pnpm dev` and `pnpm e2e` mutually exclusive in one tree (ADR-0008); `FACT-3222` two
  runs in one tree share `JWT_SECRET: 'e2e-secret'` (`ADR-0012`).
- Workers: **no keyed fact**. Code: `fullyParallel: true`, `workers: isCI ? 1 : undefined`,
  `retries: isCI ? 2 : 0` — `playwright.config.ts:28-31`. `FX-052` (`docs/CHANGELOG.md:125`) says
  "with up to 14 workers" the first requests to never-compiled routes arrived at once.
- Warm-up: **no keyed fact**. Code: `globalSetup: './e2e/fixtures/warm-up.ts'` with comment "BL-058"
  — `playwright.config.ts:50-51`. `BL-067` (`docs/BACKLOG.md:30`) concerns the hand-kept route list in
  `warm-up.ts`. `FX-052` is the ledger entry (`docs/CHANGELOG.md:125`).
- Docker: see `FACT-3595` above; `FACT-3576` the api `webServer` → `start:e2e` → `db:reset` →
  `docker compose up -d --wait` — `ADR-0027:57`.

### Seed users, meetings, files (corpus)

`docs/data-model.md:160-164` (all passwords `Passw0rd!`, `FACT-1086`):

| Key         | User                          | Meetings | Role stated                                                                  |
| ----------- | ----------------------------- | -------- | ---------------------------------------------------------------------------- |
| `FACT-1034` | `teacher@purpleschool.test`   | 5        | read-only; exact counts and "last 3" ordering                                |
| `FACT-1035` | `student@purpleschool.test`   | 0        | read-only; empty-state edge                                                  |
| `FACT-1071` | `planner@purpleschool.test`   | 2        | mutation sandbox for `*.api.spec.ts`, plus one never-mutated fixture meeting |
| `FACT-1037` | `organizer@purpleschool.test` | 1        | mutation sandbox for `*.functional.spec.ts`                                  |
| `FACT-1085` | `eraser@purpleschool.test`    | 0        | used by `HD-API-23` alone                                                    |

Meetings with files: `FACT-1072` `mtg-teacher-3` has 2 files (read-only file baseline);
`FACT-1073` `mtg-planner-2` has 5 (hostile filenames, `SEC-API-11`'s fixture); `FACT-1074` every
other 0 (`docs/data-model.md:172-176`). `FACT-1070` seed source is three modules applied by
`apps/api/prisma/seed.ts` and mirrored in `e2e/fixtures/seed.ts`; `FACT-1033` drift fails
`SM-API-02`/`SM-API-03`. `FACT-3123`/`FACT-3124` (ADR-0007) say the same for the mirror.

## 2. ADRs

| ADR        | Status                        | Decision (cited)                                                                                                                                                                                                                                                                        | Touched by the requirement's items                                                                                                                               |
| ---------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ADR-0003` | accepted                      | cookie `ps_session`, httpOnly, lax, `/`; lifetime = `JWT_EXPIRES_IN` (`FACT-3041`…`3044`)                                                                                                                                                                                               | item "cookie built from API token": `FACT-3041` (token is what login returns), `FACT-3042`, `FACT-3044`                                                          |
| `ADR-0007` | superseded by `ADR-0027`      | stated facts `FACT-3123`…`3126`, `3128`, `3129`, `3131`…`3133`                                                                                                                                                                                                                          | `FACT-3125`, `3126`, `3131` (sandboxes, relative counters) — see Divergence D1                                                                                   |
| `ADR-0008` | accepted                      | root Playwright, dedicated ports 3100/3101, suffix-chosen projects (`FACT-3142`…`3150`)                                                                                                                                                                                                 | ports stay; project-by-suffix (`FACT-3145`); `FACT-3150` suite is the canonical contract description                                                             |
| `ADR-0010` | accepted                      | conventions are executable via meta-tests (`FACT-3184`…`3195`); `FACT-3194` new case prefix registered in `KNOWN_CASE_PREFIXES`                                                                                                                                                         | any new spec/case layout is under `suite-integrity` (`FACT-3184`: "nine suite rules: suffixes, `.cases.md` pairing, ID uniqueness")                              |
| `ADR-0012` | accepted                      | parallel agents isolated by git worktree, never port (`FACT-3224`, `3225`)                                                                                                                                                                                                              | workers 7 in one tree: `FACT-3221`/`3222` list what two runs in one tree share; the ADR is about agents, not Playwright workers (reasoning on that is not keyed) |
| `ADR-0022` | accepted                      | `FACT-3487` retire = new key naming successor; `FACT-3488` withdraw names a ledger entry/ADR/commit; `FACT-3489` retired facts move to the document's `## Retired facts` table; `FACT-3491`…`3495` lock + `AR-API-15`/`16`/`17`; `FACT-3501` "a change of meaning retires and replaces" | the procedure for retiring `FACT-3125`/`3126`/`3131`/`3580`/`3642`, and for any ADR that ADR-0007/0027/0029 facts live in                                        |
| `ADR-0025` | accepted                      | axe scanner in the suite: `FACT-3534` runs against every page; `FACT-3536` pages listed in `AUDITED_PAGES`                                                                                                                                                                              | accessibility spec is in the migration scope (item 7)                                                                                                            |
| `ADR-0027` | accepted, supersedes ADR-0007 | PostgreSQL via Prisma; `FACT-3579` reset once per run; `FACT-3580`; `FACT-3584` no test-only reset endpoint; `FACT-3595` Docker required                                                                                                                                                | `FACT-3580` (retire target); `FACT-3584`/`FACT-3128` (refused back door) vs. a new API layer in e2e                                                              |
| `ADR-0029` | accepted                      | bytes in `bytea`; `FACT-3642` cap of ten files                                                                                                                                                                                                                                          | `FACT-3642` (retire target)                                                                                                                                      |
| `ADR-0018` | accepted                      | not-found over forbidden                                                                                                                                                                                                                                                                | `FACT-2130`/`2131` cite it for the repeat-`DELETE` `404` (relevant to cleanup tolerance)                                                                         |
| `ADR-0031` | accepted                      | prefixed identifiers (`usr-`, `mtg-`, `fil-`), runtime ids `randomUUID()`                                                                                                                                                                                                               | `FACT-1080`/`1081`/`1082`: seed ids are readable, runtime ids random                                                                                             |

Supersession procedure for ADRs: `docs/adr/README.md` "Rules" — an accepted ADR is not edited in
substance; a changed decision gets a new ADR whose `Supersedes` names the old one, whose status then
becomes `superseded`; create with `pnpm adr:new <slug>`; the plan cites the ADR ID before the code.
The ADR log index is at `docs/adr/README.md:39-73` (ADR-0001…ADR-0035). No ADR in the index is titled
for tests-through-UI, fixtures, or e2e layering; ADRs about tests are 0008, 0010, 0025.

## 3. `docs/security.md`

- `:92` the cap sentence quoted above; `:93` repeats that the check is a count followed by an insert.
- Cookie: `:25` "httpOnly + sameSite=lax cookie, HS256 JWT, no token in the HTML or RSC"; `:45-50`
  `SEC-FN-05` the endless redirect on an invalid cookie; `:134` "The cookie token is not additionally
  encrypted. It is HS256-signed, unreadable from JS …"; `:138` "Rotating `JWT_SECRET` signs everyone out".
- Test users: **not found** in the lines grep returned for "test user"/"cookie"/"httpOnly".
- `docs/security.md` carries no `FACT-` keys in the lines read: the statements above are unkeyed.

## 4. Seed: corpus vs code

Code: `apps/api/src/users/users.seed.ts:31-57` five users (`usr-teacher`, `usr-student`, `usr-planner`,
`usr-organizer`, `usr-eraser`; emails and names as in the table); `meetings.seed.ts` meetings
`mtg-teacher-1…5`, `mtg-planner-1…2`, `mtg-organizer-1` (grep of `id:`/`ownerId`); mirror
`e2e/fixtures/seed.ts:34-63` carries the same five emails with one `SEED_PASSWORD`; seed applied by
`apps/api/prisma/seed.ts:74-112`. Corpus (`FACT-1034`…`1037`, `1071`, `1085`) agrees on users, emails,
names and meeting counts (5/0/2/1/0). Files per meeting and the file seed were not re-counted in code
by this sweep (see Not found). A pool of ten browser users exists in neither the seed nor the corpus.

## 5. Routes: users / reset

Routes table `docs/api-contract.md:34-44`: eleven routes (`GET /`, `POST /auth/login`,
`GET /auth/me`, meetings and files routes, two DELETEs). Controllers (grep of decorators):
`app.controller.ts` `@Get()`; `auth.controller.ts` `login`, `me`; meetings `@Get() @Post() @Get(':id')
@Delete(':id')`; meeting-files `@Post(':id/files') @Get(':id/files') @Get(':id/files/:fileId/content')
@Delete(':id/files/:fileId')`. They match the table. No create-user, delete-user or reset route in
either (`FACT-1084`: "no route deletes a user"). A test-only reset endpoint is refused: `FACT-3128`
(`ADR-0007:33`), carried by `FACT-3584` (`ADR-0027:79`), and `docs/BACKLOG.md:123` (Rejected row "A
state reset endpoint for tests": "A test back door in a production API. Isolation is achieved through
data: dedicated owners for mutations"). Refused: a reset endpoint; **not stated**: a refusal of a
user-creating route or of test-only seeding via other means.

## 6. UI-login / cookie-injection

No `FACT-`, ADR or invariant states that tests must log in through the UI, and none forbids setting
the cookie from a test. The only statement of the current practice is unkeyed: `e2e/README.md:123`
"`authedPage` (test) — a session for UI cases through a real UI login on `/auth/login`", and
`e2e/README.md:121` "`loginApi(request, user)` … cached per worker". `FACT-1042` draws the UI sign-in
path; `FACT-1043`/invariants 10, 17, 19 bound where the token may travel; none speaks of tests.

## Divergence (both sides, not resolved)

- **D1.** `FACT-3125`/`3126`/`3131` are stated inside `ADR-0007`, whose status is `superseded`
  (`docs/adr/README.md:45`), and `ADR-0007`'s register lists only `FACT-3121`, `3122`, `3127`, `3130`
  as retired (`ADR-0007` `## Retired facts`); `ADR-0027` `FACT-3593` says "The ten it still states
  remain true" and `FACT-3580` carries these three forward "unchanged".
- **D2.** `FACT-3126` names two sandboxes (`planner`, `organizer`); `FACT-1087`
  (`docs/data-model.md:189`) names three, adding `eraser` (`FACT-1085`). `FACT-3125` says
  `teacher`/`student` "carry the absolute assertions".
- **D3.** `FACT-1076` (`docs/data-model.md:181`) allows an exact count over a meeting the case made;
  `e2e/README.md:237` says "Absolute counter assertions in `@mutating` cases are forbidden"; the
  `FACT-3131` text is "never absolute ones" without that carve-out.
- **D4.** `FACT-3642` states "a feature with no delete" (`ADR-0029:109`); `FACT-2128`/`2129` and
  `FACT-2132` ("deleting a file frees exactly one slot", `docs/api-contract.md:303`) state delete
  exists; `BL-068` records the same (`docs/BACKLOG.md:29`).
- **D5.** `e2e/README.md:123` describes `authedPage` as "a real UI login"; `playwright.config.ts:31`
  `workers: isCI ? 1 : undefined` — the requirement states 7. Config is code, not a promise; recorded
  only as the current value.
- **D6.** `FACT-3584` (`ADR-0027:79`) refuses a test-only reset endpoint "the reset happens outside
  the running application"; `e2e/README.md:240-244` says older mutating cases "do not clean up" while
  newer cases clean up via `DELETE` (`FACT-1084` lists DELETE as a death for meetings/files).
  Whether these conflict is a design question; both sides recorded.

## Facts in the corpus and gaps

Keys read and quoted: ~75 distinct (`FACT-` count in tables above) and 11 ADRs (0003, 0007, 0008,
0010, 0012, 0018, 0022, 0025, 0027, 0029, 0031).

- **Not found:** a keyed fact on the Playwright worker count — searched `docs/*.md`, `docs/adr/*`
  (grep "worker"); only `playwright.config.ts:28-31` and `FX-052` mention workers.
- **Not found:** a keyed fact on the `warm-up.ts` global setup — searched `docs/*.md`, `docs/adr/*`
  (grep "warm"); only `BL-058`/`BL-067`/`FX-052` entries and the config comment.
- **Not found:** a keyed fact stating the JWT `expiresIn` default of `1h` on the API side — searched
  `docs/api-contract.md`, `docs/adr/ADR-0003`, `docs/data-model.md` (grep `JWT_EXPIRES_IN`, `1 h`);
  `FACT-3044` says the cookie matches `JWT_EXPIRES_IN` without a value, `FACT-1029` gives the cookie
  1 h; the value `'1h'` is in `apps/api/src/config/auth.config.ts:13` and
  `apps/web/src/lib/session-cookie.ts` comment only.
- **Not found:** any fact about Playwright `storageState` or a cross-process busy/free mechanism —
  searched `docs/*.md`, `docs/adr/*`, `e2e/README.md` (grep "storageState", "storage state").
- **Not found:** a statement that tests must log in through the UI or may not inject a cookie —
  searched `docs/*.md`, `docs/adr/*` (grep "UI login", "through the UI", "cookie inj").
- **Not found:** `docs/security.md` text about test users or test-set cookies — searched grep
  "test user", "ps_session", "cookie", "httpOnly".
- **Not found:** `FACT-3150`, `FACT-3002` full text — only titles seen in grep context; not read in
  full.
- **Not found:** per-meeting file counts verified against `meeting-files.seed.ts` and
  `e2e/fixtures/seed.ts` — not opened; only the corpus (`FACT-1072`…`1074`) is quoted.
- **Not found:** the `docs/security.md` keyed status — whether the file's sentences carry any key
  beyond the lines read (lines 25, 45-50, 92-93, 134, 138 only).
- **Not found:** an ADR on tests, fixtures, seeds or sessions beyond 0003, 0007, 0008, 0010, 0025,
  0027 — searched `docs/adr/README.md:39-73` titles only, not full text of every ADR.

## 7. Who cites the facts the change touches (re-run addition)

Added by `researcher` on the re-run after the research review, no sub-dispatch. Method:
`git grep --untracked -n -o -w -E "FACT-(3125|3126|3131|3580|1071|1073|1037|1085|1086|1087|3642)"`
over the repository, excluding `docs/plans` and `.agents`, at HEAD `548195c`. A second grep for range
forms (`FACT-NNNN…NNNN`, `FACT-NNNN-NN`) over the same scope returned no hit for these keys.
`docs/profiling/verdicts/*` hits are counted separately: they are verdict records, not living
statements. "Home" is the line that states the fact.

| Key         | Home                                                  | Living citing files outside the home (line)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `docs/facts-lock.json` (line)                           | Profiling verdicts (files)                                                                                                |
| ----------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `FACT-3125` | `docs/adr/ADR-0007-in-memory-store.md:22`             | 1: `docs/adr/ADR-0027-postgres-prisma-store.md:69` (the `FACT-3580` line)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `:1893` (its entry)                                     | 1 (`2026-10-21-e2e-test-architecture-feat-g1`)                                                                            |
| `FACT-3126` | `ADR-0007:25`                                         | 4: `ADR-0027:69`; `docs/CHANGELOG.md:38` (`FT-010` row); `e2e/regression/meeting-files/meeting-files.api.cases.md:16`; `e2e/regression/meeting-files/meeting-files.functional.cases.md:11`                                                                                                                                                                                                                                                                                                                                                                                                    | `:1898` (its entry)                                     | 2 (`2026-10-16-delete-meetings-and-files-feat-g4`, `…e2e-test-architecture-feat-g1`)                                      |
| `FACT-3131` | `ADR-0007:37`                                         | 3: `ADR-0027:69`; `docs/data-model.md:184` (inside `FACT-1076`: "`FACT-3131` still governs anything counted across an owner's whole collection"); `e2e/regression/home-dashboard/home-dashboard.api.cases.md:21`                                                                                                                                                                                                                                                                                                                                                                              | `:1927` (its entry)                                     | 2 (`…delete-meetings-and-files-feat-g3`, `…e2e-test-architecture-feat-g1`)                                                |
| `FACT-3580` | `ADR-0027:69`                                         | 1: `e2e/regression/home-dashboard/home-dashboard.api.cases.md:21` ("`FACT-3131`, kept by `FACT-3580`")                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `:3762` (its entry)                                     | 2 (`…delete-meetings-and-files-feat-g3`, `…e2e-test-architecture-feat-g1`)                                                |
| `FACT-1071` | `docs/data-model.md:162`                              | 2: `ADR-0007:26` (a source of `FACT-3126`); `docs/data-model.md:326` (`FACT-1036` "retired by `FACT-1071`")                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `:795` (its entry), `:612` (`FACT-1036` `supersededBy`) | 1 (`…e2e-test-architecture-feat-g1`)                                                                                      |
| `FACT-1073` | `docs/data-model.md:175`                              | 3: `e2e/regression/meeting-files/meeting-files.unit.cases.md:189` ("`FACT-3650`, `FACT-1073`"); `docs/adr/ADR-0022-fact-lifecycle.md:58` (a register row reading "`FACT-1042` \| the statement exactly as it last stood \| `retired by FACT-1073`"); `scripts/facts-parse.mjs:37` (doc comment "`retired by FACT-1073` or `withdrawn`")                                                                                                                                                                                                                                                       | `:805` (its entry)                                      | 1 (`…e2e-test-architecture-feat-g1`)                                                                                      |
| `FACT-1037` | `docs/data-model.md:163`                              | 1: `ADR-0007:27` (a source of `FACT-3126`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `:615` (its entry)                                      | 1 (`…e2e-test-architecture-feat-g1`)                                                                                      |
| `FACT-1085` | `docs/data-model.md:164`                              | 1: `docs/data-model.md:191` (a source of `FACT-1087`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `:865` (its entry)                                      | 2 (`…delete-meetings-and-files-feat-g4`, `…e2e-test-architecture-feat-g1`)                                                |
| `FACT-1086` | `docs/data-model.md:187`                              | 2: `docs/data-model.md:332` (`FACT-1038` "retired by `FACT-1086`"); `docs/CHANGELOG.md:38` (`FT-010` row)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `:870` (its entry), `:624` (`FACT-1038` `supersededBy`) | 1 (`…e2e-test-architecture-feat-g1`)                                                                                      |
| `FACT-1087` | `docs/data-model.md:189-191`                          | 3: `ADR-0007:27` (a source of `FACT-3126`); `docs/data-model.md:333` (`FACT-1040` "retired by `FACT-1087`"); `docs/CHANGELOG.md:38` (`FT-010` row, four occurrences on the line)                                                                                                                                                                                                                                                                                                                                                                                                              | `:875` (its entry), `:636` (`FACT-1040` `supersededBy`) | 2 (`…delete-meetings-and-files-feat-g4`, `…e2e-test-architecture-feat-g1`)                                                |
| `FACT-3642` | `docs/adr/ADR-0029-file-bytes-in-the-database.md:109` | 10: `apps/api/src/meeting-files/application/upload-meeting-file.ts:28`; `apps/api/src/meeting-files/domain/limits.ts:5`; `apps/api/src/meeting-files/domain/meeting-file.ts:46`; `apps/api/src/meeting-files/infrastructure/prisma-meeting-file.repository.ts:15`; `docs/api-contract.md:301`; `docs/BACKLOG.md:29` (`BL-068`, two occurrences); `docs/CHANGELOG.md:38` (`FT-010` row); `e2e/regression/meeting-files/meeting-files.api.cases.md:17,302`; `e2e/regression/meeting-files/meeting-files.functional.cases.md:13`; `e2e/regression/meeting-files/meeting-files.unit.cases.md:185` | `:4076` (its entry)                                     | 3 (`2026-10-14-clean-architecture-pilot-feat-g1`, `…delete-meetings-and-files-feat-g3`, `…e2e-test-architecture-feat-g1`) |

- `ADR-0027:69` is the one line that names `FACT-3125`, `FACT-3126` and `FACT-3131` together; it is
  `FACT-3580`'s home.
- `docs/CHANGELOG.md:38` (`FT-010`) cites `FACT-3126`, `FACT-1086`, `FACT-1087` and `FACT-3642` on one
  row (`grep -o` on the line: `FACT-1084` ×5, `FACT-1086` ×1, `FACT-1087` ×4, `FACT-2128` ×2,
  `FACT-2132` ×2, `FACT-3126` ×1, `FACT-3487` ×1, `FACT-3642` ×1).
- `docs/security.md` cites none of the eleven keys (the grep returns no line in it); its "no delete"
  sentence at `:92` is unkeyed (§3).
- The `FACT-3642` row matches the file list in "The ten-file cap" above and the "ten living
  citations" of `BL-068` (`docs/BACKLOG.md:29`).
