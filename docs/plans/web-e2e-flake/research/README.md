# Research: web-e2e-flake

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

Defect `BL-058` (`docs/BACKLOG.md:33`), bugfix flow, full path, stage `FIX-S8`: a web-project load
flake in `pnpm verify` — UI logins time out on `toHaveURL('/')` and the meeting-file download route
answers Next's HTML 404. Steps `FIX-S1`–`FIX-S3` are written down below and in `probes.md`.

**FIX-S1, Orientation** — known defect: `BL-058` (open, P2), recorded on `clean-architecture-pilot`
and recurring on `FT-009` (`docs/BACKLOG.md:33`; `history.md`). No `FX-` entry for it
(`history.md`). **FIX-S2, Reproduction** and **FIX-S3, Cause** — `probes.md`, from this cycle's
hand-backs.

## Questions asked of the project

| #   | Question                                                                  | Area    | Answered in     | Outcome                                                                                                                              |
| --- | ------------------------------------------------------------------------- | ------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Has this flake been fixed or filed before?                                | history | `history.md`    | only `BL-058`; neighbours `FX-030`, `FX-033`, `FX-049`, `FX-011`                                                                     |
| 2   | Does an ADR govern the e2e web server's mode, workers, warm-up?           | history | `history.md`    | `ADR-0008` (`FACT-3143`, ports/ownership), `ADR-0012` (`FACT-3220`), `ADR-0027` (`FACT-3568`); none decides mode, workers or warm-up |
| 3   | Was a `next start` / build-based e2e server tried or rejected?            | history | `history.md`    | **Not found** as a decision or Rejected row; `FACT-3141` (`ADR-0008:12`) records only the stale-`next start`-on-3000 hazard          |
| 4   | Is there a Rejected row on workers / `fullyParallel` / warm-up?           | history | `history.md`    | one: "A global `fullyParallel: false` to remove races" (`docs/BACKLOG.md:116`); none on workers, server mode or warm-up              |
| 5   | What do `playwright.config.ts` workers, timeouts, webServer say?          | code    | `code.md` §1    | `fullyParallel: true`, `workers: isCI ? 1 : undefined`, `expect.timeout: 10_000`, web = `next dev`, `reuseExistingServer: !isCI`     |
| 6   | What do `verify` / `e2e` / CI chain; any build step or workers flag?      | code    | `code.md` §2–3  | no `--workers` anywhere; no `next build` before e2e in CI; `.next` not cached                                                        |
| 7   | How is the password hashed, and who calls it?                             | code    | `code.md` §4    | `scryptSync` in `hashPassword`/`verifyPassword`; login verifies every time (`auth.service.ts:48-51`)                                 |
| 8   | What does the UI-login helper wait on?                                    | code    | `code.md` §5    | `uiLogin` (`e2e/fixtures/auth.fixture.ts:52`) ends in `toHaveURL('/')`, no own timeout                                               |
| 9   | Can the files route handler emit HTML?                                    | code    | `code.md` §6    | no line builds an HTML body; source of the HTML 404 **Not found** in code                                                            |
| 10  | Which web cases log in through the UI helper / hit the files route?       | tests   | `tests.md` §1–2 | `authedPage` in home-dashboard, meeting-files, accessibility, security; files route by MF-FN-07, -09, -12 only                       |
| 11  | Does any test hold `workers`/`fullyParallel`/webServer, or cover warm-up? | tests   | `tests.md` §5–6 | **Not found**                                                                                                                        |
| 12  | What does "Run economics" state?                                          | tests   | `tests.md` §4   | 171 tests, `pnpm verify` 2 min 23 s (2026-10-14, `e2e/README.md:313`); no worker count                                               |
| 13  | Is the scrypt cost stated anywhere in the corpus?                         | history | `history.md`    | **Not found**                                                                                                                        |

## Sweeps

| Subagent             | Model  | Scope                                                                        | File         | Converged after |
| -------------------- | ------ | ---------------------------------------------------------------------------- | ------------ | --------------- |
| `researcher-history` | haiku  | BACKLOG, CHANGELOG, ADR-0008/0012/0027 and others, git log of the config     | `history.md` | first pass      |
| `researcher-code`    | sonnet | `playwright.config.ts`, scripts, CI, `password.ts`, `auth.fixture.ts`, route | `code.md`    | first pass      |
| `researcher-tests`   | sonnet | web-project cases using `uiLogin` / the files route, Run economics           | `tests.md`   | first pass      |
| (researcher)         | opus   | `FIX-S2`/`FIX-S3` hand-backs, counts re-read from `repro\r*.log`             | `probes.md`  | —               |

No contract sweep (per the dispatch). Key history claims spot-checked by the researcher against
`docs/BACKLOG.md:116`, `ADR-0008:12,25`, `ADR-0012:10`, `ADR-0027:26`.

## Contradictions found

- **`FACT-3141`'s source vs the ledger.** `FACT-3141` (`docs/adr/ADR-0008-playwright-contract-source.md:12`)
  names `FX-013` as a source for "a `next start` sitting on 3000 serves a stale build"; `FX-013`
  (`docs/CHANGELOG.md:157`) is about the test-count blocker, and no `CHANGELOG` line contains
  `next start` (`grep`). Named, not resolved.
- **Run economics vs this cycle's run.** `e2e/README.md:313` records 171 tests (2026-10-14); run r2
  of `FIX-S2` passed 173 (`probes.md`). Named, not resolved.

## Still unknown

- Which mechanism inside Next 16.3.8 / Turbopack turns concurrent first compiles under load into a
  sticky HTML 404 (`probes.md`, "Not proven").
- Whether `--workers=2` stays green through fewer concurrent first compiles or through less CPU
  (`probes.md`, "Not proven"); 2 of 2 runs is the whole sample.
- Whether the CI runner sets `CI` (the workflow file sets no `CI=` per `code.md` §3, while
  `playwright.config.ts` branches on `isCI`) — **Not found** in the repository.
- Whether `reuseExistingServer: !isCI` lets a local run reuse a `next dev` already compiled — not
  measured this cycle.
- Whether the CI `verify` job has ever shown this flake — **Not found** in `BACKLOG`/`CHANGELOG`
  (`history.md`).
