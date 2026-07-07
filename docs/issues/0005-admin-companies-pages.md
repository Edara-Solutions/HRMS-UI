---
id: 0005
title: Migrate admin companies + company-detail pages
status: blocked
labels: [architecture, ready-for-agent]
parent: docs/prd/0001-frontend-fsd-migration.md
blocked_by: [0003]
phase: 1
---

# Migrate admin companies + company-detail pages

## Parent

PRD [0001 — Migrate frontend to minimal Feature-Sliced Design](../prd/0001-frontend-fsd-migration.md).

## What to build

Migrate the **Companies** list and **Company** detail screens end-to-end into
`pages/admin/companies` and `pages/admin/company-detail`. Each is a slice with
`ui/` (the page plus its modals: edit-company, edit-company-config), `api/`
(React Query hooks plus the current hand-rolled types, carried **unchanged** in
Phase 1), and an `index.ts` public API. Their thin route files under
`app/routes/admin/companies/` render the pages from `@/pages/admin/*`. Uses the
domain vocabulary from `CONTEXT.md` (Company, `companyCode`, subscription status).

## Acceptance criteria

- [ ] Both screens live in their page slices, entered via `index.ts`; route files are thin (config + render only).
- [ ] No cross-slice imports and no `admin ↔ company` import; Steiger baseline clean for these slices.
- [ ] `admin-companies.page.test` and `admin-company-detail.page.test` move with their slices and pass.
- [ ] `bun run typecheck && bun run test` green; both screens render identically to before.

## Blocked by

- #0003 — Routing infrastructure + app-shell widget.

## Next

On completion, pick up **#0006 — admin leads + lead-detail pages**.
