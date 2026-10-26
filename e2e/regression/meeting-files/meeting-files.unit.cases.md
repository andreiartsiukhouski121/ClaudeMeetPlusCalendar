# Meeting files: unit cases (Vitest)

- **This file has no paired spec** — unit specs live next to the code in `apps/**`, and this is the
  feature map: which case is covered by which spec.
- **Run:** `pnpm test:meeting-files` (that is `pnpm -r test -t "MF-UT-"`); everything: `pnpm test`.
- **Mandatory rule:** a unit test title starts with its case ID — `it('MF-UT-01 — …')`. Without it
  the `vitest -t "MF-UT-"` filter cannot select the feature, and meta-test rule 7 cannot verify the
  case is automated.
- **Grouping:** every group below starts with a line carrying the **spec path**; the meta-test
  checks the path exists and that every ID listed under it appears in that file. Cross-references to
  cases of other levels stay in this header, above the first spec path, or rule 7 would demand them
  inside a unit spec: the HTTP-level twins are `MF-API-10`, `MF-API-14`, `MF-API-17`, `MF-API-18`
  and `MF-API-19`; the header builder's twin is `SEC-API-11`; and the size labels these units pin
  are read on the page by `MF-FN-03`.

21 cases: 17 in `apps/api` (`01`…`03`, `08`…`20`, `22`) and 4 in `apps/web` (`04`…`07`). Every
module under test is pure — no `server-only`, no Prisma, no network — which is what keeps them inside
the pre-commit floor while the rest of this feature is asserted over HTTP.

**`MF-UT-21` moved to `MF-UT-22` and its number is never reused.** Its spec moved with
`CryptoUuidSource` into the shared kernel (`ADR-0035`), and the assertion moved with it unchanged.
The moved line sits here, above the first spec path, because rule 7 would otherwise demand the old
ID inside the moved spec. The case stays in this file rather than under a shared prefix so that
`pnpm test:meeting-files` still runs it; a new prefix would need its own `test:` script.

**These rules are asked directly here; over HTTP they are asked about a value the parser has
already rewritten.** Which inputs reach our rules and which the parser filters out first is
**design §3's table** — one copy, not restated here — and the cases below assert **both** halves.
The unreachable half is not ritual, and it has a named trigger rather than a vague appeal to change:
`preservePath` is a single `multer` option, and anything that sets it makes the separator clauses
reachable **in the same commit**. The empty-string input makes the same point without a
hypothetical: the parser discards an empty filename parameter before our rule is ever consulted, so
that clause is unreachable over HTTP today — which is precisely why the module must keep its own
answer for it.

**For the header builder (`MF-UT-08`…`10`) the split collapses, and that is the point.** Its hostile
inputs are defensive at the module boundary **and** reachable in production, because the `filename`
column has a second writer: the seed inserts rows through Prisma without passing the upload route.
This is the first group in this file whose "defensive" half is not hypothetical, and it is why the
read path escapes its own output instead of inheriting the write path's guarantees (`FACT-3650`).

**The builder is three steps composed, and each case owns one of them.** `toFilenameBase` runs
first and is `MF-UT-10`'s; the ASCII substitution runs on its result and is `MF-UT-09`'s; the
`filename*` encoding runs on the same result and is `MF-UT-08`'s. Saying which step owns which rule
is not pedantry — a rule stated against the wrong step gets "proved" with an input that never
reaches it, which is a vacuous assertion wearing a green tick.

## Summary

| ID       | Priority | What it checks                                                        | Where automated                            |
| -------- | -------- | --------------------------------------------------------------------- | ------------------------------------------ |
| MF-UT-01 | P0       | the filename predicate accepts the legal forms                        | `domain/value-objects`                     |
| MF-UT-02 | P0       | the filename predicate rejects every header-unsafe form               | `domain/value-objects`                     |
| MF-UT-03 | P0       | the content type is normalized, then compared to the four             | `domain/value-objects`                     |
| MF-UT-04 | P1       | under 1024 bytes: the exact integer and ` B`, no decimals             | `format-file-size`                         |
| MF-UT-05 | P1       | the KiB and MiB bands, one decimal each                               | `format-file-size`                         |
| MF-UT-06 | P1       | no `Intl`, no locale, no thousands separator, no `NaN`                | `format-file-size`                         |
| MF-UT-07 | P1       | 1 048 575 bytes renders `1024.0 KiB`, and that is deliberate          | `format-file-size`                         |
| MF-UT-08 | P0       | the `filename*` parameter escapes more than `encodeURIComponent` does | `meeting-files.content-disposition`        |
| MF-UT-09 | P0       | the ASCII `filename` parameter is lossy and cannot be escaped out of  | `meeting-files.content-disposition`        |
| MF-UT-10 | P0       | the builder strips the path again on the way out                      | `meeting-files.content-disposition`        |
| MF-UT-11 | P0       | `FileName` holds a legal name verbatim                                | `domain/value-objects`                     |
| MF-UT-12 | P0       | `FileName` refuses an illegal name with `InvalidFileName`             | `domain/value-objects`                     |
| MF-UT-13 | P0       | `ContentType`'s value is the normalized media type                    | `domain/value-objects`                     |
| MF-UT-14 | P0       | `ContentType` refuses the rest with `UnsupportedContentType`          | `domain/value-objects`                     |
| MF-UT-15 | P1       | `upload` stores primitives and exactly the `now` passed in, as ISO    | `domain/meeting-file`                      |
| MF-UT-16 | P1       | `upload` makes the id `fil-` + the uuid passed in, verbatim           | `domain/meeting-file`                      |
| MF-UT-17 | P1       | `sizeBytes` is the byte length; the ceiling is declared, not enforced | `domain/meeting-file`                      |
| MF-UT-18 | P0       | `upload` refuses the eleventh file, not the tenth                     | `domain/meeting-file`                      |
| MF-UT-19 | P0       | `restore` validates nothing                                           | `domain/meeting-file`                      |
| MF-UT-20 | P1       | six domain errors, six distinct `kind`s, no status on any             | `domain/meeting-file`                      |
| MF-UT-22 | P1       | `CryptoUuidSource` yields a fresh v4 UUID on every call               | `shared/infrastructure/crypto-uuid-source` |

## `apps/api/src/meeting-files/domain/value-objects.spec.ts`

Two tenants: the filename predicate and the content-type pair. They are the part of the upload
contract cheap to exercise without a server, and the part whose regression would be most expensive
to notice — the filename is stored and later rendered into a response header, and the normalized
content type is both the 415 decision **and** the value stored and echoed back as `Content-Type`.

- `MF-UT-01` P0 — the filename predicate accepts `a`, a 100-character name, `notes.txt`,
  `my report_v2-final.txt` (a space, a dot, an underscore and a hyphen inside) and a name ending in
  a dot, an underscore or a hyphen.
- `MF-UT-02` P0 — it rejects the empty string, a 101-character name, a leading space, a trailing
  space, a leading dot, `../etc/passwd`, `a/b.txt`, `a\b.txt`, `say"hi".txt`, a name holding a
  literal `\n`, one holding a literal `\r`, and `résumé.pdf`. The quote, the newline and the
  carriage return are the **live** `Content-Disposition` injection defence on the write path — the
  parser decodes them out of a percent-encoded filename parameter, so they genuinely reach
  `originalname` — and the non-ASCII refusal is live for the same reason and deliberate rather than
  an oversight (`CH-014`). The separator and empty-string inputs are the half design §3 marks as
  unreachable over HTTP; they are asserted here anyway, for the reasons in the header.
- `MF-UT-03` P0 — **two functions, and each input belongs to one of them.**
  `normalizeContentType(raw)` takes the declared type **as a string** and reduces it to a media
  type — cut at the first `;`, trim, lower-case — so `application/pdf; charset=utf-8`,
  `APPLICATION/PDF` and a padded `text/plain` all come back as the bare lower-case literal. The
  case asserts that **returned value**, not only a boolean: that value is what gets stored and later
  echoed as `Content-Type`, so a rule that accepted the raw header and merely answered `true` would
  pass a yes-or-no assertion and still let a client-supplied string into a response header.
  `isAllowedContentType(value)` then answers whether a value is one of `application/pdf`,
  `image/png`, `image/jpeg` and `text/plain`, and it is the one asked about `image/gif`,
  `application/octet-stream`, `text/html`, the empty string and an `undefined` cast past the type.
  **Those last two go to the predicate directly and are never routed through the normalizer**, whose
  parameter is a `string` it splits immediately — `undefined` there would throw, and nothing asks it
  to be total, because `ContentType` normalizes a string first and asks the predicate second. The
  four accepted values are asserted as a set, so adding a fifth in the code without adding it to the
  contract fails here first. Reachability, as above: an empty or absent header never arrives as
  either over HTTP — the parser substitutes the literal `text/plain` — so those two inputs are
  defensive at the module boundary only, the same division design §3's table draws for the filename
  rule.
- `MF-UT-11` P0 — `FileName` built from every name `MF-UT-01` accepts, plus `Report.PDF`, succeeds,
  and its value is the input **verbatim** — case kept, nothing rewritten — because the stored name is
  `originalname` itself (`FACT-2090`, `FACT-1058`). A `FileName` that lower-cased fails on the last.
- `MF-UT-12` P0 — `FileName` built from every input `MF-UT-02` rejects throws, and the throw is an
  `InvalidFileName` (`instanceof MeetingFileError`, its own `kind`) — never a returned value, a plain
  `Error` or a `TypeError`: the filter maps by `kind` alone, so any other throw is a 500 (`FACT-3706`).
- `MF-UT-13` P0 — `ContentType`'s value is the **normalized** media type, never the input:
  `APPLICATION/PDF; charset=utf-8` → `application/pdf`, `text/plain` padded with spaces →
  `text/plain`, `image/PNG` → `image/png`, `image/jpeg;q=1` → `image/jpeg` — the value stored and
  echoed (`FACT-2093`, `FACT-1059`).
- `MF-UT-14` P0 — `ContentType` throws `UnsupportedContentType` (`instanceof MeetingFileError`, its
  own `kind`) for `image/gif`, `application/octet-stream`, `text/html`, the empty string and
  `application/pdfx` — the last fails a prefix match posing as the allow-list (`FACT-3631`).

## `apps/api/src/meeting-files/meeting-files.content-disposition.spec.ts`

One tenant: the `Content-Disposition` builder. It is cheap to exercise without a server, and its
regression would be among the most expensive to notice, because the filename it renders reaches a
response header.

- `MF-UT-08` P0 — the **`filename*` parameter** carries the name as `UTF-8''` percent-encoded
  octets with **uppercase** hex: `déjà-vu.png` → `d%C3%A9j%C3%A0-vu.png`, a carriage return and line
  feed → `%0D%0A`, a double quote → `%22`, a colon → `%3A`, a space → `%20`. **`encodeURIComponent`
  alone is not sufficient and the case exists to say so:** it leaves `*`, `'`, `(` and `)`
  unescaped, so the case feeds a name holding all four and requires each to come back
  percent-encoded. A case that only checked a non-ASCII name would pass against that insufficient
  implementation, which is exactly how this would ship broken.
- `MF-UT-09` P0 — the **ASCII `filename` parameter is deliberately lossy**: every character outside
  `A-Za-z0-9._-` and space is replaced by `_`, **one for one and never deleted**, and the result is
  capped at 100 characters. `report".txt` → `report_.txt`; `evidence.log` + CR LF +
  `X-Injected: 1` → `evidence.log__X-Injected_ 1`; `déjà-vu.png` → `d_j_-vu.png`; `***` → `___`,
  not `file`; a 150-character name comes back at 100. The assertion to keep is **neither `"` nor `\`
  can survive the mapping**, and it is best asserted over the whole hostile set generically rather
  than on one example — the security property is that no input produces either character, not that
  this input does not. That is what makes the quoted string impossible to terminate early, and it is
  a security property rather than cosmetics: this parameter is the fallback for clients that cannot
  read `filename*`, and a faithful-but-dangerous rendering would be worse than an ugly one.
- **The ASCII step has an empty-result fallback to `file`, and it is unreachable through the
  builder** — a line that belongs here because the obvious way to "prove" it is with an input that
  never reaches it. `toFilenameBase` runs first and has already rewritten empty, `.` and `..` to the
  literal `file`, so the ASCII step never sees an empty string unless its helper is called directly.
  A bare `.` does come back as `file`, but through the **base** step's dot rule, which is
  `MF-UT-10`'s mechanism and not this one's.
- `MF-UT-10` P0 — the builder **strips the path again on the way out**: everything up to the last
  `/` or `\` is dropped, and `.`, `..` or an empty result become `file`. `../../etc/passwd` →
  `passwd`, `a\b.txt` → `b.txt`, `..` → `file`. This is the same operation the parser already
  performs on the way in, done a second time **on purpose**: a read path escapes its own output
  rather than inheriting the write path's guarantees (`FACT-3650`), because the write path is not
  the only writer. Deleting it as redundant would be correct about today's rows and wrong about the
  seed's. In practice this is also the only step that ever produces the literal `file`.

## `apps/api/src/meeting-files/domain/meeting-file.spec.ts`

- `MF-UT-15` P1 — `upload` with `meetingId` `mtg-1`, `FileName` `notes.txt`, `ContentType` from
  `TEXT/PLAIN; charset=utf-8`, 48 bytes, `existingCount` 0, `now` `2020-02-03T04:05:06.007Z` (a
  `Date`) and a fixed `uuid` yields exactly those: `meetingId` `mtg-1`, `filename` `notes.txt`,
  `contentType` `text/plain` and `uploadedAt` `2020-02-03T04:05:06.007Z` — every one a plain
  **string**, never a value object or a `Date` (`FACT-1063`, `FACT-1062`). `uploadedAt` is the `now`
  passed in, rendered as ISO, and **never a clock**: the instant is fixed in the past, so an entity
  that reads `new Date()` or `Date.now()` fails on the value. The case needs no fake timers and no
  storage — time reaches the entity only through its input, which the use case fills from `Clock`.
- `MF-UT-16` P1 — the id is exactly `fil-` followed by the `uuid` passed in, **verbatim**
  (`FACT-3670`): `00000000-0000-0000-0000-000000000000`, deliberately not a v4 value, gives
  `fil-00000000-0000-0000-0000-000000000000`; two uploads from otherwise identical inputs with
  different `uuid`s give two different ids, each `fil-` + its own uuid. The entity **neither
  generates nor validates** the uuid: one that drew its own fails the fixed value, and one that
  checked the v4 shape throws on it. The v4 format and uniqueness belong to the `UuidSource`
  adapter. Over HTTP, the upload case's `FILE_ID_PATTERN` check in `meeting-files.api.cases.md`
  covers the **format only** — the 8-4-4-4-12 hex shape, not the v4 version and variant digits —
  and uniqueness has no API case.
- `MF-UT-17` P1 — `sizeBytes` is the byte length: 1 → `1`, 48 → `48`. `MAX_FILE_SIZE_BYTES` is
  `1048576`, and a buffer one byte over it is **accepted** with `1048577`: the interceptor owns the
  ceiling so the 413 stays the framework's (`FACT-3708`, `FACT-3629`, `FACT-1060`).
- `MF-UT-18` P0 — `MAX_FILES_PER_MEETING` is `10`; `upload` succeeds with counts 0 and 9 and throws
  `FileLimitReached` (`instanceof MeetingFileError`, its own `kind`) with 10 and 11. The 9/10 pair is
  the case: `>` for `>=` fails it (`FACT-3795`, `FACT-3708`).
- `MF-UT-19` P0 — `restore` validates **nothing**: rows with id `fil-seed-1`, filenames
  `evidence.log` + CR LF + `X-Injected: 1`, `../../etc/passwd` and `say"hi".txt`, content type
  `application/x-msdownload`, come back field-for-field deep-equal and throw none — the seed is a
  second writer (`FACT-3650`, `FACT-1073`); a `restore` routed through `FileName` fails here.
- `MF-UT-20` P1 — `FileRequired`, `InvalidFileName`, `UnsupportedContentType`, `MeetingNotFound`,
  `FileLimitReached`, `MeetingFileNotFound` are each `instanceof MeetingFileError` and `Error`, their
  six `kind`s are pairwise distinct, and none has a `status`, `statusCode` or `getStatus` member: the
  filter maps by `kind` and owns every status (`FACT-3706`).

## `apps/api/src/shared/infrastructure/crypto-uuid-source.spec.ts`

The one adapter whose output carries a rule of the contract: every entity that composes a prefixed
id trusts whatever UUID it is given (the id case of `domain/meeting-file.spec.ts` here, and the
`Meeting` entity's in `home-dashboard.unit.cases.md`), so the v4 shape and the freshness of the value
are this adapter's to keep. It lives in the shared kernel and serves both modules; it is pure —
`node:crypto` and nothing else — so it stays inside the pre-commit floor.

- `MF-UT-22` P1 — `new CryptoUuidSource().next()` matches
  `^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$` (version digit `4`,
  variant `8`, `9`, `a` or `b`), and 100 calls on one instance yield 100 distinct values. A
  source returning a constant, an empty string or a non-v4 UUID fails it (`FACT-3670`,
  `FACT-3734`).

## `apps/web/src/lib/format-file-size.spec.ts`

The output is fixed by the contract and these cases assert it literally. Three bands — bytes below
1024, KiB below 1 048 576, MiB above — a single space before the unit, one decimal in the two
divided bands and none in the byte band, and `KiB`/`MiB` rather than `KB`/`MB` because the divisor
is 1024 and the contract's own ceiling is 1 048 576.

- `MF-UT-04` P1 — below 1024 the output is the exact integer, a space and `B`: `0` → `0 B`, `48` →
  `48 B`, `1023` → `1023 B`. No decimals and no thousands separator, so an implementation that
  divides early and prints `0.0 KiB` for 48 fails, and so does one that renders `1 023 B`.
- `MF-UT-05` P1 — 1024 → `1.0 KiB`, 1536 → `1.5 KiB`, 1 048 576 → `1.0 MiB`: the divisors are 1024
  and 1 048 576, always **one** decimal, including the trailing `.0` that an "intelligent" trim
  would drop. The two seeded sizes therefore read `1.0 KiB` (1024) and `48 B` (48), which is what
  the attachment-list functional case asserts on the page.
- `MF-UT-06` P1 — the helper uses **no `Intl` and no locale**: the decimal mark is always `.`, there
  is no grouping separator, and the output is byte-identical with `LANG`, `LC_ALL` and `TZ` changed
  around the call and restored afterwards. A locale-dependent decimal mark would make both these
  units and the page assertion depend on the machine — the class of defect `timeZone: 'UTC'` is
  pinned against. The same case asserts that no output contains `NaN`, `Infinity` or `undefined`,
  for 0, 1, 48, 1024 and 1 048 576.
- `MF-UT-07` P1 — **1 048 575 renders `1024.0 KiB`, not `1.0 MiB`**, and that is the contract rather
  than an off-by-one: the band is chosen by the byte count, and one decimal of 1023.999… rounds to
  `1024.0`. The case exists so that the next reader who notices it does not "fix" it into a silent
  behaviour change; 1 048 576 is the first value of the MiB band and the case above pins it.
