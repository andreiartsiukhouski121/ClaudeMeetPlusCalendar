# Research — code sweep (`FEAT-S1`)

Change: `design-language-rollout`. Scope of this sweep: `apps/web` plus the files outside it that
the web surfaces read (`apps/api` DTO shape, the Playwright specs that address the markup).
Raw probe code and full outputs: [`probes.md`](probes.md).

**The sweep converged after 36 files.** Read in full: the **ten** files named in question 1 — the
`###` subsections from `layout.tsx` to `logout-button.tsx`; the eleventh subsection of Q1 is the
`className` inventory, which is a grep over those ten and not a file — plus
`src/proxy.ts`, `src/lib/{types,dal,api-client,session,session-cookie,format-date}.ts`,
`src/lib/actions/{auth,meetings}.ts`, `src/app/auth/session-expired/route.ts`,
`apps/web/{package.json,postcss.config.mjs,next.config.ts,tsconfig.json,vitest.config.ts,eslint.config.mjs}`,
`pnpm-workspace.yaml`, `.claude/skills/design-system/references/{tokens.css,patterns.md}`,
`apps/api/src/meetings/{meeting.types.ts,meetings.mapper.ts}`, the repository-root `package.json`
(its scripts are cited in Q5), and the four Playwright functional specs that address this markup.
Read in part: `.claude/skills/design-system/SKILL.md` — `:150-165` with `sed -n`, plus a heading
grep; the statement quoted under Open questions is `:156-158`, under the heading "Traps this
repository has actually hit" at `:146`. Following imports out of those returned no further
files under `apps/web`; the last three greps (`icon|svg|nav|aside`, `category`,
`font-geist|font-sans`) each returned either nothing or files already read.

> The count in the first sentence of this file originally read "32 files" against an enumeration of
> eleven Q1 files; both numbers were wrong. Q1 has ten file subsections, and the enumeration above
> names 36 distinct files. Corrected in place, nothing else re-derived.

---

## Q1 — every file the change would touch, as it is today

### `apps/web/src/app/layout.tsx` — 39 lines, Server Component

- Imports `Geist` and `Geist_Mono` from `next/font/google`: `layout.tsx:2`.
- `geistSans` declared with `variable: '--font-geist-sans', subsets: ['latin']` and no `weight`:
  `layout.tsx:5-8`. `geistMono` with `variable: '--font-geist-mono', subsets: ['latin']`:
  `layout.tsx:10-13`.
- `metadata` is `{ title: 'PurpleSchool', description: 'PurpleSchool meetings and lessons' }`:
  `layout.tsx:15-18`.
- Props typed `LayoutProps<'/'>` — the generated route type: `layout.tsx:29`.
- `<html lang="en" className={`light ${geistSans.variable} ${geistMono.variable}`} data-theme="light">`:
  `layout.tsx:31-35`. The in-file comment ties this to the corpus: "What it does need is the theme
  class and `data-theme` on `<html>`, and the semantic background/foreground utilities on `<body>`
  (`ADR-0023`)" — `layout.tsx:21-23`; and "The theme is fixed to light rather than following the
  system" — `layout.tsx:25-27`. `FACT-3513` is the keyed form, cited at
  `docs/adr/ADR-0023-heroui-adoption.md:45`.
- `<body className="bg-background text-foreground">{children}</body>`: `layout.tsx:36`.
- Structural elements: `html`, `body`. No `main`, no `h1`, no `nav`.
- **Neither Geist variable is read by any CSS in the repository.** The only two occurrences of the
  strings `--font-geist-sans` / `--font-geist-mono` anywhere outside `node_modules` and `.next` are
  the two declarations themselves (`layout.tsx:6`, `layout.tsx:11`) — probe 6. The compiled
  stylesheet contains zero occurrences of `font-geist` (probe 6, `grep -c` → `0`).

### `apps/web/src/app/globals.css` — 37 lines

- `@import 'tailwindcss';` then `@import '@heroui/styles';`, in that order: `globals.css:5-6`. The
  comment above: "Import order is load-bearing: Tailwind first, HeroUI after it (`ADR-0023`).
  Reversed, HeroUI's layer declarations land before the ones they override and the components render
  unstyled" — `globals.css:2-3`.
- App-shell rules, unlayered: `html { height: 100% }` (`globals.css:13-15`),
  `html, body { max-width: 100vw; overflow-x: hidden }` (`globals.css:17-21`),
  `body { min-height: 100%; display: flex; flex-direction: column }` (`globals.css:23-27`). The
  comment calls this "the full-height html/body chain the auth layout centres against"
  (`globals.css:9-11`).
- One token override today: `:root { --accent: oklch(50% 0.195 253.83); }` — `globals.css:35-37`,
  with "These rules sit outside any `@layer`, so they beat the layered defaults" at
  `globals.css:33` (one line) and the `FX-039` reference at `globals.css:32` ("the first thing / the
  accessibility suite found (`FX-039`)" spans `:31-32`, the ID itself is on `:32`).
- There is **no `@theme` or `@theme inline` block** in the file today (whole file read; the only
  at-rules are the two `@import`s at lines 5-6).

### `apps/web/src/app/page.tsx` — 52 lines, async Server Component

- No `'use client'`; `export default async function HomePage()` with no props: `page.tsx:31`. The
  comment states "An async server component with no props (no `PageProps<'/'>`, so the types do not
  depend on how fresh `next typegen` is)" — `page.tsx:13-14`.
- Data: `const user = await getCurrentUser();` (`page.tsx:32`) and
  `const { items, total } = await getMeetings();` (`page.tsx:33`), both from `@/lib/dal`
  (`page.tsx:6`).
- HeroUI imports: **none**. It imports three local components —
  `CreateMeetingForm`, `LogoutButton`, `MeetingList` (`page.tsx:3-5`).
- Structural markup: one `main` (`page.tsx:36`), one `header` (`page.tsx:37`), one `h1`
  (`page.tsx:39`), one `p` (`page.tsx:40`).
- Utilities: `main` carries `mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-10`
  (`page.tsx:36`); `header` carries `flex flex-wrap items-start justify-between gap-4`
  (`page.tsx:37`); the lockup `div` carries `flex min-w-0 flex-col gap-1` (`page.tsx:38`); the `h1`
  carries `truncate text-2xl font-semibold tracking-tight` (`page.tsx:39`); the counter `p` carries
  `text-foreground-500 text-sm` (`page.tsx:40`); the column wrapper carries
  `grid items-start gap-8 lg:grid-cols-[2fr_1fr]` (`page.tsx:46`).
- Locator constraints written into the file: "exactly ONE `h1`, carrying the user's email
  (`HD-FN-02`, `HD-FN-14`)" and "the counter as a **single text node** in exactly the
  `Meetings total: 5` format, or `getByText` in `HD-FN-03` will not match. The template literal stays
  for that reason — splitting it across elements for styling would break the locator" —
  `page.tsx:21-24`.
- The grid ratio is justified in the file: "The grid is `2fr 1fr`, not two equal halves … equal
  columns stretched the inputs well past the length of what goes in them (`ui-ux-pro-max`,
  Typography / Line Length)" — `page.tsx:28-29`.

### `apps/web/src/app/auth/layout.tsx` — 31 lines, Server Component

- No `'use client'`; props declared by hand as `{ children }: { children: ReactNode }`
  (`auth/layout.tsx:17`), with the reason at `auth/layout.tsx:6-7` ("generated route types only
  appear after `next typegen`").
- HeroUI imports: **none**. The only import is `type { ReactNode } from 'react'`
  (`auth/layout.tsx:1`).
- Structural markup: `main` (`auth/layout.tsx:19`), a wrapper `div` (`auth/layout.tsx:20`), a
  wordmark `p` (`auth/layout.tsx:21-23`), a `section` that holds `children`
  (`auth/layout.tsx:25-27`). No `h1` here — the `h1` lives in each page.
- Utilities: `main` → `flex flex-1 items-center justify-center px-4 py-12`; `div` →
  `flex w-full max-w-sm flex-col gap-6`; wordmark `p` →
  `text-foreground-500 text-center text-sm font-medium tracking-wide uppercase`; `section` →
  `bg-surface border-default-200 flex flex-col gap-6 rounded-2xl border p-8 shadow-sm`
  (`auth/layout.tsx:19`, `:20`, `:21`, `:25`).
- The `max-w-sm` choice is recorded in the file: "The card is `max-w-sm`, not `max-w-100`"
  (`auth/layout.tsx:13-15`).

### `apps/web/src/app/auth/login/page.tsx` — 28 lines, Server Component

- No `'use client'`; `export default function LoginPage()` with no props (`auth/login/page.tsx:17`).
  Comment: "A server component: the heading renders on the server and the interactive part
  (`useActionState`) lives in the client `LoginForm`" (`auth/login/page.tsx:10-11`).
- HeroUI imports: **none**. Imports `LoginForm` from `./login-form` (`auth/login/page.tsx:3`).
- `metadata.title = 'Sign in — PurpleSchool'` (`auth/login/page.tsx:5-7`).
- Markup: a fragment holding a `div` (`:20`), one `h1` "Sign in" (`:21`), a `p`
  "Meetings and lessons in one place" (`:22`), then `<LoginForm />` (`:25`).
- Utilities: `flex flex-col gap-1` (`:20`), `text-2xl font-semibold tracking-tight` (`:21`),
  `text-foreground-500 text-sm` (`:22`).
- Receives no data.

### `apps/web/src/app/auth/login/login-form.tsx` — 67 lines, `'use client'` (line 1)

- HeroUI imports: `{ Button, Input, Label, TextField } from '@heroui/react'`
  (`auth/login/login-form.tsx:3`). Also `Link from 'next/link'` (`:4`) and `useActionState`
  from React (`:5`).
- Data: `const [state, formAction, pending] = useActionState(loginAction, INITIAL_STATE);`
  (`:32`), where `INITIAL_STATE: LoginFormState = {}` (`:10`) and `LoginFormState` comes from
  `@/lib/types` (`:8`). `loginAction` from `@/lib/actions/auth` (`:7`).
- Structural markup: native `<form action={formAction} className="flex w-full flex-col gap-4" noValidate>`
  (`:35`); two `TextField`/`Label`/`Input` triples (`:36-39`, `:41-44`); a conditional
  `<p className="text-danger text-sm" role="alert">` (`:46-50`); `<Button type="submit" isPending={pending} fullWidth>Sign in</Button>`
  (`:52-54`); a `p` with a `Link` to `/auth/register` named "Sign up" (`:56-64`).
- Utilities: `flex w-full flex-col gap-4` (`:35`), `text-danger text-sm` (`:47`),
  `text-foreground-500 text-center text-sm` (`:56`),
  `text-accent font-medium underline-offset-4 hover:underline` (`:60`).
- The file states which markup is locked: "real label/input wiring, an error container with
  `role="alert"`, a button named exactly "Sign in" and a link named "Sign up"" (`:17-19`); and
  "**The form element stays native** (`ADR-0023`)" (`:21-23`).

### `apps/web/src/app/auth/register/page.tsx` — 30 lines, Server Component

- No `'use client'`; `export default function RegisterPage()` (`auth/register/page.tsx:14`).
- HeroUI imports: **none**. Imports `Link from 'next/link'` (`:2`).
- Markup: a fragment with a `div` (`:17`), one `h1` "Sign up" (`:18`), a `p`
  "Sign-up is coming later" (`:19`), and a `Link` to `/auth/login` named "Back to sign in"
  (`:22-27`). The link is a bare `Link`, not a HeroUI `Button`.
- Utilities: `flex flex-col gap-1` (`:17`), `text-2xl font-semibold tracking-tight` (`:18`),
  `text-foreground-500 text-sm` (`:19`),
  `text-accent text-sm font-medium underline-offset-4 hover:underline` (`:24`).
- The file states the page exists only to satisfy a case: "a link into a 404 cannot be checked
  functionally (`AL-FN-06` expects 200 and an `h1`)" (`:10-11`), and "There is no sign-up form, no
  `POST /auth/register` and no user creation in this project" (`:12`).
- Receives no data.

### `apps/web/src/components/meeting-list.tsx` — 61 lines, Server Component

- No `'use client'`; the file says so: "A **server** component: no state, no handlers, so no
  `'use client'`" (`meeting-list.tsx:7`).
- HeroUI imports: `{ Card, Chip } from '@heroui/react'` (`:1`).
- Data: `{ meetings }: { meetings: Meeting[] }` (`:28`), `Meeting` from `@/lib/types` (`:4`); dates
  go through `formatMeetingDateTime` from `@/lib/format-date` (`:3`, used at `:46`).
- Structural markup: `section` (`:30`), `h2` "Recent meetings" (`:31`), an empty-state `p`
  (`:34-36`), `ul` with `aria-label="Recent meetings"` (`:38`), `li` keyed on `meeting.id` (`:40`),
  `Card.Root` (`:41`), `Card.Content` (`:42`), a `div` holding two `span`s (`:43-48`), and
  `Chip.Root`/`Chip.Label` rendering `{meeting.durationMinutes} min` (`:50-52`).
- Utilities: `flex flex-col gap-4` (`:30`), `text-base font-semibold tracking-tight` (`:31`),
  `border-default-200 text-foreground-500 rounded-xl border border-dashed px-4 py-8 text-center text-sm`
  (`:34`), `flex flex-col gap-3` (`:38`), `px-4 py-3` (`:41`),
  `flex flex-row items-center justify-between gap-4 p-0` (`:42`), `flex min-w-0 flex-col gap-1`
  (`:43`), `truncate font-medium` (`:44`), `text-foreground-500 text-sm` (`:45`), `shrink-0` (`:50`).
- Locked markup, stated in the file: "`ul`/`li` rather than a pile of `div`s — `getByRole('list')`
  plus `getByRole('listitem')` in `HD-FN-04`, `HD-FN-05`, `HD-FN-14`"; "`aria-label="Recent meetings"`
  gives the list an accessible name"; "the empty state is explicit text (`HD-FN-09`), not an empty
  `ul`" (`:10-14`). And: "`flex-row` is explicit on `Card.Content`: HeroUI's own `card__content`
  class sets `flex-direction: column`" (`:23-26`).
- `meeting.participants` is in the type (`lib/types.ts:21`) and is **not rendered** anywhere in this
  file (whole file read; the only `meeting.` accesses are `.id` `:40`, `.title` `:44`, `.startsAt`
  `:46`, `.durationMinutes` `:51`).

### `apps/web/src/components/create-meeting-form.tsx` — 65 lines, `'use client'` (line 1)

- HeroUI imports: `{ Button, Card, Input, Label, TextField } from '@heroui/react'` (`:3`).
- Data: `useActionState(createMeetingAction, INITIAL_STATE)` (`:32`), `INITIAL_STATE:
CreateMeetingFormState = {}` (`:9`), action from `@/lib/actions/meetings` (`:6`). No props.
- Structural markup: `section` (`:35`), `h2` "New meeting" (`:36`), `Card.Root` (`:38`),
  `Card.Content` (`:39`), native `<form action={formAction} … noValidate>` (`:40`), `TextField`
  `name="title" type="text"` with `Label` "Title" and `Input placeholder="Module wrap-up session"`
  (`:41-44`), `TextField name="startsAt" type="datetime-local"` with `Label` "Date and time" and
  `Input step={60}` (`:46-49`), conditional `p role="alert"` (`:51-55`), `Button type="submit"`
  named "Create meeting" (`:57-59`).
- Utilities: `flex flex-col gap-4` (`:35`), `text-base font-semibold tracking-tight` (`:36`),
  `p-5` (`:38`), `p-0` (`:39`), `flex flex-col gap-5` (`:40`), `text-danger text-sm` (`:52`).
- The file states: "The dashboard's only client component" (`:12`); "a button named exactly
  "Create meeting" (`HD-FN-06`, `HD-FN-07`), and an error container with `role="alert"`" (`:16-17`);
  "The error stays a plain `p` with `role="alert"` rather than HeroUI's `Alert`" (`:19-22`);
  "Duration is not asked for at all; Nest defaults it to 60 minutes" (`:28-29`).

### `apps/web/src/components/logout-button.tsx` — 25 lines, Server Component

- No `'use client'`; "A **server** component: a form with a Server Action works without client JS"
  (`logout-button.tsx:6-7`).
- HeroUI imports: `{ Button } from '@heroui/react'` (`:1`).
- Markup: `<form action={logoutAction}>` (`:19`) containing
  `<Button type="submit" variant="outline" size="sm">Sign out</Button>` (`:20-22`).
- No `className` anywhere in the file (the full `className` inventory below has no entry for it).
- The file states: "`Button` carries `type="submit"` and submits the native form — proven by the
  suite rather than assumed, because HeroUI's own docs only ever show `onPress` (`ADR-0023`). An
  `onPress` handler here would need `'use client'` and would break the no-JS path" (`:13-15`).

### The complete `className` inventory of `apps/web/src`

38 literals, from `grep -rnoE 'className="[^"]*"' apps/web/src`. Every HeroUI colour utility in use
is one of `bg-surface`, `bg-background`, `text-foreground`, `text-danger`, `text-accent`,
`text-foreground-500`, `border-default-200`. Everything else is Tailwind core (layout, spacing,
type, `shadow-sm`, `rounded-xl`, `rounded-2xl`, `truncate`, `uppercase`, `hover:underline`).

---

## Q2 — the data available to the UI

- `lib/types.ts` defines exactly five types: `PublicUser { id, email, name }` (`types.ts:9-13`);
  `Meeting { id, title, startsAt, durationMinutes, participants }` (`types.ts:15-22`);
  `MeetingsPage { items, total }` (`types.ts:24-28`); `LoginFormState { error?, email? }`
  (`types.ts:34-37`); `CreateMeetingFormState { error? }` (`types.ts:39-41`);
  `LoginCredentials { email, password }` (`types.ts:44-47`).
- `startsAt` is documented in place as "ISO 8601 UTC — exactly what Nest sent, with no local
  conversion" (`types.ts:18`); `total` as "The owner's full meeting count, not the length of `items`"
  (`types.ts:26`).
- `dal.ts` exports three things: `DEFAULT_MEETINGS_LIMIT = 3` (`dal.ts:28`),
  `getCurrentUser(): Promise<PublicUser>` (`dal.ts:40-62`), `getMeetings(limit = 3):
Promise<MeetingsPage>` (`dal.ts:71-89`). Nothing else reaches a page.
- `api-client.ts` exposes `resolveApiUrl` (`api-client.ts:22`), `ApiError` (`:41`), `apiFetch<T>`
  (`:93`) and `DEFAULT_API_BASE_URL = 'http://127.0.0.1:3001'` (`:12`). It adds no fields.
- Server Actions return only form state: `loginAction` returns `LoginFormState` or redirects
  (`actions/auth.ts:34-66`); `logoutAction` returns `void` (`actions/auth.ts:69-73`);
  `createMeetingAction` returns `CreateMeetingFormState` (`actions/meetings.ts:23-78`).
- **Finding: no field exists anywhere that a category chip could render.**
  `grep -rn "category" apps/api/src apps/web/src docs/data-model.md` returns no hits at all. The
  server-side DTO is built field-by-field in `apps/api/src/meetings/meetings.mapper.ts:11-19` —
  `id`, `title`, `startsAt`, `durationMinutes`, `participants` — and the comment says "Fields are
  listed explicitly rather than removed by rest destructuring, so a new internal field on `Meeting`
  cannot leak on its own; `HD-API-01` checks the resulting key set"
  (`apps/api/src/meetings/meetings.mapper.ts:4-6`). The internal entity
  (`apps/api/src/meetings/meeting.types.ts:5-17`) adds only `ownerId`.
- The one list-shaped field that exists and is unrendered is `participants: string[]`
  (`types.ts:21`, `meeting.types.ts:16`), described as "Free-form strings, never a relation to
  `User` (`ADR-0017`)" (`meeting.types.ts:12`).
- The category chip pattern in `.claude/skills/design-system/references/patterns.md:138-146` renders
  `<Chip.Label>UI/UX Design</Chip.Label>` and says "One tint per category, assigned in a lookup the
  component imports, not computed from the string" (`patterns.md:145`).

---

## Q3 — icons, navigation, layout grid, second column today

- **Not found:** any icon in `apps/web/src` —
  `grep -rniE "<svg|icon|<nav|<aside|navbar|phosphor|lucide|react-icons" apps/web/src` returns **no
  matches at all**. That single grep also rules out `nav` and `aside` elements.
- `@phosphor-icons/react` is not a dependency: it is absent from `apps/web/package.json`
  (the `dependencies` block is `apps/web/package.json:15-25`, its nine entries `:16-24`) and
  `ls node_modules/.pnpm | grep -i phosphor`
  returns nothing.
- **Whether the package can be used at all on the surfaces that want icons is probe 7 below**: the
  barrel import `@phosphor-icons/react` and the per-icon import `@phosphor-icons/react/Calendar`
  both **fail `next build`** inside a Server Component with no `'use client'`
  (`TypeError: (0 , c.createContext) is not a function`), while `@phosphor-icons/react/ssr` builds
  and prerenders the `<svg>` into the HTML at zero client-JS cost. `meeting-list.tsx:7`
  ("A **server** component: no state, no handlers, so no `'use client'`"),
  `logout-button.tsx:6-7` and `page.tsx:31` are the surfaces this applies to.
- Five SVG files exist under `apps/web/public/` — `file.svg`, `globe.svg`, `next.svg`,
  `vercel.svg`, `window.svg` (`ls apps/web/public`) — and no file in `apps/web/src` references any of
  them (the icon grep above covers `.svg` string occurrences in `src`).
- **A layout grid and a second column do exist, in one place:**
  `apps/web/src/app/page.tsx:46` — `className="grid items-start gap-8 lg:grid-cols-[2fr_1fr]"`,
  holding `<MeetingList …/>` and `<CreateMeetingForm />` (`page.tsx:47-48`). It is the only `grid`
  utility in the codebase (`grep -rnE "grid" apps/web/src` returns `page.tsx:27` — a comment — and
  `page.tsx:46`).
- The three-track shell in `patterns.md:25-42` uses `lg:grid-cols-[16rem_minmax(0,1fr)]` plus
  `xl:grid-cols-[minmax(0,1fr)_20rem]`, a `nav aria-label="Main"` and an `aside aria-label="Overview"`
  — none of which has a counterpart in `apps/web/src` today.

---

## Q4 — what holds invariants 9-15 and 19, line by line

| Invariant                                                                     | Held by                                                                                                                                                                                                                                | The line                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 9 — gate lives in `proxy.ts`, narrow matcher, GET-only bounce                 | `src/proxy.ts`                                                                                                                                                                                                                         | `export function proxy(request: NextRequest)` (`proxy.ts:17`); `export const config = { matcher: ['/', '/auth/login'] };` (`proxy.ts:38`); `if (hasSession && request.method === 'GET' && pathname.startsWith('/auth/login'))` (`proxy.ts:27`)                                                                                                                                                                                       |
| 10 — proxy is optimistic, the real check is duplicated                        | `proxy.ts:18` (`request.cookies.has(SESSION_COOKIE_NAME)`), `dal.ts:41` + `dal.ts:46` (`apiFetch<PublicUser>('/auth/me', { token })`), `dal.ts:72` + `dal.ts:77`, `actions/meetings.ts:27-31`                                          | `const token = await readSessionToken(); if (token === undefined) { redirect('/auth/session-expired'); }` (`actions/meetings.ts:27-31`)                                                                                                                                                                                                                                                                                              |
| 11 — `redirect()` outside `try/catch`                                         | `actions/auth.ts:65` (`redirect('/')` after the closing `}` of the `catch` at `:63`), `actions/auth.ts:72`, `dal.ts:57-59`, `dal.ts:85-87`, `actions/meetings.ts:61-63`                                                                | `if (user === undefined) { redirect(SESSION_RESET_PATH); }` (`dal.ts:57-59`)                                                                                                                                                                                                                                                                                                                                                         |
| 12 — `secure` follows `NODE_ENV`                                              | `src/lib/session-cookie.ts:40`                                                                                                                                                                                                         | `secure: nodeEnv === 'production',`                                                                                                                                                                                                                                                                                                                                                                                                  |
| 13 — `'use server'` exports only async functions                              | `actions/auth.ts:1` + `actions/meetings.ts:1`; the escape hatches are `lib/types.ts` and `lib/session-cookie.ts`                                                                                                                       | "this file exports ONLY async functions — `'use server'` forbids exporting constants and types. Hence `LoginFormState` lives in `lib/types.ts` and `SESSION_COOKIE_NAME` in `lib/session-cookie.ts`" (`actions/auth.ts:13-15`); `interface LoginResponse` is declared but **not exported** (`actions/auth.ts:18`)                                                                                                                    |
| 14 — `server-only` does not resolve under Vitest                              | `dal.ts:1` and `session.ts:1` carry `import 'server-only'`; `api-client.ts`, `session-cookie.ts`, `format-date.ts`, `login-credentials.ts` do not                                                                                      | `test: { environment: 'node', include: ['src/**/*.spec.ts'] }` (`vitest.config.ts:16`); the four spec files present are `api-client.spec.ts`, `format-date.spec.ts`, `login-credentials.spec.ts`, `session.spec.ts` (`ls apps/web/src/lib`)                                                                                                                                                                                          |
| 15 — no `required`, email `type="text"`, `noValidate`, password never trimmed | `login-form.tsx:35`, `:36`, `:41`; `create-meeting-form.tsx:40`, `:41`, `:46`; `lib/login-credentials.ts`                                                                                                                              | `<form action={formAction} className="flex w-full flex-col gap-4" noValidate>` (`login-form.tsx:35`); `<TextField name="email" type="text" defaultValue={state.email ?? ''} autoComplete="email">` (`login-form.tsx:36`); `<form action={formAction} className="flex flex-col gap-5" noValidate>` (`create-meeting-form.tsx:40`). No `isRequired`, `required`, `validate`, `min` or `max` occurs in either file (both read in full). |
| 19 — no token into a client component                                         | `page.tsx:32-33` passes only `user` and `items`/`total`; `page.tsx:47` passes `meetings={items}` to a **server** component; `CreateMeetingForm` (`page.tsx:48`) and `LoginForm` (`auth/login/page.tsx:25`) receive **no props at all** | "Submission goes through a Server Action, so the JWT never reaches the browser" (`login-form.tsx:13-14`); "Submission goes through a Server Action, so the token never reaches the browser" (`create-meeting-form.tsx:14-15`)                                                                                                                                                                                                        |

Two further constraints visible in the code and relevant to markup that moves:

- Invariant 17's landing place is a Route Handler, not a page: `SESSION_RESET_PATH =
'/auth/session-expired'` (`dal.ts:25`) → `apps/web/src/app/auth/session-expired/route.ts:22-26`,
  and "The path is deliberately **outside** the `proxy.ts` matcher, or the loop would return"
  (`route.ts:20`).
- The date string is pinned: `timeZone: 'UTC'` inside `formatter()`
  (`apps/web/src/lib/format-date.ts:27`), with "A fresh `Intl.DateTimeFormat` per call rather than
  one at module load" at `format-date.ts:18-20`.

---

## Q5 — build and config surface of `apps/web`

- `apps/web/package.json` scripts: `dev`, `build`, `start`, `lint`, `lint:fix`,
  `typegen: 'next typegen'`, `typecheck: 'next typegen && tsc --noEmit'`,
  `test: 'vitest run --passWithNoTests'` (`package.json:5-14`).
- Dependencies — **nine** entries; the block is `apps/web/package.json:15-25` and the entries are
  `:16-24`: `@heroui/react ^3.2.6`, `@heroui/styles ^3.2.6`,
  `@tailwindcss/postcss ^4.3.3`, `next 16.3.6` (pinned, no caret), `postcss ^8.5.28`,
  `react 19.2.8`, `react-dom 19.2.8`, `tailwind-variants ^3.3.1`, `tailwindcss ^4.3.3`.
- devDependencies — eight entries; the block is `apps/web/package.json:26-35` and the entries are
  `:27-34` — include `vitest ^4.1.11` and the two workspace configs; no
  testing-library, no jsdom.
- Resolved on disk: `@heroui+styles@3.2.6_tailwindcss@4.3.3`, `@tailwindcss+postcss@4.3.3`,
  `tailwindcss@4.3.3`, `postcss@8.5.28` (`ls node_modules/.pnpm`).
- `apps/web/postcss.config.mjs:6-10` — `plugins: { '@tailwindcss/postcss': {} }`, with the comment
  "One plugin and nothing else: v4 needs no `tailwind.config.js`, the theme lives in `globals.css`
  behind `@import "tailwindcss"`" (`postcss.config.mjs:3-4`).
- **Not found:** any Tailwind config file — `ls apps/web/tailwind*` returns nothing, and
  `ls -a apps/web` lists no `tailwind.config.*` at any extension.
- `apps/web/next.config.ts:3-7` — the only option is `allowedDevOrigins: ['127.0.0.1']`.
- `apps/web/tsconfig.json` — extends `@purpleschool/tsconfig/nextjs.json` (`:2`), one path alias
  `"@/*": ["./src/*"]` (`:4-6`), `include` covers `next-env.d.ts`, `**/*.ts`, `**/*.tsx`, `**/*.mts`,
  `.next/types/**/*.ts`, `.next/dev/types/**/*.ts` (`:8-15`).
- `apps/web/vitest.config.ts:14-17` — `resolve: { tsconfigPaths: true }`,
  `test: { environment: 'node', include: ['src/**/*.spec.ts'] }`; globals are off
  (`vitest.config.ts:8-10`) and the file states "React components are covered by Playwright, so
  neither jsdom nor @testing-library is needed" (`vitest.config.ts:4-6`).
- `apps/web/eslint.config.mjs` is four lines: `export default defineConfig([...nextConfig]);`
  (`eslint.config.mjs:3`) over `@purpleschool/eslint-config/next` (`:1`). No local rule overrides.
- `pnpm-workspace.yaml:6-15` carries a `catalog:` for shared tooling only — no UI or icon package is
  catalogued; `overrides:` holds a single `multer: '>=2.3.0'` entry (`pnpm-workspace.yaml:25-26`).
- Root scripts that touch `apps/web`: `"dev:web"` (`package.json:12`), `"lint": "eslint . && pnpm -r lint"`
  (`:18`), `"typecheck": "tsc --noEmit -p tsconfig.json && pnpm -r typecheck"` (`:20`),
  `"test:auth-login"` (`:22`), `"test:home-dashboard"` (`:23`), `"test:meetings-detail"` (`:24`).

---

## Probes

Six executed probes — 1, 2, 3, 4, 6, 7 — plus entry 5, which is a file read and is labelled as
one. Commands and raw output: [`probes.md`](probes.md).

### Probe 1 — the dead-class probe

**Command →** the numeric-scale grep over `apps/web/src` (full pattern and output in
[`probes.md`](probes.md), "Probe 1"), then
`node compile.mjs "text-foreground-500 border-default-200 text-muted border-border bg-surface" - out2.css`
with the repository's own `@tailwindcss/postcss@4.3.3` and `@heroui/styles@3.2.6`.

**Output →** nine grep hits — **seven `text-foreground-500`**
(`apps/web/src/app/auth/layout.tsx:21`, `apps/web/src/app/auth/login/login-form.tsx:56`,
`apps/web/src/app/auth/login/page.tsx:22`, `apps/web/src/app/auth/register/page.tsx:19`,
`apps/web/src/app/page.tsx:40`, `apps/web/src/components/meeting-list.tsx:34`,
`apps/web/src/components/meeting-list.tsx:45`) and **two `border-default-200`**
(`apps/web/src/app/auth/layout.tsx:25`, `apps/web/src/components/meeting-list.tsx:34`). No other
numeric-scale colour utility occurs. The compiled 424 650-byte stylesheet contains `.text-muted`,
`.border-border` and `.bg-surface` and **no occurrence of the strings `text-foreground-500` or
`border-default-200` at all**.

**Fact established →** the two class names generate no CSS with the installed versions; the counts
are 7 and 2. **This matches `FACT-3544` exactly** (`docs/adr/ADR-0026-design-language.md:19-24`) and
`BL-032`'s "(seven occurrences)… (two)" (`docs/BACKLOG.md:29`). No contradiction to record.

### Probe 2 — which token names HeroUI v3 defines

**Command →** `node compile.mjs "<47 candidate classes>" - out3.css`, then
`awk '/^@layer utilities \{/,/^\}/'` and targeted `grep` for the token declarations.

**Output →** the utility classes that **do** emit CSS, with their declaration:

| Class                                                                                          | Emitted declaration                                                                                                                                |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `text-muted`                                                                                   | `color: var(--muted);`                                                                                                                             |
| `bg-muted` / `border-muted`                                                                    | `background-color: var(--muted);` / `border-color: var(--muted);`                                                                                  |
| `border-border` / `ring-border` / `divide-border`                                              | `border-color: var(--border);` / `--tw-ring-color: var(--border);` / `:where(.divide-border > :not(:last-child)) { border-color: var(--border); }` |
| `bg-surface` / `text-surface-foreground`                                                       | `background-color: var(--surface);` / `color: var(--surface-foreground);`                                                                          |
| `bg-separator` / `border-separator` / `divide-separator`                                       | `background-color: var(--separator);` / `border-color: var(--separator);` / `:where(.divide-separator > …)`                                        |
| `text-accent` / `bg-accent` / `text-accent-foreground`                                         | `color: var(--accent);` / `background-color: var(--accent);` / `color: var(--accent-foreground);`                                                  |
| `bg-accent-soft` / `text-accent-soft-foreground`                                               | `background-color: var(--accent-soft);` / `color: var(--accent-soft-foreground);`                                                                  |
| `bg-danger-soft` / `text-danger-soft-foreground`, and the `success-soft` / `warning-soft` pair | same shape against `--danger-soft`, `--success-soft`, `--warning-soft`                                                                             |
| `bg-overlay` / `text-overlay-foreground`                                                       | `background-color: var(--overlay);` / `color: var(--overlay-foreground);`                                                                          |
| `bg-background` / `text-foreground` / `text-danger`                                            | `background-color: var(--background);` / `color: var(--foreground);` / `color: var(--danger);`                                                     |
| `shadow-surface`                                                                               | `--tw-shadow: var(--surface-shadow); box-shadow: …, var(--tw-shadow);`                                                                             |
| `shadow-overlay`                                                                               | `--tw-shadow: var(--overlay-shadow); box-shadow: …, var(--tw-shadow);`                                                                             |
| `rounded-sm` … `rounded-3xl`                                                                   | `calc(var(--radius) * 0.5 / 0.75 / 1 / 1.5 / 2 / 3)` respectively; `rounded-full` is `calc(infinity * 1px)`                                        |
| `font-sans`                                                                                    | `font-family: var(--font-sans);`                                                                                                                   |

Emitting **nothing**: `text-foreground-500`, `border-default-200`, `bg-default-100`,
`text-default-500`, `divide-default-200`, `ring-default-200`, `text-primary-500`, `bg-content1`,
`bg-panel`, `bg-category-violet`, `text-category-violet-foreground`.

The token values HeroUI ships (line numbers in `out3.css`): `--radius: 0.5rem` (`11239`),
`--field-radius: calc(var(--radius) * 1.5)` (`11240`), `--accent: oklch(0.6204 0.195 253.83)`
(`11241`), `--accent-foreground: var(--snow)` (`11242`), `--background: oklch(0.9702 0 0)` (`11252`),
`--surface: var(--white)` (`11254`), `--muted: oklch(0.5517 0.0138 285.94)` (`11262`),
`--border: oklch(90% 0.004 286.32)` (`11283`), `--separator: oklch(92% 0.004 286.32)` (`11284`),
`--accent-soft: color-mix(in oklab, var(--accent) 15%, transparent)` (`11357`),
`--accent-soft-foreground: color-mix(in oklab, var(--accent) 70%, var(--foreground) 30%)` (`11361`),
`--surface-shadow` (`11419`), `--overlay-shadow` (`11421`).

**Fact established →** `shadow-surface` and `shadow-overlay` resolve to real declarations backed by
real `--surface-shadow` / `--overlay-shadow` values. The HeroUI theme block is nested
`@layer theme { @layer theme { @layer base { … } } }` and its light values sit on the selector list
`:root, .light, .default, [data-theme="light"], [data-theme="default"], :host(…)` (`out3.css:11250`),
with a separate `.dark, [data-theme="dark"], …` block at `out3.css:11427`. `--accent-soft` and
`--accent-soft-foreground` are derived from `--accent` by `color-mix`, so an `--accent` override
moves them — matching the claim in `patterns.md:75-76` ("HeroUI's own derived pair, so the active
state needs no new token").

### Probe 3 — `next/font/google` and Plus Jakarta Sans

**Command →** `node -e` reading
`next/dist/compiled/@next/font/dist/google/font-data.json`, plus `grep` over the same directory's
`index.d.ts`.

**Output →** `Plus Jakarta Sans` is present with
`weights: ["200","300","400","500","600","700","800","variable"]`,
`styles: ["normal","italic"]`, one variable axis `wght 200-800 (default 400)`, and
`subsets: ["cyrillic-ext","latin","latin-ext","vietnamese"]`. `Geist` and `Geist Mono` are both
present in the same file. The exported function signature is at
`next/dist/compiled/@next/font/dist/google/index.d.ts:14565`: `options` is optional, `variable?: T`
where `T extends CssVariable`, and `subsets` is typed to exactly those four values. `latin` is a
legal subset; `cyrillic` (without `-ext`) is **not** in the union.

**Fact established →** `Plus_Jakarta_Sans({ variable: '--font-plus-jakarta', subsets: ['latin'] })`
type-checks against the installed `next@16.3.6` and resolves to a real font entry. What
`layout.tsx` does today, and the fact that **nothing reads the Geist variables**, is probe 6 below.

### Probe 4 — Tailwind v4 `@theme inline` in the entry file

**Command →** `node compile.mjs "<10 classes>" tokens-copy.css out4.css`, where `tokens-copy.css` is
a byte copy of `.claude/skills/design-system/references/tokens.css` appended after the two imports.

**Output →** `bg-category-violet` emits `background-color: var(--category-violet);` and
`text-category-violet-foreground` emits `color: var(--category-violet-foreground);` — both of which
emitted nothing in probe 2. `font-sans` changes from `font-family: var(--font-sans)` to
`font-family: var(--font-plus-jakarta), ui-sans-serif, system-ui, sans-serif;`, and the single
`--font-sans:` declaration at `out4.css:6` (inside `@layer theme`) is **replaced**, not duplicated.
The `:root` block from the tokens file lands at `out4.css:11555` onward, after the final `@layer`
closes — i.e. unlayered.

**Fact established →** an `@theme inline` block added to the entry stylesheet is picked up by the
build and produces working utilities for names Tailwind did not know, and a plain `:root` block
appended there is emitted outside every layer. This is the mechanism `globals.css:32-33` already
relies on for `--accent`.

### Probe 5 — the tokens file as written (**a file read, not a probe**)

**No command.** This entry executed nothing: `.claude/skills/design-system/references/tokens.css`
(97 lines) was read with `cat -n`. It keeps its number so the others are not renumbered.

**What the file contains →** three declaration blocks plus a comment block:

1. `:root` overrides of **HeroUI's own** tokens, four names: `--accent: oklch(0.55 0.21 285)`
   (`tokens.css:20`), `--background: oklch(0.969 0.004 286)` (`:23`),
   `--muted: oklch(0.52 0.014 286)` (`:29`), `--radius: 0.75rem` (`:35`). The header says "Three
   values" (`tokens.css:14`) while four names follow — recorded under Open questions.
2. Ten category names in the same `:root`: `--category-{violet,blue,pink,green,amber}` and their
   `-foreground` partners, `tokens.css:42-55`, each with an sRGB hex and a contrast ratio in a
   trailing comment (e.g. `--category-violet-foreground: oklch(0.45 0.16 285); /* #5040A8 — 6.93:1 */`,
   `tokens.css:43`).
3. `@theme inline { … }` at `tokens.css:64-81`, declaring
   `--font-sans: var(--font-plus-jakarta), ui-sans-serif, system-ui, sans-serif;` (`:65`) and ten
   `--color-category-*` aliases (`:67-80`).
4. A comment block (`tokens.css:83-97`) holding the `layout.tsx` snippet:
   `Plus_Jakarta_Sans({ variable: '--font-plus-jakarta', subsets: ['latin'] })` and
   `<html lang="en" className={\`light ${sans.variable}\`} data-theme="light">`, with "The `light`class and`data-theme="light"` stay: the theme is pinned, not detected (`FACT-3513`)"
(`tokens.css:96`).

**Collisions and dependencies against probe 2:**

- `--accent`, `--background`, `--muted`, `--radius` are **all four already defined by HeroUI**
  (`out3.css:11241`, `11252`, `11262`, `11239`) inside `@layer theme > @layer theme > @layer base`.
  The tokens file states the mechanism: "HeroUI declares its theme inside `@layer base`, and an
  unlayered rule beats a layered one regardless of order" (`tokens.css:8-10`).
- `--accent` collides with the override already live in `apps/web/src/app/globals.css:36`
  (`oklch(50% 0.195 253.83)` today vs `oklch(0.55 0.21 285)` in the tokens file).
- `--font-sans` in the `@theme inline` block collides with Tailwind's own `--font-sans`
  (`out3.css:6`), which feeds `--default-font-family` (`out3.css:48`) and thence the base
  `html, :host { font-family: … }` rule (`out3.css:69`). Probe 4 shows the replacement works.
- The ten `--color-category-*` names collide with nothing: probe 2 showed `bg-category-violet`
  emitting no CSS before the block was added.
- `--category-*` depends on nothing HeroUI defines; `--font-sans` depends on `--font-plus-jakarta`,
  which is produced by `next/font` in `layout.tsx` and does not exist today.

### Probe 6 — are the Geist variables consumed? (extra probe)

**Command →**
`grep -rn --exclude-dir=.next --exclude-dir=node_modules -- "font-geist\|font-sans\|font-mono" apps/web`
and `grep -c "font-geist" out3.css`.

**Output →** exactly two hits, both inside the font-loader calls themselves:
`apps/web/src/app/layout.tsx:6` and `apps/web/src/app/layout.tsx:11`. Zero occurrences in the
compiled stylesheet.

**Fact established →** `--font-geist-sans` and `--font-geist-mono` are declared on `<html>`
(`layout.tsx:33`) and read by no rule in the project; the body font resolves through Tailwind's
`--font-sans` → `--default-font-family` chain (`out3.css:48`, `out3.css:69`) to the
`-apple-system, BlinkMacSystemFont, "Segoe UI", …` default.

### Probe 7 — does `@phosphor-icons/react` render in a Server Component? (extra probe)

Raised by the research review: `patterns.md` puts icons on the nav rail, the stat tile and the list
rows, and those surfaces are Server Components today — `meeting-list.tsx:7` ("A **server** component:
no state, no handlers, so no `'use client'`"), `logout-button.tsx:6-7`, `page.tsx:31`.

**Command →** a scratchpad install of `@phosphor-icons/react@2.1.10` next to `next@16.3.6`,
`react@19.2.8`, `react-dom@19.2.8` (the versions `apps/web/package.json:19,21,22` pins), then five
`npx next build` runs over one page swapped between five variants. Full code and output: [`probes.md`](probes.md),
"Probe 7".

**Output →**

| Variant                                                                                                  | `next build`                                                                                           |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| no icon (baseline)                                                                                       | **passes**                                                                                             |
| `import { CalendarIcon } from '@phosphor-icons/react'` in a Server Component, no `'use client'`          | **fails**: `TypeError: (0 , c.createContext) is not a function` at `Failed to collect page data for /` |
| `import { CalendarIcon } from '@phosphor-icons/react/Calendar'` in a Server Component, no `'use client'` | **fails**, the same `createContext` TypeError                                                          |
| `import { CalendarIcon } from '@phosphor-icons/react/ssr'` in a Server Component, no `'use client'`      | **passes**                                                                                             |
| the barrel import inside a `'use client'` component                                                      | **passes**                                                                                             |

Client JS emitted into `.next/static` (sum of `*.js` bytes, Turbopack build):

| Variant                                   | Files | Bytes   | Δ vs baseline |
| ----------------------------------------- | ----- | ------- | ------------- |
| baseline, no icon                         | 9     | 566 110 | —             |
| `/ssr` icon in a Server Component         | 9     | 566 110 | **0**         |
| barrel icon in a `'use client'` component | 10    | 570 559 | **+4 449**    |

The prerendered `/` HTML of the `/ssr` variant contains
`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256">`
and one `<path`; the file grows from 4 299 bytes (baseline) to 5 712 bytes (**+1 413** for one 24 px
icon).

Why the two failing variants fail, from the shipped code: `dist/csr/Calendar.es.js` imports
`../lib/IconBase.es.js`, which calls `e.useContext(h)` on the `IconContext` created by
`dist/lib/context.es.js` (`createContext({ color: 'currentColor', size: '1em', weight: 'regular', mirrored: !1 })`);
`dist/ssr/Calendar.es.js` imports `../lib/SSRBase.es.js` instead, which reads no context and takes its
defaults from props. `dist/index.es.js:1` re-exports `./ssr/index.es.js` **and** 1 512 `./csr/*.es.js`
modules, so the barrel drags the context in whichever icon is named.

**No `'use client'` directive exists anywhere in the package**:
`grep -rl -e "use client" -e "use server" .` over the installed package returns nothing (exit 1,
zero files). `package.json` declares `"sideEffects": false`, `"main": "./dist/index.cjs.js"`,
`"module": "./dist/index.es.js"`, peers `"react": ">= 16.8"`, `"react-dom": ">= 16.8"`, and an
`exports` map with `"./ssr"`, `"./dist/ssr"`, `"./dist/ssr/*"`, `"./lib"`, `"./dist/csr/*"`,
`"./dist/icons/*"` and a catch-all `"./*"` → `./dist/csr/*.es.js`.

Installed footprint, measured on disk: **9 089 files, 33 027 417 bytes (31.50 MiB)** — `dist/csr`
8 425 817 B over 3 024 entries, `dist/ssr` 8 658 652 B over 3 026 entries, `dist/defs` 5 582 127 B,
the four files sitting directly in `dist/` (`index.cjs.js`, `index.umd.js`, `index.es.js`,
`index.d.ts`) 10 338 379 B together, `dist/lib` 3 185 B. This matches the 31.5 MB unpacked size the contract sweep took from the registry.

**Fact established →** `@phosphor-icons/react` **cannot** be imported into a Server Component through
its default entry or its per-icon `csr` subpath without `'use client'` — the build fails, not the
render. The `/ssr` subpath can, and costs **zero** client JS and +1 413 bytes of HTML per icon; the
csr path through a client component costs +4 449 bytes of client JS for one icon.

**Not found:** a "First Load JS" figure as printed by `next build` — `next@16.3.6` building with
Turbopack prints only the route list (`Route (app) ┌ ○ / └ ○ /_not-found`) with no Size / First Load
JS columns, and `--experimental-analyze` added none. The byte sums above are measured from
`.next/static/**/*.js` instead.

---

## What depends on this area

Four Playwright functional specs address the markup of these files by role and accessible name:

- `e2e/regression/auth-login/auth-login.functional.spec.ts` — `page.getByRole('main').getByRole('alert')`
  (`:41`), `getByRole('heading', { level: 1 })` (`:54`, `:156`), `getByLabel('Email')` / `getByLabel('Password')`
  (`:56-57`), `getByRole('button', { name: 'Sign in' })` (`:58`), `getByRole('link', { name: 'Sign up' })`
  (`:149`). The alert locator is scoped on purpose: "A bare `page.getByRole('alert')` does not work
  here, and that is not pedantry" (`:31`).
- `e2e/regression/home-dashboard/home-dashboard.functional.spec.ts` — `getByText(COUNTER_PATTERN)`
  (`:41`), `getByRole('heading', { level: 1 })` (`:118`, `:137`, `:214`, `:232`, `:241`),
  **unscoped** `authedPage.getByRole('list')` (`:166`, `:223`, `:224`, `:295`, `:305`) and
  **unscoped** `authedPage.getByRole('listitem')).toHaveCount(0)` (`:254`),
  `getByRole('button', { name: 'Create meeting' })` (`:202`, `:229`, `:291`),
  `getByRole('button', { name: 'Sign out' })` (`:230`, `:317`), `getByLabel('Title')` (`:289`),
  `getByLabel('Date and time')` (`:290`), `getByText('No meetings yet')` (`:255`).
  `HD-FN-04` reads `const list = authedPage.getByRole('list'); await expect(list).toBeVisible();`
  (`:166-168`) — the locator is not scoped to the meetings section.
- `e2e/accessibility/accessibility.functional.spec.ts` — `ACC-FN-04` asserts
  `toHaveCount(1)` for both `getByRole('heading', { level: 1 })` and `getByRole('main')` on every
  audited page (`:92-93` for public pages, `:99-102` for session pages), with the comment "axe does
  not fail a page for a missing or duplicated h1, so it is asserted here" (`:91`).
  `patterns.md:47-48` states the same rule: "`main` appears exactly once per page, and so does `h1`.
  `ACC-FN-04` asserts both, because `axe` does not."
- `e2e/security/security.functional.spec.ts` — `PROTECTED_PAGES = ['/']` (`:31`),
  `getByRole('heading', { level: 1 })` (`:90`, `:118`), `getByLabel('Email')` (`:142`),
  `getByText(SEED_USERS.teacher.email)).toHaveCount(0)` (`:143`, `:185`).

Shared modules consumed by the touched files and not themselves presentational:
`@/lib/dal` (`page.tsx:6`), `@/lib/format-date` (`meeting-list.tsx:3`), `@/lib/types`
(`meeting-list.tsx:4`, `create-meeting-form.tsx:7`, `login-form.tsx:8`), `@/lib/actions/auth`
(`login-form.tsx:7`, `logout-button.tsx:3`), `@/lib/actions/meetings` (`create-meeting-form.tsx:6`).

---

## Open questions

- `tokens.css:14` says "Three values. Everything not listed here stays the library's default on
  purpose", but the `:root` block that follows overrides **four** HeroUI token names —
  `--accent` (`:20`), `--background` (`:23`), `--muted` (`:29`), `--radius` (`:35`). Both the comment
  and the four declarations are in the same file; the sweep records both and resolves neither.
- `apps/web/src/app/globals.css:36` sets `--accent: oklch(50% 0.195 253.83)` and cites `FX-039` /
  `ACC-FN-01` as what fixed the value (`globals.css:30-33`); `tokens.css:20` sets
  `--accent: oklch(0.55 0.21 285)` and cites "5.15:1 against `--accent-foreground`" (`tokens.css:19`).
  Two different values for the same token, each with its own stated measurement. A third statement
  bears on the same question and is quoted here in full:
  `.claude/skills/design-system/SKILL.md:156-158` —
  "**A colour that looks right can be outside sRGB.** `oklch(0.50 0.195 253.83)` — the current
  `--accent` from `FX-039` — clips on conversion, so the rendered colour is not the declared one.
  Every value in the table above was checked in-gamut." That sentence sits under the heading
  "Traps this repository has actually hit" (`SKILL.md:146`), **carries no `FACT-` key** (the nearest
  keys in the file are `FACT-3544` at `:151` and `FACT-3559` at `:167`, on other statements) and is
  not inside a `> **Rationale — not a fact.**` block — the file contains no such block at all
  (`grep -c 'Rationale' .claude/skills/design-system/SKILL.md` → `0`). It is an unkeyed sentence in a
  skill file, not a corpus fact, and the sweep does not weigh it against the two token values above:
  the question stays open.
- `home-dashboard.functional.spec.ts:223` asserts `toBeVisible()` on an unscoped
  `getByRole('list')`, and `:254` asserts a count on an unscoped `getByRole('listitem')`. The
  navigation-rail pattern in `patterns.md:58-69` is built from `ul`/`li`. The sweep records the two
  facts; what happens when both are on one page is not observable from the code without a run, and
  this sweep does not run the suite.

---

## Not found

- **Not found:** a "First Load JS" figure for a route — `next@16.3.6` building with Turbopack prints
  only the route list, with no Size / First Load JS columns, and `npx next build --experimental-analyze`
  added none (probe 7). Client JS was measured instead as the byte sum of `.next/static/**/*.js`.
- **Not found:** any icon, SVG reference, `nav`, `aside` or icon-library import in `apps/web/src` —
  searched with `grep -rniE "<svg|icon|<nav|<aside|navbar|phosphor|lucide|react-icons" apps/web/src`,
  zero matches.
- **Not found:** `@phosphor-icons/react` anywhere in the repository — searched
  `apps/web/package.json` (read in full) and `ls node_modules/.pnpm | grep -i phosphor`, no result.
  What the package does when it is present is probe 7, run in the scratchpad: the default entry does
  not build inside a Server Component, the `/ssr` subpath does.
- **Not found:** any field on `Meeting`, `PublicUser` or the Nest DTO that names a category, topic,
  subject, tag or colour — searched `grep -rn "category" apps/api/src apps/web/src docs/data-model.md`
  (zero hits) and read `apps/web/src/lib/types.ts`, `apps/api/src/meetings/meeting.types.ts` and
  `apps/api/src/meetings/meetings.mapper.ts` in full.
- **Not found:** a Tailwind config file for `apps/web` — searched `ls apps/web/tailwind*` and the
  full `ls -a apps/web` listing; `postcss.config.mjs:3-4` states none is needed.
- **Not found:** any `@theme` or `@theme inline` block in `apps/web/src/app/globals.css` — the whole
  37-line file was read; the only at-rules are the two `@import`s at `:5-6`.
- **Not found:** any current use of `shadow-surface`, `shadow-overlay`, `text-muted`, `border-border`,
  `bg-accent-soft` or `rounded-3xl` in `apps/web/src` — searched the complete `className` literal
  inventory (`grep -rnoE 'className="[^"]*"' apps/web/src`, 38 results, all listed in Q1).
- **Not found:** a second column, grid or multi-track shell anywhere other than
  `apps/web/src/app/page.tsx:46` — searched `grep -rnE "grid|aside|nav" apps/web/src`.
- **Not found:** any unit spec covering a React component under `apps/web` — `vitest.config.ts:16`
  includes only `src/**/*.spec.ts` and the four spec files in `src/lib` are `api-client`,
  `format-date`, `login-credentials`, `session` (`ls apps/web/src/lib`).
