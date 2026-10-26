# ADR-0029 — File bytes live in a bytea column and never cross the JSON boundary

- **Status:** accepted
- **Date:** 2026-10-05
- **Supersedes:** —
- **Superseded by:** —

## Context

> **Rationale — not a fact.** `ADR-0027` puts the data in PostgreSQL. This record decides what a file
> _is_ on the wire, which is contract shape rather than storage: the same bytes can be a column, a
> JSON field, a base64 string or a response body, and three of those are wrong here for reasons that
> were measured rather than assumed.

- `FACT-3614` A Prisma `Bytes` field becomes a PostgreSQL `bytea` column. —
  `docs/plans/meeting-files/research/probes.md`
- `FACT-3615` A 1 MiB `Buffer` written to such a column round-trips byte-identical (SHA-256 matches)
  and comes back as a plain `Uint8Array`: `Buffer.isBuffer` is `false` and the declared type is
  `Uint8Array`. — `docs/plans/meeting-files/research/probes.md`
- `FACT-3616` `JSON.stringify` of that value yields an index-keyed object — `{"0":1,"1":2,"2":3}` —
  not an array and not base64. — `docs/plans/meeting-files/research/probes.md`
- `FACT-3617` Selecting the metadata columns without `content` works, and `onDelete: Cascade`
  removes the dependent file rows with the meeting. — `docs/plans/meeting-files/research/probes.md`
- `FACT-3618` `FileInterceptor` works on Nest 12 with Express 5, and `file.buffer` is a Node
  `Buffer` with the bytes intact. `multer@2.4.0` and `express@5.2.1` are already installed here as
  transitive dependencies of `@nestjs/platform-express`. —
  `docs/plans/meeting-files/research/probes.md`
- `FACT-3619` `@nestjs/platform-express` maps multer's `LIMIT_FILE_SIZE` to
  `PayloadTooLargeException('File too large')`, and its other limit errors to
  `BadRequestException` with a string message. —
  `apps/api/node_modules/@nestjs/platform-express/multer/multer/multer.utils.js`
- `FACT-3620` Next's Server Action body limit is exactly 1 MB by default, read from the installed
  package; exceeding it throws `ApiError(413, "Body exceeded 1 MB limit.")` with
  `__NEXT_ERROR_CODE` `E394`, enforced by a streaming transform rather than after buffering. —
  `docs/plans/meeting-files/research/probes.md`
- `FACT-3621` What the browser and `useActionState` receive for that 413 was not probed. —
  `docs/plans/meeting-files/research/probes.md`
- `FACT-3622` `apps/web/src/lib/api-client.ts` always sets `Content-Type: application/json` and
  `JSON.stringify`s the body; it has no branch for a multipart or binary body, and its `method` is
  typed as `'GET' | 'POST'`. — `apps/web/src/lib/api-client.ts`
- `FACT-3623` The repository's only Route Handler is `apps/web/src/app/auth/session-expired/route.ts`,
  which returns a redirect and no body; no Route Handler here returns a payload or a `Content-Type`
  of its own. — `apps/web/src/app/auth/session-expired/route.ts`
- `FACT-3624` Nothing in `docs/api-contract.md` documents a `413`, a `415` or a non-JSON request
  body, and `docs/security.md` says nothing about uploads, size limits or content types. —
  `docs/plans/meeting-files/research/contract.md`
- `FACT-3647` A multipart part whose own `Content-Type` header is absent, empty or unparseable
  reaches the handler as `file.mimetype === 'text/plain'`: `busboy` initialises the part type to that
  literal and overwrites it only when the header exists and parses, and `multer` passes the value
  through unchanged. The declared type of such a part is therefore not observable above the parser. —
  `node_modules/.pnpm/busboy@1.6.0/node_modules/busboy/lib/types/multipart.js`,
  `node_modules/.pnpm/multer@2.4.0/node_modules/multer/lib/make-middleware.js`
- `FACT-3653` An `<input type="file">` submitted with no selection reaches a Server Action as a
  `File` named `blob`, of size `0` and type `application/octet-stream`. The browser's own request
  carries `filename=""` — confirmed on the wire — and Node's standards-based `Request.formData()`
  parses that faithfully into a `File` with an empty `name`; Next's own decoder sits between the two
  and reconstructs the `File` with the WHATWG default filename for an unnamed `Blob`, discarding the
  empty string the browser actually sent. — `MF-FN-15`,
  `apps/web/src/lib/api-client.ts`
- `FACT-3648` `busboy` applies `basename()` to a part's filename unless `preservePath` is set, which
  `multer` does not set, and prefers a percent-decoded RFC 5987 `filename*` over `filename`; `multer`
  then decodes `%0A`, `%0D` and `%22` in it back into a literal newline, carriage return and double
  quote. That `basename` treats `\` (0x5C) as a separator exactly like `/` (0x2F) and yields the
  empty string for a name that reduces to `.` or `..`, which `multer` then discards. So
  `file.originalname` reaches the handler with its path already stripped, never empty, and with those
  three characters re-introduced. —
  `node_modules/.pnpm/busboy@1.6.0/node_modules/busboy/lib/types/multipart.js`,
  `node_modules/.pnpm/multer@2.4.0/node_modules/multer/lib/make-middleware.js`

## Decision

- `FACT-3625` File bytes live in `MeetingFile.content`, a Prisma `Bytes` column, in the same row as
  the file's metadata. — this record
- `FACT-3626` Bytes never appear inside a JSON body. The listing endpoint returns metadata only,
  through a mapper that drops `content` the way `toMeetingDto` drops `ownerId`. — this record,
  `apps/api/src/meetings/meetings.mapper.ts`
- `FACT-3627` Exactly one endpoint returns bytes, and it returns them as the response body: the
  stored `contentType` as `Content-Type`, the length of the buffer actually sent as `Content-Length`,
  a `Content-Disposition: attachment` header **built** from the stored filename rather than
  interpolated with it, and `X-Content-Type-Options: nosniff`. Never inline, so a stored file cannot
  execute in the application's own origin. — this record
- `FACT-3650` The read path derives that header from an arbitrary stored string and is safe for any
  value in the column, because the column has more than one writer: the upload route validates what
  it admits, and the seed writes rows the upload route would have refused. A read path validates its
  own output rather than inheriting the write path's guarantees. — this record,
  `apps/api/src/meeting-files/meeting-files.seed.ts`, `SEC-API-11`
- `FACT-3628` The `Uint8Array` Prisma hands back is converted to a `Buffer` at the controller
  boundary and nowhere else. — this record, `FACT-3615`
- `FACT-3629` The largest accepted file is 1 048 576 bytes, enforced by the file interceptor's
  `limits.fileSize`, so the 413 body is the one `@nestjs/platform-express` already produces rather
  than one written by hand. — this record, `FACT-3619`
- `FACT-3630` `apps/web/next.config.ts` sets `experimental.serverActions.bodySizeLimit` to `'2mb'`,
  comfortably above the API's limit plus a multipart envelope, so the rejection a user meets is
  always the API's documented 413 and never Next's. The setting has no per-action form, so it raises
  the ceiling for every Server Action including the unauthenticated `loginAction`: the body an
  anonymous visitor can make Next buffer goes from 1 MiB to 2 MiB, and `docs/security.md` records
  that beside its other deliberate gaps. — this record, `FACT-3620`, `docs/security.md`
- `FACT-3631` Content types are allow-listed at upload and anything else is refused with a 415. The
  comparison is made on the media type alone, lower-cased and with any parameters stripped, and it is
  that normalized value that is stored — never the client's raw header — so the `Content-Type` sent
  back by `FACT-3627` is provably one of the four. The allow-list is a usability guard, and
  `Content-Disposition: attachment` with `nosniff` is the security control, because a part's declared
  type is supplied by the client. — this record, `FACT-3627`
- `FACT-3649` A part carrying no declared content type is accepted as `text/plain`, because the
  contract cannot distinguish it from one that declares `text/plain`. The client's declared type is
  not merely untrusted here, it is not observable, which is why the stored value is normalized to one
  of four literals and the download is served `attachment` with `nosniff` rather than trusting it. —
  this record, `FACT-3647`, `FACT-3627`
- `FACT-3654` `apiFetchMultipart` matches that exact triple — name `blob`, size `0`, type
  `application/octet-stream` — and restores the empty filename before appending the part, so an
  empty selection reaches Nest as the part `multer` discards and answers the documented
  `400 file is required` rather than the `415` a truthy filename would have produced. The rule is
  enforced on the server, not in the browser: nothing is blocked client-side (invariant 15). — this
  record, `FACT-3653`, `FACT-2102`, `MF-FN-15`
- `FACT-3632` `api-client.ts` gains a second exported function for a multipart body rather than a
  branch inside `apiFetch`, so `apiFetch`'s "always JSON" contract and its units stay as they are. —
  this record, `FACT-3622`
- `FACT-3633` The browser never fetches bytes from Nest. The download goes through a Next Route
  Handler that attaches the session token server-side and streams the response through, extending
  the one precedent this repository already has for a non-page response from the BFF. — this record,
  `ADR-0002`, `FACT-3623`

Rejected:

- `FACT-3634` base64 in the JSON listing body — it inflates every list response by a third to carry
  data the list does not display, and the download endpoint already serves the bytes to whoever
  wants them. — this record
- `FACT-3635` Returning the entity straight from the controller — an index-keyed object is what that
  emits, which is neither readable nor decodable by any client. — `FACT-3616`
- `FACT-3636` Files on disk or in object storage — the scoping decision names the database, and a
  path on disk adds a second lifetime to reason about beside the row that points at it. —
  `docs/plans/meeting-files/research/README.md`
- `FACT-3637` Letting Next's own 413 be the user-facing error for an oversized upload — its client
  surface is unmeasured, so the error a user sees would be whatever Next happens to do. —
  `FACT-3621`
- `FACT-3638` An `accept` attribute on the file input — a browser-side filter that adds nothing the
  server does not already enforce, in exactly the class of browser-side form behaviour invariant 15
  keeps out of this repository. — this record, `invariant 15`
- `FACT-3639` Rejecting the content type inside multer's `fileFilter` — an error raised there that
  is not one of the recognised multer messages reaches the client as a 500. — `FACT-3619`

## Consequences

- `FACT-3640` All three new guarded routes go into `PROTECTED_ROUTES`, which `AR-API-06` checks
  against the controllers. — `e2e/security/security.api.spec.ts`, `invariant 16`
- `FACT-3641` `docs/api-contract.md` gains the first `413` and the first `415` in this project, and
  the first request body that is not `application/json`. — `FACT-3624`

- `FACT-3655` `FACT-3654` is a heuristic against a framework internal and has a named revisit
  trigger: if Next changes or removes that placeholder filename, the match stops firing and an empty
  selection silently goes back to answering `415`. `MF-FN-15` is the case that would catch it, and it
  is the reason that case asserts the body rather than only the status. — this record, `MF-FN-15`

> **Rationale — not a fact.** Holding a megabyte in a `bytea` column is not what a production system
> would do, and this record is not pretending otherwise: object storage with a signed URL is the
> answer at any real scale. The reason it is right _here_ is that the project's subject is the
> contract and the suite, and a file in a row has exactly one lifetime, one backup, one delete and
> one transaction — whereas a file on disk has a second lifetime that nothing in this repository
> would be checking. The expensive part of that trade is memory: a 1 MiB upload is buffered by
> multer, copied into a `Buffer` for the insert and read back whole on download, so the ceiling is
> deliberately low and deliberately enforced by the framework rather than by our own arithmetic.
>
> The empty-selection match is the one piece of this record that is not a measurement of our own
> code, and it is worth being honest about what it costs. It is a guess about another project's
> internals, dressed as a triple that is unlikely to occur by accident — and "unlikely" is not
> "impossible": a genuine zero-byte file named exactly `blob`, uploaded with
> `Content-Type: application/octet-stream`, would be treated as an empty selection and refused with
> "file is required" instead of the `415` its content type earns. That is an acceptable trade only
> because the alternative is worse in the common case: without the match, every user who submits the
> form with nothing chosen is told their file type is unsupported, which is both false and
> unactionable. The trigger above is what keeps the trade from quietly becoming a bug.

## Retired facts

The register of the keys this record has allocated and no longer states (`ADR-0022`). The decision
stands; the row below is one whose premise a later record changed.

| Key         | Stated                                                                                                                                                                                                                                                                   | Status                 | Recorded in |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- | ----------- |
| `FACT-3642` | An upload is refused when the meeting already holds ten files, so a feature with no delete cannot grow the database without bound; the check is a count before the insert rather than a transaction, so the rule is stated as a refusal rather than as an exact ceiling. | `retired by FACT-3795` | `ADR-0038`  |
