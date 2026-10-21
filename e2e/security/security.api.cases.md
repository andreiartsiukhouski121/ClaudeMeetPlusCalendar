# Security — API tests

- **Spec:** `e2e/security/security.api.spec.ts`
- **Playwright project:** `api`
- **Tags:** `@security`
- **Run:** `pnpm e2e:security` (or `pnpm e2e --grep @security`)
- **Preconditions:**
  - The seed is applied (`e2e/fixtures/seed.ts`); Playwright starts 3100/3101.
  - Multipart bodies come from `e2e/fixtures/multipart.ts`, the shared builder — not from a copy
    inside this spec. Two builders existed briefly and that is exactly the drift this suite is
    supposed to be immune to.
  - **Two things no case in this file may claim**, both of them properties of the multipart parser
    rather than of our code, and both `docs/security.md`'s to state in prose: the API does **not**
    validate the content type a client declared — an absent, empty or unparseable part type arrives
    as the literal `text/plain`, so the allow-list bounds what is **stored**, never what was sent;
    and path traversal in a filename is neutralised by `basename()` inside the parser before any
    rule of ours runs, so our regex is belt-and-braces there and no case here may present it as the
    defence.

These are **cross-feature invariants**, not checks of one feature. They must hold for every new
endpoint, so they live outside `e2e/regression/<feature>/` and walk the endpoints from a list: add
a protected route, add it to the list, and `SEC-API-01` starts checking it on its own
(invariant 16).

How they differ from similar cases in features: `AL-API-14` checks that `GET /auth/me` without a
token gives 401 — part of the login contract. `SEC-API-01` checks that **no** protected endpoint
answers without a token, including those that do not exist yet.

## Summary

| ID         | Title                                                          | Priority | Tag             |
| ---------- | -------------------------------------------------------------- | -------- | --------------- |
| SEC-API-01 | every protected endpoint requires a token                      | P0       | `@p0`           |
| SEC-API-02 | a forged signature and a junk token give 401, not 500          | P0       | `@p0`           |
| SEC-API-03 | a token signed with a different secret is rejected             | P0       | `@p0`           |
| SEC-API-04 | no response carries a hash, a salt or a plaintext password     | P0       | `@p0`           |
| SEC-API-05 | response time does not reveal that an account exists           | P0       | `@p0`           |
| SEC-API-06 | error bodies carry no stack trace, file paths or library names | P1       |                 |
| SEC-API-07 | extra body fields are rejected on every POST endpoint          | P1       |                 |
| SEC-API-08 | responses do not disclose the server stack (`X-Powered-By`)    | P1       |                 |
| SEC-API-09 | one user's data is unreachable with another user's token       | P0       | `@p0`           |
| SEC-API-10 | the repository holds no committed secrets and no `.env`        | P1       |                 |
| SEC-API-11 | a stored filename cannot break out of a response header        | P0       | `@p0`           |
| SEC-API-12 | another user's token cannot delete a meeting or its file       | P0       | `@p0 @mutating` |

## Cases

### SEC-API-01 — every protected endpoint requires a token

- **Priority:** P0
- **Preconditions:** the protected routes are listed in the spec as `PROTECTED_ROUTES`. A
  parameterised route is written with its **literal** parameter — `/meetings/:id`, not a concrete
  id: `AR-API-06` builds the path from the controller decorators and compares that string, and the
  guard answers before the handler ever parses the parameter.
- **Steps:** for each route, send a request **without** an `Authorization` header, then repeat with
  `Authorization: Bearer` carrying no value.
- **Expected:** every request gives `401`, and the body holds no payload (no `items`, no `email`,
  no `accessToken`).

### SEC-API-02 — a forged signature and a junk token give 401, not 500

- **Priority:** P0
- **Steps:** get a valid token; corrupt the last character of its signature and call a protected
  route; repeat with `not.a.jwt`, with an empty string and with the `Basic` scheme.
- **Expected:** `401` in every case. **A `500` is unacceptable**: it would mean an unhandled
  exception from token parsing reaches the error handler.

### SEC-API-03 — a token signed with a different secret is rejected

- **Priority:** P0
- **Preconditions:** Playwright passes `JWT_SECRET=e2e-secret` to the server.
- **Steps:** build an HS256 token with a valid payload signed with a **different** secret, and call
  a protected route with it.
- **Expected:** `401`. This differs from `SEC-API-02`: there the signature is broken, here it is
  arithmetically correct but foreign — the check is that the secret is verified at all.

### SEC-API-04 — no response carries a hash, a salt or a plaintext password

- **Priority:** P0
- **Steps:** walk every endpoint in its success path (login, profile, meeting list, meeting
  creation) and take the **text** of each response rather than the parsed object.
- **Expected:** no text contains `scrypt`, `passwordHash`, `password` or the seeded password value.
  The check works on text because parsing an object would miss a secret hidden in a nested field or
  in an error message.

### SEC-API-05 — response time does not reveal that an account exists

- **Priority:** P0
- **Steps:** measure `POST /auth/login` with an unknown email and with an existing email plus a
  wrong password, interleaving the samples and taking medians.
- **Expected:** the medians differ by less than a factor of three. Before the fix the measurement
  was 52 ms against 86–114 ms — a stable oracle, because an unknown email never reached `scrypt`.
  The threshold is deliberately loose: the goal is to catch a return of the early exit, not to
  measure microseconds.

### SEC-API-06 — error bodies carry no stack trace, file paths or library names

- **Priority:** P1
- **Steps:** trigger four errors and parse the bodies — a 400 (malformed payload), a 401 (no
  token), a 404 from an unknown path, and a 404 from a **known route with an id no meeting has**,
  requested with a valid token so the guard passes and the controller runs.
- **Expected:** every body holds only `statusCode`, `message`, `error`. No `stack`, no `C:\` or
  `/src/`, no `node_modules`, no `at ` trace lines.
- **Why the fourth sample is not the third one twice:** the unknown path is answered by Nest's own
  not-found handler, which cannot lose a key; the fourth is thrown by our code. `ADR-0018` makes
  the **argument form** of `NotFoundException` mandatory because the no-argument form answers with
  two keys — `message` and `statusCode`, no `error`. Only the second of the two can regress, and
  without this sample that rule is held by a single feature case: a no-argument form on the next
  resource would pass the cross-feature suite unseen. This is the same idea as `PROTECTED_ROUTES`,
  applied to error bodies. `MD-API-03` keeps its own job — comparing the two 404 bodies to each
  other; this case is about the key set of a handler-thrown 404.

### SEC-API-07 — extra body fields are rejected on every POST endpoint

- **Priority:** P1
- **Steps:** for each JSON POST route send a valid body plus a field absent from the DTO
  (`ownerId`, `role`, `isAdmin`). The file upload route takes the walker's **second branch**: its
  request is `multipart/form-data`, so the valid body is one part named `file` carrying a small
  payload the allow-list accepts, and the extra field is a text part named `label`.
- **Expected:** `400` with `property … should not exist` on both branches, naming `isAdmin` on the
  JSON routes and `label` on the multipart one. This checks that `forbidNonWhitelisted` is on
  globally rather than in one DTO: without it an extra field is silently ignored, and the first
  attempt to assign a foreign owner becomes a question of service implementation. The multipart
  branch checks something the JSON arm cannot — the upload DTO declares **no** properties, so the
  whole guarantee rests on `whitelist` plus `forbidNonWhitelisted` seeing the text part at all.
- **Why a branch and not another row:** the walker posts `data: {}` as a JSON body (`callRoute`),
  and a JSON body sent to the upload route answers `file is required`, not
  `property … should not exist` — so an extra `POST_ROUTES` row would pass while checking nothing.
  The JSON arm stays byte-identical in the diff, which is how a reviewer can see that the existing
  routes are still walked exactly as they were.

### SEC-API-08 — responses do not disclose the server stack

- **Priority:** P1
- **Steps:** read the response headers of `GET /` and `POST /auth/login`.
- **Expected:** no `X-Powered-By` header. Express sends it by default — a free hint about which
  stack and which CVEs to try.

### SEC-API-09 — one user's data is unreachable with another user's token

- **Priority:** P0
- **Steps:** take the `teacher` and `student` tokens, request `GET /meetings?limit=100` with each
  and compare the `id` sets. Then walk the by-id route: as a control the owner requests one of his
  own meetings by id, and then every `teacher` id is requested with the `student` token.
- **Expected:** the sets do not intersect; `student`'s list is empty and `teacher`'s is not. The
  owner's own request answers `200` with the same `id` — without that control a route that
  answered `404` to everyone would pass the rest vacuously. Every by-id request with the foreign
  token answers `404` and its body does not echo the id back, so the set reachable with the
  `student` token — through the list and through the by-id route together — still shares nothing
  with `teacher`'s.
  Duplicates `HD-API-06` on purpose: there it is part of the meetings contract, here it is an
  invariant that must hold once new resources appear — the by-id route is that appearance.
  Whether the two `404`s (an unknown id and another owner's id) are byte-identical is `ADR-0018`'s
  promise and belongs to `e2e/regression/meetings-detail/`; this case compares **id sets** only.

### SEC-API-10 — the repository holds no committed secrets and no `.env`

- **Priority:** P1
- **Steps:** walk the repository files (skipping `node_modules`, `.next`, `dist`, reports) and
  check their content for signs of secrets.
- **Expected:** no `.env` files (other than `.env.example`), no private keys
  (`BEGIN … PRIVATE KEY`), no strings resembling a real JWT (three dot-separated base64 segments
  over 80 characters). The check is filesystem-based rather than network-based, which is why it
  lives in the `api` project that starts no browser.

### SEC-API-11 — a stored filename cannot break out of a response header

- **Priority:** P0
- **Preconditions:** the hostile rows are **in the seed**, on a meeting that exists for no other
  purpose, and are mirrored in `e2e/fixtures/seed.ts` like every other seeded value. The seed is not
  a stand-in for the threat, it **is** the threat's most realistic instance: it writes `MeetingFile`
  rows through Prisma and never touches the upload controller. **The `filename` column has more than
  one writer** — the upload route validates what it admits and is correct, the seed writes straight
  through — and until this case existed the read path trusted the value it found there. The only
  thing standing between a stored `\r\n` and a split response was Node's `setHeader` throwing: a
  defence our code does not own and would lose to a different adapter. Planting through the seed
  also keeps the suite a black box over HTTP (`e2e/fixtures/seed.ts:5-8`) — no database client at
  the root, no `DATABASE_URL` in the test process, no knowledge of the schema.
- **Why `planner` owns the meeting:** `teacher` and `student` carry the absolute counts, 5 and 0,
  that half the suite asserts, so neither can gain a meeting. `organizer` is the browser project's
  sandbox, and putting hostile filenames under an owner a browser signs in as would render them on
  a page for no benefit. `planner`'s data is read only by `*.api.spec.ts`, and this suite's own rule
  is that no case reads `planner`'s totals — so an extra seeded meeting disturbs nothing, and no
  browser ever renders these names.
- **Steps:** as `planner`, find the dedicated meeting by its seeded title, list its files, and for
  each one request the download route and read the **raw** response headers. Take `teacher`'s
  `syllabus.pdf` as the benign control, so the case also proves the ordinary name is unharmed by
  the escaping.
- **Expected — the status is 200, every time.** There is no error case and no new status code here:
  RFC 6266's two-parameter pairing can represent any byte sequence, so no stored name is
  unrepresentable and the question of what to answer for an impossible name dissolves rather than
  being answered. The `500` this case found on its first run was a defect, now removed; it is not a
  status to document.
- **Expected — the invariant.** For every row: no `X-Injected` header, no `Set-Cookie`, and no
  header the test did not expect; `Content-Disposition` appears exactly once, contains neither a
  carriage return nor a line feed, and carries exactly one `filename=` parameter; no response line
  is split and no second response arrives on the connection.
- **Expected — the exact header**, as the builder emits it today:

| Stored filename                          | `Content-Disposition`                                                                                      |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `syllabus.pdf`                           | `attachment; filename="syllabus.pdf"; filename*=UTF-8''syllabus.pdf`                                       |
| `report".txt`                            | `attachment; filename="report_.txt"; filename*=UTF-8''report%22.txt`                                       |
| `evidence.log` + CR LF + `X-Injected: 1` | `attachment; filename="evidence.log__X-Injected_ 1"; filename*=UTF-8''evidence.log%0D%0AX-Injected%3A%201` |
| `minutes.txt` + LF + `Set-Cookie: a=b`   | `attachment; filename="minutes.txt_Set-Cookie_ a_b"; filename*=UTF-8''minutes.txt%0ASet-Cookie%3A%20a%3Db` |
| `../../etc/passwd`                       | `attachment; filename="passwd"; filename*=UTF-8''passwd`                                                   |
| `déjà-vu.png`                            | `attachment; filename="d_j_-vu.png"; filename*=UTF-8''d%C3%A9j%C3%A0-vu.png`                               |

- **Every row above was read back from a real request**, and the `minutes.txt` row was derived from
  the stated rules **before** it was run and matched character for character. That is the property a
  contract wants: the rules are unambiguous rather than needing interpretation, so the next hostile
  name does not need a decision, only an application.
- **The strings do not replace the invariant, and deleting it would be a mistake.** Those headers
  are what _this_ builder emits; a different implementation could emit a different, equally valid
  pairing and every string here would fail while the system stayed safe. The invariant assertions
  are what the case is _about_ — they catch the class of defect, the strings catch a regression in
  one implementation of the fix. When the strings next move, they move and the invariants stay.
- **Why it is here and not in `meeting-files`:** the filename regex guards the **upload** path, and
  `MF-API-10` covers that thoroughly. This case is phrased against the **response header**, because
  the upload is not the only way a row appears — the seed writes directly, and a rename endpoint, an
  import or a migration backfill would each do the same. Testing the property by exercising the one
  door that happens to have a lock on it proves the lock works, not that the property holds. That is
  the `PROTECTED_ROUTES` idea applied to a response header, which is what makes it a cross-feature
  invariant rather than `MF-API-10` under another ID.
- **Why nothing else has to care**, now that these names are seeded data the whole suite can see:
  the meeting is **new**, so no case that counts meetings or files was written against it; its
  **title is ordinary** and holds none of the hostile characters, so every case that walks titles
  stays green; the filenames contain no token another case searches for — no `password`, no
  `scrypt`, no seeded password and no seeded title — so `SEC-API-04`'s text scan is unaffected; and
  nothing uploads into it, which `meeting-files.api.cases.md` states as a precondition so that
  `SM-API-03` can assert its file list exactly.

### SEC-API-12 — another user's token cannot delete a meeting or its file

- **Priority:** P0
- **Data:** one meeting `planner` creates for this case with `POST /meetings` (unique title,
  `FUTURE_STARTS_AT_ISO`) and one small legal file uploaded into it; `student` as the foreign
  token, which makes requests and is never mutated. **No seeded row is a target** — not `teacher`'s,
  not `mtg-planner-2` — because the fault this case hunts would destroy whatever it was pointed at.
- **Steps:** as `student`, `DELETE /meetings/{id}/files/{fileId}`, then `DELETE /meetings/{id}` —
  the file first, so a meeting route that wrongly deletes cannot hide the file route's result by
  taking the file with it. Then, as `planner`, `GET /meetings/{id}`, list its files and download
  the file.
- **Expected:** both `student` requests answer `404` with exactly `FACT-2016`, and neither body
  echoes the meeting id or the file id back. The owner's `GET` answers `200`, the listing still
  holds the file, and its content downloads with the bytes uploaded: nothing reachable with the
  `student` token can remove a row `planner` owns. This is `SEC-API-09`'s invariant on the write
  path — the two `DELETE` routes are the next resources it has to hold for (`ADR-0018`,
  `FACT-3392`); byte-identity with an absent id stays in `MD-API-10` and `MF-API-22`.
- **Cleanup — and the control:** as `planner`, `DELETE /meetings/{id}/files/{fileId}` and then
  `DELETE /meetings/{id}`, **also on failure**, and both must answer `204`: the owner's own delete
  is the control without which a route answering `404` to everyone would pass this case vacuously.
  On a case that has already failed, cleanup removes whatever is left and its errors give way to
  the case's own failure — once the meeting is gone the file route answers `FACT-2016`, not
  `FACT-2083`, because ownership is checked first (`FACT-2124`).
