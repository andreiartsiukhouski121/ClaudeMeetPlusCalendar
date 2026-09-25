# apps/web — Next.js 16 (App Router)

An addition to the root [`CLAUDE.md`](../../CLAUDE.md), not a copy of it. The Next invariants
(rules 9–15), the split of runs ("Who runs what") and the ledger process are described **there** and
deliberately not restated here: a copied rule drifts from the original silently, which is how this
repository earned `FX-023`. Read rules 9–15 before editing — each cost its own investigation.

The `README.md` in this package is the stock `create-next-app` one and is not a source of truth.

## Map

| Path                            | What is there                                                                     |
| ------------------------------- | --------------------------------------------------------------------------------- |
| `src/proxy.ts`                  | the gate for unauthenticated visitors (Next 16's `middleware.ts`), narrow matcher |
| `src/app/`                      | pages: `/`, `/auth/login`, the `/auth/register` placeholder                       |
| `src/app/auth/session-expired/` | the Route Handler that erases a broken cookie (root rule 17)                      |
| `src/components/`               | client form and list components plus CSS modules                                  |
| `src/lib/actions/`              | Server Actions: login, sign-out, meeting creation                                 |
| `src/lib/dal.ts`, `session.ts`  | `server-only`: reading the session and checking access                            |
| `src/lib/api-client.ts`         | the server-side `fetch` to Nest — the only door into the API                      |

## The BFF layout: three layers, not one

The browser never talks to Nest. The token lives in an httpOnly cookie, and the session check is
duplicated three times: `proxy.ts` (optimistic, sees only that a cookie exists) → `lib/dal.ts` →
**inside every Server Action**. None of the three can be removed: the first is UX rather than
security, and the third is what actually protects a mutation.

## What has units and what does not

Vitest **cannot resolve** `import 'server-only'`, so exactly two files import it — `dal.ts` and
`session.ts` — and they have no units (their behaviour is checked by functional e2e cases).
Everything testable must live in a module without that import: `api-client.ts`,
`session-cookie.ts`, `format-date.ts`, `login-credentials.ts`. If logic appears in `session.ts`,
move it into a neighbouring pure module rather than dragging `server-only` into a test.

A unit test title starts with its case ID (`AL-UT-20 — …`). Globals are **off** here, unlike
`apps/api`: `describe`/`it`/`expect` are imported from `vitest`.

## Small things that have already broken

- `next.config.ts` → `allowedDevOrigins: ['127.0.0.1']`. Addresses are written as `127.0.0.1`: on
  Windows `localhost` resolves to `::1`, where `next dev` does not listen.
- Date display is pinned to `timeZone: 'UTC'`, or the units and the e2e depend on the machine's
  time zone.
- **A new protected page** — a line in `PROTECTED_PAGES`
  (`e2e/security/security.functional.spec.ts`), or the security suite does not cover it.
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
