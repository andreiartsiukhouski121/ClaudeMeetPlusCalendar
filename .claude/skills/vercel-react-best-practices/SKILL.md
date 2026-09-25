---
name: vercel-react-best-practices
description: React/Next.js performance rules from Vercel Engineering, adapted to this monorepo. Use when writing, reviewing or refactoring anything under apps/web, when asked "optimize the rendering", "why is it slow", "check the performance", or when a review touches React/Next performance.
---

Adapter for the external `vercel-react-best-practices` skill (70 rules,
`vercel-labs/agent-skills`). The rules live in
`.agents/skills/vercel-react-best-practices/rules/`; the directory is in `.gitignore` and the set is
restored with `pnpm skills:sync`. If the directory is missing, everything below still works: the
local part is self-contained.

## Order of precedence

Invariants 9–15 of the root `CLAUDE.md` outrank any rule of this skill. No conflict was found when
checking, but if one appears the invariant wins and the discrepancy is recorded as an `FX-` entry
with its "Found by".

## What actually applies here

- `rules/server-auth-actions.md` — "check authorization **inside** every Server Action, not in
  middleware". That is invariant 10 word for word: `proxy.ts` only sees that a cookie exists, and
  the real check is duplicated in `lib/dal.ts` and inside every action.
- `rules/server-serialization.md` — anything passed as a prop to a client component is serialized
  into the RSC stream. Hence invariant 19: the token is never passed as a prop, or it becomes
  available to any script on the page.
- `rules/async-parallel.md`, `rules/async-suspense-boundaries.md` — applicable once the page has a
  second data source. Today `/` calls Nest once.

## What not to do with it

- **Do not optimize a three-page demo against all 70 rules.** Dynamic imports, SWR deduplication,
  `content-visibility` and DOM batching give nothing here and produce a diff nobody asked for.
- **A performance change without a measurement is not accepted.** "It got faster" is a number
  before and after, not a link to a rule.
- Any edit under `apps/web` is a runtime change: it is verified through the `playwright-verify`
  skill, and a behavioural one also gets a new spec in `e2e/regression/<feature>/`.
