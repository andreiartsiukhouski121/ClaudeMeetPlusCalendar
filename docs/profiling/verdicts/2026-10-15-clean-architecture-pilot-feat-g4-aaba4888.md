<!-- agent: code-reviewer; session: f097de28-2cfd-4a00-a282-3957c798d492; captured: 2026-10-15T11:22:46.287Z -->

VERDICT
Change: clean-architecture-pilot
Gate: FEAT-G4
Pass: re-run
Verdict: accept-after-blockers
Findings:
- blocker | correction | stale-fact | system-clock.ts:3 and crypto-uuid-source.ts:5 cite FACT-3720 (the thin-entity fact) as the source of the adapters; the ports-and-adapters fact is FACT-3718
- blocker | correction | recall-not-read | clean-architecture SKILL.md:36 says the clock and UUID adapters carry `@Injectable()`; neither SystemClock nor CryptoUuidSource has the decorator
- blocker | correction | stale-fact | FACT-3718 (ADR-0034:89-91) says the adapters are bound "by Symbol token and useFactory"; the module binds them with useClass, and useFactory is only for the use cases (FACT-3705, SKILL.md:42)
- nit | - | stale-fact | FACT-3700 lists what sits at the module root but leaves out meeting-files.tokens.ts
- nit | - | stale-fact | FACT-3695's source "docs/architecture.md, refused patterns" now points at a row that has been retired (FACT-0059); the Rejected entry it cites from ADR-0027 (FACT-3589) is retired too, but its register row still holds the statement
END VERDICT

Scope: only this round's changes, read by me in one pass: the 4 new port and adapter files, tokens, module, use case, entity, the entity spec, MF-UT-15/16 in the unit cases file, ADR-0034, the retirement tables in ADR-0007/0018/0027 and docs/architecture.md, the matching docs/facts-lock.json entries, the ADR log row and the clean-architecture skill.

## Strengths
- No clock or randomness is read in `domain/` or `application/`. A search across meeting-files finds `new Date()` only in `infrastructure/system-clock.ts:6` and `randomUUID` only in `infrastructure/crypto-uuid-source.ts:8`. This holds FACT-3719 and invariant 7's spirit of making things deterministic.
- The wiring has the same form as the existing ports: `meeting-files.module.ts:35-38` binds with a Symbol token and `useClass`, `:39-48` uses `useFactory` with `inject`, and `meeting-files.tokens.ts:5-8` now honestly says "four ports".
- HTTP behaviour is unchanged. `domain/meeting-file.ts:56,62` still builds `fil-${uuid}` and `now.toISOString()`. Composing the id in the domain (not the adapter) matches FACT-3718 and the rejection in FACT-3722.
- `domain/meeting-file.spec.ts:53-75` matches the MF-UT-15/16 scenario text (unit cases file, lines 156-171), including the deliberately non-v4 all-zero uuid and the two-ids check. No fake timers and no double.
- FACT-3709 ("no test double anywhere") is true: across the repository, the only `implements Clock|UuidSource|MeetingFileRepository|MeetingAccess` hits are the four adapters, and there is no `useFakeTimers` or `setSystemTime`.
- The retirements follow ADR-0022 (the fact-lifecycle rule):
  - FACT-3589→3703 and FACT-3572→3716 sit in ADR-0027's register.
  - FACT-3386→3706 sits in ADR-0018's register.
  - FACT-0026→0060 and FACT-0059→0061 sit in the docs/architecture.md register.
  - The FACT-3121 row is re-pointed to FACT-3716 with "Recorded in" `ADR-0027`, `ADR-0034`.
  - All of these agree with docs/facts-lock.json, including status, supersededBy and recordedIn.
  - Every successor is active, and no live file outside the registers, the lock and docs/plans cites a retired key.
- The ADR rewordings happen before ADR-0034 is ever committed, so no key that was already published changes meaning.
- The A4 table (docs/architecture.md:95-104) matches the code. In particular, FACT-0067 limits `@Injectable()` to the repository and access adapters, and FACT-0068 does not claim it.
- FACT-3723 is accurate: the import rule (FACT-3701) admits `node:` built-ins. I have left the known open item about the AR-API-18 allow-list alone, as asked.
- The skill copies no code. It names each example by path and symbol, and it stays within the approved items: the clock/uuid rule, the Use-case row, the ports and adapters rows, the thin entity, and the accepted status.

## Blockers (all `correction`; none changes a decision)
1. Owner: implementer-api. `apps/api/src/meeting-files/infrastructure/system-clock.ts:3` and `crypto-uuid-source.ts:5` cite `FACT-3720`, which is "MeetingFile is deliberately thin". The fact that declares these adapters is FACT-3718, so a reader who follows the key lands on an unrelated statement. The likely cause is renumbering during drafting. Fix: `FACT-3718`.
2. Owner: whoever authored the skill edit; I assume planner, and the lead routes it. In `.claude/skills/clean-architecture/SKILL.md:36`, the "Clock and randomness adapters" row says they carry `@Injectable()`, but the named examples do not. The skill tells writers "the real files are the examples", so this row contradicts its own example. The code is fine without it (`useClass`, no constructor dependencies) and A4/FACT-0068 does not require it. Fix: drop `@Injectable()` from that row, or have the adapters add it. The first is cheaper and keeps FACT-0067/0068 as they are.
3. Owner: planner. `docs/adr/ADR-0034-meeting-files-ports-and-adapters.md:89-91` (FACT-3718) says the adapters "are bound like the other ports, by `Symbol` token and `useFactory`". The adapters are bound with `useClass`; `useFactory` constructs the use cases. As written, it is a false statement about the module. Fix it now, while the key is still uncommitted (refresh the lock hash). After the commit it would need a retirement.

## Findings / Minor
- FACT-3700 (ADR-0034:64-65) lists what sits at the module root but leaves out `meeting-files.tokens.ts`. FACT-3705 and the skill cover the tokens file, so this is a gap, not a contradiction.
- FACT-3695's source still points at "docs/architecture.md, refused patterns", where that row has been retired as FACT-0059. The fact is historical ("was refused"), so it is tolerable. Citing the registers would be more accurate.
- Formatting: ADR-0034:64 and SKILL.md:85 are over-length lines left after editing. That is cosmetic, and only matters if prettier's prose wrapping cares.

## Verdict
Accept after blockers. The code does exactly what FACT-3718/3719 require and the retirements are clean. The three blockers are wrong or mispointed statements about correct code, each a one-line fix.

Not checked: the commit-`d58ddbf` claims in FACT-3694/3697/3717. I cannot read git history with read-only tools; they were in place last round and only their wording changed. Nothing was run, by design.
