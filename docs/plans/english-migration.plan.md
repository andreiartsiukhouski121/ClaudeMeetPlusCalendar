# Plan: english-migration

The whole project switches to English: documents, skills, code comments, test titles, UI strings,
API messages and the seed. Comments are compressed at the same time — the customer called them
bulky and excessive.

## 0. Orientation: what the project already has

- **Duplicate:** no matches. Nothing in the ledger concerns language: `CH-010`…`CH-013` are about
  the structure of the documents, not their language, and no `FX-` entry mentions translation. This
  is the first pass over the language of the repository.
- **Conflicts with shipped:** wide but shallow. Nothing changes in behaviour except the **strings**
  the user sees, and those change deliberately. The dangerous part is the places where Russian text
  is a contract between files, and all of them have to move in one commit: the four section 0
  labels and the brush-off list in `check-orientation.mjs` plus both templates and
  `process.api.spec.ts`; the `**Not automated:**` marker in `suite-integrity.api.spec.ts`; the
  `## Rejected` heading split in `ledger.api.spec.ts`; every UI locator in the functional specs
  against the labels in the components; `e2e/fixtures/seed.ts` against `users.seed.ts` and
  `meetings.seed.ts`. Invariants 1–19 keep their meaning; invariant 15 gains a note that the email
  is trimmed and the password is not, which was already true.
- **Conflicts with planned:** no matches. `BL-009` (time zone from the profile) is adjacent —
  the display locale moves from `ru-RU` to `en-GB` here, but the pinned `timeZone: 'UTC'` and cases
  `HD-UT-10`…`HD-UT-12` are untouched, so the item stays exactly as open as it was.
- **Open questions:** whether the user-visible layer was in scope was genuinely ambiguous — the
  request listed "comments, skills, instructions" and then "everything you find in Russian". Asked
  the customer: the whole project, UI included. The degree of compression was asked at the same
  time: hard, but keep the "why".

The Rejected section of the backlog does not contain this task.

## 1. Spike: how the risky assumptions were proven

| Assumption                                                | How it was proven                              | Fact                                                             |
| --------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------- |
| The volume is comparable to a feature                     | `grep -rlP '[\x{0400}-\x{04FF}]'`              | 131 files, ~7800 lines: 41 `.md`, 66 `.ts`, 9 `.tsx`, 5 `.mjs`   |
| Russian text is nowhere a machine-readable contract       | reading the checker, meta-test and ledger spec | **False**: four such places, listed in section 0                 |
| The `**Not automated:**` marker is actually used          | `grep -rn` over `e2e/`                         | Used nowhere but the README — translating it is safe             |
| Functional locators are role-based rather than text-based | `grep -rnoP "getBy\w+\(" e2e`                  | Role and label, so the labels move with the components           |
| Archived plans are half the markdown                      | `wc -l` over `docs/plans/`                     | 4087 of ~8000 lines are archive and audit                        |
| Python heredocs survive backslashes in this shell         | applying a patch with `\n` inside              | **False**: backslashes collapse; patches go through script files |

## 2. Contract

Endpoint shapes, status codes and error body structure are unchanged. What changes is the **text**
of two messages: `Invalid email or password` (401) and `Authentication required` (401). Both are
constants exported from the API and asserted against in the specs, so they move together.

## 3. Data

The seed keeps its ids, dates, durations, owner distribution and counts. Only the human-readable
values change: four user names and seven meeting titles, mirrored in `e2e/fixtures/seed.ts` in the
same commit. `SM-API-02`/`SM-API-03` are exactly what catches a mismatch.

## 4. Tasks

| ID  | What to do                                                                              | Files                                                                       | Done when                                       | Depends on |
| --- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------- | ---------- |
| E1  | The orientation machinery: labels, brush-offs, both templates, `process.api.spec.ts`    | `scripts/check-orientation.mjs`, `docs/plans/TEMPLATE*.md`, `e2e/process/*` | `pnpm check:orientation` green                  | —          |
| E2  | `apps/api`: comments, messages, seed, unit specs                                        | `apps/api/**`                                                               | `pnpm --filter @purpleschool/api test` green    | —          |
| E3  | `apps/web`: comments, UI strings, Server Actions, unit specs, CSS comments              | `apps/web/**`                                                               | `pnpm --filter @purpleschool/web test` green    | —          |
| E4  | The e2e suite: fixtures, specs, locators, `.cases.md`                                   | `e2e/**`                                                                    | `pnpm e2e` green                                | E2, E3     |
| E5  | The ledger and its coupled parsers (`## Rejected`, the commit column)                   | `docs/CHANGELOG.md`, `docs/BACKLOG.md`, `e2e/ledger/*`                      | `pnpm e2e e2e/ledger` green                     | —          |
| E6  | Configs and scripts: eslint, playwright, husky, CI, gitattributes, mcp, ledger scripts  | root configs, `scripts/**`, `.github/**`                                    | `pnpm lint` and `pnpm typecheck` green          | —          |
| E7  | Skills: three own ones and four adapters                                                | `.claude/skills/**`                                                         | No Cyrillic; the cross-references still resolve | E1–E6      |
| E8  | Project documents: three `CLAUDE.md`, three `README.md`, `e2e/README.md`, `security.md` | the documents listed                                                        | No Cyrillic                                     | E7         |
| E9  | The archive: `pipeline-audit.md`, both `feature-plan-*.md`, three `plan-review-*.md`    | `docs/`, `docs/plans/`                                                      | No Cyrillic; the archive banners stay           | E8         |
| E10 | The `CH-014` ledger entry                                                               | `docs/CHANGELOG.md`                                                         | `pnpm e2e e2e/ledger` green                     | E1–E9      |
| E11 | Acceptance: `pnpm format`, one `pnpm verify`, PR, merge                                 | —                                                                           | `pnpm verify` green; CI green                   | E10        |

Parallelism is impossible here even in principle: E2 and E3 change strings that E4 asserts on, and
E1 changes the contract every plan file depends on. Everything runs sequentially in one tree.

## 5. Risks

- **A half-translated contract breaks a check silently.** The dangerous direction is not a red test
  but a green one: if a template label is renamed without the checker, orientation stops being
  verified and says nothing. Mitigation: E1 goes first and is covered by `PR-API-01`/`PR-API-02`,
  which already exist.
- **UI text and locators drift apart.** A changed button name with an unchanged
  `getByRole({ name })` gives a red test, which is the loud and safe failure; the quiet one would be
  a `getByText` that still matches something else. Mitigation: the counter and the empty state are
  asserted by exact strings, and the whole suite runs in E11.
- **The date format changes with the locale.** `ru-RU` → `en-GB` changes the rendered string;
  `HD-UT-10` asserts on fragments (`2026`, `12`, `23:30`), which survive, and the pinned UTC stays.
- **Compression can delete the "why".** The rule for this pass: an explanation that names a defect,
  an invariant or a measured fact stays; a retelling of history, a repeated fact and a
  paragraph-long justification go.

## 6. Assumptions and deliberate omissions

- **Git history is not rewritten.** Commit messages stay in the language they were written in;
  from `CH-014` onward they are English. The `git-commit` adapter is changed accordingly.
- **The archived plans are translated rather than deleted or summarized.** Deleting them was
  already rejected in the backlog, and heavy compression would be deletion by another name: they
  record why decisions came out as they did.
- **`docs/pipeline-audit.md` keeps its numbers as they were measured**, including the ones later
  superseded. It is a dated record, not a live document.
- **No i18n framework is introduced.** The project becomes English-only rather than multilingual;
  adding `next-intl` for a two-page demo would be a second architecture for no reader.
