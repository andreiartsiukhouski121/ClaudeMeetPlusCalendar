# Development plan review (iteration 2)

> **ARCHIVE.** A record of the second review pass, kept for the reasoning behind the decisions. Not
> a source of truth: the live convention is in [`e2e/README.md`](../../e2e/README.md), the
> invariants in [`CLAUDE.md`](../../CLAUDE.md). Translated into English in `CH-014` and condensed;
> every blocker, finding and verified fact is preserved.

Documents under review: `docs/plans/README.md`, `feature-plan-implementation.md` (**IP**),
`feature-plan-testing.md` (**TP**). The subject: how `plan-review-1.md` (**R1**) was applied, new
defects introduced by the edits, and any residual blockers.

Every claim below was checked against this repository's installed dependencies (`next@16.3.4`,
`@nestjs/common@12.0.1`, `class-validator@0.15.1`, `@playwright/test@1.62.1`, `vitest@4.1.11`,
`eslint-plugin-playwright@2.11.0`, `pnpm@10.32.1`, Node `v24.14.0`) — see §8. The probes lived in a
scratchpad; no repository file was changed.

---

## 1. Verdict

**The plan can be executed once the blockers are removed.**

The R1 work was done honestly: all 9 blockers, 14 substantive findings, 10 minor items and §5 (14
deletions + 8 merges) were genuinely applied to the documents rather than merely logged. The
arithmetic reconciles completely — 52 e2e and 38 UT recounted from the case tables, including the
priority breakdown in every subsection, the §6.6 totals and the expected numbers in six task DoDs.
There are no dangling references to deleted IDs, no duplicate IDs, and not one of the 12
specification points is left without a case.

But it cannot be executed as is, for four reasons — three of them verified by running things rather
than by reasoning:

1. The `test:<feature>` scripts from B8 do not filter: `pnpm -r test -- -t "AL-UT-"` passes a
   literal `--`, after which `vitest` ignores `-t` and runs everything (verified). The user's
   requirement "checks run per feature in isolation" is therefore unmet for units, and the DoDs of
   `T1.4`/`T2.3` will produce the wrong number.
2. The fixture scheme from M4 is unimplementable — Playwright 1.62.1 hard-forbids
   `test.use({ authUser })` in a `describe` for a worker-scoped option, and forbids a test option as
   a worker fixture dependency; `home-dashboard.functional.spec.ts` will not load at all and all 13
   cases of feature 2 will fail.
3. `CreateMeetingDto` inherited exactly the defect R1 found in `ListMeetingsQueryDto`
   (`durationMinutes?` without `@IsOptional()`), so `POST /meetings` from the UI form returns `400`
   — the "Create meeting" button does not work.
4. The unit spec tree in TP §1.1 is left over from an older revision and contradicts TP §4.1 and IP
   §9 on the very question TP is declared authoritative for.

None of the four requires reworking the plan; all are fixable in place, and the fix texts are given.

---

## 2. Application of review 1

Verdicts come from the documents, not from IP's §10 log.

All 33 individual items (B1–B9, M1–M14, m1–m10) plus §5.1 (14 deletions) and §5.2 (8 merges) were
checked one by one against line references. **Result: 41 items fully applied; 2 applied incorrectly
(`B8` in the script form, `M4` in the fixture scheme); 2 applied with an inaccuracy in the
surrounding text (`M8` — NM2, `m1` — NM4). No item was left unapplied.**

Two places where R1 demanded a real change of behaviour rather than a rewording:

- **B5 ("permissible" → "mandatory").** Verified in substance: the word "permissible" is gone from
  `T0.6`, replaced by "the split is **mandatory**, not 'permissible'", plus a mechanism — "the file
  `e2e/smoke/seed.api.spec.ts` is not created in `T0.6`". The `T0.7` DoD gained "**all of them,
  without exceptions**". That is a change of implementer behaviour, not a paraphrase. No softenings
  remain: a grep for "permissible" in both documents returns only `test.fixme` (legitimate) and
  "the permissible range" in the `HD-API-09` title.
- **M2 (expectations phrased with "or").** In the expected results of §3.1–3.5 an "or" survives in
  exactly one place — `HD-FN-08`: "the session cookie is absent from the context **or empty**"
  (NM7). That is weaker than R1 demanded but does not void the case: a non-empty session cookie
  fails the check.

---

## 3. New blockers

### NB1 — the `test:<feature>` scripts do not filter: `pnpm -r test -- -t "…"` disables `-t` entirely

**What is wrong.** TP §1.9 and IP `T0.3` specify:

```json
"test:auth-login": "pnpm -r test -- -t \"AL-UT-\" --passWithNoTests"
```

`pnpm` passes a **literal `--`** into the package script, so `vitest run` receives
`vitest run "--" "-t" "AL-UT-" "--passWithNoTests"`. On such a command line `-t` stops being a
filter option and `vitest` runs **all** of the package's tests. The user's requirement that "checks
run per feature in isolation" therefore remains unmet for units — exactly the hole B8 was meant to
close. It also breaks the DoDs: `T1.4` ("`pnpm test:auth-login` → `25 passed`"), `T2.3`
("`13 passed`") and the TP §6.6 rows — in practice `39 passed` arrives, and §6.6 declares a count
mismatch a blocker.

**Evidence.** A run against the current repository (which holds one unit test titled
`should return "Hello World!"`, not matching the `AL-UT-` filter):

```
$ pnpm -r test -- -t "AL-UT-" --passWithNoTests
apps/api test$ vitest run "--" "-t" "AL-UT-" "--passWithNoTests"
apps/api test:  Tests  1 passed (1)          ← the filter was not applied

$ cd apps/api && npx vitest run -t "AL-UT-"
 Tests  1 skipped (1)                        ← the filter was applied, exit 0

$ cd apps/api && npx vitest run -- -t "AL-UT-"
 Tests  1 passed (1)                         ← the filter is disabled
```

A further symptom of the same thing: with `--`, pnpm's scope changes too —
`Scope: all 5 workspace projects` instead of `Scope: 4 of 5` — so the root package is pulled in,
whose `test` script is `pnpm -r test` itself, and the run nests into itself recursively.

**Fix.** Remove the `--` in both documents:

```json
"test:auth-login": "pnpm -r test -t \"AL-UT-\" --passWithNoTests",
"test:home-dashboard": "pnpm -r test -t \"HD-UT-\" --passWithNoTests"
```

Verified: the filter applies, `Scope: 4 of 5`, exit 0. Add a regression-catching condition to the
`T0.3` DoD: "`pnpm test:auth-login` at stage `T1.4` gives exactly `25 passed`; if the number matches
a full `pnpm test`, the filter is not working."

### NB2 — the M4 fixture scheme is unimplementable: Playwright forbids `test.use({ authUser })` in a `describe`

**What is wrong.** TP §5.5 claims that "`test.use({ authUser: 'organizer' })` in a `describe` makes
Playwright spin up a **separate worker** for that value, and 'one login per worker and user' works
as intended". That is false. For a **worker-scoped** option, Playwright 1.62.1 rejects the
construction at file load time:

```
Cannot use({ authUser }) in a describe group, because it forces a new worker.
Make it top-level in the test file or put in the configuration file.
```

The error is not a failing assertion but a refusal to load the spec: the **whole**
`home-dashboard.functional.spec.ts` fails, meaning all 13 cases of feature 2, and the `T2.9` DoD
("`13 passed`") becomes unreachable. The symmetric workaround is closed too: making `authUser` a
test option (`{ option: true }` without `scope`) makes Playwright forbid a worker fixture depending
on a test one:

```
worker fixture "authedState" cannot depend on a test fixture "authUser"
```

And moving `test.use({ authUser: 'organizer' })` to the file's top level is impossible: the same
file holds cases under `teacher` (`HD-FN-02…06`, `09`, `10`, `14`, `16`), and splitting the file in
two would violate the "two test files per feature" requirement and rules §1.3/§1.6.

**Evidence.** Three Playwright 1.62.1 runs in a scratchpad (§8), plus the types:
`playwright/types/test.d.ts` allows the pair `{ scope: 'worker', option: true }` syntactically — the
prohibition is a runtime one, so `pnpm typecheck` will not catch it.

**Fix.** Replace the scheme in TP §5.5 (and in IP `T2.9`) with a **worker-scoped cache keyed by
user, plus a test option**:

```ts
// e2e/fixtures/auth.fixture.ts
export const test = base.extend<
  { authUser: SeedUserKey; authedPage: Page },
  { authStateFor: (user: SeedUserKey) => Promise<string> }
>({
  // worker-scoped: the value is a function, so it has no dependency on the test option
  authStateFor: [
    async ({ browser }, use, workerInfo) => {
      const cache = new Map<SeedUserKey, string>();
      await use(async (user) => {
        if (!cache.has(user)) cache.set(user, await uiLogin(browser, user, workerInfo));
        return cache.get(user)!;
      });
    },
    { scope: 'worker' },
  ],
  authUser: ['teacher', { option: true }], // a test option — changeable inside a describe
  authedPage: async ({ browser, authStateFor, authUser }, use) => {
    /* a fresh context + page from the state file */
  },
});
```

Verified by a run: `test.use({ authUser: 'organizer' })` inside a `describe` works, the login runs
once per worker and user, and a fresh context and page are created per test. The rationale in §5.5
("why an option rather than a fixture") should be replaced with "a worker fixture cannot depend on a
test option, so what is cached per worker is the **state-getter function**, not the state itself".

### NB3 — `CreateMeetingDto.durationMinutes?` without `@IsOptional()`: `POST /meetings` from the UI returns 400

**What is wrong.** IP §2.2 item 5 specifies `durationMinutes?` with
`@Type(() => Number) @IsInt() @Min(15) @Max(480)` and a default of `60`. `@IsOptional()` is not
named — that is exactly defect B1, in the second DTO of the same numbered list. Under
`whitelist: true, transform: true` a missing field still runs through `@IsInt/@Min/@Max` and gives 400. And it is our own scenarios that send it without the field:

- `T2.6` describes `createMeetingAction` as "`title` from the form with `trim`;
  `startsAt = toIsoStartsAt(...)`; … `POST /meetings`" — there is no third field, and the `T2.8`
  form has only "Title" and "Date and time". So **the "Create meeting" button never works**, and
  `HD-FN-07` (P0) is red on otherwise correct code — which is point 11 of the user specification;
- `HD-API-17` step 2 sends only a unique title and `startsAt` → 400 instead of 201;
- `HD-UT-08` ("`create` returns … `durationMinutes ?? 60`") tests a branch unreachable over HTTP.

**Evidence.** A probe on real `@nestjs/common@12.0.1` + `class-validator@0.15.1` with the DTO copied
from the plan verbatim:

```
POST body full                    -> OK {"title":"…","startsAt":"2030-01-01T10:00:00.000Z","durationMinutes":30}
POST body without durationMinutes -> 400 {"message":["durationMinutes must not be greater than 480",
                                          "durationMinutes must not be less than 15",
                                          "durationMinutes must be an integer number"],…}
```

**Fix.** Rewrite IP §2.2 item 5 to include `@IsOptional()` and state that it is **mandatory** —
without it `POST /meetings` without `durationMinutes` gives 400 (verified by probe), so the meeting
creation form does not work at all. Also add to §2.1 the line "`durationMinutes` outside `15..480`
→ `400 {"message":["durationMinutes must not be less than 15"],…}`", and in TP either add an
explicit `durationMinutes` step to `HD-API-17` or — better — add a case `HD-API-18` at a free number:
"`POST /meetings` **without** `durationMinutes` → 201, with `durationMinutes` = 60 in the response".
That is what catches a missing `@IsOptional()` at the contract level, the way `HD-API-10` step 2
catches it for `limit`.

### NB4 — the TP §1.1 unit spec tree contradicts TP §4.1, IP §9 and IP `T1.4`

**What is wrong.** TP §1.1 lists:

```
apps/api/src/
├── auth/
│   ├── auth.service.spec.ts
│   ├── password.service.spec.ts      ← forbidden to create
│   └── token.service.spec.ts
├── users/users.service.spec.ts
└── meetings/meetings.service.spec.ts
```

In the same document, §4.1 says "a separate `apps/api/src/auth/password.service.spec.ts` is
therefore **not** created". IP §9 and §10 say the same. Meanwhile the §1.1 tree is **missing** two
specs the cases require: `apps/api/src/common/crypto/password.spec.ts` (`AL-UT-09…11`) and
`apps/api/src/auth/jwt-auth.guard.spec.ts` (`AL-UT-27`, `AL-UT-28`). The edits touched the web half
of the same tree (`api-client.spec.ts` appeared, `plural.spec.ts` left) but not the api half.

Why a blocker rather than a typo: `docs/plans/README.md` declares TP authoritative precisely "for
tests (paths, file names, case composition)". An implementer resolving the divergence by the
priority rule will create `password.service.spec.ts` without cases — which by TP §6.3 is a blocker
("a unit spec in `apps/**/src/**` mentioned in no `*.unit.cases.md`") and a red rule 8 in the
meta-test, that is a red **step 1** of the pipeline, which blocks every later step. And conversely:
the two specs carrying `AL-UT-09…11`, `27`, `28` are not in the tree, so they are easy not to create
— then rule 7 goes red.

**Fix.** Bring the TP §1.1 tree in line with §4.1:

```
apps/api/src/
├── common/crypto/password.spec.ts    # AL-UT-09…11
├── auth/
│   ├── auth.service.spec.ts          # AL-UT-01…08
│   ├── token.service.spec.ts         # AL-UT-13…15
│   └── jwt-auth.guard.spec.ts        # AL-UT-27, AL-UT-28
├── users/users.service.spec.ts       # AL-UT-17, AL-UT-19
└── meetings/meetings.service.spec.ts # HD-UT-01…09
```

and add beneath it the same sentence already used for `plural.spec.ts`: "`auth/password.service.spec.ts`
and `meetings/meetings.mapper.spec.ts` are deliberately **absent** — see §4.1 and §9 of the
implementation plan."

---

## 4. New substantive findings

**NM1 — rule 5 of §1.6 does not exempt `*.unit.cases.md` although rule 3 does.** TP says "every case
ID from a `.cases.md` appears in the text of the paired spec". `auth-login.unit.cases.md` has no
paired spec by definition (rule 3 acknowledges that), and two-way coverage for units is provided by
rule 7. A literal implementation of "all eight rules" gives a red step 1 on the first
`*.unit.cases.md` — the same class of failure as B4. Fix: append to rule 5 "— except
`*.unit.cases.md`, for which rule 7 applies", and define the format of the "explicit marker" rule 5
refers to: without a fixed syntax the meta-test cannot recognize it.

**NM2 — §6.2 step 2 attributes an `error` level to `page.pause` that it does not have.** TP says the
step "catches `test.only`, `expect` without `await`, `page.pause`, `networkidle` (which are `error`
in the preset)". Verified: in `flat/recommended`, `no-page-pause` is **`warn`**, while
`no-networkidle`, `no-focused-test` and `missing-playwright-await` are `error`. The `T0.6` edit
raises three other rules, `no-page-pause` not among them, so a committed `page.pause` passes step 2
green. Fix: either add `'playwright/no-page-pause': 'error'` to the three, or drop `page.pause` from
the step 2 list and name it explicitly in §6.3 so a reviewer catches it.

**NM3 — the "the title starts with the ID" requirement received none of the exemptions the pairing
rules did.** TP §2, §6.3 and §6.4 do not know about two files the plan deliberately keeps: the tests
of `e2e/suite-integrity.api.spec.ts` have no IDs by the plan's own decision, and the scaffold
baseline spec `apps/api/src/app.controller.spec.ts` is titled `should return "Hello World!"`
(verified by reading it) and appears only in `UNIT_SPEC_EXEMPT`, which covers rule 8 rather than
titles. Formally both are blockers under §6.3 at every acceptance. Fix: add "except files in
`SELF_EXEMPT` and `UNIT_SPEC_EXEMPT`" to §6.3/§6.4.

**NM4 — the rationale for `--passWithNoTests` is wrong although the flag itself is needed.** TP §1.9
and IP `T0.3` say "`vitest run` with a filter matching no test in the package exits with code 1 and
fails the whole script". Verified: with spec files present and no `-t` match, `vitest run` gives
`1 skipped` and **exit 0**; code 1 happens only when there are no spec files at all
(`No test files found, exiting with code 1`). So the flag is mandatory for `apps/web` at stage
`T0.3` (no specs there yet) and is not needed "because of the filter". A false rationale is
dangerous: the next agent, seeing `1 skipped … exit 0`, will decide the flag is redundant and remove
it, breaking `T0.3`. Fix: restate it as "a package with no spec files at all (`apps/web` before
`T1.4`) fails `vitest run` with code 1; a `-t` filter with no match is safe — the tests are marked
`skipped` and the code is 0".

**NM5 — the mandatory test title rename is not named when `health.spec.ts` moves.** TP §1.5 and IP
`T0.6` say it "moves … without changing the logic". But the current title is `GET / responds with a
greeting` (verified by reading the file), while rule 5 of §1.6 and §6.3 require it to start with
`SM-API-01`. Otherwise step 1 goes red already in `T0.6`. Fix: add "the test title is renamed to
`SM-API-01 — …`; only the title changes, the logic does not".

**NM6 — the `T0.6` DoD "the file count matches `e2e/README.md`" will be off by one.** The
`e2e/README.md` table described in §1.8 lists 6 specs (2 + 2 + 2), and
`e2e/suite-integrity.api.spec.ts` is not in it — it is mentioned only in the "adding a feature"
paragraph. `pnpm e2e --list` will show 7 files. Fix: either add a suite-convention row to the §1.8
table (it has no paired `.cases.md` by `SELF_EXEMPT`), or word the DoD as "the file count matches
the `e2e/README.md` table plus the meta-test".

**NM7 — the only remaining "or" in an expected result: `HD-FN-08`.** TP: "the session cookie is
absent from the context **or empty**". The variance is mild (both outcomes mean "no session"), but
by the M2 principle it is better pinned: "the `ps_session` cookie is absent from the context; if the
implementation leaves it with an empty value, the value is strictly empty, and `GET /` still
redirects (step 5)".

**NM8 — the §2.1 line about `limit` shows one error where three arrive.** IP says "`limit` outside
`1..100` or non-numeric → `{"message":["limit must not be less than 1"],…}`". Verified:
`?limit=abc` gives `["limit must not be greater than 100","limit must not be less than 1","limit
must be an integer number"]`. `HD-API-08` ("`message` is an array of strings mentioning `limit`")
survives that, but the contract should not be left more precise than it is: add "with a non-numeric
value three messages arrive — compare by inclusion, not by equality".

---

## 5. Arithmetic

Recounted from the case tables of §3 and the lists of §4 rather than from the stated totals:
52 e2e definition rows and 38 UT definition items.

| Set                         | Stated in the plan         | Recounted                                             | Agrees |
| --------------------------- | -------------------------- | ----------------------------------------------------- | ------ |
| `auth-login` API (§3.1)     | 11 (P0 5 / P1 6 / P2 0)    | 11: `01,02,03,04,07,08,10,11,13,14,15` — 5/6/0        | yes    |
| `auth-login` FN (§3.2)      | 10 (P0 5 / P1 4 / P2 1)    | 10: `01…06,08,10,13,14` — 5/4/1                       | yes    |
| `home-dashboard` API (§3.3) | 15 (P0 8 / P1 7 / P2 0)    | 15: `01…10,13…17` — 8/7/0                             | yes    |
| `home-dashboard` FN (§3.4)  | 13 (P0 8 / P1 4 / P2 1)    | 13: `01…11,14,16` — 8/4/1                             | yes    |
| `smoke` (§3.5)              | 3                          | 3: `SM-API-01…03`                                     | yes    |
| **e2e total**               | **52** (11+10+15+13+3)     | **52** definition rows                                | yes    |
| UT `auth-login` (§4.1)      | 25 (P0 18 / P1 6 / P2 1)   | 25: `01…11,13…15,17,19…28` — 18/6/1                   | yes    |
| UT `home-dashboard` (§4.2)  | 13 (P0 6 / P1 6 / P2 1)    | 13: `01…11,15,16` — 6/6/1                             | yes    |
| **UT total**                | **38** (25+13)             | **38** definition items                               | yes    |
| §6.6 rows and units         | 11/10/15/13/3/52; 25/13/38 | match §3.1–3.5; api 27 + web 11 = 38, plus 1 baseline | yes    |
| DoD of all six tasks        | 25/11/10/13/15/13 passed   | all match, smoke 2 in feature 1 and 3 in feature 2    | yes    |
| §5.4 "48 read-only cases"   | 48                         | 52 − 4 `@mutating` = 48                               | yes    |
| Task compositions vs §3–§4  | ID lists                   | match item by item                                    | yes    |

The divergence from R1 §5.5 (which promised 53 e2e and 29 UT) is explained in IP §10, and the
explanation is correct: R1's own §5.5 arithmetic did not add up, and it never accounted for the
`+4` `api-client` cases (B7), the `+2` from M14 and the `+2` guard cases. There is no divergence
inside the plans.

---

## 6. Dangling references and duplicate IDs

**No duplicates.** No ID is defined twice: the 52 definition rows in §3 and the 38 items in §4 are
unique.

**No dangling references.** Every deleted or relocated ID appears exclusively in explanatory "what
happened to these numbers" paragraphs and in the §9/§10 logs; none sits in a live position — not in
the §7 matrix, not in §6.6, not in a task DoD, not in the risk sections. All 22 such IDs were
checked individually.

The only "dangling reference" of another kind is not an ID but a path: TP §1.1 refers to
`auth/password.service.spec.ts`, which by the plan's own decision will not exist, and omits two that
will (NB4).

---

## 7. Completeness matrix

Twelve points of the user requirements; the cells hold only the IDs that survived the reduction. All
twelve are covered — **no empty cells**. The dashes in the API and Unit columns are the ones already
accepted in R1 (a form has no HTTP contract; component rendering is deliberately outside Vitest;
sign-out never calls Nest). Point 11 is covered but `HD-FN-07`/`HD-API-17` are red because of NB3.

Specifically on what the task asked to check:

- **Point 12 after `HD-FN-15` was deleted.** `HD-FN-08` covers the requirement **in full**: step 3
  (the button with role `button` and the name is visible), step 4 (the click gives URL
  `/auth/login` and no session cookie), step 5 (a repeat `page.goto('/')` redirects again), plus
  "the email greeting is displayed at no step after sign-out". The accessible name is additionally
  checked by `HD-FN-14`. Only the "browser back" check is gone, and that is router-cache behaviour
  rather than a requirement.
- **Point 2 after `AL-FN-11` was deleted.** It rests on `AL-FN-01` (the button is visible with the
  exact name) and `AL-FN-02` (the click logs in). Sufficient.
- **Point 9.** The three-level `total ≠ items.length` coverage is fully preserved: `HD-UT-03`
  (service), `HD-API-05` (contract, `total` = 5 with `items` = 3), `HD-FN-03` (the UI compared with
  the API), plus the `T2.10` control experiment.
- **Point 6.** The indistinguishability of a wrong password from an unknown email is preserved at
  all three levels: `AL-UT-02`/`AL-UT-03`, `AL-API-02`/`AL-API-03`, `AL-FN-03`/`AL-FN-04`.

The only weakness in completeness is not emptiness but staging: in the functional column, points 4
and 7 partly rest on `HD-FN-11`/`HD-FN-16`, that is on feature 2. For feature 1's acceptance that
means the BFF contract and the reverse redirect will not be checked; `T1.9` names this explicitly,
so it is not counted as a defect.

---

## 8. Verified facts

| Claim                                                                                    | Result                                                                                                                    | Verdict                                                    |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `pnpm -r test -- -t "AL-UT-" …` filters units by feature                                 | `vitest run "--" "-t" …` → `Tests 1 passed (1)`, filter not applied; scope grew to all 5 projects                         | **refuted** (NB1)                                          |
| The same without `--` works                                                              | `vitest run "-t" "AL-UT-"` → `1 skipped`, exit 0, `Scope: 4 of 5`                                                         | the NB1 fix is confirmed                                   |
| `vitest run` with a non-matching filter exits 1                                          | `1 skipped`, **exit 0**                                                                                                   | **refuted** (NM4)                                          |
| `--passWithNoTests` is needed by a package with no specs                                 | `No test files found, exiting with code 1` → exit 1; with the flag exit 0                                                 | confirmed (the flag is required)                           |
| `ListMeetingsQueryDto` with `@IsOptional() … @Max(100)` behaves as `HD-API-01…10` expect | no parameter → OK; `limit=3` → number; `limit=100` → OK; `101`/`0`/`-1` → 400; `abc` → 400 (3 messages); `foo=bar` → 400  | confirmed (B1, B2)                                         |
| `CreateMeetingDto` accepts a body without `durationMinutes`                              | `400` with three messages                                                                                                 | **refuted** (NB3)                                          |
| `LoginDto` yields the `AL-API-04`, `07`, `08` expectations                               | every branch returns the documented 400 message                                                                           | confirmed                                                  |
| `test.use({ authUser })` in a `describe` spins up a separate worker                      | `Cannot use({ authUser }) in a describe group…` — the file does not load                                                  | **refuted** (NB2)                                          |
| The "make `authUser` a test option" workaround works                                     | `worker fixture "authedState" cannot depend on a test fixture "authUser"`                                                 | **refuted** (NB2)                                          |
| `test.use` for a worker option at file top level works                                   | `1 passed`                                                                                                                | confirmed (but unsuitable for feature 2's file)            |
| The NB2 fix (a worker cache of a per-user function + a test option) works                | `3 passed`; `login#1` reused by the second `teacher` test, `login#2` for `organizer`; `test.use` accepted in a `describe` | confirmed                                                  |
| `{ scope: 'worker', option: true }` is a valid type pair                                 | syntactically valid; the prohibition is runtime only                                                                      | confirmed (typecheck will not catch NB2)                   |
| The three ESLint rule names are valid in `eslint-plugin-playwright@2.11`                 | all three exist; in `flat/recommended` they are `warn`                                                                    | confirmed (M8 is correct)                                  |
| Raising the three rules to `error` really fails the lint                                 | `3 errors, 5 warnings`, exit 1; `test.fixme` **not** flagged; `page.pause` a warning                                      | confirmed; `page.pause` is NM2                             |
| `page.pause` is caught by step 2 ("it is `error` in the preset")                         | `no-page-pause: warn` → exit 0 on its own                                                                                 | **refuted** (NM2)                                          |
| `pnpm format:check` is red on the three plan documents (m5)                              | red only on `plan-review-1.md`; both plans are already formatted                                                          | confirmed with a correction                                |
| `apps/api` does not read `.env` (M11)                                                    | neither `dotenv` nor `@nestjs/config`; `process.env.PORT ?? 3001` directly                                                | confirmed                                                  |
| `CLAUDE.md` and `playwright-verify/SKILL.md` do contain the old paths (M7)               | the line references in `T0.6` are correct                                                                                 | confirmed                                                  |
| The baseline spec does not disturb the numbering ("38 + baseline")                       | one test titled `should return "Hello World!"` — no ID (NM3), but not counted in the 38                                   | confirmed with a caveat                                    |
| `vitest` is not yet installed in `apps/web` (`T0.3`)                                     | `vitest ^4.1.11` is **already** in devDependencies, only the `test` script is missing                                     | clarification: `T0.3` reduces to the script and the config |
| `proxy.ts` from `T2.7` agrees with `HD-FN-16` and with the POST Server Action            | the matcher covers both paths; the redirect is limited to `GET`, so the POST `loginAction` passes                         | no contradictions                                          |
| §1.6 leaves no rule that the meta-test would break on the fixtures (B4)                  | fixtures do not end in `.spec.ts` and `README.md` is not a `.cases.md`; but rule 5 does not exempt `*.unit.cases.md`      | B4 applied; NM1 is a separate defect                       |

---

## 9. What to do next

All edits are to the documents; none touch code.

1. **NB1** — remove the `--` from the two scripts in TP §1.9 and IP `T0.3`, and strengthen the
   `T0.3` DoD.
2. **NB2** — rewrite the TP §5.5 solution as a worker cache of a per-user function plus a test
   option; fix IP `T2.9` where it describes `test.use`.
3. **NB3** — add `@IsOptional()` to `CreateMeetingDto` (IP §2.2 item 5), add the line to §2.1 and a
   case for `POST /meetings` without `durationMinutes`.
4. **NB4** — bring the TP §1.1 unit spec tree in line with §4.1.
5. NM1–NM8 per §4; NM1, NM3 and NM5 are worth closing together with NB4, because all four hit the
   same step 1 of the pipeline.

Afterwards no totals need recomputing, except if NB3 is closed by adding a new `HD-API-18` case:
then `home-dashboard` API becomes 16, the e2e total becomes 53, and that must be carried through
§3.3, §6.6, the `T2.4` DoD and the §7 matrix.
