# apps/web — Next.js 16 (App Router)

An addition to the root [`CLAUDE.md`](../../CLAUDE.md), not a copy of it. The Next invariants
(rules 9–15), the split of runs ("Who runs what") and the ledger process are described **there** and
deliberately not restated here: a copied rule drifts from the original silently, which is how this
repository earned `FX-023`. Read rules 9–15 before editing — each cost its own investigation.

The `README.md` in this package is the stock `create-next-app` one and is not a source of truth.

Before changing behaviour, read the corpus for this side of the system: the BFF layout and the layer
rules in [`docs/architecture.md`](../../docs/architecture.md), and the flows — sign-in, dashboard
render, meeting creation, session end — in [`docs/data-model.md`](../../docs/data-model.md).
[`docs/api-contract.md`](../../docs/api-contract.md) says what you are calling and what it answers.

## Map

This table states **where a thing goes**, not which files exist: a list of names rots by omission
(`FX-023`), a rule does not. To find what is there, list the directory.

| Path                    | What goes there                                                                                                                                    |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/proxy.ts`          | the one gate for unauthenticated visitors (Next 16's `middleware.ts`); narrow matcher, optimistic only (rule 9–10)                                 |
| `src/app/`              | routes only: a `page.tsx` per page, a `route.ts` per Route Handler, layouts and `globals.css`                                                      |
| `src/app/**/page.tsx`   | a page: a protected one is added to `PROTECTED_PAGES` and `AUDITED_PAGES` (below)                                                                  |
| `src/app/**/route.ts`   | a Route Handler: what a page cannot do — erasing a cookie (rule 17), streaming bytes with the token server-side                                    |
| `src/app/<route>/*.tsx` | an exception, not the default: a component only that route uses may sit next to its page (the login form does)                                     |
| `src/components/`       | the default home of a component, whether one page or several use it; HeroUI v3 and Tailwind utilities, tokens per the `design-system` skill        |
| `src/lib/actions/`      | Server Actions, one file per feature; each re-checks the session itself (rule 10)                                                                  |
| `src/lib/`              | everything else: pure helpers go in a module without `server-only` (units); only the session readers (`dal.ts`, `session.ts`) import `server-only` |
| `src/lib/api-client.ts` | the only server-side `fetch` to Nest for JSON and multipart; the download handler is the exception                                                 |

## Styling: HeroUI v3 on Tailwind v4

`FT-004`/`ADR-0023`. No `*.module.css` anywhere; `src/app/globals.css` holds
`@import 'tailwindcss'` then `@import '@heroui/styles'` — **that order**, or HeroUI's layers land
before the ones they override — plus the app-shell rules that have no component to hang on.
`postcss.config.mjs` carries `@tailwindcss/postcss` and nothing else: Tailwind v4 needs no
`tailwind.config.js`.

The rules for forms, submit buttons and lists, with their reasons, are in the `heroui-react` skill;
read it before any component.

## The BFF layout: three layers, not one

The browser never talks to Nest. The token lives in an httpOnly cookie, and the session check is
duplicated three times: `proxy.ts` (optimistic, sees only that a cookie exists) → `lib/dal.ts` →
**inside every Server Action**. None of the three can be removed: the first is UX rather than
security, and the third is what actually protects a mutation.

## What has units and what does not

Vitest **cannot resolve** `import 'server-only'`, so exactly two files import it — `dal.ts` and
`session.ts` — and they have no units (their behaviour is checked by functional e2e cases).
Everything testable must live in a module without that import: `api-client.ts`,
`session-cookie.ts`, `format-date.ts`, `login-credentials.ts`, `format-file-size.ts`. If logic appears in `session.ts`,
move it into a neighbouring pure module rather than dragging `server-only` into a test.

A unit test title starts with its case ID (`AL-UT-20 — …`). Globals are **off** here, unlike
`apps/api`: `describe`/`it`/`expect` are imported from `vitest`.

## Small things that have already broken

- `next.config.ts` → `allowedDevOrigins: ['127.0.0.1']`. Addresses are written as `127.0.0.1`: on
  Windows `localhost` resolves to `::1`, where `next dev` does not listen.
- Date display is pinned to `timeZone: 'UTC'`, or the units and the e2e depend on the machine's
  time zone.
- **A new protected page** — a line in `PROTECTED_PAGES`
  (`e2e/security/security.functional.spec.ts`) **and** one in `AUDITED_PAGES`
  (`accessibility.functional.spec.ts`), or neither cross-feature suite covers it.
- `next.config.ts` → `experimental.serverActions.bodySizeLimit: '2mb'`, so an oversized upload meets
  the API's documented 413 rather than Next's undocumented one. There is no per-action form, so it
  raises the ceiling for the unauthenticated `loginAction` too — recorded as a deliberate gap in
  `docs/security.md` (`ADR-0029`).
- **The download Route Handler calls Nest with an inline `fetch`**, not through `api-client.ts`:
  `apiFetch` always does `response.json()`, and bytes have nothing to parse. That is the one named
  exception, written down so it is not copied as a precedent for a second JSON client.
- A UI change is verified in the browser through the `playwright-verify` skill, and a behavioural
  one also gets a new spec in `e2e/regression/<feature>/`.

## Commands

```bash
pnpm dev:web                              # from the root, 127.0.0.1:3000
pnpm --filter @purpleschool/web test      # this package's units
pnpm --filter @purpleschool/web typecheck # next typegen + tsc
```

The units usually need no manual run: they are part of `pnpm verify` and of the `pre-commit` hook.
Stop `pnpm dev` before `pnpm e2e`: Next 16 registers its dev server per project directory, and a
second one starts on no port at all.

## The AGENTS.md next door is not ours

`next dev` writes its own block into `AGENTS.md` between `BEGIN/END:nextjs-agent-rules` markers and
recreates it if the block is missing; it leaves this `CLAUDE.md` alone as long as the block lives in
`AGENTS.md` (`node_modules/next/dist/server/lib/generate-agent-files.js`). If such a diff appears,
commit it with your work — deleting it is pointless.

@AGENTS.md
