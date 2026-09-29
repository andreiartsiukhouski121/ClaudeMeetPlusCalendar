# ADR-0018 — A record the caller does not own answers 404, never 403

- **Status:** accepted
- **Date:** 2026-09-28
- **Supersedes:** —
- **Superseded by:** —

## Context

`GET /meetings/:id` is the first route in this API that takes a client-supplied identifier. Until
now every data route was scoped by the token alone: all five route decorators in `apps/api/src` are
parameterless, no `@Param()` exists anywhere, and `NotFoundException` appears nowhere in the API
(`docs/plans/meetings-detail-participants/research/code.md` §4). A route that takes an id can be
asked about records the caller does not own, which is a question the project has never had to
answer.

What the project does say:

- Invariant 5 fixes where `ownerId` comes from, and says nothing about a by-id authorization check
  (`research/contract.md` §9).
- `docs/security.md:26` names "access with another user's token, owner spoofing through the body" as
  a protected-against threat, and prescribes no status code (`research/contract.md` §11).
- `SEC-API-09` (P0, `@p0`) asserts that two users' meeting id sets do not intersect, and its own
  case text says it is an invariant that "must hold once new resources appear"
  (`e2e/security/security.api.cases.md:105-112`). It walks the **list** route only.
- Invariant 6 refuses an enumeration oracle in the login branch: a wrong password and an unknown
  email give the same message.
- The corpus documents no 404 at all: the error-shapes table lists two 400s and two 401s and nothing
  else (`docs/api-contract.md:34-39`), and `NotFoundException` is not mentioned anywhere under
  `docs/` (`research/contract.md` §3).
- `SEC-API-06` nonetheless pins the key set of a 404 body — "the body holds only `statusCode`,
  `message`, `error`" (`security.api.cases.md:80-86`), asserted at `security.api.spec.ts:227` — for
  a 404 from an unmatched path. That promise lives in a case file and in no document
  (`research/README.md`, contradiction C5).
- The two call forms of `NotFoundException` do not produce the same body on `@nestjs/common` 12.0.1.
  Measured, not recalled (`research/probes.md`, probe B): with a message argument the body is
  `{"message":"Meeting not found","error":"Not Found","statusCode":404}` — three keys, `message` a
  string (B1); with **no** argument it is `{"message":"Not Found","statusCode":404}` — the `error`
  key is absent entirely (B2).

The requester chose 404 for the cross-owner case
(`research/README.md`, "Clarifications from the requester", row #4). This record fixes that choice,
its body, and its reach, because the next owner-scoped route (`BL-007` — editing and deleting a
meeting) will otherwise decide it again from scratch.

## Decision

An owner-scoped read of a single record answers **404** in two situations that are deliberately
indistinguishable: no record with that id exists, and a record with that id exists but belongs to
another owner. 403 is not used. The response body, status, headers and code path are identical in
both cases — there is one lookup, scoped by the owner from the token, and one `undefined` result;
the handler never learns which of the two happened, so no later edit can make the two branches
diverge by accident.

The body is exactly:

```json
{ "message": "Meeting not found", "error": "Not Found", "statusCode": 404 }
```

produced by `new NotFoundException('Meeting not found')` — **the argument form is mandatory**. The
no-argument form drops the `error` key (probe B2) and would break the three-key rule `SEC-API-06`
states for every error body this API returns.

`message` is a **string** on a 404, as it is on a 401 and unlike a 400. `docs/api-contract.md`'s
error-shapes table gains the 404 row, so the shape is documented where the other three live rather
than only in a case file.

The controller throws; the service returns `undefined`. A service "must not … invent status codes"
(`docs/architecture.md:58`, `ADR-0006`), and translating absence into HTTP is the controller's job.

Rejected:

- **403 for another owner's record** — it confirms the id exists, which is an enumeration oracle of
  exactly the kind invariant 6 refuses for accounts. The requester also ruled it out.
- **404 for a missing record and 403 for a foreign one** — the same oracle, with an extra branch to
  keep honest forever.
- **200 with an empty body, or `null`** — it turns a client's missing-record check into a body
  inspection, and `HD-API-07` already establishes that 200 in this API means "here is the answer".
- **A distinct message per situation** ("no such meeting" / "not yours") — the message is the oracle
  again, in prose.
- **`new NotFoundException()` with no argument** — two keys instead of three (probe B2); it breaks
  `SEC-API-06`'s stated expectation the first time a case samples it.

## Consequences

- Every future owner-scoped by-id route — `BL-007`'s edit and delete first — answers 404 the same
  way and needs no new decision. A route that wants 403 has to supersede this record.
- A legitimate owner who mistypes an id and a user probing someone else's id get the same answer,
  so a support question of the form "why can I not see this meeting" cannot be answered from the
  status code alone. That is the price of the oracle being closed, and it is accepted.
- `SEC-API-09`'s invariant now has a second route to walk: its own case text says it must hold once
  new resources appear, and a by-id route is the resource it was written in anticipation of.
- The 404 shape becomes checkable rather than implied: the corpus documents it, and `SEC-API-06`'s
  three-key assertion is the mechanical check that a handler-thrown 404 keeps it.
- **Indistinguishability is checked, not merely built.** One case — P0, in this change's own
  `meetings-detail.api.cases.md` — requests another owner's real id and a plainly non-existent id
  with the same token and asserts the two responses are **equal**, status and parsed body together.
  Without it this record's central promise would be held by construction and review alone:
  `SEC-API-06` samples key sets of unrelated responses and `SEC-API-09` compares id sets, so neither
  would notice the two bodies drifting apart. A decision with nothing enforcing it decays into a
  preference.
- Timing is **not** equalized. A `Map.get` hit followed by an ownership comparison is measurably
  cheaper than a miss only in theory; `docs/security.md`'s threat model names response-time
  enumeration for **accounts** (invariant 18), not for record ids, and this record does not extend
  that countermeasure to meetings.
