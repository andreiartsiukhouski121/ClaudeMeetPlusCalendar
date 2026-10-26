# Research: existing checks around e2e login, cleanup and users (tests sweep)

> **Re-run after the research review (2026-10-21, `researcher`, no sub-dispatch).** Every `path:line` in this file was re-opened against HEAD `548195c` and re-pointed where it was wrong, the `auth.fixture.ts`, `auth.api.ts`, `suite-integrity.api.spec.ts`, `security.api.spec.ts` (SEC-API-07) and `e2e/README.md` lines among them. The false "no fact records `planner`'s read-only role" is replaced in §4. Added: `auth.api.ts:17`, `auth.fixture.ts:32-34`, `e2e/README.md:246`, and the config-coverage line in §6.

Nothing was run. Counts come from `grep` over the specs and are only as precise as the pattern.
Paths are relative to the repository root. `e2e/` has no `journeys/` directory and no `*.integration.spec.ts`
(see Not found). Total spec files under `e2e/`: **16** (`find e2e -name "*.spec.ts"`): 11 `.api.spec.ts`
(including the meta-tests and `suite-integrity.api.spec.ts`), 5 `.functional.spec.ts`. Functional cases: 6+10+18+15+5 = **54**
(`ACC` 6, `AL` 10, `HD` 18, `MF` 15, `SEC` 5), which equals the 54 web tests in
`docs/plans/web-e2e-flake/research/probes.md` (r1, r7).

## 1. UI login: what logs in through the browser

| Mechanism                                                                                                                                                                 | Where                                                                                                                                                                                            | Seeded user                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Fixture `authedPage` -> `authStateFor` -> `uiLogin` (goto `/auth/login`, fill Email/Password, click "Sign in", `toHaveURL('/')`, save `storageState` per worker per user) | `e2e/fixtures/auth.fixture.ts:52-83` (`uiLogin`), `authStateFor` and its cache `:90-106`, `authedPage` `:111-121`                                                                                | `authUser` option, default `teacher` (`auth.fixture.ts:109`, `authUser: ['teacher', { option: true }]`) |
| `globalSetup` warm-up: real browser login after the route walk                                                                                                            | `e2e/fixtures/warm-up.ts:81,102-106`; wired at `playwright.config.ts:51`                                                                                                                         | `SEED_USERS` entry used in `warm-up.ts` (it also calls `loginApi(api, 'teacher')` at `:64`)             |
| Inline form fill, no helper                                                                                                                                               | `auth-login.functional.spec.ts:65,89,114,129,178,189,204,230`; `home-dashboard.functional.spec.ts:113-115`; `meeting-files.functional.spec.ts:356-358`; `accessibility.functional.spec.ts:78-80` | `TEACHER` / `SEED_USERS.teacher`, wrong passwords or `nobody@` in negatives                             |

Spec files importing `auth.fixture` (UI login via `authedPage`): `accessibility.functional.spec.ts:5`,
`home-dashboard.functional.spec.ts:11`, `meeting-files.functional.spec.ts:11`, `security.functional.spec.ts:6`
= **4 of 5** functional specs. The fifth, `auth-login.functional.spec.ts`, logs in inline (`test.use({ storageState: undefined })`, `:50`).
So **5 of 5** functional specs contain a UI login path; `grep` over `e2e/**/*.spec.ts` finds no other spec with `page.getByLabel('Email')`.

### Per-case table, functional (`authedPage` = fixture UI login)

| Spec           | Case IDs                                                                                                                    | Login                                                                                                  | User                                                               |
| -------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| accessibility  | ACC-FN-02, -04 (session pages loop), -05, -06                                                                               | `authedPage`                                                                                           | teacher (default)                                                  |
| accessibility  | ACC-FN-01 (public pages), ACC-FN-03 (negative sign-in at `:78-80`, wrong password)                                          | none / inline negative                                                                                 | teacher email, wrong password                                      |
| home-dashboard | HD-FN-02, -03, -04, -05, -06, -10, -14, -16, -17, -18, -19, -20                                                             | `authedPage`                                                                                           | teacher (default; `:345` and `:388` override for the blocks below) |
| home-dashboard | HD-FN-09, -21                                                                                                               | `authedPage` under `test.use({ authUser: 'student' })` (`:345`)                                        | student                                                            |
| home-dashboard | HD-FN-07, -08                                                                                                               | `authedPage` under `authUser: 'organizer'` (`:388`), `describe.configure({ mode: 'serial' })` (`:387`) | organizer                                                          |
| home-dashboard | HD-FN-01 (no login), **HD-FN-11** (inline positive UI sign-in at `:113-115`, inside `without a session` block `:88-89`)     | inline                                                                                                 | teacher                                                            |
| meeting-files  | MF-FN-01, -02, -03, -04, -07, -10, -11, -12, -13, -14                                                                       | `authedPage`                                                                                           | teacher (default)                                                  |
| meeting-files  | MF-FN-05, -06, -15                                                                                                          | `authedPage` under `authUser: 'organizer'` (`:180`), serial (`:179`)                                   | organizer                                                          |
| meeting-files  | **MF-FN-09** (`authedPage` for the setup, then forged cookie, then inline positive UI sign-in at `:356-358` with `TEACHER`) | fixture + inline                                                                                       | teacher                                                            |
| meeting-files  | MF-FN-08 (no login)                                                                                                         | none (`:291`)                                                                                          | none                                                               |
| security       | SEC-FN-01, -02, -03                                                                                                         | `authedPage`                                                                                           | teacher (default)                                                  |
| security       | SEC-FN-04, -05 (no session; SEC-FN-05 sets a forged cookie via `addCookies` at `:194`)                                      | none (`:157`)                                                                                          | none                                                               |

Per-spec `authedPage` counts per `docs/plans/web-e2e-flake/research/tests.md` section 1: home-dashboard 16 of 18, meeting-files 14 of 15, accessibility 4 of 6, security 3 of 5, auth-login 0.

## 2. `auth-login.functional.cases.md`: every case

Headings at `e2e/regression/auth-login/auth-login.functional.cases.md:40-114`; spec behaviour from `auth-login.functional.spec.ts`. All 10 use `page` with `storageState: undefined` (`:50`).

| ID       | Spec line | Polarity                                       | Performs a UI login submit                | Cookie assertion                                         |
| -------- | --------- | ---------------------------------------------- | ----------------------------------------- | -------------------------------------------------------- |
| AL-FN-01 | 52        | form renders                                   | no                                        | no                                                       |
| AL-FN-02 | 62        | **positive**, `@p0`, ends on `/`               | yes (`:64-65`, TEACHER)                   | yes, `toHaveLength(1)` (`:77`)                           |
| AL-FN-03 | 83        | negative, wrong password                       | yes (`:88-89`)                            | yes, `toEqual([])` (`:107`)                              |
| AL-FN-04 | 111       | negative, unknown email                        | yes (`:113-114`)                          | not matched by the cookie grep                           |
| AL-FN-05 | 136       | negative, empty form                           | no submit that reaches the server         | no                                                       |
| AL-FN-06 | 147       | sign-up link                                   | no (a direct request answers 200, `:163`) | no                                                       |
| AL-FN-08 | 166       | console clean, failed sign-in (`:178`)         | yes (wrong password)                      | no                                                       |
| AL-FN-10 | 185       | password masked                                | fills only (`:189`)                       | no                                                       |
| AL-FN-13 | 198       | **positive** login, cookie httpOnly, JWT shape | yes (`:203-204`)                          | yes, `toHaveLength(1)` (`:212`), 3 JWT segments (`:218`) |
| AL-FN-14 | 227       | negative, invalid email format                 | yes (`:229-230`)                          | no                                                       |

Positive UI logins in the suite today: AL-FN-02, AL-FN-13, HD-FN-11, MF-FN-09 (inline), the `uiLogin` fixture and `warm-up.ts` (infrastructure).

### Cookie assertions anywhere (`ps_session`)

| Case                 | File:line                                      | What it asserts                                                                           |
| -------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------- |
| AL-FN-02 / -03 / -13 | `auth-login.functional.spec.ts:77,107,212,218` | cookie present once / absent / httpOnly and 3-part JWT                                    |
| HD-FN-08             | `home-dashboard.functional.spec.ts:438-445`    | after sign-out no cookie has a non-empty value (organizer)                                |
| MF-FN-09             | `meeting-files.functional.spec.ts:322,343-347` | forged cookie added, then erased after `/auth/session-expired`                            |
| SEC-FN-01            | `security.functional.spec.ts:70-78`            | cookie httpOnly, `document.cookie` hides it                                               |
| SEC-FN-02            | `security.functional.spec.ts:54-58,89`         | `sessionCookieValue` reads the cookie produced by login; message "the login did not work" |
| SEC-FN-05            | `security.functional.spec.ts:193-194`          | clears cookies, adds a forged one                                                         |

## 3. API login: specs using `loginApi` / `authHeadersFor` (`e2e/fixtures/auth.api.ts`)

`loginApi` caches the token per worker in a module `Map` (`auth.api.ts:19`, rationale `:9-18`); 200 asserted inside the helper (`:39-43`, after the `POST` at `:37`). `auth.api.ts:17`: "Tokens do not expire mid-run: JWT_EXPIRES_IN is '1h' against a 60 s test timeout."

| File                          | Cases                                                       | Users                                                                               |
| ----------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `home-dashboard.api.spec.ts`  | HD-API-01, 03, 04, 05, 08, 09, 10                           | teacher (`:87,132,139,156,201,215,234`)                                             |
|                               | HD-API-06                                                   | teacher + student (`:171-172`)                                                      |
|                               | HD-API-07                                                   | student (`:188`)                                                                    |
|                               | HD-API-13, 14, 15, 16, 17, 20, 21, 22                       | planner (`:277,306,326,355,380,409,433,465`); HD-API-17 also reads teacher (`:393`) |
|                               | HD-API-23                                                   | eraser (`:514`)                                                                     |
| `meetings-detail.api.spec.ts` | MD-API-01, 02, 03                                           | teacher; MD-API-03 also student (`:142-143`)                                        |
|                               | MD-API-05, 06, 07, 08, 09, 10, 11                           | planner (`:200,227,264,339,370,403,440`); MD-API-10 also student (`:404`)           |
| `meeting-files.api.spec.ts`   | MF-API-02, 03, 04, 05, 06                                   | teacher; MF-API-03 also student (`:244`)                                            |
|                               | MF-API-16                                                   | student + teacher (`:392-393`)                                                      |
|                               | MF-API-01, 07, 08, 09-15, 17, 18, 19, 20-25                 | planner (`:438`…`:1195`); MF-API-22 also student (`:1065`)                          |
| `security.api.spec.ts`        | SEC-API-02, 04, 06                                          | teacher (`:126,168,253`)                                                            |
|                               | SEC-API-07                                                  | planner (`:287`)                                                                    |
|                               | SEC-API-09                                                  | teacher + student (`:367-368`)                                                      |
|                               | SEC-API-11                                                  | planner (`:445`) + teacher (`:470`)                                                 |
|                               | SEC-API-12                                                  | planner + student (`:573-576`)                                                      |
| `smoke/seed.api.spec.ts`      | SM-API-02                                                   | every key in `SEED_USER_KEYS` (`:87-88`)                                            |
|                               | SM-API-03                                                   | teacher (`:107`), student (`:149`), planner (`:213`)                                |
| `auth-login.api.spec.ts`      | AL-API-13                                                   | teacher (`:198`); the other AL-API cases post `/auth/login` directly                |
| functional specs              | HD-FN-03, -05, -20 (baseline via `fetchMeetingsPage`)       | teacher (`home-dashboard.functional.spec.ts:65-70`)                                 |
|                               | MF-FN-05, -06, -15 (id lookup via `createOrganizerMeeting`) | organizer (`meeting-files.functional.spec.ts:68`, login at `:84`)                   |
| `fixtures/warm-up.ts`         | globalSetup                                                 | teacher (`:64`)                                                                     |

## 4. Data creation and cleanup

`withCleanup` (`e2e/fixtures/cleanup.api.ts:62`) is used in: `home-dashboard.api.spec.ts:516`, `meetings-detail.api.spec.ts:372,406,442`,
`meeting-files.api.spec.ts:962,1020,1067,1117,1151,1197`, `security.api.spec.ts:588`. `e2e/README.md:239-241` states the cases that predate the cleanup rule and do not clean up: "`MD-API-05`…`MD-API-08`, `HD-API-13` onward, `MF-API-01` and `MF-API-07`…`MF-API-19`".

| Case                                                      | Creates                                                                         | Cleans up                                                                                           | Owner mutated     |
| --------------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------- |
| HD-API-13, 17, 20, 21, 22                                 | meetings via `POST /meetings`                                                   | **no** (no `withCleanup` or DELETE in `:267-505`)                                                   | planner           |
| HD-API-14, 15, 16                                         | none (401/400 paths)                                                            | n/a                                                                                                 | planner (no data) |
| HD-API-23                                                 | 2 meetings                                                                      | **yes**, `withCleanup` + `track` (`:516-523`), plus explicit DELETEs (`:545,557`)                   | eraser            |
| MD-API-05, 06, 08                                         | meetings                                                                        | **no**                                                                                              | planner           |
| MD-API-07                                                 | none created (400s)                                                             | n/a                                                                                                 | planner           |
| MD-API-09, 10, 11                                         | meeting via `createMeeting` (`:58`)                                             | **yes**, `track` (`:375,409,448`)                                                                   | planner           |
| MF-API-01, 07, 08, 09, 10, 11, 12, 13, 14, 15, 17, 18, 19 | meeting via local `createMeeting` (`:86`) plus files                            | **no** (`createMeeting`, not `createTrackedMeeting` `:103`)                                         | planner           |
| MF-API-20, 21, 22, 23, 24, 25                             | meetings and files                                                              | **yes** (`withCleanup` at `:962,1020,1067,1117,1151,1197`)                                          | planner           |
| MF-API-02, 03, 04, 05, 06, 16                             | none or uploads refused (against seeded teacher meetings)                       | n/a                                                                                                 | none              |
| SEC-API-07                                                | 1 meeting via `createOwnMeeting` (`:658`), called at `security.api.spec.ts:314` | **no**                                                                                              | planner           |
| SEC-API-12                                                | meeting and file                                                                | **yes** (`withCleanup` `:588`)                                                                      | planner           |
| HD-FN-07                                                  | meeting through the dashboard form (UI)                                         | **no**                                                                                              | organizer         |
| MF-FN-05, 06, 15                                          | meeting through the dashboard form (UI), upload in 05                           | **no** (no DELETE in any functional spec; `grep` of `delete(` finds none in `*.functional.spec.ts`) | organizer         |

Seeded meetings that fixtures depend on and that nothing mutates: `mtg-planner-2` / `HEADER_SAFETY_MEETING` (`seed.ts:45-46,152-171`) used by SEC-API-11 and SM-API-03 (`seed.api.spec.ts:213-232`); this is the one planner seed property the API specs read. `e2e/README.md:246`: "No seeded meeting or file is ever a delete target." Two keyed facts record this read-only role (re-run correction; the first pass said none did): `FACT-1071` (`docs/data-model.md:162`), `planner` is the "mutation sandbox for `*.api.spec.ts`, plus one never-mutated fixture meeting"; `FACT-1073` (`docs/data-model.md:175`), `mtg-planner-2` "Archive intake session" is "`SEC-API-11`'s fixture: hostile filenames written straight through Prisma, never uploaded". `e2e/README.md:231-233` says the same in prose.

## 5. Seeded users and exact-count assertions

Users: `SEED_USERS` has 5 keys (`seed.ts:11,32`): teacher (5 meetings), student (0), planner (2), organizer (1), eraser (0). `teacher` and `student` "must NEVER be mutated" (`seed.ts:30`; `e2e/README.md:224`). No "pool of browser users" exists in `seed.ts` (see Not found).

| Assertion                                                                         | Case                  | File:line                                              | Depends on                                     |
| --------------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------ | ---------------------------------------------- |
| `total` = `TEACHER_MEETINGS.total` (5)                                            | HD-API-05             | `home-dashboard.api.spec.ts:163-164`                   | teacher seed                                   |
| `items` length = `latestLimit` (3)                                                | HD-API-03, 05, 10     | `:135,164,242`                                         | teacher seed                                   |
| teacher total 5 and student `meetingsCount` 0                                     | HD-API-06             | `:183-184`                                             | teacher + student seed                         |
| student `total` 0                                                                 | HD-API-07             | `:197`                                                 | student seed                                   |
| `limit=100` yields `TEACHER_MEETINGS.total` items                                 | HD-API-10             | `:247-248`                                             | teacher seed                                   |
| teacher total unchanged after planner create                                      | HD-API-17             | `:401`                                                 | teacher seed                                   |
| baseline-relative totals (+2, +1, 0), `items` length 1                            | HD-API-23             | `:539-564`                                             | eraser owner baseline (relative, not absolute) |
| teacher total = 5                                                                 | SM-API-03             | `seed.api.spec.ts:121-122`                             | teacher seed                                   |
| student total = `meetingsCount`                                                   | SM-API-03             | `seed.api.spec.ts:161`                                 | student seed                                   |
| 5 hostile filenames on `mtg-planner-2`                                            | SM-API-03, SEC-API-11 | `seed.api.spec.ts:213-232`; `security.api.spec.ts:462` | planner seed                                   |
| 3 JWT segments for every seeded key                                               | SM-API-02             | `seed.api.spec.ts:95`                                  | all five users                                 |
| exactly 1 file in listing after one upload; 10 files; refused upload leaves 1     | MF-API-07, 13, 15, 24 | `meeting-files.api.spec.ts:478,760,859,1185`           | the case's own meeting (planner owner)         |
| `Meetings total: N` equals API total                                              | HD-FN-03              | `home-dashboard.functional.spec.ts:155-159`            | teacher seed                                   |
| `listitem` count = 3                                                              | HD-FN-04, -14         | `:169,224-225`                                         | teacher seed                                   |
| count = `reference.items.length`                                                  | HD-FN-05              | `:181`                                                 | teacher seed                                   |
| `"N of M shown"`                                                                  | HD-FN-20              | `:336`                                                 | teacher seed                                   |
| `Meetings total: 0`, `listitem` 0                                                 | HD-FN-09, -21         | `:353-354,372`                                         | student seed                                   |
| relative `before + 1`; `<= latestLimit` items                                     | HD-FN-07              | `:405,411,416`                                         | organizer owner (relative)                     |
| two attachments, `toHaveCount(2)`                                                 | MF-FN-03              | `meeting-files.functional.spec.ts:144`                 | teacher "Geometry workshop"                    |
| empty state, no lists                                                             | MF-FN-04              | `:170-171`                                             | teacher "Pre-exam consultation"                |
| `one h1`, `one main` on 4 pages (`/`, `/meetings/mtg-teacher-3`, login, register) | ACC-FN-04             | `accessibility.functional.spec.ts:131-141`             | teacher seed (`GEOMETRY_WORKSHOP_MEETING_ID`)  |
| greeting text contains the user email                                             | HD-FN-02              | `home-dashboard.functional.spec.ts:140`                | teacher email                                  |
| organizer email hidden after sign-out                                             | HD-FN-08              | `:452`                                                 | organizer                                      |

## 6. Meta-tests: what a fixture move, a new directory or a new file trips

`e2e/suite-integrity.api.spec.ts` (608 lines); header `:5-6` says "Ten rules, one test each". `walk(root, 'e2e')` is recursive and skips only `node_modules`, `.git`, `.next`, `blob-report`, `coverage`, `dist`, `playwright-report`, `test-results` (`walk` at `:110-128`, `SKIP_DIRS` at `:68-77`).

| Rule   | Line       | One-line essence                                                                                                                                                                                                                            |
| ------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1      | `:266-281` | every `*.spec.ts` under `e2e/` ends in `.api.spec.ts`, `.functional.spec.ts` or `.integration.spec.ts` (else it joins no project), except `SELF_EXEMPT = ['suite-integrity.api.spec.ts']` (`:26`)                                           |
| 2      | `:283-292` | every spec has a paired `<name>.cases.md` (same path, `.spec.ts` replaced by `.cases.md`, `pairedCaseDoc` `:157-159`)                                                                                                                       |
| 3      | `:294-303` | every `.cases.md` has a paired spec, except `*.unit.cases.md`                                                                                                                                                                               |
| 4      | `:305-321` | every `apps/**/*.spec.ts` path written in a `*.unit.cases.md` exists on disk                                                                                                                                                                |
| 5      | `:323-362` | every case ID in a `.cases.md` appears in the paired spec, unless its subsection carries `- **Not automated:**` (`NOT_AUTOMATED_MARKER` `:63`)                                                                                              |
| 6      | `:364-382` | no duplicate ID across two subsections or two summary rows of one doc                                                                                                                                                                       |
| 7      | `:384-405` | a unit case ID appears in the spec it is listed under                                                                                                                                                                                       |
| 8      | `:407-444` | every `apps/*/src/**/*.spec.ts` is mentioned in a `*.unit.cases.md`, except `apps/api/src/app.controller.spec.ts` (`UNIT_SPEC_EXEMPT` `:32`)                                                                                                |
| 9      | `:446-475` | no `process.env.E2E_` and no quoted `http(s)://127.0.0.1` literal in any `.ts` under `e2e/` (includes `fixtures/*.ts`)                                                                                                                      |
| 10     | `:477-500` | a level tag (`'@api'`, `'@e2e'`, `'@integration'`) is present only on a file whose suffix matches                                                                                                                                           |
| guards | `:507-538` | walk self-check (`:507`) finds the suite and the app units; prefix guard at `:521` (`unregisteredPrefixes` `:219`); `KNOWN_CASE_PREFIXES = AL, HD, SM, SEC, LG, PR, AR, MD, ACC, MF` (`:43`); an ID with another prefix in a case doc fails |

Case ID shape: `<PREFIX>-(API|FN|UT|INT)-\d{2,3}` (`CASE_ID_SOURCE` at `:51`, comment `:45-50`). Rule 5 requires each ID in the doc to appear verbatim in the spec file.

| Meta-test                                   | What it reads about e2e paths and cases                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `e2e/architecture/architecture.api.spec.ts` | `SECURITY_SPEC = 'e2e/security/security.api.spec.ts'` (`:42`); the `PROTECTED_ROUTES` entries are parsed from that file by regex (`PROTECTED_ROUTE_ENTRY` `:88-89`, read at `:470`); AR-API-06 (`:1502`) compares guarded routes with the list; `knownCaseIds` (`:548-557`) scans every `*.cases.md` under `e2e/` so a cited case ID in `docs/` must still exist; also scans `docs/profiling` (`PROFILING_DIR` `:47`, walked at `:587`) |
| `e2e/process/process.api.spec.ts`           | PR-API-07 (`:369-376`) runs `node scripts/scenarios-index.mjs check`; `e2e/scenarios-index.md` must equal the regenerated index (one row per `Summary` row of each `*.cases.md`, grouped by suffix level and directory under `e2e/`, `scripts/scenarios-index.mjs:1-40`)                                                                                                                                                                |
| `e2e/ledger/ledger.api.spec.ts`             | `REFERENCE_ROOTS = ['docs', '.claude/skills', 'e2e']` (`:40`): ledger IDs cited under `e2e/` must resolve; walks `docs/plans` (`:359`)                                                                                                                                                                                                                                                                                                  |
| `playwright.config.ts`                      | `testMatch` per project is by suffix (`:63-73`); a new directory needs no config change, a new suffix does                                                                                                                                                                                                                                                                                                                              |

Config coverage of a new directory under `e2e/` (re-run addition): the root `tsconfig.json:12` has `"include": ["playwright.config.ts", "e2e/**/*.ts"]`, and `eslint.config.mjs:22` applies the Playwright rule set to `files: ['e2e/**/*.ts']`; both globs match any subdirectory of `e2e/`.

## 7. `e2e/README.md` baseline (verbatim figures)

"Run economics", `e2e/README.md:310-364`:

- Row measured **2026-10-16**: `173` e2e tests, `16` e2e files, `54` units, `pnpm verify` end to end `91 s / 97 s / 99 s`.
- "Units are 37 in `apps/api` and 17 in `apps/web`, plus one supertest module-boot check."
- "Each of the three runs passed 173 e2e tests; the e2e step took 53.8 s, 1.0 min and 57.8 s. The serial `globalSetup` warm-up (`FX-052`, `e2e/fixtures/warm-up.ts`) costs about 6.2 s per run on an unloaded, freshly built `.next`."
- Timing table: `pnpm e2e` "all 167" `47.7–51.4 s`; `--project=api --grep @auth-login` "11" `13.1 s`; `pnpm verify` `1 min 22 s – 1 min 47 s`; cold `.next` `~137 s`. (The "167" in the table and the "173" in the current row are both in the file.)
- "every additional `pnpm e2e …` costs about 12 s regardless of how many tests are filtered", because it restarts both servers.
- Worker count is not stated in README. `playwright.config.ts:28-31`: `fullyParallel: true`, `retries: isCI ? 2 : 0`, `workers: isCI ? 1 : undefined`; `timeout: 60_000`, `expect.timeout: 10_000` (`:33-34`). Local default was 14 workers on the research machine (`web-e2e-flake/research/probes.md:11`).
- Statements on fixtures/login: `README.md:117-124` fixture table (`auth.fixture.ts`: "a session for UI cases through a real UI login on `/auth/login`"); `:224-246` rules (mutating cases run as `planner` / `organizer` "because `fullyParallel: true` and the two projects share one database"; "The owner is the sandbox; the meeting is per case"; "Absolute counter assertions in `@mutating` cases are forbidden"; "Created meetings are dated 2030"; cleanup rule and its list of older exceptions).
- Per-project test counts are not in README; the web count 54 is in `probes.md` (r1, r7), api + meta-tests = 173 - 54 = 119 by subtraction from README's 173.
- `auth.fixture.ts:8-12` documents why UI login was chosen ("the session cookie is httpOnly and set by a Server Action, so the browser never sees the JWT from Nest").

## 8. `FX-052` reproduction (`docs/plans/web-e2e-flake/`)

- Procedure (`research/probes.md:13-15`): warm `.next`; start seven CPU busy-loops `for i in $(seq 1 7); do node -e "const e=Date.now()+280000;while(Date.now()<e){}" & done`; run `pnpm e2e --project=web --reporter=list`; kill the loops. Machine: 14 logical CPUs, 14 default workers (`:11`).
- What counted as red (`probes.md:19-30`): runs r3, r5, r6, r8 with failures (5, 4, 7, 4 failed). Failing cases: AL-FN-02, -03, -04, -08; ACC-FN-02, -04, -05, -06; MF-FN-07, -09, -12.
- Stability (`probes.md:31-33`): 7 loops with default workers red 3 of 5; 14 loops red 1 of 1; 7 loops with `--workers=2` green 2 of 2; unloaded green 3 of 3; cold vs warm `.next` did not separate outcomes.
- Reproduced "red on current code (3 of 5 recorded); after the fix, 5 consecutive runs green; control: the warm-up disabled, same load, red again within 5 runs", "no server left on 3100 before each run so `next dev` starts fresh" (`design.md:22`). "There is no deterministic spec that is red on current code; the load procedure is the reproduction" (`design.md:22`; `web-e2e-flake.plan.md:63`).
- The shipped fix is `globalSetup: './e2e/fixtures/warm-up.ts'` (`playwright.config.ts:51`); ledger row `docs/CHANGELOG.md:125` (FX-052).
- Earlier sweep of the same area: `docs/plans/web-e2e-flake/research/tests.md` (73 lines) lists login routes in functional specs.

## 9. Unit specs touching `session-cookie.ts`

| ID       | Spec                                  | Asserts                                                               |
| -------- | ------------------------------------- | --------------------------------------------------------------------- |
| AL-UT-20 | `apps/web/src/lib/session.spec.ts:19` | dev cookie options: httpOnly, path `/`, sameSite lax, `secure: false` |
| AL-UT-21 | `apps/web/src/lib/session.spec.ts:30` | production `secure: true`, other options unchanged                    |
| AL-UT-22 | `apps/web/src/lib/session.spec.ts:38` | `SESSION_MAX_AGE_SECONDS` is one hour and matches `JWT_EXPIRES_IN`    |

Listed in `e2e/regression/auth-login/auth-login.unit.cases.md:71-73,83,89-95`. Other importers of `session-cookie` in `apps/web/src`: `lib/actions/auth.ts`, `lib/session.ts`, `proxy.ts` (no unit specs of their own; `session.ts` is `server-only`, invariant 14).

## 10. Where coverage stops

- `- **Not automated:**` markers: none in any `*.cases.md` (`grep -rn "Not automated" --include=*.cases.md e2e` returned nothing).
- No `*.functional.cases.md` exists for `meetings-detail` (only `meetings-detail.api.*`); `e2e/regression/meetings-detail/` has no functional spec.
- No spec covers the `/auth/register` page beyond the accessibility scan (`ACC-FN-01`, `AUDITED_PAGES` `accessibility.functional.spec.ts:25-30`) and the sign-up link (AL-FN-06).
- The cleanup rule's exceptions are listed in section 4 and in `e2e/README.md:239-241`.

## Not found

- **Not found:** a `journeys/` directory or any `e2e/journeys/<area>/` case doc — searched `e2e/` by `find`; CLAUDE.md names the convention only.
- **Not found:** any `*.integration.spec.ts` or `*.integration.cases.md` — searched `e2e/` by `find`; the project exists in `playwright.config.ts:73`.
- **Not found:** a pool of browser users, `storageState` files shipped in the repo, or a `setup` project/`globalSetup` that stores state for users — searched `e2e/fixtures/*.ts`, `playwright.config.ts`; state files are written per worker into `outputDir` by `auth.fixture.ts:36-41` (the path) and `:77` (the write). `auth.fixture.ts:32-34`: the state file "lives in the project's `outputDir`: it is wiped between runs anyway".
- **Not found:** an `e2e/api/` directory — searched `e2e/` by `find`.
- **Not found:** a statement of worker count in `e2e/README.md` — searched "worker" in the file; it appears only at `:121` ("cached per worker") and `:123` (`authStateFor` "(worker)"); the `fullyParallel` rationale is at `:224-226`.
- **Not found:** per-project (api / web / integration) test counts in `e2e/README.md` — searched "Run economics" section; only totals 173 and 167.
- **Not found:** a cleanup of data created through the UI in any functional spec — searched `delete(` and `withCleanup` in `*.functional.spec.ts`.
- **Not found:** a case that exercises `loginApi` for `organizer` or `eraser` other than HD-API-23 (eraser), `createOrganizerMeeting` (organizer) and SM-API-02 (all keys) — searched `grep -rn "organizer\|eraser" e2e`.
- **Not found:** a `Not automated` case — searched all `*.cases.md` under `e2e/`.
- **Not found:** a unit spec named `session-cookie.spec.ts` — searched `apps/web/src/lib/`; the units are in `session.spec.ts` (`:10-12`).
