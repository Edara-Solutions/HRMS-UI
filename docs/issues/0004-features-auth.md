---
id: 0004
title: features/auth (change-password interaction)
status: blocked
labels: [architecture, ready-for-agent]
parent: docs/prd/0001-frontend-fsd-migration.md
blocked_by: [0002]
phase: 1
---

# features/auth (change-password interaction)

## Parent

PRD [0001 — Migrate frontend to minimal Feature-Sliced Design](../prd/0001-frontend-fsd-migration.md).

## What to build

Extract the one interaction genuinely used in 2+ places — the change-password
form — into a `features/auth` slice with a public API, consumed by both the
standalone change-password page and the forced-password-change modal. This is
the only `features/` extraction justified today; do not pull anything else down.

## Acceptance criteria

- [ ] `features/auth` exposes the change-password form and the forced-change modal via its `index.ts`.
- [ ] Both consumers import from `@/features/auth`, never internal files.
- [ ] The existing auth tests (`forced-password-change-modal.test`) move with the slice and pass.
- [ ] `bun run typecheck && bun run test` green.

## Blocked by

- #0002 — Migrate shared/ layer.

## Next

On completion, this unblocks **#0008 — Auth/entry pages** (the change-password
page consumes this feature). Continue the admin slices **#0005–#0007** in
parallel if not already done.
