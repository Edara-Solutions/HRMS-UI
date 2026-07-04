---
id: 0009
title: Migrate placeholder dashboards (admin + company)
status: blocked
labels: [architecture, ready-for-agent]
parent: docs/prd/0001-frontend-fsd-migration.md
blocked_by: [0003]
phase: 1
---

# Migrate placeholder dashboards (admin + company)

## Parent

PRD [0001 — Migrate frontend to minimal Feature-Sliced Design](../prd/0001-frontend-fsd-migration.md).

## What to build

Migrate the **Admin dashboard** and **Company dashboard** screens and all their
blocks (kpi-card, headcount/revenue charts, activity/approval feeds, people and
recent-signup tables, module shortcuts) into `pages/admin/dashboard` and
`pages/company/dashboard`. Every block stays **inside** its page slice's `ui/`
(single-use — do not promote to `widgets/`). The `fixtures.ts` placeholder data
is colocated in the slice; renaming it to a domain-based name is optional here,
and real API wiring is out of scope. These move last because they will be
restructured when wired to real endpoints.

## Acceptance criteria

- [ ] Both dashboards are page slices; every block stays inside the slice `ui/`.
- [ ] Placeholder data colocated in the slice; no cross-portal imports.
- [ ] `bun run typecheck && bun run test` green; dashboards render identically.

## Blocked by

- #0003 — Routing infrastructure + app-shell widget.

## Next

All screens are now moved. Pick up **#0010 — Flip Steiger to strict + retire
legacy patterns** to close out Phase 1.
