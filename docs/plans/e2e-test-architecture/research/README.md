# Research: e2e-test-architecture

> The index of the research stage. Created by `pnpm change:new <slug>`, filled by the `researcher`
> agent before any design exists. The area files next to it (`code.md`, `contract.md`, `tests.md`,
> `history.md`, `probes.md`) are written by the research subagents.
>
> **One rule governs this whole folder: record only what is in the project, never what you concluded
> from it.** Every statement carries a citation — `path:line`, a document section, a case ID, a
> `FT-`/`CH-`/`FX-`/`BL-`/`ADR-` ID, or a commit. Anything you cannot cite goes under
> **Open questions** or `- **Not found:** …` instead. "Nothing in this repository covers X" is a
> finding, often the most valuable one.

## Requirement, as received

The owner, via `lead`, 2026-10-21 (feature flow, full path chosen explicitly). Settled decisions, as
handed over; research records what exists that bears on each:

1. Playwright workers: 7 in `playwright.config.ts` (14-core machine; `FX-052` was CPU load during
   first compiles). Ports 3100/3101 stay.
2. UI login only where login is the subject: auth-login functional cases keep exactly one positive
   UI-login scenario plus the negatives; every other test logs in through the API.
3. A browser pool of 10 seeded users dedicated to browser tests, with Playwright storage state. Each
   test scans the list from the first, takes the first free user and marks it busy; with no saved
   state it logs in through the API, builds the session and saves state under that user, else the
   browser starts with that state; at test end (pass or fail) the user is freed, state kept. Workers
   are separate processes, so busy/free needs a cross-process mechanism; a test must be able to take
   two users (foreign owner).
4. The httpOnly `ps_session` cookie is built from the API token instead of a UI login. Guard: the
   single positive UI-login case asserts the real cookie matches what the pool builds.
5. Every test cleans up the data it created through the API (`DELETE /meetings/:id`,
   `DELETE /meetings/:id/files/:fileId`, `FT-010`; `withCleanup` is the start). Mutation-sandbox
   users (`planner`, `organizer`, `eraser`) likely become unnecessary — delete `eraser`;
   `teacher`/`student` hold exact-count baselines. Facts likely to retire: `FACT-3125`, `FACT-3126`,
   `FACT-3131`, `FACT-3580`.
6. A new ADR: every flow through the UI exactly once, in the test that checks it; elsewhere via API
   calls from the test; a separate API layer in e2e (one module per domain) receiving today's
   `e2e/fixtures/*.api.ts`. Contradicted ADR facts superseded/retired per `ADR-0022`.
7. Migrate all existing tests (functional, accessibility, security, journeys, API specs where
   cleanup/login apply). Expectations stay; steps change.
8. Warm-up `e2e/fixtures/warm-up.ts` (`FX-052`): removed only if measurement under the new scheme
   shows it unneeded, using the reproduction in `docs/plans/web-e2e-flake/`.
9. Retire `FACT-3642` and the same words in `docs/security.md`; close `BL-068`.

## Questions asked of the project

The record of what was looked for — including what came back empty. A question with no answer is
kept, not deleted.

| #   | Question                                                                                                                                            | Area              | Answered in                                                  | Outcome                                                                                        |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| 1   | What are the exact name, flags, path, lifetime and value of `ps_session`, and how does the web app validate it?                                     | code, contract    | `code.md` §1, `contract.md` "Session cookie", `probes.md` P1 | found                                                                                          |
| 2   | Is a cookie built from the `POST /auth/login` token accepted by the web app?                                                                        | probe             | `probes.md` P1                                               | found: accepted                                                                                |
| 3   | What does `POST /auth/login` return, and how long does the token live?                                                                              | code, contract    | `code.md` §2, `contract.md` "Session cookie"                 | found; the token lifetime has no keyed value                                                   |
| 4   | What do `e2e/fixtures/**` export, who imports them, and what reasons do the fixtures give for UI login?                                             | code              | `code.md` §3                                                 | found                                                                                          |
| 5   | What do `workers`, `globalSetup`, projects and `storageState` look like in `playwright.config.ts` and `e2e/`?                                       | code              | `code.md` §4                                                 | found; no `7`, no global `storageState`                                                        |
| 6   | Which users does the seed hold, and is there a pool of 10 or an API that creates users?                                                             | code, contract    | `code.md` §5, `contract.md` §4–5                             | 5 users; no pool; no create-user route                                                         |
| 7   | Does every API write have a DELETE, and do the DELETEs return a user to the seed total?                                                             | code, probe       | `code.md` §6, `probes.md` P4                                 | found: yes, for `total`                                                                        |
| 8   | Is there a cross-process lock in the repo, and is `mkdirSync` / `openSync('wx')` atomic on this machine?                                            | code, probe       | `code.md` §7, `probes.md` P2                                 | no lock in the repo; both atomic in the probe                                                  |
| 9   | Does a test-scoped fixture release after a failing test, and how is `storageState` applied per test?                                                | probe             | `probes.md` P3                                               | found                                                                                          |
| 10  | Which specs log in through the UI, by file, case and user?                                                                                          | tests             | `tests.md` §1–2                                              | found: all 5 functional specs plus `warm-up.ts`                                                |
| 11  | Which specs log in through the API?                                                                                                                 | tests             | `tests.md` §3                                                | found                                                                                          |
| 12  | Which cases create data, and which clean up?                                                                                                        | tests             | `tests.md` §4                                                | found                                                                                          |
| 13  | Which seeded user does each spec use, and which exact counts depend on which user?                                                                  | tests             | `tests.md` §5                                                | found                                                                                          |
| 14  | Which meta-tests would a new directory, a moved fixture or a new file trip?                                                                         | tests             | `tests.md` §6                                                | found                                                                                          |
| 15  | What are the current "Run economics" figures?                                                                                                       | tests, history    | `tests.md` §7, `history.md` §4                               | found                                                                                          |
| 16  | How is `FX-052` reproduced?                                                                                                                         | tests             | `tests.md` §8                                                | found: a load procedure, with no deterministic red spec                                        |
| 17  | Which keyed facts and ADRs cover isolation, sandboxes, baselines, the cap, the cookie and workers?                                                  | contract          | `contract.md` §1–2                                           | found; workers, warm-up and `storageState` have no key                                         |
| 18  | Does any fact, ADR or invariant require UI login in tests or forbid cookie injection?                                                               | contract          | `contract.md` §6                                             | **not found** as a key; the reasoning is only in code comments (`code.md` §3)                  |
| 19  | What does `docs/security.md` say about "no delete" and the file cap?                                                                                | contract          | `contract.md` §3                                             | found; unkeyed                                                                                 |
| 20  | Is a test-only reset endpoint allowed?                                                                                                              | contract, history | `contract.md` §5, `history.md` §1c                           | refused (`FACT-3128`, `FACT-3584`, `docs/BACKLOG.md:123`)                                      |
| 21  | What do the backlog, the changelog and the Rejected table say?                                                                                      | history           | `history.md` §1–2                                            | found                                                                                          |
| 22  | When did the sandbox users, `auth.fixture.ts`, `warm-up.ts` and `workers` arrive?                                                                   | history           | `history.md` §3                                              | found; the commit that added `storageState` to `auth.fixture.ts` was **not found**             |
| 23  | Do previous plans mention an API login, a user pool or `storageState`?                                                                              | history           | `history.md` §5                                              | found: `delete-meetings-and-files.plan.md:19-20` names it as the follow-up                     |
| 24  | Is there an `e2e/journeys/`, an `e2e/api/` or any `*.integration.spec.ts`?                                                                          | tests             | `tests.md` "Not found"                                       | **not found**                                                                                  |
| 25  | Has any run measured 7 workers, a pool, or cleanup?                                                                                                 | history, probe    | `history.md` §4, `probes.md`                                 | **not found**                                                                                  |
| 26  | Who cites each fact the change would retire or touch (`FACT-3125`, `3126`, `3131`, `3580`, `1071`, `1073`, `1037`, `1085`, `1086`, `1087`, `3642`)? | contract (re-run) | `contract.md` §7                                             | found: a per-key table of files and lines; `docs/facts-lock.json` holds an entry for every key |

## Sweeps

All four ran on their definition's default model. No sweep was re-run as a sweep.

**Re-run after the research review (2026-10-21).** The four blockers and the one-line nits of the research review verdict (`docs/profiling/verdicts/2026-10-21-e2e-test-architecture-feat-g1-a9600313.md`) were answered by `researcher` (`opus`) directly, with no sub-dispatch: every `path:line` in `code.md` and `tests.md` re-opened against HEAD `548195c` and re-pointed; the `planner` Not-found replaced (below); contradiction 4 corrected; `contract.md` §7 (the per-key citer table) added; `history.md` §3d, §6a and its `FACT-3642` count corrected, and its gaps answered by other sweeps marked in place. Each changed file carries a re-run note at its top.

| Subagent              | Model    | Scope                                                                                                 | File                   | Converged after                                                                                                                                              |
| --------------------- | -------- | ----------------------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `researcher-code`     | `sonnet` | the cookie, the login, `e2e/fixtures/**`, the config, the seed, the write routes, locks; probes P1–P4 | `code.md`, `probes.md` | 23 tool calls; 4 probes run; 7 Not-found lines                                                                                                               |
| `researcher-contract` | `sonnet` | keyed facts, 11 ADRs, `docs/security.md`, the seed in the corpus against the code, the routes         | `contract.md`          | 23 tool calls; about 75 keys; 9 Not-found lines. Beyond the named ADRs it read only the index titles, and it did not open `FACT-3150` or `FACT-3002` in full |
| `researcher-tests`    | `sonnet` | every spec and case doc under `e2e/`, the meta-tests, the README baseline, the `FX-052` reproduction  | `tests.md`             | 31 tool calls; 16 spec files; 10 Not-found lines                                                                                                             |
| `researcher-history`  | `haiku`  | the backlog, the changelog, git history of the fixtures and config, profiling, earlier plans          | `history.md`           | 25 tool calls; 8 Not-found lines                                                                                                                             |

## Contradictions found

Each is stated with both sides. None is resolved here.

1. **Sandboxes: two or three.** `FACT-3126` (in `ADR-0007`) names `planner` and `organizer`.
   `FACT-1087` names three, adding `eraser` (`contract.md` D2).
2. **Not a contradiction — a state that bears on retirement** (relabelled on the re-run). `FACT-3125`,
   `FACT-3126` and `FACT-3131` are stated in `ADR-0007`, which is superseded, and none of them is in
   its retired register. `ADR-0027` carries them forward as unchanged in `FACT-3593` and `FACT-3580`
   (`contract.md` D1). The register and `FACT-3593` agree that the keys still stand.
3. **Exact counts in mutating cases.** `FACT-1076` allows exact counts over a meeting the case
   created itself. `e2e/README.md:237` forbids "absolute counter assertions in `@mutating` cases",
   and `FACT-3131` states no exception (`contract.md` D3). `e2e/README.md:230-231` carries the same
   exception as `FACT-1076` ("A listing over a meeting the case made itself also has an exact expected
   count rather than a relative one"), so `e2e/README.md` also disagrees with its own line 237.
4. **"A feature with no delete."** `FACT-3642` (`ADR-0029`) and `docs/security.md` say this, while
   `FACT-2128`, `FACT-2129` and `FACT-2132` state that delete exists (`contract.md` D4). `BL-068`
   records the same contradiction and counts "ten living citations" (`docs/BACKLOG.md:29`); the
   repository grep in `contract.md` §7 finds exactly ten living citing files outside `ADR-0029`, plus
   `docs/facts-lock.json:4076`. (The first pass set `history.md`'s six `docs/`-only hits against
   `BL-068`'s ten; that count is superseded and the comparison withdrawn.)
5. **No reset endpoint, but uneven cleanup.** `FACT-3584` refuses a test-only reset endpoint.
   `e2e/README.md:239-246` describes older mutating cases that do not clean up next to newer ones
   that clean up through `DELETE` (`contract.md` D6). `tests.md` §4 lists which cases are which.
6. **The fixture's reason, and what the probe did and did not test.** `e2e/fixtures/auth.fixture.ts:8-12`
   says a hand-built cookie "would duplicate production session logic and go red or green at the
   wrong moments". `probes.md` P1 found the real cookie to be the raw Nest JWT with fixed
   attributes, and the cookie built from the API token was accepted, on one run at HEAD. The two
   statements are about different things: P1 shows acceptance today; the fixture's claim is about a
   hand-built cookie drifting from production over time, which P1 does not test (see Still unknown). `e2e/fixtures/warm-up.ts:17-20`
   gives a separate reason for a real browser login: lazily loaded code in `loginAction`'s success
   branch.
7. **README test counts.** `e2e/README.md:321` records 173 e2e tests, while the timing table at
   `e2e/README.md:335` says "all 167" (`tests.md` §7).
8. **Workers against the requirement.** `playwright.config.ts:31` has
   `workers: isCI ? 1 : undefined`, and the requirement says 7. This is the current value, not a
   promise: no keyed fact covers workers (`contract.md` D5, "Facts in the corpus and gaps").

## Still unknown

- **Not found:** a keyed value for the API JWT lifetime. `FACT-3044` ties the cookie to
  `JWT_EXPIRES_IN` without a value, `FACT-1029` gives the cookie 1 h, and `'1h'` appears only in
  `apps/api/src/config/auth.config.ts:13` (`contract.md`). Searched the corpus by key.
- **Not found:** how a claimed slot behaves when the worker holding it is killed (a stale lock).
  P2 did not cover it (`probes.md`).
- **Not found:** any run at 7 workers. No profiling record or probe gives the CPU load that `FX-052`
  attributes its flake to at that worker count (`history.md` §4, `probes.md`).
- **Not found:** whether database state beyond `total` returns to the seed after the DELETEs, such
  as ids and sequences. P4 compared `total` only (`probes.md`).
- **Not found:** ten seeded users. The seed holds five (`code.md` §5), and the API has no route that
  creates a user (`contract.md` §5).
- **Not found:** cleanup of UI-created data in any functional spec. HD-FN-07, MF-FN-05, MF-FN-06
  and MF-FN-15 create meetings and do not clean up (`tests.md` §4).
- **Not found:** a keyed fact for the warm-up, `storageState`, or a cross-process busy/free
  mechanism (`contract.md` "Facts in the corpus and gaps").
- **Not found:** an `e2e/journeys/` or `e2e/api/` directory, or any `*.integration.spec.ts`
  (`tests.md`). The meta-test rules that a new directory under `e2e/` would meet are quoted in
  `tests.md` §6.
- **Not found:** the commit that first added `storageState` to `auth.fixture.ts` (`history.md`).
- **Found on the re-run (replaces a false Not-found):** two keyed facts record that `planner` also
  holds a read-only fixture. `FACT-1071` (`docs/data-model.md:162`): "mutation sandbox for
  `*.api.spec.ts`, plus one never-mutated fixture meeting"; `FACT-1073` (`docs/data-model.md:175`):
  `mtg-planner-2` is "`SEC-API-11`'s fixture". `e2e/README.md:231-233` says the same. SEC-API-11
  and SM-API-03 read it through `HEADER_SAFETY_MEETING` (`tests.md` §4). Citers of both keys:
  `contract.md` §7.
- **Not found:** a test of whether a cookie built by hand diverges from the one `loginAction` sets
  as the code changes over time — the risk `auth.fixture.ts:8-12` names. P1 compared the two once
  (`probes.md`).
- **Not found:** a stated lifetime for saved browser state across tests, runs or worktrees. What
  exists: the JWT default `'1h'` (`apps/api/src/config/auth.config.ts:13`; `auth.api.ts:17` notes it
  against the 60 s test timeout), the cookie's 1 h (`FACT-1029`), state files in `outputDir` "wiped
  between runs anyway" (`auth.fixture.ts:32-34`), and `FACT-3221` (two runs in one tree share the
  `storageState` files by name).
- **Not found:** the full text of `FACT-3150` and `FACT-3002`, and the full text of every ADR beyond
  those named. The contract sweep read only the index titles (`contract.md`).

### `history.md` gaps answered by other files

`history.md` ran on `haiku`. Four of its "not read" or Not-found items are answered elsewhere, and are marked in
place in `history.md`:

- the current `workers` value — `code.md` §4 and `tests.md` §7 (`playwright.config.ts:31`);
- `FACT-1087` — quoted in `contract.md` §1 (`docs/data-model.md:189-191`);
- `docs/security.md:92` — quoted in `contract.md` "The ten-file cap" and §3;
- the full set of `FACT-3642` citations — `contract.md` §7.
