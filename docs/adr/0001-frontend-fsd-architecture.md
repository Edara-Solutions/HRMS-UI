# ADR-0001 — Frontend adopts a minimal Feature-Sliced Design, with the backend contract as its domain-type source

> Frontend repo ADR. The cross-cutting/backend ADR log lives at the monorepo
> root (`../../../docs/adr/`); frontend-specific architecture decisions are
> recorded here so they version with this repo.

The frontend is reorganised into a **pragmatic, minimal [Feature-Sliced Design](https://fsd.how) (FSD)**: the layers `app`, `pages`, `shared`, plus `widgets` and `features` only where reuse already exists. The `entities` layer is **deliberately skipped** — domain types come from the backend's generated OpenAPI schema in `shared/api`, not from a hand-built entity layer. Route files become thin, directory-based TanStack Router entries that render page components out of `pages/`. Admin and Company are treated as hard-isolated portal groups in anticipation of a future app split. The operational rules live in [`../frontend-architecture.md`](../frontend-architecture.md); this ADR records *why*.

## Context

The frontend had grown into a feature-folder hybrid that was neither flat nor FSD. Its worst symptom was `src/app/` (45 files) conflating three unrelated concerns — TanStack route definitions (`admin.companies.tsx`), the real page components (`admin-companies.page.tsx`), and layouts — in one flat directory, with **two redundant, inconsistent mechanisms** for excluding non-route files (`.page.tsx` suffix *and* a `-` filename prefix). Adding a screen meant reverse-engineering which convention applied. Domain areas (`admin/`, `company/`, `auth/`) mixed `api`, UI, and models with no import boundaries and no public-API surface, so nothing stopped cross-domain reach-in — a problem given the plan to later split the Admin Portal into a standalone SaaS/CRM app.

Two facts shaped the target. First, the app is a **thin client over a REST API** (~130 files, CRUD-heavy) — the profile for which FSD's own doctrine says "start simple; most projects need only `app` + `pages` + `shared`; thin clients rarely need `entities`." Second, the backend is already clean modular DDD with seven stable bounded contexts (auth, companies, company-configs, leads, plans, rbac, users) exposed via OpenAPI — so the domain model *already exists* on the backend and can be generated into the frontend rather than re-modelled.

## Considered options

- **Full canonical FSD (all six layers now)** — rejected: manufacturing `entities/company`, `entities/lead` etc. that only one portal uses is premature extraction; Steiger's `insignificant-slice` rule flags exactly this, and a shared entity layer would have to be duplicated when Admin splits out anyway.
- **Principles-only, no folder move** — rejected: leaves the `src/app/` route-vs-page conflation (the actual pain) unsolved.
- **A hand-built `entities` layer mirroring the backend contexts** — rejected: FSD explicitly blesses "types in `shared/api`, logic in the slice's `model/`." The generated OpenAPI schema is a better single source of truth than a hand-maintained mirror that would silently drift.
- **Keeping types hand-rolled per slice (status quo)** — rejected: each `api.ts` re-declares `Company`, `SubscriptionStatus`, … by hand, so frontend types drift from the backend contract with no compiler link. The generated schema removes the drift.
- **Big-bang migration** — rejected in favour of an incremental strangler: one slice at a time, typecheck + tests green after each, so the app never breaks and review stays tractable.

## Consequences

- **New layout.** `src/` gains `app/` (routing + providers only), `pages/` (screens, each a slice with a public `index.ts`), `widgets/` (only the app shell today), `features/` (only `auth` forms today), and a reorganised `shared/` (`ui`, `lib`, `api`, `auth`, `i18n`, `config`, `charts`). No `entities/`.
- **Routing inverts cleanly.** TanStack `routesDirectory` moves to `src/app/routes/`, directory-based (folders mirror the URL), and every route file is thin — it renders a page from `@/pages/*` and owns only route config/loaders. The dual `.page.tsx`/`-` exclusion conventions are retired.
- **Import direction is enforced, not just documented.** `app → pages → widgets → features → shared`; no cross-imports between slices on a layer; every slice is entered through its `index.ts`. **Steiger** enforces the architecture and **Biome** stays as formatter/general linter — they are complementary, not substitutes.
- **Domain types become generated.** The `openapi:types` pipeline is fixed so `shared/api/schema.d.ts` is populated from the running backend; slices derive types from it (`components["schemas"]["Company"]`) instead of hand-rolling. This is sequenced as a **second phase** so the folder migration stays low-risk, but the guide mandates generated types for all *new* code from day one.
- **Portal isolation is a first-class rule.** `pages/admin/*` and `pages/company/*` never import each other; portal shells are separate widgets; anything genuinely cross-portal lives only in `shared/`. When Admin splits into its own app, it leaves with its pages + shell + a copy/package of `shared/`.
- **Only dashboards remain placeholder.** Every other slice maps 1:1 to a real backend context; the admin/company dashboards still run on `fixtures.ts` and are migrated last, since they will be restructured when wired to real endpoints.
- **A follow-the-dots guide now exists** ([`../frontend-architecture.md`](../frontend-architecture.md)) that both humans and AI agents load before adding UI, so new features land in the right layer by construction.
