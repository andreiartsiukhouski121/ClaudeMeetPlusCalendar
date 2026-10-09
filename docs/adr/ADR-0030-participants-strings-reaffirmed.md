# ADR-0030 — Participants stay free-form strings, for a reason that still holds

- **Status:** accepted
- **Date:** 2026-10-09
- **Supersedes:** [ADR-0017](ADR-0017-meeting-participants-strings.md)
- **Superseded by:** —

## Context

- `FACT-3656` `ADR-0017` rejected a relation to `User` partly because nothing in a seeded in-memory
  store could enforce referential integrity for it. — `ADR-0017`, its retired register
- `FACT-3657` Meetings and users now live in PostgreSQL, which enforces the foreign keys
  `Meeting.ownerId → User.id` and `MeetingFile.meetingId → Meeting.id`. — `ADR-0027`,
  `apps/api/prisma/schema.prisma`
- `FACT-3658` `ADR-0027` kept `participants` as strings and named `ADR-0017`'s premise as stale, a
  reason to revisit that record deliberately rather than in passing. — `FACT-3592`
- `FACT-3659` The only code that touches `participants` validates, normalizes, stores, maps and types
  it: `create-meeting.dto.ts`, `meetings.service.ts`, `meetings.mapper.ts`, `meeting.types.ts`,
  `meetings.seed.ts` in `apps/api` and `lib/types.ts` in `apps/web`. No lookup, access rule or
  notification reads it. — `apps/api/src/meetings/`, `apps/web/src/lib/types.ts`

## Decision

- `FACT-3660` `participants` stays an array of free-form strings on the meeting. Every fact
  `ADR-0017` states stands unchanged and is cited from there rather than repeated here; only its
  rejection of a `User` relation is restated, with a reason that is still true. — this record,
  `ADR-0017`

Rejected:

- `FACT-3661` A relation to `User` (participants as `usr-` ids, or a join entity) — the owner chose
  on 2026-10-09 to keep the field a note rather than an invitation. Nothing in the product acts on a
  participant, so a join table, a `MeetingDto` contract change and a rewritten `SM-API-03` would buy
  no behaviour. Referential integrity is no longer the argument: PostgreSQL could enforce it. —
  this record, `FACT-3659`

> **Rationale — not a fact.** The decision did not change; its justification did. An accepted ADR
> is never edited in substance, and a record citing a reason that no longer holds invites the next
> reader to overturn it on that ground alone — so the reason is replaced by superseding, not by
> rewording.

## Consequences

- `FACT-3662` A change that gives a participant behaviour — seeing the meeting, being notified,
  being checked against an account — supersedes this record. — this record
- `FACT-3663` No code, contract or test changes with this record: `SM-API-03`, `HD-API-01` and the
  `meetings-detail` cases go on holding the shape `ADR-0017` fixed. — this record, `ADR-0017`
