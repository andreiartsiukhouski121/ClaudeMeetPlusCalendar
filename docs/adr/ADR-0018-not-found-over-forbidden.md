# ADR-0018 — A record the caller does not own answers 404, never 403

- **Status:** accepted
- **Date:** 2026-09-28
- **Supersedes:** —
- **Superseded by:** —

## Context

- `FACT-3370` `GET /meetings/:id` is the first route in this API that takes a client-supplied
  identifier: all five earlier route decorators in `apps/api/src` are parameterless, no `@Param()`
  existed anywhere, and `NotFoundException` appeared nowhere in the API. —
  `docs/plans/meetings-detail-participants/research/code.md` §4
- `FACT-3371` Invariant 5 fixes where `ownerId` comes from and says nothing about a by-id
  authorization check. — `research/contract.md` §9
- `FACT-3372` `docs/security.md:26` names "access with another user's token, owner spoofing through
  the body" as a protected-against threat, and prescribes no status code. —
  `research/contract.md` §11
- `FACT-3373` `SEC-API-09` (P0, `@p0`) asserts that two users' meeting id sets do not intersect, and
  its own case text says it is an invariant that must hold once new resources appear; it walks the
  list route only. — `e2e/security/security.api.cases.md:105-112`
- `FACT-3374` Invariant 6 refuses an enumeration oracle in the login branch: a wrong password and an
  unknown email give the same message. — `CLAUDE.md`, invariant 6
- `FACT-3375` The corpus documented no 404 at all: the error-shapes table listed two 400s and two
  401s and nothing else, and `NotFoundException` was not mentioned anywhere under `docs/`. —
  `research/contract.md` §3
- `FACT-3376` `SEC-API-06` nonetheless pins the key set of a 404 body — only `statusCode`, `message`,
  `error` — for a 404 from an unmatched path, and that promise lived in a case file and in no
  document. — `security.api.cases.md:80-86`, `security.api.spec.ts:227`,
  `research/README.md`, contradiction C5
- `FACT-3377` Measured on `@nestjs/common` 12.0.1: with a message argument the body is
  `{"message":"Meeting not found","error":"Not Found","statusCode":404}` — three keys, `message` a
  string. — `research/probes.md`, probe B1
- `FACT-3378` With no argument the body is `{"message":"Not Found","statusCode":404}` — the `error`
  key is absent entirely. — `research/probes.md`, probe B2
- `FACT-3379` The requester chose 404 for the cross-owner case. — `research/README.md`,
  "Clarifications from the requester", row #4

> **Rationale — not a fact.** A route that takes an id can be asked about records the caller does not
> own, which is a question the project had never had to answer. This record fixes that choice, its
> body and its reach, because the next owner-scoped route (`BL-007`) would otherwise decide it again
> from scratch.

## Decision

- `FACT-3380` An owner-scoped read of a single record answers 404 in two deliberately
  indistinguishable situations: no record with that id exists, and a record with that id exists but
  belongs to another owner. 403 is not used. — `FACT-2065`, `MD-API-03`, `MD-API-04`
- `FACT-3381` The response body, status, headers and code path are identical in both cases: one
  lookup scoped by the owner from the token, one `undefined` result, and the handler never learns
  which of the two happened. — `apps/api/src/meetings/meetings.service.ts`
- `FACT-3382` The body is exactly
  `{ "message": "Meeting not found", "error": "Not Found", "statusCode": 404 }`, produced by
  `new NotFoundException('Meeting not found')`. — `FACT-2065`, probe B1
- `FACT-3383` The argument form is mandatory: the no-argument form drops the `error` key and would
  break the three-key rule `SEC-API-06` states. — `FACT-2066`, probe B2
- `FACT-3384` `message` is a string on a 404, as it is on a 401 and unlike a 400. — `FACT-2017`
- `FACT-3385` `docs/api-contract.md`'s error-shapes table carries the 404 row. — `FACT-2016`
- `FACT-3386` The controller throws and the service returns `undefined`: translating absence into
  HTTP is the controller's job. — `FACT-0013`, `ADR-0006`

Rejected:

- `FACT-3387` 403 for another owner's record — it confirms the id exists, an enumeration oracle of
  exactly the kind invariant 6 refuses for accounts; the requester also ruled it out. — this record
- `FACT-3388` 404 for a missing record and 403 for a foreign one — the same oracle, with an extra
  branch to keep honest forever. — this record
- `FACT-3389` 200 with an empty body, or `null` — it turns a client's missing-record check into a
  body inspection, and `HD-API-07` already establishes that 200 in this API means "here is the
  answer". — this record
- `FACT-3390` A distinct message per situation ("no such meeting" / "not yours") — the message is the
  oracle again, in prose. — this record
- `FACT-3391` `new NotFoundException()` with no argument — two keys instead of three; it breaks
  `SEC-API-06`'s stated expectation the first time a case samples it. — this record, probe B2

## Consequences

- `FACT-3392` Every future owner-scoped by-id route answers 404 the same way and needs no new
  decision; a route that wants 403 has to supersede this record. — this record, `BL-007`
- `FACT-3393` `SEC-API-09`'s invariant has a second route to walk. —
  `e2e/security/security.api.cases.md:105-112`
- `FACT-3394` One P0 case in `meetings-detail.api.cases.md` requests another owner's real id and a
  plainly non-existent id with the same token and asserts the two responses are equal, status and
  parsed body together. — `e2e/regression/meetings-detail/meetings-detail.api.cases.md`
- `FACT-3395` Timing is not equalized: `docs/security.md`'s threat model names response-time
  enumeration for accounts (invariant 18), not for record ids, and this record does not extend that
  countermeasure to meetings. — `docs/security.md`, invariant 18

> **Rationale — not a fact.** A legitimate owner who mistypes an id and a user probing someone else's
> id get the same answer, so "why can I not see this meeting" cannot be answered from the status code
> alone. That is the price of the oracle being closed, and it is accepted. Without the equality case,
> this record's central promise would be held by construction and review alone — `SEC-API-06` samples
> key sets of unrelated responses and `SEC-API-09` compares id sets, so neither would notice the two
> bodies drifting apart. A decision with nothing enforcing it decays into a preference.
