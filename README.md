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

The OpenAPI type generation script currently targets `http://localhost:3000/api/v1/openapi.json`.
