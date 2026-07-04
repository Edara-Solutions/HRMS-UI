---
id: 0003
title: Routing infrastructure + app-shell widget
status: blocked
labels: [architecture, ready-for-agent]
parent: docs/prd/0001-frontend-fsd-migration.md
blocked_by: [0001, 0002]
phase: 1
---

# Routing infrastructure + app-shell widget

## Parent

PRD [0001 — Migrate frontend to minimal Feature-Sliced Design](../prd/0001-frontend-fsd-migration.md).

## What to build

Invert routing to the FSD shape. Point TanStack `routesDirectory` at
`src/app/routes` and convert to **directory-based** routing (folders mirror the
URL). Move providers to `app/providers` and route/permission guards to
`app/guards`. Extract the app shell (header, sidebar, nav) to
`widgets/app-shell`. Create the two **portal shells** as `route.tsx` layout
files (Admin and Company), each rendering an `Outlet`. Feature pages are wired
in by later slices; until then existing page components may be referenced from
their current location. The transitional `.page.tsx`/`-` exclusion patterns
stay for now and are removed in #0010.

## Acceptance criteria

- [ ] `routesDirectory` is `src/app/routes`; routing is directory-based; `__root.tsx` present; `routeTree.gen.ts` regenerates.
- [ ] `app/providers` holds QueryClient/Router/i18n+theme wiring; `app/guards` holds the guards; `widgets/app-shell` holds the shell.
- [ ] Admin and Company each have a `route.tsx` shell rendering an `Outlet`.
- [ ] Every current route still resolves and renders identically; `bun run typecheck && bun run test && bun run test:e2e` green.

## Blocked by

- #0001 — Scaffold FSD skeleton + tooling.
- #0002 — Migrate shared/ layer.

## Next

Enabling slices are done. Pick up **#0004 — features/auth**; the admin page
slices **#0005–#0007** can proceed in parallel (all gated only on this issue).
