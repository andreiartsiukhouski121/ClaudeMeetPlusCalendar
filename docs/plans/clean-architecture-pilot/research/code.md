# Code research: `apps/api/src/meeting-files` (clean-architecture-pilot)

Sweep converged after 38 files read or grepped. Paths are relative to `C:\GIT\PurpleSchool`; `M/` = `apps/api/src/meeting-files/`.

## 1. Files in the module, exports, importers

Nine files plus the `dto/` folder (`M/` listing; wc: controller 179, service 93, rules 131, mapper 16, module 19, types 27, seed 126, dto 16, rules.spec 202).

| File                            | Exports                                                                                                                                                                                                        | Repo-wide importers                                                                                                                                                                                                                                                                                     |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `M/meeting-files.controller.ts` | `FILE_NOT_FOUND_MESSAGE` (:39), `MeetingFilesController` (:49)                                                                                                                                                 | `M/meeting-files.module.ts:6` only. `FILE_NOT_FOUND_MESSAGE` has no importer outside its own file (grep over apps, e2e, scripts)                                                                                                                                                                        |
| `M/meeting-files.service.ts`    | `MeetingFilesService` (:14, `@Injectable()`:13); non-exported `toDomainMeetingFile` (:75)                                                                                                                      | `M/meeting-files.controller.ts:36`, `M/meeting-files.module.ts:7`                                                                                                                                                                                                                                       |
| `M/meeting-files.rules.ts`      | `MAX_FILES_PER_MEETING` (:7), `MAX_FILE_SIZE_BYTES` (:8), `FILENAME_RULE_MESSAGE` (:10), `isValidFilename` (:24), `normalizeContentType` (:47), `isAllowedContentType` (:53), `buildContentDisposition` (:125) | controller `:27-35`; `M/meeting-files.rules.spec.ts:3-8` (imports four: `buildContentDisposition`, `isAllowedContentType`, `isValidFilename`, `normalizeContentType`). `e2e/regression/meeting-files/meeting-files.api.spec.ts:68` declares its own `FILENAME_RULE_MESSAGE` const rather than importing |
| `M/meeting-files.mapper.ts`     | `toMeetingFileDto` (:8)                                                                                                                                                                                        | controller `:26`                                                                                                                                                                                                                                                                                        |
| `M/meeting-file.types.ts`       | `MeetingFile` (:6), `MeetingFileDto = Omit<MeetingFile,'meetingId'\|'content'>` (:20), `CreateMeetingFileInput` (:23)                                                                                          | controller `:25` (type), service `:5` (type), mapper `:1` (type). `e2e/.../meeting-files.api.spec.ts:37` declares its own `MeetingFileDto` interface                                                                                                                                                    |
| `M/meeting-files.module.ts`     | `MeetingFilesModule` (:19)                                                                                                                                                                                     | `apps/api/src/app.module.ts:7,12`                                                                                                                                                                                                                                                                       |
| `M/dto/upload-file.dto.ts`      | `UploadFileDto` (empty class, :16)                                                                                                                                                                             | controller `:24`                                                                                                                                                                                                                                                                                        |
| `M/meeting-files.seed.ts`       | `SeedMeetingFile` interface (:31), `SEED_MEETING_FILES` (:60); the file has no `import` statements (grep `^import` empty)                                                                                      | `apps/api/prisma/seed.ts:45` (dynamic `await import('../src/meeting-files/meeting-files.seed.js')`), used at `prisma/seed.ts:100`. Mirrored by hand in `e2e/fixtures/seed.ts:110,145`; drift is checked by `e2e/smoke/seed.api.spec.ts:49`                                                              |
| `M/meeting-files.rules.spec.ts` | none; titles `MF-UT-01` (:23), `MF-UT-02` (:35), `MF-UT-03` (:64), `MF-UT-08` (:104), `MF-UT-09` (:139), `MF-UT-10` (:180)                                                                                     | run by `package.json:24` `"test:meeting-files": "pnpm -r test -t \"MF-UT-\""`; listed at `e2e/README.md:55`                                                                                                                                                                                             |

`prisma/seed.ts:48-53` comment: `users.service.ts` carries `@Injectable()`, so `normalizeEmail` lives in an undecorated module `src/users/normalize-email.js` for the seed's sake. `prisma/seed.ts:1-38` registers a resolver hook for `.js` -> `.ts` siblings.

### Imports from other modules

- Controller: `../auth/auth.types.js` (type `AuthenticatedUser`, `:19`), `../auth/current-user.decorator.js` (`CurrentUser`, `:20`), `../auth/jwt-auth.guard.js` (`JwtAuthGuard`, `:21`), `../meetings/meetings.controller.js` (`MEETING_NOT_FOUND_MESSAGE`, `:22`), `../meetings/meetings.service.js` (`MeetingsService`, `:23`); `@nestjs/common` (`:1-15`), `@nestjs/platform-express` (`FileInterceptor`, `:16`), `express` (type `Response`, `:17`).
- Service: `node:crypto` `randomUUID` (`:1`), `@nestjs/common` `Injectable` (`:2`), `../prisma/prisma.service.js` (`:4`).
- Module: `../auth/auth.module.js`, `../meetings/meetings.module.js`, `../prisma/prisma.module.js` (`M/meeting-files.module.ts:3-5`).
- Nothing in the module imports from `users` (grep of the imports above). `MeetingsService` is exported by `apps/api/src/meetings/meetings.module.ts` (`exports: [MeetingsService]`). `MeetingsService.findById(ownerId, id): Promise<Meeting | undefined>` is at `apps/api/src/meetings/meetings.service.ts:80`; `MEETING_NOT_FOUND_MESSAGE = 'Meeting not found'` at `apps/api/src/meetings/meetings.controller.ts:27`.
- Other-module types visible to the controller: `AuthenticatedUser {id, email}` (`apps/api/src/auth/auth.types.ts:14-17`); `CurrentUser` is a `createParamDecorator` returning `request.user` (`apps/api/src/auth/current-user.decorator.ts:8-11`).
- `Express.Multer.File` is used without import (controller `:73`), supplied by `"types": ["vitest/globals","node","multer"]` (`apps/api/tsconfig.json:5`).

### Business rules (`M/meeting-files.rules.ts`)

- File cap per meeting: `MAX_FILES_PER_MEETING = 10` (`:7`); size ceiling `MAX_FILE_SIZE_BYTES = 1_048_576` (`:8`).
- Filename: `FILENAME_RULE_MESSAGE` (`:10-11`), `MAX_FILENAME_LENGTH = 100` (`:13`), `FILENAME_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9._ -]*[A-Za-z0-9._-])?$/` (`:22`), `isValidFilename` length 1..100 + pattern (`:24-30`).
- Content type: allow-list set of `application/pdf`, `image/png`, `image/jpeg`, `text/plain` (`:33-38`); `normalizeContentType` cut at first `;`, trim, lower-case (`:47-51`); `isAllowedContentType` (`:53-55`).
- Download header: `MAX_ASCII_FALLBACK_LENGTH = 100` (`:57`), `ATTR_CHAR_PATTERN` (`:60`), `ASCII_FALLBACK_SAFE_PATTERN` (`:63`), private `toFilenameBase` (`:73`), `toExtendedFilenameParameter` (`:86`, uses `Buffer.from` `:87`), `toAsciiFilenameParameter` (`:108`), exported `buildContentDisposition` returning `attachment; filename="…"; filename*=UTF-8''…` (`:125-130`).
- Rules in the controller body rather than in `rules.ts`: the string `'file is required'` (`:82`), the 415 text (`:94-96`), the cap text `'a meeting may hold at most 10 files'` (`:110`, the number is a literal, not `MAX_FILES_PER_MEETING`), the `>=` comparison (`:107`), the order of checks (`:79-111`).
- In the service: id format `fil-${randomUUID()}` (`:30`), `sizeBytes: input.content.length` (`:34`), `uploadedAt: new Date().toISOString()` (`:39`), ordering `[{ uploadedAt: 'desc' }, { id: 'asc' }]` (`:53`), file-belongs-to-meeting check `row.meetingId === meetingId` (`:67`).
- Mapper: five explicit keys `contentType, filename, id, sizeBytes, uploadedAt` (`M/meeting-files.mapper.ts:9-15`).
- Controller-only transformation: `Buffer.from(file.content)` (`:162`), header set `:170-175`, `new StreamableFile(content)` (`:177`).

### Comments citing "design §N" or `docs/plans/` (grep `design §|docs/plans` in `M/`; no `docs/plans/` literal found)

`M/dto/upload-file.dto.ts:2`; `M/meeting-files.controller.ts:45, 56, 93, 109, 138`; `M/meeting-files.module.ts:12`; `M/meeting-files.rules.ts:3, 6, 17, 45, 66` (`:66` reads `design §"The download header is built, never interpolated"`); `M/meeting-files.seed.ts:6, 12`; `M/meeting-files.service.ts:11, 17`. Also `M/dto/upload-file.dto.ts:2-3` cites the fork label `"C5"`, and `:6` cites `validation.pipe.js:36`. Total 17 lines in 6 files (spec file: none).

## 2. Errors thrown

All inside `M/meeting-files.controller.ts`; the service, rules and mapper throw nothing (grep `throw ` in `apps/api/src` lists only auth, config, controllers).

| Where                  | Class                           | Status | Message                                                                        |
| ---------------------- | ------------------------------- | ------ | ------------------------------------------------------------------------------ |
| `:82`                  | `BadRequestException`           | 400    | `['file is required']` (array)                                                 |
| `:86`                  | `BadRequestException`           | 400    | `[FILENAME_RULE_MESSAGE]` (array)                                              |
| `:94-96`               | `UnsupportedMediaTypeException` | 415    | `'Unsupported file type: upload a PDF, PNG, JPEG or plain text file'` (string) |
| `:102`, `:132`, `:152` | `NotFoundException`             | 404    | `MEETING_NOT_FOUND_MESSAGE` (`'Meeting not found'`)                            |
| `:110`                 | `BadRequestException`           | 400    | `['a meeting may hold at most 10 files']` (array)                              |
| `:158`                 | `NotFoundException`             | 404    | `FILE_NOT_FOUND_MESSAGE` (`'File not found'`, `:39`)                           |

Raised outside the module's code: 413 for oversize and the string 400 for a wrong field name by `FileInterceptor` (comment `:60-62`, option `:69`); array 400 for extra text parts by the global `ValidationPipe` against `UploadFileDto` (comment `:63`); 401 by `JwtAuthGuard` (`apps/api/src/auth/jwt-auth.guard.ts:5`, `UnauthorizedException`). The check order is documented at `:55-67` and matches `:79-111`.

### 404-over-403

- Ownership lives in `MeetingsService.findById`: `row && row.ownerId === ownerId ? toDomainMeeting(row) : undefined` (`apps/api/src/meetings/meetings.service.ts:80-83`), comment `:71-79` cites `ADR-0018`.
- The controller turns `undefined` into `NotFoundException(MEETING_NOT_FOUND_MESSAGE)` in all three routes (`:99-103`, `:129-133`, `:149-153`). No 403 is thrown anywhere in the module (grep `Forbidden` in `M/`: none).
- A file of another meeting: `row && row.meetingId === meetingId ? ... : undefined` (`M/meeting-files.service.ts:64-67`) then `File not found` (`controller:155-159`).
- On upload, ownership (`:99`) precedes the count (`:105`); the comment says this is so the cap cannot probe a meeting's existence (`:64-66`, `MF-API-16`). Filename and content-type checks (`:85-97`) precede ownership.
- `ownerId` comes from `@CurrentUser() current` (`:71`, `:126`, `:144`) as `current.id`.

## 3. Nest DI wiring

- `PrismaService` is `@Injectable()`, `extends PrismaClient`, no-arg constructor calling `loadDatabaseConfig()` (`apps/api/src/prisma/prisma.service.ts:15-22`).
- `PrismaModule`: `providers: [PrismaService], exports: [PrismaService]` (`apps/api/src/prisma/prisma.module.ts`); no `@Global()` anywhere (grep `Global()` in `apps/api/src`, `test`: no hits).
- `AppModule` imports `[PrismaModule, AuthModule, MeetingsModule, MeetingFilesModule]` (`apps/api/src/app.module.ts:12`).
- `MeetingFilesModule`: `imports: [AuthModule, PrismaModule, MeetingsModule]`, `controllers: [MeetingFilesController]`, `providers: [MeetingFilesService]`, no `exports` (`M/meeting-files.module.ts:14-18`). `MeetingFilesService` takes `private readonly prisma: PrismaService` by constructor type (`:15`); the controller takes `MeetingsService` and `MeetingFilesService` by constructor type (`controller:50-53`).
- `AuthModule` exports `JwtAuthGuard, TokenService` (`apps/api/src/auth/auth.module.ts:20`).
- Existing provider forms: one `{ provide: APP_PIPE, useValue: new ValidationPipe({...}) }` (`apps/api/src/app.module.ts:43-50`), with comment on invariant 3 (`:38-42`). Grep for `useFactory|useClass|@Inject(|InjectionToken|Symbol(` across `apps/api/src` and `apps/api/test`: no hits. No injection tokens exist.
- `test/app.e2e-spec.ts` boots `AppModule` via `Test.createTestingModule({ imports: [AppModule] })` (`:11-13`).
- `@nestjs/core` installed version `12.0.1` (`apps/api/node_modules/@nestjs/core/package.json`).

## 4. File upload handling

- Interceptor: `@UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE_BYTES } }))` (`controller:69`); no `storage` option, no `ParseFilePipe`, no `FileValidator` anywhere in the module (grep `ParseFilePipe|diskStorage|storage` in `M/`: none). `@types/multer` in devDependencies (`apps/api/package.json`).
- Handler params: `@UploadedFile() file: Express.Multer.File | undefined` (`:73`) and `@Body() _body: UploadFileDto` (`:77`; comment `:74-76`: only gives `ValidationPipe` a metatype).
- Validation is hand-written in the handler (`:79-97`): undefined file, `isValidFilename(file.originalname)`, `normalizeContentType(file.mimetype)`, `isAllowedContentType`.
- Bytes: `content: file.buffer` (`:118`) -> service `content: new Uint8Array(input.content)` (`service:38`) -> Prisma `MeetingFile.content Bytes` (`apps/api/prisma/schema.prisma:46`). No disk. `sizeBytes Int` stored (`:45`), `uploadedAt String` (`:47`), `meeting` relation `onDelete: Cascade` (`:49`).
- Download: reads the whole row (`service:65` `findUnique`), `Buffer.from(file.content)` (`controller:162`), `@Res({ passthrough: true }) res: Response` (`:147`), `res.set({Content-Type, Content-Length, Content-Disposition, X-Content-Type-Options: 'nosniff'})` (`:170-175`), returns `new StreamableFile(content)` (`:177`). Header comments `:164-169`.
- The list route does not select columns: `findMany({ where, orderBy })` (`service:51-54`), so `content` is read from the DB and dropped by the mapper (`mapper:9-15`).
- Status of upload: no `@HttpCode` (`docs/api-contract.md` `FACT-2087`, "Answers `201`").

## 5. ESLint for apps/api

- Flat config: `apps/api/eslint.config.mjs:1-4` = `defineConfig([...nestConfig])` from `@purpleschool/eslint-config/nest`.
- `packages/eslint-config/package.json` exports `./base`, `./next`, `./nest`; dependencies `@eslint/js, eslint-config-next, eslint-config-prettier, globals, typescript-eslint`.
- `nest.js` = `baseConfig` + `tseslint.configs.recommendedTypeChecked` + `projectService: true` + rule overrides (`no-explicit-any` off, `no-floating-promises` error, `no-unsafe-argument` warn, etc. `packages/eslint-config/nest.js:7-25`) + `disableTypeChecked` for `*.mjs/*.js/*.cjs` (`:26-30`). `base.js:17-34`: `js.configs.recommended`, `tseslint.configs.recommended`, `no-unused-vars` warn with `^_` ignore, `prettier` last.
- Import restriction today: grep for `no-restricted|restricted-paths|boundaries` over `*.js, *.mjs, *.json, *.ts` (excluding node_modules, .agents, dist, .next) found only `scripts/new-adr.mjs` (unrelated file). No rule in `base.js`, `nest.js` or `apps/api/eslint.config.mjs`.
- Installed plugins (`node_modules/.pnpm` listing): `eslint-plugin-import@2.32.0` (present; dependency chain via `eslint-config-next`, which only `next.js` imports; it is not in `apps/api/node_modules` nor `packages/eslint-config/node_modules`, whose entries are `@eslint, eslint, eslint-config-next, eslint-config-prettier, globals, typescript-eslint`), `eslint-plugin-react`, `-react-hooks`, `-jsx-a11y`, `-playwright`, `@next/eslint-plugin-next`. `eslint-plugin-import-x` and `eslint-plugin-boundaries`: not installed (`.pnpm` listing grep). `no-restricted-imports` is a core rule, available via `js.configs.recommended`'s ESLint core.
- ESLint core version in the pnpm store: `eslint@9.39.5`.
- `apps/api/package.json` script `lint`: `pnpm prisma:generate && eslint .` (type-aware: files not in tsconfig fail to parse, see P1).

## 6. Decorator metadata and Vitest

- `packages/tsconfig/nestjs.json`: `"emitDecoratorMetadata": true`, `"experimentalDecorators": true`, `module/moduleResolution: nodenext`; base has `isolatedModules: true`, `target: ES2023` (`packages/tsconfig/base.json`).
- `apps/api/tsconfig.json`: extends it, `types: ["vitest/globals","node","multer"]`, include `src/**/*, test/**/*, prisma/**/*, *.ts`. `tsconfig.build.json`: `rootDir ./src`, excludes `**/*spec.ts`, `test`.
- `apps/api/vitest.config.ts:1-15`: `resolve: { tsconfigPaths: true }`, `globals: true`, `root: './'`, `include: ['**/*.spec.ts']`. No `swc`/`unplugin` anywhere (grep in `apps/api/package.json`, root `package.json`, `pnpm-workspace.yaml`: no hits). `vitest.config.e2e.ts`: `include: ['**/*.e2e-spec.ts']`.
- `reflect-metadata` is a dependency (`apps/api/package.json`); grep `reflect-metadata` in `apps/api/src`, `test`, `vitest*.ts`: no import. `test/app.e2e-spec.ts` imports `@nestjs/testing` and does not import `reflect-metadata` (`:1-7`).
- Two specs build decorated Nest classes through DI under Vitest: `apps/api/src/app.controller.spec.ts:9-14` (`Test.createTestingModule({ controllers: [AppController], providers: [AppService] })`, then `app.get(AppController)`; `AppController` takes `AppService` by constructor type, `apps/api/src/app.controller.ts:6`; `AppService` is `@Injectable()`, `app.service.ts:3`) and `apps/api/test/app.e2e-spec.ts:13-18` (`imports: [AppModule]`, `createNestApplication()`, `init()`). The first is collected by `vitest.config.ts` `include: ['**/*.spec.ts']` (`pnpm test`); the second by `vitest.config.e2e.ts`, run as `test:e2e` (`apps/api/package.json:22`) inside root `pnpm verify` (`package.json:37`). Their run results were not observed in this pass (no suite runs).
- Other specs construct things by hand with `vi` mocks and type-only imports of collaborators (`apps/api/src/auth/auth.service.spec.ts:1-9`). Full unit-spec listing under `apps/api/src` (`find src -name "*.spec.ts"`, 8 files): `app.controller.spec.ts`, `auth/auth.service.spec.ts`, `auth/jwt-auth.guard.spec.ts`, `auth/token.service.spec.ts`, `common/crypto/password.spec.ts` (pure functions, `AL-UT-09…11`, `:3-8`), `config/seed-guard.spec.ts`, `meeting-files/meeting-files.rules.spec.ts`, `users/users.service.spec.ts` (imports the pure `normalizeEmail`/`toPublicUser`, not `UsersService`, `:3-4`; comment `:8-12`).
- `build`: `pnpm prisma:generate && nest build` with `nest-cli.json` `deleteOutDir: true`.

## Probes (`probes.md` not written; deciding output lines)

- **P1** (core `no-restricted-imports` under apps/api config). Via `--stdin --stdin-filename src/meeting-files/domain/x.ts`: `Parsing error: ... was not found by the project service` (identical with and without `--rule`), so stdin cannot decide it with the type-aware config. With a real temp file `apps/api/src/meeting-files/domain/x.ts` (dir created, then `rm -rf`'d; `ls src/meeting-files` afterwards shows the original nine entries, `git status` shows only the untracked `docs/plans/clean-architecture-pilot/`): `npx eslint src/meeting-files/domain/x.ts --rule '{"no-restricted-imports":["error",{"patterns":["@nestjs/*"]}]}'` -> `1:1  error  '@nestjs/common' import is restricted from being used by a pattern  no-restricted-imports`; same file without `--rule` -> exit 0, no output. A relative import `'../../prisma/prisma.service.js'` with `patterns:["**/prisma/**"]` -> `error '../../prisma/prisma.service.js' import is restricted ... no-restricted-imports`.
- **P2** `@nestjs/core` 12.0.1: `apps/api/node_modules/@nestjs/core/injector/injector.js:126` `const isFactoryProvider = !isNil(inject);`, `:444-445` `const factoryReturnValue = targetMetatype.metatype(...instances); instanceHost.instance = await factoryReturnValue;`. Script (scratchpad `p2.mjs`, copied to `apps/api/.p2-probe.mjs`, deleted; `ls -a` showed no leftover) with `{provide: TOKEN, useFactory: d => new Plain(d), inject: [DEP]}` and an undecorated `class Plain` -> `isPlain true dep dep-value`.
- **P3** a temp `apps/api/src/meeting-files/domain/z.ts` (arrow function, no decorators, no `reflect-metadata`) and `z.spec.ts` under `vitest run src/meeting-files/domain/z.spec.ts` -> `Test Files  1 passed (1)`, `Tests  1 passed (1)`; both deleted with the folder (above).

## Not found

- **Not found:** an existing test of the meeting-files controller or service under Vitest (an HTTP-level or Nest `Test.createTestingModule` unit for meeting-files) — searched `apps/api/src/**/*.spec.ts` listing and `apps/api/test/` (only `app.e2e-spec.ts`, which boots `AppModule`). `Test.createTestingModule` is used elsewhere: `app.controller.spec.ts:9`, `test/app.e2e-spec.ts:13` (section 6).
- **Not found:** any importer of `FILE_NOT_FOUND_MESSAGE`, `MeetingFilesService`, `MeetingFilesController`, `toMeetingFileDto` or the `meeting-file.types.js` module outside `M/` — grep over `apps`, `e2e`, `scripts` (`*.ts, *.tsx, *.mjs`).
- **Not found:** an import restriction, `no-restricted-paths` or boundaries rule of any kind in the repository — grep above; `eslint-plugin-import-x` / `eslint-plugin-boundaries` not in `node_modules/.pnpm`.
- **Not found:** an existing meta-test that scans `apps/api/src` imports — searched `e2e/architecture/`, `e2e/process/`, `e2e/suite-integrity.api.spec.ts` by grep for `no-restricted|import` was not run beyond the filename list; only the `e2e/architecture/architecture.api.spec.ts` role is stated in `CLAUDE.md` (routes table, `PROTECTED_ROUTES`, ADR log).
- **Not found:** the corpus fact keys for the module's controller-level decisions beyond those cited in comments (`FACT-3626`, `3627`, `3628`, `3631`, `3642`, `3647`, `3650`) — their text was not opened in `docs/data-model.md`/`docs/architecture.md` in this sweep.
- **Not found:** an observed run result showing `emitDecoratorMetadata` honoured by Vitest's transformer — two specs do resolve constructor-typed injection through Nest DI under Vitest (`app.controller.spec.ts:9-14`, `test/app.e2e-spec.ts:13-18`, section 6), but no suite was run in this pass. No such spec exists for a meeting-files class.
- **Not found:** an `@Inject(` or token precedent — grep (section 3).
- **Not found:** who else reads `UploadFileDto`'s `forbidUnknownValues` behaviour — `validation.pipe.js:36` cited at `M/dto/upload-file.dto.ts:6` was not opened in `node_modules` in this sweep.
