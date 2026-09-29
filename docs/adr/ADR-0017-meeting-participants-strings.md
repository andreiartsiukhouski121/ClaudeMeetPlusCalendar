# ADR-0017 — Participants are free-form strings on the meeting, not a relation

- **Status:** accepted
- **Date:** 2026-09-28
- **Supersedes:** —
- **Superseded by:** —

## Context

A target API sketch adds `participants[]` to the meeting
(`docs/plans/meetings-detail-participants/research/README.md`, "Requirement, as received"). Nothing
in the project answers what an element of that array is: there is no `participants` field anywhere
in `apps/api`, `apps/web`, `e2e` or `docs` (`research/code.md` "Not found", `research/history.md`
"Not found"), no array-valued field on any entity or DTO in `apps/api/src` — this would be the first
(`research/code.md` §5) — and no ADR addresses array fields or participant modelling
(`research/history.md`, "Not found"). `docs/data-model.md` documents exactly two entities, `User` and
`Meeting`, and no join or relation type (`research/contract.md` §5).

The requester settled the semantics before this record was written
(`research/README.md`, "Clarifications from the requester", row #2/#3): an element is a **free-form
string** — a name or an email — with no relation to the `User` entity. What remains open, and is
what this record decides, is where that data lives and how it is validated, because the answer
constrains every later change to the meeting (`BL-007`, editing and deleting a meeting).

The library behaviour was measured rather than recalled. A throwaway Nest 12 app running against
this repository's own installed `@nestjs/common` 12.0.1 / `class-validator` 0.15.1 and its exact
`ValidationPipe` options established (`research/probes.md`, probe A): without `@IsOptional()` an
absent array field gives 400 and trips both `@IsArray` and the `each: true` validator, so
`message` carries two strings (A2) — invariant 2 holds for arrays specifically; an empty `[]` passes
`@IsArray()` + `@IsString({ each: true })` (A3); `transform: true` does not coerce a string into an
array (A4) nor numbers into strings (A5); and with `@IsOptional()` an explicit `"participants": null`
is **accepted** and arrives at the handler as `null` (A11).

One more thing was measured while this record was being written, because the design review caught it
as an unlabelled inference about to be frozen here. `durationMinutes` carries `@Type(() => Number)`
on top of `@IsOptional()` (`create-meeting.dto.ts:25`), which no earlier probe exercised: had
class-transformer coerced `null` to `0`, `@Min(15)` would have rejected it and the symmetry argument
below would be false. Driving this repository's own `ValidationPipe` directly over the real
`CreateMeetingDto` printed the answer — `durationMinutes: null` is **accepted** and arrives as
`null`, untouched (`docs/plans/meetings-detail-participants/design.md` §1, probe **PF2**). The same
run pinned the rejection messages for `@ArrayMaxSize` and `@Length({ each: true })` (PF10-PF14).

## Decision

**What this record fixes**, and what it deliberately leaves to the contract, stated first so a later
change knows which parts cost a superseding record: it fixes that participants are strings on the
meeting rather than a relation, that the field is optional on input, that its contents are stored
verbatim, and that it is **bounded**. It does **not** fix the numbers — changing 20 entries to 50,
or 100 characters to 200, is an edit to `docs/api-contract.md` and `docs/data-model.md`, not a new
ADR. The decorator list below implements the decision; it is not the decision.

`participants` is a field of the `Meeting` entity: `participants: string[]`, always present
internally, never `undefined` and never `null`. There is no participant entity, no join type and no
reference to `User.id`. It travels outward through `MeetingDto` like every other non-owner field,
because `MeetingDto = Omit<Meeting, 'ownerId'>` is the documented rule
(`docs/data-model.md:37`) and this record does not carve an exception into it.

On input it is **optional** on `CreateMeetingDto`, validated as
`@IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @Length(1, 100, { each: true })`.
`@IsOptional()` is mandatory rather than stylistic: without it every shipped `POST /meetings` call
would 400, which is invariant 2 and what probe A2 printed. The service normalizes what validation
lets through — absent (A10, PF7) and explicit `null` (A11, PF6) both become `[]` — which is the
treatment `durationMinutes` already gives both, measured in PF1 and PF2 rather than assumed.

Strings are stored **verbatim**: not trimmed, not lower-cased, not deduplicated, and in the order
sent. Bounds (at most 20 entries, each 1–100 characters) match how every other value in this data
model is bounded — `title` 3–100, `durationMinutes` 15–480, `limit` 1–100
(`docs/data-model.md`, "Value formats").

Rejected:

- **A relation to `User`** (participants as `usr-` ids, or a join entity) — the requester ruled it
  out, and it would put an entity into `docs/data-model.md` that nothing in a seeded in-memory store
  (`ADR-0007`) can enforce referential integrity for.
- **Objects (`{ name, email }`)** — the sketch writes `participants[]` and the requester answered
  "free-form strings"; a nested DTO would also make this the first nested-validation site in the
  repository for no requirement that asks for one.
- **`@IsEmail({}, { each: true })`** — participants are names _or_ emails by the requester's answer,
  so an email rule would reject half the intended values.
- **`@ValidateIf(...)` instead of `@IsOptional()` so that an explicit `null` 400s** — it would make
  `participants` the only field in this API where `null` is rejected while `durationMinutes: null`
  is quietly accepted (PF2), and invariant 2 names `@IsOptional()` literally.
- **A separate `MeetingDetailDto` carrying participants while the list keeps four keys** — two DTOs
  for one entity means two mappers and two key-set truths, and `POST /meetings` would then have to
  hide what it was just sent.

## Consequences

- The response key set of a meeting grows from four to five, so exactly two assertions must move:
  `HD-API-01` (`home-dashboard.api.spec.ts:102`) and `HD-API-20` (`:408`), both
  `Object.keys(...).sort()` against `MEETING_KEYS` (`research/tests.md` §2). They are the check that
  a field cannot escape silently, and they are supposed to fail here.
- Three mirrors of the shape move in the same change or drift: the seed
  (`apps/api/src/meetings/meetings.seed.ts`), its test mirror `e2e/fixtures/seed.ts` (`ADR-0007`),
  and `apps/web/src/lib/types.ts`, which mirrors `MeetingDto` field for field
  (`research/code.md` §3).
- The store is in-memory and hands out shallow copies (`meetings.service.ts:83-87`). A shallow copy
  **shares the array**, so all four paths that hand a `Meeting` out must clone `participants` — the
  constructor's `{ ...seed }` (`:39`), `byOwner` (`:83-87`), `create`'s return (`:77-79`) and the
  new by-id read. The first is the sharp one: without a clone the stored object shares an array with
  the module-level `SEED_MEETINGS` constant. This cost did not exist while every field was a scalar.
- Free-form strings mean no check that a participant is a real person, ever. That is accepted: this
  field is a note, not an invitation, and nothing in the product acts on it.
- `@IsOptional()` accepting an explicit `null` is now documented behaviour rather than a surprise
  (`research/README.md`, contradiction C4): `"participants": null` is stored as `[]`.
- The bounds are the revisable part (above). A later change that wants 50 participants edits the
  contract and the data model, and cites this record rather than superseding it; a later change that
  wants participants to _be_ users supersedes it, because that is the part this record fixes.
- Three mirrors and one smoke case carry the seed values. `SM-API-03` reads only titles today
  (`e2e/smoke/seed.api.spec.ts:14-17`), so the mirror rule this record relies on is enforced only
  once that case is extended to compare participants — scheduled as part of the same change.
