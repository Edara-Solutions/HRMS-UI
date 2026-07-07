---
id: 0001
title: Migrate frontend to minimal Feature-Sliced Design
status: ready-for-agent
labels: [enhancement, architecture, ready-for-agent, phased]
created: 2026-07-04
adr: docs/adr/0001-frontend-fsd-architecture.md
guide: docs/frontend-architecture.md
---

# Migrate frontend to minimal Feature-Sliced Design

> **Agent preamble.** Before touching code, read
> [`docs/adr/0001-frontend-fsd-architecture.md`](../adr/0001-frontend-fsd-architecture.md)
> (the *why*) and [`docs/frontend-architecture.md`](../frontend-architecture.md)
> (the *how* — target tree, rules, decision tree). Load the `coding-standards`
> and `feature-sliced-design` skills. This issue is the spec; those documents
> are the reference. Work **one slice at a time** and keep the build green after
> each — see Testing Decisions.

## Problem Statement

As a developer or AI agent adding a UI feature to this frontend, I cannot tell
where new code belongs. `src/app/` mixes three unrelated things in one flat
folder — TanStack route definitions (`admin.companies.tsx`), the real screen
components (`admin-companies.page.tsx`), and layouts — and excludes non-route
files with **two inconsistent conventions at once** (a `.page.tsx` suffix *and*
a `-` filename prefix). Domain folders (`admin/`, `company/`, `auth/`) mix data
access, UI, and models with no import boundaries and no public entry point, so
any file can reach into any other. Domain types like `Company` and `Lead` are
hand-typed in each `api.ts` and silently drift from the backend contract. The
result: every change means reverse-engineering local conventions, AI agents
place code inconsistently, and Admin and Company code are entangled — which
blocks the planned split of the Admin Portal into a standalone SaaS/CRM app.

## Solution

Reorganise the frontend into a **pragmatic, minimal Feature-Sliced Design**, as
decided in ADR-0001. A developer or agent adding UI follows one documented
decision tree; boundaries are enforced by a linter, not tribal knowledge; and
the Admin Portal and Company Portal become hard-isolated so the future split is
a lift-out rather than an untangling.

Concretely:

- Introduce the layers **`app` / `pages` / `widgets` / `features` / `shared`**
  (no `entities`), with a strict downward import rule and a public `index.ts`
  per slice.
- Split `src/app/` into **routing/providers only** (`app/`) and **screens**
  (`pages/<portal>/<slice>/`), with thin, **directory-based** TanStack route
  files that render a page from `@/pages/*`.
- Treat **Admin** and **Company** as isolated portal groups that never import
  each other; cross-portal code lives only in `shared/`.
- Make the backend's generated **OpenAPI schema the single source of domain
  types**, replacing hand-rolled types.
- Enforce the architecture with **Steiger**, keeping **Biome** as the
  formatter/general linter.

Delivered in two phases: **Phase 1** = the folder migration (carry existing
hand-rolled types as-is); **Phase 2** = fix the type-generation pipeline and
replace hand-rolled types slice-by-slice.

## User Stories

**Placing code**

1. As a frontend developer, I want one documented decision tree for "where does
   this code go", so that I stop guessing between conventions.
2. As an AI agent, I want a machine-readable guide (`frontend-architecture.md`)
   linked from `CLAUDE.md`/`AGENTS.md`, so that I place new UI in the correct
   layer without asking.
3. As a developer, I want each screen to be a self-contained `pages/` slice with
   a public `index.ts`, so that I know exactly what is safe to import.
4. As a developer, I want single-use modals, forms, tables, and charts to live
   inside their page slice, so that I am not tempted to over-extract.
5. As a developer, I want a large block that is *already* reused across pages
   (the app shell) to live in `widgets/`, so that shared composition has a home.
6. As a developer, I want an interaction *already* used in 2+ places (the
   change-password form, used by a page and a forced-change modal) to live in
   `features/auth`, so that it is defined once.

**Routing**

7. As a developer, I want route files to contain only route config and to render
   a page from `@/pages/*`, so that screen logic never hides inside routing.
8. As a developer, I want directory-based routes whose folders mirror the URL,
   so that the route tree is scannable and the Admin/Company split is visible.
9. As a developer, I want the old `.page.tsx`-suffix and `-`-prefix exclusion
   conventions retired, so that there is exactly one way a file becomes a route.
10. As a developer, I want a portal shell expressed as a `route.tsx` layout, so
    that Admin and Company each have one obvious layout entry point.

**Boundaries & portal isolation**

11. As a developer, I want imports to only point downward
    (`app → pages → widgets → features → shared`), so that dependencies stay acyclic.
12. As a developer, I want cross-slice imports on the same layer to fail lint,
    so that slices stay independent.
13. As a maintainer of the future Admin app, I want `pages/admin/*` and
    `pages/company/*` to never import each other, so that the split is a
    lift-out, not a refactor.
14. As a developer, I want every slice entered only through its `index.ts`, so
    that internal files can be reorganised without breaking consumers.

**Types & backend integration**

15. As a developer, I want domain types generated from the backend OpenAPI
    schema into `shared/api`, so that frontend types cannot drift from the
    contract.
16. As a developer, I want each slice's data-fetching (React Query hooks) in its
    `api/` segment consuming the generated types, so that data access is
    co-located with the screen that uses it.
17. As a developer, I want the frontend slice names to mirror the backend
    bounded contexts (companies, leads, plans, company-configs, auth), so that
    crossing the stack is a 1:1 mapping.
18. As a developer, I want dashboards (the only slices with no backend endpoints)
    clearly marked as placeholder on `fixtures.ts`, so that I know they are
    intentionally unfinished.

**Enforcement & docs**

19. As a tech lead, I want Steiger to run in `bun run lint`, so that boundary
    violations block CI rather than reaching review.
20. As a developer, I want Biome retained for formatting and general lint, so
    that adding Steiger does not cost me my formatter.
21. As an AI agent, I want a pre-commit checklist in the guide, so that I can
    self-verify placement before committing.
22. As a new contributor, I want an ADR explaining *why* the architecture is
    shaped this way, so that I do not "fix" a deliberate decision (e.g. the
    absence of `entities/`).

**Migration safety**

23. As a reviewer, I want the migration delivered one slice per commit, so that
    each diff is small and reviewable.
24. As a developer, I want `typecheck` + tests green after every slice move, so
    that the app never breaks mid-migration.
25. As a developer, I want API-backed slices migrated before placeholder
    dashboards, so that the risky-but-stable work happens while the net is
    strongest and the churn-prone dashboards move last.

## Implementation Decisions

Refer to `frontend-architecture.md` for the concrete target tree; this section
records the decisions, not the file paths (which the guide owns).

**Layers.** Adopt `app`, `pages`, `widgets`, `features`, `shared`. Do **not**
create `entities` — this is a deliberate decision recorded in the ADR; the
generated OpenAPI schema in `shared/api` is the domain-type layer.

**`src/app/` decomposition.** Split the current 45-file `src/app/` into:
- `app/routes/` — thin TanStack route files (route config, search/param
  schemas, loaders, layout nesting) that render a page from `@/pages/*`.
- `app/providers/` — QueryClient, Router, and i18n/theme runtime wiring.
- `app/guards/` — route/permission guards (moved from `auth/guards.tsx`).
- The actual screens move out to `pages/<portal>/<slice>/`.

**Routing.** Set the TanStack `routesDirectory` to `src/app/routes` and use
**directory-based** routing (folders mirror the URL). A folder's `route.tsx` is
its layout/shell; `$param.tsx` is a dynamic segment; `__root.tsx` is the root.
Retire the `.page.tsx`-suffix and `-`-prefix exclusion patterns from
`vite.config.ts`. `routeTree.gen.ts` remains generated output.

**Slice anatomy.** Each `pages`/`widgets`/`features` slice is a folder with
optional `ui/`, `api/`, `model/`, `lib/` segments and **exactly one `index.ts`
public API**. Outsiders import only from `index.ts`. Filenames are
domain-based kebab-case (no `types.ts`/`utils.ts`/`fixtures.ts` — rename the
latter to a domain name when a slice is wired to real data).

**Portal isolation.** `pages/admin/*` and `pages/company/*` must never import
each other. Each portal has its own shell (a widget rendered via its
`route.tsx`). Genuinely cross-portal code goes to `shared/`.

**`shared/` reorganisation.** `shared/` holds infrastructure only, organised by
segment: `ui`, `lib`, `charts`, `api` (the ky client, query-client,
error-mapper, and the generated `schema.d.ts`), `auth` (token/session store +
permission checks), `i18n`, `config` (the preferences store). No business logic
in `shared/`.

**Feature/widget extraction (conservative).** Only two extractions are
justified today: `widgets/app-shell` (used by every page) and `features/auth`
(the change-password form, used by both a page and the forced-change modal).
Everything else — including all dashboard blocks — stays in its page slice until
a *second, current* consumer appears.

**Backend↔frontend mapping.** Frontend slices mirror backend bounded contexts
1:1 where they exist: auth/rbac → `features/auth` + `shared/auth` + login pages;
companies + company-configs → `pages/admin/companies` and `company-detail`;
leads → `pages/admin/leads` and `lead-detail`; plans → `pages/admin/plans`;
audit (served under `/auth`) → `pages/admin/audit`. Dashboards have no backend
context and remain placeholder slices on `fixtures.ts`.

**Type generation (Phase 2).** Fix the `openapi:types` script so
`shared/api/schema.d.ts` is populated from the running backend, then replace
hand-rolled slice types with `components["schemas"][...]` derivations,
one slice at a time. No *new* hand-rolled domain types may be added from the
start of Phase 1.

**Enforcement.** Add Steiger as a dev dependency and run it over `src/` as part
of `bun run lint`; keep Biome as the formatter/general linter. Configure Steiger
to the decisions above (minimal layers, public-API required, portal isolation).

Three tools cooperate with **strictly disjoint ownership** — every concern has
exactly one owner, so they never double-report or conflict (see the ownership
table in `frontend-architecture.md` §8):
- **Biome** owns formatting + general TypeScript lint only. It owns **zero
  React or accessibility rules** (`domains.react: "none"`, `a11y.recommended:
  false`) so it cannot overlap react-doctor. Severity is binary — every rule is
  `error` or `off`, never `warn` (a non-blocking warning is noise that never
  gets fixed). This tuned, calm config is what makes Biome viable here; a stray
  commit once removed Biome entirely on the mistaken premise that Steiger
  replaced it — it does not (Steiger is architecture-only), and Biome was
  restored with this disjoint config.
- **Steiger** owns FSD architecture (import direction, public API, portal
  isolation). Blocking, in `bun run lint`.
- **react-doctor** owns all React semantics (hooks, a11y, perf, component
  health) as an advisory post-work scan — never in the blocking gate. No React
  or a11y rule may be added to Biome; it belongs to react-doctor.

**Sequencing.**
- *Phase 1 — structural migration (this issue's core):* scaffold the layer
  folders, then move slices incrementally in this order: (a) `shared/` reorg and
  `app/` split; (b) API-backed admin slices — companies, company-detail, leads,
  lead-detail, plans, audit; (c) auth (`features/auth`, `shared/auth`, guards);
  (d) login/accept-invitation/change-password/forbidden; (e) placeholder
  dashboards last. Carry existing hand-rolled types unchanged.
- *Phase 2 — generated types:* fix pipeline, then retype slices in the same
  order.

## Testing Decisions

**What makes a good test here.** This is a **behavior-preserving** migration:
tests exist to prove behavior did **not** change while files moved. A good test
asserts **external behavior** (what the user sees / what the screen does through
its public surface), never internal structure or file location. Because the
migration only relocates files and rewrites import paths, *green existing tests
after a move = behavior preserved.*

**Behavioral regression seam (existing, highest available).** The colocated
Vitest + Testing Library suite is the safety net:
`bun run typecheck && bun run test` must pass after **every** slice move. These
tests travel with their slice; only their import paths change. Prior art already
covers the critical screens — `admin-companies.page.test.tsx`,
`admin-company-detail.page.test.tsx`, `admin-lead-detail.page.test.tsx`,
`admin-leads.page.test.tsx`, `login.page.test.tsx`,
`admin-login.page.test.tsx`, the leads modal tests, `auth/guards.test.ts`,
`auth/permissions.test.ts`, and the `shared/ui` primitive tests. Do **not**
write new behavioral tests for the move itself; do update these tests' imports
and locations to match their new slice.

**Architecture-conformance seam (one new seam, highest point).** **Steiger**
over `src/` is the single new seam. It asserts the migration's *goal* rather
than behavior: import direction, public-API violations, no `admin ↔ company`
cross-imports, `insignificant-slice`, `excessive-slicing`. It runs in
`bun run lint` and must be clean at the end of each phase.

**Modules under test.** The existing page/component/guard/permission tests
(unchanged in intent, moved with their slices) plus the whole-`src/` Steiger
check. No module needs a *new* behavioral test as part of this migration.

**Optional (not a required gate).** Extending `tests/e2e/foundation.spec.ts`
(Playwright) with a login + one admin CRUD smoke is a valuable, structure-
agnostic net, but it is **out of the required per-slice gate** so the refactor
is not blocked on E2E authoring.

## Out of Scope

- Any change to how the UI **looks** or behaves — no visual redesign, no new
  screens, no new user-facing features. Pixels and flows stay identical.
- Backend changes of any kind (the OpenAPI contract is consumed, not modified).
- Building out the placeholder **dashboards** into real, API-backed screens.
- Expanding the **Playwright E2E** suite (optional recommendation only).
- The physical **split of the Admin Portal into a separate app** — this
  migration only makes that split cheap; it does not perform it.
- Introducing an **`entities`** layer (explicitly rejected in the ADR).

## Further Notes

- Authoritative references: [`docs/adr/0001-frontend-fsd-architecture.md`](../adr/0001-frontend-fsd-architecture.md)
  (rationale) and [`docs/frontend-architecture.md`](../frontend-architecture.md)
  (operational rules, decision tree, worked example, checklist, glossary).
- Domain vocabulary (Admin Portal, Company Portal, Lead, Company, Convert,
  Owner, `companyCode`, `employeeCode`) is defined in the monorepo-root
  `CONTEXT.md` and must be used consistently in slice and route names.
- The backend's clean modular DDD (contexts: auth, companies, company-configs,
  leads, plans, rbac, users) is the reason the frontend can skip `entities` and
  still have a rigorous domain model — via the generated schema.
- Follow the repo's commit convention: one focused, one-line commit per slice;
  run `react-doctor` after frontend work.
- **Derived issues:** this PRD is broken into 11 vertical-slice issues in
  [`../issues/`](../issues/README.md) (`0001`–`0011`). Implement them top-down
  following each issue's `## Next` pointer; only `0001` is startable immediately.
