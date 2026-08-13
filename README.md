# HRMS Frontend

React 19, TypeScript 5, Vite 5, TanStack Router, TanStack Query, Zustand, Tailwind v4, and owned shadcn/Radix primitives.

## Scripts

```bash
bun install
bun run dev
bun run typecheck
bun run lint
bun run test
bun run build
```

Quality gates, hooks, and CI policy are documented in
[`docs/automation-workflow.md`](docs/automation-workflow.md).

The OpenAPI snapshot is vendored from the backend into `contracts/` and pinned to
its producing commit. Generate types from it with `bun run openapi:gen` (or
`bun run openapi:vendor` then `bun run openapi:types`). Run `bun run openapi:check`
to reproduce and drift-check generated artifacts without a backend checkout.
