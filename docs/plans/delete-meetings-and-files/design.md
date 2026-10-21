# Design: delete-meetings-and-files

> **No design stage was run** (the owner's trimmed path, 2026-10-16). This file states the shape in
> one paragraph and lists what does not fit; the plan carries the rest.

## 1–7. The shape

Two owner-scoped deletes behind the existing `JwtAuthGuard`, laid out by `ADR-0035` and the
`clean-architecture` skill with no new layer, port kind or error kind. `meetings` gains a
`DeleteMeeting` use case and one repository port method, `deleteOwned(ownerId, id): Promise<boolean>`,
whose Prisma adapter issues a single `deleteMany({ where: { id, ownerId } })` and answers
`count === 1` — so an absent and a foreign meeting are one `false`, one code path (`ADR-0018`,
`FACT-3381`, `FACT-3392`), and `DeleteMeeting` throws the existing `MeetingNotFoundError`. Its files
go with it through the schema's existing `onDelete: Cascade` (`schema.prisma:49`, `FACT-1057`):
`meetings` never touches the `MeetingFile` table, so no module reaches into another's storage and
no schema change is made. `meeting-files` gains `DeleteMeetingFile`: ownership through the existing
`MeetingAccess` port (`GetMeetingAccess`, `FACT-2124`) first, then one port method
`deleteByIdForMeeting(meetingId, fileId): Promise<boolean>` (`deleteMany({ where: { id: fileId,
meetingId } })`), throwing the existing `MeetingNotFound` or `MeetingFileNotFound`. Both handlers
carry `@HttpCode(HttpStatus.NO_CONTENT)` and return nothing; both filters are unchanged because
every error they meet already has a row. The ten-file cap needs no change: it counts the rows a
meeting holds at upload time, so a delete frees a slot. A second `DELETE` of the same id finds
nothing and answers the same 404 — the deleted record is indistinguishable from one that never
existed, which is `ADR-0018`'s promise rather than an exception to it. No entity method: deletion
carries no domain rule, so there is no new unit case (`FACT-3739`). `apps/web` is untouched.

What does **not** fit the requirement as written:

- **Totals after a delete.** Invariant 4 after a delete needs an owner whose `total` nothing else
  moves; `planner` is shared under `fullyParallel: true` and absolute counters are forbidden in
  `@mutating` cases (`e2e/README.md`). The plan's default is one new seeded user with no meetings,
  used by that case alone — a seed change, not a structural one; the owner may prefer otherwise.
- **`FACT-3642`'s premise.** The cap's stated reason, "a feature with no delete", stops being true;
  the decision (refuse the eleventh file) stands.

## Alternatives rejected

| Alternative                                                          | Why not                                                                                                                           |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Delete the files explicitly, then the meeting, in one `$transaction` | `meetings`' adapter would write the `MeetingFile` table `meeting-files` owns; the FK cascade already guarantees no orphan, probed |
| `GetMeeting` then `prisma.meeting.delete({ where: { id } })`         | two round trips, and `delete` throws `P2025` on a row gone in between — a 500 where the contract says 404                         |
| 200 with the deleted record, or a second `DELETE` answering 204      | the owner asked for 204; a 204 on an absent id would confirm nothing and differ from the read's 404 for the same id               |

## 8. Open questions and deliberate omissions

The two items above are open questions for the owner, verbatim in the plan's §6. No ADR: the cascade
is already in the schema, `ADR-0018` `FACT-3392` covers the 404s, and `ADR-0035` covers the layout.
Omitted on purpose: editing a meeting (`BL-007`'s other half), any UI, and the e2e-suite reshaping.
