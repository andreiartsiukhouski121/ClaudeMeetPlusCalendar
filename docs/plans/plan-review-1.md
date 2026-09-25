# Development plan review (iteration 1)

> **ARCHIVE.** A record of the first review pass, kept for the reasoning behind the decisions. Not a
> source of truth: the live convention is in [`e2e/README.md`](../../e2e/README.md), the invariants
> in [`CLAUDE.md`](../../CLAUDE.md). Translated into English in `CH-014` and condensed; every
> blocker, finding and verified fact is preserved.

Documents under review: `docs/plans/README.md`, `feature-plan-implementation.md` (**IP**),
`feature-plan-testing.md` (**TP**).

Every claim below was checked against this repository's installed dependencies (`next@16.3.4`,
`@nestjs/*@12.0.1`, `@playwright/test@1.62.1`, `vitest@4.1.11`, Node `v24.14.0`) — see §6. Isolated
Nest + `class-validator` probes lived in a scratchpad; no repository file was changed.

---

## 1. Verdict

**The plan can be executed once the blockers are removed.**

The architectural part is sound: the BFF layout, the `session-cookie.ts` / `session.ts` split,
`APP_PIPE` instead of `useGlobalPipes`, mutation isolation by seed user, and the ban on `required` on
the inputs are all proven decisions, and most of the "verified facts" in IP §0 held up literally.

But it cannot be executed as is, for three reasons. First: two meeting contract cases are physically
incompatible with the DTO in IP (`@Max(50)` against `limit=100`; a missing `@IsOptional()` against
`GET /meetings` without a parameter) — guaranteed red tests on code that follows the plan. Second:
three functional cases of feature 1 (`AL-FN-02`, `AL-FN-07`, `AL-FN-11`) need the dashboard and
`proxy.ts` from feature 2, so the `T1.9` DoD ("14 passed") is unreachable, which directly
contradicts IP risk 22 ("in feature 1 the home page stays untouched"). Third: feature 1's acceptance
pipeline is red by construction because of `SM-API-02`, and the convention meta-test fails on
itself.

Separately: the suite volume (69 e2e + 37 UT for two small features) is inflated by roughly 40% —
see §5.

---

## 2. Blockers

### B1 — `ListMeetingsQueryDto` without `@IsOptional()`: `GET /meetings` without `limit` returns 400

IP §2.2 item 4 specifies `limit?` with `@Type(() => Number) @IsInt() @Min(1) @Max(50)`.
`@IsOptional()` is not named. Under `whitelist: true, transform: true` a missing field still runs
through `@IsInt/@Min/@Max` and gives 400. Every case calling `GET /meetings` without a parameter
breaks: `HD-API-01`, `06`, `11`, `13` (step 2), `14`, `15`, `16`.

**Evidence.** A probe on real `@nestjs/common@12.0.1` + `class-validator@0.15.1` with the DTO copied
verbatim:

```
/meetings          -> 400 :: {"message":["limit must not be greater than 50","limit must not be less than 1","limit must be an integer number"],...}
/meetings?limit=3  -> 200 :: {"q":{"limit":3},"t":"number"}
```

**Fix.** Rewrite IP §2.2 item 4: `limit?: number` with
`@IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)`; the service supplies `3` when the
parameter is absent. `@IsOptional()` is mandatory — without it `GET /meetings` without `limit`
returns 400 (verified by probe).

### B2 — `@Max(50)` against cases using `limit=100`

TP uses `limit=100` in three places: `HD-API-10` (expecting "200; `items` length = `total` = 5"),
`HD-API-17`, and `SM-API-02` (a P0 smoke the whole suite's meaning depends on). With `@Max(50)` all
three get 400. Verified: `/meetings?limit=100 -> 400 :: {"message":["limit must not be greater than
50"],...}`.

**Fix.** Pick one explicitly: (a) raise the bound to `@Max(100)` in IP §2.2 item 4 and add the
`limit > 100 → 400` line to §2.1; or (b) replace `limit=100` with `limit=50` in all three cases and
reword the `HD-API-10` title. Option (a) is recommended: with (b), `SM-API-02` depends on a magic
number that would have to change as the seed grows.

### B3 — `AL-FN-02`, `AL-FN-07`, `AL-FN-11` need feature 2 artifacts; the `T1.9` DoD is unreachable

TP §3.2 expects those three cases to see a greeting containing `teacher@purpleschool.test` after
signing in, and `AL-FN-07` additionally relies on the `/auth/login` → `/` redirect. The greeting is
rendered by `app/page.tsx`, which is rewritten in `T2.8`; `proxy.ts` is created in `T2.7`. Both tasks
belong to feature 2, after feature 1 is merged. Meanwhile IP risk 22 demands "in feature 1 the home
page stays untouched". So the `T1.9` DoD ("`14 passed`") is unsatisfiable, and so are
`T1.10`/`T1.12`/`T1.13`. Worse: by TP §6.5, `T1.11` must fix the **code** rather than the cases,
which would push the agent to implement the dashboard inside feature 1 and destroy the boundary
between features.

**Evidence.** `apps/web/src/app/page.tsx` is still the create-next-app default; the IP §5 dependency
graph puts `T2.7` and `T2.8` after `T1.13`.

**Fix.** For `AL-FN-02` and `AL-FN-11`, change the expected result to "the URL becomes `/`; a session
cookie appears in the context; the login form is no longer displayed. The home page contents are not
checked in this case — they belong to feature 2 (`HD-FN-02`)". Move `AL-FN-07` into feature 2 as
`HD-FN-16` (tag `@home-dashboard`) and make it the DoD of `T2.7`. Recount the TP §3.2/§3.4 totals
and the §7 matrix: feature 1 gets 13 functional cases, feature 2 gets 16. The `T1.9` DoD becomes
"`13 passed`".

### B4 — the `suite-integrity.api.spec.ts` meta-test violates its own rule 2

TP §1.6 rule 1 covers "every `e2e/**/*.spec.ts`", and rule 2 requires "every spec has a paired
`.cases.md` with the same base name in the same directory". `e2e/suite-integrity.api.spec.ts` sits in
`e2e/`, and there is no paired `suite-integrity.api.cases.md` — neither in the TP §1.1 tree nor in
the `T0.6` file list. The very first run of pipeline step 1 goes red on its own file — and that step
blocks every later one.

**Fix.** Add to TP §1.6: "Rules 1–3 do not apply to `e2e/suite-integrity.api.spec.ts` itself — it
does not describe a feature, it executes the convention. The exception is an explicit
`SELF_EXEMPT = ['suite-integrity.api.spec.ts']` list in the meta-test's code, not a regexp." The
alternative is to create `e2e/suite-integrity.api.cases.md` with cases `SI-01…SI-06`. Pick one and
record it in `T0.6`.

### B5 — `SM-API-02` keeps feature 1's pipeline red; "permissible" must become "mandatory"

IP `T0.6` says "`SM-API-02` is written immediately but only goes green after T1.3/T2.2 — until then
it correctly fails… It is permissible to introduce it in two steps", and the `T0.7` DoD explicitly
allows a red test in a commit. But TP §6.2 says "when step N fails, steps N+1 and beyond are not
run", and §6.3 says "any red test on steps 1–8 is a blocker". `SM-API-02` is step 5, so throughout
feature 1 steps 6–8 formally cannot be run and the DoDs of `T1.10`/`T1.12`/`T1.13` ("the §6 pipeline
is green") are unreachable. The word "permissible" leaves the implementer a choice that breaks
acceptance.

**Fix.** In IP `T0.6`, replace "permissible" with "**mandatory**: introduced in two steps — in
`T1.4`, only the login check for all four seeded users; the meetings check (`total` = 5 / 0) is
added in `T2.4` in the same commit as the meetings controller. Before `T1.3` the file
`e2e/smoke/seed.api.spec.ts` is not created at all." In TP §3.5, split it into `SM-API-02` (logins,
introduced in feature 1) and `SM-API-03` (meetings, feature 2), and recount the suite totals. Remove
the red-test caveat from the `T0.7` DoD — there must be no red tests in a commit.

### B6 — contradiction about deleting `e2e/web/home.spec.ts`

IP `T0.6` deletes the `e2e/api/` and `e2e/web/` directories entirely, `home.spec.ts` included,
before feature 1. IP risk 22 says the opposite: "the old spec is deleted in T2.9, together with
replacing the page". TP §1.5 agrees with risk 22. IP §1.1 marks the file "[del]" with no task. Three
statements across two documents contradict each other, and the `T0.6` implementer does not know what
to do.

**Fix.** Choose "delete in `T0.6`" — simpler and safer: after the switch to suffix-based `testMatch`,
`home.spec.ts` joins no project and silently never runs (verified by probe), so its "green" status is
purely formal. Keep `T0.6` as is; rewrite the last sentence of risk 22 and TP §1.5 accordingly, and
drop the deletion mention from `T2.9`.

### B7 — `AL-UT-21…23` describe a session API the architecture does not have; the `T1.4` DoD is unsatisfiable

TP §4.1 specifies `AL-UT-21` ("parsing a valid cookie value returns a session with a token and
email"), `AL-UT-22` ("parsing an empty/broken/truncated cookie returns an empty result") and
`AL-UT-23` ("serialize → parse returns the original object"). In IP §3.5 the cookie is a **raw JWT
with no wrapper**, and `session-cookie.ts` exports only `SESSION_COOKIE_NAME`,
`SESSION_MAX_AGE_SECONDS` and `buildSessionCookieOptions`. Neither `parseSession` nor
`serializeSession` exists in the plan or is needed by the architecture — three of the four cases are
untestable.

The other side of the same divergence: `T1.4` creates `apps/web/src/lib/api-client.spec.ts`, yet TP
§4.1 has no ID for `resolveApiUrl`/`apiFetch`, although IP §1.1 requires "units for `resolveApiUrl`
(no network)". The `T1.4` DoD ("case composition — `AL-UT-01…23`") cannot be met either way.

**Fix.** Rewrite the `session.spec.ts` block in TP §4.1: `AL-UT-20` —
`buildSessionCookieOptions('development')` gives `httpOnly: true`, `path: '/'`, `sameSite: 'lax'`,
`secure: false`; `AL-UT-21` — `'production'` gives `secure: true`; `AL-UT-22` —
`SESSION_MAX_AGE_SECONDS` matches `JWT_EXPIRES_IN` (3600). Add an **`api-client.spec.ts`** block
(`AL-UT-23…26`): `resolveApiUrl` joins a base with and without a trailing slash; honours `API_URL`
from the environment; falls back to `http://127.0.0.1:3001`; and `ApiError.message` normalizes from
both body shapes (string / array of strings). Delete the session-parsing cases entirely.

### B8 — unit checks cannot be run per feature in isolation, and UT case IDs are not tied to code

The user requires "checks run per feature in isolation" and "a mandatory unit run". For e2e the
isolation exists (`--grep @auth-login`); for units it does not: pipeline step 4 is `pnpm test`, that
is **all** units of both features at once, and there are no `test:<feature>` scripts in either
document. On top of that, "a test title must start with its ID" applies only to Playwright specs,
and rule 4 of §1.6 only checks that the paths mentioned in `*.unit.cases.md` exist. As a result the
`AL-UT-*`/`HD-UT-*` IDs live only in markdown: they can neither be filtered by feature nor checked
for being automated at all.

**Fix** (three parts, all required):

1. TP §2: "A unit test title must also start with its case ID (`it('AL-UT-09 — …')`)."
2. TP §1.6: add rule 7 — "for every `*.unit.cases.md`, each case ID appears in the text of the spec
   it is listed under" — and rule 8 — "every `apps/**/src/**/*.spec.ts` is mentioned in at least one
   `*.unit.cases.md`" (today the rules are one-way: a new unit spec can miss the documentation and
   nobody notices).
3. IP `T0.3` and TP §1.9: add `test:auth-login` and `test:home-dashboard` scripts filtering by `-t`,
   make pipeline step 4 `pnpm test:<feature>`, and keep the full `pnpm test` inside step 8.

### B9 — `AL-API-10` signs in as a user that does not exist

TP §3.1 posts `{ email: 'READER@Purpleschool.TEST' }` expecting 200. The user `reader@…` was renamed
to `teacher@…` when the plans were reconciled (IP §9); the case kept the old name. In practice a 401
arrives — a red test on correct code. It is also the only case covering email case-insensitivity, so
that requirement would go unchecked.

**Fix.** `READER@Purpleschool.TEST` → `TEACHER@Purpleschool.TEST`, and add to the expectation:
"`GET /auth/me` returns `email` strictly as `teacher@purpleschool.test` (lower case)".

---

## 3. Substantive findings

- **M1 — `message` on a 400 is not always an array, and the 404 shape is missing from §2.1.** For a
  broken JSON body the response is built by `body-parser` before `ValidationPipe`. Verified:
  `400 {"message":"Unexpected end of JSON input",…}` — a string; and
  `404 {"message":"Cannot GET /auth/login",…}`.
- **M2 — `AL-API-19` and `HD-API-12` are phrased with an "or" while the behaviour is
  deterministic.** Both outcomes would go green, including a regression from one into the other.
- **M3 — `HD-FN-03` and `HD-FN-05` need HTTP calls to the API from the `web` project, and there is
  no mechanism.** The built-in `request` there has the Next base URL.
- **M4 — `authedPage` as a worker-scoped fixture cannot be parameterized per user.** (The proposed
  replacement turned out to be unimplementable as well — see review 2, NB2.)
- **M5 — `HD-FN-07` and `HD-API-13` do not fix the created meeting's date while the expectation
  depends on it.** Sorting is DESC with a top-three slice, so "the new meeting is first" only holds
  for a date later than any seeded one.
- **M6 — the `Meetings total: N` counter and `pluralizeMeetings` are mutually exclusive.**
  Pluralizing breaks the `HD-FN-03` locator; the helper is deleted together with its cases.
- **M7 — `playwright-verify/SKILL.md` and `CLAUDE.md` would keep the `e2e/web/` and `e2e/api/`
  paths.** The edit addresses are named and verified.
- **M8 — `pnpm lint` does not catch half of what §6.3 declares a blocker.** The four relevant
  `eslint-plugin-playwright` rules sit at `warn`, and ESLint exits 0 on warnings.
- **M9 — the rationale for risk 1 (`secure` cookie) is factually wrong.** Chromium accepts `Secure`
  cookies on `http://127.0.0.1` because loopback is a trustworthy origin, so an unconditional `true`
  does not break e2e; the real reason lies elsewhere.
- **M10 — the units' exemption from the pairing rule was decided on the user's behalf.**
- **M11 — `apps/api` does not read `.env`, although §3.6 promises overriding through `.env`.**
  Verified: neither `dotenv` nor `@nestjs/config` is installed.
- **M12 — `HD-UT-07` checks something unreachable at the service level.**
- **M13 — `AL-UT-01…03` reference a `validateUser` method that does not exist.**
- **M14 — `toIsoStartsAt` is created but covered by no case.**

## 4. Minor items

**m1** — the `apps/web` `test` script divergence is not reconciled in §9. **m2** — the fixture name
divergence is not reconciled in §9. **m3** — "step 1 takes seconds" is wrong: any `pnpm e2e` starts
both dev servers (verified). **m4** — `test.use({ storageState: undefined })` is a no-op, since
there is no global `storageState`. **m5** — `pnpm format:check` is already red, on the plans
themselves. **m6** — `AL-FN-05` and `AL-FN-14` allow "native validation", contradicting risk 20.
**m7** — `apps/web/AGENTS.md` is regenerated by `next dev`. **m8** — CI/CD is in the requirements but
not in the plan. **m9** — `GET /` is checked by three different suites. **m10** — the `T0.6` DoD
"`pnpm e2e --list` shows no files from `e2e/fixtures`" checks the wrong thing: fixtures are not
`.spec.ts` and would never be listed.

---

## 5. Redundancy

An honest assessment: **69 e2e cases and 37 unit cases for a login form and a page with three
meetings is inflated by roughly 40%.** The harm is concrete: (1) every case is also a paragraph in a
`.cases.md` that must be kept in sync on every edit (§6.4 makes a divergence a blocker); (2) run time
multiplies by 8 steps × 2 features × 2 passes; (3) cases that test the framework give a false sense
of coverage — they are green regardless of our code.

### 5.1 To delete — they test the framework or duplicate a neighbour

| Case        | Why it is redundant                                                                                                   |
| ----------- | --------------------------------------------------------------------------------------------------------------------- |
| `AL-API-18` | "broken JSON → 400" is `body-parser` behaviour; our code is not involved (verified)                                   |
| `AL-API-19` | "`GET /auth/login` → 404" is Express router behaviour                                                                 |
| `AL-API-16` | "`Authorization` without the `Bearer` scheme → 401" is a degenerate `AL-API-15`                                       |
| `AL-API-17` | "a forged signature → 401" is the same as `AL-API-15` with a different string                                         |
| `AL-API-12` | "the error shape matches the Nest standard" is already checked by `AL-API-02` and `AL-API-04`                         |
| `HD-API-19` | "a broken token on `/meetings` → 401" is the same guard as in `AL-API-15`; one guard, both controllers                |
| `HD-API-18` | "list item shape" duplicates `HD-API-01` (keys) and `AL-API-11` (no secrets in the body)                              |
| `AL-FN-11`  | "login on Enter" is HTML form behaviour; swapping the form for a `div` + `onClick` is caught by `AL-FN-02`            |
| `HD-FN-13`  | "the counter (5) exceeds the item count (3)" is an arithmetic consequence of `HD-FN-03` + `HD-FN-04`                  |
| `HD-FN-15`  | "after signing out, Back does not show the dashboard" — see 5.4: inherently unstable and duplicates `HD-FN-08` step 4 |
| `AL-UT-16`  | "a token signed with another secret is rejected" tests `jsonwebtoken`, not our code                                   |
| `AL-UT-18`  | "an unknown email → an empty result" is a degenerate `Map.get`, already covered by `AL-UT-03`                         |
| `HD-UT-13`  | pluralization — deleted together with `pluralizeMeetings` (M6)                                                        |
| `HD-UT-14`  | "negative and non-integer values do not break `pluralizeMeetings`" — the function is deleted                          |

**Total to delete: 14 cases** (10 e2e + 4 UT).

### 5.2 To merge

| Merge                                 | Into                                                                                                                 |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `AL-API-04`, `AL-API-05`, `AL-API-06` | one case "missing and empty fields → 400 with errors on both fields" (three requests, three assertions)              |
| `AL-API-07`, `AL-API-09`              | one case "an invalid field format/type → 400, not 401 and not 500"                                                   |
| `AL-FN-08`, `AL-FN-09`                | one case "the login page logs nothing to the console, on render or after a failed sign-in"                           |
| `AL-FN-12`, `HD-FN-11`                | one BFF case, in feature 2: in feature 1 the dashboard is not rendered yet, so the check is incomplete by definition |
| plus four more pairs                  | `HD-API-10←11,12`; `HD-FN-05←12`; `AL-UT-09←12`; `HD-UT-10←12`                                                       |

**Total merges: 8.**

### 5.3 What must not be deleted (a check against cutting too much)

The three-level duplication of `total` ≠ `items.length` (`HD-UT-03` + `HD-API-05` + `HD-FN-03`) stays
**in full**: it is precisely the mistake the `T2.10` control experiment targets, and each level
catches it at its own seam. The same for "the same message for a wrong password and an unknown
email" (`AL-UT-02/03` + `AL-API-02/03` + `AL-FN-03/04`) — that is a security requirement, not
duplication. `AL-API-08`/`HD-API-16` (`forbidNonWhitelisted`) stay too: they check a deliberate
decision about `APP_PIPE`, not a framework default.

### 5.4 Specifically about `HD-FN-15`

The case checks that after `logoutAction` the browser's Back button does not show the dashboard. The
mechanism: `redirect()` in a Server Action is an App Router client navigation, the history is
`/` → `/auth/login`, and Back is served by Next's client router cache and/or the browser's bfcache.
The plan's `logoutAction` does neither `revalidatePath('/')` nor `Cache-Control: no-store` on the
document, so restoring the previous RSC payload is normal behaviour rather than a bug. It cannot be
checked empirically yet (there is no code), but by construction the case will either flake or cost
far more than a P2 deserves. Recommendation: **delete it**, leaving the "data is unreachable after
sign-out" guarantee to `HD-FN-08` step 4 (a repeat `page.goto('/')` → redirect), a deterministic
check of the same requirement.

### 5.5 Volume summary

| Set                  | In the plan | After the §5 edits                                   |
| -------------------- | ----------- | ---------------------------------------------------- |
| `auth-login` API     | 19          | 12                                                   |
| `auth-login` FN      | 14          | 10 (one case moves to feature 2 per B3)              |
| `home-dashboard` API | 19          | 15                                                   |
| `home-dashboard` FN  | 15          | 13 (+1 from feature 1, −3 deleted or merged)         |
| `smoke`              | 2           | 3 (the `SM-API-02` split per B5)                     |
| **e2e total**        | **69**      | **53**                                               |
| **UT total**         | **37**      | **29** (−8 deleted or merged, −2 per M6, +2 per M14) |

A reduction of ~23% in e2e and ~22% in units while keeping every P0 case and every specification
point. The `T0`–`T2` tasks are not reduced: their volume is appropriate and there are no superfluous
tasks in the plan.

---

## 6. Verified facts

| Claim of the plan                                                  | Result                                                                                                                    | Verdict                                        |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `middleware.ts` is deprecated, renamed `proxy.ts`, exports `proxy` | the installed Next docs say exactly that                                                                                  | confirmed                                      |
| `proxy.ts` works from `src/`                                       | "Create a `proxy.ts` … in the project root, or inside `src` if applicable"                                                | confirmed                                      |
| `runtime` in the `proxy` config is forbidden                       | "Setting the `runtime` config option in Proxy will throw an error"                                                        | confirmed                                      |
| `import 'server-only'` does not resolve outside a Next build       | `MODULE_NOT_FOUND`; the package is absent; the alias exists only inside the compiler                                      | confirmed                                      |
| Nest answers POST with 201, `@HttpCode(200)` is needed             | `POST /auth/login -> 201`; with the decorator `-> 200`                                                                    | confirmed                                      |
| The error body shapes `{message,error,statusCode}`                 | `HttpException.createBody` works exactly so                                                                               | confirmed                                      |
| `message` on a 400 is always an array of strings                   | a truncated JSON body gives a **string**                                                                                  | **refuted** (M1)                               |
| Named imports of `class-validator` / `class-transformer` from ESM  | the app started, the decorators worked, validation returned 400 — the interop works and the `zod` fallback is unnecessary | confirmed (a lower risk than the plan assumed) |

(Plus a further fifteen rows in the same table, all reproduced by command, covering the DTO
behaviour, the Playwright project routing by suffix, and the state of the repository at the time.)

---

## 7. Completeness matrix across the 12 specification points

All twelve points have at least one case at one level after the §5 reductions. The dashes in the API
and Unit columns are accepted: a form has no HTTP contract, component rendering is deliberately
outside Vitest, and sign-out never calls Nest. The one structural weakness is staging rather than
emptiness — points 4 and 7 partly rest on feature 2 cases, which B3 makes explicit.
