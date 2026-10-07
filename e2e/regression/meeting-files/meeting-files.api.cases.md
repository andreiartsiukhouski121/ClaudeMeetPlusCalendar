# Meeting files: API contract (`POST`/`GET /meetings/:id/files`, `GET …/:fileId/content`)

- **Paired spec:** `e2e/regression/meeting-files/meeting-files.api.spec.ts`
- **Playwright project:** `api` (the `request` fixture, `baseURL = http://127.0.0.1:3101`, no browser)
- **Tags:** `@regression`, `@meeting-files`, `@api`, plus `@p0` and `@mutating` where applicable
- **Run:** `pnpm e2e --project=api --grep @meeting-files`
- **Preconditions:**
  - Playwright starts Nest on 3101 with `JWT_SECRET=e2e-secret`; the database is reset and seeded
    before the run, and seeded values come from `e2e/fixtures/seed.ts`. Two meetings carry files:
    `teacher`'s "Geometry workshop" (`mtg-teacher-3`) holds the two every read-only case here uses
    and must not be mutated, and `planner`'s header-safety meeting holds the hostile set, which
    belongs to `SEC-API-11` and is never read here.
  - **No meeting id and no file id is ever a literal** (`meetings-detail.api.cases.md`): a seeded
    meeting is found by its seeded **title** in `TEACHER_MEETINGS`, a file id comes from the listing
    or from the `POST` that created it, an absent id is derived (`${realId}-does-not-exist`).
  - The sandbox is the **owner**, not a meeting: mutating cases run as `planner` (`FACT-3126`) and
    **each creates its own meeting first**. The route carries a ten-file refusal (`FACT-3642`), so a
    shared meeting would run out after ten uploads and the eleventh case would fail for an unrelated
    reason; a meeting the case made itself also starts at zero files, so its listing count is exact
    rather than relative. Two seeded meetings of `planner`'s are therefore **never uploaded into**:
    `mtg-planner-1`, which stays the empty-state fixture, and the header-safety meeting, whose file
    list `SM-API-03` asserts exactly.
  - Bodies are `multipart/form-data` with one part named `file`; the upload DTO declares no
    properties, so **any** text part is an extra field.
  - **Every message in these bodies is UI copy.** The web surface shows them verbatim rather than
    rewriting them into a generic string, because they are specific and actionable —
    `createMeetingAction` rewrites only because its 400 is a validation array about a title and a
    date, which nobody can act on. So a case asserting a body byte-for-byte here is also asserting
    what a user reads, and the bar for any new message on these three routes is **a sentence
    somebody can act on**. The **413** is the single exception: the framework authors `File too
large`, which names no limit, so the web surface substitutes its own line — asserted on the
    functional side, never here.
  - **The parser transforms the request before any of our code runs**, and several cases below are
    written against what survives that rather than against what was sent: `busboy` applies
    `basename()` to the filename, treats an empty `filename` parameter as an absent one, prefers a
    percent-decoded RFC 5987 `filename*` over `filename`, and initialises a part's content type to
    the literal `text/plain`, overwriting it only when the header is present and parses; `multer`
    passes those through, decodes `%0A`, `%0D` and `%22` back into a literal newline, carriage
    return and double quote, and discards a part whose filename is falsy. Which inputs reach our own
    rules and which the parser filters first is design §3's table; where it matters, the case says
    so.

19 cases.

## Summary

| ID        | Title                                                             | Priority | Tags                                            |
| --------- | ----------------------------------------------------------------- | -------- | ----------------------------------------------- |
| MF-API-01 | POST uploads a file and returns 201 with the five DTO keys        | P0       | `@regression @meeting-files @api @p0 @mutating` |
| MF-API-02 | all three file routes without a token give 401                    | P0       | `@regression @meeting-files @api @p0`           |
| MF-API-03 | an unknown meeting and another owner's meeting give the same 404  | P0       | `@regression @meeting-files @api @p0`           |
| MF-API-04 | GET lists the seeded files as `{ items }`, newest first, no bytes | P0       | `@regression @meeting-files @api @p0`           |
| MF-API-05 | a meeting with no files lists an empty `items`, not a 404         | P1       | `@regression @meeting-files @api`               |
| MF-API-06 | the download carries the four documented headers                  | P0       | `@regression @meeting-files @api @p0`           |
| MF-API-07 | upload → list → download round-trips the bytes unchanged          | P0       | `@regression @meeting-files @api @p0 @mutating` |
| MF-API-08 | an unknown file id and another meeting's file id give 404         | P0       | `@regression @meeting-files @api @p0 @mutating` |
| MF-API-09 | an upload with no `file` part gives 400                           | P1       | `@regression @meeting-files @api @mutating`     |
| MF-API-10 | the filename rule: what the parser already changed, and the 400   | P1       | `@regression @meeting-files @api @mutating`     |
| MF-API-11 | an extra text part gives 400 `property … should not exist`        | P1       | `@regression @meeting-files @api @mutating`     |
| MF-API-12 | a file part under another field name gives a **string** 400       | P1       | `@regression @meeting-files @api @mutating`     |
| MF-API-13 | a file over 1 048 576 bytes gives 413                             | P1       | `@regression @meeting-files @api @mutating`     |
| MF-API-14 | the allow-list after normalization: accepted and refused types    | P1       | `@regression @meeting-files @api @mutating`     |
| MF-API-15 | the eleventh file on a meeting is refused with 400                | P1       | `@regression @meeting-files @api @mutating`     |
| MF-API-16 | evaluation order: a stranger with an oversized file gets 413      | P0       | `@regression @meeting-files @api @p0`           |
| MF-API-17 | the stored content type is normalized, never the client's header  | P0       | `@regression @meeting-files @api @p0 @mutating` |
| MF-API-18 | no `filename` and `application/octet-stream`: file is required    | P1       | `@regression @meeting-files @api @mutating`     |
| MF-API-19 | no `filename` and any other type: the part arrives as a field     | P1       | `@regression @meeting-files @api @mutating`     |

## Cases

### MF-API-01 — POST uploads a file and returns 201 with the five DTO keys

- **Priority:** P0
- **Steps:** as `planner`, create a meeting, then `POST /meetings/{id}/files` with one part named
  `file`: a small `text/plain` body under a legal filename.
- **Expected:** **201**, POST's Nest default with no `@HttpCode` (`FACT-2042`). The body has
  **exactly** `contentType`, `filename`, `id`, `sizeBytes`, `uploadedAt`, so a leaked `content` or
  `meetingId` is caught (`FACT-3626`); `sizeBytes` is the byte length sent, `filename` echoes the
  request, `contentType` is the normalized media type (`text/plain`), `uploadedAt` ends in `Z`, and
  `id` is a `randomUUID()` matching
  `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/`, not `fil-…` (`FACT-3583`).

### MF-API-02 — all three file routes without a token give 401

- **Priority:** P0
- **Steps:** read a real `teacher` meeting id and one of its file ids, then call all three routes
  with no `Authorization`, and again with `Authorization: Bearer` carrying no value.
- **Expected:** 401 each time with exactly
  `{ message: 'Authentication required', error: 'Unauthorized', statusCode: 401 }` (`FACT-2015`) and
  no `items`, bytes or `filename`. The guard answers before the interceptor, so an upload with no
  `file` part still gets 401 rather than `MF-API-09`'s 400.

### MF-API-03 — an unknown meeting and another owner's meeting give the same 404

- **Priority:** P0
- **Steps:** take a real `teacher` meeting id and derive `${realId}-does-not-exist`. As `student`,
  who owns neither, call all three routes with the real id, then the listing with the derived id.
- **Expected:** 404 each time with exactly
  `{ message: 'Meeting not found', error: 'Not Found', statusCode: 404 }` — byte-identical to
  `FACT-2016`, one code path rather than a second literal (`ADR-0018`). Two parsed bodies are
  compared in **one** `toEqual`: unowned is indistinguishable from non-existent.

### MF-API-04 — GET lists the seeded files as `{ items }`, newest first, no bytes

- **Priority:** P0
- **Steps:** as `teacher`, find the meeting titled "Geometry workshop" in `GET /meetings?limit=100`
  and request `GET /meetings/{id}/files`.
- **Expected:** 200, JSON content type, and **exactly one** body key, `items` — **no `total`**: the
  route takes no `limit`, so a count could only be `items.length`, which invariant 4 forbids.
  `items` holds that meeting's two mirrored files, `notes.txt` before `syllabus.pdf` (`uploadedAt`
  descending, `id` ascending — invariant 7), each with the five DTO keys and the mirrored
  `contentType` and `sizeBytes`; the response **text** has no `content`, `meetingId` or `%PDF`
  (`FACT-3626`).

### MF-API-05 — a meeting with no files lists an empty `items`, not a 404

- **Priority:** P1
- **Steps:** as `teacher`, take the id of a seeded meeting other than "Geometry workshop" and
  request its listing.
- **Expected:** **200** with `items: []` — holding no files is a normal state, not "not found": the
  distinction `HD-API-07` draws for a user with no meetings.

### MF-API-06 — the download carries the four documented headers

- **Priority:** P0
- **Steps:** as `teacher`, take the seeded `syllabus.pdf` from the listing and request
  `GET /meetings/{id}/files/{fileId}/content`.
- **Expected:** 200 and, exactly (`FACT-3627`): `Content-Type: application/pdf`, the stored value;
  `Content-Length` equal to the body received and to the mirrored `sizeBytes`;
  `X-Content-Type-Options: nosniff`; and `Content-Disposition` exactly
  `attachment; filename="syllabus.pdf"; filename*=UTF-8''syllabus.pdf` — **both** parameters,
  RFC 6266's pairing, and **never** `inline`, so a stored file cannot execute in this origin. The
  body begins with the mirrored `%PDF-1.7\n` — the stored bytes, not JSON around them.
- **The `filename*` half is not decoration for an ASCII name.** One builder emits this header for
  every stored name, so an ordinary file is the benign control for the same function `SEC-API-11`
  exercises with hostile ones: if the pairing is dropped for "simple" names, the branch that
  escapes the dangerous ones is no longer the branch under test.
- **This case was stale for one commit, and the shape of that miss is worth recording.** It pinned
  the single-parameter form until the builder landed. Unlike the other statements this change
  falsified, it **names the header** — a grep for `Content-Disposition` finds it in seconds. The
  failure was not that searching could not reach it; the question "what already asserts this value"
  was answered from memory instead of being asked. That is a different failure from a statement no
  search could have found, and the two should not be collapsed into one lesson.

### MF-API-07 — upload → list → download round-trips the bytes unchanged

- **Priority:** P0
- **Steps:** as `planner`, create a meeting; upload a fixed pattern containing a `0x00` byte and a
  byte above `0x7f`; list the files; download the returned id.
- **Expected:** the listing holds exactly that one file under the `id` the upload returned, and the
  downloaded body is **byte-identical** to what was sent, length included. The pattern is not plain
  ASCII on purpose: a text round-trip would not catch a lossy encoding (`FACT-3628`).

### MF-API-08 — an unknown file id and another meeting's file id give 404

- **Priority:** P0
- **Steps:** as `planner`, create two meetings and upload one file into the first; download from the
  **second** with the first's file id, then from the first with `${realFileId}-does-not-exist`.
- **Expected:** both answer 404 with exactly
  `{ message: 'File not found', error: 'Not Found', statusCode: 404 }`, compared in one `toEqual`.
  The meeting is owned in both, so this is the file-level 404 rather than `MF-API-03`'s.

### MF-API-09 — an upload with no `file` part gives 400

- **Priority:** P1
- **Steps:** as `planner`, create a meeting and `POST` to its file route with an empty multipart
  body — no parts at all.
- **Expected:** 400 with exactly
  `{ message: ['file is required'], error: 'Bad Request', statusCode: 400 }` — an **array**
  `message` raised by the handler rather than by `ValidationPipe`, the same shape either way
  (invariant 8). The meeting's listing is still empty afterwards.

### MF-API-10 — the filename rule: what the parser already changed, and the 400

- **Priority:** P1
- **Steps:** as `planner`, create a meeting and upload under each of `a`, a 100-character name and
  `my report_v2-final.txt`; then under `../etc/passwd`, `sub/dir.txt` and `a\b.txt`; then under `.`,
  `..` and `files/`; then with an **empty** `filename=""` on a `text/plain` part; then under a
  101-character name, ` lead.txt`, `trail.txt `, `.hidden`, and — as a percent-encoded RFC 5987
  `filename*` parameter — a name holding `%22`, one holding `%0A`, one holding `%0D`, and
  `r%C3%A9sum%C3%A9.pdf`.
- **Expected:** the first three answer 201 and store the `filename` exactly as sent.
- **The three paths also answer 201**, storing `passwd`, `dir.txt` and `b.txt`: `busboy` applies
  `basename()` before anything of ours runs, and that function treats `\` exactly like `/` in the
  same switch branch (`busboy/lib/utils.js:479-491`), so neither separator ever reaches our rule.
  The case asserts the **stored** name rather than claiming our regex removed the path — that clause
  is belt-and-braces, not the only defence. These three 201s are what `multer`'s `preservePath`
  would flip; it is off, and the unit cases hold the predicate for the day it is not.
- **`.`, `..` and a name ending in a separator answer `MF-API-09`'s body** —
  `{ message: ['file is required'], error: 'Bad Request', statusCode: 400 }` — because that same
  function reduces them to the empty string and `multer` discards a part whose filename is falsy.
  A clause rather than a row of its own: the body already has an ID and only the path to it differs.
- **An empty `filename=""` answers `MF-API-19`'s body** —
  `{ message: ['property file should not exist'], error: 'Bad Request', statusCode: 400 }` — because
  the parser's filename check is **truthy** (`busboy/lib/types/multipart.js:318`), so an empty
  parameter is discarded exactly like an absent one; the part then fails the classification test on
  a `text/plain` default and arrives as a text **field** named `file`. It never becomes
  `file.originalname` at all, so **the filename rule's "empty" clause is unreachable over HTTP** —
  design §3's table is where that division is kept. Note the contrast with the line above: `.` and
  `..` arrive under a non-empty parameter and are dropped by `multer` only after `basename()` has
  emptied them, while `filename=""` is falsy before the part is ever classified as a file. Two
  near-identical requests, two mechanisms, two bodies — and **neither is special-cased on purpose**:
  once the parameter is thrown away, nothing downstream can tell a deliberately empty filename from
  a genuinely extra field named `file`, so a handler that tried would be guessing at intent.
- **Everything else answers 400** with exactly
  `{ message: ['filename must be 1 to 100 characters of letters, digits, dot, underscore, hyphen or space'], error: 'Bad Request', statusCode: 400 }`.
  That message enumerates what we reject and is deliberately specific: it describes a rule about the
  **user's own input** — rename your file — not about our data or anybody else's account, so it
  gives nothing away. The line invariant 6 draws for authentication, where an exact message lets
  someone enumerate accounts, does not reach here because nothing here is enumerable. The four
  encoded names are **live** branches, not precautions: `multer` decodes `%22`, `%0A` and `%0D` back
  into a literal quote, newline and carriage return, so a `Content-Disposition` injection really can
  arrive in `file.originalname` and this regex is the defence that stops it on the write path; and
  `busboy` prefers a percent-decoded `filename*` over `filename`, so a non-ASCII name really can
  arrive too and the English-only refusal (`CH-014`) is a branch that executes.

### MF-API-11 — an extra text part gives 400 `property … should not exist`

- **Priority:** P1
- **Steps:** as `planner`, create a meeting and upload a legal `file` part plus a text part named
  `label`.
- **Expected:** 400 with exactly
  `{ message: ['property label should not exist'], error: 'Bad Request', statusCode: 400 }` —
  `FACT-2013`'s shape over multipart. The DTO declares no properties, so **every** text part gives
  this body, and the listing is empty afterwards: a rejected upload stores nothing. This body is
  **unreachable through our own form**, which submits one part named `file` and no text fields — it
  is asserted here because unreachable from our client is not unreachable from a client.

### MF-API-12 — a file part under another field name gives a **string** 400

- **Priority:** P1
- **Steps:** as `planner`, create a meeting and upload the same legal bytes under a part named
  `attachment` instead of `file`.
- **Expected:** 400 with exactly
  `{ message: 'Unexpected field - attachment', error: 'Bad Request', statusCode: 400 }` — a
  **string** `message` from `@nestjs/platform-express`, raised before `ValidationPipe` runs. It is
  the one 400 here that is not an array: invariant 8 says an array **from `ValidationPipe`**. A
  **500 here is a dependency fault, never a reason to relax this case**: the translator that turns
  multer's error into a 400 matches on its message string, so a swapped-out `multer` breaks it.
  Like `MF-API-11`'s, this body cannot be produced by our own form.

### MF-API-13 — a file over 1 048 576 bytes gives 413

- **Priority:** P1
- **Steps:** as `planner`, create a meeting and upload exactly 1 048 576 bytes, then 1 048 577.
- **Expected:** the first answers 201 with `sizeBytes` = 1 048 576; the second **413** with exactly
  `{ message: 'File too large', error: 'Payload Too Large', statusCode: 413 }` — multer's
  `LIMIT_FILE_SIZE` mapped by Nest, a string message again (`FACT-3629`) — and writes nothing: the
  listing holds one file afterwards. This is the one body the web surface does **not** show
  verbatim: it names no limit, so the page substitutes its own line, which is a functional case's to
  assert and not this one's.

### MF-API-14 — the allow-list after normalization: accepted and refused types

- **Priority:** P1
- **Steps:** as `planner`, create a meeting and upload a small part under each of
  `application/pdf`, `image/png`, `image/jpeg`, `text/plain`, then
  `application/pdf; charset=utf-8`, `APPLICATION/PDF` and a padded `text/plain`; then a part whose
  content type is **empty** and a part carrying **no content-type header at all**; then under
  `image/gif`, `application/octet-stream` and `text/html`.
- **Expected:** **nine** 201s. The first seven because the declared type is cut at the first `;`,
  trimmed and lower-cased before it is compared, so a parameter and a capitalised header are the
  same media type and not a new one. The last two because **"nothing was declared" never reaches our
  code**: `busboy` initialises a part's content type to the literal `text/plain` and overwrites it
  only when the header is present and parses, and `multer` passes that through — so an empty and an
  absent header both arrive as `text/plain`, which is on the allow-list. Only the three remaining
  answer **415**, with exactly
  `{ message: 'Unsupported file type: upload a PDF, PNG, JPEG or plain text file', error: 'Unsupported Media Type', statusCode: 415 }`:
  **one** message whatever the reason.
- **The message names what is accepted, and that is the contract:** every body on these routes is
  shown to the user verbatim, and the earlier `Unsupported file type` was the one message in the
  table nobody could act on — it said no without saying what yes looks like. The separator is a
  **colon rather than an em dash** so that a byte-exact assertion stays ASCII.
- **What this case is really establishing:** at this layer the declared content type is not merely
  untrusted, it is **not observable** — no request can prove what the client sent, because the
  parser has already substituted a default. That is precisely why the stored value is normalized to
  one of four literals (`MF-API-17`) and the bytes are served `attachment` with `nosniff`
  (`FACT-3631`): **the allow-list bounds what is stored, never what was sent.**

### MF-API-15 — the eleventh file on a meeting is refused with 400

- **Priority:** P1
- **Steps:** as `planner`, create a meeting and upload ten small legal files **one after another**,
  then an eleventh.
- **Expected:** the first ten answer 201; the eleventh answers 400 with exactly
  `{ message: ['a meeting may hold at most 10 files'], error: 'Bad Request', statusCode: 400 }`, and
  the listing still holds ten (`FACT-3642`). Sequential on purpose: the check is a count before an
  insert, not a transaction, so the contract promises the refusal and not an exact ceiling.

### MF-API-16 — evaluation order: a stranger with an oversized file gets 413

- **Priority:** P0
- **Steps:** as `student`, who owns none of them, take a real `teacher` meeting id and `POST`
  1 048 577 bytes to its file route; then `POST` a legal file to the same route.
- **Expected:** the first answers **413**, not 404 — the interceptor runs before the handler, which
  leaks nothing because the answer does not depend on the meeting. The second answers the
  `Meeting not found` 404, so ownership precedes the count and the cap cannot be used to probe
  whether a meeting exists.

### MF-API-17 — the stored content type is normalized, never the client's header

- **Priority:** P0
- **Steps:** as `planner`, create a meeting and upload one part whose declared type is
  `APPLICATION/PDF; charset=utf-8`. Read the 201 body, then the listing, then download the file.
- **Expected:** all three report the media type alone, lower-cased: the 201 body and the listing
  item carry `contentType: 'application/pdf'` — no `charset`, no capitals, no surrounding spaces —
  and the download's `Content-Type` header is exactly `application/pdf`. **This is a security
  property, not a tidiness one:** the header our own origin serves is then provably one of four
  known values rather than a string a client attached, which is what makes `nosniff` plus
  `attachment` worth anything (`FACT-3631`, `FACT-3627`). Storing the raw header would pass
  `MF-API-14` — the upload is accepted either way — and only show up here.

### MF-API-18 — no `filename` and `application/octet-stream`: file is required

- **Priority:** P1
- **Steps:** as `planner`, create a meeting and `POST` one part named `file` carrying **no
  `filename` parameter** on its `Content-Disposition`, declared as `application/octet-stream`.
- **Expected:** 400 with exactly
  `{ message: ['file is required'], error: 'Bad Request', statusCode: 400 }` and an empty listing
  afterwards. `busboy` treats a part with no filename as a **file** only for that content type, and
  `multer` then discards it, so `req.file` is undefined and the handler's own missing-file branch
  answers — `MF-API-09`'s body reached by a different route. A by-product worth stating because it
  removes a branch somebody would otherwise write: since multer drops the part, `file.originalname`
  is never `undefined` at the handler, so the filename rule never has to defend against an absent
  name.

### MF-API-19 — no `filename` and any other type: the part arrives as a field

- **Priority:** P1
- **Steps:** as `planner`, create a meeting and `POST` the same part with no `filename` parameter,
  this time declared as `text/plain`.
- **Expected:** 400 with exactly
  `{ message: ['property file should not exist'], error: 'Bad Request', statusCode: 400 }` and an
  empty listing afterwards. `busboy` classifies a filename-less part of any other type as a **text
  field**, so it arrives in `req.body.file` and the empty DTO's `forbidNonWhitelisted` rejects it —
  the same mechanism as `MF-API-11`, naming `file` instead of `label`. The message is what separates
  this from `MF-API-18`: two requests that differ only in a content-type header take two different
  paths through the parser and answer with two different bodies. An **empty** `filename=""` lands
  here too, for the reason `MF-API-10` records. Like `MF-API-11`'s, this body is unreachable through
  our own form and is asserted at this level precisely because another client can produce it.
