# Plan control review (iteration 3)

> **ARCHIVE.** A record of the third review pass over the two first plans, kept for the reasoning
> behind the decisions. Not a source of truth: the live convention is in
> [`e2e/README.md`](../../e2e/README.md), the invariants in [`CLAUDE.md`](../../CLAUDE.md).
> Translated into English in `CH-014` and condensed; every verdict, number and fix is preserved.

A narrow check: were the 12 items of `plan-review-2.md` (**R2**) — NB1–NB4 and NM1–NM8 — closed, and
did the edits break the integrity of `feature-plan-implementation.md` (**IP**) and
`feature-plan-testing.md` (**TP**)? No full review from scratch was done.

Verdicts come from the documents themselves rather than from IP's §11 change log. Three of R2's
four blockers were checked by actual runs against the installed dependencies
(`@playwright/test@1.62.1`, `@nestjs/common@12.0.1`, `class-validator@0.15.1`,
`class-transformer@0.5.1`, `vitest@4.1.11`, `eslint-plugin-playwright@2.11.0`, `pnpm@10.32.1`) — see
§6. The probes lived in a scratchpad; no repository file was changed.

---

## 1. Verdict

**Two blockers remain, and both were created by the edit for NB3.**

All 12 R2 items were applied in substance, and three of the four blockers were closed correctly —
confirmed by runs rather than by reading:

- `pnpm -r test -t "AL-UT-" --passWithNoTests` really does filter (`1 skipped`, exit 0,
  `Scope: 4 of 5`);
- the new fixture scheme from TP §5.5 was assembled in a scratchpad and works —
  `test.use({ authUser: 'organizer' })` inside a `describe` loads, and the login runs once per
  worker and user;
- `CreateMeetingDto` with `@IsOptional()` on real Nest 12 returns `201` with `durationMinutes: 60`
  when the field is absent, and `400 ["durationMinutes must not be less than 15"]` for `5` — exactly
  what IP §2.1 and `HD-API-18` claim.

The arithmetic adds up completely: 53 e2e recounted from the tables (11/10/16/13/3) and 38 UT
(25+13) match the subsection subtotals, the priority breakdown, TP §6.6 and the DoD of all six
tasks. There are no duplicate IDs, no dangling references to deleted IDs in live positions, no
weakened assertions, and `prettier --check` is clean on all three documents.

What blocks execution is two defects in **how** `HD-API-18` was introduced, not the substance of
NB3. First: IP `T2.4` still describes the task as "**15 cases**: `HD-API-01…10`, `13…17`, numbers
`18` and `19` unused", while the DoD of that same task demands `16 passed` — the implementer writes
15 tests and gets a red DoD, which TP §6.6 declares a blocker. Second: number `18` was reused in
violation of TP §2 ("`NN` is **never reused** after a case is deleted"), and the paragraph in TP §3.3
directly below the new case still states that `HD-API-18` was deleted and is not reused. Both are
fixable in place; the texts are in §5.

---

## 2. Closure of review 2

| Item | Verdict                                                                     | Evidence                                                                                                                                                                                                                                             |
| ---- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NB1  | **closed**                                                                  | The script is `"pnpm -r test -t \"AL-UT-\" --passWithNoTests"` without the `--`. Mentions of `pnpm -r test -- -t` survive only in the "do not write it this way" notes. Filtering confirmed by a run (fact 1)                                        |
| NB2  | **closed**                                                                  | TP §5.5: the test option `authUser: ['teacher', { option: true }]` plus the worker fixture `authStateFor: (user) => Promise<string>` returning a **function**. Assembled and run: 5 passed, `test.use` accepted in a `describe` (facts 2–3)          |
| NB3  | **partly closed** — the substance is closed, the wording is broken (B1, B2) | `@IsOptional()` and the `durationMinutes` error-shape line are in IP; the `HD-API-18` case is in TP. The behaviour was confirmed by a probe on real Nest 12 + class-validator 0.15.1 (fact 4). But two paragraphs survive from the previous revision |
| NB4  | **closed**                                                                  | TP lists the six unit spec files with their IDs and separately explains why `auth/password.service.spec.ts` and `meetings/meetings.mapper.spec.ts` do not exist. Matches TP §4.1, IP `T1.4` and `T2.3` item by item                                  |
| NM1  | **closed**                                                                  | Rule 5 gained "except `*.unit.cases.md`, which have no paired spec by rule 3" plus the single recognized marker syntax `- **Not automated:** <reason + task link>`                                                                                   |
| NM2  | **closed**                                                                  | `'playwright/no-page-pause': 'error'` is in both documents, and the step 2 description now matches the actual preset levels. Levels verified (fact 7)                                                                                                |
| NM3  | **closed**                                                                  | TP §6.3 spells out the `SELF_EXEMPT` and `UNIT_SPEC_EXEMPT` exceptions, and §6.4 repeats them for the checklist                                                                                                                                      |
| NM4  | **closed**                                                                  | "The flag is needed because of the empty package, not because of filtering"; "`-t` with no match but with spec files gives `1 skipped` and exit 0". Re-verified by a run (fact 1)                                                                    |
| NM5  | **closed**                                                                  | TP §1.5: "**The test title is renamed on the move**… only the title changes, the logic does not"; IP `T0.6` says the same                                                                                                                            |
| NM6  | **closed**                                                                  | The suite convention row was added to the TP §1.8 table, and the `T0.6` DoD now requires the file count to match. The table gives 7 spec files, which is what `pnpm e2e --list` shows                                                                |
| NM7  | **closed**                                                                  | `HD-FN-08`: "the `ps_session` cookie is absent from the context (if the implementation leaves it with an empty value, the value is strictly empty…)" — the words "or empty" are gone                                                                 |
| NM8  | **closed**                                                                  | IP §2.1: "with a **non-numeric** value three messages arrive, so compare by inclusion rather than equality (verified by probe)"                                                                                                                      |

**Result: 11 of 12 fully closed, 1 partly (NB3).** None left open or closed incorrectly.

---

## 3. Arithmetic

Recounted from the case tables of TP §3 and the lists of §4, not from the stated totals.

| Set                                       | Stated                     | Recounted                                                    | Agrees |
| ----------------------------------------- | -------------------------- | ------------------------------------------------------------ | ------ |
| `auth-login` API (§3.1)                   | 11 (P0 5 / P1 6 / P2 0)    | 11: `01…04`, `07`, `08`, `10`, `11`, `13…15` — 5 / 6 / 0     | yes    |
| `auth-login` functional (§3.2)            | 10 (P0 5 / P1 4 / P2 1)    | 10: `01…06`, `08`, `10`, `13`, `14` — 5 / 4 / 1              | yes    |
| `home-dashboard` API (§3.3)               | 16 (P0 9 / P1 7 / P2 0)    | 16: `01…10`, `13…18` — 9 / 7 / 0                             | yes    |
| `home-dashboard` functional (§3.4)        | 13 (P0 8 / P1 4 / P2 1)    | 13: `01…11`, `14`, `16` — 8 / 4 / 1                          | yes    |
| `smoke` (§3.5)                            | 3                          | 3: `SM-API-01…03`                                            | yes    |
| **e2e total**                             | **53** (11+10+16+13+3)     | **53** definition rows                                       | yes    |
| UT `auth-login` (§4.1)                    | 25 (P0 18 / P1 6 / P2 1)   | 25: `01…11`, `13…15`, `17`, `19…28` — 18 / 6 / 1             | yes    |
| UT `home-dashboard` (§4.2)                | 13 (P0 6 / P1 6 / P2 1)    | 13: `01…11`, `15`, `16` — 6 / 6 / 1                          | yes    |
| **UT total**                              | **38** (25+13)             | **38** definition items                                      | yes    |
| TP §6.6 rows and units                    | 11/10/16/13/3/53; 25/13/38 | match §3.1–3.5; api 27 + web 11 = 38, plus 1 baseline        | yes    |
| DoD of `T1.4`/`T1.5`/`T1.9`/`T2.3`/`T2.9` | 25/11/10/13/13 passed      | all match                                                    | yes    |
| DoD `T2.4`                                | `16 passed`, smoke `3`     | 16 and 3 — **but the task composition says 15** (blocker B1) | no     |
| TP §5.4 "48 read-only cases"              | 48                         | 53 − 5 `@mutating` = 48                                      | yes    |
| Composition of `T2.4`                     | 15, `01…10`, `13…17`       | per TP it must be 16, `01…10`, `13…18`                       | **no** |

Everything reconciles except one cell — the composition row of `T2.4`. The other eight places where
`HD-API-18` had to appear were updated.

---

## 4. Integrity

**No duplicate IDs.** The 53 definition rows in §3 and the 38 items in §4 are unique. The only
collision is not a duplicate definition but the reuse of a deleted case's number: `HD-API-18`
(see B2).

**No dangling references.** All 24 deleted or relocated IDs were checked. Every mention sits in an
explanatory "what happened to these numbers" paragraph, in IP §9/§10/§11, or in the heading of a
receiving case. None appears in a live position — the TP §7 matrix, the §6.6 table, task DoDs, §5.4,
or the risk sections.

**The new `HD-API-18` case** was added to the §7 matrix, to the mutating list in §5.4 and to the
§3.3 subtotal. The §5.4 rules are respected: the dedicated `planner` user, a unique `title`, and
`startsAt` = `2030-01-01T10:00:00.000Z`. It uses no relative counters because it checks no counter
at all, so the §6.3 ban on absolute counter assertions is not violated.

**IP and TP agree** on fixture names, the unit spec tree (nine files, identical paths and ID
ranges), the four ESLint rules, the fate of `seed.api.spec.ts`, which task introduces `SM-API-02`
and `SM-API-03`, and the ten-step pipeline numbering — with the sole exception of the `T2.4`
composition.

**No weakened assertions.** A grep for "acceptable"/"allowed" returns only legitimate uses. In the
expected results of §3.1–3.5 there is no "or"/"either" left; the single match is the literal message
"Invalid email or password" in `AL-API-02`.

**Minor (not a blocker).** After §11 appeared in IP, `docs/plans/README.md` still promises only "the
review 1 change log in §10 there".

---

## 5. Remaining blockers

### B1 — the `T2.4` composition still says "15 cases, `18` unused" while the DoD says `16 passed`

**Evidence.** IP: "Composition — **15 cases** from test plan §3.3: `HD-API-01…10`, `13…17`. Numbers
`11`, `12` merged into `HD-API-10`; `18`, `19` unused." The next line: "DoD:
`pnpm e2e --project=api --grep @home-dashboard` → `16 passed`". TP §3.3 says 16, §6.6 says 16, and
the §7 matrix says `HD-API-13…HD-API-18`.

**Why a blocker rather than a typo.** The task composition is what the implementer writes the spec
from. They will write 15 tests, get `15 passed` and a red DoD, and TP §6.6 declares a count mismatch
a blocker ("either a case is not automated, or an undocumented test appeared"). That is the same
class of failure R2 called a blocker in NB4.

**Fix.** Replace the composition line with: "Composition — **16 cases** from test plan §3.3:
`HD-API-01…10`, `13…18`. Numbers `11`, `12` merged into `HD-API-10`, `19` unused. `HD-API-18` is a
new case from review 2's NB3 (`POST /meetings` without `durationMinutes` → 201 and a default of
60)." The rest of the line (the mutating case rules) stays.

### B2 — the number `HD-API-18` was reused against TP §2, and the §3.3 paragraph contradicts it

**Evidence.** TP §2: "`NN` is two digits and is **never reused** after a case is deleted."
`HD-API-18` was deleted in review 1, and the paragraph **directly below the new case definition**
still reads: "Numbers `11`, `12` (merged into `HD-API-10`), `18`, `19` (deleted in review 1) are not
reused: — `HD-API-18` ("list item shape") — the keys are checked by `HD-API-01` …". R2's NB3 asked
for "the case at a free number", but `18` was not free — an error of the review itself, inherited by
the edit.

**Why a blocker.** First, `home-dashboard.api.cases.md` is built from §3.3 together with that
paragraph, so the file would contain `HD-API-18` twice — rule 6 of §1.6 ("no `.cases.md` holds
duplicate IDs") makes **step 1** of the pipeline red, which blocks every later step. Second, the
document defines a case and denies its existence in one section, and the implementer has nothing but
a guess to resolve that.

**Preferred fix (keeps rule §2).** Renumber the case to `HD-API-20` (the next free number, since 18
and 19 are deleted) and carry the number through six places: the TP case row, the list of five
mutating cases, the §7 matrix, the IP reference "caught by `HD-API-20`", the `T2.4` composition, and
the §11 change log. No number changes anywhere: 16 / 53 / 48 stay as they are.

**Alternative (cheaper but breaks rule §2):** keep `18` and rewrite the paragraph to name the reuse
as an explicit, deliberate exception, adding that exception to §2. Then rule 6 of §1.6 must be made
to ignore IDs inside explanatory paragraphs.

---

## 6. Verified facts

| #   | Claim                                                                   | Result                                                                                                                                                                  | Verdict                                |
| --- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| 1   | `pnpm -r test -t "AL-UT-" --passWithNoTests` filters units by feature   | `Scope: 4 of 5 workspace projects`; `Tests 1 skipped (1)`; exit 0. No literal `--` reaches `vitest`, and the root package is not pulled in                              | **confirmed** (NB1, NM4)               |
| 2   | The TP §5.5 scheme loads: `test.use({ authUser })` inside a `describe`  | `5 passed (1.3s)`, exit 0. Neither "Cannot use({ authUser }) in a describe group" nor "worker fixture cannot depend on a test fixture" appeared                         | **confirmed** (NB2)                    |
| 3   | The login runs once per worker and user                                 | 2 logins for 4 authenticated tests; each state reused by the second test of its group                                                                                   | **confirmed** (NB2)                    |
| 4   | `CreateMeetingDto` accepts a body without `durationMinutes`, default 60 | without the field → `201 … "durationMinutes":60`; `30` → `201 … 30`; `5` → `400 ["durationMinutes must not be less than 15"]`; `481` → `400 … 480`                      | **confirmed** (NB3)                    |
| 5   | Side expectations of the same contract                                  | an extra `ownerId` → `400 ["property ownerId should not exist"]` (`HD-API-16`); an empty object → `400` mentioning `title` and `startsAt` (`HD-API-15`)                 | confirmed                              |
| 6   | `prettier --check` is clean on the three documents                      | `All matched files use Prettier code style!`, exit 0                                                                                                                    | confirmed                              |
| 7   | "These four sit at `warn` in the preset"                                | `no-wait-for-timeout`, `no-skipped-test`, `no-conditional-in-test`, `no-page-pause` = `warn`; `no-networkidle`, `no-focused-test`, `missing-playwright-await` = `error` | confirmed (NM2)                        |
| 8   | 53 e2e and 38 unit cases are defined in TP                              | 53 and 38, no duplicates; the priority breakdown matches the subtotals                                                                                                  | confirmed                              |
| 9   | The `T2.4` composition agrees with TP §3.3                              | IP says "15 cases … `13…17` … `18`, `19` unused" and "`16 passed`"; TP says 16 in two places                                                                            | **refuted** (blocker B1)               |
| 10  | The number `HD-API-18` is free                                          | It is both the new case definition and, seven lines below, "… is not reused". TP §2 forbids reuse                                                                       | **refuted** (blocker B2)               |
| 11  | The `HD-API-18` row is part of the §3.3 table                           | A blank line separates the new row from the table: in GFM it renders as a paragraph with pipes rather than a table row. `prettier --check` does not catch it            | a layout defect; delete the blank line |

---

## 7. What to do next

1. **B1** — rewrite the `T2.4` composition line to 16 cases and the range `13…18` (or `13…17`, `20`
   if the renumbering option is chosen).
2. **B2** — renumber the new case to `HD-API-20` across the six addresses in §5, or name the reuse
   of `18` an explicit exception to rule §2 and rewrite the contradicting paragraph.
3. Remove the blank line so `HD-API-18` lands inside the §3.3 table (fact 11).
4. Minor: mention §11 in the priority rule of `docs/plans/README.md`.

No totals need recomputing afterwards: 53 e2e, 38 UT, 16 in `home-dashboard` API and 48 read-only
cases stay unchanged under either option for B2.
