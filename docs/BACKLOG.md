# Backlog

What is still ahead, what was deliberately deferred, and what was **rejected with a reason**. The
companion document is [CHANGELOG.md](CHANGELOG.md) (what is already done).

Both files are read **before** planning a new task, not after. The order is in the
`feature-pipeline` skill, step 0 "Orientation"; the answer form is section 0 of
[docs/plans/TEMPLATE.md](plans/TEMPLATE.md).

**Rules**

- New items go at the top of the table. IDs are never reused.
- `Conflicts with` is mandatory, if only as "no": an item nobody weighed against the rest of the
  backlog is where a second implementation of the same thing comes from.
- A closed item is **never deleted**: its status becomes `closed` and it gains a reference to an ID
  in `CHANGELOG.md`. The history of decisions is worth more than a short file.
- The Rejected section exists so the same idea is not proposed again every other week.
- The structure is checked by `e2e/ledger/ledger.api.spec.ts` on every `pnpm verify`.

Priorities: **P1** blocks production or the next feature; **P2** is needed but can wait; **P3** is
an improvement done in passing.

---

## Open

| ID     | P   | Area     | What                                                                                                             | Depends on        | Conflicts with                                                                                          |
| ------ | --- | -------- | ---------------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------- |
| BL-020 | P3  | process  | Enforce the role file-ownership split mechanically (implementers vs testers) rather than by tool list and review | `CH-016`          | no; it would tighten `ADR-0014` rather than change it                                                   |
| BL-019 | P3  | process  | Drift check for `docs/data-model.md` against the DTO and entity types, the way `AR-API-05` checks routes         | `CH-015`          | no; extends the architecture meta-test                                                                  |
| BL-018 | P3  | process  | Drop the `multer` override from `pnpm-workspace.yaml` once `@nestjs/platform-express` raises its range           | a Nest release    | no; the override only raises a version inside the range and changes no behaviour                        |
| BL-017 | P3  | process  | Update the actions once Node 24 versions ship (a Node 20 deprecation warning is shown now)                       | action releases   | no; a warning, not an error — the run is green                                                          |
| BL-016 | P2  | process  | Real CD: pick a platform, add secrets and a deployment job                                                       | customer decision | no; the `build` job already produces an artifact and a deploy would follow it                           |
| BL-015 | P2  | process  | Branch protection on `main`: a green `verify` required before merging                                            | `CH-008`          | no; a repository setting rather than code                                                               |
| BL-013 | P3  | process  | Tooling for a worktree per agent: creation, ports, teardown                                                      | —                 | no                                                                                                      |
| BL-012 | P2  | security | Scan for secrets across git **history** (`SEC-API-10` only looks at the working tree)                            | —                 | no; extends `SEC-API-10` rather than replacing it                                                       |
| BL-011 | P3  | security | Dependency licence checks / SBOM                                                                                 | —                 | no                                                                                                      |
| BL-009 | P3  | web      | Display time zone from the user profile instead of hard-pinned UTC                                               | —                 | **yes:** `HD-UT-10`…`HD-UT-12` and `formatMeetingDateTime` depend on `timeZone: 'UTC'`; change together |
| BL-008 | P2  | feature  | Real sign-up: an `/auth/register` page plus `POST /auth/register`                                                | —                 | **yes:** `/auth/register` is a placeholder checked by `AL-FN-06`; the case will need rewriting          |
| BL-007 | P2  | feature  | Editing and deleting a meeting                                                                                   | —                 | **yes:** `PROTECTED_ROUTES` and the endpoint list in `apps/api/README.md` will need extending           |
| BL-006 | P2  | security | Remove the default `JWT_SECRET` from the code for production builds                                              | `BL-010`          | no                                                                                                      |
| BL-005 | P2  | security | Security headers (CSP, HSTS, `X-Frame-Options`)                                                                  | real hosting      | no                                                                                                      |
| BL-004 | P2  | security | Seed → migration with pre-computed hashes instead of plaintext in `users.seed.ts`                                | a database        | **yes:** `e2e/fixtures/seed.ts` mirrors the seed; change both or `SM-API-02` goes red                   |
| BL-003 | P3  | security | A dedicated CSRF token instead of relying on Server Action protection and `sameSite=lax`                         | —                 | no                                                                                                      |
| BL-002 | P2  | security | Refresh tokens: the session currently lives an hour, then requires signing in again                              | —                 | **yes:** `SESSION_MAX_AGE_SECONDS` must match `JWT_EXPIRES_IN` (`AL-UT-22`)                             |
| BL-001 | P1  | security | **Rate limiting on `POST /auth/login`** — brute force is currently unlimited                                     | —                 | no                                                                                                      |

## Closed

Never deleted: the history of decisions is worth more than a short file.

| ID     | What it was                                                                      | Closed by |
| ------ | -------------------------------------------------------------------------------- | --------- |
| BL-010 | CI: `.github/workflows/ci.yml` with `pnpm verify` steps                          | `CH-008`  |
| BL-014 | Verify the `.claude/agents/*.md` frontmatter schema and define role→model agents | `CH-016`  |

`BL-001` is the only item I consider a production blocker. Everything else under security is a
deliberate concession of a demo without a database, listed in [security.md](security.md).

---

## Rejected

So it is not proposed again. A rejection is not "never" but "not now, and here is why".

| What                                                        | Why rejected                                                                                                                                                                                                         |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit coverage for `lib/dal.ts`, `proxy.ts`, `lib/actions/*` | The modules are `server-only` or Server Actions — Vitest cannot resolve them in principle. `SEC-FN-04`, `SEC-FN-05`, `HD-FN-01`, `HD-FN-08` go through them. Extracting logic for a metric would make the code worse |
| React component tests in jsdom                              | The UI is covered by functional Playwright tests in a real browser; jsdom would give a second, less trustworthy copy of the same checks                                                                              |
| Deleting `docs/plans/plan-review-*.md` (1416 lines)         | They record **why** decisions came out this way, including nine blockers that would otherwise look like unmotivated edits. Marked as archive — that is enough                                                        |
| Pluralizing the meeting counter                             | The `Meetings total: N` format and pluralization are mutually exclusive; pluralizing would break the `HD-FN-03` locator. The helper was deleted along with cases `HD-UT-13`/`HD-UT-14`                               |
| Mutation testing                                            | The "prove the tests do not pass blindly" role is already filled by the mandatory control experiments, and they cost seconds against minutes of a full mutation run                                                  |
| A global `fullyParallel: false` to remove races             | It would slow the whole suite down for the sake of five mutating cases. The races are solved by dedicated owners, a `serial` block and relative counters                                                             |
| A state reset endpoint for tests                            | A test back door in a production API. Isolation is achieved through data: dedicated owners for mutations                                                                                                             |
| `pnpm audit --audit-level=low` in `verify`                  | It would make any advisory in the dependency tree a blocker. The `high` threshold catches what actually needs a reaction                                                                                             |
