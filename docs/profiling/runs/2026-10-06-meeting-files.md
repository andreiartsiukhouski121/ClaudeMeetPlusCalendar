# Run 2026-10-06 — `meeting-files`

- **Flow:** `FEAT` · **Ledger:** `FT-007`, `FX-041`, `FX-042`, `FX-043`, `FX-044`, `FX-045`;
  `BL-004` unblocked (not closed), `BL-037` and `BL-038` opened
- **Commit:** `pending` — product code, corpus and ledger are an uncommitted working-tree diff at
  the time of this record
- **Decisions taken:** `ADR-0027` (Postgres through Prisma, supersedes `ADR-0007`), `ADR-0028`
  (`prisma generate` prefixed onto the scripts), `ADR-0029` (file bytes stored in the database) —
  all three written at `FEAT-S2`, before this plan existed
- **Shipped:** the in-memory meetings/users store replaced by PostgreSQL through Prisma behind a
  compose stack with a dedicated, reset-and-reseeded `purpleschool_e2e` database; meeting file
  attachments on top of it — upload, list, download, the built `Content-Disposition` header, the
  ten-file cap, the upload form and detail page in `apps/web`.
- **Recorded at:** `FEAT-S8`, by `tester-acceptance` (task 20 of the plan).

## Reading note — what this record can and cannot measure

This cycle ran **20 plan tasks across roughly 40 agents** (36 dispatches by the orchestrator plus
the researcher's 4 sweeps at `FEAT-S1`) — the largest cycle in this directory by task count, against
7–11 stages/gates for the two prior records. This record is written by the dispatch that closes the
cycle, not by the one that ran it: **every stage's own token/call/wall-clock figure lives in a
hand-back this dispatch never received**, so the per-stage table below is deliberately sparse rather
than estimated (`docs/profiling/README.md`: "an invented figure is worse than a gap"). What this
record states with confidence is what was handed down at the end of the cycle — the ledger IDs, the
`pnpm verify` result and timing, the suite composition, and the qualitative findings below — plus
what this dispatch independently re-counted by reading the tree rather than re-running the suite
(the e2e and unit totals, §"Numbers independently verified").

**This is itself a process finding, stated rather than smoothed over:** if `FEAT-S8` is to carry a
real per-stage token table for a cycle this size, either the orchestrator forwards each stage's
hand-back numbers at dispatch time, or the role continuously present across the whole cycle (`lead`)
writes the table itself, the way its own `FEAT-S6` row already has to be. A cleanup dispatch at the
very end structurally cannot reconstruct 36 dispatches' costs after the fact without re-reading
transcripts this harness does not hand it — which is the same shape of loss `2026-10-03`'s record
hit from an interrupted session, from a different cause.

**Follow-up, same session.** `lead` read the finding above, confirmed it was correct, and supplied
the 36 dispatches' own cumulative token totals from its own context — the thing a cleanup dispatch
structurally could not produce on its own. The table below and the totals in
§"Per-agent totals, summed by script" are filled from that hand-down, not reconstructed by this
dispatch. Two caveats `lead` stated and this record keeps: every figure is **a cumulative total as of
each agent's last completion notice**, and several agents were **resumed after that notice** — so
every number here is a **lower bound**, not an exact figure, and is presented as one throughout. The
figures were summed by a script (`node sum-tokens.mjs`, reproduced in §"Per-agent totals") rather
than by hand, because a mental sum is exactly the failure mode this cycle already hit twice (the
designer's own key count, design §6/§7) — a profiling record whose headline number is a mental sum
would be the same mistake wearing a bigger total.

## Per stage

Tokens are **cumulative totals as of each agent's last completion notice, lower bounds** — several
agents were resumed after that notice and their true cost is higher. No agent-time/call figures were
supplied alongside them, so that column still reads "not available"; wall-clock was never part of
what `lead` held.

| ID         | Stage / gate                                                   | Role                                                 | Tokens (lower bound)                                                                                     | Agent-time                                | Outcome                                                                                                                                    |
| ---------- | -------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `FEAT-S1`  | Research                                                       | `researcher` + 4 sweeps                              | **260,021**                                                                                              | not available                             | accepted after `FEAT-G1`                                                                                                                   |
| `FEAT-G1`  | Research review                                                | `research-reviewer`                                  | **192,839**                                                                                              | not available                             | verdict not available to this dispatch                                                                                                     |
| `FEAT-S2`  | Design (+3 ADRs)                                               | `designer` (one agent, resumed ~20 times)            | **549,941**                                                                                              | not available                             | accepted after `FEAT-G2`; produced `ADR-0027…0029` and the retirement analysis that missed twice (design §7)                               |
| `FEAT-G2`  | Design review, full pass                                       | `design-reviewer`                                    | **195,866**                                                                                              | not available                             | first pass                                                                                                                                 |
| `FEAT-G2`  | Design review, narrow re-run                                   | `design-reviewer`                                    | **113,319**                                                                                              | not available                             | re-run after corrections                                                                                                                   |
| `FEAT-S3`  | Plan (20 tasks, re-sequenced to three windows)                 | `planner` (one agent, resumed 4 times)               | **364,786**                                                                                              | not available                             | accepted after `FEAT-G3`                                                                                                                   |
| `FEAT-G3`  | Plan review                                                    | `plan-reviewer`                                      | **117,917**                                                                                              | not available                             | verdict not available to this dispatch                                                                                                     |
| `FEAT-S9`  | Test design (task 1)                                           | `test-designer` (one agent, resumed ~15 times)       | **587,815**                                                                                              | not available                             | scenarios from design alone, before any code — the plan's first window; the single largest dispatch total in the cycle                     |
| `FEAT-S10` | Red tests (tasks 7, 10)                                        | `tester-api`                                         | **318,246** (83,743 + 234,503)                                                                           | not available                             | task 7's three relocated cases green on the **old** store; task 10's `MF-API-*` red for the right reason plus `AL-API-20` green on arrival |
| `FEAT-S4`  | Implementation (tasks 2, 3, 4, 5, 6, 8, 9, 11, 13, 14, 15, 18) | `implementer-api`, `implementer-web`, `tester-unit`  | **1,997,808** (12 dispatches — see breakdown below)                                                      | not available                             | green; surfaced the `tsconfig.json` vacuous-typecheck defect (`FX-045`)                                                                    |
| `FEAT-S11` | Integration and e2e tests (tasks 12, 16, 17)                   | `tester-functional`, `tester-api`, `tester-security` | **368,913** (92,249 + 118,959 + 157,705)                                                                 | not available                             | `MF` functional spec, `SM-API-03`'s growth, the authenticated-page scan, two new pure units                                                |
| `FEAT-G4`  | Code review                                                    | `code-reviewer`                                      | **not available** — not among the figures `lead` held                                                    | not available                             | verdict still not available to this dispatch; the one gate this record cannot cost at all                                                  |
| `FEAT-S6`  | Acceptance (task 19)                                           | `lead`                                               | not available (tokens, by design — see `2026-10-03`'s record); **1 min 47 s** wall-clock                 | —                                         | one green `pnpm verify`, single server start, Docker up on a reset database                                                                |
| `FEAT-S7`  | Ledger (task 20, this dispatch)                                | `tester-acceptance`                                  | **260,934** as of this dispatch's prior completion notice — this exchange adds more, not self-measurable | reported in this dispatch's own hand-back | `FT-007`, five `FX-` rows, `BL-004` struck, `BL-037`/`BL-038` opened                                                                       |
| `FEAT-S8`  | Profiling record (task 20, this dispatch)                      | `tester-acceptance`                                  | counted jointly with `FEAT-S7` above                                                                     | reported in this dispatch's own hand-back | this record                                                                                                                                |
| —          | Rework / corrections, not individually stage-attributed        | mixed (implementer and tester roles)                 | **1,148,652** (10 dispatches — see breakdown below)                                                      | not available                             | includes the fixes for `FX-041`…`FX-043` by name; the rest cannot be tied to one original stage without guessing, named rather than forced |

**Grand total across every row above: 6,477,057 tokens** — a lower bound, computed by script (below),
missing only `FEAT-G4` (no code-review total was among the figures `lead` held) and `FEAT-S6`
(`lead`'s own run is not self-measurable the way a sub-agent's hand-back is, per the 2026-10-03
record's same note).

### `FEAT-S4` breakdown (12 dispatches, 1,997,808)

compose 94,984 · Prisma deps/schema/scripts 172,896 · PrismaModule 106,115 · seed 162,547 ·
webServer 69,119 · services onto Prisma 204,447 · retire dead units 85,974 · meeting-files module
226,510 · detail page 229,841 · upload form 163,541 · download handler 162,407 · corpus 319,427.

### Rework/corrections breakdown (10 dispatches, 1,148,652)

multer pin 61,321 (→ `FX-043`) · audit overrides 64,215 · spec correction 114,475 · seed fixture +
415 string 111,977 · unit specs 69,492 · builder units 87,224 (→ `FX-041` coverage) · api spec
catch-up 131,461 · **functional specs 326,861** (→ found `FX-042`, the single most expensive
dispatch this record can attribute to implementation-or-testing work, larger than any dispatch in
the `FEAT-S4` breakdown above) · empty-selection fix 85,892 (→ `FX-042`) · two corrections 95,734.
Five of these ten map cleanly to a named `FX-` row by content; the other five are corrections this
record cannot honestly tie to one specific original stage without guessing, so they are left as a
named bucket rather than forced into a row.

## Per-agent totals, summed by script

`lead`'s own figures, reproduced and summed exactly as handed down — four categories, matching
`lead`'s own grouping rather than this record's stage IDs, because that grouping is the source and
re-deriving stage boundaries from it (above) is a second, separate step:

| Category                      | Total (script-summed) |
| ----------------------------- | --------------------: |
| Discovery and gates           |             1,794,689 |
| Test design                   |               587,815 |
| Implementation and testing    |             2,945,901 |
| Fixes and corrections         |             1,148,652 |
| **Grand total (lower bound)** |         **6,477,057** |

Computed by `node sum-tokens.mjs` (kept in the task's scratchpad, not the repository — a one-off
tally, not a repeated tool), reproduced here so the arithmetic is checkable rather than asserted:

```js
function sum(obj) {
  return Object.values(obj).reduce((a, b) => a + b, 0);
}
// discoveryAndGates, testDesign, implementationAndTesting, fixesAndCorrections are the four
// category objects, one entry per dispatch, values exactly as lead supplied them.
const grandTotal = [discoveryAndGates, testDesign, implementationAndTesting, fixesAndCorrections]
  .map(sum)
  .reduce((a, b) => a + b, 0); // 6,477,057
```

**Two things this shape says, worth more than the total itself:**

- **The three most expensive artifacts in the whole cycle are all documents, not code**: the design
  (549,941), the test-designer's scenario text (587,815) and the plan (364,786) sum to **1,502,542**
  — **4.6×** the single most expensive implementation-or-testing dispatch (the functional specs,
  326,861). Discovery is not the cheap half here any more than it was in the first (2026-09-28)
  record; it is the most expensive half by artifact, individually.
- **The single most expensive implementation-type dispatch is the one that found a defect.** The
  functional-specs dispatch (326,861, written at `FEAT-S11`) is both the largest dispatch outside
  discovery/test-design and the dispatch that found `FX-042` (the `'blob'` filename substitution).
  The cheapest dispatches in the whole implementation set are the ones that shipped without
  surfacing anything — `webServer` (69,119) and `retire dead units` (85,974) among them. Cost and
  defect-finding correlate at least once in this cycle; one data point, not a rule.

## Numbers independently verified by this dispatch

Handed down rather than re-derived by a fresh `pnpm verify` (re-running the whole suite for a second
green result is the thing `regression-verify` explicitly rejects), **but the e2e and unit totals were
independently re-counted** by this dispatch directly from the tree — `grep -c "^\s*test("` across
every `*.spec.ts` under `e2e/`, and the equivalent for `it(`/`test(` across every `apps/*/src/**/*.spec.ts`
— rather than taken on the handed-down word alone:

- `pnpm verify`: exit 0, **1 min 47 s** (handed down; was ~66 s before this change — the
  `prisma generate` prefix plus the container, the schema reset and the seed account for the
  growth, not the suite itself).
- **167 e2e across 16 files** — recounted and matches exactly; up from 112 across 13 files.
- **43 unit tests** — recounted and matches exactly: 26 in 7 `apps/api` files, 17 in 5 `apps/web`
  files; down from 51 (18 service-layer units retired/relocated/withdrawn per design §7, 10 new pure
  units added for the filename/content-type/header rules and `formatFileSize`).
- Corpus: 753 active facts, 18 retired, 2 withdrawn (handed down, not independently recounted — a
  full key-by-key pass over all ~611-then-753 keys is explicitly out of this cycle's scope, design
  §7).
- Diff: roughly 50 tracked files, +3,410 / −942, plus the untracked `meeting-files` module, the
  Prisma directory and the change folder (handed down).
- ~40 agents across 20 plan tasks, dispatch count higher than agent count because many were resumed
  rather than re-spawned; an exact dispatch total is **unavailable** to this dispatch, stated as a
  gap rather than estimated.

## What found each defect — the headline of this record

Five statements were falsified by this change **without being predicted**, and they resolve into two
distinct failure modes rather than one:

### Asked, answered from memory (misses 1, 2 and 5)

The design's unit-retirement analysis (design §7) named what covered each retired unit **from
recollection of what the api cases assert, rather than by reading them** — wrong twice, both caught
only at `FEAT-S10`:

1. `HD-UT-09` was first named "already covered over HTTP" when nothing covered its actual subject —
   invariant 7's secondary sort key (`id` ascending on equal `startsAt`). No `HD-API-*` case created
   meetings sharing a date, so dropping the unit would have let a lost tiebreak go green everywhere.
2. `MD-UT-06`…`09` were put in the same "covered" bucket when they are in fact **withdrawn**: they
   mutate a returned array to prove the old store handed out copies, a behaviour that ceases to exist
   once Prisma builds a fresh object per query. There is nothing over HTTP for them to be "covered
   by" — calling them covered was false in a different way than miss 1, not a milder version of it.

The same shape recurs a third time, unpredicted, in the fix for `FX-041`: `MF-API-06` already pins
the exact `Content-Disposition` value the download route must answer, and a grep for that header
string would have surfaced it in seconds. Nobody ran the grep before writing the bug up as a gap to
close; the coverage was already sitting in the tree, unread.

**The repair applied (design §7, after the second miss):** state retirement **per case, not per
group**, each row naming its successor or saying "withdrawn, nothing covers it" — never a bucket
justified by "already asserted over HTTP" as a category.

### Never asked (misses 3 and 4)

Here the question itself — **"what asserts the shape of the surface this change adds to"** — was
never put, as opposed to being put and answered wrong:

3. `HD-FN-17` and `HD-FN-19` assert `getByRole('link')).toHaveCount(1)` over the **whole page**
   (`home-dashboard.functional.spec.ts:252`, `:298`). Nothing was removed from the dashboard; a link
   was added to each meeting row, and three row links made both assertions read `4`. A search for
   "which cases address the meeting list" cannot find this, because the thing that changed is not
   mentioned in either case — the defect is in the assertion's **scope**, not its subject.
4. `FACT-1036` states that `planner` owns exactly one meeting; the `SEC-API-11` fixture adds
   `mtg-planner-2` and nobody named the fact it falsifies. Identical shape to miss 3 — a count,
   invisible to a search for the thing being added — but living in the corpus rather than in a spec.

**The repair.** Not "which cases mention the thing I changed" but "which cases have a scope that
contains the thing I changed" — re-run as a grep for `toHaveCount`/`toBeHidden`/`not.toBeVisible`/
unscoped `getByRole(...)` across every spec touching a changed page, which turned up the two above
plus one more before it shipped (`ACC-FN-04`'s one-`main` constraint on the new page, folded into
design §2 rather than left as a third miss). The corpus arm of the same question is a grep for keyed
facts against counting words (`exactly`, `only`, `all`, `one`, `two`…) across the four corpus
documents; re-run over this whole change it surfaces `FACT-1036` and nothing else false.

### The designer's own synthesis (recorded verbatim in substance, design §7)

Misses 3 and 4 are not two axes — they are **one question asked of two artifact families**. The real
pattern is inventing a one-off sweep per family whenever prompted (the spec grep, then the corpus
grep) instead of enumerating the families once and asking both the subtraction question and the
addition question of each. The families that assert something about this system: the specs; the
four keyed corpus documents; `.cases.md` preconditions, which nothing executes and which the next
case author reads as fact; the module maps and both `CLAUDE.md` files; the hand-maintained lists
(`PROTECTED_ROUTES`, `AUDITED_PAGES`, `KNOWN_CASE_PREFIXES`); and — the one no grep over this
repository can reach — the framework's own output, which is where the route announcer, the dev-tools
control and Chromium's unconditional 404 console error all came from.

**Two root causes, not one, needing different fixes.** Misses 1, 2 and 5 were asked and answered from
memory — the fix is a verification discipline: read the successor, do not recall it. Misses 3 and 4
were never asked — the fix is the enumeration above. "Be more careful" repairs neither.

### A prediction was made and tested — and it landed weakly

The design predicted the next (fifth) miss would come from `.cases.md` preconditions or the
hand-maintained lists — the two families still handled by a one-off sweep rather than by the
enumerated method. Both were swept before shipping: the preconditions sweep over seventeen files
found one stale count and one meaning-shift; the sweep of the hand-maintained lists found nothing
not already owned by a pending task (`BL-030`, `BL-034`). The prediction therefore landed **weakly**
— and the weak result is itself the finding, not a disappointment to smooth over: preconditions rot
silently precisely because nothing executes them, so a sweep finds only what a reader happens to
notice, not what a check would have caught. A prediction that half-fails is data; it is recorded as
exactly that rather than rounded up to "confirmed" or down to "refuted".

### Two generalisable rules, written as greps rather than intentions

1. **The parser axis** — _when a design specifies a rule over a value, verify where that value comes
   from, not only what is done with it._ Four findings on this axis, three of them already named by
   the design once the pattern was stated: `busboy`'s `basename` stripping a path before the filename
   rule ever sees it; `multer` re-decoding `%0A`/`%0D`/`%22` back into literal control characters,
   which is the actual `Content-Disposition` injection surface; `busboy`'s default of the literal
   string `'text/plain'` when no content type is declared at all. **The fourth was found only at
   implementation, not predicted by the design**: `multer@2.4.0`'s renamed `LIMIT_UNEXPECTED_FILE`
   string diverging from the exact-equality match `@nestjs/platform-express` performs on it
   (`FX-043`) — the same axis, a library version rather than a request parser, caught late because
   the question was asked of the request-parsing libraries and not yet of the dependency pin itself.
2. **The surface axis** — _when a change adds to a surface, enumerate what asserts the shape of that
   surface, not what names what you added._

### A sixth instance of the pattern — caught by a machine, not a person

While closing this cycle's ledger, `tester-acceptance` cited `FACT-3362` by its literal key in
`docs/CHANGELOG.md` to describe what it had been (retired, superseded by `FACT-3652`) — the fact
itself was already dead by the time the sentence was written. `AR-API-14` ("every `FACT-` reference
resolves, and living documents cite living facts") failed the run on exactly that line: a living
document (the changelog is not in `HISTORICAL_DIRS`) had cited a key the corpus had already retired.
This is the same shape as misses 1, 2 and 5 above — a reference to something that stopped being true,
carried forward by someone who did not re-check it — but it is the **one instance in this cycle found
by a check built for exactly this failure, rather than by a human reading or a red test someone had to
think to write.** Every one of the other five misses needed a person: a reviewer re-reading the api
cases, a tester running a grep, planning catching a stale corpus sentence. This one needed nobody —
the retirement machinery (`ADR-0021`/`ADR-0022`, `AR-API-14`) exists precisely because facts get cited
after they die, and on its first real use against a ledger entry rather than a corpus document, it
worked exactly as designed. Fixed in the same dispatch, before hand-back; confirmed by two subsequent
green `pnpm verify` runs (see the hand-back).

### `FEAT-S9`/`FEAT-S10` in their intended order, and what that bought

This is the first cycle to run test design and red tests **before** implementation, in the order the
second tuning round intended, after the plan was re-sequenced mid-gate into three windows rather than
two (plan §4). The measured consequence: the three relocated api cases (task 7) were written and run
green **against the in-memory store that still existed**, before the migration — so they guarded the
move rather than merely confirming it afterward. `AL-API-20` could **not** get the same treatment:
the gap it closes was found at task 9 (retiring the units), which runs after task 8 (the migration
itself) — by the time the case existed to be written, the store it would have guarded was already
gone. A gap found after a boundary cannot be closed by a task scheduled before that boundary; this is
a measured property of task ordering, not a theory about it.

### Also worth the record

`pnpm verify` grew 66 s → 1 min 47 s. The `prisma generate` prefix was predicted at 71 ms (the
generator alone) and measured at ~2.0 s per **process** (warm) across roughly five calls inside the
run — wrong by an order of magnitude, caught by a spike at planning (plan §1, row 3) rather than
discovered in production. The gap between "the generator costs 71 ms" and "the process costs ~2 s"
is itself worth keeping: the two are different things to measure, and the design's first draft
measured the one that was cheap to look good.

## What was not re-verified by this dispatch, stated rather than passed over

- No fresh full `pnpm verify` was run by this dispatch for this record: `FEAT-S6` already ran it
  green (1 min 47 s, handed down), and re-running the whole suite for a second green result is the
  thing `regression-verify` §2 explicitly argues against. The ledger and backlog edits made by this
  dispatch were checked against `e2e/ledger/ledger.api.spec.ts`'s rules by reading the spec rather
  than by executing it against a live server — see the hand-back for what that leaves open.
- Per-stage **tokens** for `FEAT-S1`–`FEAT-G3` and `FEAT-S9`–`FEAT-S11`: filled in above, supplied by
  `lead` after reading this record's reading note — see the follow-up there. **Still unavailable**:
  `FEAT-G4` (no code-review total was among the figures held) and every stage's **agent-time/call**
  count, which `lead` never had either. Not estimated into either gap.
- A full key-by-key pass over the corpus's ~611-then-753 facts: explicitly out of scope (design §8.15,
  carried into plan §6).

## Observations for `TUNE-S1`

Recorded as facts, not as recommendations.

- Two failure modes, not one, found across three artifact families (specs, corpus, dependency pins) —
  the same question, "what already covers/asserts this", asked unevenly across them.
- A prediction about where the next miss would come from was made and tested in the same cycle, and
  landed weakly — the first record in this directory to carry a tested prediction at all.
- A re-sequenced plan (two windows → three) let one new case guard a migration before it happened,
  and definitively could not let a second one do the same, because the gap the second case closes was
  only found after the migration had already run. Stage order has a measurable ceiling on what a red
  test can guard, independent of how well the stage is executed.
- This is the first cycle whose final dispatch (`FEAT-S7`/`FEAT-S8`) could not reconstruct the
  cycle's own per-stage cost on its own, because that cost was never forwarded to it — **and the
  first cycle where the gap was closed inside the same session**, once the orchestrator read the
  finding and supplied its own figures. The fix did not come from a better write-up; it came from the
  role holding the numbers forwarding them. That is worth keeping as the actual remedy for the next
  cycle this size, rather than "write a better reading note".
- **Documents cost more than code, concretely.** The three most expensive artifacts in the whole
  cycle — design, scenario text, plan — sum to 1,502,542 tokens, 4.6× the single most expensive
  implementation-or-testing dispatch. This is the same shape the first (2026-09-28) record found
  (implementation costing more than discovery was the surprise there); here, by artifact rather than
  by half, discovery's documents are individually the heaviest line items.
- **The most expensive implementation-type dispatch is the one that found a defect** (the functional
  specs, 326,861, `FX-042`). One data point; worth watching in the next record rather than concluding
  from.
- **A sixth defect this cycle, `AR-API-14`'s catch of a retired-fact citation in the ledger, was found
  by a machine rather than a person** — the other five all needed someone to read, grep or notice.
  Worth naming as a positive case: the part of this pipeline that does not depend on anyone
  remembering, working on its first real test outside the corpus itself.
