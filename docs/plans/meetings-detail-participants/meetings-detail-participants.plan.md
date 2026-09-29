# Plan: meetings-detail-participants

> The task breakdown for the shape settled in [design.md](design.md), on the facts in
> [research/](research/README.md). `ADR-0017`, `ADR-0018` and `ADR-0019` are accepted: cited here,
> never re-opened. Test cases are not listed — they are written once, into
> `e2e/regression/meetings-detail/*.cases.md`, by the tester roles.

## 0. Orientation: what the project already has

- **Duplicate:** partial and named. `FT-002` shipped `POST /meetings` and `GET /meetings`; nothing
  in the ledger adds `participants[]` or a by-id route, so the delta is new. The two documentation
  defects in scope are of the `FX-023` / `FX-027` class — one fact kept in two copies by hand — but
  neither entry covers these copies, so they are found here, not already fixed.
- **Conflicts with shipped:** invariants 2, 5, 6, 8 and 16 are touched (6 extended in spirit from
  accounts to records by `ADR-0018`, 8 gains a third documented shape, 16 a `PROTECTED_ROUTES` line).
  `MEETING_KEYS` (`home-dashboard.api.spec.ts:43`) and the two assertions on it (`:102`, `:408`) go
  red the moment the entity changes, and the prose at `home-dashboard.api.cases.md:46` names the four
  keys too. `SM-API-03` is extended, not repaired. `docs/api-contract.md:24-27` (the four defective
  Cases cells) and `apps/api/README.md:12-20,31-34` are rewritten.
- **Conflicts with planned:** `BL-007` (edit and delete a meeting) inherits `ADR-0018` and loses the
  `apps/api/README.md` clause of its "Conflicts with" cell; `BL-019` is unaffected — `AR-API-09` is
  the kind of extension it proposes, not a competitor; `BL-023` is untouched, because this change
  renders nothing. Nothing in the Rejected section matches.
- **Architecture impact:** `ADR-0017` (participants are free-form strings), `ADR-0018` (404 over 403,
  the argument form of `NotFoundException`, one code path) and `ADR-0019` (the route listing lives in
  the contract alone) govern it; it confirms `ADR-0006`, `ADR-0007`, `ADR-0010`, `ADR-0014`, and
  supersedes none. Corpus: `docs/api-contract.md`, `docs/data-model.md` (two rows), `CLAUDE.md`
  invariant 8; `docs/architecture.md` unchanged — no layer rule moves.
- **Open questions:** none left for the customer; three were settled by the lead before planning and
  are recorded here. `durationMinutes` stays exactly as it ships (design A1). The two id formats
  (`data-model.md:54` against `randomUUID()`) get a `BL-` row — not an `FX-`, not a fix — and
  `data-model.md:31` is left verbatim. The `/auth/*` Cases cells are corrected inside this change,
  because a new check may not land red.

## 1. Spike: how the risky assumptions were proven

Six probes at plan time, in the scratchpad, against this repository's own files; nothing landed. DTO
validation and `NotFoundException` behaviour are settled by `research/probes.md` and probe F.

| Assumption                                                     | How it was proven                                                                                                          | Fact                                                                                                                |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `AR-API-05`/`06` see `@Get(':id')` as `/meetings/:id`, guarded | ran the spec's own scanner (`CONTROLLER_DECORATOR`, `METHOD_DECORATOR`, `joinRoute`) over a patched copy of the controller | `GET /meetings/:id guarded=true` — the Routes row and the `PROTECTED_ROUTES` path must be that literal              |
| the four Cases cells cite IDs that do not exist                | `grep -o 'HD-API-[0-9]*' / 'AL-API-[0-9]*'` over the two cases docs, `sort -u`                                             | real sets: `HD-API-01`…`10`, `13`…`17`, `20` (16 IDs); `AL-API-01`-`04`, `07`, `08`, `10`, `11`, `13`-`15` (11 IDs) |
| `AR-API-09` could scan `e2e/regression/` only                  | located the home doc of every ID the column cites                                                                          | false — `SM-API-01` lives in `e2e/smoke/health.api.cases.md`; the check must scan `e2e/**/*.cases.md`               |
| a range in the Cases column is plain ASCII                     | printed the code points of the cells                                                                                       | the separator is U+2026 (`…`) and the right token is bare digits (`` `14` ``) — the parser expands the left prefix  |
| `pnpm test:meetings-detail` would prove the unit titles        | ran `pnpm -r test -t "MD-UT-"` before any such case exists                                                                 | **exit 0**, 42 skipped, 0 run — green proves nothing; the DoD must demand a non-zero pass count                     |
| only two assertions pin the meeting key set                    | grepped `Object.keys` and `MEETING_KEYS` across `e2e/`, `apps/api/src`, `apps/web/src`                                     | confirmed `:102` and `:408`; `security.api.spec.ts:227` pins error-body keys, not meeting keys                      |

## 2. Contract

The full accepted/rejected input tables are design §3 and are not copied. What the code must match:

- **`GET /meetings/:id`** — `Bearer` through the class-level guard, no body, no query DTO. **Nothing
  validates `:id`**: no `ParseUUIDPipe`, no regex, no length rule. `200` returns a `MeetingDto` —
  exactly five keys, sorted `durationMinutes`, `id`, `participants`, `startsAt`, `title`.
- `401` (no or broken token):
  `{"message":"Authentication required","error":"Unauthorized","statusCode":401}`.
- `404` (no such meeting **or** another owner's — one code path, byte-identical):
  `{"message":"Meeting not found","error":"Not Found","statusCode":404}`, from
  `new NotFoundException('Meeting not found')`. The no-argument form drops `error` and fails
  `SEC-API-06`; `ADR-0018` forbids it. `GET /meetings/a/b` falls through to Express —
  `{"message":"Cannot GET /meetings/a/b",…}`, three keys, no handler. There is **no `400`** here.
- **`POST /meetings`** — one new optional field; decorators in this order:
  `@IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @Length(1, 100, { each: true })`.
  The 400 literals are probe F's (design §1, PF10-PF14); a case asserts **membership** in `message`.
- **`GET /meetings`** — response only: each item gains the field. `total` stays `countByOwner`.

## 3. Data

- Seed values: design §4, "Seed — exact values", taken verbatim, and mirrored into
  `e2e/fixtures/seed.ts` (`ADR-0007`). Not restated here — a second copy of a value table is exactly
  `FX-023` / `FX-027`. Absolute, dateless, one owner with `[]`.
- No participant string is a seeded login, a seeded user name, or anything in `SECRET_MARKERS`.
  Those constraints are load-bearing for `HD-API-01` and `SEC-API-01`; the values are not to be
  "improved" during implementation.
- Owners are unchanged: `teacher` and `student` read-only, `planner` the sandbox for mutating
  `*.api.spec.ts`. Created meetings keep the 2030 date constant.
- **Ids are never hard-coded in a case:** a by-id case reads one from `GET /meetings` first.
- Four copy sites clone the array rather than spreading alone — `byOwner`, `create`'s return, the new
  `findById`, and the constructor, where the source is `seed` (`meetings.service.ts:39`) and a shallow
  copy would share the array with the module-level `SEED_MEETINGS`.
- Until T9 extends `SM-API-03`, that mirror is guarded by nothing.

## 4. Tasks

Roles are `ADR-0014`: product code under `apps/**/src/**` to the implementers; `e2e/**`, every
`*.spec.ts` and every `*.cases.md` to the testers — including to fix a red test their task caused.

| ID  | What to do                                                | Role                | Files                                                                                                                                                                | Done when                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Depends on    |
| --- | --------------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| T1  | `participants` and `findById` in the meetings module      | `implementer-api`   | `apps/api/src/meetings/`: `meeting.types.ts`, `dto/create-meeting.dto.ts`, `meetings.service.ts`, `meetings.mapper.ts`, `meetings.controller.ts`, `meetings.seed.ts` | `pnpm --filter @purpleschool/api typecheck` green; `@Get(':id')` declared after `@Get()` and `@Post()`, `@Param('id')` with no pipe; `findById(ownerId, id)` has one return path and takes its `ownerId` from `@CurrentUser()`, never from the path or a body (invariant 5); the controller's only branch is `undefined` → `new NotFoundException('Meeting not found')`; all four copy sites of §3 clone the array; decorator order per §2 and the seven seed arrays per design §4                                                                                                                                                                                                                                                                                                                                                                                                           | —             |
| T2  | the web DTO mirror                                        | `implementer-web`   | `apps/web/src/lib/types.ts`                                                                                                                                          | `Meeting` carries `participants: string[]`; `pnpm --filter @purpleschool/web typecheck` green; `git diff --name-only -- apps/web` lists that one file and nothing else                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | — (∥ T1)      |
| T3  | corpus: contract, data model, invariant 8, package README | `implementer-api`   | `docs/api-contract.md`, `docs/data-model.md`, `CLAUDE.md`, `apps/api/README.md`                                                                                      | Routes gains a row whose path cell is the literal `` `/meetings/:id` `` with `Bearer`, `200`, `401`,`404`, and whose **Cases cell cites no IDs at all** until T10 fills it; a 404 row in the error-shapes table **and** the 404 added to the prose twin at `:41`; a `GET /meetings/:id` section; `participants` in the `POST /meetings` field table with the probe-F rejection literals **and** the accepted-input rows (absent, `[]`, `null` — all stored as `[]`, `ADR-0017`), and in the `GET /meetings` response note; the four defective Cases cells re-derived, each `/auth/*` cell enumerating only the IDs whose cases exercise **that** route per `auth-login.api.cases.md`; `data-model.md` gains exactly two rows and its `id` row is unchanged against `git show HEAD:docs/data-model.md`; invariant 8 reads "and on a 404"; `apps/api/README.md:12-20,31-34` replaced by a link | T1            |
| T4  | the feature's API cases and spec, and the `MD` prefix     | `tester-api`        | `e2e/regression/meetings-detail/meetings-detail.api.cases.md`, `meetings-detail.api.spec.ts`, `e2e/suite-integrity.api.spec.ts`                                      | `pnpm e2e --project=api --grep @meetings-detail` green; the P0 case for `ADR-0018` asserts the two responses equal in **status and parsed body**, the bodies in **one** `toEqual`; every 400 case asserts membership in `message`; no meeting id is a literal; `MD` is in `KNOWN_CASE_PREFIXES`; the folder holds no `.functional.*` file                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | T1, T3        |
| T5  | `AR-API-09` — every ID cited in the Cases column exists   | `tester-api`        | `e2e/architecture/architecture.api.spec.ts`, `e2e/architecture/architecture.api.cases.md`                                                                            | the check expands `…` ranges (U+2026, bare right token) and scans all of `e2e/**/*.cases.md`; a cell citing no IDs — the new row until T10 — is vacuously green, and the row still passes `AR-API-05`, which reads only method, path and guard (`architecture.api.spec.ts:50`); green on T3's table; the control experiment — revert one cell — makes it red, and the report says so                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | T3            |
| T6  | units for `findById` and the normalization                | `tester-unit`       | `apps/api/src/meetings/meetings.service.spec.ts`, `e2e/regression/meetings-detail/meetings-detail.unit.cases.md`, `package.json`, `e2e/README.md`                    | `pnpm test:meetings-detail` prints a **non-zero** passed count; every title starts with its `MD-UT-` ID; the script is `pnpm -r test -t "MD-UT-"`; `e2e/README.md`'s "What lives where" table gains **two** rows — the `api` pair, and the `vitest` row for `meetings-detail.unit.cases.md` run by `pnpm test:meetings-detail`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | T1, T4        |
| T7  | `MEETING_KEYS` and the two key-set assertions             | `tester-api`        | `e2e/regression/home-dashboard/home-dashboard.api.spec.ts`, `home-dashboard.api.cases.md`                                                                            | `MEETING_KEYS` is the five-key sorted array; `HD-API-01` and `HD-API-20` green; the prose at `cases.md:46` names five keys; no other case in either file is edited                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | T1 (∥ T8, T9) |
| T8  | `PROTECTED_ROUTES` and `SEC-API-09`                       | `tester-security`   | `e2e/security/security.api.spec.ts`, `e2e/security/security.api.cases.md`                                                                                            | the entry's path is the literal `/meetings/:id`; `AR-API-06` green; `SEC-API-09` also walks the by-id route and still compares id **sets**; `pnpm e2e:security` green                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | T1 (∥ T7, T9) |
| T9  | the seed mirror and `SM-API-03`                           | `tester-api`        | `e2e/fixtures/seed.ts`, `e2e/smoke/seed.api.spec.ts`, `e2e/smoke/seed.api.cases.md`                                                                                  | the fixture carries all seven arrays; the body type carries `participants?: string[]`; the case compares, per title, the API's array against the fixture's **for the teacher's five meetings** — `SM-API-03` requests meetings as `teacher` and `student` only (`seed.api.spec.ts:42,61`), and widening it to the two mutating sandboxes would race with the cases that create meetings there; changing one of those five fixture arrays makes it red                                                                                                                                                                                                                                                                                                                                                                                                                                        | T1 (∥ T7, T8) |
| T10 | merge task on the shared contract file                    | `implementer-api`   | `docs/api-contract.md`                                                                                                                                               | the `GET /meetings/:id` Cases cell enumerates the IDs `meetings-detail.api.cases.md` actually declares; `AR-API-09` green over the whole table                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | T3, T4, T5    |
| T11 | ledger and backlog                                        | `tester-acceptance` | `docs/CHANGELOG.md`, `docs/BACKLOG.md`                                                                                                                               | four rows at the next free IDs: an `FT-` for the feature, an `FX-` for the Cases-column drift and an `FX-` for the duplicated route listing (both "Found by: research sweep of this change"), and a `BL-` for the two id formats with "Conflicts with" filled; `BL-007`'s cell loses the README clause; `pnpm e2e e2e/ledger` green                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | T1-T10        |
| T12 | acceptance                                                | `tester-acceptance` | `e2e/README.md` ("Run economics" only; the index rows are T6's)                                                                                                      | one green `pnpm verify` on a clean tree with no `pnpm dev` running, reported with numbers; `regression-verify` followed; every control experiment named; **`e2e/README.md`'s "Run economics" updated from that run** — the e2e and file counts, the units count and a fresh measurement date, since this change adds a 13th e2e file and nothing machine-checks those figures (`FX-027`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | T11           |

**Parallelism and worktrees.** Two sets are genuinely parallel: T2 beside T1, and T7/T8/T9 after T1 —
file-disjoint, no product code, no server runs. **No worktree split is needed:** one implementer owns
`apps/api`, the web change is one line, and Playwright runs once, in T12, with `pnpm dev` stopped —
`ADR-0012` bites when two agents run the application at once. The two shared files are sequenced, not
shared: `docs/api-contract.md` through the T10 merge task, and `e2e/README.md` through T6 (index
rows) before T12 (the measurements).

## 5. Risks

- **T1 lands in one commit with T3, T7 and T8.** Three gates fire the moment the controller carries a
  guarded `@Get(':id')`: `AR-API-05` until the Routes table has the row (T3), `AR-API-06` until
  `PROTECTED_ROUTES` has the literal path (T8), the key-set assertions until `MEETING_KEYS` is five
  keys (T7). Nobody "fixes" another role's file to close that window: the four are staged together.
- **`AR-API-09` (T5) rides the same commit**, because the corrected cells are T3's. A green first run
  is suspicious — more likely the parser matched nothing; the revert-one-cell experiment tells them
  apart. The new row's cell stays empty until T10, hence "an empty cell is vacuously green".
- **A missed copy site is invisible over HTTP.** Three of the four already exist and look correct;
  the constructor's `{ ...seed }` shares the module-level seed array, and the symptom surfaces later
  as cross-case contamination rather than as a failure in T1's own work.
- **`pnpm test:meetings-detail` is green with zero tests** (spike row 5), so a mistyped `MD-UT-`
  title looks like success. Only a non-zero pass count proves the filter.
- **Two cases docs may name `meetings.service.spec.ts` only while the prefixes differ.** An `HD-UT-`
  ID in the new doc breaks `suite-integrity` rule 7.
- **The seed strings are constrained, not decorative** (§3): a collision with a seeded login or with
  `SECRET_MARKERS` fails `HD-API-01` / `SEC-API-01` far from where it was typed.

## 6. Assumptions and deliberate omissions

- **A1 — `durationMinutes` stays** exactly as shipped (lead ruling). Removing it would take
  `HD-API-13`, `HD-API-20` and the documented default of 60 with it.
- **A2 — the bounds, 20 entries and 1-100 characters,** are chosen rather than requested; `ADR-0017`
  marks the numbers revisable in the contract without a superseding record.
- **The two id formats are not fixed here** (lead ruling): a `BL-` row only, and `data-model.md:31`
  stays verbatim. Design §4's entity table reproduces the code; it is not the text the document gets.
- **No web surface:** no page, no DAL function, no Server Action, no `PROTECTED_PAGES` change. T2's
  mirror type is anti-drift, not a surface.
- **No functional pair** in `e2e/regression/meetings-detail/` — three files (design §2). Rules 1-3 of
  `suite-integrity` are pairing rules, not existence rules.
- **No backfill** of the already-missing validation cases for `title`, `startsAt` and
  `durationMinutes` (design §8) — named so it is not re-found as a defect of this change.
- **Response-time equality** of the two 404s is not attempted; `ADR-0018` equalizes body, status and
  code path only.
- **Two of the seven fixture arrays stay unguarded** — `planner`'s and `organizer`'s: `SM-API-03`
  reads only `teacher` and `student`, and those two are mutating sandboxes (T9). A decision, not a gap.
- **`docs/adr/README.md` needs no edit** (the three rows are present and `accepted`), and ledger IDs
  are not pre-assigned here: T11 takes the next free numbers.
