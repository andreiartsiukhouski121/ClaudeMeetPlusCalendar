# Research — tests

Which checks already guard the planning process, and which of them a folder-per-change would
disturb.

## Cases already covering the area

| Case        | File                                        | What it actually asserts                                                                                |
| ----------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `PR-API-01` | `e2e/process/process.api.spec.ts`           | every `TEMPLATE*.md` in `docs/plans/` has section 0 with the five labels, in order                      |
| `PR-API-02` | `e2e/process/process.api.spec.ts`           | every discovered template appears in the `TEMPLATES` list inside `check-orientation.mjs`                |
| `AR-API-07` | `e2e/architecture/architecture.api.spec.ts` | every `.claude/agents/*.md` declares `name`, `description`, `tools`, `model`; name matches the filename |
| `AR-API-08` | `e2e/architecture/architecture.api.spec.ts` | every `implementer-*`/`tester-*` role named in the `team-roles` skill exists on disk                    |
| `LG-API-*`  | `e2e/ledger/ledger.api.spec.ts`             | the shape of `CHANGELOG.md` and `BACKLOG.md`                                                            |

## What a folder per change would break

- `AR-API-08` collects role names by the regex ``/`([a-z]+(?:-[a-z]+)+)`/g`` and then keeps only
  names starting with `tester-` or `implementer-`. New role families (`researcher-…`, `designer`,
  `research-reviewer`, `design-reviewer`) would **not** be collected — the case would keep passing
  while covering less. That is a silent loss of coverage, the failure mode
  `e2e/suite-integrity.api.spec.ts` calls "vacuously green" in its prefix-registration test.
- Suite rules 1–3 in `e2e/suite-integrity.api.spec.ts` apply to `e2e/**` only, so documents under
  `docs/plans/` are outside them. New **cases** would need a registered prefix:
  `KNOWN_CASE_PREFIXES` currently holds `AL`, `HD`, `SM`, `SEC`, `LG`, `PR`, `AR` — `PR` already
  covers the planning process, so new process cases reuse it.
- `check-orientation.mjs` would stop seeing plans that moved into a subdirectory — see
  [code.md](code.md), `activePlans()`.

## Where coverage stops

- **No case checks that a plan's content matches anything.** `PR-API-01` and `PR-API-02` check the
  templates and the checker's registration; `check-orientation.mjs` checks section 0 is filled in
  substance. Nothing checks what a plan says.
- **Not found:** any check over `docs/` other than the ledger, the templates and the ADR log.
  Searched `e2e/**` for `docs/` references.
- **Not found:** any existing test of the agent definitions' behaviour — `AR-API-07` checks their
  frontmatter, nothing checks that a dispatched role obeys its boundaries. Searched
  `e2e/architecture/architecture.api.spec.ts`.

## Fixtures and data

None of the process meta-tests uses `e2e/fixtures/seed.ts`; they are `node:fs` checks in the `api`
project, so they start no browser and mutate no data — `e2e/process/process.api.spec.ts` header
comment.
