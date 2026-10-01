# ADR-0017 — Participants are free-form strings on the meeting, not a relation

- **Status:** accepted
- **Date:** 2026-09-28
- **Supersedes:** —
- **Superseded by:** —

## Context

- `FACT-3330` A target API sketch adds `participants[]` to the meeting. —
  `docs/plans/meetings-detail-participants/research/README.md`, "Requirement, as received"
- `FACT-3331` There was no `participants` field anywhere in `apps/api`, `apps/web`, `e2e` or `docs`. —
  `research/code.md` "Not found", `research/history.md` "Not found"
- `FACT-3332` There was no array-valued field on any entity or DTO in `apps/api/src`; this would be
  the first. — `research/code.md` §5
- `FACT-3333` No ADR addressed array fields or participant modelling. — `research/history.md`,
  "Not found"
- `FACT-3334` `docs/data-model.md` documented exactly two entities, `User` and `Meeting`, and no join
  or relation type. — `research/contract.md` §5
- `FACT-3335` The requester settled the semantics before this record was written: an element is a
  free-form string — a name or an email — with no relation to the `User` entity. —
  `research/README.md`, "Clarifications from the requester", rows #2 and #3
- `FACT-3336` Probe A, run against this repository's own installed `@nestjs/common` 12.0.1 /
  `class-validator` 0.15.1 and its exact `ValidationPipe` options: without `@IsOptional()` an absent
  array field gives 400 and trips both `@IsArray` and the `each: true` validator, so `message`
  carries two strings. — `research/probes.md`, probe A2
- `FACT-3337` An empty `[]` passes `@IsArray()` + `@IsString({ each: true })`. —
  `research/probes.md`, probe A3
- `FACT-3338` `transform: true` does not coerce a string into an array, nor numbers into strings. —
  `research/probes.md`, probes A4 and A5
- `FACT-3339` With `@IsOptional()`, an explicit `"participants": null` is accepted and arrives at the
  handler as `null`. — `research/probes.md`, probe A11
- `FACT-3340` `durationMinutes` carries `@Type(() => Number)` on top of `@IsOptional()`. —
  `apps/api/src/meetings/dto/create-meeting.dto.ts:25`
- `FACT-3341` Driving this repository's own `ValidationPipe` over the real `CreateMeetingDto` showed
  that `durationMinutes: null` is accepted and arrives as `null`, untouched. —
  `docs/plans/meetings-detail-participants/design.md` §1, probe PF2
- `FACT-3342` The same run pinned the rejection messages for `@ArrayMaxSize` and
  `@Length({ each: true })`. — `design.md` §1, probes PF10–PF14

> **Rationale — not a fact.** What remained open, and what this record decides, is where the data
> lives and how it is validated, because the answer constrains every later change to the meeting
> (`BL-007`). The `durationMinutes` probe was run because the design review caught an unlabelled
> inference about to be frozen here: had class-transformer coerced `null` to `0`, `@Min(15)` would
> have rejected it and the symmetry argument below would be false.

## Decision

- `FACT-3343` This record fixes that participants are strings on the meeting rather than a relation,
  that the field is optional on input, that its contents are stored verbatim, and that it is
  bounded. — this record
- `FACT-3344` It does not fix the numbers: changing 20 entries to 50, or 100 characters to 200, is an
  edit to `docs/api-contract.md` and `docs/data-model.md`, not a new ADR. — this record
- `FACT-3345` `participants` is a field of the `Meeting` entity: `participants: string[]`, always
  present internally, never `undefined` and never `null`. — `FACT-1010`,
  `apps/api/src/meetings/meetings.types.ts`
- `FACT-3346` There is no participant entity, no join type and no reference to `User.id`. —
  `FACT-1024`
- `FACT-3347` It travels outward through `MeetingDto` like every other non-owner field, because
  `MeetingDto = Omit<Meeting, 'ownerId'>`. — `FACT-1011`, `docs/data-model.md`
- `FACT-3348` On input it is optional on `CreateMeetingDto`, validated as
  `@IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @Length(1, 100, { each: true })`. —
  `apps/api/src/meetings/dto/create-meeting.dto.ts`, `FACT-2047`
- `FACT-3349` `@IsOptional()` is mandatory rather than stylistic: without it every shipped
  `POST /meetings` call would 400. — invariant 2, `FACT-3336`
- `FACT-3350` The service normalizes what validation lets through: absent and explicit `null` both
  become `[]`, which is the treatment `durationMinutes` already gives both. — `FACT-2051`,
  `FACT-2054`, probes A10, A11, PF1, PF2, PF6, PF7
- `FACT-3351` Strings are stored verbatim: not trimmed, not lower-cased, not deduplicated, and in the
  order sent. — `FACT-1024`, `FACT-2053`
- `FACT-3352` The bounds — at most 20 entries, each 1–100 characters — match how every other value in
  this data model is bounded: `title` 3–100, `durationMinutes` 15–480, `limit` 1–100. —
  `docs/data-model.md`, "Value formats"

Rejected:

- `FACT-3353` A relation to `User` (participants as `usr-` ids, or a join entity) — the requester
  ruled it out, and it would put an entity into `docs/data-model.md` that nothing in a seeded
  in-memory store can enforce referential integrity for. — this record, `ADR-0007`
- `FACT-3354` Objects (`{ name, email }`) — the sketch writes `participants[]` and the requester
  answered "free-form strings"; a nested DTO would also make this the first nested-validation site in
  the repository for no requirement that asks for one. — this record
- `FACT-3355` `@IsEmail({}, { each: true })` — participants are names _or_ emails by the requester's
  answer, so an email rule would reject half the intended values. — this record
- `FACT-3356` `@ValidateIf(...)` instead of `@IsOptional()` so that an explicit `null` 400s — it
  would make `participants` the only field in this API where `null` is rejected while
  `durationMinutes: null` is quietly accepted, and invariant 2 names `@IsOptional()` literally. —
  this record, probe PF2
- `FACT-3357` A separate `MeetingDetailDto` carrying participants while the list keeps four keys —
  two DTOs for one entity means two mappers and two key-set truths, and `POST /meetings` would then
  have to hide what it was just sent. — this record

> **Rationale — not a fact.** The decorator list implements the decision; it is not the decision.
> Stating first what is fixed and what is left to the contract is what lets a later change know which
> parts cost a superseding record.

## Consequences

- `FACT-3358` The response key set of a meeting grows from four to five, so `HD-API-01`
  (`home-dashboard.api.spec.ts:102`) and `HD-API-20` (`:408`) must move — both
  `Object.keys(...).sort()` against `MEETING_KEYS`. — `research/tests.md` §2
- `FACT-3359` Three mirrors of the shape move in the same change or drift: the seed
  (`apps/api/src/meetings/meetings.seed.ts`), its test mirror `e2e/fixtures/seed.ts`, and
  `apps/web/src/lib/types.ts`. — `research/code.md` §3, `ADR-0007`
- `FACT-3360` The store hands out shallow copies (`meetings.service.ts:83-87`), and a shallow copy
  shares the array, so all four paths that hand a `Meeting` out must clone `participants`: the
  constructor's `{ ...seed }` (`:39`), `byOwner` (`:83-87`), `create`'s return (`:77-79`) and the
  by-id read. — `apps/api/src/meetings/meetings.service.ts`
- `FACT-3361` `"participants": null` is stored as `[]`, and that is documented behaviour rather than
  a surprise. — `research/README.md`, contradiction C4; `FACT-2054`
- `FACT-3362` `SM-API-03` reads only titles (`e2e/smoke/seed.api.spec.ts:14-17`), so the mirror rule
  this record relies on is enforced only once that case is extended to compare participants. —
  `e2e/smoke/seed.api.spec.ts`

> **Rationale — not a fact.** The key-set assertions are supposed to fail here: they are the check
> that a field cannot escape silently. The clone cost did not exist while every field was a scalar,
> and the constructor is the sharp one — without a clone the stored object shares an array with the
> module-level `SEED_MEETINGS` constant. Free-form strings mean no check that a participant is a real
> person, ever; that is accepted, because this field is a note rather than an invitation and nothing
> in the product acts on it. A later change wanting 50 participants edits the contract and the data
> model and cites this record; one wanting participants to _be_ users supersedes it.
