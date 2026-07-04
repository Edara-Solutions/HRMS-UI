---
id: 0010
title: Flip Steiger to strict + retire legacy patterns
status: blocked
labels: [architecture, ready-for-agent]
parent: docs/prd/0001-frontend-fsd-migration.md
blocked_by: [0005, 0006, 0007, 0008, 0009]
phase: 1
---

# Flip Steiger to strict + retire legacy patterns

## Parent

PRD [0001 — Migrate frontend to minimal Feature-Sliced Design](../prd/0001-frontend-fsd-migration.md).

## What to build

With every slice moved, switch **Steiger from baseline to strict** (fail the
build on any violation) in `bun run lint`, remove the transitional
`routeFileIgnorePattern` (`.page.tsx` / `-layout`) exclusions from the Vite
config, drop the transitional catch-all `@/*` alias if it is no longer needed,
and confirm the whole tree conforms. This is the gate that declares **Phase 1
complete**.

## Acceptance criteria

- [ ] Steiger runs in strict mode in `bun run lint` and passes cleanly over `src/`.
- [ ] `.page.tsx` / `-`-prefix exclusion patterns removed from the Vite config; no orphaned files remain.
- [ ] `insignificant-slice` and `excessive-slicing` are clean, or any exception is documented in code per the ADR.
- [ ] `bun run typecheck && bun run test && bun run test:e2e` green.

## Blocked by

- #0005, #0006, #0007, #0008, #0009 — all page slices migrated (transitively #0003).

## Next

**Phase 1 is complete.** Begin Phase 2 with **#0011 — Generated types from the
backend OpenAPI schema**.
