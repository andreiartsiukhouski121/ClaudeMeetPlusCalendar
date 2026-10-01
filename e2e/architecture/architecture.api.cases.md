# Architecture corpus — integrity checks

- **Spec:** `e2e/architecture/architecture.api.spec.ts`
- **Playwright project:** `api` (no browser, plain `node:fs`)
- **Tags:** `@architecture`
- **Run:** `pnpm e2e e2e/architecture` (part of `pnpm verify`)

Checks the four documents the project plans from — [`docs/architecture.md`](../../docs/architecture.md),
[`docs/adr/`](../../docs/adr/README.md), [`docs/data-model.md`](../../docs/data-model.md),
[`docs/api-contract.md`](../../docs/api-contract.md) — and the role definitions in
`.claude/agents/`.

Why a machine check rather than care. Documentation rots in three specific ways here, and none of
them shows up in a diff:

1. **the log grows a duplicate number** — two `ADR-0007`s, and every plan citing one becomes
   ambiguous;
2. **a route is renamed and the contract keeps describing the old one** — the document starts
   lying, and after that nobody reads it;
3. **a guarded endpoint never reaches `PROTECTED_ROUTES`** — the cross-feature security suite goes
   on passing while no longer covering the new route (invariant 16).

What these cases do **not** check: whether an ADR's reasoning is sound, whether the prose in
`architecture.md` is still true, or whether a decision was a good one. The machine checks form, a
human checks meaning — the same line the ledger and suite meta-tests draw (`ADR-0010`).

## Summary

| ID        | Title                                                                     | Priority |
| --------- | ------------------------------------------------------------------------- | -------- |
| AR-API-01 | ADR files are named `ADR-NNNN-slug.md` and numbers are unique             | P0       |
| AR-API-02 | every ADR has a heading, a known status and the three sections            | P1       |
| AR-API-03 | the ADR index and the directory agree in both directions                  | P1       |
| AR-API-04 | superseded records link to their replacement, and back                    | P2       |
| AR-API-05 | every controller route is in the API contract, and the other way round    | P0       |
| AR-API-06 | every guarded route is listed in `PROTECTED_ROUTES`                       | P0       |
| AR-API-07 | every agent definition declares name, description, tools and model        | P1       |
| AR-API-08 | every role the `team-roles` skill names exists as a definition            | P2       |
| AR-API-09 | every ID cited in the Routes table Cases column exists in a cases doc     | P1       |
| AR-API-10 | every stage cited in a profiling record exists in the process inventory   | P1       |
| AR-API-11 | every corpus fact key is unique and inside its document block             | P0       |
| AR-API-12 | every keyed fact names a source                                           | P0       |
| AR-API-13 | no fact key is defined inside a rationale block                           | P1       |
| AR-API-14 | every `FACT-` reference resolves, and living documents cite living facts  | P1       |
| AR-API-15 | the fact lock and the corpus agree: nothing deleted or reworded           | P0       |
| AR-API-16 | every retired fact names a successor that exists, or a sourced withdrawal | P0       |
| AR-API-17 | the retirement register parses, so the two rules above are not vacuous    | P1       |

A walk self-check runs before all of them: if the scanner finds no ADRs, no routes, no agents or no
Routes table, every rule below would pass having checked nothing. That failure mode is not
hypothetical — it is how `suite-integrity` once went green under any violation of the convention.

## Cases

### AR-API-01 — ADR files are named `ADR-NNNN-slug.md` and numbers are unique

- **Priority:** P0
- **Steps:** list `docs/adr/*` excluding `README.md` and `TEMPLATE.md`; match each name against
  `ADR-NNNN-kebab-slug.md`; collect the numbers.
- **Expected:** every file matches, and no number appears twice. IDs are never reused, not even
  after a record is deleted — plans cite them, and `pnpm check:orientation` resolves those
  citations against this directory.
- **Failure means:** create records with `pnpm adr:new <slug>`, which takes the next free number.

### AR-API-02 — every ADR has a heading, a known status and the three sections

- **Priority:** P1
- **Steps:** for each record read the `# ADR-NNNN — <title>` heading, the `- **Status:**` line and
  the section headings.
- **Expected:** the heading's ID matches the filename; the status is one of `proposed`, `accepted`,
  `superseded`, `rejected`; `## Context`, `## Decision` and `## Consequences` are all present.
- **Why:** a record without context cannot be re-judged later, and re-judging is the only reason it
  is kept.

### AR-API-03 — the ADR index and the directory agree in both directions

- **Priority:** P1
- **Steps:** parse the table in `docs/adr/README.md`; compare it with the files on disk.
- **Expected:** every record has a row, every row has a file, each row links to the right filename,
  and the status in the row matches the status in the record.
- **Why both directions:** a record missing from the index is invisible to anyone starting from the
  log; a row without a file is a dead link. One-way checks let each happen in turn.

### AR-API-04 — superseded records link to their replacement, and back

- **Priority:** P2
- **Steps:** for each record read `- **Status:**`, `- **Superseded by:**` and `- **Supersedes:**`.
- **Expected:** a record with status `superseded` names the record that replaced it; that record
  exists; and its `Supersedes` line names this one. A record that names a successor but is not
  marked `superseded` is equally a failure.
- **Why:** an accepted ADR is never edited in substance — a changed decision is a new record. The
  link in both directions is what keeps the history readable backwards.

### AR-API-05 — every controller route is in the API contract, and the other way round

- **Priority:** P0
- **Steps:** scan `apps/api/src/**/*.controller.ts` for `@Controller(...)` plus
  `@Get/@Post/@Put/@Patch/@Delete(...)`, joining the prefix and the path; parse the Routes table in
  `docs/api-contract.md`; compare both ways, including whether the route is guarded.
- **Expected:** the two sets are identical, and the `Guard` column agrees with the presence of
  `@UseGuards` on the class or the method.
- **Why:** this is precisely where documentation rots — the code moves and the prose stays. The
  comparison is by string, which is possible only because there is no global API prefix
  (`ADR-0005`).

### AR-API-06 — every guarded route is listed in `PROTECTED_ROUTES`

- **Priority:** P0
- **Steps:** take the guarded routes from the controllers; parse `PROTECTED_ROUTES` in
  `e2e/security/security.api.spec.ts`, dropping any query string.
- **Expected:** every guarded route appears in the list.
- **Why:** that list is the only thing connecting the cross-feature security suite to a growing
  application. Forget a line and `SEC-API-01` keeps passing while no longer covering the new route
  — invariant 16, and a silent loss of coverage rather than a failure.

### AR-API-07 — every agent definition declares name, description, tools and model

- **Priority:** P1
- **Steps:** read the frontmatter of each `.claude/agents/*.md`.
- **Expected:** `name`, `description`, `tools` and `model` are all present, and `name` matches the
  filename.
- **Why:** a role's boundary **is** its tool list, and its cost is its model. A definition leaving
  either to the caller reverts to what `ADR-0014` was written to fix: everything inheriting the
  parent's model, and a reviewer able to edit the code it is judging.

### AR-API-08 — the roles table and the agent definitions agree in both directions

- **Priority:** P2
- **Steps:** collect every role named in the first column of the roles table in
  `.claude/skills/team-roles/SKILL.md` — **every** row, not a prefixed family — and compare with the
  files in `.claude/agents/` in both directions.
- **Expected:** each named role has a definition, and each definition is named in the table.
- **Why:** a role described in a skill but absent from disk cannot be dispatched — it reads like a
  boundary and is a paragraph. A definition no table names is unreachable, which is the same failure
  seen from the other side.
- **Why the table is read rather than the names filtered:** the first version kept only
  `implementer-*` and `tester-*`, so the research and design families added later would have been
  skipped silently while the case went on claiming to cover the skill. The spec records that as the
  "vacuously green" failure arriving through a filter instead of a moved directory.
- **This entry was itself wrong until `FX-034`:** it described the one-way version and carried a
  "Known gap" about the direction the spec had already been checking. Found by the first `TUNE-S1`
  review; the same class of defect as the cases doc `FEAT-G4` caught in the previous cycle.

### AR-API-09 — every ID cited in the Routes table Cases column exists in a cases doc

- **Priority:** P1
- **Steps:** parse each row of the Routes table in `docs/api-contract.md`; read its Cases cell;
  expand every `` `PREFIX-API-NN`…`MM` `` range — the separator is U+2026 (`…`), a single
  character, and the bare right-hand token inherits the prefix and digit width from the left one,
  so a cell reading `` `FEATURE-API-01`…`04` `` expands to four ids, not two (`FEATURE` is a
  placeholder longer than any real prefix, chosen so this explanation is not itself read as a
  declaration by the scan two paragraphs below); scan every `e2e/**/*.cases.md` for the IDs that
  actually exist.
- **Expected:** every expanded ID is found verbatim in some `.cases.md`. A cell citing no IDs — the
  dash `GET /meetings/:id` carries until its own task fills it in — expands to nothing and passes
  vacuously; that is correct, not a gap, because there is nothing yet to check.
- **Why:** this is the column that lets anyone trace coverage backward from the contract to the
  tests that prove it. A stale or mistyped ID in it is invisible until someone tries to follow it —
  exactly how the research sweep for this feature found four defective cells.
- **Why scan all of `e2e/`, not just `e2e/regression/`:** the `GET /` row cites `SM-API-01`, which
  lives in `e2e/smoke/health.api.cases.md`. Restricting the scan to the regression folder would
  fail a perfectly valid row.
- **Control experiment:** extend a range in a cell so it swallows one of the numbers a paired doc
  calls out as never reused — `home-dashboard.api.cases.md:16` and `auth-login.api.cases.md:16`
  each keep such a list — and confirm the case goes red, naming the offending ID and the row; then
  restore the cell. (The dead ID is deliberately not spelled out here in full: this very file is a
  `.cases.md` under `e2e/`, and writing the literal ID would make it "known" to the scan the check
  performs, defeating the experiment.)

### AR-API-10 — every stage cited in a profiling record exists in the process inventory

- **Steps:** collect every stage and gate identifier defined in `docs/process.md`; scan every
  markdown file under `docs/profiling/` for identifiers of the same shape; report any that the
  inventory does not define.
- **Expected:** every cited identifier is defined. The check first asserts the inventory parsed to a
  non-empty set, so a moved or reworded table cannot make it pass having read nothing.
- **Why:** `ADR-0020` makes the identifiers the join key between a measurement and the thing
  measured, precisely so a renamed heading cannot silently break the link. Without this check that
  promise is held by review alone, and a record citing a stage nobody defined still looks like a
  record — the identifier is well formed, it simply refers to nothing.
- **Why the identifier shape cannot collide with a case ID:** a case ID carries `-API-`, `-FN-` or
  `-UT-` in the middle; a stage carries `-S` or `-G` followed by a number. The two patterns cannot
  match the same token.
- **Control experiment:** in a profiling record, change one cited stage identifier to a well-formed
  one the inventory does not define, and confirm the case goes red naming both the file and the
  identifier; then restore it. Editing a record is acceptable only for this experiment — records are
  append-only evidence (`ADR-0020`), so the restore is part of the experiment, not an afterthought.

### AR-API-11 — every corpus fact key is unique and inside its document block

- **Priority:** P0
- **Steps:** walk the four corpus targets `ADR-0021` names — `docs/architecture.md`,
  `docs/data-model.md`, `docs/api-contract.md` and `docs/adr/` — and collect every keyed fact:
  a list item opening with `` `FACT-NNNN` ``, or a table row whose first or last cell holds nothing
  but the key. Assert the walk found something at all before judging anything.
- **Expected:** no number is defined twice anywhere in the corpus, and every number falls inside its
  document's block (`0001-0999`, `1000-1999`, `2000-2999`, `3000-3999`).
- **Why:** a key is an address, and two facts on one address make every citation of it ambiguous —
  including the ones held outside this repository, in a plan, a review note or an agent's memory.
- **Failure means:** take numbers with `pnpm fact:next`, never by hand. A number is never reused,
  not even after the fact it named was withdrawn.

### AR-API-12 — every keyed fact names a source

- **Priority:** P0
- **Steps:** for each keyed fact take its statement — a list item with its continuation lines, or a
  table row together with the nearest `**Source:**` line above its table, which the rows inherit —
  strip the key itself, and look for a citation token: a repository path, a case ID, an `ADR-`, an
  `FT-`/`CH-`/`FX-`/`BL-` entry, another `FACT-`, an invariant, a probe, a commit, or `this record`.
- **Expected:** every keyed fact carries at least one.
- **Why:** this is the rule the whole of `ADR-0021` rests on. A statement that cannot be traced is
  an inference wearing a key, and once it is keyed it gets cited as fact — which is exactly the
  contamination the record was written to stop.
- **Failure means:** either cite something, or move the statement into a rationale block, where it
  keeps its place in the document and loses its claim to being fact.

### AR-API-13 — no fact key is defined inside a rationale block

- **Priority:** P1
- **Steps:** scan the corpus for blocks opening `> **Rationale`, follow them while the lines stay
  quoted, and look for a keyed fact defined inside after stripping the quote marker.
- **Expected:** none. A rationale block may _reference_ a key — that is how reasoning points at the
  facts it rests on — but it may not define one.
- **Why:** the rationale block is the one place the corpus keeps reasoning. Keying it would make
  reasoning citable as fact and erase the separation in the act of recording it.

### AR-API-14 — every `FACT-` reference in the repository resolves to a defined key

- **Priority:** P1
- **Steps:** scan every markdown file under `docs/`, `e2e/`, `.claude/` and `scripts/` for
  `FACT-NNNN` tokens, skipping fenced code blocks, and resolve each against the keys the corpus
  states and the keys its registers retire.
- **Expected:** every reference resolves, and a **living** document resolves to a _stated_ fact. A
  change folder or a profiling record may cite a retired key — it records what was true when it was
  written, and editing it would falsify the record (`ADR-0011`).
- **Why:** a reference to a withdrawn or mistyped key is indistinguishable by eye from a good one.
  That is how a retired fact goes on being relied upon long after the corpus stopped saying it.
- **Not checked, and cannot be:** the other direction across the repository boundary. An agent's
  memory lives outside git, so nothing here can verify that a memory entry cites a real key — only
  that a key cited inside the repository exists. A memory entry pointing at a retired key is caught
  when it is read, not when it is written (`ADR-0021`, Consequences).

### AR-API-15 — the fact lock and the corpus agree: nothing deleted, added or reworded silently

- **Priority:** P0
- **Steps:** rebuild the lock from the corpus through the same parser `pnpm fact:lock` uses, and
  compare it with `docs/facts-lock.json` entry by entry: keys present on one side only, statuses
  that disagree, and statement hashes that differ.
- **Expected:** no differences.
- **Why:** a key is an address held outside this repository — in a plan, a review note, an agent's
  memory across sessions. Deleting a fact leaves every one of those pointing at nothing. Rewriting a
  statement under its own key is worse: every reference still resolves, and every reader believes
  the new wording is what they cited.
- **Failure means:** if the words changed but the fact did not, run `pnpm fact:lock` so the rewrite
  is visible in the diff. If the fact changed, retire the key and state the new one under a fresh
  number (`ADR-0022`). If a key was deleted, put it back and retire it properly.
- **What it is not:** a prohibition. `pnpm fact:lock` will bless any rewrite — what the check removes
  is _silence_, the same bargain `skills:check` makes.

### AR-API-16 — every retired fact names a successor that exists, or a sourced withdrawal

- **Priority:** P0
- **Steps:** read every `## Retired facts` register in the corpus. For each row: the status parses as
  `retired by FACT-NNNN` or `withdrawn`; something is named in "Recorded in"; a retired key is no
  longer stated in the body; and a named successor is a key the corpus actually states.
- **Expected:** no violations.
- **Why:** closing a fact means pointing at the one that replaces it. A retirement with no successor,
  or one whose successor is itself retired, leaves the reader holding an address with no forwarding
  note — which is the state this whole mechanism exists to prevent.

### AR-API-17 — the retirement register parses, so the two rules above are not vacuous

- **Priority:** P1
- **Steps:** drive the register parser and the retirement rule over a fixture written into the spec:
  one sound retirement, one naming a successor that does not exist, one whose successor is itself
  retired, and one withdrawal naming nothing that recorded it. Assert the parser found all five rows
  and that the rule objects to exactly the three broken ones.
- **Expected:** the fixture parses, and the three objections are raised.
- **Why:** the corpus has no retirements yet, so `AR-API-15` and `AR-API-16` would pass having read
  an empty register — the vacuous-green class `ADR-0010` exists to close, and the one this suite has
  already been caught by once. The fixture lives in the spec rather than under `docs/` so it can
  never be mistaken for part of the corpus.
