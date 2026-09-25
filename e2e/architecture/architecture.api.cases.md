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

| ID        | Title                                                                  | Priority |
| --------- | ---------------------------------------------------------------------- | -------- |
| AR-API-01 | ADR files are named `ADR-NNNN-slug.md` and numbers are unique          | P0       |
| AR-API-02 | every ADR has a heading, a known status and the three sections         | P1       |
| AR-API-03 | the ADR index and the directory agree in both directions               | P1       |
| AR-API-04 | superseded records link to their replacement, and back                 | P2       |
| AR-API-05 | every controller route is in the API contract, and the other way round | P0       |
| AR-API-06 | every guarded route is listed in `PROTECTED_ROUTES`                    | P0       |
| AR-API-07 | every agent definition declares name, description, tools and model     | P1       |
| AR-API-08 | every role the `team-roles` skill names exists as a definition         | P2       |

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

### AR-API-08 — every role the `team-roles` skill names exists as a definition

- **Priority:** P2
- **Steps:** collect the `implementer-*` and `tester-*` role names written in backticks in
  `.claude/skills/team-roles/SKILL.md`; compare with the files in `.claude/agents/`.
- **Expected:** each named role has a definition.
- **Why:** a role described in a skill but absent from disk cannot be dispatched. It reads like a
  boundary and is a paragraph.
- **Known gap:** the check is one-way and covers only the two prefixed families. A definition that
  no skill mentions is not flagged — it is unused, not broken.
