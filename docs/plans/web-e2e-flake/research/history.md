# Research: history of the web-project e2e flake (BL-058)

Sweep: history. Slug: `web-e2e-flake`. Record only what the project states; each line cites its ID or commit.

## Already built

- `FT-008` (`f6fa71d`, 2026-10-14): `meeting-files` migrated to ports and adapters. Its row records the web flake: "runs 2 and 3 a web-project load/first-compile flake, failures moving between `MF-FN-07`/`09`/`12` and `AL-FN-02`/`04` while `apps/web` and `auth` are" untouched.
- `FT-009` (`7569c52`, 2026-10-16): `meetings` migrated to ports and adapters (`ADR-0035`). The CHANGELOG row does not name `BL-058`; the profiling record `docs/profiling/runs/2026-10-16-meetings-clean-architecture.md` says "`BL-058` extended".
- `CH-` entries touching the e2e server, workers or timeouts: **Not found** — searched `CHANGELOG.md` for `playwright.config`, `webServer`, `workers`, `next dev`, `next start`, `start:e2e`, `flak`, `timeout`, `worktree`, `scrypt`.
- `FT-` or `CH-` entries naming ports 3100/3101 or scrypt cost: **Not found** — same search.
- Commit-level history of the config: see Recent changes.

## Already broken here

- `FX-030` (`7126d8a`, 2026-09-16), found by "acceptance run": "The skills' troubleshooting missed the 'project `web` red on `fetch failed`, ports clean' failure: a hung `@playwright/test` from a previous run holds its `webServer` half up".
- `FX-033` (`48d9256`, 2026-09-28), found by "T4 run of `meetings-detail-participants` (`HD-API-14`, `pnpm e2e --project=api`, `Expected: 2, Received: 4`)": `fullyParallel: true` let one file's inserts land inside another file's count window; fixed by title-based assertions, 5 consecutive `api`-project runs green.
- `FX-011` (`e622344`, 2026-09-08), found by "pipeline audit": `SEC-API-05` "flaked in about half the runs (2.518 against a threshold of 2.5)". Not the web project; cited as the only other timing flake row.
- `FX-049` (`7aa3872`, 2026-10-13), found by "CI on `main`, `ACC-FN-03`": its control experiment ran `pnpm e2e --project=web --grep "ACC-FN-0[356]" --repeat-each=5 --workers=1`, 15/15 red with overrides reverted.
- `BL-058` (`docs/BACKLOG.md` line 33, Open, P2, area `e2e`) — the flake itself; recurrences recorded in `docs/profiling/runs/2026-10-14-clean-architecture-pilot.md` (line 135) and `docs/profiling/runs/2026-10-16-meetings-clean-architecture.md` (lines 107, 161).

## Deferred

`BL-058` (P2, e2e). Full row, quoted briefly:

- Problem: "A web-project load flake in `pnpm verify`" — run 2 `MF-FN-12` "received Next's 13,156-byte HTML 404" on "its first `next dev` compile (`next.js: 2.5s`)"; run 3 `AL-FN-04`, "login alert not visible within 10 s"; "Cause not found: first-compile latency of a route under `next dev` and load from `fullyParallel` are candidates, neither confirmed".
- Needs: "a reproduction: a repeat of `pnpm verify` on one tree with the `next dev` compile timings logged".
- Conflicts with: "no; any fix touches the `webServer` or worker settings in `playwright.config.ts`, where the 3100/3101 ports stay (`CLAUDE.md`)".

Other Open or Closed rows on flakes, `next dev`, `next start`, build-based e2e, workers, timeouts, warm-up, or scrypt cost: **Not found** — searched `BACKLOG.md` (Open and Closed) for `flak`, `next dev`, `next start`, `timeout`, `warm`, `scrypt`, `workers`, `fullyParallel`, `worktree`, `3100`, `reuseExisting`, `stale`.

- `BL-013` (P3, process): "Tooling for a worktree per agent: creation, ports, teardown", Conflicts "no" — the only worktree-tooling row.

## Rejected

- `docs/BACKLOG.md` Rejected, row "A global `fullyParallel: false` to remove races": "It would slow the whole suite down for the sake of five mutating cases. The races are solved by dedicated owners, a `serial` block and relative counters". This is the only Rejected row touching the Playwright configuration.
- Rejected rows on e2e server mode (`next start`, build-based e2e), workers, or warm-up: **Not found** — searched the Rejected section in full.
- Rejected row "Moving the seed's plaintext password out of `users.seed.ts`": mentions `scrypt` ("The database already stores only `scrypt` hashes"); no rejection of a scrypt cost change.

## Decisions

- `ADR-0008` (accepted) "Playwright at the root, on dedicated ports, owns the contract": `FACT-3143` "Playwright starts its own servers on 3100 (web) and 3101 (api) and owns them"; `FACT-3144` `E2E_WEB_PORT` / `E2E_API_PORT` shift the pair; Context `FACT-3141` "A `next start` sitting on 3000 serves a stale build, so a Playwright run reusing it goes green on code that does not work."
- `ADR-0012` (accepted) "Parallel agents are isolated by git worktree, never by port": `FACT-3220` "Next 16 registers its dev server per project directory, not per port"; `FACT-3229` "One agent per application in one tree — `next dev` is the blocker"; `FACT-3233` worktree tooling is `BL-013`.
- `ADR-0027` (accepted) "PostgreSQL via Prisma, run by docker-compose": `FACT-3568` `webServer` entries are awaited in array order, each until its `url` answers; its Consequences state that reusing a running server means the reset "silently does not happen", a shape "already applies to `JWT_SECRET` under `reuseExistingServer`".
- `ADR-0007` (in-memory store): "because Playwright runs both projects in parallel against one store" (`FACT-1071`).
- `ADR-0009` (accepted): `FACT-3164` "Password hashing is `node:crypto.scrypt` with a constant-time comparison." No cost parameter is stated in any ADR: **Not found** — searched `docs/adr/` for `scrypt`, `cost`, `N=`.
- No ADR decides or rejects a `next start` or build-based e2e server: **Not found** — searched `docs/adr/*.md` for `next start`, `next build`, `next dev`, `webServer`, `workers`, `fullyParallel`, `reuseExisting`.
- No ADR forbids changing `workers`, `fullyParallel`, `timeout` or `reuseExistingServer`: **Not found** — same search. The prohibition on moving ports to 3000/3001 is stated in `CLAUDE.md` ("Do not move `playwright.config.ts` to 3000/3001"), not in an ADR.

## Recent changes

Commits touching `playwright.config.ts` (`git log --follow --oneline`, 6 commits):

- `18b27f6` feat: store meetings in PostgreSQL via Prisma and add file attachments (adds `start:e2e` and the api `reuseExistingServer: false`; `-S "reuseExistingServer"` and `-S "start:e2e"` both hit it)
- `58ac94f` chore: second tuning round — test design, TDD and an integration level
- `39e9e0c` chore: whole project migrated to English and comments condensed
- `7126d8a` chore: аудит скилов — сняты противоречия и дубли, добавлен skills:sync
- `36e83b4` chore(e2e): каркас регрессионного сьюта и план двух фич (T0) (`-S "webServer"` hit)
- `fe07cfe` chore: baseline монорепозитория (web + api + e2e-каркас) (`-S` hits for `workers`, `fullyParallel`, `timeout`, `next start`, `reuseExistingServer`, `webServer`)

Strings searched with `git log -S -- playwright.config.ts`: `workers` → `fe07cfe` only; `fullyParallel` → `fe07cfe` only; `timeout` → `fe07cfe` only; `next start` → `fe07cfe` only; `next dev` → no commit; `reuseExistingServer` → `18b27f6`, `fe07cfe`; `webServer` → `36e83b4`, `fe07cfe`.

Current values in `playwright.config.ts` (read at HEAD): `fullyParallel: true` (line 28); `workers: isCI ? 1 : undefined` (line 31); `timeout: 60_000` (line 33); `expect: { timeout: 10_000 }` (line 34); web entry `command: \`pnpm dev --port ${WEB_PORT}\``(line 76) with`reuseExistingServer: !isCI`(line 84); api entry`pnpm start:e2e`(line 93) with`reuseExistingServer: false` (line 110).

## Not found

- **Not found:** a Rejected or Deferred entry for a build-based (`next build` + `next start`) e2e server — searched `docs/BACKLOG.md` (all sections), `docs/CHANGELOG.md`, `docs/adr/`.
- **Not found:** any `CH-` process entry on the e2e server mode or on workers — searched `docs/CHANGELOG.md` for `CH-` rows with `webServer`, `workers`, `next dev`, `flak`.
- **Not found:** an ADR or FACT stating a warm-up step for `next dev` — searched `docs/adr/` and `docs/` for `warm`, `first compile`, `cold`. The only warm-up text is in `e2e/README.md` "Run economics" (below).
- **Not found:** a `BL-058` reference in `docs/CHANGELOG.md` — searched the file for `BL-058`.

## E2E README (one line)

`e2e/README.md` does not mention `workers`. It mentions flakes at line 124 (`fixtures/console.ts`: "Without the filter the console cases flake") and line 150 (`pnpm e2e --grep-invert @mutating  # flake diagnosis`), and warm-up at lines 332-333 ("The spread is warm-up **and** now the database: `.next`, Nest's `tsc` and the `prisma generate`").
