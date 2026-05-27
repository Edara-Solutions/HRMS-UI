# HRMS Frontend UI Plan — v1

> Revision of [FE-Plan.md](./FE-Plan.md) that locks the runtime/build stack, adds internationalization with RTL, deployment, folder structure, motion and chart libraries, and a phased delivery plan. Original sections that were already strong (contract risks, permission model, per-screen specs) are preserved with naming and library references made explicit.

## Summary

- Build the HRMS frontend as a React 19 + TypeScript single-page application bundled by Vite, deployed as static assets to a CDN, talking to the existing Fastify backend on a separate server.
- Use [hrms-system-design-navy.md](../../hrms-system-design-navy.md) as the visual and interaction authority. shadcn/ui primitives are the component foundation but are owned in-repo and heavily restyled to the navy design tokens so the product reads as bespoke rather than off-the-shelf.
- Optimize for a calm HRMS product: warm light background, navy primary accent, low visual noise, dense readable tables, drawer-based record editing, and consistent workflows across modules.
- Ship bilingual (English and Arabic) with full RTL support from day one.
- Split the product into two clear portal contexts:
  - Company Portal: tenant-scoped HR operations.
  - SaaS Admin Portal: platform CRM, subscriptions, plans, and tenant management.
- Greenfield repository or workspace. Do not extend any prior frontend code.

## Frontend Tech Stack (Locked)

These choices are locked. Do not substitute without an explicit decision review.

- Runtime and build:
  - Package manager: Bun, to match the backend toolchain.
  - Build tool: Vite 5.
  - Language: TypeScript 5.
  - Framework: React 19.
- Routing and data:
  - Routing: TanStack Router with file-based routes and fully typed search params.
  - Server state: TanStack Query v5.
  - UI and module-local state: Zustand. One persisted store for auth, one persisted store for UI preferences (theme, locale, sidebar), and per-module stores for ephemeral filters or selection only when URL params are not appropriate.
  - URL search params are the source of truth for table filters, sort, pagination, and active tabs.
- UI:
  - Component foundation: shadcn/ui primitives on Radix, owned in-repo and restyled to the navy tokens.
  - Styling: Tailwind v4 with a single tokens file driven by the design doc.
  - Icons: lucide-react.
  - Motion: Framer Motion, configured to respect `prefers-reduced-motion`. No bounce or celebratory easing.
- Data presentation:
  - Tables: TanStack Table v8, headless, styled in-repo. Server-side pagination, sorting, filtering. Virtualized rows for large lists.
  - Charts: ApexCharts via `react-apexcharts`, themed centrally to the navy palette with muted gridlines and at most two semantic supporting series.
  - Dates: `date-fns` plus `date-fns-tz`.
- Forms and validation:
  - React Hook Form plus Zod. Map backend 422 errors back to fields.
- API:
  - HTTP client: `ky` with a single instance, request and response hooks for `Authorization`, 401 → refresh, and error normalization.
  - Generated types: `openapi-typescript` over the backend OpenAPI to produce `src/api/schema.d.ts` in CI.
- Internationalization:
  - `i18next` plus `react-i18next` plus `i18next-http-backend`, with namespaces lazy-loaded per route. See the Internationalization And RTL section.
- Quality and testing:
  - Lint and format: Biome, mirroring the backend toolchain.
  - Unit and component: Vitest plus Testing Library.
  - Integration: Vitest plus MSW.
  - End-to-end and visual regression: Playwright, with parallel snapshots in LTR and RTL.
- Deployment:
  - Static SPA build produced by Vite. See the Deployment And Build section.

## Design System Direction

- Use the navy design doc as the UI source of truth:
  - Light-first interface.
  - Background: `#F7F6F2`.
  - Surface: `#FBFBF8`.
  - Secondary surface: `#F1EEE8`.
  - Border: `#D9D5CD`.
  - Text: `#22211D`.
  - Muted text: `#6E6B64`.
  - Faint text: `#A29E95`.
  - Primary navy: `#123A6F`.
  - Primary hover: `#0E2F5A`.
  - Primary soft: `#DDE8F5`.
  - Success: `#3E7B4E`.
  - Warning: `#A56A16`.
  - Danger: `#B34557`.
  - Info: `#356FA8`.
- Configure Tailwind/shadcn theme tokens to reflect these values rather than using generic shadcn defaults.
- Dark mode can use the dark palette from the design doc, but the first implementation is light-first.
- Visual direction weighting:
  - 70 percent Linear: spacing discipline, restrained chrome, minimal surfaces.
  - 20 percent Stripe Dashboard: data clarity, numeric precision, strong tables.
  - 10 percent modern HR tools: people-centered workflows, approachable empty states, profile structures.
- Component radius:
  - `sm`: `6px`.
  - `md`: `8px`.
  - `lg`: `12px`.
  - `xl`: `16px`.
- Shadow usage:
  - Subtle borders for panels and tables.
  - `shadow-sm` for dropdowns.
  - `shadow-md` for dialogs, sheets, and drawers.
  - Avoid heavy elevation on normal content containers.
- Do not use:
  - Gradient-heavy product surfaces.
  - Purple-blue startup gradients.
  - Colorful icon circles on every card.
  - Heavy drop shadows on every panel.
  - Pure white full-screen glare.
  - Decorative dashboard tiles that look like marketing cards.
  - Playful motion in payroll, approvals, audit, or performance-style workflows.

## Typography

- The design doc declares Inter as the primary product font. Inter is canonical and must be the default in the implementation.
- Optional secondary choices reviewed during planning, kept here only as fallback options if a future visual review chooses to deviate. They are not the default:
  - Geist Sans: slightly more modern and precise.
  - IBM Plex Sans: more institutional and enterprise.
  - Source Sans 3, Public Sans, Manrope, DM Sans, Plus Jakarta Sans: alternatives if a calmer or warmer feel is required later.
- Primary stack (default):
  - `font-family: Inter, ui-sans-serif, system-ui, sans-serif;`
- Arabic pairing for RTL:
  - Inter pairs with `Noto Sans Arabic` or `IBM Plex Sans Arabic`. Default pairing is Inter + Noto Sans Arabic.
- Font rules:
  - One font family across the product.
  - Prefer weight contrast over font contrast.
  - No separate display font for product UI.
  - Use tabular numbers (`font-variant-numeric: tabular-nums`) for money, counts, analytics, audit timestamps, balances, and numeric table columns.
  - Keep line length short inside settings, drawers, and modals.
  - Labels are concise and stable across modules.
- Type scale (per the design doc):
  - Page title: 28–32 / semibold.
  - Section title: 20–24 / semibold.
  - Card title: 16–18 / semibold.
  - Body: 14–16 / regular.
  - Secondary UI text: 13–14 / medium.
  - Tiny labels and metadata: 12 / medium.

## Internationalization And RTL

- Two locales bootstrapped at launch: `en` and `ar`. Both are first-class.
- Stack:
  - `i18next` plus `react-i18next` plus `i18next-http-backend`.
  - Namespaces per module: `common`, `auth`, `people`, `roles`, `sessions`, `leads`, `companies`, `plans`, `pricing`, `audit`, and so on. Loaded lazily by route.
  - Locale source of truth: persisted Zustand `prefs` store, optionally hydrated from a future backend user preference endpoint.
- Direction handling:
  - On locale change, set `document.documentElement.dir` to `rtl` for Arabic and `ltr` for English, and set `lang` accordingly.
  - All custom Tailwind utilities use logical properties: `ps-*`, `pe-*`, `ms-*`, `me-*`, `text-start`, `text-end`, `border-s-*`, `border-e-*`. No `pl-`, `pr-`, `ml-`, `mr-`, `text-left`, `text-right` in product code.
  - Icon flipping: explicitly flip directional icons (chevrons, arrows, breadcrumbs) using a small `DirectionalIcon` wrapper; do not flip iconography that has fixed orientation (logos, brand marks, charts).
- Numbers, dates, money:
  - Money and counts always render LTR digits even in Arabic prose. Wrap numeric spans in `<bdi>` and apply `font-variant-numeric: tabular-nums`.
  - Use `Intl.NumberFormat` and `Intl.DateTimeFormat` keyed off the active locale. Always honor the backend-provided `money.formattedAmount` when available.
  - Dates in dense tables use ISO-style numeric formatting; long-form dates follow the locale.
- ApexCharts:
  - Mirror category order for Arabic when category axes carry direction.
  - Tooltip number formatting always follows the active locale; do not hard-code `en-US`.
- Translation pipeline:
  - JSON catalogs under `src/i18n/locales/{lng}/{ns}.json`.
  - Missing-key handler logs once per session in development and falls back to the English string in production.
  - Pluralization through i18next; do not concatenate count + string.
- Testing:
  - Snapshot the app shell and every primary module page in both EN/LTR and AR/RTL.
  - Add unit tests that assert no `pl-`, `pr-`, `ml-`, `mr-`, `text-left`, `text-right` utilities appear in shipped components (lint rule plus test guard).

## shadcn/UI Foundation

- Use shadcn/ui as owned source components, not as a black-box component library.
- Start with these primitives:
  - Layout: `Sidebar`, `Sheet`, `ScrollArea`, `Separator`.
  - Forms: `Form`, `Input`, `Textarea`, `Select`, `Checkbox`, `Switch`, `Calendar`, `Popover`.
  - Data: `Table`, `Badge`, `Tabs`, `Pagination`, `Skeleton`.
  - Actions: `Button`, `DropdownMenu`, `Command`, `Tooltip`.
  - Feedback: `Dialog`, `AlertDialog`, `Drawer`, `Sonner`.
- Reference documentation:
  - [Sidebar](https://ui.shadcn.com/docs/components/sidebar)
  - [Data Table](https://ui.shadcn.com/docs/components/data-table)
- Customize shadcn variants so the HRMS design system owns the final look:
  - Primary buttons: solid navy background with white text.
  - Secondary buttons: warm neutral surface with subtle border.
  - Ghost buttons: transparent, with subtle hover.
  - Destructive buttons: only inside danger flows.
  - Badges: low-saturation fills with readable text.
  - Inputs: soft fill, neutral border, navy focus ring.
  - Tabs: calm active state using primary soft or navy underline.
  - Tables: neutral row hover and sticky headers for long lists.
- Build higher-level app components on top of shadcn primitives:
  - `AppShell`.
  - `PageHeader`.
  - `ModuleTabs`.
  - `FilterBar`.
  - `DataToolbar`.
  - `BulkActionBar`.
  - `RecordDrawer`.
  - `ConfirmDialog`.
  - `StatusBadge`.
  - `MoneyText`.
  - `EmptyState`.
  - `PermissionGate`.
  - `PageErrorState`.
  - `PageLoadingState`.
  - `TableEmptyState`.
  - `LocaleSwitcher`.
  - `DirectionalIcon`.

## App Shell

- Desktop layout:
  - Fixed left sidebar (start side; flips to right under RTL via logical layout).
  - Top utility bar with global search, notifications placeholder, workspace/company context, locale switcher, and user menu.
  - Main content as the only primary scroll region.
  - Page outer padding between `24px` and `32px`.
- Mobile layout:
  - Sidebar collapses into a shadcn `Sheet`.
  - High-frequency local navigation uses tabs or segmented controls.
  - Tables get horizontal scroll and compact row actions.
  - Touch targets at least `44px`.
- Company Portal navigation:
  - Dashboard.
  - People.
  - Roles.
  - Sessions.
  - Company Settings.
  - Audit, only if `audit:read` is granted.
- SaaS Admin Portal navigation:
  - Leads.
  - Companies.
  - Subscriptions.
  - Plans.
  - Pricing.
  - Audit.
- Future modules from the design doc are not surfaced in active navigation until backend APIs exist. Tracked but hidden:
  - Time Off, Attendance, Payroll, Recruitment beyond current leads pipeline, Onboarding, Performance, Documents, Approvals, Reports.
- Breadcrumbs:
  - Only for deep nested views.
  - Not on every page by default.
- Each module page surfaces one clear primary action.

## Folder Structure

```
src/
├── app/                         # TanStack Router file-based routes
│   ├── __root.tsx               # Providers, suspense and error boundaries
│   ├── (auth)/                  # Public routes
│   │   ├── login.tsx
│   │   ├── accept-invitation.tsx
│   │   └── change-password.tsx
│   ├── (company)/               # Company Portal, JWT + tenant guarded
│   │   ├── _layout.tsx
│   │   ├── dashboard.tsx
│   │   ├── people/
│   │   ├── roles/
│   │   ├── sessions/
│   │   ├── settings/
│   │   └── audit/
│   └── (admin)/                 # SaaS Admin Portal, platform-admin guarded
│       ├── _layout.tsx
│       ├── leads/
│       ├── companies/
│       ├── subscriptions/
│       ├── plans/
│       ├── pricing/
│       └── audit/
├── modules/                     # Domain logic per module
│   └── people/
│       ├── api.ts               # TanStack Query hooks
│       ├── schemas.ts           # Zod schemas
│       ├── types.ts             # Inferred types
│       ├── columns.tsx          # TanStack Table column defs
│       ├── components/
│       └── stores/              # Zustand UI stores when URL params do not fit
├── shared/
│   ├── ui/                      # Owned shadcn primitives
│   ├── components/              # AppShell, PageHeader, DataTable, KpiCard, ...
│   ├── layouts/
│   ├── hooks/                   # useDebounce, useMediaQuery, useDirection, ...
│   ├── lib/                     # cn, formatters, money, date, bidi helpers
│   └── icons/
├── api/
│   ├── client.ts                # ky instance
│   ├── auth-interceptor.ts      # 401 → refresh → retry, single-flight
│   ├── error-mapper.ts          # AppError discriminated union
│   ├── schema.d.ts              # Generated from OpenAPI in CI
│   └── query-client.ts          # TanStack Query defaults
├── auth/
│   ├── store.ts                 # Zustand persisted auth state
│   ├── state-machine.ts         # anonymous → authenticating → ...
│   ├── guards.tsx               # Route beforeLoad guards
│   ├── must-change-password.tsx
│   └── permissions.ts           # RBAC helpers mirroring backend permission strings
├── i18n/
│   ├── config.ts
│   ├── direction.ts
│   └── locales/{en,ar}/{common,auth,people,...}.json
├── theme/
│   ├── tokens.ts                # Mirrors hrms-system-design-navy.md frontmatter
│   ├── tailwind.preset.ts
│   └── apex.theme.ts            # ApexCharts theme
├── styles/
│   └── globals.css              # Tailwind layers, fonts, base reset
└── main.tsx
```

## Routing And Auth Guards

- Route groups separate portals:
  - `(auth)`: public.
  - `(company)`: requires authenticated tenant user. `beforeLoad` enforces JWT presence, redirects on `mustChangePassword`, and resolves permission gates declared on each route.
  - `(admin)`: requires platform admin context.
- Typed search params for every list page (status, query, page, pageSize, sort). Validated by Zod schemas so deep-linked URLs are guaranteed to be valid.
- Permission gates are declarative per route, referencing the backend permission strings listed in Permission Model.
- 401 from the API does not unmount the current route; the auth interceptor refreshes and retries. Only refresh failure clears tokens and routes to `/login`.
- A `mustChangePassword` user can only reach `/auth/me` and `/auth/change-password`. Any other route resolves a redirect to `/auth/change-password`.

## API Integration Foundation

- One API client around the backend base URL from [frontend-integration-guide.md](./frontend-integration-guide.md).
- The `ky` instance centralizes:
  - `Authorization: Bearer <accessToken>`.
  - JSON `Content-Type`.
  - Token refresh on `401` with a single-flight refresh promise to prevent thundering herd.
  - Replay of the original request after a successful refresh, exactly once.
  - Logout and redirect on refresh failure.
  - `429` backoff handling.
  - Validation and conflict error normalization into a typed `AppError` discriminated union.
- Token lifecycle:
  - `POST /auth/login` returns `accessToken`, `refreshToken`, `sessionId`, `expiresIn`, and `mustChangePassword`.
  - `POST /auth/refresh` rotates tokens and returns a new access token and refresh token.
  - Old refresh tokens are invalidated after rotation; refresh replay revokes the token family. The UI clears auth state and redirects to login on refresh failure.
- Public routes (no `Authorization` header):
  - `POST /auth/login`, `POST /auth/refresh`, `POST /auth/accept-invitation`, `GET /health`.
- Protected routes:
  - Always send `Authorization`.
  - Missing or invalid JWT is treated as `401`.
  - Tenant mismatch surfaces as `404` (the backend deliberately returns 404 to prevent resource discovery).
- Error handling model:
  - `400`: schema validation, field- or form-level error.
  - `401`: refresh token or redirect to login.
  - `403`: permission denied or password-change gate.
  - `404`: not-found state.
  - `409`: conflict state.
  - `422`: domain validation, mapped to RHF field errors.
  - `429`: rate-limited state with retry/backoff message.
  - `500`: generic server error.
- Pagination normalization:
  - Standard page mode: `{ items, meta: { page, pageSize, totalItems, totalPages } }`.
  - Companies page mode: `{ data, meta: { page, limit, total, totalPages } }`.
  - Cursor mode: `{ data, meta: { nextCursor, limit, hasMore } }`.
- Money normalization:
  - Display `money.formattedAmount` when available.
  - Never derive display price from `amountMinor` in the UI except as a documented fallback.
  - Use tabular numbers and `<bdi>` for any monetary value.

## State Management

- Server data lives in TanStack Query. Server data never lives in Zustand.
- Zustand domains:
  - `useAuth`: tokens, current user, `mustChangePassword`, sessionId. Persisted to localStorage. Cleared on logout, refresh failure, or token-family revocation.
  - `usePrefs`: theme, locale, sidebar collapsed. Persisted.
  - Module-local stores (e.g. `usePeopleSelection`): only when URL params do not fit (cross-page selection, ephemeral drawer state).
- URL search params own table filters, sort, pagination, and active tab. Filter changes are written through TanStack Router so views are deep-linkable and reloadable.
- Forms use React Hook Form local state. Do not lift form state into Zustand or Query.
- Logout calls `queryClient.clear()` so a shared device cannot leak cached data across users.

## Contract Risks To Resolve

- The frontend guide says internal numeric IDs should never reach clients, but current docs and schemas still require or expose them:
  - Company configs require `companyId` and `planId`.
  - Users expose relation IDs like `managerId`, `hrId`, `departmentId`, `jobId`, `branchId`, and `shiftId`.
  - Leads use `ownerUserId`.
  - Plan prices expose `planId`.
- Preferred fix:
  - Add public-ID request fields for frontend-facing relations.
  - Keep numeric IDs internal to backend repositories and application services.
  - Keep `publicId` as the only identifier used by screen components and routes.
- If backend changes are deferred:
  - Keep all numeric-ID handling inside API adapter modules.
  - Never let screen components depend directly on numeric IDs.
  - Mark each adapter as temporary technical debt.
  - Avoid using numeric IDs in URLs, component keys, or UI state where possible.
- Add current-user permissions to `/auth/me` or a dedicated current-permissions endpoint.
- Add a structured password-change indicator for `403`, so the UI can distinguish `mustChangePassword` from ordinary forbidden access.
- Company config response has a known `public_id` inconsistency in docs; frontend adapters normalize to `publicId`.

## Auth UX

- Login screen:
  - Fields: company code, employee code, password.
  - Hidden `clientType: "web"`.
  - Handle soft throttle with generic credential messaging.
  - Handle hard throttle with quiet rate-limit messaging.
  - Do not reveal which field was incorrect.
- Invitation acceptance:
  - Token comes from URL.
  - New password form.
  - Submit `clientType: "web"`.
  - On success, store returned tokens and route based on `mustChangePassword`.
- Forced password change:
  - Blocks all protected navigation.
  - Only `/auth/me` and `/auth/change-password` are reachable while gated.
  - After success, clear stale user state and re-fetch session/me.
  - If re-fetch fails, redirect to login.
- Auth state machine:
  - `anonymous`, `authenticating`, `authenticated`, `must_change_password`, `refreshing`, `expired`, `forbidden`.
- Session handling:
  - Highlight current session.
  - Confirm destructive revoke actions.
  - After logout-all, redirect immediately.
  - After refresh replay or revoked token family, clear tokens and redirect to login.

## Permission Model

- Use backend RBAC actions from the frontend guide:
  - `users:create`, `users:read`, `users:update`, `users:delete`, `users:reset-password`.
  - `roles:create`, `roles:read`, `roles:update`, `roles:delete`, `roles:assign`.
  - `sessions:read`, `sessions:revoke`.
  - `companies:read`, `companies:update`.
  - `audit:read`.
- Use permissions for:
  - Route access.
  - Sidebar visibility.
  - Primary action visibility.
  - Row action visibility.
  - Disabled states with explanatory tooltips where context should remain visible.
- Owner and system roles:
  - Visually distinguish them with restrained badges.
  - Disable edit/delete where backend forbids it.
  - Use ownership transfer instead of revoke for the owner role.
- Permission UI:
  - Load grouped permissions once on app load or when entering Roles.
  - Group permission checkboxes by backend permission group.
  - Make role permission update semantics clear: replacing the full permission set, not appending.

## Company Portal Screens

### People Directory

- Default view is a clean table.
- Search fields: name, email, employee code.
- Filters: status, employment type, work location, department, branch, job, manager.
- Sorting: `createdAtAsc`, `createdAtDesc`, `nameAsc`, `nameDesc`.
- Pagination: standard page; default page size follows backend defaults.
- Actions:
  - Create employee opens a right drawer.
  - Generate employee code when create drawer opens.
  - Row click opens profile drawer or profile page.
  - Bulk selection opens a contextual bulk action bar.

### Employee Profile

- Header: employee name, employee code, status, employment type, work location, manager or HR metadata when available, top actions based on permissions.
- Tabs: Overview, Job and Team, Sessions, Role, Activity placeholder.
- Sensitive fields: national ID, bank account, date of birth, termination data. Visually separated, not mixed into casual summary cards.
- Edit in drawer by default. Full-page form only when too long for comfortable drawer editing.

### Bulk Users

- CSV import maps rows to the bulk create shape.
- Display backend per-row errors using the original `index`.
- Allow correction and retry of failed rows.
- Bulk delete uses `publicIds`. Bulk update requires `publicId` per item.
- Keep selected row state stable across pagination only when product explicitly supports cross-page selection.

### Roles

- Roles table: role name, description, system badge, owner badge, assignment count if available, created/updated dates if available.
- Role detail opens in drawer.
- Permission matrix groups permissions by backend permission group.
- Owner role permissions cannot be modified. System roles cannot be renamed or deleted.
- Role delete shows assigned-user blocker messaging when backend returns `422`.

### Role Assignment

- Assign from employee profile or People row action.
- Fields: role, optional expiration date.
- Revoke requires confirmation.
- Owner role revoke guides toward ownership transfer.

### Ownership Transfer

- Separate guarded flow.
- Requires current owner capability.
- Clear warning copy.
- Explicit target user confirmation.
- On success, refresh current user permissions and role state.

### Sessions

- Own sessions live under account settings.
- Managed user sessions require `sessions:read` and `sessions:revoke`.
- Current session is visually highlighted.
- Revoke uses confirmation dialog.
- Revoking current session logs out or refreshes the session list appropriately.

### Company Settings

- Profile fields only where backend supports company read/update.
- Narrow content width.
- Related fields grouped into stable sections.
- Destructive or high-risk settings isolated.

### Audit

- Requires `audit:read`.
- Dense table columns: action, module, target, outcome, created date.
- Filters: action, outcome, target public ID, pagination.
- Metadata in a drawer; no noisy raw JSON in the table.

## SaaS Admin Portal Screens

### Leads

- Two views: pipeline kanban and table.
- Pipeline status columns follow backend lead statuses, excluding system-only `REJOINED` as a settable status.
- Table filters: status, source, owner, country, created date range, search.
- Sorting: `createdAtAsc`, `createdAtDesc`.
- Lead detail: company info, contacts, primary contact, activity timeline, status and lost reason, owner.
- Lost reason required when status becomes `LOST`.
- Admin override requires explicit confirmation copy explaining the bypass.

### Lead Contacts

- Primary contact is visually marked.
- Setting a contact as primary explains the previous primary will be demoted.
- Prevent deleting the only primary contact.
- Contact edit lives in a compact drawer or inline section inside lead detail.

### Lead Activities

- Timeline: activity type, note, created date.
- Add activity via compact drawer/form.
- Notes max out at backend limit.
- Low-noise timeline markers; no loud color blocks.

### Lead Conversion

- Only available for valid conversion state.
- Converts lead to company.
- After conversion, guide admin to subscription/company config assignment.
- Conversion form fields: phone number, company name, country, website, logo, address line.
- Show backend conflict errors for duplicate company name or phone.

### Companies

- Companies table columns: company code, name, country, active status, created date, updated date.
- Detail drawer/page: company profile, subscription/config entry point, related lead if available in future.
- Pagination: cursor for infinite scroll; page pagination for standard table.

### Company Configs And Subscriptions

- Plan selector.
- Subscription statuses: `TRIAL`, `ACTIVE`, `FROZEN`, `CANCELLED`, `EXPIRED`.
- Date fields: subscription start date, subscription end date, trial end date.
- Site status flags (additive): frozen, read-only, blocked, under maintenance.
- Clear tenant impact for each flag.
- Toggles for boolean flags. Inline notes for operational context.

### Plans

- Plans table columns: name, active status, public status, features, limits, effective price preview when filters provided.
- Create/edit plan in drawer.
- Features as checkboxes: `ATTENDANCE`, `ANALYTICS`, `OVERVIEW`, `TEAM_MANAGEMENT`.
- Limits as numeric inputs: `MAX_USERS`, `MAX_DEPARTMENTS`, `MAX_POSITIONS`.
- Delete plan requires confirmation.

### Pricing

- Plan price table lives under plan detail.
- Price fields: currency code, amount minor, amount major helper display, billing interval, interval count, country code, region code, active status.
- Effective price preview labels source: `country`, `region`, `default_row`.
- Use formatted money for display and right-aligned numeric columns.

### Admin Audit

- Scoped behavior kept clear because audit currently depends on authenticated company context.
- Do not imply platform-global audit unless backend supports it.

## Tables Architecture

- Backed by TanStack Table v8 in headless mode. The shared `DataTable` component owns chrome (header, sticky header, hover, zebra-on-large) so every table looks identical across modules.
- Server-side pagination, sorting, and filtering. URL search params are the source of truth.
- Virtualization (`@tanstack/react-virtual`) when the rendered row count exceeds ~200.
- Selection model with a sticky `BulkActionBar`.
- Numeric columns are right-aligned (RTL: end-aligned) with tabular numbers.
- Status columns use `StatusBadge` with low-saturation fills.
- Row click defaults to opening a right-side drawer; full navigation only for "view all" actions.

## Charts

- Library: ApexCharts via `react-apexcharts`.
- A single global theme file (`src/theme/apex.theme.ts`) enforces neutral gridlines, navy primary series, max two semantic supporting series, Inter font, tabular number formatting, no glow or gradient defaults.
- A small `<Chart variant="trend|bar|donut" />` wrapper applies the theme so the design rule "muted, low-saturation" is enforced at the API boundary.
- Tooltip and axis number formats follow the active i18next locale.
- Reports module is the primary consumer; KPI cards may use micro trends only.

## Motion

- Library: Framer Motion.
- Allowed motions:
  - Fade plus slight translate for menus, popovers, dropdowns.
  - Drawer slide-in.
  - Row hover highlight.
  - Toast slide.
- Durations from the design YAML: 120ms, 180ms, 240ms with the custom easing.
- No bounce or spring physics. No celebratory success animations in payroll, approvals, audit, or performance flows.
- A `<Motion>` wrapper centrally honors `prefers-reduced-motion`.

## Interaction Rules

- Use drawers for medium-to-large record workflows:
  - Editing employees.
  - Viewing employee details.
  - Editing leads.
  - Viewing lead activity.
  - Editing plans.
  - Editing prices.
  - Viewing audit metadata.
- Use centered dialogs for:
  - Delete confirmations.
  - Revoke session.
  - Revoke role.
  - Ownership transfer confirmation.
  - Status override confirmation.
- Use toasts (Sonner) for:
  - Successful saves.
  - Bulk operation completion summary.
  - Session revoked.
  - Invitation reissued.
  - Plan price saved.
- Use inline errors for:
  - Validation.
  - Conflicts.
  - Required lost reason.
  - Invalid status transition.
  - Invalid invitation token.
- One primary action per page view.

## Accessibility

- Maintain WCAG AA contrast.
- Avoid body text below `14px` except metadata.
- All icon-only buttons need accessible labels and tooltips.
- Every drawer/dialog needs title and description.
- Tables have accessible column headers.
- Bulk selection is keyboard accessible.
- Destructive actions require confirmation and clear focus management.
- Mobile touch targets at least `44px`.
- Respect reduced motion.
- Validation messages are specific and associated with fields.
- Empty states guide action without sounding robotic.
- Run axe in CI; fail the build on serious/critical violations on shared components.

## Deployment And Build

- The frontend is a static SPA produced by Vite, deployed to a CDN. The backend runs on a separate server.
- Build:
  - `bun run build` produces `dist/`.
  - Hashed assets are immutable; `index.html` is `no-cache`.
  - Route-level code splitting via TanStack Router. Heavy modules (ApexCharts, future Org Chart canvas) are lazy-loaded.
  - Initial gzipped bundle target: ≤ 250KB for the shell.
- Environment configuration:
  - `.env.{development,staging,production}` with `VITE_API_BASE_URL` and feature flags.
  - No secrets baked into the SPA. Anything sensitive belongs server-side.
- Runtime config (optional):
  - If multi-environment deploys must share one build, ship a `config.json` next to `index.html` that the SPA fetches on boot.
- CDN options (pick one at deploy time):
  - Cloudflare Pages: easiest, preview deploys per PR.
  - S3 plus CloudFront: full control, data-residency friendly.
- SPA fallback: redirect all unknown paths to `index.html`.
- Headers:
  - Strict CSP. `connect-src` must list the Fastify API origin and any analytics origin used.
  - HSTS, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.

## Quality Gates And CI

- GitHub Actions pipeline on every PR and on `main`:
  1. `bun install --frozen-lockfile`.
  2. `bun run lint` (Biome).
  3. `bun run typecheck` (`tsc --noEmit`).
  4. `bun run test` (Vitest unit and component).
  5. `bun run test:e2e` (Playwright, including RTL snapshots).
  6. `bun run build`.
  7. OpenAPI sync check: regenerate `schema.d.ts` and fail if the diff vs. the committed file is non-empty.
  8. Bundle size budget check.
  9. axe CI scan on shell + key module pages.
- Pre-commit hook (lefthook): Biome format and typecheck on staged files.
- Coverage gates:
  - 80% lines on `src/shared/`, `src/auth/`, `src/api/`.
  - 60% lines on `src/modules/`.

## Testing Plan

### Unit Tests

- API client token refresh and retry.
- Single-flight refresh behavior to prevent duplicate refresh storms.
- Auth state transitions.
- Password-change gate behavior.
- Permission guard behavior.
- Error normalization.
- Pagination adapters.
- Money formatting.
- Enum label mapping.
- Public ID adapter normalization.
- Direction helpers and bidi number wrapping.
- i18next missing-key fallback behavior.

### Component Tests

- Login form.
- Invitation acceptance form.
- Forced password-change form.
- People table filters and row actions.
- Bulk users error display.
- Employee drawer form.
- Permission matrix.
- Role assignment.
- Ownership transfer confirmation.
- Session revoke confirmation.
- Lead pipeline status changes.
- Lead lost-reason validation.
- Lead conversion form.
- Plan form.
- Pricing form.
- Company config toggles.
- Audit metadata drawer.
- `LocaleSwitcher`: locale and direction propagation.
- `DirectionalIcon`: flips only directional glyphs.

### Integration Tests (Vitest + MSW)

- Login → dashboard happy path.
- Login → mustChangePassword gate → change-password → dashboard.
- 401 → refresh → original request retried exactly once.
- Refresh failure → tokens cleared → redirect to login.
- Permission-gated route renders 403 page on missing permission.

### End-to-End Tests (Playwright)

- Login success.
- Login failure and throttle messaging.
- Invitation acceptance.
- Forced password-change redirect.
- Token refresh after `401`.
- Refresh failure redirects to login.
- Employee create/edit/delete.
- Bulk user partial failure.
- Role create and permission assignment.
- Role assignment to user.
- Session revoke.
- Lead status update.
- Lead conversion to company.
- Assign plan/subscription config.
- Create plan price.
- Preview effective price.

### Visual QA

- Desktop shell, mobile shell.
- Sidebar collapsed and expanded.
- Tables, drawers, dialogs, forms, badges, empty states.
- Snapshots captured in both EN/LTR and AR/RTL for the shell and every primary module page.
- Dark mode smoke check, even if light-first.

## Phased Delivery Plan

Each phase is shippable on its own. Estimates assume one full-stack frontend engineer; compressible with parallel work.

### Phase 0 — Foundation (~1 week)

Repo scaffold, Vite + TS + Tailwind, theme tokens, Inter font, shadcn init + recolor, Biome, Bun, Vitest, Playwright, CI, OpenAPI typegen, ky client + auth interceptor stub, Zustand auth and prefs stores, TanStack Router shell, i18n bootstrap with EN/AR placeholder strings, RTL direction wiring, `AppShell` skeleton, login page, change-password page, dashboard placeholder.

**Exit:** log in, hit a protected route, switch EN↔AR, switch LTR↔RTL, lint/type/test/build green in CI, deploy preview to a CDN.

### Phase 1 — Primitives And Dashboard (~1 week)

Owned shadcn primitives polished, `PageHeader`, `KpiCard`, `DataTable` shell, `StatusBadge`, `EmptyState`, `Drawer`, `Sonner` toasts. Dashboard wired to live KPI endpoints.

### Phase 2 — Company Portal: People + Profile + Roles + Sessions (~3 weeks)

People Directory, Employee Profile with tabs, Bulk Users CSV, Roles and Permission Matrix, Role Assignment, Ownership Transfer, Sessions, Company Settings, Audit.

### Phase 3 — SaaS Admin Portal: Leads + Companies (~2 weeks)

Leads pipeline + table + detail + contacts + activities + conversion. Companies table + detail.

### Phase 4 — SaaS Admin Portal: Subscriptions + Plans + Pricing (~1.5 weeks)

Company configs and subscriptions, plans, pricing, effective price preview.

### Phase 5 — Hardening (~1 week)

A11y audit (axe + manual), Lighthouse pass, RTL visual regression sweep, perf budget pass, error boundaries, Sentry wiring (optional), docs.

Total for portals with current backend scope: ~9–10 weeks. Future HRMS modules (Time Off, Attendance, Payroll, Recruitment, Onboarding, Performance, Documents, Approvals, Reports) are scoped after backend APIs land.

## Acceptance Criteria

- UI matches the navy design doc more than default shadcn styling.
- Inter is the product font; tabular numbers are applied in money, counts, balances, and analytics.
- Bilingual EN/AR is functional, direction switches correctly, and no shipped component uses physical CSS direction utilities (`pl-`, `pr-`, `ml-`, `mr-`, `text-left`, `text-right`).
- No active screen depends directly on internal numeric IDs unless isolated behind a documented adapter.
- Auth refresh is centralized, single-flight, and never causes duplicate refresh storms.
- Forced password change cannot be bypassed by client navigation.
- Permission guards apply consistently to routes, nav, page actions, and row actions.
- Tables are readable, filterable, paginated, and support empty/loading/error states.
- Forms show backend validation and conflict errors clearly.
- Destructive workflows require confirmation.
- Mobile layout remains usable for core review and approval tasks.
- Future modules are not presented as functional until backend APIs exist.
- Static SPA build deploys cleanly to a CDN, with SPA fallback and a strict CSP whose `connect-src` includes the API origin.
- All CI gates green: Biome, typecheck, Vitest, Playwright (including RTL snapshots), OpenAPI sync, bundle budget, axe.

## Assumptions

- The frontend is built in a separate repository or workspace from this backend repo.
- shadcn/ui is the chosen UI component foundation, owned in-repo and restyled.
- The navy HRMS design doc overrides default shadcn visual choices.
- Inter is the canonical product font, matching the design doc YAML. Alternate fonts (Geist Sans, IBM Plex Sans) are kept as documented fallbacks only.
- Current backend docs are accepted as the API source, but the internal-ID contract conflict should be resolved before a polished production UI.
- Future HRMS modules in the design doc are product direction, not immediate implementation scope until backend APIs exist.
- The static SPA + separate backend deployment model is intentional and not subject to change in v1.

## Open Risks And Decisions Still Required

| # | Risk / Decision | Recommendation |
|---|---|---|
| 1 | Org Chart rendering (when its API lands): DOM SVG vs. React Flow vs. Canvas | Start with SVG. Switch to React Flow only if collapsible large trees become slow. |
| 2 | Calendar widget for future Time Off | Custom on `date-fns` + Radix Popover to match the navy aesthetic. FullCalendar will look third-party. |
| 3 | File upload pattern (future Documents) | Direct-to-presigned-URL from backend. Confirm backend will support it. |
| 4 | Observability | Sentry for FE errors. PostHog optional. Choose EU regions if data residency matters. |
| 5 | Multi-tenant subdomain routing | If tenants get `acme.hrms.app`, need tenant detection at bootstrap. Confirm backend tenant model. |
| 6 | Real-time updates (approvals, notifications) | SSE from Fastify or polling via TanStack Query. Defer to a later phase. |
| 7 | Mobile app later | Keep business logic in pure modules so a future React Native shell can reuse them. |
