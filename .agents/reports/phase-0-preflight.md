# Phase 0 Pre-flight

## Plan File

- `fe-plan-v1.md` exists and is non-empty.
- The plan is the active source of truth for the scaffold.

## Extracted Locked Decisions

- Framework: React 19.
- Language: TypeScript 5.
- Runtime/package manager: Bun.
- Build tool: Vite 5.
- Routing: TanStack Router with file-based routes and typed search params.
- Server state: TanStack Query v5.
- UI state: Zustand.
- Styling: Tailwind v4, owned shadcn/ui primitives on Radix, lucide-react icons.
- Forms: React Hook Form plus Zod.
- API client: ky, with centralized auth refresh and error normalization.
- i18n: i18next, react-i18next, i18next-http-backend.
- Locales: `en` and `ar`, with RTL support for Arabic.
- Tables: TanStack Table v8 and virtualization for large lists.
- Charts: ApexCharts through `react-apexcharts`.
- Motion: Framer Motion with reduced-motion support.
- Quality: Biome, Vitest, Testing Library, MSW, Playwright.
- Deployment model: static Vite SPA to a CDN, backend on a separate server.

## Module Checklist

- Company Portal: dashboard, people, roles, sessions, company settings, audit.
- People-area workflows: people directory, employee profile, bulk users, role assignment, ownership transfer.
- SaaS Admin Portal: leads, lead contacts, lead activities, lead conversion, companies, company configs and subscriptions, plans, pricing, admin audit.
- Future hidden modules tracked but not active: time off, attendance, payroll, recruitment beyond leads, onboarding, performance, documents, approvals, reports.

## Theme And UX Tokens

- Colors are locked in `fe-plan-v1.md`: background, surfaces, border, text, primary navy, semantic success/warning/danger/info.
- Radius scale is locked: `sm` 6px, `md` 8px, `lg` 12px, `xl` 16px.
- Type direction is locked: Inter with Noto Sans Arabic pairing.
- Motion durations are named in the plan as 120ms, 180ms, and 240ms with custom easing.

## Gaps For Phase 1 Focused Interview

- `../../hrms-system-design-navy.md` is referenced but not present from this workspace path.
- `./frontend-integration-guide.md` is referenced but not present in this workspace.
- OpenAPI source path or URL is not locally available yet.
- CDN target remains an explicit deploy-time choice: Cloudflare Pages or S3 plus CloudFront.
- Org chart, calendar, file upload, observability, multi-tenant subdomains, real-time updates, and mobile app reuse are documented as later decisions, not blockers for the skeleton.

## Gate Result

Phase 0 passes. The plan declares the framework, stack, design tokens, route groups, module list, auth contract, i18n strategy, and acceptance criteria. The missing referenced docs should be resolved or confirmed during the Phase 1 interview before writing the scaffold manifest.
