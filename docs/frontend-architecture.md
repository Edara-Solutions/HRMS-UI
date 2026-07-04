# Frontend Architecture — Feature-Sliced Design (how to add UI)

> **Read this before adding or moving any UI code.** It is the operational
> guide for both humans and AI agents. The *why* is in
> [`docs/adr/0001-frontend-fsd-architecture.md`](adr/0001-frontend-fsd-architecture.md).
> For the TypeScript style, load the `coding-standards` skill; for how UI
> *looks*, load the `edara-hrms-ui` skill. This doc governs **where code goes**.

We use a **pragmatic, minimal [Feature-Sliced Design](https://fsd.how)**.
The guiding rule is FSD's own: **start in `pages/`, extract downward only when
the same code is *already* used in more than one place.** When unsure, keep it
in the page.

---

## 1. The layers we use

Imports may only point **downward** in this list. Never sideways between two
slices on the same layer, never upward.

```
app       → routing, providers, global styles, route guards. No business logic.
pages     → one slice per screen. Owns its UI, forms, modals, data-fetching hooks.
widgets   → large composite blocks reused across many pages. Today: app shell only.
features  → a reusable user interaction used in 2+ places. Today: auth forms only.
shared    → infrastructure with NO business logic: ui kit, lib, api client,
            auth/session, i18n, config, charts. Organised by segment, no slices.
```

**We do not use an `entities` layer.** Domain types come from the backend's
generated OpenAPI schema in `shared/api` (see §5). This is a deliberate
decision — do not create `entities/`.

### Target tree

```
src/
  app/
    routes/            # TanStack routesDirectory — thin route files only
      __root.tsx
      login/index.tsx
      admin/
        route.tsx      # admin portal shell (layout)
        companies/index.tsx        $publicId.tsx
        leads/index.tsx            $publicId.tsx
        dashboard/index.tsx  audit/  plans/  subscriptions/  login/
      company/
        route.tsx      # company portal shell
        dashboard/index.tsx
      accept-invitation/  change-password/  forbidden/
    providers/         # QueryClientProvider, RouterProvider, i18n + theme runtime
    guards/            # route guards (auth/permission gating)
    styles/globals.css
    main.tsx
  pages/
    login/
    admin/{companies,company-detail,leads,lead-detail,dashboard,audit,plans,subscriptions,login}/
    company/dashboard/
    accept-invitation/  change-password/  forbidden/
  widgets/
    app-shell/
  features/
    auth/
  shared/
    ui/  lib/  charts/
    api/               # ky client, query-client, error-mapper, generated schema.d.ts
    auth/              # token/session store, permission checks
    i18n/  config/
```

### A slice's inside (segments)

Every slice in `pages/`, `widgets/`, `features/` is a folder with these
optional segments and **one `index.ts` public API**:

```
pages/admin/companies/
  ui/            # components: the page + its modals, forms, table rows
  api/           # React Query hooks that call the backend for THIS slice
  model/         # slice-local types, zod schemas, small state, derived logic
  lib/           # slice-local helpers
  index.ts       # PUBLIC API — the only file outsiders may import from
```

Use whatever segments you need; a tiny page may be just `ui/` + `index.ts`.

---

## 2. The four hard rules (Steiger enforces these)

1. **Import downward only.** `app → pages → widgets → features → shared`.
2. **No cross-slice imports.** `pages/admin/leads` must not import from
   `pages/admin/companies`. If they must share, push the shared bit down to
   `shared/` (or, rarely, a `feature`/`widget`) — never sideways.
3. **Enter every slice through its `index.ts`.** Import
   `from "@/pages/admin/companies"`, never
   `from "@/pages/admin/companies/ui/CompaniesTable"`.
4. **No business logic in `shared/`.** `shared/` is infrastructure only.
   Domain rules live in the page/feature that owns them.

### Portal isolation (important)

`admin/*` and `company/*` are **separate worlds** that will one day be split
into separate apps. **They must never import from each other.** Anything
genuinely common goes to `shared/`. Each portal has its own shell widget/route.

### File naming

Use **domain-based, kebab-case** names, not technical-role names.
`model/company.ts` ✅ — not `model/types.ts` / `utils.ts` / `fixtures.ts` ❌.

---

## 3. Where does my new code go? (decision tree)

1. **Is it a whole screen / route?** → a new slice in `pages/<portal>/<name>/`,
   wired by a thin route file (see §4). *Default answer for most work.*
2. **Is it used by only this one screen** (a modal, form, table, chart on that
   page)? → keep it *inside that page slice* (`pages/.../ui/`). Do **not**
   pre-extract to `widgets`/`features`.
3. **Is it a generic, business-logic-free UI primitive** (button, input, card,
   dialog)? → `shared/ui/`.
4. **Is it a pure utility** (format date, debounce, classnames)? → `shared/lib/`.
5. **Is it API-client plumbing** (the ky instance, query client, error mapping,
   the generated schema)? → `shared/api/`.
6. **Is it a token/session/permission concern?** → `shared/auth/`.
7. **Is it a large composite block *already* rendered on multiple pages?** →
   `widgets/`. (Today only the app shell qualifies.)
8. **Is it a complete interaction *already* used in 2+ places** (e.g. the
   change-password form used in both a page and a forced-change modal)? →
   `features/`.

> **Golden rule:** when in doubt, keep it in the page. Extraction is a whole-app
> decision; the bar is "already reused," not "might be reused."

---

## 4. Routing: thin files that render pages

We use **directory-based** TanStack Router, `routesDirectory: "src/app/routes"`.
A route file owns **only** route config (params, search schema, loaders,
layout nesting) and renders a page from `@/pages/*`. No screen logic lives in a
route file.

```tsx
// src/app/routes/admin/companies/index.tsx
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AdminCompaniesPage } from "@/pages/admin/companies";

const searchSchema = z.object({
  q: z.string().max(120).optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
});

export const Route = createFileRoute("/admin/companies/")({
  validateSearch: searchSchema.parse,
  component: AdminCompaniesPage,
});
```

- `route.tsx` inside a folder = that folder's layout/shell (e.g.
  `admin/route.tsx` is the admin portal shell).
- `$publicId.tsx` = a dynamic segment.
- `__root.tsx` = the app root.
- The generated `routeTree.gen.ts` is committed output — never edit by hand.

---

## 5. Types come from the backend, not by hand

The backend owns the domain. **Do not hand-roll `Company`, `Lead`,
`SubscriptionStatus`, … in a slice.** Generate them:

```bash
# backend must be running on :3000
bun run openapi:types      # writes src/shared/api/schema.d.ts
```

Then derive slice types from the generated schema:

```ts
import type { components } from "@/shared/api/schema";
type Company = components["schemas"]["Company"];
```

`shared/api/schema.d.ts` is the **single source of domain truth** and maps 1:1
to the backend's bounded contexts (auth, companies, company-configs, leads,
plans, rbac, users). This is why we need no `entities` layer.

Backend↔frontend map (all real except dashboards):

| Backend context | Frontend slice(s)                         |
| --------------- | ----------------------------------------- |
| auth / rbac     | `pages/*/login`, `features/auth`, `shared/auth` |
| companies       | `pages/admin/companies`, `company-detail` |
| company-configs | folded into companies / subscriptions     |
| leads           | `pages/admin/leads`, `lead-detail`        |
| plans           | `pages/admin/plans`                       |
| audit           | `pages/admin/audit`                        |
| *(none yet)*    | `pages/*/dashboard` → still on `fixtures.ts` (placeholder) |

Per-slice **React Query hooks** (`useCompanies`, `useCreateLead`) live in that
slice's `api/` segment and consume the generated types + the shared client.

---

## 6. Worked example — add an "Admin → Departments" screen

1. **Slice:** create `src/pages/admin/departments/` with `ui/`, `api/`,
   `index.ts`.
2. **Types:** if the backend exposes departments, run `bun run openapi:types`
   and use `components["schemas"]["Department"]`. Otherwise define a temporary
   `model/department.ts` and mark it placeholder.
3. **Data:** `api/departments.ts` → `useDepartments()` React Query hook using
   `@/shared/api` client.
4. **UI:** `ui/AdminDepartmentsPage.tsx` (plus any modal/form in the same
   `ui/`). Build it with `edara-hrms-ui` primitives from `@/shared/ui`.
5. **Public API:** `index.ts` → `export { AdminDepartmentsPage } from "./ui/AdminDepartmentsPage";`
6. **Route:** `src/app/routes/admin/departments/index.tsx` — thin, renders
   `AdminDepartmentsPage` from `@/pages/admin/departments`.
7. **Verify:** `bun run typecheck && bun run lint && bun run test`. `lint`
   includes Steiger, which will fail if you crossed a layer or skipped a
   public API.

---

## 7. Checklist before you commit UI

- [ ] Screen lives in `pages/<portal>/<name>/`, entered via its `index.ts`.
- [ ] No cross-slice or upward imports; no `admin ↔ company` import.
- [ ] Single-use blocks stayed in the page (didn't pre-extract to widgets/features).
- [ ] Domain types come from `@/shared/api/schema`, not hand-rolled.
- [ ] Route file is thin (config + render page only).
- [ ] Domain-based kebab-case filenames (no `types.ts`/`utils.ts`).
- [ ] `bun run typecheck && bun run lint && bun run test` all green.

---

## 8. Enforcement

- **Steiger** — the FSD architecture linter. Checks import direction, public-API
  violations, `insignificant-slice`, `excessive-slicing`. Runs in `bun run lint`.
- **Biome** — formatter + general linter (unchanged). Complementary to Steiger,
  not a substitute.
- **TypeScript** — the generated schema makes backend-contract drift a compile
  error.

---

## 9. Glossary

- **Layer** — one of `app / pages / widgets / features / shared`. Fixed set,
  fixed import order.
- **Slice** — a self-contained unit inside a layer (one screen in `pages`, one
  block in `widgets`). Has a public API.
- **Segment** — a folder inside a slice grouping code by technical role:
  `ui / api / model / lib`.
- **Public API** — a slice's `index.ts`; the only import surface outsiders may
  use.
- **Portal** — one of the two isolated worlds: **Admin** (operator CRM/SaaS
  management) and **Company** (tenant/employee app). See root `CONTEXT.md` for
  the domain language. Portals never import each other.
- **Placeholder slice** — a screen still running on `fixtures.ts` demo data
  because its backend endpoints aren't wired yet (currently: the dashboards).
