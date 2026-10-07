# Smoke: API availability

- **Paired spec:** `e2e/smoke/health.api.spec.ts`
- **Playwright project:** `api` (the `request` fixture, `baseURL = http://127.0.0.1:3101`, no browser)
- **Tags:** `@smoke`
- **Run:** `pnpm e2e e2e/smoke/health.api.spec.ts`
- **Preconditions:** Playwright starts Nest on port 3101, through `pnpm start:e2e`. Neither the seed
  nor authentication is needed **by this case** — `GET /` is the public scaffold endpoint and reads
  no table.
- **What the database changed here is the diagnosis, not the case.** The server no longer comes up
  at all unless the container is running and `db:reset` succeeded, so a red `SM-API-01` now means
  "the server is not alive" **or** "there is no database" — and the first place to look is Docker
  rather than Nest. The assertion is unchanged and still correct; what moved is what a failure
  tells you.

The cheapest possible "the server is alive and routing works" check. It belongs to no feature and
is deliberately not extended: any domain check goes to `e2e/regression/<feature>/`, and seed checks
go to `seed.api.cases.md`.

## Summary

| ID        | Title                           | Priority | Tag      |
| --------- | ------------------------------- | -------- | -------- |
| SM-API-01 | `GET /` answers with a greeting | P1       | `@smoke` |

## Cases

### SM-API-01 — `GET /` answers with a greeting

- **Priority:** P1
- **Preconditions:** Nest answers on `http://127.0.0.1:3101`; no global route prefix is set, or `/`
  would return 404.
- **Steps:** perform `GET /`.
- **Expected:** a successful status (`toBeOK`), and the body is exactly `Hello World!`.
