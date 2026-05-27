# HRMS Frontend Agent Guide

## Required Skills

- `vercel-react-best-practices`: invoke before authoring or reviewing React components, data fetching, routing loaders, API clients, or performance-sensitive UI. Prioritize async parallelism, bundle size, server/client data boundaries, re-render control, and rendering performance.
- `vercel-composition-patterns`: invoke before authoring or reviewing component APIs, shared UI primitives, providers, drawers, dialogs, forms, and compound components. Avoid boolean prop proliferation, prefer explicit variants, lift shared state into providers, and keep provider internals decoupled from consumers.

Any change touching React components, data fetching, or component APIs must be reviewed against both skills before merge. Construction defaults: no barrel imports, no client fetch waterfalls, lazy boundaries for heavy modules, no primitive with more than two behavior booleans, and URL params own filters/sort/page/tab state.

## Mission

Build a calm, bilingual HRMS frontend as a React 19 + TypeScript single-page application bundled by Vite and deployed as static assets to a CDN, with the Fastify backend running separately.

## Tech Stack

- Runtime/package manager: Bun.
- Build: Vite 5.
- Language/framework: TypeScript 5 and React 19.
- Routing: TanStack Router with file-based routes and typed search params.
- Server state: TanStack Query v5.
- UI state: Zustand.
- Styling: Tailwind v4 with owned shadcn/Radix primitives.
- Forms: React Hook Form plus Zod.
- API: ky with centralized auth refresh and error normalization.
- i18n: i18next, react-i18next, i18next-http-backend.
- Tests: Vitest, Testing Library, MSW, Playwright.
- Lint/format: Biome.

## Current Scaffold Boundary

The current phase covers package setup, build tooling, minimal app bootstrap, theme tokens, i18n direction helpers, and test harness setup. Core HRMS modules, auth screens, owned shadcn primitives, and per-module `AGENTS.md` files are intentionally deferred.

## Design Rules

Use `src/theme/tokens.ts` as the source of truth for colors, radius, shadows, spacing, font stack, and motion durations. Keep the product light-first, navy-accented, dense, readable, and low-noise. Do not introduce gradient-heavy surfaces, purple-blue startup palettes, colorful icon circles, heavy panel shadows, or playful motion in sensitive workflows.

## i18n And Direction

English and Arabic are first-class. Arabic sets `dir="rtl"` and English sets `dir="ltr"`. Product code must use logical spacing and alignment utilities such as `ps-*`, `pe-*`, `ms-*`, `me-*`, `text-start`, and `text-end`; avoid physical direction utilities such as `pl-*`, `pr-*`, `ml-*`, `mr-*`, `text-left`, and `text-right`.

## Performance Defaults

Start independent async work early and await it late. Use TanStack Query for server data, Zustand only for UI/auth/preferences or module-local ephemeral state, and URL search params for table state. Prefer lazy boundaries for charts and other heavy modules. Avoid manual memoization unless a measured render path needs it.
