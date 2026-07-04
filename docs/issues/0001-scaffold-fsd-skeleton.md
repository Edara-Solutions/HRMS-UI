---
id: 0001
title: Scaffold FSD skeleton + tooling
status: ready-for-agent
labels: [architecture, ready-for-agent]
parent: docs/prd/0001-frontend-fsd-migration.md
blocked_by: []
phase: 1
---

# Scaffold FSD skeleton + tooling

## Parent

PRD [0001 — Migrate frontend to minimal Feature-Sliced Design](../prd/0001-frontend-fsd-migration.md).

## What to build

Establish the FSD layer skeleton and the enforcement tooling so every later
slice has a place to move into and boundaries are checked from the first move.
Create the five layer roots (`app`, `pages`, `widgets`, `features`, `shared`)
and add **per-layer path aliases** (`@/app`, `@/pages`, `@/widgets`,
`@/features`, `@/shared`) in both `tsconfig` and the Vite resolver, keeping the
existing `@/*` alias working during the transition. Add **Steiger** as a dev
dependency, configured to the ADR's decisions (minimal layers, public-API
required, portal isolation), running in `bun run lint` next to Biome in a
**baseline/permissive mode** that reports but does not fail on the pre-existing
structure. No feature code moves in this slice.

## Acceptance criteria

- [ ] `@/app`, `@/pages`, `@/widgets`, `@/features`, `@/shared` resolve in both tsconfig and Vite; existing `@/*` still resolves.
- [ ] `bun run lint` runs Biome **and** Steiger; Steiger is baseline (no failures on the current tree).
- [ ] The five layer directories exist; `frontend-architecture.md` already documents them as the target.
- [ ] `bun run typecheck && bun run test` green — zero behavior change.

## Blocked by

None — can start immediately.

## Next

On completion, pick up **#0002 — Migrate `shared/` layer**. (Everything else is
gated on the enabling slices #0001–#0003.)
