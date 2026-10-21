# Run 2026-10-16 — `delete-meetings-and-files`

- **Flow:** `FEAT` · **Ledger:** `FT-010`; `BL-007` reworded (deleting closed, editing open), `BL-068` opened
- **Change folder:** `docs/plans/delete-meetings-and-files/`
- **Commit:** `pending` (an uncommitted working-tree diff at the time of this record)
- **Decisions taken:** none new; the change is layered by `ADR-0035` and uses the existing `onDelete: Cascade`, so no ADR was written
- **Shipped:** `DELETE /meetings/:id` and `DELETE /meetings/:id/files/:fileId`, both `204`, owner-scoped, answering the one `ADR-0018` 404. New cases `MD-API-09`…`11`, `MF-API-20`…`25`, `SEC-API-12`; the e2e fixtures gained `cleanup.api.ts` and the seed gained the `eraser` user.
- **Path:** **the trimmed path, by the owner's choice of 2026-10-16.** No research (`FEAT-S1`, `FEAT-G1`) and no design (`FEAT-S2`, `FEAT-G2`) stage was run, and neither was reviewed. One plan gate (`FEAT-G3`) and one code gate (`FEAT-G4`).
- **Recorded at:** `FEAT-S8`, from the dispatch log `lead` kept; nothing was read from transcripts.

## Reading note

First dispatch at 17:35 and the `FEAT-S7` dispatch at 18:24 on 2026-10-16: **elapsed wall-clock 49 min**.
Agent-time below is the sum of per-dispatch durations: **3,087 s = 51.5 min** over 12 dispatches. It is
slightly above the elapsed figure because dispatches 9, 10 and 11 ran in parallel (disjoint files, no
Playwright). Every gate was answered by a fresh dispatch; no agent was resumed.

**What is not in the totals**, stated rather than estimated:

- `FEAT-S6` is `lead`'s own run with no dispatch (`CH-025`): `pnpm verify` exit 0 in **112 s**. It has no
  token figure and its 112 s is not in the 3,087 s.
- This dispatch (`FEAT-S8`): its cost is not in the record; reported in the lead's hand-back.
- `lead`'s own orchestration work.

## Per stage

`#` is the dispatch number in `lead`'s log.

| ID         | Pass                 | #   | Role / model               | Tokens                                              | Calls | Seconds | Outcome                                                                                                                                                                               |
| ---------- | -------------------- | --- | -------------------------- | --------------------------------------------------- | ----- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FEAT-S3`  | first                | 1   | planner / opus             | 140,221                                             | 41    | 453     | the plan                                                                                                                                                                              |
| `FEAT-G3`  | first                | 2   | plan-reviewer / opus       | 91,718                                              | 41    | 214     | accept-after-blockers: 3 correction (task-order, assertion-scope, stale-fact), 6 nits                                                                                                 |
| `FEAT-S3`  | correction           | 3   | planner / opus             | 51,492                                              | 13    | 78      | rework; answering `FEAT-G3` (fresh dispatch)                                                                                                                                          |
| `FEAT-S9`  | first                | 4   | test-designer / opus       | 152,449                                             | 25    | 531     |                                                                                                                                                                                       |
| `FEAT-S10` | first                | 5   | tester-api / sonnet        | 135,104                                             | 38    | 186     | also ran prettier and the scenarios index for the test-designer, which has no shell                                                                                                   |
| `FEAT-S4`  | first                | 6   | implementer-api / sonnet   | 92,782                                              | 25    | 207     | product code                                                                                                                                                                          |
| `FEAT-S11` | first                | 7   | tester-security / opus     | 94,695                                              | 25    | 376     |                                                                                                                                                                                       |
| `FEAT-G4`  | first                | 8   | code-reviewer / opus       | 146,263                                             | 71    | 288     | accept-after-blockers: 2 correction (both doc-drift), 9 nits                                                                                                                          |
| `FEAT-S4`  | correction           | 9   | implementer-api / sonnet   | 42,274                                              | 14    | 35      | rework; answering `FEAT-G4`; parallel with #10 and #11                                                                                                                                |
| `FEAT-S10` | correction           | 10  | tester-api / sonnet        | 38,856                                              | 9     | 144     | rework; answering `FEAT-G4` nits, plus prettier and the index                                                                                                                         |
| `FEAT-S9`  | correction           | 11  | test-designer / opus       | 84,213                                              | 9     | 229     | rework; answering `FEAT-G4`                                                                                                                                                           |
| `FEAT-S6`  | first                | —   | lead (no dispatch)         | n/a                                                 | —     | 112     | `pnpm verify` exit 0: orientation 14 plans, lint, typecheck, units api 43 / web 17, api boot 1/1, prettier clean, 184 e2e passed, audit passed (2 moderate, 1 high ignored by config) |
| `FEAT-S7`  | first (with control) | 13  | tester-acceptance / sonnet | 74,469                                              | 25    | 346     | control experiment and the `FT-010` row                                                                                                                                               |
| `FEAT-S8`  | first                | 14  | tester-acceptance / sonnet | not in the record; reported in the lead's hand-back |       |         | this dispatch                                                                                                                                                                         |

The log has no dispatch numbered 12: the `FEAT-S6` row sits at position 12 in `lead`'s own list and is
shown here between #11 and #13.

## Per-stage totals, summed by script

12 measured dispatches (#1–#11 and #13): **1,144,536 tokens, 336 tool calls, 3,087 s**, which agrees exactly
with `lead`'s totals over 9 distinct roles.

| Stage      | Tokens  | Calls | Seconds |
| ---------- | ------- | ----- | ------- |
| `FEAT-S3`  | 191,713 | 54    | 531     |
| `FEAT-G3`  | 91,718  | 41    | 214     |
| `FEAT-S9`  | 236,662 | 34    | 760     |
| `FEAT-S10` | 173,960 | 47    | 330     |
| `FEAT-S4`  | 135,056 | 39    | 242     |
| `FEAT-S11` | 94,695  | 25    | 376     |
| `FEAT-G4`  | 146,263 | 71    | 288     |
| `FEAT-S7`  | 74,469  | 25    | 346     |

`FEAT-S1`, `FEAT-G1`, `FEAT-S2` and `FEAT-G2` did not run: no rows.

## The four numbers

Total for every share below: 1,144,536 tokens.

1. **Discovery vs implementation.** Discovery (`FEAT-S1`…`FEAT-G3`, the frozen boundary):
   `FEAT-S3` 191,713 + `FEAT-G3` 91,718 = **283,431, 24.8%** (283,431 / 1,144,536 = 0.2476).
   Pre-implementation (discovery plus `FEAT-S9` and `FEAT-S10`): 283,431 + 236,662 + 173,960 =
   **694,053, 60.6%** (0.6064); the two figures overlap. The remainder (`FEAT-S4`, `FEAT-S11`, `FEAT-G4`,
   `FEAT-S7`): 135,056 + 94,695 + 146,263 + 74,469 = **450,483, 39.4%**. `FEAT-S11` counts in neither
   discovery nor pre-implementation. Product code (#6 and #9, `FEAT-S4`): **135,056, 11.8%** (0.1180);
   the first pass alone is 92,782, 8.1%.
2. **Rework share.** Dispatches #3, #9, #10 and #11: 51,492 + 42,274 + 38,856 + 84,213 =
   **216,835 tokens, 18.9%** (216,835 / 1,144,536 = 0.1895). No gate was re-run, so the pilot-style
   alternative count (a gate re-run as rework) does not apply. The `FEAT-S6` run was green on its first
   attempt, so no acceptance-run rework exists.
3. **Gate yield.** `FEAT-G3`: 3 correction blockers (task-order, assertion-scope, stale-fact) and 6 nits.
   `FEAT-G4`: 2 correction blockers (both doc-drift) and 9 nits. **5 blockers over two gate passes, none a
   change of shape.** Both gates returned accept-after-blockers on their first pass. Gate cost: 91,718 +
   146,263 = **237,981 tokens, 20.8%** (0.2079). The gate verdict files are in
   `docs/profiling/verdicts/` (`2026-10-16-delete-meetings-and-files-feat-g3-a3c90ef3.md`,
   `2026-10-16-delete-meetings-and-files-feat-g4-ab0a6d56.md`); the counts here are from `lead`'s log, not
   from reading those files.
4. **What found each defect.** No defect shipped, so no `FX-`. What caught what:
   - `FEAT-G3`: three plan blockers, before any code.
   - `FEAT-G4`: two doc-drift blockers (the `apps/api/README.md` seed table and the `SEC-API-12` /
     `MD-API-11` cleanup text).
   - `FEAT-S6`: green on the first run; found nothing.
   - The control experiment (#13): every break went red, so no case was found to be unexercised; one
     red-for-an-uninspected-cause remark is in the `FT-010` row.

## Observations, as facts rather than proposals

- The test-designer has no shell, so prettier and the scenarios index had to be routed to a tester twice (#5, #10).
- Plan task T9 assigned `pnpm verify` and product-code control breaks to tester-acceptance, against the process inventory, which gives `FEAT-S6` to `lead`. The code reviewer flagged this as a tool-gap nit.
- Every gate finding was `correction`; there were no `shape` findings.
- Rework was 18.9% on a path with two gates; discovery was 24.8% because the research and design stages did not run.
- Product code was 11.8% of the cycle; the test designer, the testers and the checks on them were the larger part.
- Not exercised: the interactive browser check, since no `apps/web` file changed.
- The lead's `pnpm verify` preceded the `FEAT-S7` edits to `docs/data-model.md`, `docs/CHANGELOG.md` and `docs/BACKLOG.md`; those edits were re-checked by `e2e/ledger` + `e2e/architecture`, `check:orientation` and `prettier --check docs`, not by a second `pnpm verify`.

## Against the previous record

The previous record is [`2026-10-16-meetings-clean-architecture.md`](2026-10-16-meetings-clean-architecture.md)
(`FT-009`): 1,697,800 tokens over 20 dispatches before its addendum, 2,053,500 over 26 with it.

| Figure                   | `FT-009` (#1–#20) | `FT-009` with T7b (#1–#26) | This run (`FT-010`) |
| ------------------------ | ----------------- | -------------------------- | ------------------- |
| Total tokens             | 1,697,800         | 2,053,500                  | 1,144,536           |
| Measured dispatches      | 20                | 26                         | 12                  |
| Tool calls               | 472               | 535                        | 336                 |
| Agent-time               | 72.4 min          | 83.9 min                   | 51.5 min            |
| Discovery share (frozen) | 43.8%             | 36.2%                      | 24.8%               |
| Pre-implementation share | 61.6%             | 50.9%                      | 60.6%               |
| Rework share             | 18.1%             | 18.2%                      | 18.9%               |
| `FEAT-S6` runs to green  | 3                 | 5                          | 1                   |

**What is comparable.** The discovery and pre-implementation boundaries are the same by stage ID. Both runs
used the trimmed path.

**What is not.** `FT-009` was a pure refactor with an unplanned style ADR and a shared-kernel move; this run
is new behaviour on a layout that already existed, so the two are different kinds of change. This run ran no
`FEAT-S2` at all, which is why its discovery share is the lowest recorded. `FEAT-S11` ran here and not in
`FT-009`. Neither record includes `lead`'s orchestration or `FEAT-S6` token cost. Wall-clock for `FT-009` was
dominated by an overnight pause; this run had none.
