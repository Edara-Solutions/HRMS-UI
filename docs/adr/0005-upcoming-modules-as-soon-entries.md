# 0005 — Upcoming modules are disabled "Soon" entries behind one switch

Date: 2026-11-16
Status: Accepted

## Context

`dev`'s sidebar listed modules that do not exist yet (Org Chart, Time Off, Attendance, Payroll, Recruitment, Onboarding, Performance, Documents, Approvals, Reports, Platform Settings). They were links that opened "Not Found". Dropping them hides the product's direction; keeping them as links breaks trust.

## Decision

Each placeholder module appears in its group as a **"Soon" entry**: plain text with a quiet "Soon" / "قريبًا" tag, `aria-disabled="true"`, not a link, not focusable, never navigable. All of them show only when `VITE_SHOW_UPCOMING_MODULES=true`; any other value hides every one with a single switch. When a module's page ships, its entry becomes a normal route-backed item and the Soon entry is removed.

## Consequences

Demos and internal builds can show the roadmap without dead links; a production build can hide it entirely. Soon entries never carry badges, and a group holding only Soon entries is visible only while the switch is on.
