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

10 cases: 6 in `apps/api` (`01`…`03`, `08`…`10`) and 4 in `apps/web` (`04`…`07`). Both modules are
pure — no `server-only`, no Prisma, no network — which is what keeps them inside the pre-commit
floor while the rest of this feature is asserted over HTTP.

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

| ID       | Priority | What it checks                                                        | Where automated       |
| -------- | -------- | --------------------------------------------------------------------- | --------------------- |
| MF-UT-01 | P0       | the filename predicate accepts the legal forms                        | `meeting-files.rules` |
| MF-UT-02 | P0       | the filename predicate rejects every header-unsafe form               | `meeting-files.rules` |
| MF-UT-03 | P0       | the content type is normalized, then compared to the four             | `meeting-files.rules` |
| MF-UT-04 | P1       | under 1024 bytes: the exact integer and ` B`, no decimals             | `format-file-size`    |
| MF-UT-05 | P1       | the KiB and MiB bands, one decimal each                               | `format-file-size`    |
| MF-UT-06 | P1       | no `Intl`, no locale, no thousands separator, no `NaN`                | `format-file-size`    |
| MF-UT-07 | P1       | 1 048 575 bytes renders `1024.0 KiB`, and that is deliberate          | `format-file-size`    |
| MF-UT-08 | P0       | the `filename*` parameter escapes more than `encodeURIComponent` does | `meeting-files.rules` |
| MF-UT-09 | P0       | the ASCII `filename` parameter is lossy and cannot be escaped out of  | `meeting-files.rules` |
| MF-UT-10 | P0       | the builder strips the path again on the way out                      | `meeting-files.rules` |

## `apps/api/src/meeting-files/meeting-files.rules.spec.ts`

Three tenants: the filename predicate, the content-type pair, and the `Content-Disposition`
builder. They are the only part of the upload contract cheap to exercise without a server, and the
part whose regression would be most expensive to notice — the filename reaches a response header,
and the normalized content type is both the 415 decision **and** the value stored and echoed back as
`Content-Type`.

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
  to be total, because the controller normalizes a string first and asks the predicate second. The
  four accepted values are asserted as a set, so adding a fifth in the code without adding it to the
  contract fails here first. Reachability, as above: an empty or absent header never arrives as
  either over HTTP — the parser substitutes the literal `text/plain` — so those two inputs are
  defensive at the module boundary only, the same division design §3's table draws for the filename
  rule.
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
