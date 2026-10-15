<!-- agent: research-reviewer; session: f097de28-2cfd-4a00-a282-3957c798d492; captured: 2026-10-14T12:51:17.429Z (restored from the transcript, FX-050) -->

VERDICT
Change: clean-architecture-pilot
Gate: FEAT-G1
Pass: first
Verdict: accept-after-blockers
Findings:
- blocker | shape | other | history.md (haiku) misses BL-040, BL-047, BL-046, FX-041/042/043/046, FT-007's retired service units and the meeting-files probe 7 — re-run the history sweep on a stronger model
- blocker | correction | recall-not-read | history.md describes the prior change folder in terms nobody checked ("26 contradictions", "stage 5–18, two ADRs, five BL closures")
- blocker | correction | recall-not-read | code.md "Not found" and README "Open" say no spec builds a decorated Nest class through DI under Vitest; app.controller.spec.ts and test/app.e2e-spec.ts both do
- blocker | correction | other | about 10 keyed facts name module file paths or class names in hashed statement text (fact lock, AR-API-15); no research file covers this
- blocker | correction | other | contract.md Divergence 2 decides FACT-3105 vs the download path ("not an entity→DTO case"), and FACT-0012 "assemble a response by hand" is not named
- nit | - | doc-drift | FACT-3495 (ADR-0022:72) says AR-API-17 checks the lock hash; architecture.api.cases.md:243 gives that check to AR-API-15; contract.md and tests.md each quote one side and name no conflict
- nit | - | other | tests.md §1 states as fact that the web page replaces the 413 text with "That file is larger than the 1 MiB limit"; that string is nowhere in apps/web/src or e2e specs
- nit | - | other | contract.md "Not found" on web limits names irrelevant hits; code.md §6 unit-spec list leaves out three specs; FACT-3647 is unopened but sits at ADR-0029:47
- nit | - | other | a few inferences are written as findings: contract.md §B "(DTO + class-validator stay outside domain)", code.md §6 "as shown by", history.md "confirmed in … design.md"
END VERDICT

# Research review: clean-architecture-pilot, first pass

Verdict: **accept after blockers.** The code, contract and tests sweeps hold up when checked against the tree. The history sweep, which ran on haiku, missed backlog items and defect entries about this very module, and needs re-running on a stronger model. One shape blocker means the stage re-runs, but only the history sweep needs it. The other four blockers are narrow corrections.

## Strengths (each one checked against the source)

- **Error table (`code.md` §2) is exact.** Each row matches `meeting-files.controller.ts`: :82, :86, :94-96, :102/:132/:152, :110, :158. The order of checks matches the comment at :55-67. The cap message is a literal at :110, not built from `MAX_FILES_PER_MEETING` (README contradiction 4 holds).
- **Importer sweep is complete.** No importer was missed:
  - `apps/api/prisma/seed.ts:45` (dynamic import)
  - `apps/api/src/app.module.ts:7`
  - the controller's import of `meetings.controller.js` for `MEETING_NOT_FOUND_MESSAGE`
- **"design §" comment count is right.** 17 lines in 6 files, `dto:3` "C5" included.
- **Corpus quotes are verbatim.** `FACT-3589` at `ADR-0027:94`; the rationale copy at `docs/architecture.md:175-177`; `FACT-0012`/`0013` at :82-83; `FACT-3386` at `ADR-0018:59`; `FACT-2087`, `FACT-2112`, `FACT-2101`, `FACT-3628`, `FACT-3629`, `FACT-3642`.
- **Test citations hold:**
  - `playwright.config.ts:70` (integration project)
  - `package.json:24`, `:37`
  - `architecture.api.spec.ts:368-370` and :381-396
  - `suite-integrity.api.spec.ts` :26, :32, :43, :66, :141
  - `security.api.spec.ts` :45-47, :53-56, :720
  - `meeting-files.unit.cases.md:57`
- **Contradiction 1 (requirement vs `FACT-0059`/`FACT-3589`) is named, not resolved.** The rationale copy is correctly marked unkeyed.
- **README records the model for each sweep** and flags the haiku sweep itself. Probes P1–P3 keep their commands and output lines.

## Blockers

1. **History sweep is incomplete (`history.md`). Label: shape, category: other.** Its BACKLOG and CHANGELOG sections list only BL-043, BL-044 and FT-007/CH-xxx. Missing:
   - **BL-040**: rewrite the "design §N" comments under `apps/*/src` and add a grep guard for them. README contradiction 3 overlaps a planned item without saying so.
   - **BL-047**: lint bans in the `apps/api` config, with an open lint-time cost. It overlaps the ESLint way of enforcing the import boundary.
   - **BL-046 / FX-045**: tsconfig `include` coverage of directories.
   - **BL-019**: a drift check between `data-model.md` and the DTO/entity types.
   - **Defect entries on this module:**
     - FX-041: `Content-Disposition` was interpolated.
     - FX-042: the `blob` filename.
     - FX-043: `@nestjs/platform-express` maps the multer wrong-field error by exact string match. This bears on "one adapter maps errors to HTTP".
     - FX-046: the `fil-` prefix.
   - **FT-007's Checks cell**: "18 service-layer units against the old store retired/relocated/withdrawn". This is history for "use cases against the real database".
   - **Probe 7** in `docs/plans/meeting-files/research/probes.md:678-711`: a Prisma-backed service under Vitest constructs fine, and a query rejects with `P1001`. Also probes 0e/5 (`embedded-postgres`). This is the only measured evidence on the database-in-tests question. `contract.md` quotes ADR-0027's "probe 7 measured" without opening it.
   - CH-033's commit `e4aa852` is omitted.

   Risk downstream: the design inherits planned work it would duplicate or collide with, as silence. Fix: re-run the history sweep on sonnet, then update README Q9, contradiction 3 and "Still unknown".
2. **Unchecked descriptions of the prior change folder (`history.md`). Label: correction, category: recall-not-read.** "26 contradictions and open questions" and "stage 5–18, two ADRs, five BL closures" match nothing visible in `docs/plans/meeting-files/design.md`'s headings. Count them or delete them.
3. **Wrong "Not found" on DI under Vitest. Label: correction, category: recall-not-read.** `code.md`'s "Not found" (the line on `emitDecoratorMetadata`) and README "Open" say no spec constructs a decorated Nest class through DI. Two specs do:
   - `apps/api/src/app.controller.spec.ts:9-14` compiles a `TestingModule` in which `AppController` takes `AppService` by constructor type (`app.controller.ts:6`), inside `pnpm test`.
   - `apps/api/test/app.e2e-spec.ts:13-18` boots the whole `AppModule` under Vitest, `MeetingFilesController`'s type-injected dependencies included.

   `code.md` §6 even cites the second one, for `reflect-metadata`. The §6 spec list also leaves out `app.controller`, `password` and `users.service`, which `tests.md` lists. Replace the open question with these two precedents. Whether they ran green is a fact of the last `pnpm verify`, not something to infer.
4. **Facts that pin the module's file paths are not covered. Label: correction, category: other.** Keyed facts in list form whose hashed statement text names module paths or symbols (`scripts/facts-parse.mjs:159-175`; only table-level `**Source:**` lines are excluded, per :128-129):
   - `docs/api-contract.md` :243, :251, :255, :284, :299, :331, :352, :359
   - `docs/data-model.md` :71, :96, :178
   - `FACT-2087` and `FACT-2112` name `MeetingFilesController` and `MeetingsService.findById` in their text.

   These are pinned by `docs/facts-lock.json` through AR-API-15 (`architecture.api.cases.md:243-258`). `tests.md` §5 lists only test-side pins. `contract.md` §E says ADR-0022 matters "only if a layering fact changes". Add these facts as path and name pins, citing the lock rule.
5. **Contradiction resolved instead of named (`contract.md` Divergence 2). Label: correction, category: other.** It ends with "noted as the download path is not an entity→DTO case", which settles `FACT-3105`. It also leaves out `FACT-0012`'s "Must not: assemble a response by hand" against the controller's `res.set` + `StreamableFile` at :170-177. State both sides and stop.

## Findings (not blocking)

- **Two research files quote opposite sides of a corpus conflict.** `FACT-3495` (`ADR-0022:72`) says AR-API-17 checks the lock hash; `architecture.api.cases.md:243` gives that check to AR-API-15. `contract.md` quotes the ADR and `tests.md` the cases doc, with no conflict named. Name it.
- **Possible defect to route.** `tests.md` §1 states as fact that the page replaces the 413 text with "That file is larger than the 1 MiB limit" (`meeting-files.functional.cases.md:32-33`). That string appears nowhere in `apps/web/src` or any e2e spec, and `apps/web/src/lib/actions/meeting-files.ts:65-68` returns Nest's message as is. Name it as a case-doc vs code contradiction for the lead to route. `apps/web` is out of scope for the change, so this is not a blocker.
- **`contract.md` "Not found" on web limits** names `session-cookie.ts` and `session.spec.ts`, which are irrelevant `MAX_` hits. The one relevant hit is `apps/web/src/lib/format-file-size.ts:19` (`BYTES_PER_MIB`, a display divisor, not a limit).
- **`FACT-3647` is still unopened** although it sits at `ADR-0029:47`, a one-minute close. README contradiction 1 leaves out `FACT-0008`, which `contract.md` §B lists.
- **Inference written as findings:**
  - `contract.md` §B: "(DTO + class-validator stay outside domain)"
  - `code.md` §6: "as shown by the existing test/app.e2e-spec.ts"
  - `history.md`: "confirmed in … design.md" (cite the source file, not a change folder)

## Gaps to carry forward (for the designer)

- **Where a database-backed use-case test would run.**
  - `pnpm test` is in the pre-commit hook and promises no database (CLAUDE.md; `e2e/README.md:163`; `meeting-files.unit.cases.md:16-18` "keeps them inside the pre-commit floor").
  - The `integration` project exists but has no specs, and its test process has no `DATABASE_URL` (`security.api.spec.ts:716-722`).
  - Meeting-files probe 7 shows `P1001` when no database is up.
  - No pattern exists.
- **Whether a path- or class-name-only edit to a keyed fact is a lock rewrite or a retirement.** It could be a lock rewrite (`pnpm fact:lock`, cases doc :254-256) or a retire-and-replace (`FACT-3487`). This decides the size of the corpus change.
- **What core `no-restricted-imports` catches beyond P1's two cases.** P1 tested one package import and one relative path. Not probed: `import type` (e.g. `express`'s `Response`), `export … from`, dynamic `import()`. The cost to `pnpm lint` time is also unmeasured (BL-047 names it as an open cost).
- **Constraints a moved controller must keep.** `AR-API-05`/`06` find controllers anywhere under `apps/api/src` by the `.controller.ts` suffix, need `@Controller(` on one line, `export class` at line start, and a guard within the decorator window (`architecture.api.spec.ts:368-396`).
- **Literal paths and names that pin the module's layout:**
  - `prisma/seed.ts:45` dynamic-imports the literal path `../src/meeting-files/meeting-files.seed.js`.
  - `seed.api.spec.ts:49` names the seed path in a message.
  - `meeting-files.unit.cases.md:57` and `e2e/README.md:55` name the rules spec path (rules 4, 7, 8).
- **Cross-module coupling.** `MEETING_NOT_FOUND_MESSAGE` is imported from `meetings.controller.ts`, and ownership goes through `MeetingsService.findById` (`FACT-2112`). `meetings` is not migrated, so a domain error for "meeting not found" depends on a module outside the pilot.
- **Errors produced outside the handler.** The 413 and the string 400 come from `FileInterceptor`/`@nestjs/platform-express` (`FACT-2098`, FX-043), and the array 400 from `ValidationPipe`. A single domain-to-HTTP adapter has to leave them alone, or the contract changes.
- **Where id issuing lives.** `fil-` + `randomUUID()` is in the service (`FACT-3669`/`3670`, `ADR-0031`), and BL-043 plans `issueId` in `src/common/`.
- **Keys the requirement departs from beyond `FACT-0059`/`FACT-3589`.** These are listed, not decided: `FACT-3386` (controller translates absence), `FACT-3628` (Buffer conversion only at the controller), `FACT-0008` (module layout).

Gaps from the history re-run (BL-040, BL-047, FX-043) will reach the designer only after that sweep is redone.

Paths:
- C:\GIT\PurpleSchool\docs\plans\clean-architecture-pilot\research\README.md
- C:\GIT\PurpleSchool\docs\plans\clean-architecture-pilot\research\history.md
- C:\GIT\PurpleSchool\docs\plans\clean-architecture-pilot\research\code.md
- C:\GIT\PurpleSchool\docs\plans\clean-architecture-pilot\research\contract.md
- C:\GIT\PurpleSchool\docs\plans\clean-architecture-pilot\research\tests.md
- C:\GIT\PurpleSchool\apps\api\src\app.controller.spec.ts
- C:\GIT\PurpleSchool\apps\api\test\app.e2e-spec.ts
- C:\GIT\PurpleSchool\scripts\facts-parse.mjs
- C:\GIT\PurpleSchool\docs\plans\meeting-files\research\probes.md
- C:\GIT\PurpleSchool\docs\BACKLOG.md
