# Run 2026-10-03 — `design-language-rollout`

- **Flow:** `FEAT` · **Ledger:** `FT-006`, `FX-040`, `BL-031` (closed), `BL-032` (closed), `BL-033`,
  `BL-034`, `BL-035`, `BL-036`
- **Commit:** `pending` (product code and corpus are an uncommitted working-tree diff at the time of
  this record; `ADR-0026` itself was accepted earlier in the same cycle, commit `bf35f7a`)
- **Decisions taken:** `ADR-0026` (design language declared as tokens)
- **Shipped:** the token block into `globals.css`, Plus Jakarta Sans through `next/font/google`,
  `@phosphor-icons/react` through its `/ssr` subpath, the three-track shell (navigation rail, hero
  banner, stat tile), and the existing login/register/dashboard surfaces reworked onto the card,
  list and elevation patterns. One defect folded in (`FX-040`, two HeroUI v2 token names compiling
  to no CSS).
- **Recorded at:** `FEAT-S8`, from the hand-backs still available at the end of the cycle.

**Reading note — read this before the numbers below.** The cycle was **interrupted and resumed
across two days**, 2026-10-02 and 2026-10-03: a session carrying `FEAT-S1` research and the first
`FEAT-S2` design pass was killed before handing back, and the cycle was picked up again the next
day from the artifacts that session left on disk. **This record's wall-clock number is therefore not
comparable with the one other record in this directory**, whose cycle ran start to finish in one
sitting. Treat every total below as a floor, not a complete figure: the killed session's own cost is
real and spent, but it is gone.

## What the interruption actually cost

- **`FEAT-S1` (research) and the first `FEAT-S2` (design) pass ran in the killed session.** Their
  hand-backs died with it. They are recorded here as **unmeasured**, not estimated — inventing a
  number would be worse than the gap (`docs/profiling/README.md`). The research artifacts
  themselves survived on disk (research is ~3,000 lines across six files) and were read back into
  context at the start of the resumed session; only the token/call/time cost of producing them is
  lost.
- **`FEAT-G1` (research review)** must have returned `accept` for the first `FEAT-S2` pass to have
  started at all, but its own cost is equally unrecoverable — same killed session, same reason. Its
  verdict is known by inference; its cost is not.
- **`FEAT-G2`'s verdict was lost outright** along with the design review that produced it, and the
  gate was **re-run from scratch over unchanged artifacts** at the start of the resumed session. The
  re-run is the `FEAT-G2` row below. It found four blockers, two labelled `shape`, which sent
  `FEAT-S2` back for a second pass (also below). That rework is recorded against `FEAT-S2`, the
  stage that was reworked — not against the gate that re-ran, per the protocol.
- **One earlier `pnpm verify` failed at `format:check`** on six unformatted research files the
  interruption had left behind. A `researcher` dispatch fixed the formatting (`FEAT-S1 formatting
fix` below); its own cost is not separately available from this end of the cycle and is marked
  unmeasured rather than guessed. Worth a line on its own: it cost a full extra `pnpm verify` run,
  and no targeted stage check would ever have caught six unformatted markdown files — only the
  whole-suite run did.

This is itself a finding about the protocol, not only about this cycle: `docs/profiling/README.md`
says the numbers exist only while the hand-backs are in front of you, and this is what happens when
a session dies before that hand-back is written.

## Per stage

Wall-clock is the harness's duration per dispatch. Rows marked **unmeasured** carry no tokens, calls
or time because the hand-back that would have reported them does not exist.

| ID                             | Stage / gate                       | Role                      | Model    | Tokens                    | Calls   | Agent-time    | Outcome                                                                                                                     |
| ------------------------------ | ---------------------------------- | ------------------------- | -------- | ------------------------- | ------- | ------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `FEAT-S1`                      | Research                           | `researcher` + sweeps     | —        | **unmeasured**            | —       | —             | killed session; artifacts survived, hand-back did not                                                                       |
| `FEAT-S1`                      | Research — formatting fix (re-run) | `researcher`              | `sonnet` | **unmeasured**            | —       | —             | fixed six unformatted research files after a red `format:check`                                                             |
| `FEAT-G1`                      | Research review                    | `research-reviewer`       | —        | **unmeasured**            | —       | —             | killed session; verdict inferred as `accept` (`FEAT-S2` proceeded), cost lost                                               |
| `FEAT-S2`                      | Design (first pass)                | `designer`                | —        | **unmeasured**            | —       | —             | killed session                                                                                                              |
| `FEAT-G2`                      | Design review (re-run)             | `design-reviewer`         | `opus`   | 153,750                   | 35      | 7.5 min       | **accept after blockers** (4; 2 `shape`, 2 `correction`) — re-run from scratch over unchanged artifacts                     |
| `FEAT-S2`                      | Design (re-run)                    | `designer`                | `opus`   | 311,566                   | 109     | 37.3 min      | reworked after `FEAT-G2`; cut 546 → 422 lines while _adding_ content                                                        |
| `FEAT-S3`                      | Plan                               | `planner`                 | `opus`   | 126,239                   | 42      | 9.0 min       | accepted after `FEAT-G3`                                                                                                    |
| `FEAT-G3`                      | Plan review                        | `plan-reviewer`           | `opus`   | 136,776                   | 29      | 6.6 min       | **accept after blockers** (4, all `correction`)                                                                             |
| `FEAT-S3`                      | Plan (correction)                  | `planner`                 | `opus`   | 52,781                    | 16      | 1.8 min       | narrow dispatch, correction-only verdict — no change-folder re-read                                                         |
| `FEAT-S9`                      | Test design                        | `test-designer`           | `opus`   | 97,019                    | 14      | 4.7 min       | scenarios for the rail, the banner and the tile                                                                             |
| `FEAT-S10`                     | Red tests (unit, API)              | —                         | —        | **no subject**            | —       | —             | named, not skipped: the change touches no pure module and no endpoint — no unit or API scenario to go red                   |
| `FEAT-S4`                      | Implementation                     | `implementer-web`         | `sonnet` | 207,311                   | 114     | 19.6 min      | green                                                                                                                       |
| `FEAT-S11`                     | Integration and end-to-end tests   | `tester-functional`       | `sonnet` | 196,766                   | 87      | 13.8 min      | 5 new functional cases, all 28 pre-existing unmodified; control experiment run                                              |
| `FEAT-G4`                      | Code review                        | `code-reviewer`           | `opus`   | 162,275                   | 50      | 8.5 min       | **accept after blockers** (3; 1 `shape`, 2 `correction`)                                                                    |
| `FEAT-S4`                      | Implementation (correction)        | `implementer-web`         | `sonnet` | 98,841                    | 56      | 5.0 min       | reworked after `FEAT-G4`'s `shape` blocker                                                                                  |
| `FEAT-S9`                      | Test design (correction)           | `test-designer`           | `opus`   | 40,677                    | 8       | 1.9 min       | narrow dispatch for `FEAT-G4`'s two `correction` blockers                                                                   |
| `FEAT-S6`                      | Acceptance                         | `lead`                    | —        | _approximate — see below_ | —       | _approximate_ | one green `pnpm verify`: 128 e2e in 30.6s, 51 units, 1 supertest; red only at `audit` on the pre-existing `braces` advisory |
| **Total (measured rows only)** |                                    | 8 distinct roles + `lead` |          | **1,584,001**             | **560** | **115.7 min** | excludes every unmeasured row above                                                                                         |

`FEAT-S7` (the ledger) and `FEAT-S8` (this record) are being written by `tester-acceptance` in the
dispatch that produces this hand-back; like the prior record's `FEAT-S8`, that dispatch's own cost
is not separately measured inside the record it is writing.

**The `lead` row is marked approximate because no hand-back reports it.** `lead` orchestrated every
dispatch above (sequencing, reading hand-backs, holding the four gates, re-running `FEAT-G2` from
scratch) and ran `FEAT-S6` directly per `CH-025` — one `pnpm verify` call, no sub-dispatch. Its own
token cost is not introspectable from outside its context the way a sub-agent's is from its
hand-back; `CH-025` measured a comparable one-command acceptance run at 286,179 tokens / 15.0
agent-minutes, but that figure was for a **dispatched** `tester-acceptance` running the command
across two dispatches, and `lead` running it directly with no dispatch is a different (likely
smaller) shape of cost. No independent measurement of `lead`'s own context is available this cycle;
stating a precise number here would be the invented figure `docs/profiling/README.md` warns against.
Treat the total above as **a floor**: it excludes `lead`'s own orchestration cost, `FEAT-S6`,
`FEAT-S7`/`FEAT-S8`, and everything that ran in the killed session.

> **On `FEAT-S10`.** The row says "no subject" rather than being omitted, per the convention this
> record is trying to set: a restyling change with no new pure module and no new endpoint has
> nothing for `tester-unit`/`tester-api` to put a red test around. Every new scenario this cycle was
> functional, and ran at `FEAT-S11`.

## The four numbers

### 1. Discovery vs implementation

The split is frozen by stage ID (`docs/profiling/README.md`): `FEAT-S1`…`FEAT-G3` is discovery,
`FEAT-S4`…`FEAT-S8` is everything after. This cycle's discovery half is **mostly unmeasured** —
`FEAT-S1`, `FEAT-G1` and the first `FEAT-S2` pass are the three rows lost to the killed session —
so the figure below is a measured floor, not the real split.

| Half                                                  | Measured tokens | Note                                                 |
| ----------------------------------------------------- | --------------: | ---------------------------------------------------- |
| Discovery (`S1`-`G3`), measured rows only             |         781,112 | `FEAT-S1`, `FEAT-G1`, first `FEAT-S2` pass missing   |
| Implementation onward (`S4`-`S8`), measured rows only |         665,193 | `FEAT-S6`/`S7`/`S8` cost not independently available |

No discovery/implementation percentage is stated this cycle: both halves are missing a row, and a
ratio computed from two floors is not a ratio worth citing. The one comparable number from the first
record — 42.3% discovery / 57.7% implementation, on a cycle measured whole — is not reproduced here
because this cycle was not measured whole.

**Pre-implementation** (`S1`…`G3` plus `S9`, `S10`) has the same gap: 781,112 measured
plus `FEAT-S9`'s 97,019 + 40,677 = 918,808 measured, still missing the three unmeasured rows.

### 2. Rework share — 503,865 measured tokens

| Reworked stage | Caught by | Rework tokens | What was wrong                                                                                                                                                                                            |
| -------------- | --------- | ------------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FEAT-S2`      | `FEAT-G2` |       311,566 | a design contradicting itself on whether the rail computes its active state — which, left standing, would have forced a client boundary onto a Server Component and destroyed the zero-client-JS property |
| `FEAT-S3`      | `FEAT-G3` |        52,781 | a stage ordering that put test design after the implementation it describes, among four correction-only blockers                                                                                          |
| `FEAT-S4`      | `FEAT-G4` |        98,841 | three icon imports using the library's **deprecated** aliases, caught by reading the package's own `.d.ts` — the one `shape` blocker at this gate                                                         |
| `FEAT-S9`      | `FEAT-G4` |        40,677 | a generated index file that would have failed `PR-API-07` with nothing in the plan to explain it, plus a second correction-only item                                                                      |

As a share of this cycle's measured total (1,584,001), rework is **31.8%** — comparable in shape to
the one other record's 29.3%, though neither total includes the killed session's cost, so the two
percentages are not safely comparable to each other either.

**Every one of the three gates run this session returned `accept after blockers`. None passed
clean.** `FEAT-G2`: 4 blockers (2 `shape`). `FEAT-G3`: 4 blockers (all `correction`). `FEAT-G4`: 3
blockers (1 `shape`, 2 `correction`).

### 3. Gate yield

| Gate      | Blockers                      | Changed the shape? | Notable                                                                                                                                                                                                                                                                                         |
| --------- | ----------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FEAT-G2` | 4 (2 `shape`)                 | yes — two          | the rail's active-state question above; a corpus fact about to be stated falsely under a fresh key because the ninth dead-class site had no owner                                                                                                                                               |
| `FEAT-G3` | 4 (all `correction`)          | no                 | a definition of done that passed in the exact state where the change silently fails — shipping the old accent while claiming the new one, green, because `FX-039` had already darkened the old value until `ACC-FN-01` passed; the stage-ordering error above; two further document corrections |
| `FEAT-G4` | 3 (1 `shape`, 2 `correction`) | yes — one          | the three deprecated-alias icon imports (`shape`); the generated-index/`PR-API-07` gap and one further correction                                                                                                                                                                               |

Six blockers across the three gates changed the shape of the work (2 at `G2`, 1 at `G4`); the
remaining five were corrections to documents or ordering. `FEAT-G2`'s DoD-passes-while-broken finding
is the same class of defect the first record's own observations warned about: a check green in the
exact state it should have caught.

### 4. What found each defect

| Defect                                  | Found by                                                                                                  | Would a diff review have found it?                                                                                                                                                                                                                                                   |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `FX-040` (dead HeroUI v2 token classes) | compiling the stylesheet through `@tailwindcss/postcss` and grepping the output, while writing `ADR-0026` | no — a class that generates no CSS produces no violation and no diff; it survived a code review, an accessibility scan and 28 functional cases, and no red test was constructible for it at the functional level because the dead class _increases_ contrast rather than reducing it |

A control experiment was run at `FEAT-S11`: a second `<Link>` added to the rail turned `HD-FN-17`
and `HD-FN-19` red while `HD-FN-18` stayed green — the correct split, proving the new cases bite. It
was reverted after confirming the red.

## Acceptance (`FEAT-S6`, run by `lead`, `CH-025`)

- `pnpm verify`, single server start: **128 e2e tests passed in 30.6s**; 51 unit tests (38
  `apps/api`, 13 `apps/web`); 1 supertest boot check; typecheck, lint and `format:check` clean.
- **All 28 pre-existing functional cases passed unmodified** — `FACT-3559`'s bar, met.
- `ACC-FN-01`–`ACC-FN-04` green, including the axe scan of the restyled dashboard, after every
  colour on three audited pages changed at once.
- **`pnpm verify` nonetheless exits 1**, at its final `pnpm audit --audit-level high` step, on the
  pre-existing `braces` advisory (`GHSA-vfj7-8cjw-p6xm`, no patched version exists). Acceptance is
  otherwise green; that step is the only red, and it is unrelated to this change (filed as
  `BL-033`).
- One earlier `pnpm verify` failed at `format:check` on six unformatted research files left by the
  interruption — see "What the interruption actually cost" above.

## Where the research spent more than the design used

~3,000 lines across six files, for a presentation-only change with no contract and no data
movement — roughly double what the design actually drew on. Most of the growth is attributed to the
re-run after the research gate (itself unmeasured, so this is qualitative, not a token figure).

**What paid for itself:**

- the build probe that changed the icon import subpath (to `/ssr`), which is the exact class of
  mistake `FEAT-G4` later caught three live instances of (deprecated aliases, not the subpath
  itself, but found by the same kind of probe);
- the compile probe that produced the nine dead-class sites, which is how `FX-040` was findable at
  all;
- the test sweep that produced the seven unscoped list locators behind the single most consequential
  design decision — the rail/banner/tile markup had to avoid adding a second `list` role or a second
  counter-shaped text node, which is exactly what `HD-FN-18`'s control experiment later proved bites.

**What was never used:** the exhaustive `FACT-2000`–`FACT-2079` and `FACT-1005`–`FACT-1011` read,
657 lines of raw compiler output, and a per-file git-history table.

## The design: cut while growing

`design.md` went **546 → 422 lines** at the lead's instruction after `FEAT-G2`, while _adding_
content — the reviewer had named the padding passage by passage, so the cut removed restated
material rather than substance.

## Observations for `TUNE-S1`

Recorded as facts, not as recommendations.

- Three gates ran this session; all three returned `accept after blockers`; none passed clean —
  consistent with the one other record in this directory, where the same was true of all four gates.
- A session interruption makes roughly a third of a `FEAT` cycle's cost permanently unrecoverable
  even when the artifacts it produced survive on disk: the research files were there to read, the
  tokens spent producing them were not.
- `FEAT-G2`'s re-run over unchanged artifacts is itself a cost this protocol does not have a stage
  ID for: it is recorded here as a normal `FEAT-G2` row because no better ID exists, but it is not
  the same event `docs/process.md` describes for that ID — a gate reading a change folder for the
  first time. Whether that deserves its own accounting is a question for `TUNE-S2`, not answered
  here.
- `FEAT-S10` having no subject is the first time this inventory's own "no subject" convention — as
  opposed to a skipped stage — has been exercised in a recorded cycle.
