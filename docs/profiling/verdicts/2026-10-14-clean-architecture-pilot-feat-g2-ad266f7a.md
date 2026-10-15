<!-- agent: design-reviewer; session: f097de28-2cfd-4a00-a282-3957c798d492; captured: 2026-10-14T13:15:38.620Z (restored from the transcript, FX-050) -->

VERDICT
Change: clean-architecture-pilot
Gate: FEAT-G2
Pass: first
Verdict: accept-after-blockers
Findings:
- blocker | correction | unverified-guarantee | §8 says the filter fallback needs "no design change beyond that row", but FACT-3700 and FACT-3706 key "the module's one exception filter" in an ADR that is accepted before the code exists; probe the filter now or state what the fallback costs the ADR
- blocker | correction | unverified-guarantee | FACT-3712 and the §5 lint row reject no-restricted-imports as a deny-list that "misses a package nobody listed". ESLint 9.39.5 has `regex` and gitignore-negation `group` patterns that can express an allow-list, and the dynamic-import gap was never probed (research left it open)
- blocker | correction | stale-fact | FACT-3712 gives `FACT-3192` as its source, but that fact is "Lint rules at `warn`. — FX-018" and supports nothing in the statement
- blocker | correction | dod-passes-when-broken | the meta-test's red-control set covers a static import, a relative import of infrastructure and `import()`, but not `import type`, `export … from`, a bare `import '…'` or a multi-line import, all of which FACT-3701 claims; it also does not say whether the control is a permanent in-spec fixture (FACT-3504 precedent) or a one-off run
- blocker | correction | recall-not-read | FACT-3698 and §2 say "byte for byte", but meeting-files.api.spec.ts compares parsed bodies with toEqual and does not assert key order or the headers of error responses
- nit | - | stale-fact | FACT-3572 ("The services read and write through one injected Prisma client") is kept, but MeetingFile will be read and written by an adapter, not a service; a plain-word fact of the kind the research gate warned about
- nit | - | doc-drift | the unkeyed rationale copies in docs/architecture.md (:132-133 "Layered modules make each layer testable…", :175-177 the repository/hand-written-fake sentence) are not dealt with when FACT-0026 and FACT-0059 retire
- nit | - | other | the meta-test sits in the `api` Playwright project, so it also needs Docker and both servers up; §8 Q2 says "at pnpm verify" but not that
- nit | - | other | the choice between `fact:lock` and retirement should cite FACT-3501 ("a wording fix regenerates the lock"); FT-007's "three re-pointed citations" does not show whether the hashed text was touched
- nit | - | other | A1–A4 are named but not drafted, and A4 (the layer may/must-not table) is the corpus's statement of the new rules
END VERDICT

# Design review: clean-architecture-pilot (Design review gate, first pass)

**Verdict: accept after blockers.** The design is sound and every decision stays inside what the owner settled on 2026-10-14. All five blockers are corrections: four are keyed or load-bearing statements that were not checked against the code or the framework, and one is a control experiment that does not cover the coverage it claims. None of them changes a design decision.

Files reviewed:
- `C:\GIT\PurpleSchool\docs\plans\clean-architecture-pilot\design.md`
- `C:\GIT\PurpleSchool\docs\adr\ADR-0034-meeting-files-ports-and-adapters.md`

## Strengths

- **The `FACT-3589` "hand-written fake" argument is answered directly** (ADR rationale after `FACT-3709`). The objection is to the test a port invites, and that test is never written. The cost of the change is stated plainly: one interface with one implementation. This is the answer the owner asked for.
- **The size ceiling is consistent with decision 5** (Domain section, `FACT-3708`, last two rows of §5). The domain owns the number, and the interceptor imports it to enforce the 413 that `FACT-3629` requires. "Source of truth" means the number lives in one place, not that the entity enforces it. An entity check could never fire and would need a hand-written 413. The reasoning holds.
- **Covering use cases only through HTTP follows from the research.** The research shows no database in units (`tests.md` §2), the pre-commit hook must pass without a container, and an `integration` spec would also go over HTTP on `:3101` (`playwright.config.ts:70`). The owner's preference for "the real database" is met by `MF-API-*`. The trade-off is stated in §2, §5, §8 Q1 and the ADR's closing rationale.
- **Every gap the research gate handed forward is covered:**
  - The controller rules `AR-API-05`/`06`: I checked the scan at `architecture.api.spec.ts:381-386`. A `@UseFilters` placed between `@Controller` and `export class` keeps the class-level guard visible to it.
  - The literal dynamic import at `prisma/seed.ts:45`.
  - Errors raised before the handler run (`FACT-3707`).
  - The conflict with `BL-043`.
  - `MEETING_NOT_FOUND_MESSAGE` and `FACT-2112`'s single code path, kept by `MeetingsServiceAccess`.
- **Retiring individual facts instead of superseding whole ADRs has two correct precedents.** `FACT-3111` is retired by `FACT-3651` with ADR-0029 as the record (`ADR-0006:66`), and `FACT-3583` by `FACT-3670` (`ADR-0027:137`). Each retirement names its successor, as `FACT-3487` requires.
- **Real alternatives:** 13 rejected rows, and most give a reason someone who preferred the option would accept (for example "both lint and meta-test" and "per-handler try/catch").
- **Impact table:** I re-ran row 1's grep (`meeting-files\.rules|meeting-files\.service|MeetingFilesService|meeting-file\.types`, excluding plans, the module, dist and profiling). It returns exactly what the row lists: `e2e/README.md:55`, `meeting-files.unit.cases.md:46-48, 53-55, 57`, `security.api.spec.ts:535, 754`, `api-contract.md:255/331/352`, `data-model.md:56` and `ADR-0031:17`. Beyond that it returns only `BACKLOG.md:33` (covered in row 3 as `BL-044`) and the historical `CHANGELOG.md:124`.
- **Security:** nothing new is exposed. Routes, guard and DTO are unchanged. `ownerId` comes from `@CurrentUser()` into the use case (invariant 5). `PROTECTED_ROUTES` is untouched (invariant 16). Invariants 17–19 concern `apps/web` only and do not apply. `MeetingAccess` answers the same way for an absent and a foreign meeting, so the 404-over-403 oracle stays closed.

## Blockers

1. **The filter fallback "needs no design change", but it does (§8, ADR `FACT-3700`/`FACT-3706`)** — correction, unverified-guarantee.
   - **What is wrong:** whether a controller-scoped filter that extends `BaseExceptionFilter`, created by Nest from a class reference, replies identically was not probed. §8 calls the try/catch fallback free. It is not: two keyed Decision facts name "the error filter" and "the module's one exception filter", and §6 has the ADR accepted before any code exists.
   - **What it risks:** finding this out during implementation costs a new superseding ADR, not one table row.
   - **Fix (designer's choice):** run a short probe now, against the installed `@nestjs/core`, with one `HttpException` handed to `super.catch` and one exception that does not match. Or state in §8 that the fallback reopens `FACT-3700`/`FACT-3706` and must be settled before the owner accepts.
   - **Context:** the research gate (`FX-043`) and invariant 8 are why a guess here is not enough. That said, the HTTP cases would fail loudly if the reply differed, so nothing would break silently.

2. **The reason for rejecting the lint rule is partly false and partly unprobed (ADR `FACT-3712`, §5 row 5)** — correction, unverified-guarantee.
   - **"A deny-list misses a package nobody listed":** the rule has `regex` patterns (`node_modules/.pnpm/eslint@9.39.5_jiti@2.7.0/node_modules/eslint/lib/rules/no-restricted-imports.js:97`, `:317-320`) and gitignore-style `group` matching through `ignore()` (`:311`). Either can express an allow-list, so this is a choice of configuration, not a property of the rule.
   - **"Misses `import()`":** this is true. The rule registers only `ImportDeclaration`, `ExportNamedDeclaration` and `ExportAllDeclaration` (`:817-823`). But I established that by reading the source here; the design never checked it, and the research gate handed this forward as unprobed.
   - **Fix:** restate the rejection on what is verified (it misses `import()`, and a lint rule plus the meta-test would be two lists) and cite the evidence, or move the unverified part into the rationale block.
   - **Note:** the decision itself holds on the verified reasons.

3. **`FACT-3712` cites the wrong source** — correction, stale-fact.
   - Its source, `FACT-3192`, is `ADR-0010`'s rejected "Lint rules at `warn`. — `FX-018`" (`ADR-0010-executable-conventions.md:48`). That supports nothing in `FACT-3712`.
   - `AR-API-14` will resolve the key, so nothing mechanical will catch this.

4. **The control experiment does not prove the coverage it claims (Boundary enforcement section, `FACT-3701`/`FACT-3702`)** — correction, dod-passes-when-broken.
   - `FACT-3701` claims static, type-only, re-export and dynamic imports. The red controls exercise only a static `@nestjs/common` import, a relative import of `infrastructure/`, and `import('express')`.
   - An extractor that misses `export * from '@nestjs/common'`, `import type { Response } from 'express'`, or a bare `import 'reflect-metadata'` passes all three controls.
   - The module's own spec writes its import one name per line (`tests.md` §1, `rules.spec.ts:3-8`), so a multi-line import belongs in the control set too.
   - The design should also say whether the controls are a permanent in-spec fixture, as `AR-API-17` drives the retirement path (`FACT-3504`), or a one-off run. A one-off run cannot catch a later regression in the extractor regex.

5. **"Byte for byte" is not what the specs assert (ADR `FACT-3698`, §2 "The error filter and wiring", §7 row 4)** — correction, recall-not-read.
   - `meeting-files.api.spec.ts` compares parsed bodies with `toEqual` (for example `:367`, `:507`, `:786`). It asserts neither key order nor the headers of error responses.
   - The argument still works with "deep-equal parsed body and status". But a keyed fact must say what is true, and this one is the premise of the filter's safety argument.

## Findings

- **`FACT-3572` is a plain-word fact the move may make false.** It says "`User`, `Meeting` and `MeetingFile` are tables. The services read and write through one injected Prisma client" (`ADR-0027:48`). After the move, MeetingFile is read and written by an adapter, not a service. The design's reason for keeping it ("still the only path") is about the client, not about who calls it. This is the class of fact the research gate's second pass warned that `AR-API-15` cannot catch. Decide between keeping and retiring it explicitly.
- **Unkeyed rationale is left behind.** `docs/architecture.md:175-177` repeats the repository/hand-written-fake argument, and `:132-133` gives the reason for "Layered modules". Both explain rows (`FACT-0059`, `FACT-0026`) that will retire, and §6 says nothing about either. The "Layers" subheading "controller → service → store, one direction only" (`:76`) also becomes misleading unless A3 covers it.
- **The meta-test needs Docker, not just `pnpm verify`.** It lives in `architecture.api.spec.ts`, which is in the `api` Playwright project, so the boundary check cannot run without Docker and both servers up. §8 Q2 should say so: it is part of what "late feedback" means here.
- **The lock-vs-retire decision is right but weakly sourced.** `FACT-3501` ("a wording fix regenerates the lock, and a change of meaning retires and replaces") is the keyed authority. The `FT-007` precedent (`history.md:70`) does not show whether those three citations sat inside hashed text.
- **The A1–A4 corpus keys are named but not drafted.** A4 is the may/must-not table for entity, use case, port, adapter and filter, which is the corpus's own statement of the new layer rules. The plan will have to invent its content unless the design pins at least its rows.

## Minor

- `ADR-0018` has no `## Retired facts` register yet. Retiring `FACT-3386` creates one, which `FACT-3489` allows; worth saying so.
- `MF-UT-03`'s prose edit ("the controller normalizes…") should be confirmed as not being an "expectation" under the owner's rule that no existing case expectation is edited.
- The research gate's second-pass items `FACT-2119`/`FACT-2120` and ADR-0014/15/16/32 are not mentioned. Neither seems affected (no web symbol is renamed, and the skill is deferred), but one line each would close them.
- P2 probed a factory building an undecorated class. It did not probe a controller resolving a use case whose token is the class itself, by constructor type. This is standard Nest and the boot check in `test:e2e` will exercise it, but it remains unprobed.
- `FACT-3693` and `FACT-3694` cite `docs/plans/…/research/` as their source. There is precedent (`ADR-0018`'s `FACT-3370`), but those sources are history, not a stable reference.

Read-only review: nothing was edited, and no app or suite was run.
