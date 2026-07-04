---
id: 0007
title: Migrate remaining admin pages (plans, audit, subscriptions)
status: blocked
labels: [architecture, ready-for-agent]
parent: docs/prd/0001-frontend-fsd-migration.md
blocked_by: [0003]
phase: 1
---

# Migrate remaining admin pages (plans, audit, subscriptions)

## Parent

PRD [0001 — Migrate frontend to minimal Feature-Sliced Design](../prd/0001-frontend-fsd-migration.md).

## What to build

Migrate the **Plans**, **Audit**, and **Subscriptions** screens into their page
slices under `pages/admin/*`, each with `ui/`, `api/`, and an `index.ts`. Plans
and audit are backend-backed (audit is served under `/auth`); subscriptions
currently reads company-config placeholder data — carry it as-is (real wiring is
out of scope).

## Acceptance criteria

- [ ] `plans`, `audit`, `subscriptions` are each a page slice entered via `index.ts`; route files are thin.
- [ ] Behavior unchanged; Steiger baseline clean for these slices; no `admin ↔ company` imports.
- [ ] `bun run typecheck && bun run test` green.

## Blocked by

- #0003 — Routing infrastructure + app-shell widget.

## Next

On completion, pick up **#0008 — Auth/entry pages** (also needs #0004 done).
