---
name: playwright-verify
description: Verifying ONE change by actually running Playwright — interactively in the browser through MCP and with a spec file in e2e/. Use after editing a file under apps/web or apps/api, and when the user asks "check it with Playwright", "verify this change", "look at it in the browser", "write an e2e test", "run e2e", or reports that a page or an endpoint is broken. For accepting a whole feature, use the regression-verify skill.
---

This is a **quick check of one change**. Accepting a whole feature — every level of checks, a
review of the suite convention, a written report — is the `regression-verify` skill. Neither
replaces the other: mixing them turns the quick check into a ten-minute ritual, and then people
skip it.

A change counts as done only after a green run. Do not report readiness from a diff — a diff does
not show that the page rendered or that the endpoint answered. Check it two ways: with the MCP
browser (see it with your own eyes now) and with a spec file (so the same thing is checked
forever after).

In the team flow this is the `tester-functional` and `tester-api` procedure: they own the specs and
the runs, and they report a failure rather than fixing it (`team-roles`).

Ports, the `127.0.0.1` addresses and the "stop `pnpm dev` before `pnpm e2e`" rule are in
`CLAUDE.md` and are not repeated here. The consequence that matters for the order of work:
**an interactive check and a spec run are mutually exclusive in one tree.** Run the specs first,
then stop them and start `pnpm dev` for the browser — or the other way round, but never both.

## 1. Decide what to check

| What changed                                     | Check                                                                     |
| ------------------------------------------------ | ------------------------------------------------------------------------- |
| `apps/web` — components, pages, styles, routes   | MCP browser + a spec in `e2e/regression/<feature>/*.functional.spec.ts`   |
| `apps/api` — controllers, services, DTOs, routes | a spec in `e2e/regression/<feature>/*.api.spec.ts`, the `request` fixture |
| Both (a feature end to end)                      | both; take the browser scenario all the way to a real API call            |
| Only configs, types, docs, dependencies          | Playwright may be skipped — **but say so out loud**                       |

The last row is not a loophole. A skip is fine when the change physically cannot affect runtime
behaviour. When in doubt, check.

## 2. Make sure the infrastructure is there

```bash
ls playwright.config.ts                        # is the config present?
pnpm exec playwright --version                 # is @playwright/test installed?
```

If something is missing (a fresh clone, a wiped `node_modules`):

```bash
pnpm install
pnpm add -D -w @playwright/test                # root only, never in apps/*
pnpm exec playwright install chromium          # one browser is enough
```

## 3. Check interactively through the Playwright MCP

For any UI change. Start the dev server yourself — MCP does not:

```bash
pnpm dev:web        # :3000, or pnpm dev if the scenario reaches the API
```

The ordinary dev server on :3000 is fine here: you see the page with your own eyes and will notice
at once if it does not reflect your edit. But **make sure it is `next dev` and not `next start`** —
a production server serves a stale build. Who holds the port:

```bash
netstat -ano | grep :3000                                   # take the PID from the LISTENING row
powershell -NoProfile -Command "(Get-CimInstance Win32_Process -Filter 'ProcessId=<pid>').CommandLine"
```

Then with the `browser_*` tools:

1. `browser_navigate` to `http://127.0.0.1:3000` plus the path you need
2. `browser_snapshot` — the accessibility tree; pick the locators for the future spec from it
3. `browser_click` / `browser_type` / `browser_select_option` — walk exactly the scenario your
   change touches, not an abstract smoke test
4. `browser_console_messages` and `browser_network_requests` — console errors and failed requests;
   a silent 500 in a fetch looks like "everything works"
5. `browser_take_screenshot` — attach it to the report if the appearance changed

If the `browser_*` tools are unavailable, the server did not come up — see section 6. Do not
replace this step with "checking it in your head": say the interactive part is unavailable and
leave the checking to the specs.

## 4. Pin it with a spec file

Every behavioural change gets a new or updated spec in `e2e/regression/<feature>/`. The full
convention (filename suffixes and project routing, the paired `.cases.md`, the ID in the title,
tags, robustness and data rules) is in `e2e/README.md`. Do not reinvent locators from there either:
`getByRole`, `getByLabel`, `getByText`; CSS selectors are forbidden.

Three rules that break most often, and what each costs:

- **the filename suffix.** A `.spec.ts` without `.api.` or `.functional.` joins **no** project and
  silently never runs — the run goes green having checked nothing;
- **`await` before `expect(...)`** for async matchers. There is no type-aware lint here, so a
  forgotten `await` passes both lint and the test — and the test is green having checked nothing;
- **no `waitForTimeout`.** Web-first assertions wait up to the config timeout on their own.

```ts
import { expect, test } from '@playwright/test';

test('AL-FN-03 — the user sees the search result', async ({ page }) => {
  await page.goto('/search');
  await page.getByRole('textbox', { name: 'Query' }).fill('algebra');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByRole('list', { name: 'Results' })).toContainText('algebra');
});
```

For the API use the `request` fixture rather than `page`: no browser starts at all. The `api`
project's `baseURL` already points at the right port, so write relative paths:
`request.get('/users')`.

The spec is mandatory because a one-off MCP check does not protect against a regression tomorrow.

## 5. Run it and confirm it is green

```bash
pnpm e2e                        # both projects; starts next dev and nest start itself
pnpm e2e --project=web          # browser only
pnpm e2e --project=api          # HTTP only
pnpm e2e e2e/regression/auth-login/auth-login.functional.spec.ts   # one file
pnpm e2e --grep "AL-FN-03"      # one case by ID
pnpm e2e:report                 # the HTML report after a failure
```

**While reproducing and fixing a defect found during `FEAT-S5`, filter the runs** —
`pnpm test:<feature>`, a `--grep`, or one Playwright project — rather than repeating the full suite
on every iteration of the loop, and run the full `pnpm e2e` **once** to confirm the fix before
handing back. Acceptance's own unfiltered run is unaffected by this and stays where it is, at
`FEAT-S6`: this is about the debug loop inside a stage, not about `CLAUDE.md`'s "who runs what",
which governs `pnpm test` by hand and acceptance.

The full list of run commands is in `e2e/README.md`. The scripts are named `e2e*` rather than
`test:e2e` because `apps/api` has its own `test:e2e` on Vitest + supertest. `pnpm test` is the unit
suite; it does not run Playwright and does not need running by hand (see "Who runs what" in
`CLAUDE.md`).

On a failure read the trace from `pnpm e2e:report` and **fix the code**. Weakening an assertion to
match observed behaviour is allowed only when the assertion really was wrong — and then it must be
said out loud rather than quietly patched before reporting a green run.

Check as well that the test does not always pass: break the behaviour under test in the source,
confirm the run goes red, revert. A test that is green with the feature broken is worse than no
test.

## 6. When something will not start

- **`EADDRINUSE` on 3100/3101** — an orphaned `node` from a previous run holds the port. Find the
  culprit rather than killing everything: `netstat -ano | grep :3100`, then `Stop-Process -Id <pid>`.
  `Get-Process node | Stop-Process -Force` works too but also kills the user's dev servers — warn
  them first.
- **Next prints a ready-made `taskkill /PID <pid> /F`** when two dev servers collide. **Do not run
  it:** that is someone else's server — the user's or a neighbouring agent's. The right answer is to
  stop your own `pnpm dev` or move into your own worktree.
- **Project `web` is red with `[WebServer] ⨯ [TypeError: fetch failed]` while `api` is green** —
  Next could not reach Nest. The ports may be **clean** at that moment: only `TIME_WAIT` in
  `netstat`, nothing `LISTENING`, so the recipe above does not find it. Look for a hung process
  from the run itself:

  ```bash
  powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object { $_.CommandLine -like '*@playwright/test*' } | Select-Object ProcessId"
  ```

  A live `@playwright/test` CLI from a previous, already finished run holds its `webServer` half
  up: kill it and the next run is green with no code change. Observed 2026-09-16 (`FX-030`); the
  causal link is not proven by experiment, but it is checked in seconds and is cheaper than any
  other hypothesis.

- **The run is green although the feature is obviously broken** — almost always a reused foreign
  server. Confirm the tests ran on 3100/3101 and prove it with a control experiment: break the
  behaviour, the run must go red. If it does not, the test is not looking where your code is.
- **The `browser_*` MCP tools never appeared** — `.mcp.json` is picked up only at Claude Code
  startup, so a restart is needed. If they are still missing, the Windows fallback is
  `"command": "cmd", "args": ["/c", "npx", "-y", "@playwright/mcp@latest", "--browser", "chromium"]`.
- **MCP says "browser not found"** — `@playwright/mcp` defaults to the Chrome channel while the
  project installs only bundled chromium. The `--browser chromium` flag in `.mcp.json` is mandatory.
- **webServer times out** — the first `next dev` build fetches `next/font/google` (Geist) over the
  network and will not come up offline. That is a server failure, not a Playwright one. The logs are
  visible because the config sets `stdout: 'pipe'`; do not change it to `'ignore'`.
- **A slow first run** — cold Turbopack plus Nest's `tsc`. The config timeouts (180 s / 120 s) are
  chosen for that and should not be lowered.

## 7. Report concretely

What exactly was checked — the scenario, not "everything works". With what — the MCP browser, a
spec file, or both. The exact command and its result (`3 passed`, not "the tests passed"). A
screenshot if the UI changed. If a check was skipped, why. **Do not write "verified" if no run
happened.**
