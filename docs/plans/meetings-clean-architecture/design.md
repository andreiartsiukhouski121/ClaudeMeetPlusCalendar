# Design: meetings-clean-architecture

> **No design stage was run** (the owner's trimmed path, 2026-10-15). This file states the shape in
> one paragraph and lists what does not fit; the plan carries the rest.

## 1–7. The shape

The shape is `ADR-0034` and the `clean-architecture` skill applied to `meetings`, with
`meeting-files` as the canonical example: a decorator-free `Meeting` entity in `domain/` (private
constructor, `create(...)` holding the defaults of 60 minutes and `[]`, the canonical-UTC
normalization of `startsAt` and the `mtg-` + given-uuid id; `restore(...)` with no validation), the
DTO's numbers declared once in `domain/limits.ts`, one domain error base with one kind
(`meeting-not-found`); in `application/` a `MeetingRepository` port, a `UuidSource` port and three
use cases (`ListMeetings`, `CreateMeeting`, `GetMeeting`); in `infrastructure/` a Prisma repository
adapter owning the invariant-7 `orderBy`, the invariant-4 count and the one owner-scoped lookup of
`ADR-0018`, and a uuid adapter; at the module root the controller, DTOs, `toMeetingDto`, an error
filter and Symbol tokens. No value objects: every input rule is already enforced by the DTO before
the handler (`FACT-3707`), so an entity re-check could never fire (skill, "Entity and value object").
No `Clock`: nothing in `meetings` reads the instant. The HTTP contract does not change.

What does **not** fit the pattern as written:

- **Uuid port reuse.** `AR-API-18` forbids `meetings/application/` importing `meeting-files`'
  `UuidSource` (research, `AR-API-18`'s resolver), so `meetings` needs its own port; whether it also
  gets its own adapter or shares one is not settled by `ADR-0034`.
- **Access to a migrated module.** The skill's access adapter "reaches an unmigrated module through
  its existing service"; with `MeetingsService` gone, `meeting-files` reaches `meetings` through its
  exported `GetMeeting` use case, which no record or skill line describes.
- **Scope of `ADR-0034`.** `FACT-3699` scopes the record to `meeting-files` alone.

## Style ADR

The style is now `ADR-0035` (proposed, the owner's decision of 2026-10-16): the four layers, inward
dependencies, one error filter per module, limits owned by `domain/`, value objects only where a rule
exists, time and randomness through ports or arguments, and the testing rule, for every module a
migration moves, with `ADR-0034` kept as the pilot's record. It adds the shared kernel —
`apps/api/src/shared/application/` (`Clock`, `UuidSource`, interfaces only) and
`apps/api/src/shared/infrastructure/` (`SystemClock`, `CryptoUuidSource`) — into which
`meeting-files`' two ports and adapters move, so `meetings` uses the shared `UuidSource` and declares
no port of its own (this settles "Uuid port reuse" and "Scope of `ADR-0034`" above). `AR-API-18`'s
resolver and fixture change as `FACT-3733` states. Retired, successor in brackets: from `ADR-0034`,
`FACT-3699` (`FACT-3729`), `FACT-3700` (`FACT-3740`), `FACT-3701` (`FACT-3732`), `FACT-3702`
(`FACT-3733`), `FACT-3709` (`FACT-3739`), `FACT-3715` (`FACT-3746`), `FACT-3718` (`FACT-3734`),
`FACT-3719` (`FACT-3738`); from `docs/architecture.md`, `FACT-0066` and `FACT-0068` (new layer-table
rows placing `Clock`/`UuidSource` in `src/shared/application/` and their adapters in
`src/shared/infrastructure/`, keys at writing time); `FACT-0071` is reworded to cite `FACT-3738` and
re-locked (`FACT-3501`); the plan's new B and C name `ADR-0035`. In the same commit, because
`AR-API-14` fails a living document citing a retired key: the `clean-architecture` skill, the
`architecture.api.cases.md` and `meeting-files.unit.cases.md` case texts, the `FT-008` and `CH-034`
rows of `docs/CHANGELOG.md` and the `docs/BACKLOG.md` row that cite those keys.

## 8. Open questions and deliberate omissions

The three items above are open questions for the owner, listed verbatim in the plan's §6. Omitted on
purpose: the ten-file cap stays in `meeting-files` (owner, 2026-10-15).
