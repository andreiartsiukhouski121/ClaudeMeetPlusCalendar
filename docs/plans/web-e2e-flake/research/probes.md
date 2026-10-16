# Probes: web-e2e-flake (FIX-S2 reproduction, FIX-S3 cause)

Measured this cycle, not read from the repository. Sources: "FIX-S2 hand-back, 2026-10-16"
(`tester-functional`) and "FIX-S3 hand-back, 2026-10-16" (`implementer-web`); raw logs in
`C:\Users\User\AppData\Local\Temp\repro\` (`r1.log`…`r11.log` Playwright runs, `next*.log`,
`nest.log`, `p*.log`, `q*.log` probes). Pass/fail counts below were re-read from `r*.log` by the
researcher (`grep -Eo '[0-9]+ (passed|failed)'`).

## FIX-S2 — Reproduction

Machine: 14 logical CPUs; local default Playwright workers 14 (FIX-S2 hand-back).

Procedure (FIX-S2 hand-back): warm `.next`; start seven CPU busy-loops
`for i in $(seq 1 7); do node -e "const e=Date.now()+280000;while(Date.now()<e){}" & done`; run
`pnpm e2e --project=web --reporter=list`; kill the loops.

| Run | Load          | Workers | Command / project      | Result (from log)       | Failed cases (hand-back)                          |
| --- | ------------- | ------- | ---------------------- | ----------------------- | ------------------------------------------------- |
| r1  | none          | default | web, cold `.next`      | 54 passed, 79 s         | —                                                 |
| r2  | none          | default | full `pnpm e2e`, cold  | 173 passed, 83 s        | —                                                 |
| r7  | none          | default | web, warm              | 54 passed, 58 s         | —                                                 |
| r3  | 14 busy-loops | default | web                    | 5 failed, 49 passed     | (red)                                             |
| r4  | 7 busy-loops  | default | web                    | 54 passed               | —                                                 |
| r5  | 7 busy-loops  | default | web                    | 4 failed, 50 passed     | AL-FN-02, -03, -04, -08                           |
| r6  | 7 busy-loops  | default | web                    | 7 failed, 47 passed     | ACC-FN-02, -04, -05, -06; MF-FN-07, -09, -12      |
| r8  | 7 busy-loops  | default | web                    | 4 failed, 50 passed     | ACC-FN-02, -04, -05, -06                          |
| r10 | 7 busy-loops  | default | web                    | 54 passed               | —                                                 |
| r9  | 7 busy-loops  | 2       | web, `--workers=2`     | 54 passed, 90 s         | —                                                 |
| r11 | 7 busy-loops  | 2       | web, `--workers=2`     | 54 passed, 84 s         | —                                                 |

Stability: under 7 loops with default workers, red 3 of 5; 14 loops, red 1 of 1; 7 loops with
`--workers=2`, green 2 of 2; unloaded, green 3 of 3. Cold vs warm `.next` did not separate outcomes
(FIX-S2 hand-back).

Verbatim (FIX-S2 hand-back):

- AL-FN-02: `Expected: "http://127.0.0.1:3100/" Received: "http://127.0.0.1:3100/auth/login" Timeout: 10000ms`
- MF-FN-07: `Expected: 200 Received: 404`; MF-FN-12: body length 13156 (Next's HTML 404).
- dev log: `GET /meetings/mtg-teacher-3/files/fil-teacher-3-1 404 in 4.1s (next.js: 3.4s)`, then a
  second 404 on the same URL.
- In green unloaded runs, `POST /auth/login` application-code 3.3–5.5 s (max 6.1 s).

Expected behaviour is pinned by the cases themselves (see `tests.md`).

## FIX-S3 — Cause probes

Direct probes: Nest `node dist/main` on 3201, `next dev` on 3200 (FIX-S3 hand-back).

**(a) Login cost.** Password hashing is synchronous `scryptSync` (N=16384, 64-byte key) in
`apps/api/src/common/crypto/password.ts` (`verifyPassword` / `hashPassword`; see `code.md`), always
run per invariant 18 (`CLAUDE.md`). Measured (FIX-S3 hand-back):

| Probe                                    | Result                                          |
| ---------------------------------------- | ----------------------------------------------- |
| 1 login at Nest                          | 68 ms                                           |
| 14 concurrent at Nest                    | wall ~726–752 ms                                |
| 28 concurrent at Nest                    | 1416 ms (serialized, ~50 ms per queued login)   |
| 14 concurrent at Nest, 14 busy-loops     | 1056 ms                                         |
| 1 browser login through `next dev`       | application-code 133–143 ms                     |
| 14 concurrent browser logins, `next dev` | ~1.9–2.0 s each; slowest click-to-`/` 2.7 s     |

**(b) Files route 404.** The route handler's only 404 is `new Response(null, {status: 404})` and it
emits no HTML (FIX-S3 hand-back; `code.md`), so the 13,141-byte HTML 404 is produced by Next before
the handler runs (FIX-S3 hand-back). Reproduced without Playwright: after restarting `next dev`, 8
concurrent requests to different first-time routes (file route x3, `/`, a meeting page,
`/auth/login`, …):

- no load: 3 of 3 healthy;
- 14 busy-loops: 3 of 4 runs the known-good file URL returned HTML 404 after ~4.3–4.9 s, and the 404
  stuck — retries 3 s and 6 s later were also HTML 404 for the life of that `next dev` process;
- a lone cold request to the file route returns 200 (1.1 s).

Raw `next4.log:13-16`: `GET /meetings/mtg-teacher-3/files/fil-teacher-3-1 404 in 3.8s (next.js:
1441ms, proxy.ts: 667ms, application-code: 1646ms)` and two more 404s on the same URL.

Environment: Next 16.3.8, Turbopack (FIX-S3 hand-back). A `--webpack` comparison failed on an
unrelated resolution error and is not evidence (FIX-S3 hand-back).

**Not proven** (FIX-S3 hand-back): the Next internals of the first-compile race; whether
`--workers=2` helps through fewer concurrent first compiles or through less CPU.
