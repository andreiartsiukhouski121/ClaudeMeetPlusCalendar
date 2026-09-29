# Code sweep: meetings-detail-participants

Scope as assigned: `apps/api/src/meetings/**`, every web consumer of the meetings API, wiring in
`app.module.ts`, and two precedent searches across the whole of `apps/api/src` (`:id`/`NotFoundException`,
array-valued fields). This sweep does not touch `docs/api-contract.md` or `docs/data-model.md` —
those are a separate research area (`contract.md`) and are named here only where a grep happened to
surface their file path, not cited as evidence.

The sweep converged after 15 files: the 8 files of `apps/api/src/meetings/`, `apps/api/src/app.module.ts`,
and 6 files under `apps/web/src` (`lib/types.ts`, `lib/dal.ts`, `lib/api-client.ts`,
`lib/actions/meetings.ts`, `app/page.tsx`, `components/meeting-list.tsx`,
`components/create-meeting-form.tsx`, `lib/format-date.ts` — 8 web files), plus two repo-wide greps
that returned no further files to read.

## 1. `apps/api/src/meetings/**`

### Controller — `apps/api/src/meetings/meetings.controller.ts`

- Class-level guard and route prefix: `@Controller('meetings')` / `@UseGuards(JwtAuthGuard)` —
  `apps/api/src/meetings/meetings.controller.ts:20-21`.
- `GET /meetings`: `@Get()` at `meetings.controller.ts:25`, handler `list()` at
  `meetings.controller.ts:26-35`. Returns `MeetingsPageDto` built as
  `{ items: this.meetingsService.findRecent(current.id, query.limit).map(toMeetingDto), total: this.meetingsService.countByOwner(current.id) }`
  (`meetings.controller.ts:30-34`). No explicit `@HttpCode` — Nest's GET default (200) applies.
- `POST /meetings`: `@Post()` at `meetings.controller.ts:38`, handler `create()` at
  `meetings.controller.ts:39-40`. Comment: "No `@HttpCode` here: POST's default 201 is the correct
  answer (`HD-API-13`)." — `meetings.controller.ts:37`.
- Only two route methods exist on this controller. No third handler, no `@Param`.
- `ownerId` source: `@CurrentUser() current: AuthenticatedUser` on both handlers
  (`meetings.controller.ts:27`, `:39`); comment: "Invariant 5: `ownerId` always comes from
  `@CurrentUser()` — the signed token — and never from the body or the query."
  (`meetings.controller.ts:17-18`).

### DTOs

`apps/api/src/meetings/dto/create-meeting.dto.ts`:

- `title: string` — `@IsString() @Length(3, 100)` (`create-meeting.dto.ts:16-18`).
- `startsAt: string` — `@IsISO8601()` (`create-meeting.dto.ts:21-22`). Comment: "The web layer
  normalizes the `<input type="datetime-local">` value itself." (`create-meeting.dto.ts:20`).
- `durationMinutes?: number` — `@IsOptional() @Type(() => Number) @IsInt() @Min(15) @Max(480)`
  (`create-meeting.dto.ts:24-29`).
- No `ownerId` field; comment states this is deliberate, relying on `forbidNonWhitelisted`
  (`create-meeting.dto.ts:6-9`).
- No `participants` field anywhere in this DTO.

`apps/api/src/meetings/dto/list-meetings-query.dto.ts`:

- Single field `limit?: number` — `@IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)`
  (`list-meetings-query.dto.ts:20-25`). Default of 3 is supplied by the service, not the DTO
  (`list-meetings-query.dto.ts:15-17`).

### Internal entity vs. outward DTO — `apps/api/src/meetings/meeting.types.ts`

- `Meeting` (internal): `{ id: string; ownerId: string; title: string; startsAt: string; durationMinutes: number }`
  (`meeting.types.ts:5-11`). `startsAt` documented as "an ISO 8601 string in UTC (`…Z`)"
  (`meeting.types.ts:2-3`).
- `MeetingDto` (outward): `export type MeetingDto = Omit<Meeting, 'ownerId'>;` (`meeting.types.ts:17`),
  i.e. `{ id, title, startsAt, durationMinutes }`. Comment: "`toMeetingDto` strips `ownerId` —
  ownership is never exposed" (`meeting.types.ts:14-15`).
- `MeetingsPageDto`: `{ items: MeetingDto[]; total: number }` (`meeting.types.ts:20-27`).
- `CreateMeetingInput` (service input): `{ title: string; startsAt: string; durationMinutes?: number }`
  (`meeting.types.ts:34-38`) — no `ownerId` field, comment: "invariant 5 takes the owner from the
  token (`@CurrentUser()`), never from the request body" (`meeting.types.ts:30-32`).
- No `participants` field on `Meeting`, `MeetingDto`, `MeetingsPageDto`, or `CreateMeetingInput`.
- No array-typed field anywhere in this file.

### Mapper — `apps/api/src/meetings/meetings.mapper.ts`

```
export function toMeetingDto(meeting: Meeting): MeetingDto {
  return {
    id: meeting.id,
    title: meeting.title,
    startsAt: meeting.startsAt,
    durationMinutes: meeting.durationMinutes,
  };
}
```

(`meetings.mapper.ts:11-18`). Fields are listed explicitly (not via rest-destructuring); comment:
"a new internal field on `Meeting` cannot leak on its own; `HD-API-01` checks the resulting key set"
(`meetings.mapper.ts:4-6`). This mapper strips `ownerId` and returns exactly the four listed fields
— nothing else on `Meeting` currently exists to strip or pass through. No separate spec file exists
for the mapper by design (`meetings.mapper.ts:8-9`).

### Seed — `apps/api/src/meetings/meetings.seed.ts`

`SEED_MEETINGS: readonly Meeting[]` — 7 entries (`meetings.seed.ts:16-66`):

| id                | ownerId         | title                  | startsAt                   | durationMinutes |
| ----------------- | --------------- | ---------------------- | -------------------------- | --------------- |
| `mtg-teacher-1`   | `usr-teacher`   | Intro to algebra       | `2026-01-12T09:00:00.000Z` | 60              |
| `mtg-teacher-2`   | `usr-teacher`   | Homework review        | `2026-01-13T11:30:00.000Z` | 45              |
| `mtg-teacher-3`   | `usr-teacher`   | Geometry workshop      | `2026-01-15T14:00:00.000Z` | 90              |
| `mtg-teacher-4`   | `usr-teacher`   | Pre-exam consultation  | `2026-01-19T08:00:00.000Z` | 30              |
| `mtg-teacher-5`   | `usr-teacher`   | Module wrap-up session | `2026-01-22T16:15:00.000Z` | 60              |
| `mtg-planner-1`   | `usr-planner`   | Sprint retro           | `2026-01-16T13:00:00.000Z` | 45              |
| `mtg-organizer-1` | `usr-organizer` | Team standup           | `2026-01-14T10:00:00.000Z` | 30              |

No `usr-student` meetings exist (comment documents this as "the empty-state edge case",
`meetings.seed.ts:12`). No entry carries a `participants` field — the type `Meeting` used to type
this array has none. Comment: "`e2e/fixtures/seed.ts` mirrors these values (`TEACHER_MEETINGS`);
any drift is caught by SM-API-03." (`meetings.seed.ts:4-5`).

### Service — `apps/api/src/meetings/meetings.service.ts`

- Storage: `private readonly meetingsById = new Map<string, Meeting>();` (`meetings.service.ts:35`),
  populated from `SEED_MEETINGS` in the constructor (`meetings.service.ts:37-41`). In-memory only —
  comment: "no database; the seed is applied in the constructor." (`meetings.service.ts:28`). Also:
  "`nest start --watch` restarts on every edit and wipes everything the tests created"
  (`meetings.service.ts:30-31`).
- `findRecent(ownerId, limit = DEFAULT_MEETINGS_LIMIT)`: `this.byOwner(ownerId).sort(compareByStartsAtDesc).slice(0, limit)`
  (`meetings.service.ts:47-49`). `DEFAULT_MEETINGS_LIMIT = 3` (`meetings.service.ts:8`).
- `countByOwner(ownerId)`: `this.byOwner(ownerId).length` (`meetings.service.ts:56-58`) — the full
  count, not the sliced list's length; comment cites invariant 4 (`meetings.service.ts:52-55`).
- `create(ownerId, input)`: builds a new `Meeting` with `id: randomUUID()`, the passed `ownerId`,
  `title: input.title`, `startsAt: new Date(input.startsAt).toISOString()`,
  `durationMinutes: input.durationMinutes ?? DEFAULT_DURATION_MINUTES` (`meetings.service.ts:68-75`,
  `DEFAULT_DURATION_MINUTES = 60` at `meetings.service.ts:11`), then `this.meetingsById.set(meeting.id, meeting)`
  (`meetings.service.ts:77`).
- `byOwner(ownerId)` (private): `[...this.meetingsById.values()].filter((meeting) => meeting.ownerId === ownerId).map((meeting) => ({ ...meeting }))`
  (`meetings.service.ts:83-87`) — returns copies, not references (comment at `meetings.service.ts:82`).
- Sorting comparator `compareByStartsAtDesc`: `Date.parse(right.startsAt) - Date.parse(left.startsAt)`,
  falling back to `left.id.localeCompare(right.id)` on a tie (`meetings.service.ts:21-25`). Comment:
  "Invariant 7: `startsAt` DESC, with `id` ascending as the secondary key." (`meetings.service.ts:14`).
  Milliseconds are compared rather than strings, "a client may send an ISO date with an offset
  (`+03:00`)" (`meetings.service.ts:18-19`).
- No method on `MeetingsService` looks up a single meeting by its own id (`findById`, `getById`,
  `find`, or similar) — only `findRecent`, `countByOwner`, `create`, and the private `byOwner` exist
  in the class (`meetings.service.ts:33-88`, full file read).
- `ownerId` throughout the service is a caller-supplied string argument, never read from `input`
  (`CreateMeetingInput` has no `ownerId` field per `meeting.types.ts:34-38`).

### Module — `apps/api/src/meetings/meetings.module.ts`

```
@Module({
  imports: [AuthModule],
  controllers: [MeetingsController],
  providers: [MeetingsService],
  exports: [MeetingsService],
})
export class MeetingsModule {}
```

(`meetings.module.ts:11-16`). `AuthModule` is imported "for `JwtAuthGuard`: the guard is attached by
decorator on the controller, so its provider must be visible in this module."
(`meetings.module.ts:8-9`).

## 2. `apps/api/src/app.module.ts` wiring

```
@Module({
  imports: [AuthModule, MeetingsModule],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_PIPE, useValue: new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }) },
  ],
})
export class AppModule {}
```

(`apps/api/src/app.module.ts:9-29`). `MeetingsModule` is imported directly alongside `AuthModule`;
no other meetings-related module exists to wire.

### `ValidationPipe` registration (question 6)

Registered as an `APP_PIPE` provider inside `AppModule`, not via `app.useGlobalPipes` in `main.ts`
— `apps/api/src/app.module.ts:19-26`:

```
{
  provide: APP_PIPE,
  useValue: new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
},
```

Comment: "otherwise test modules boot the app without validation and the 400 checks disagree with
the server." (`app.module.ts:16-18`). No other `ValidationPipe` instantiation exists in
`apps/api/src` (grep for `ValidationPipe` returned only this file and the doc comment referencing
it in `meetings.controller.ts`/DTO comments, which do not instantiate it).

## 3. Every consumer of the meetings API in `apps/web`

Files found via `grep -rli meeting apps/web/src`: `app/layout.tsx`, `app/page.tsx`,
`components/create-meeting-form.tsx`, `components/meeting-list.tsx`, `lib/actions/meetings.ts`,
`lib/dal.ts`, `lib/format-date.spec.ts`, `lib/format-date.ts`, `lib/types.ts`. (`layout.tsx` matched
only on an unrelated string not examined further, since it carries no meeting-shaped data per the
grep hit context — not opened, listed here for completeness of the search.)

### Types — `apps/web/src/lib/types.ts`

```
export interface Meeting {
  id: string;
  title: string;
  /** ISO 8601 UTC — exactly what Nest sent, with no local conversion. */
  startsAt: string;
  durationMinutes: number;
}

export interface MeetingsPage {
  items: Meeting[];
  total: number;
}
```

(`apps/web/src/lib/types.ts:15-27`) — mirrors `MeetingDto`/`MeetingsPageDto` field-for-field
(`id`, `title`, `startsAt`, `durationMinutes`; `items`, `total`). No `participants` field. This is
the type a new field would have to be added to for the web side to read it.
`CreateMeetingFormState` (`types.ts:38-40`) has only `error?: string` — no id/participants surface
here either.

### DAL — `apps/web/src/lib/dal.ts`

- `getCurrentUser()` (`dal.ts:40-62`): fetches `/auth/me`, unrelated to meetings.
- `getMeetings(limit = DEFAULT_MEETINGS_LIMIT)` (`dal.ts:71-90`): calls
  `apiFetch<MeetingsPage>(\`/meetings?limit=${String(limit)}\`, { token })` (`dal.ts:77`) and returns
the whole `MeetingsPage`. On any non-401 failure it rethrows; on missing token or 401 it redirects
to `/auth/session-expired` (`dal.ts:78-87`).
- No function in this file requests a single meeting by id — `getMeetings` is the only meetings-data
  function in `dal.ts` (full file read, `dal.ts:1-90`).
- `import 'server-only'` at `dal.ts:1` — per invariant 14 this file has no Vitest unit coverage.

### API client — `apps/web/src/lib/api-client.ts`

- `ApiFetchOptions.method` is typed `'GET' | 'POST'` only (`api-client.ts:82`). No `'DELETE'`,
  `'PATCH'`, or `'PUT'` literal exists in this union.
- `resolveApiUrl(path, base?)` builds the absolute Nest URL from `process.env.API_URL` or
  `DEFAULT_API_BASE_URL = 'http://127.0.0.1:3001'` (`api-client.ts:12`, `:22-30`) — takes any path
  string, so a path like `/meetings/${id}` would be constructible, but nothing in this file
  constructs one today.
- `apiFetch<T>` throws `ApiError` on any non-2xx (`api-client.ts:108-113`); `ApiError` carries
  `status` and a normalized `message` (`api-client.ts:41-77`), with no special handling for 404
  anywhere in this file.

### Server Action — `apps/web/src/lib/actions/meetings.ts`

- `createMeetingAction(_prevState, formData)` (`meetings.ts:23-78`) is the only exported function in
  this `'use server'` file (invariant 13 compliance — only async functions exported).
- Reads `title` and `startsAt` from `FormData` (`meetings.ts:33-34`); there is no third field read
  from the form (no `participants`, no array parsing of `FormData` in this file).
- POSTs `{ title, startsAt }` to `/meetings` (`meetings.ts:48-52`) — `durationMinutes` is
  deliberately omitted so Nest applies its default (`meetings.ts:46-47` comment).
- Error mapping: 401 → redirect to `/auth/session-expired` (`meetings.ts:61-63`); 400 → `'Check the
title (3 to 100 characters) and the meeting date'` (`meetings.ts:65-69`); other `ApiError` →
  generic retry message; non-`ApiError` → rethrown to the error boundary (`meetings.ts:53-59`).
- On success: `revalidatePath('/')` then returns `{}` (`meetings.ts:76-78`) — no redirect to a detail
  page, no meeting id used after creation.

### Dashboard page — `apps/web/src/app/page.tsx`

- `HomePage()` calls `getCurrentUser()` and `getMeetings()` (`page.tsx:28-29`), destructures
  `{ items, total }`, and renders `<MeetingList meetings={items} />` and `<CreateMeetingForm />`
  (`page.tsx:38-43`). No dynamic route segment, no `[id]` folder under `apps/web/src/app` was found
  in this sweep (see "Not found" below).

### `apps/web/src/components/meeting-list.tsx`

- `MeetingList({ meetings }: { meetings: Meeting[] })` (`meeting-list.tsx:16`) renders per meeting:
  `meeting.title` and `formatMeetingDateTime(meeting.startsAt)} · {meeting.durationMinutes} min`
  (`meeting-list.tsx:27-30`). Only `id` (as React `key`, `meeting-list.tsx:26`), `title`, `startsAt`,
  `durationMinutes` are read — no other field of `Meeting` is consumed. This is a Server Component
  (no `'use client'`) — comment at `meeting-list.tsx:7`. No link/anchor to a detail view exists in
  this component (no `<a>`/`<Link>` present in the file).

### `apps/web/src/components/create-meeting-form.tsx`

- Client component (`'use client'`, line 1) with two fields only: `title` (`type="text"`,
  `create-meeting-form.tsx:36`) and `startsAt` (`type="datetime-local"`, `create-meeting-form.tsx:43-49`).
  No field for participants in this form. Both inputs carry no `required`/`min`/`max` attributes
  (invariant 15 compliance, comment `create-meeting-form.tsx:20-22`).

### `apps/web/src/lib/format-date.ts`

- `formatMeetingDateTime(iso: string): string` (`format-date.ts:37-45`) and
  `toIsoStartsAt(raw: string): string | null` (`format-date.ts:61-71`) — both operate on the single
  `startsAt` field; neither references a field literally named `date`.
- `timeZone: 'UTC'` is pinned inside `formatter()` (`format-date.ts:27`) — matches the project
  invariant on date display.
- `toIsoStartsAt` appends `Z` to a bare `datetime-local` value before parsing
  (`format-date.ts:55-69`) so the value it produces matches `@IsISO8601()` on the create DTO.

## 4. Precedent for `:id` and 404 — whole of `apps/api/src`

- `grep -rn ":id\|@Param\|NotFoundException" apps/api/src` returned **no matches**.
- Every `@Controller`/route-method pair in `apps/api/src` (grep for `@Get|@Post|@Put|@Patch|@Delete`):
  - `apps/api/src/app.controller.ts:8` — `@Get()` (root health/greeting route, no param).
  - `apps/api/src/auth/auth.controller.ts:31` — `@Post('login')`.
  - `apps/api/src/auth/auth.controller.ts:37` — `@Get('me')`.
  - `apps/api/src/meetings/meetings.controller.ts:25` — `@Get()`.
  - `apps/api/src/meetings/meetings.controller.ts:38` — `@Post()`.
- None of these five routes carries a route parameter. No `@Param()` decorator is imported or used
  anywhere in `apps/api/src`.
- `NotFoundException` does not appear anywhere in `apps/api/src` (grep matched nothing under that
  term either as an import or a throw).
- **Not found:** any existing Nest route with a `:id`-style parameter, or any existing use of
  `NotFoundException`, anywhere in `apps/api/src` — searched with
  `grep -rn ":id\|@Param\|NotFoundException" apps/api/src` (no matches) and confirmed by reading
  every controller file directly.

## 5. Precedent for arrays — whole of `apps/api/src`

- `grep -rn "IsArray|each: true|: string\[\]|Array<" apps/api/src` returned exactly one match:
  `apps/api/src/auth/auth.service.spec.ts:48: const verifiedHashes: string[] = [];` — a local test
  variable inside `AuthService`'s spec file, unrelated to any DTO or entity field.
- No DTO class anywhere under `apps/api/src` imports or uses `@IsArray()` (confirmed by the same
  grep against `apps/api/src` returning only the one unrelated hit above).
- No entity/type interface anywhere under `apps/api/src` declares an array-typed property (same
  grep, same result).
- **Not found:** any existing array-valued DTO field, or any existing use of `@IsArray()`/`each: true`,
  anywhere in `apps/api/src` — searched with
  `grep -rn "IsArray\|each: true\|: string\[\]\|Array<" apps/api/src`, one incidental match in a
  spec file's local variable, no DTO/entity usage.

## 6. `startsAt` vs. a field literally named `date`

- `startsAt` is the field name throughout the API: `Meeting.startsAt` (`meeting.types.ts:9`),
  `MeetingDto` inherits it via `Omit<Meeting, 'ownerId'>` (`meeting.types.ts:17`),
  `CreateMeetingDto.startsAt` (`create-meeting.dto.ts:22`), `CreateMeetingInput.startsAt`
  (`meeting.types.ts:36`), seed entries' `startsAt` (`meetings.seed.ts`, all 7 entries), and the
  service's `compareByStartsAtDesc` / `create()` (`meetings.service.ts:21-25`, `:73`).
- On the web side: `Meeting.startsAt` (`apps/web/src/lib/types.ts:19`), the form field `name="startsAt"`
  (`create-meeting-form.tsx:46`), `formatMeetingDateTime(meeting.startsAt)`
  (`meeting-list.tsx:29`), `toIsoStartsAt` (`format-date.ts:61`), and the action's local
  `const startsAt = toIsoStartsAt(...)` (`actions/meetings.ts:34`).
- No property, DTO field, form field, function parameter, or variable literally named `date` (as
  opposed to `startsAt`, `dateStyle`, `DateTimeFormat`, `Date.parse`, `new Date`, `updated`,
  `validate`) was found in `apps/api/src` or `apps/web/src` — confirmed by
  `grep -rn "\bdate\b" apps/api/src apps/web/src --include="*.ts" --include="*.tsx" -i` and
  manually excluding the unrelated matches (`dateStyle`, `DateTimeFormat`, `Date.parse`, `new Date`,
  `Invalid Date`, `DATETIME_LOCAL`, `validate`, `update`) — the remaining hits are all either the
  word "Date" in a label/comment/error string ("Date and time", "meeting date", a code comment) or
  the identifier `startsAt` itself, never a field or variable named `date`.

## Not found

- **Not found:** a `participants` field anywhere in `apps/api` or `apps/web` — searched
  `grep -rn "participants" apps/api apps/web` (no matches; the only hits repo-wide were the three
  files of this very change folder, `docs/plans/meetings-detail-participants/*`, which are not code).
- **Not found:** any method on `MeetingsService` or any route on `MeetingsController` that returns a
  single meeting by id — searched the full text of `meetings.service.ts` and
  `meetings.controller.ts` (both read in full above); only `findRecent`, `countByOwner`, `create`
  exist on the service and only `list`/`create` on the controller.
- **Not found:** a dynamic route segment (e.g. `app/meetings/[id]/`) under `apps/web/src/app` —
  searched by listing `apps/web/src` consumers of "meeting" (`grep -rli meeting apps/web/src`, 9
  files, all read or accounted for above); none is a route file under a `[id]` segment, and
  `app/page.tsx` is the only page rendering meeting data.
- **Not found:** any `'DELETE' | 'PATCH' | 'PUT'` method literal in `ApiFetchOptions` in
  `apps/web/src/lib/api-client.ts` — the type at `api-client.ts:82` reads `method?: 'GET' | 'POST';`
  only.
