# Probes — `meeting-files`

Throwaway code run at `FEAT-S1` per `feature-pipeline` §0, to settle assumptions that are expensive
to guess. **Nothing here was installed into the repository.** Every probe ran in the session
scratchpad (`…/scratchpad/probes/`), in its own directory with its own `package.json` and its own
`npm install`. The repository's `package.json`, `pnpm-lock.yaml` and `node_modules` were not
modified; the only repository files read were configs, and no repository file was written outside
`docs/plans/meeting-files/research/`.

Each probe records **the command and its output**. The headline facts are repeated in
[`code.md`](code.md) under "Probe facts".

Environment of every run: Node `v24.14.0`, pnpm `10.32.1`, Windows 11, Git Bash
(`node --version`, `pnpm --version`).

---

## Probe 0 — Is Docker available on this machine?

**This probe was run twice and the answer inverted between the two runs**, because Docker Desktop was
installed on the machine partway through this stage, at the owner's instruction. Both states are
recorded. A file showing only the end state would hide that the machine was reconfigured during the
cycle, which the designer and the profiling record both need to see.

### 0a. First run — Docker was not installed anywhere checked

```
$ docker --version
bash: line 1: docker: command not found

$ ls "/c/Program Files/Docker"
ls: cannot access '/c/Program Files/Docker': No such file or directory

$ ls "/c/ProgramData/DockerDesktop"
ls: cannot access '/c/ProgramData/DockerDesktop': No such file or directory

$ ls "$LOCALAPPDATA/Docker"
ls: cannot access 'C:\Users\User\AppData\Local/Docker': No such file or directory

$ powershell -NoProfile -Command "Get-Command docker ..."
NOT ON PATH
```

WSL2 was present, with Ubuntu as the default distribution, and Docker was not installed inside it
either:

```
$ powershell -NoProfile -Command "wsl --status"
Default Distribution: Ubuntu
Default Version: 2

$ powershell -NoProfile -Command "wsl -e bash -lc 'which docker; docker --version'"
bash: line 1: docker: command not found
```

No host PostgreSQL service and no `psql`/`pg_ctl` on PATH:

```
$ powershell -NoProfile -Command "Get-Command psql,pg_ctl -ErrorAction SilentlyContinue; Get-Service -Name 'postgres*' -ErrorAction SilentlyContinue"
(no output)
```

Network access to the npm registry was available (`fetch('https://registry.npmjs.org/prisma')`
returned `200`), so probes needing an install were able to run.

> **Corrected at the `FEAT-G1` review.** The first version of this file titled this probe "Is Docker
> runnable on this machine?" and `code.md` rendered the result as "Docker cannot run on this
> machine". That over-reads the evidence above: what was established is that Docker was **not
> installed in the locations checked**, not that it could not be. WSL2 — its prerequisite — was
> present the whole time. The run below settles the capability question properly.

### 0b. Second run — Docker is installed and working

After Docker Desktop was installed on the machine, these were re-run independently rather than taken
on report:

```
$ docker --version
Docker version 29.8.2, build 7fc2dff

$ docker compose version
Docker Compose version v5.5.1

$ docker info --format '{{.ServerVersion}}'
29.8.2

$ powershell -NoProfile -Command "Get-LocalGroupMember -Group docker-users | Select-Object -ExpandProperty Name"
PC-PF5JWGSQ\User
```

`docker.exe` lives at `C:\Program Files\Docker\Docker\resources\bin` and is reached by adding that
directory to `PATH` in the shell; it was not on the default Git Bash `PATH` at the time of the run.

### 0c. A docker-compose PostgreSQL serves queries here

The deliverable scoping decision 2 names was exercised directly. Compose file used
(`…/scratchpad/probes/compose-probe.yml`):

```yaml
services:
  db:
    image: postgres:18-alpine
    environment:
      POSTGRES_PASSWORD: probe
      POSTGRES_DB: probedb
    ports:
      - '55433:5432'
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres -d probedb']
      interval: 2s
      timeout: 3s
      retries: 15
```

```
$ docker compose -f compose-probe.yml up -d --wait
 Network probes_default  Created
 Container probes-db-1  Created
 Container probes-db-1  Starting
 Container probes-db-1  Started
 Container probes-db-1  Waiting
 Container probes-db-1  Healthy
exit=0

$ docker compose -f compose-probe.yml ps
NAME          IMAGE                SERVICE   STATUS                   PORTS
probes-db-1   postgres:18-alpine   db        Up 2 seconds (healthy)   0.0.0.0:55433->5432/tcp

$ docker compose -f compose-probe.yml exec -T db psql -U postgres -d probedb -c "select version();"
 PostgreSQL 18.6 on x86_64-pc-linux-musl, compiled by gcc (Alpine 15.2.0) 15.2.0, 64-bit
(1 row)

$ docker compose -f compose-probe.yml down -v
 Container probes-db-1  Removed
 Network probes_default  Removed
```

Two mechanism facts fall out of this, recorded because probe 6 is about ordering a dependency ahead
of the servers: `docker compose up -d --wait` **blocks until the healthcheck passes** and exits 0,
and a `pg_isready` healthcheck is what made that meaningful. No conclusion is drawn here about
whether that is the right vehicle — that is design.

### 0d. What 0b and 0c do **not** establish

- That the engine is available **without the Docker Desktop GUI being launched first**. It was not up
  until the application was started; `docker info` failed before that. This is a property of the
  setup, not an incidental detail.
- That it survives a reboot unattended.
- Anything about resource limits, memory, or disk.
- **Anything about CI.** `.github/workflows/ci.yml` still declares no `services:` block and no
  container, and both jobs are `ubuntu-latest` — see `code.md`, "The CI environment itself". CI needs
  its own answer and does not inherit this one.

### 0e. A PostgreSQL was also obtained without Docker

Before 0b, and still true: the `embedded-postgres` npm package ships a native server binary and ran a
real PostgreSQL 18.4 on this machine with no Docker at all — see probe 5. Recorded as a fact about
the machine, not as a proposal.

---

## Probe 1 — Does Prisma generate and import cleanly under `apps/api`'s ESM + NodeNext config?

The constraint being tested, cited from the repository: `apps/api/package.json:5` is
`"type": "module"`; `packages/tsconfig/nestjs.json` sets `"module": "nodenext"` and
`"moduleResolution": "nodenext"`; `apps/api/tsconfig.json:5` pins
`"types": ["vitest/globals", "node"]`.

### 1a. `npm install prisma @prisma/client` installs mismatched major versions

```
$ npm install prisma @prisma/client
added 354 packages in 2m

$ node -p "require('./node_modules/prisma/package.json').version"
8.0.0-rc.20
$ node -p "require('./node_modules/@prisma/client/package.json').version"
7.10.0
```

The cause is npm's dist-tags: the `latest` tag of `prisma` currently points at a **release
candidate**, while `@prisma/client`'s `latest` is stable.

```
$ npm view prisma dist-tags --json
{ … "next": "8.0.0-rc.10", "prev": "7.10.0", "latest": "8.0.0-rc.20", … }

$ npm view @prisma/client dist-tags --json
{ … "prev": "6.19.3", "latest": "7.10.0", … }
```

All remaining probes were run on a matched pair, `prisma@7.10.0` + `@prisma/client@7.10.0`.

### 1b. Prisma 7 rejects `url` inside the `datasource` block

With the schema written the way nearly all Prisma documentation and tutorials show it
(`url = env("DATABASE_URL")` inside `datasource db`):

```
$ npx prisma generate
Error: Prisma schema validation - (get-config wasm)
Error code: P1012
error: The datasource property `url` is no longer supported in schema files. Move connection URLs
for Migrate to `prisma.config.ts` and pass either `adapter` for a direct database connection or
`accelerateUrl` for Accelerate to the `PrismaClient` constructor.
See https://pris.ly/d/config-datasource and https://pris.ly/d/prisma7-client-config
  -->  prisma\schema.prisma:9
Prisma CLI Version : 7.10.0
```

The shape that does work: `datasource db { provider = "postgresql" }` with no `url`, plus a
`prisma.config.ts`:

```ts
import { defineConfig } from 'prisma/config';
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: process.env.DATABASE_URL ?? '' },
});
```

and a **driver adapter** passed to the client constructor at runtime (`@prisma/adapter-pg` + `pg`).

### 1c. The `prisma-client` generator emits TypeScript with `.ts` import specifiers — which the repository's tsconfig rejects

```
$ npx prisma generate      # generator provider = "prisma-client", moduleFormat = "esm"
✔ Generated Prisma Client (7.10.0) to .\src\generated\prisma in 30ms

$ ls -R src/generated/prisma
browser.ts  client.ts  commonInputTypes.ts  enums.ts  internal  models  models.ts
```

The output is `.ts` **source**, not compiled `.js` + `.d.ts`, and its internal imports carry a `.ts`
extension:

```
$ grep -n "^import|^export .*from" src/generated/prisma/client.ts
18:import * as runtime from "@prisma/client/runtime/client"
19:import * as $Enums from "./enums.ts"
20:import * as $Class from "./internal/class.ts"
21:import * as Prisma from "./internal/prismaNamespace.ts"
23:export * as $Enums from './enums.ts'
```

Typechecked with a tsconfig copied field-for-field from `packages/tsconfig/base.json` +
`packages/tsconfig/nestjs.json` (TypeScript `6.0.3`, the repository's catalog version):

```
$ npx tsc --noEmit -p tsconfig.json
src/use-client.ts(1,30): error TS5097: An import path can only end with a '.ts' extension when
  'allowImportingTsExtensions' is enabled.
src/use-client.ts(2,15): error TS2305: Module '"./generated/prisma/models.ts"' has no exported
  member 'MeetingFile'.
exit=2
```

The generated barrel also carries `// @ts-nocheck` and an `eslint-disable` header
(`src/generated/prisma/models.ts:1-5`), and exports model types under a `…Model` suffix
(`export type MeetingFileModel = …`, `src/generated/prisma/models/MeetingFile.ts:19`) rather than
the bare model name.

### 1d. The `prisma-client-js` generator still exists in Prisma 7 and typechecks clean under the repository's exact settings

```
$ npx prisma generate     # generator provider = "prisma-client-js", no output/moduleFormat
✔ Generated Prisma Client (v7.10.0) to .\node_modules\@prisma\client in 71ms
```

Source under test:

```ts
import { PrismaClient } from '@prisma/client';
import type { MeetingFile } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
export function contentOf(f: MeetingFile): Uint8Array { return f.content; }
export function makeClient(url: string) {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}
```

```
$ npx tsc --noEmit -p tsconfig.json      # target ES2023, module+moduleResolution nodenext,
                                         # strict, emitDecoratorMetadata, experimentalDecorators
exit=0
```

And at runtime under Node ESM, in a package with `"type": "module"`:

```
$ node run.mjs
CONSTRUCTED OK: true
```

### 1e. Under Vitest, with no database running

`vitest@4.1.2` (the repository's version), a spec constructing the client and calling a service
method:

```
$ npx vitest run src/svc.spec.ts
 Test Files  1 passed (1)
      Tests  2 passed (2)
   Duration  299ms
```

So: the import and the construction succeed under Vitest with nothing listening. See probe 7 for
what a *query* does.

---

## Probe 2 — Multipart in Nest 12 on Express 5

### 2a. What the repository already resolves

```
$ node -p "require('./apps/api/node_modules/@nestjs/platform-express/package.json').version"
12.0.1
$ node -p "…dependencies"
{"cors":"2.8.6","express":"5.2.1","multer":"2.2.0","path-to-regexp":"8.4.2","tslib":"2.8.1"}
```

`pnpm-lock.yaml:3000` resolves `multer@2.4.0`, not `2.2.0`, because `pnpm-workspace.yaml:25-26`
carries `overrides: { multer: '>=2.3.0' }`. The comment above it (`pnpm-workspace.yaml:22-26`)
attributes the override to two high advisories and `pnpm audit`, not to any upload feature.

So **multer 2.4.0 and Express 5.2.1 are already installed in this repository today**, as transitive
dependencies of `@nestjs/platform-express`.

### 2b. A fresh Nest 12 install resolves the same stack

```
$ npm install @nestjs/common@^12.0.1 @nestjs/core@^12.0.1 @nestjs/platform-express@^12.0.1 …
$ node -p "require('./node_modules/@nestjs/platform-express/package.json').version"   → 12.1.2
$ node -p "require('./node_modules/express/package.json').version"                    → 5.2.1
$ node -p "require('./node_modules/multer/package.json').version"                     → 2.4.0
```

### 2c. `FileInterceptor` works on Express 5, and `file.buffer` is a Node `Buffer`

A Nest app with `@UseInterceptors(FileInterceptor('file'))` and a `ValidationPipe` registered as an
`APP_PIPE` provider with **exactly** the repository's options
(`whitelist: true, forbidNonWhitelisted: true, transform: true` — `apps/api/src/app.module.ts:21-24`),
sent a real `FormData` request:

```
--- B durationMinutes omitted -> 200 ---
{"receivedFile":{"field":"file","name":"a.txt","mime":"text/plain","size":3,
  "isBuffer":true,"head":"010203"},
 "dto":{"label":"quarterly"},
 "dtoTypes":{"label":"string","durationMinutes":"undefined"}}
```

`isBuffer: true` — `file.buffer` is a Node `Buffer`, and the bytes arrive intact
(`head: "010203"` for a body of `[1,2,3]`).

### 2d. `Express.Multer.File` does not resolve under the repository's `types` array

`multer@2.4.0` ships **no** typings of its own:

```
$ node -p "JSON.stringify({types:…types, typings:…typings, version:…version})"
{"version":"2.4.0"}
$ ls node_modules/multer/
LICENSE  README.md  index.js  lib  node_modules  package.json  storage
```

`@types/multer@2.3.0` supplies them, as a **global augmentation**
(`declare global { namespace Express { namespace Multer { interface File … } } }`,
`node_modules/@types/multer/index.d.ts:4-6`). With an explicit `"types"` array that omits it:

```
$ npx tsc -p tsconfig.json      # "types": ["node"]
src/main.ts(26,40): error TS2694: Namespace 'global.Express' has no exported member 'Multer'.
exit=2
```

Adding it to the array fixes it, with no other change:

```
$ npx tsc -p tsconfig.json      # "types": ["node", "multer"]
exit=0
```

This bears directly on `apps/api/tsconfig.json:5`, which pins
`"types": ["vitest/globals", "node"]` — an explicit array, so `@types/multer` would not be picked up
automatically there either.

`@nestjs/platform-express` itself exports `MulterOptions`, `MulterLimits`, `MulterModuleOptions` and
`MulterOptionsFactory` (`node_modules/@nestjs/platform-express/multer/interfaces/*.d.ts`) but no
file type.

---

## Probe 3 — `ValidationPipe` against a multipart request

All four runs used a `ValidationPipe` with the repository's exact options
(`apps/api/src/app.module.ts:21-24`) unless noted, and a DTO carrying
`@IsString() @MinLength(3) label` and `@IsOptional() @IsInt() @Min(15) @Max(480) durationMinutes`.

### 3a. With the repository's current options, a numeric field sent over multipart **fails**

Multipart form fields arrive as strings, and `transform: true` alone does not coerce them:

```
--- A valid multipart, durationMinutes="60" -> 400 ---
{"message":["durationMinutes must not be greater than 480",
            "durationMinutes must not be less than 15",
            "durationMinutes must be an integer number"],
 "error":"Bad Request","statusCode":400}
```

The identical payload sent as **JSON** passes, because JSON carries a real number:

```
--- D JSON body (no multipart) -> 200 ---
{"receivedFile":null,"dto":{"label":"quarterly","durationMinutes":60},
 "dtoTypes":{"label":"string","durationMinutes":"number"}}
```

### 3b. `@IsOptional()` behaves over multipart as invariant 2 requires

Omitting the field entirely gives 200, not 400 — run B in probe 2c above.

### 3c. `forbidNonWhitelisted` fires over multipart, with the body shape of `FACT-2013`

```
--- E extra field ownerId -> 400 ---
{"message":["property ownerId should not exist"],"error":"Bad Request","statusCode":400}
```

### 3d. Several messages accumulate, in the `message`-array shape of `FACT-2012` / invariant 8

```
--- C label too short + durationMinutes=9999 -> 400 ---
{"message":["label must be longer than or equal to 3 characters",
            "durationMinutes must not be greater than 480",
            "durationMinutes must not be less than 15",
            "durationMinutes must be an integer number"],
 "error":"Bad Request","statusCode":400}
```

The 400 body shape over multipart is therefore byte-compatible with the JSON one already documented
at `FACT-2012` and `FACT-2013`: `{ message: string[], error: "Bad Request", statusCode: 400 }`.

### 3e. Two coercion routes that do make a multipart numeric field validate

Recorded as measured behaviour, **not as a recommendation** — choosing between them is design.

With `transformOptions: { enableImplicitConversion: true }` added to the pipe:

```
--- enableImplicitConversion:true, multipart "60"   -> 200 ---
{"dto":{"label":"quarterly","durationMinutes":60},"t":"number","file":"a.txt"}
--- enableImplicitConversion:true, multipart "9999" -> 400 ---
{"message":["durationMinutes must not be greater than 480"],"error":"Bad Request","statusCode":400}
```

With the pipe unchanged and `@Type(() => Number)` on the DTO field instead:

```
--- @Type(()=>Number), multipart "60"  -> 200 ---
{"dto":{"label":"quarterly","durationMinutes":60},"t":"number","file":"a.txt"}
--- @Type(()=>Number), omitted         -> 200 ---
{"dto":{"label":"quarterly"},"t":"undefined","file":"a.txt"}
```

Note that under `enableImplicitConversion: true` the out-of-range case produces **one** message
rather than three, because the value is a number by the time `@IsInt` runs — i.e. the choice changes
the documented 400 body, which `FACT-2012`'s shape and the api cases assert.

---

## Probe 4 — Next.js Server Action body size limit

`apps/web` has Next `16.3.6` installed
(`node -p "require('./apps/web/node_modules/next/package.json').version"`), and
`apps/web/next.config.ts` carries **no** `experimental.serverActions` block — only
`allowedDevOrigins`. So the default applies.

The default, read from the installed package rather than from documentation —
`apps/web/node_modules/next/dist/esm/server/app-render/action-handler.js:490-493`:

```js
const defaultBodySizeLimit = '1 MB';
const bodySizeLimit = serverActions?.bodySizeLimit ?? defaultBodySizeLimit;
const bodySizeLimitBytes = bodySizeLimit !== defaultBodySizeLimit
  ? require('next/dist/compiled/bytes').parse(bodySizeLimit)
  : 1024 * 1024 // 1 MB
```

The failure surface, same file, lines 521 and 613 (the edge and node paths):

```js
throw new ApiError(413,
  `Body exceeded ${bodySizeLimit} limit.\n` +
  `To configure the body size limit for Server Actions, see: ` +
  `https://nextjs.org/docs/app/api-reference/next-config-js/serverActions#bodysizelimit`)
```

carrying `__NEXT_ERROR_CODE` `"E394"`. The size is enforced by a streaming transform, not after
buffering — the comment at line 511-513 states "We cannot call `req.request.formData()` directly as
that would bypass the body size limit entirely."

Where the option is read from config, confirming it is still under `experimental` in Next 16 —
`apps/web/node_modules/next/dist/server/config.js:699-706` reads
`result.experimental.serverActions.bodySizeLimit`.

Next's own bundled documentation agrees:
`apps/web/node_modules/next/dist/docs/01-app/02-guides/server-actions.md:83` — "Action requests are
capped at 1MB by default."; and
`…/01-next-config-js/serverActions.md:61-63` — "By default, the maximum size of the request body
sent to a Server Action is 1MB … It can take the number of bytes or any string format supported by
bytes, for example `1000`, `'500kb'` or `'3mb'`."

**Not probed empirically:** a live oversized upload through a running `next dev` was not performed.
Doing so needs a Next dev server started against `apps/web`, and Next 16 registers its dev server per
project directory (`CLAUDE.md`, "Isolating parallel agents"), so starting one risks colliding with a
`pnpm dev` the user may be running. What the client actually receives on the wire for that 413 —
and whether `useActionState` surfaces it as a thrown error or as state — is therefore **unknown**;
only the server-side throw site is evidenced above.

---

## Probe 5 — Prisma `Bytes` round-trip

Docker is unavailable (probe 0), so a real PostgreSQL was obtained from the `embedded-postgres`
package, which ships a native server binary:

```
$ npm install embedded-postgres        # 18.4.0-beta.17
$ node pgkeep.mjs
LOG:  starting PostgreSQL 18.4 on x86_64-windows, compiled by msvc-19.44.35226, 64-bit
LOG:  listening on IPv4 address "127.0.0.1", port 55432
LOG:  database system is ready to accept connections
READY
```

This is recorded as a fact about **this machine**, not as a proposal for the repository: a real
PostgreSQL 18.4 can be run here without Docker.

### 5a. `prisma db push` lost `--skip-generate` in Prisma 7

```
$ npx prisma db push --skip-generate
! unknown or unexpected option: --skip-generate
```

Without it:

```
$ npx prisma db push
Datasource "db": PostgreSQL database "probedb", schema "public" at "127.0.0.1:55432"
Your database is now in sync with your Prisma schema. Done in 177ms
```

### 5b. `Bytes` becomes `bytea`

Schema field `content Bytes`, read back from `information_schema`:

| column_name | data_type                   |
| ----------- | --------------------------- |
| id          | text                        |
| meetingId   | text                        |
| filename    | text                        |
| contentType | text                        |
| sizeBytes   | integer                     |
| content     | **bytea**                   |
| uploadedAt  | timestamp without time zone |

Note `DateTime` → `timestamp without time zone`, not `timestamptz`.

### 5c. A 1 MiB buffer round-trips byte-identical, but comes back as `Uint8Array`, not `Buffer`

Wrote a 1 048 576-byte Node `Buffer` (a `%PDF-1.7` header plus a deterministic high-byte fill) and
read the row back:

```
--- round trip ---
ctor            : Uint8Array
isBuffer        : false
isUint8Array    : true
byteLength      : 1048576 (wrote 1048576 )
sha256 matches  : true
head as text    : %PDF-1.7
uploadedAt type : Date 2026-10-05T15:20:20.233Z
startsAt type   : 2030-01-01T10:00:00.000Z
```

So: a `Buffer` goes in, a plain `Uint8Array` comes out, and the bytes are unchanged (SHA-256 of
1 MiB matches). `Buffer.isBuffer(row.content)` is **false**.

The declared TypeScript type of a `Bytes` field is `runtime.Bytes`, defined at
`node_modules/@prisma/client/runtime/client.d.ts:183` as:

```ts
export declare type Bytes = ReturnType<Uint8Array['slice']>;
```

i.e. `Uint8Array`. Assigning it to a `Buffer`-typed value does not typecheck; assigning it to
`Uint8Array` does (probe 1d compiled clean with `: Uint8Array`).

### 5d. What `JSON.stringify` does to such a value

```
JSON.stringify of a Bytes value: {"content":{"0":1,"1":2,"2":3}}
```

A `Uint8Array` serialises to an object keyed by index, not to an array and not to base64. This is
what `JSON.stringify` does to such a value.

**Narrowed at the `FEAT-G1` review.** This line previously read "that is what a Nest controller
returning the entity directly would emit" — no Nest was running in probe 5, and that was an
inference, not a measurement. What is measured is the `JSON.stringify` output above. Whether Nest's
serializer produces the same bytes for a `Uint8Array` was **not probed**.

### 5e. Metadata-only selection and cascade both work

```
--- metadata-only select ---            # select: { id, filename, sizeBytes } — content omitted
[{"id":"62c420fd-60dd-4cb1-9b4c-fbad283c97c2","filename":"q.pdf","sizeBytes":1048576}]

files after meeting delete (onDelete: Cascade): 0
```

### 5f. `DateTime` comes back as a JS `Date`

`startsAt` written as `new Date('2030-01-01T10:00:00.000Z')` read back as a `Date` whose
`.toISOString()` is `2030-01-01T10:00:00.000Z`. The repository today stores `startsAt` as an ISO
**string**, not a `Date` (`FACT-1008`) — the conversion point is recorded here as a fact, not
resolved.

---

## Probe 6 — Playwright and a dependency that must be up before the servers

Read from `playwright.config.ts` and from the installed `playwright@1.62.1`. No run was performed.

**What the config has today:** exactly two `webServer` entries — web
(`pnpm dev --port ${WEB_PORT}`, `cwd: 'apps/web'`, `env: { API_URL }`, `timeout: 180_000`) and api
(`pnpm dev`, `cwd: 'apps/api'`, `env: { PORT: API_PORT, JWT_SECRET: 'e2e-secret' }`,
`timeout: 120_000`), both with `reuseExistingServer: !isCI`
(`playwright.config.ts`, `webServer:` array). There is **no** `globalSetup` and **no**
`globalTeardown` key anywhere in the file.

**What the mechanism supports**, from the installed implementation:

- The `webServer` value is a list and one `WebServerPlugin` is constructed per entry —
  `node_modules/.pnpm/playwright@1.62.1/node_modules/playwright/lib/runner/index.js:986-1000`:
  `for (const webServerConfig of config2.webServers) { … webServerPlugins.push(new WebServerPlugin(…)) }`.
  So the array is not limited to two.
- One setup task is created per plugin, in plugin order —
  `…/lib/runner/index.js:6039-6047` (`config2.plugins.map((plugin) => ({ title: "plugin setup", setup: … }))`).
- Those tasks are awaited **one at a time, in order** — `…/lib/runner/index.js:5827-5836`:
  `for (const task of this._tasks) { … await task.setup?.(context, errors, softErrors); }`.
- Each `WebServerPlugin.setup` waits for its `url` to respond and throws
  `Timed out waiting ${launchTimeout}ms from config.webServer.` otherwise
  (`…/lib/runner/index.js:940`), and refuses to start if the url is already taken unless
  `reuseExistingServer` is set (`…:851`).

So the ordering guarantee a pre-server dependency would need does exist in the mechanism (entries
start sequentially in array order, each awaited until its url answers). **Whether that is the right
vehicle here is a design question and is not answered.**

`pnpm verify` runs, in this order (root `package.json`):

```
check:orientation → lint → typecheck → test → --filter @purpleschool/api test:e2e
  → format:check → e2e → audit --audit-level high
```

Three of those steps (`test`, `test:e2e`, `e2e`) would execute code that, after this change, talks
to a database; only the last one starts any server.

---

## Probe 7 — A Prisma-backed service under Vitest with no database

The repository's unit specs construct services directly
(`apps/api/src/meetings/meetings.service.spec.ts`, `users.service.spec.ts`). The probe mirrored that
shape: a hand-rolled `MeetingsService` holding a `PrismaClient`, under `vitest@4.1.2`.

**Construction and import succeed; the query rejects.**

```
$ npx vitest run src/svc.spec.ts
 Test Files  1 passed (1)
      Tests  2 passed (2)
```

where `PR-1` asserted `typeof client.meeting.count === 'function'` and `PR-2` asserted
`await expect(svc.countByOwner('usr-teacher')).rejects.toThrow()`.

The rejection, captured from the plain Node run of the same code:

```
$ node run.mjs
CONSTRUCTED OK: true
QUERY ERROR name: PrismaClientKnownRequestError
QUERY ERROR code: P1001
QUERY ERROR msg:  | Invalid `prisma.meetingFile.findMany()` invocation: | …
```

So a service method that reaches Prisma throws `PrismaClientKnownRequestError` with code `P1001`
when nothing is listening. Constructing the client does not connect — the connection is attempted at
first query.

**Not probed:** whether a Prisma client can be substituted in a Vitest unit without a database
(mocking, `vi.mock`, an in-memory driver adapter) was not tested; no such pattern exists in the
repository today to test against.

---

## What the probes did **not** settle

- The live 413 surface of an oversized Next Server Action upload, as seen by the browser and by
  `useActionState` — probe 4, reason recorded there.
- Whether a Prisma client can be faked in a Vitest unit, and what the existing unit specs would
  become — probe 7.
- Whether Docker is available without the Docker Desktop GUI being launched, whether it survives a
  reboot, and anything about resource limits — probe 0d. **Superseded in part at the `FEAT-G1`
  review:** this line previously read "Anything about docker-compose behaviour, since Docker cannot
  run on this machine". Docker was installed mid-stage and probe 0c runs a compose PostgreSQL to a
  healthy state here, so compose behaviour *is* exercisable locally. What remains unsettled is the
  list above, plus CI.
- **Anything about CI** — `.github/workflows/ci.yml` declares no `services:` block and no container,
  and nothing was run there. The local Docker result does not transfer.
- Prisma migration workflow (`prisma migrate dev` / `deploy`), shadow databases, and what they need
  — only `db push` was exercised.
- Whether `nest build` copies or resolves a generated Prisma client into `dist/`
  (`apps/api/nest-cli.json` has no asset configuration — see `code.md`); only `tsc --noEmit` and
  direct `node` execution were tested, never `nest build` + `node dist/main`.
