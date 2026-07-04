---
id: 0002
title: Migrate shared/ layer
status: blocked
labels: [architecture, ready-for-agent]
parent: docs/prd/0001-frontend-fsd-migration.md
blocked_by: [0001]
phase: 1
---

# Migrate shared/ layer

## Parent

PRD [0001 — Migrate frontend to minimal Feature-Sliced Design](../prd/0001-frontend-fsd-migration.md).

## What to build

Move all infrastructure into FSD `shared/` segments so every later slice imports
its dependencies from stable locations. Relocate the API-client stack (ky
client, query-client, auth interceptor, error-mapper, config, and the generated
schema placeholder) to `shared/api`; the token/session store and permission
checks to `shared/auth`; i18n config/direction/runtime to `shared/i18n`; the
preferences store to `shared/config`. Keep the existing `ui`, `lib`, and
`charts` segments. Each segment exposes its own public API. No business logic
enters `shared/` (route/permission *guards* stay out — they go to `app/` in
#0003).

## Acceptance criteria

- [ ] `src/api/*` → `shared/api`; auth store + permissions → `shared/auth`; i18n → `shared/i18n`; preferences store → `shared/config`.
- [ ] Each shared segment has an `index.ts` public API; consumers import from it.
- [ ] No business logic in `shared/`.
- [ ] `bun run typecheck && bun run test` green; app runs unchanged.

## Blocked by

- #0001 — Scaffold FSD skeleton + tooling.

## Next

On completion, pick up **#0003 — Routing infrastructure + app-shell widget**.
