---
id: 0011
title: "Phase 2: generated types from backend OpenAPI"
status: blocked
labels: [architecture, ready-for-agent]
parent: docs/prd/0001-frontend-fsd-migration.md
blocked_by: [0010]
phase: 2
---

# Phase 2: generated types from backend OpenAPI

## Parent

PRD [0001 — Migrate frontend to minimal Feature-Sliced Design](../prd/0001-frontend-fsd-migration.md).

## What to build

Close the frontend↔backend type gap. Fix the `openapi:types` pipeline so
`shared/api/schema.d.ts` is populated from the running backend, then replace the
hand-rolled slice types (`Company`, `Lead`, `SubscriptionStatus`, …) with
`components["schemas"][...]` derivations — one slice at a time, in the same order
as Phase 1. This removes the drift where each `api.ts` re-declares backend types
by hand.

## Acceptance criteria

- [ ] `bun run openapi:types` produces a populated `shared/api/schema.d.ts` from the running backend (documented how to run it).
- [ ] Each migrated slice derives its domain types from the generated schema; no hand-rolled domain types remain.
- [ ] `bun run typecheck && bun run test` green after each slice is retyped.
- [ ] The "types come from the backend" rule in `frontend-architecture.md` is fully realized.

## Blocked by

- #0010 — Flip Steiger to strict + retire legacy patterns (Phase 1 complete).

## Next

Final slice — the migration is done. Then re-evaluate: if any domain type is now
genuinely shared across **3+** slices, reopen the `entities`-layer decision per
ADR-0001 (until then, keep it skipped).
