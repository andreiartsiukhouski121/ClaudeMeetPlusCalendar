# Architecture decision records

One file per decision that is expensive to reverse. An ADR answers **why**, so that the next person
— or the next agent — does not re-derive it, re-litigate it, or quietly undo it.

What belongs here: a choice that constrains later work. Module boundaries, the session scheme, the
storage model, the contract format, a refused dependency, a process rule the whole team must follow.
What does not: how a function is written, which name reads better, anything a code comment settles.

## Rules

- **Create with `pnpm adr:new <slug>`.** It takes the next free number and fills the template —
  numbering by hand is how two `ADR-0007`s happen.
- **An accepted ADR is not edited in substance.** It is a record of what was decided and when. A
  decision that changes gets a **new** ADR whose `Supersedes` names the old one, and the old one's
  status becomes `superseded` with a `Superseded by` link. Rewriting history here destroys the only
  reason the file exists.
- **Statuses:** `proposed` (written, not yet agreed), `accepted` (in force), `superseded` (replaced
  — the link says by what), `rejected` (considered and turned down; kept so it is not proposed
  again).
- **An architectural change writes its ADR before its code.** The plan cites the ADR ID; the
  reviewer checks the code against it. An ADR written afterwards is a justification, not a decision.
- **Facts carry keys, reasoning does not.** Context and Decision state facts as keyed lines
  (`FACT-NNNN`) that name their source; Consequences is largely projection and is keyed only where a
  statement is checkable today. Reasoning goes in a block opening `> **Rationale — not a fact.**` and
  carries no key, so it can never be cited as fact (`ADR-0021`). Take numbers with `pnpm fact:next`;
  `AR-API-11`…`AR-API-14` check the form. Adding keys to an existing record is a change of form, not
  of substance, and is the one edit the immutability rule above allows.
- **The four sections are mandatory:** Context, Decision, Consequences, and the header block with
  Status and Date. `AR-API-01`…`AR-API-04` check the form on every `pnpm verify`; nothing checks the
  content — that is what review is for.
- Section 0 of every plan answers **Architecture impact** by citing ADR IDs or saying "no matches".
  `pnpm check:orientation` fails the commit otherwise.

## The log

| ID                                                    | Title                                                                    | Status   |
| ----------------------------------------------------- | ------------------------------------------------------------------------ | -------- |
| [ADR-0001](ADR-0001-pnpm-monorepo.md)                 | A pnpm monorepo with two applications and shared config packages         | accepted |
| [ADR-0002](ADR-0002-bff-boundary.md)                  | The browser talks only to Next: a BFF in front of Nest                   | accepted |
| [ADR-0003](ADR-0003-session-jwt-cookie.md)            | The session is the API's own JWT in an httpOnly cookie                   | accepted |
| [ADR-0004](ADR-0004-three-session-checks.md)          | The session is checked three times, not once                             | accepted |
| [ADR-0005](ADR-0005-no-cors-no-prefix.md)             | No CORS and no global prefix on the API                                  | accepted |
| [ADR-0006](ADR-0006-nest-layering.md)                 | Nest layering: controller, service, mapper, and validation as a provider | accepted |
| [ADR-0007](ADR-0007-in-memory-store.md)               | An in-memory store with a code seed instead of a database                | accepted |
| [ADR-0008](ADR-0008-playwright-contract-source.md)    | Playwright at the root, on dedicated ports, owns the contract            | accepted |
| [ADR-0009](ADR-0009-own-guard-and-scrypt.md)          | Our own guard and `node:crypto` instead of passport and bcrypt           | accepted |
| [ADR-0010](ADR-0010-executable-conventions.md)        | Conventions are executable: meta-tests instead of a style guide          | accepted |
| [ADR-0011](ADR-0011-ledger-and-orientation.md)        | A ledger, and an orientation gate before any planning                    | accepted |
| [ADR-0012](ADR-0012-worktree-parallelism.md)          | Parallel agents are isolated by git worktree, never by port              | accepted |
| [ADR-0013](ADR-0013-english-only.md)                  | The project is English-only                                              | accepted |
| [ADR-0014](ADR-0014-agent-roles.md)                   | Roles are fixed agent definitions with their own tools and model         | accepted |
| [ADR-0015](ADR-0015-architecture-corpus.md)           | The architecture corpus is the mandatory planning context                | accepted |
| [ADR-0016](ADR-0016-discovery-stages.md)              | Discovery runs as three reviewed stages in a folder per change           | accepted |
| [ADR-0017](ADR-0017-meeting-participants-strings.md)  | Participants are free-form strings on the meeting, not a relation        | accepted |
| [ADR-0018](ADR-0018-not-found-over-forbidden.md)      | A record the caller does not own answers 404, never 403                  | accepted |
| [ADR-0019](ADR-0019-single-source-route-listing.md)   | The route listing lives in the API contract alone; other documents link  | accepted |
| [ADR-0020](ADR-0020-stage-inventory-and-profiling.md) | Stage inventory and profiling                                            | accepted |
| [ADR-0021](ADR-0021-corpus-facts-are-keyed.md)        | Every fact in the corpus carries a key; inference is marked              | accepted |
| [ADR-0022](ADR-0022-fact-lifecycle.md)                | A fact is appended and retired, never deleted or rewritten in place      | accepted |

The table is checked against the directory in both directions (`AR-API-03`): a file missing from the
table, or a row without a file, fails the run.
