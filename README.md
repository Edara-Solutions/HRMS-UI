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
its producing commit (`PRODUCING_COMMIT`) on the backend branch it tracks
(`PRODUCING_REF`). Re-vendor and regenerate everything with `bun run openapi:gen`,
which needs a backend checkout beside this one — override its location with
`BACKEND_REPO`, and set `BACKEND_REF` when that checkout is detached.

`bun run openapi:check` is the blocking CI gate. It asserts the snapshot carries
provenance, regenerates every artifact derived from it, and fails when any of them
differs from what is committed — no backend checkout required. It deliberately says
nothing about whether the snapshot is *current*: the scheduled
[`contract-refresh`](.github/workflows/contract-refresh.yml) workflow detects that
and opens a pull request, so a stale backend contract never turns an unrelated UI
pull request red. That workflow lives on the default branch because `on: schedule`
fires from nowhere else, and it needs a `CONTRACT_REFRESH_TOKEN` secret that can
read the backend repository.
