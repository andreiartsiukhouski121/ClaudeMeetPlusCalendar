<!-- agent: code-reviewer; session: f097de28-2cfd-4a00-a282-3957c798d492; captured: 2026-10-14T13:58:56.579Z (restored from the transcript, FX-050) -->

VERDICT
Change: clean-architecture-pilot
Gate: FEAT-G4
Pass: first
Verdict: accept-after-blockers
Findings:
- blocker | correction | stale-fact | apps/api/src/meeting-files/domain/limits.ts:14-15 says the filename "is interpolated into Content-Disposition", which contradicts FACT-2115 ("built, never interpolated") and the FX-041 fix; owner implementer-api
- blocker | correction | doc-drift | e2e/regression/meeting-files/meeting-files.unit.cases.md:69-73 "Three tenants" paragraph sits under the value-objects.spec.ts heading but names the Content-Disposition builder as a tenant, and the builder is now in another spec; owner test-designer
- nit | - | dod-passes-when-broken | AR-API-18 never asserts that the walk extracted any specifier from real files, so the cases-doc claim (architecture.api.cases.md:316-318) that "a scanner returning nothing goes red in Step 3" holds only for the walk, not the extractor; owner test-designer then tester-api
- nit | - | assertion-scope | extractor misses import(`x`) with a template literal and createRequire via the allowed node:module, although FACT-3701 says dynamic imports are covered "alike"; owner tester-api
- nit | - | other | meeting-files.error-filter.ts:43-47 default branch throws a plain Error inside a filter (unreachable by types); super.catch(error, host) would give the default 500 instead of an error thrown from the filter itself; owner implementer-api
- nit | - | doc-drift | .claude/skills/clean-architecture/SKILL.md:11 says the skill "does not copy the code", then copies two code blocks (:52-60, :81-89), one nearly verbatim from meeting-files.module.ts:26-33; owner pipeline-implementer
- nit | - | stale-fact | SKILL.md:68 "Keeps invariants 1, 5 and 16": invariant 1 is login-only (FACT-2087); citing it for a controller invites @HttpCode on a 201 route; owner pipeline-implementer
- nit | - | other | dto/upload-file.dto.ts:6 cites `validation.pipe.js:36`, another file's line number, in a file this change edited (CLAUDE.md "Comments in code"); owner implementer-api
- nit | - | other | MF-UT-03 text says the four values are "asserted as a set, so adding a fifth fails here first"; value-objects.spec.ts:93-96 checks only that the four are accepted (pre-existing, moved byte-identical as planned; backlog it); owner test-designer
END VERDICT

## Scope and how I read it

I read the working tree only, using Read, Grep and Glob, so I did not run `git diff`. I could not read the deleted files (`meeting-files.service.ts`, `.rules.ts`, `.rules.spec.ts`, `meeting-file.types.ts`). I reconstructed the old behaviour from `research/code.md` §1–§2, which lists every throw site with its class and argument, and compared it line by line against the new code. That covers:

- every new file under `apps/api/src/meeting-files/**`
- the modified controller, mapper, module, DTO and seed
- the three unit specs and `meeting-files.unit.cases.md`
- `AR-API-18` in both `architecture.api.spec.ts` and its cases doc
- the `security.api.spec.ts` comments at :536 and :756
- `e2e/README.md:55` and `scenarios-index.md`
- `ADR-0034`, `docs/adr/README.md:72`
- the re-pointed passages of `api-contract.md` and `data-model.md`
- `apps/api/CLAUDE.md`
- the skill, `implementer-api.md` and the root `CLAUDE.md` skills paragraph

I did not hash-check `facts-lock.json` myself; I rely on the tester's green `AR-API-15`. The functional run was still in progress when this was dispatched, so this verdict does not cover `MF-FN-*`.

## Strengths

- **The contract is held by construction.** In `meeting-files.error-filter.ts:25-49`, each of the six rows builds the same exception class with the same argument as the old controller (research `code.md` §2). The three 400s pass arrays and the 404s and the 415 pass strings, which satisfies invariant 8. The cap message is now built from `MAX_FILES_PER_MEETING` (:40), which closes `BL-044`'s literal-`10` point. The filter is `@Catch(MeetingFileError)` only, so the 401, 413, string 400 and pipe 400 are untouched (`FACT-3707`). Both 404s keep the argument form (`FACT-3383`).
- **The evaluation order is exact.** `upload-meeting-file.ts:27-48` follows the order of `FACT-2100`/`FACT-2101` and reaches ownership through `MeetingsService.findById` (`meetings-service.access.ts:15-17`), which keeps `ADR-0018`'s single code path. `ownerId` comes from `@CurrentUser()` in all three handlers (invariant 5). Upload stays 201 with no `@HttpCode` (invariant 1, `FACT-2087`).
- **Ordering keeps its tie-break.** The `orderBy` with `id` ascending as the secondary key is in the adapter (`prisma-meeting-file.repository.ts:44`, invariant 7, `FACT-2110`). The within-meeting scoping matches the old service (:57).
- **The boundary is clean.** Every `domain/` file imports only `./` and `node:crypto`; every `application/` file imports only `../domain/` and `./`. There are no decorators in either. The tokens are in the root (`meeting-files.tokens.ts`), and each use case is a `useFactory` keyed by its own class (`meeting-files.module.ts:25-46`). The controller receives the use cases by constructor type and no longer imports `MeetingsService`.
- **Limits are declared once** (`domain/limits.ts`, `FACT-3708`). The interceptor imports `MAX_FILE_SIZE_BYTES` from there (`controller.ts:23,59`), and the entity deliberately does not re-check the ceiling (`meeting-file.ts:47-48`, `FACT-3629`).
- **AR-API-18 works on Windows paths.** It runs fixture steps first, then the walk list, then the self-check, then the judgment (`architecture.api.spec.ts:1470-1535`), in the order the plan's T4 requires. Paths are converted to posix form before relative resolution (:1046-1082). The thirteen forbidden and five allowed controls match the cases doc exactly. The comment-blanking keeps string contents, so it errs towards false positives rather than misses.
- **No stale code pointers remain.** Outside `docs/plans/`, the only mentions of the deleted files are history: the context sections of `ADR-0031:17` (`FACT-3665`, untouched per design §6) and `ADR-0034:18`, plus the ledger and backlog. The re-pointed sources are true: `api-contract.md:255,284-285,300,332,353` and `data-model.md:56`.
- **No new line cites a key due to retire.** None of the changed files I read cites `FACT-3589`, `3572`, `3386`, `0026` or `0059`. `ADR-0034:94-131` cites the records instead (T0 done). The only facts left false of the code are the five named in plan §5:
  - `FACT-3386`: the controller no longer throws.
  - `FACT-3572`: the meeting-files service no longer reads and writes the table.
  - `FACT-3589`: the refused repository layer now exists.
  - `FACT-0026`: the layered-modules pattern row no longer holds for meeting-files.
  - `FACT-0059`: the refused repository-layer row likewise.

  I checked `FACT-3381`, `1061`, `1081`, `0012`, `0013`, `1067`, `3628`, `3642` and `3670`: all still hold. `docs/architecture.md` has nothing on filters or factories.
- **T11 stayed inside its approval.** The changes are the skill, two lines in `implementer-api.md` (:18, :28-29), and the count and list at `CLAUDE.md:397-398`. No other "sixteen"/"ten are ours" copy exists. The skill cites no line number, none of the five keys, and no `FT-` row, and it states that `ADR-0034` is proposed and the pattern covers meeting-files only.

## Blockers (both correction)

1. **`apps/api/src/meeting-files/domain/limits.ts:14-15`** (owner: implementer-api). The comment on `FILENAME_PATTERN` says "the value is interpolated into `Content-Disposition`, so an unchecked one is a header-injection vector". Since `FX-041` the header is built, never interpolated (`FACT-2115`), and `content-disposition.ts` re-escapes on the way out. The comment now sits in a newly created file of this change and misstates which defence exists. **Risk:** a reader treats the regex as the only defence, or "simplifies" the builder. **Fix:** say the pattern is the write-path defence and the builder the read-path one (`FACT-2091`, `FACT-3650`).
2. **`e2e/regression/meeting-files/meeting-files.unit.cases.md:69-73`** (owner: test-designer). Under the `domain/value-objects.spec.ts` heading, "Three tenants: the filename predicate, the content-type pair, and the `Content-Disposition` builder" is no longer true: the builder's cases are under the `meeting-files.content-disposition.spec.ts` heading. **Fix:** drop the builder from that paragraph and move its clause under the builder's heading. This is a prose edit only; no case or Expected line changes.

## Findings (not blocking)

- **AR-API-18 can pass with an extractor that finds nothing.** Step 3 proves the walk found files, but no step proves the extractor got anything out of them. If it returned `[]` for real files, the judgment would pass with nothing judged. The fixture shares the extractor, so this is mostly covered, and T16(b) will show it. Still, cheap insurance would be a Step 3 assertion that the walked files yield at least one specifier in total; the spike already compared specifier count against import-line count. The cases doc's "Why" at :316-318 overstates what Step 3 catches.
- **Two extractor gaps** against `FACT-3701`'s "dynamic imports alike": `import(\`express\`)` (template literal) is not matched, and `node:module`'s `createRequire` is allowed, so `createRequire(import.meta.url)('@nestjs/common')` gets through. Both are contrived; either narrow the claim or exclude `node:module`.
- **Error filter default branch** (`meeting-files.error-filter.ts:43-47`). It is unreachable by types, but if it were ever hit it throws from inside `catch`. Calling `super.catch(error, host)` (a plain 500) is the safer unreachable path.
- **Skill copies code** (`SKILL.md:52-60, 81-89`) right after saying it does not (:11). The wiring block is nearly verbatim from `meeting-files.module.ts:26-33` and will drift. Point to the symbol instead, or call it an illustrative shape.
- **Skill cites invariant 1 for a controller** (`SKILL.md:68`). `FACT-2087` says invariant 1 is login-only, so this misleads the next implementer.
- **Line-number citation in the DTO** (`dto/upload-file.dto.ts:6`, `validation.pipe.js:36`). It is pre-existing and outside T5's grep, but the file was edited in this change.
- **MF-UT-03 overclaims its spec.** The text says "asserted as a set", but the spec only checks the four values are accepted, so adding a fifth would not fail. This is pre-existing and the plan required the moved body to stay byte-identical, so it is a backlog item rather than a change here.

## Minor

- `value-objects.spec.ts:98-99`: no blank line between `});` and `const LEGAL_NAMES`.
- `meeting-files.seed.ts:12`: the rewritten comment line runs past 100 columns.
- `FILENAME_RULE_MESSAGE` (`domain/file-name.ts:4-5`) restates the 100 that `MAX_FILENAME_LENGTH` declares; the filter's 415 text restates the allow-list in prose. Both are as the design specified and contract-fixed (`FACT-2104`, `FACT-2085`), so this is noted, not asked.
- `FACT-2090`'s re-pointed source is `domain/file-name.ts`, but the quoted pattern literal lives in `domain/limits.ts`. That is defensible, since `isValidFilename` is there; consider naming both.
- The scope "today `meeting-files` only" now appears in three places: `implementer-api.md:28`, `SKILL.md:6-8` and `apps/api/CLAUDE.md` Map. That is three edits when `meetings` migrates.
- `meeting-files.unit.cases.md:22, 85, 102` still say "design §3's table", meaning the old `meeting-files` design. That is pre-existing, but it is now ambiguous beside this change's own `design.md` §3.
- Ledger: no `FT-` row yet. That is expected, since T14 comes after T16, and is not a finding at this gate.

## Verdict

`accept after blockers`. The refactor keeps the contract and the boundary as planned and introduces no silent fact drift beyond the five keys plan §5 names. The two blockers are statements, one code comment and one case-doc paragraph, that now say something false. Each is a narrow fix, implementer-api for `limits.ts` and test-designer for the cases doc, and neither needs the change folder re-read.

Files referenced:
- C:\GIT\PurpleSchool\apps\api\src\meeting-files\domain\limits.ts
- C:\GIT\PurpleSchool\e2e\regression\meeting-files\meeting-files.unit.cases.md
- C:\GIT\PurpleSchool\e2e\architecture\architecture.api.spec.ts
- C:\GIT\PurpleSchool\e2e\architecture\architecture.api.cases.md
- C:\GIT\PurpleSchool\apps\api\src\meeting-files\meeting-files.error-filter.ts
- C:\GIT\PurpleSchool\.claude\skills\clean-architecture\SKILL.md
- C:\GIT\PurpleSchool\apps\api\src\meeting-files\dto\upload-file.dto.ts
- C:\GIT\PurpleSchool\apps\api\src\meeting-files\domain\value-objects.spec.ts
