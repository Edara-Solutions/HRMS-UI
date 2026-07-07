---
id: 0008
title: Migrate auth/entry pages
status: blocked
labels: [architecture, ready-for-agent]
parent: docs/prd/0001-frontend-fsd-migration.md
blocked_by: [0003, 0004]
phase: 1
---

# Migrate auth/entry pages

## Parent

PRD [0001 — Migrate frontend to minimal Feature-Sliced Design](../prd/0001-frontend-fsd-migration.md).

## What to build

Migrate the entry screens — **login**, **admin-login**, **accept-invitation**,
**change-password**, **forbidden** — into page slices under `pages/`. The
change-password page consumes `@/features/auth` (from #0004); guards are already
in `app/guards` (from #0003). Admin-login belongs to the Admin portal group;
keep portal isolation.

## Acceptance criteria

- [ ] All five entry screens live in page slices with thin route files.
- [ ] The change-password page imports the form from `@/features/auth`.
- [ ] `login.page.test` and `admin-login.page.test` move with their slices and pass.
- [ ] `bun run typecheck && bun run test` green.

## Blocked by

- #0003 — Routing infrastructure + app-shell widget.
- #0004 — features/auth.

## Next

On completion, pick up **#0009 — Placeholder dashboards** (the last screens to move).
