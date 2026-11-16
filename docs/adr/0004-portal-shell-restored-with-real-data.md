# 0004 — Portal shell restores the dev shape, filled with real data

Date: 2026-11-16
Status: Accepted

## Context

The split-tier refactor rebuilt both portals on real, permission-projected routes, but lost the shape people knew from `dev` (tagged `pre-split-baseline`): grouped sidebar, header search and help, and a composed dashboard. A side-by-side comparison of five personas per stack (HRMS_Back_End#297) showed that `dev`'s shape was mostly placeholders: most Company menu entries opened "Not Found", and the dashboards ran on demo numbers.

## Decision

Restore `dev`'s **shape** and fill it with **real data**, keeping every page added since (spec #120).

- **Sidebar map.** Company: Overview (Dashboard, Company profile, Setup checklist), Workforce (People, Roles), Finance, Talent, Operations (Email settings, Notification routing, Audit Log). Platform: Overview (Dashboard), Management (Companies, Subscriptions, Leads, Plans), Requests (Conversion requests), People & access, Communications (Announcements, Notifications, Email templates, Email deliveries, Sending controls), Analytics, System (Audit Log). The map lives in `widgets/app-shell/model/nav-items.tsx`; every live entry still comes from `projectNavigation`, so permission filtering is unchanged, and a group with nothing visible is hidden.
- **Labels.** `dev`'s labels return wherever the page is the same feature, in the route registry (`shared/auth/access-projections.ts`), in English and Arabic. Page headings keep their own names.
- **User menu.** The "me" pages (My profile, Security, My sessions) leave the sidebar and live in the user menu with Sign out.
- **No invented numbers.** Dashboard cards and badges come only from the overview read (HRMS_Back_End ADR 0022). A metric without a data source (revenue, tenure, approvals, payroll, events) is dropped, not mocked.

## Consequences

The shell looks like the product people already know while every entry and number is real. Modules not yet built need a separate, clearly marked treatment (ADR 0005). Adding a page now means adding its route declaration and placing its path in the group map.
