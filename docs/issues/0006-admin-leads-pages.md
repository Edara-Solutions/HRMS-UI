---
id: 0006
title: Migrate admin leads + lead-detail pages
status: blocked
labels: [architecture, ready-for-agent]
parent: docs/prd/0001-frontend-fsd-migration.md
blocked_by: [0003]
phase: 1
---

# Migrate admin leads + lead-detail pages

## Parent

PRD [0001 — Migrate frontend to minimal Feature-Sliced Design](../prd/0001-frontend-fsd-migration.md).

## What to build

Migrate the **Leads** list and **Lead** detail screens end-to-end into
`pages/admin/leads` and `pages/admin/lead-detail`, including their modals/forms
(convert-lead, create-lead, edit-lead, lead-contact-form, log-activity),
mirroring #0005's slice shape. Preserve **Convert** behavior exactly — Convert is
the single Lead→Company transition and is governed by the repo-root ADR-0001
(`convert provisions a complete tenant`); this migration must not alter its
semantics.

## Acceptance criteria

- [ ] Both screens and all five modals/forms live in their page slices with public APIs; route files are thin.
- [ ] Convert, contacts, and activities behavior unchanged.
- [ ] The five leads modal tests plus `admin-leads.page.test` and `admin-lead-detail.page.test` move with their slices and pass.
- [ ] `bun run typecheck && bun run test` green.

## Blocked by

- #0003 — Routing infrastructure + app-shell widget.

## Next

On completion, pick up **#0007 — remaining admin pages (plans, audit, subscriptions)**.
