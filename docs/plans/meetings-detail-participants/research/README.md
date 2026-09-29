# Research: meetings-detail-participants

> The index of the research stage. Created by `pnpm change:new <slug>`, filled by the `researcher`
> agent before any design exists. The area files next to it (`code.md`, `contract.md`, `tests.md`,
> `history.md`) are written by the research subagents.
>
> **One rule governs this whole folder: record only what is in the project, never what you concluded
> from it.** Every statement carries a citation — `path:line`, a document section, a case ID, a
> `FT-`/`CH-`/`FX-`/`BL-`/`ADR-` ID, or a commit. Anything you cannot cite goes under
> **Open questions** or `- **Not found:** …` instead. "Nothing in this repository covers X" is a
> finding, often the most valuable one.

## Requirement, as received

From a screenshot of a target API sketch supplied by the user. Transcribed as received, not
interpreted:

- `POST /meetings` — create a meeting. Accepts `title`, `date`, `participants[]`
- `GET /meetings` — list all meetings of the current user
- `GET /meetings/:id` — get one meeting by ID. Return 404 if not found

The orientation handed to this stage also named three things to **verify rather than assume**: that
`apps/api/src/meetings/` already ships `POST /meetings` and `GET /meetings`; that the create DTO
takes `title`, `startsAt`, `durationMinutes?` and no `participants`; and that no `GET /meetings/:id`
exists. All three were re-derived with citations by the sweeps and are recorded in `code.md` §1 and
§4 and `contract.md` §1-2 — they are findings of this stage, not inherited premises.

There is no written requirements document, ticket or spec for this change in the repository.

- **Not found:** a requirements source for this change beyond the transcribed sketch above —
  searched `docs/plans/meetings-detail-participants/` (only the three scaffolded templates from
  `pnpm change:new`), `docs/BACKLOG.md` and `docs/CHANGELOG.md` for `participants`, `detail`,
  `by id`, `:id` (`history.md`, Not found §1-2).

## Clarifications from the requester

Answers given by the user **after** the sweeps ran and **before** the research review, in response
to three of the **Still unknown** items below. They are requirement input, not findings of this
stage: their citation is this conversation, not the project. Recorded here so the designer inherits
them as given rather than re-asking.

| Resolves | Question put to the user                                                               | Answer                                                                                                                     |
| -------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| #1       | Is the sketch's `date` the existing `startsAt`, or a rename?                           | **The existing `startsAt` stays.** The sketch is a sketch; the published contract and the ~10 cases resting on it are not. |
| #2, #3   | What does an element of `participants[]` hold?                                         | **Free-form strings** — names or emails. Not user ids, not objects. No relation to the `User` entity.                      |
| #4       | What does `GET /meetings/:id` answer for a meeting that exists but belongs to another? | **404, indistinguishable from a non-existent id** — no enumeration oracle, in the spirit of invariant 6.                   |

Not put to the user and therefore still an assumption for the design stage to state as one: the
sketch omits `durationMinutes`, which the shipped `POST /meetings` already accepts as optional
(**Still unknown** #1, second half). Nothing was asked about removing it.

## Questions asked of the project

The record of what was looked for — including what came back empty. A question with no answer is
kept, not deleted.

| #   | Question                                                                                           | Area              | Answered in                       | Outcome                                                                                                                                                                                                                                                                                                         |
| --- | -------------------------------------------------------------------------------------------------- | ----------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1  | What routes does `MeetingsController` actually declare, with which HTTP codes and guards?          | code              | `code.md` §1 (controller)         | **Answered.** Exactly two: `@Get()` (`meetings.controller.ts:25`), `@Post()` (`:38`), class-level `@UseGuards(JwtAuthGuard)`                                                                                                                                                                                    |
| Q2  | What is the internal `Meeting` entity vs. the outward `MeetingDto`, field for field?               | code, contract    | `code.md` §1, `contract.md` §5-6  | **Answered.** `Meeting = {id, ownerId, title, startsAt, durationMinutes}` (`meeting.types.ts:5-11`); `MeetingDto = Omit<Meeting,'ownerId'>` (`:17`)                                                                                                                                                             |
| Q3  | Does `participants` exist anywhere — code, corpus, tests, seed, backlog?                           | all four          | all four files, Not found lines   | **Empty.** Zero occurrences outside this change folder's own slug                                                                                                                                                                                                                                               |
| Q4  | Is the sketch's `date` the existing `startsAt` under another name?                                 | code, contract    | `code.md` §6, `contract.md` §10   | **Empty — no document equates them.** No field named `date` exists anywhere; `startsAt` is used end to end. Carried to **Still unknown** #1                                                                                                                                                                     |
| Q5  | Does any Nest controller in this repo have a route parameter (`:id`, `@Param`)?                    | code              | `code.md` §4                      | **Empty — this would be the first.** All five route decorators in `apps/api/src` are parameterless                                                                                                                                                                                                              |
| Q6  | Does anything in `apps/api` throw or import `NotFoundException`?                                   | code              | `code.md` §4                      | **Empty.** Zero matches in `apps/api/src`                                                                                                                                                                                                                                                                       |
| Q7  | Is a 404 body shape documented anywhere in the corpus?                                             | contract, tests   | `contract.md` §3, `tests.md` §1   | **Empty in the corpus, but not in the suite — narrowed on blocker B1.** The error-shapes table (`docs/api-contract.md:34-39`) has 400 ×2 and 401 ×2 and no 404. `SEC-API-06` nonetheless pins a 404 body's key set in a `.cases.md` (`security.api.cases.md:85-86`) and asserts it (`security.api.spec.ts:227`) |
| Q8  | What does Nest 12's `NotFoundException` body actually look like?                                   | probe             | `probes.md` B                     | **Answered by probe.** With a message: 3 keys, `message` a **string**. With no argument: 2 keys, no `error` key                                                                                                                                                                                                 |
| Q9  | Does any DTO or entity in `apps/api` validate or hold an array field?                              | code              | `code.md` §5                      | **Empty — this would be the first.** Only hit is a local test variable in `auth.service.spec.ts:48`                                                                                                                                                                                                             |
| Q10 | What does `class-validator` do for an array field under this repo's exact pipe options?            | probe             | `probes.md` A                     | **Answered by probe.** 14 cases run; invariant 2 confirmed for arrays; `@IsOptional()` lets an explicit `null` through                                                                                                                                                                                          |
| Q11 | Would `GET /meetings/:id` collide with the existing routes, and what does a non-UUID `:id` do?     | probe             | `probes.md` C, D                  | **Answered by probe.** No collision observed; without a pipe `:id` arrives as an arbitrary raw string                                                                                                                                                                                                           |
| Q12 | Which existing assertions break if a field is added to `MeetingDto`?                               | tests             | `tests.md` §2                     | **Answered.** Exactly two: `home-dashboard.api.spec.ts:102` (`HD-API-01`) and `:408` (`HD-API-20`), both `Object.keys(...).sort()` against `MEETING_KEYS`                                                                                                                                                       |
| Q13 | Is `total` (invariant 4) affected by adding a field?                                               | tests             | `tests.md` §2                     | **Answered.** `total` is asserted as a value at three levels (`HD-UT-03`, `HD-API-05`, `HD-FN-03`); no key-set assertion involves it                                                                                                                                                                            |
| Q14 | What do the meta-tests require of a new route or a new spec file?                                  | tests, contract   | `tests.md` §3, `contract.md` §1   | **Answered.** `AR-API-05` diffs the Routes table against controllers both ways; `suite-integrity` rules 1-8 (naming, pairing, ID registration)                                                                                                                                                                  |
| Q15 | Which case-ID prefixes exist, and is one registered for this change?                               | tests             | `tests.md` §5                     | **Answered / partly empty.** `KNOWN_CASE_PREFIXES` = `['AL','HD','SM','SEC','LG','PR','AR']` (`suite-integrity.api.spec.ts:43`); none for this change                                                                                                                                                           |
| Q16 | Does any case anywhere assert a 404?                                                               | tests             | `tests.md` §1 (security), §4      | **Answered — corrected on review blocker B1.** `SEC-API-06` asserts a 404 body's key set is exactly `['error','message','statusCode']` (`security.api.cases.md:80-86`, `security.api.spec.ts:210-229`, assertion at `:227`), for a 404 from an **unknown path**. No case asserts a 404 from a meetings route    |
| Q17 | Where does `POST /meetings` validation coverage stop today?                                        | tests             | `tests.md` §4                     | **Answered.** Only missing-required (`HD-API-15`) and extra-field (`HD-API-16`, `SEC-API-07`); no case for `title` bounds, non-ISO `startsAt`, range                                                                                                                                                            |
| Q18 | What do `PROTECTED_ROUTES` and `PROTECTED_PAGES` currently hold?                                   | tests             | `tests.md` §1 (security)          | **Answered.** `PROTECTED_PAGES` is `['/']`; the route list is transcribed verbatim in `tests.md`                                                                                                                                                                                                                |
| Q28 | Is cross-user reachability covered by a case today?                                                | tests             | `tests.md` §1 (security), §4      | **Answered — added on review blocker B1.** `SEC-API-09`, P0, `@p0` (`security.api.cases.md:105-112`, spec `:259-281`): two users' meeting `id` sets must not intersect. Its own text says it "must hold once new resources appear" (`:111-112`)                                                                 |
| Q29 | Does the corpus state anything about one user reaching another's data?                             | contract          | `contract.md` §11                 | **Answered — added on review finding F2.** `docs/security.md:26` names owner spoofing and another user's token as threats, with `ownerId` from the signed token and `forbidNonWhitelisted` as the countermeasures                                                                                               |
| Q30 | What form do this project's identifiers take?                                                      | contract, code    | `contract.md` §5                  | **Answered — added on review finding F3.** `docs/data-model.md:54` requires opaque prefixed strings (`usr-`, `mtg-`), never numbers. The store mixes two formats: seed ids are `mtg-teacher-1`-style, `create()` uses `randomUUID()`                                                                            |
| Q19 | Which web code consumes meetings, and would a detail page have anywhere to land?                   | code              | `code.md` §3                      | **Answered.** One DAL function `getMeetings` (`dal.ts:71-90`), one Server Action, no `[id]` route anywhere under `apps/web/src/app`                                                                                                                                                                             |
| Q20 | Was a single-meeting / detail / by-id endpoint ever proposed, deferred or rejected?                | history           | `history.md`, Deferred + Rejected | **Empty.** No backlog row and no Rejected entry names it. `BL-007` covers editing and deleting, not reading one                                                                                                                                                                                                 |
| Q21 | Were participants / attendees / invitees ever proposed, deferred or rejected?                      | history           | `history.md`, Not found §1        | **Empty.** No record anywhere                                                                                                                                                                                                                                                                                   |
| Q22 | Which ADRs constrain the meetings module, the contract shape, error shapes, validation or mapping? | history, contract | `history.md`, `contract.md` §8    | **Answered.** `ADR-0002`, `ADR-0005`, `ADR-0006`, `ADR-0007`, `ADR-0015` quoted; the other eleven listed as not bearing                                                                                                                                                                                         |
| Q23 | Does any ADR address array fields, participants modelling, or parameterised routes?                | history           | `history.md`, Not found §7        | **Empty.** None of the sixteen                                                                                                                                                                                                                                                                                  |
| Q24 | Which `FX-` entries have already sprung traps in this area?                                        | history           | `history.md`, Already broken      | **Partly empty.** `FX-027` (corpus drift) is the only `FX-` cited; the `@IsOptional()` misses were caught in review, not shipped                                                                                                                                                                                |
| Q25 | Which of the nineteen `CLAUDE.md` invariants bear on this area?                                    | contract          | `contract.md` §9                  | **Answered.** 2, 4, 5, 8, 16 quoted and tied to an artifact                                                                                                                                                                                                                                                     |
| Q26 | Does a guard run before a `:id` handler, i.e. does an unknown id leak 404 to an anonymous caller?  | probe             | `probes.md` E                     | **Answered by probe.** The guard's 401 was returned; the handler never ran                                                                                                                                                                                                                                      |
| Q27 | Is there more than one place in the repository listing the API's routes?                           | assembly          | Contradiction C3 below            | **Answered.** Yes — `apps/api/README.md:12-20` holds a second list that no meta-test reads                                                                                                                                                                                                                      |

## Sweeps

Which subagent ran, on which model, over what. A thin file from a cheap model is a different fact
from a thin file from an expensive one — the first is fixable by re-running.

| Subagent              | Model    | Scope                                                                                                                                                                        | File          | Converged after                                                                                                                                                                                                                                                       |
| --------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `researcher-code`     | `sonnet` | all of `apps/api/src/meetings/**`, `app.module.ts`, every `apps/web` consumer; repo-wide greps for `:id`, `@Param`, `NotFoundException`, `IsArray`, `date`, `participants`   | `code.md`     | 15 files read + 2 repo-wide greps returning no new files; 357 lines, 6 `Not found` markers                                                                                                                                                                            |
| `researcher-contract` | `sonnet` | `docs/api-contract.md`, `docs/data-model.md`, `docs/architecture.md`, `docs/adr/**`, `CLAUDE.md` invariants, `architecture.api.spec.ts`                                      | `contract.md` | 13 files read (`docs/security.md` added on review finding F2); 379 lines, 5 `Not found` markers                                                                                                                                                                       |
| `researcher-tests`    | `sonnet` | `e2e/regression/home-dashboard/**` (all 5 files), `e2e/security/**`, `e2e/smoke/**`, `e2e/suite-integrity.api.spec.ts`, `e2e/architecture/**`, `e2e/fixtures/**`, unit specs | `tests.md`    | 16 `HD-API-*`, 13 `HD-FN-*`, 13 `HD-UT-*` cases enumerated; 400 lines, 4 `Not found` markers. **Two cases were missed on the first pass** (`SEC-API-06`, `SEC-API-09`) and added on review blocker B1; a cluster of `path:line` pointers was re-derived on blocker B2 |
| `researcher-history`  | `haiku`  | `docs/CHANGELOG.md`, `docs/BACKLOG.md` (incl. Rejected), `docs/adr/**`, `git log` over the meetings area                                                                     | `history.md`  | 241 lines, 7 `Not found` markers. **Edited by the `researcher` on assembly** — see the note at its top                                                                                                                                                                |
| `researcher` (probes) | `opus`   | throwaway Nest 12 app in the session scratchpad against this repo's own installed dependencies                                                                               | `probes.md`   | 5 probes, 29 requests (A×14, B×2, C×9, D×3, E×1), all output transcribed; 197 lines                                                                                                                                                                                   |

Notes on the models, per the protocol's requirement to record them:

- The three `sonnet` sweeps each came back with line-level citations throughout and were not
  re-run. **Two of the three were corrected after the `research-reviewer` gate** — see the round
  below; the `sonnet` code sweep was the only one the gate found nothing in.
- The `haiku` history sweep came back **with five lines of inference** ("Bearing on this area: a
  detail endpoint … must be callable from `lib/dal.ts`", and four more of that form) and **missed
  two backlog rows** (`BL-019`, `BL-021`). Rather than re-run it on a larger model, the `researcher`
  removed the five inference lines and added the two rows with citations; the edit is declared in a
  note at the top of `history.md`. The retrieval it did do — ADR quotations, `FT-002`, `BL-007`,
  `BL-009`, the Rejected section, the git log — was checked against the files and stands.
- The probes were run by the `researcher` rather than by a sweep because they produce evidence that
  does not exist in the repository and therefore belongs to no sweep's area.

### Review round: what the `research-reviewer` gate changed

The gate returned **accept after blockers**. What was fixed, so a later reader can tell which
statements in this folder survived a first pass and which were corrected:

| ID  | What the gate found                                                                                                                                                                                                        | What changed                                                                                                                                                                         |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| B1  | "No 404 assertion exists at any level" was **false**; `SEC-API-06` and `SEC-API-09` were never swept. The test sweep grepped `security.api.spec.ts` but not its paired `.cases.md`, and the spec contains no literal `404` | `tests.md` §1 gained both cases in full; §4's 404 bullet and the `Not found` line were restated; `README` Q7 and Q16 corrected; new contradiction **C5**; Still unknown #4 rewritten |
| B2  | A cluster of `path:line` pointers in `tests.md` §1-§3 pointed at the wrong lines — most sharply, `HD-API-13`'s assertions cited `:339-343`, which is `HD-API-16`'s body                                                    | All re-derived against the files: 6 pointers in §1, 1 in §2, 8 in §3. The substance of §2 was re-derived by the gate itself and stands                                               |
| F1  | `BL-023` unlisted                                                                                                                                                                                                          | Added to `history.md` with its "Conflicts with" cell                                                                                                                                 |
| F2  | `docs/security.md` was in no sweep's scope                                                                                                                                                                                 | Swept; `contract.md` §11 added                                                                                                                                                       |
| F3  | The identifier-format rule was not recorded                                                                                                                                                                                | `contract.md` §12 added; Still unknown #6 sharpened                                                                                                                                  |
| F4  | Two off-by-one citations                                                                                                                                                                                                   | Corrected in `README` C1 and `tests.md` §1                                                                                                                                           |
| F5  | Probe C rows claimed the handler received a given raw string; the transcript shows that for only one row                                                                                                                   | The four rows narrowed to what was printed; the bullet below them left as it was                                                                                                     |
| F6  | Sweep line counts and the probe request count were under the real figures                                                                                                                                                  | Recounted: 357 / 379 / 400 / 241 / 197 lines, 29 requests                                                                                                                            |
| F7  | Still unknown #1-#4 did not point at the requester's answers                                                                                                                                                               | Cross-marked; the answers stay labelled requirement input, not findings                                                                                                              |

The gate verified the raw probe transcripts character for character and independently confirmed C1
and C3; those are unchanged.

## Contradictions found

Where a document and the code disagree. Both sides, with citations — **named, not resolved.**
Resolving one is a decision, and decisions belong to the design stage. If a document is simply
wrong, that is a defect for the lead to route.

### C1 — the Routes table cites four case IDs that do not exist

- **Document side.** `docs/api-contract.md:26` gives `GET /meetings` the cases `HD-API-01`…`12`, and
  `:27` gives `POST /meetings` the cases `HD-API-13`…`20`. Read as ranges, that is twenty cases.
- **Suite side.** `grep -o 'HD-API-[0-9]*' e2e/regression/home-dashboard/home-dashboard.api.cases.md | sort -u`
  returns **sixteen** IDs: `01`…`10`, `13`…`17`, `20`. The numbers `11`, `12`, `18`, `19` exist in
  neither the cases file nor the spec (the same grep over `home-dashboard.api.spec.ts` returns the
  identical sixteen).
- **A third side, in the archived reviews.** `docs/plans/plan-review-3.md:143` states
  "`HD-API-01…10`, `13…18`. Numbers `11`, `12` merged into `HD-API-10`, `19` unused", and
  `docs/plans/plan-review-1.md:254` records `HD-API-19` being cut as a duplicate of `AL-API-15`
  (`:255` is the adjacent `HD-API-18` row).
  Those describe a case `HD-API-18` as present; it is not in the cases file today.
- **Nothing checks this.** `AR-API-05` compares only the Method/Path/Guard cells against the
  controllers (`e2e/architecture/architecture.api.spec.ts:615-620`); the `Cases` column is not
  compared to anything.

### C2 — the corpus states a rule about 400 bodies that a 400 reachable in Nest 12 does not follow

- **Document side.** `docs/api-contract.md:41`: "**`message` is an array on a 400 and a string on a 401.** Do not write a client that assumes one shape." Invariant 8 in `CLAUDE.md` says the same.
- **Probe side.** `probes.md` D2/D3: a `@Param('id', ParseUUIDPipe)` rejection on
  `@nestjs/common` 12.0.1 returns
  `{"message":"Validation failed (uuid is expected)","error":"Bad Request","statusCode":400}` — a
  **400 whose `message` is a string**.
- **Scope of the disagreement.** No route in this repository produces that body today: `code.md` §4
  records zero `@Param` usages in `apps/api/src`. The two sides therefore do not conflict over any
  current response; they conflict over the rule's generality.

### C3 — two route listings exist, and only one is checked

- **Side A.** `docs/api-contract.md:22-27` — the Routes table, diffed against the controllers in
  both directions by `AR-API-05` (`e2e/architecture/architecture.api.spec.ts:615-620`). It gives
  `GET /meetings` errors `400`,`401` and `POST /meetings` errors `400`,`401`.
- **Side B.** `apps/api/README.md:12-20` — a second Endpoints table. Its `GET /meetings?limit=` row
  reads "`200 {items, total}`; `400` when `limit` is outside `1..100`" and its `POST /meetings` row
  reads "`201 MeetingDto`; `400` on payload". **Neither row mentions `401`**, which side A lists for
  both.
- **Nothing checks side B.** `grep -rn "api/README" e2e/` returns no matches, and the architecture
  spec's file constants are `docs/adr/README.md`, `docs/api-contract.md`,
  `e2e/security/security.api.spec.ts`, `.claude/agents`, `apps/api/src` and
  `.claude/skills/team-roles/SKILL.md` — `apps/api/README.md` is not among them
  (`e2e/architecture/architecture.api.spec.ts:23-28`).
- **The backlog already expects side B to move.** `docs/BACKLOG.md:43`, `BL-007`: "**yes:**
  `PROTECTED_ROUTES` and the endpoint list in `apps/api/README.md` will need extending".
- `FX-023` and `FX-027` (`docs/CHANGELOG.md`) are both entries about a rule living in more than one
  copy.

### C4 — `@IsOptional()` and an explicit `null`

- **Document side.** `CLAUDE.md`, Nest invariant 2: "Any **optional** DTO field must carry
  `@IsOptional()`. Without it a missing field still runs through `@IsInt`/`@Min`/`@Max` and gives
  400". The invariant addresses a **missing** field only.
- **Probe side.** `probes.md` A11: with `@IsOptional() @IsArray() @IsString({each:true})` and a body
  of `{"title":"t","participants":null}`, `class-validator` 0.15.1 answered **201** and `null`
  reached the handler. A10 shows an absent field arrives as absent; A11 shows an explicit `null`
  arrives as `null`.
- Not a disagreement about a current response — no optional array field exists
  (`code.md` §5) — but the invariant's wording and the library's behaviour cover different cases.

### C5 — a 404 body shape is pinned by a test but absent from the corpus, and Nest's default can miss it

Added on review blocker B1; the first pass reported no 404 assertion anywhere and so never reached
this.

- **Corpus side.** The error-shapes table lists four situations, two 400s and two 401s, and no 404
  (`docs/api-contract.md:34-39`). `contract.md` §3 records that nothing under `docs/` mentions
  `NotFoundException`.
- **Suite side.** `SEC-API-06` states "the body holds only `statusCode`, `message`, `error`"
  (`e2e/security/security.api.cases.md:85-86`) and asserts it for a 400, a 401 **and a 404** in one
  loop: `expect(Object.keys(parsed).sort()).toEqual(['error', 'message', 'statusCode'])`
  (`e2e/security/security.api.spec.ts:227`). The 404 it exercises today is an unmatched path,
  `request.get('/definitely-no-such-route')` (`:214`).
- **Probe side.** `new NotFoundException()` with **no argument** returns
  `{"message":"Not Found","statusCode":404}` — **two** keys, no `error` (`probes.md` B2). With a
  message argument it returns all three (`probes.md` B1). The Express fallback that `SEC-API-06`
  currently hits returns all three (`probes.md` C7).
- The three sides are not reconciled here. What is recorded: the promise exists in a case file
  rather than in the corpus; `SEC-API-06` does not request any meetings route, so it would not
  exercise a handler-thrown 404 as written; and one of the two `NotFoundException` call forms
  produces a body the case's stated expectation does not describe.

No other divergence was found. The contract sweep reports the Routes table, the `MeetingDto` key
set, the seed counts and the mirrors in `apps/web/src/lib/types.ts` and `e2e/fixtures/seed.ts` all
agreeing with each other and with the code (`contract.md`, "Divergence between document and code").

## Still unknown

What remains genuinely open after the sweeps. This section is what the designer inherits as
questions rather than as silence; unknowns that travel unannounced come back as rework.

**Items #1-#4 now have an answer from the requester** — see **Clarifications from the
requester** above. Those answers are requirement input, cited to the conversation and not to the
project; the items are kept here in full because what the _project_ says about each is still what
is written below, and the design stage needs both halves. Cross-marks added on review finding F7.

1. **Whether the sketch's `date` is `startsAt`, a rename of it, or a third thing.**
   **[Answered by the requester — Clarifications, row #1: `startsAt` stays.]** Nothing in the
   project answers this: no field named `date` exists in `apps/api/src` or `apps/web/src`
   (`code.md` §6), and no document equates the two names (`contract.md` §10). The sketch is the only
   place the word appears, and the sketch is a screenshot, not a project artifact. Note that the
   sketch also omits `durationMinutes`, which the shipped `POST /meetings` accepts
   (`create-meeting.dto.ts`, `contract.md` §2) — whether that omission is deliberate is equally
   unanswered.
2. **Whether `participants[]` holds strings, emails, user ids or objects.**
   **[Answered by the requester — Clarifications, row #2/#3: free-form strings.]** No precedent exists:
   no array field anywhere in `apps/api` (`code.md` §5), nothing in `docs/data-model.md`
   (`contract.md` §5), no ADR (`history.md`, Not found §7). The probe used
   `@IsString({ each: true })` because the requirement's brief said `participants[]`, and that
   choice is the probe's, not the project's.
3. **Whether `participants[]` would be a field on `Meeting` or a relation.**
   **[Answered by the requester — Clarifications, row #2/#3: no relation to `User`.]** `docs/data-model.md`
   documents exactly two entities, `User` and `Meeting`, and no join or relation type
   (`contract.md` §5, `history.md` open questions). Whether a participant is a `User` in the seed or
   free text is unaddressed.
4. **What a `GET /meetings/:id` answers when the id exists but belongs to another owner.**
   **[Answered by the requester — Clarifications, row #4: 404, indistinguishable.]** Invariant
   5 fixes where `ownerId` comes from, but says nothing about a by-id authorization check
   (`contract.md` §9). No document chooses 404 or 403, and no case asserts either **for a by-id
   route**. What does exist, corrected on review blocker B1: `SEC-API-09` (P0, `@p0`) asserts that
   two users' meeting id sets do not intersect, and its own case text says it is an invariant that
   "must hold once new resources appear" (`security.api.cases.md:105-112`, `tests.md` §1) — it
   walks the **list** route only. `docs/security.md:26` names "access with another user's token,
   owner spoofing through the body" as a protected-against threat (`contract.md` §11) without
   naming a status code. Probe E establishes only that the guard's 401 precedes the handler for an
   **unauthenticated** caller.
5. **Which 400 shape a malformed `:id` should produce, if any.** Probe C shows that without a pipe
   the handler receives any string; probe D shows `ParseUUIDPipe` produces a string-`message` 400.
   Nothing in the project chooses between them — see contradiction C2.
6. **Whether the seed ids are in a form `ParseUUIDPipe` would accept — and which id format is
   canonical.** Sharpened on review finding F3. `docs/data-model.md:54` requires identifiers to be
   "opaque strings with a type prefix (`usr-`, `mtg-`)", and the store holds two formats at once:
   the seven seeded meetings are `mtg-teacher-1`-style (`meetings.seed.ts:18,25,32,39,46,53,60`)
   while `create()` issues a bare `randomUUID()` (`meetings.service.ts:70`). **No seed id is a
   UUID.** Probe D used a synthetic UUID, not a seed id, so it says nothing about either format
   under the pipe (`contract.md` §12, `probes.md` D).
7. **Which case-ID prefix a meetings-detail feature would use.** `KNOWN_CASE_PREFIXES` is a closed
   list of seven (`e2e/suite-integrity.api.spec.ts:43`) and contains none for this change
   (`tests.md` §5); whether new cases extend `HD-` or open a new prefix is not addressed by any
   convention document.
8. **Whether the four missing `HD-API-` numbers (C1) are free to reuse.** `docs/plans/plan-review-3.md:147`
   records a blocker raised specifically about reusing a deleted case number, and
   `plan-review-3.md:143` and the cases file disagree about `HD-API-18`'s existence.
9. **Whether `ApiFetchOptions.method` being typed `'GET' | 'POST'` (`api-client.ts:82`) matters
   here.** It is a fact from `code.md` §3; whether a detail fetch needs anything outside that union
   is not something research can settle.

## Probes

`probes.md` sits alongside the four sweep files. It is not one of the protocol's four areas: it
records throwaway code run **outside** the repository, in the session scratchpad, against this
repository's own installed dependencies (`@nestjs/common` 12.0.1, `class-validator` 0.15.1,
`class-transformer` 0.5.1, Node v24.14.0) and its exact `ValidationPipe` options copied from
`apps/api/src/app.module.ts:19-26`. Nothing was added to the repository. The command and its printed
output are the citation; where a probe printed nothing about a question, the question appears as a
`Not found` line in `probes.md` or in **Still unknown** above.
