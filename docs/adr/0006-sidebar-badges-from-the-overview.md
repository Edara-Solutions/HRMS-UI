# 0006 — Sidebar badges come from the overview read, with calm motion

Date: 2026-11-16
Status: Accepted

## Context

`dev`'s sidebar badges were fixed demo values ("248", "May", "14", "11") pulsing in several status colours. The split rebuild dropped them. The agreed shape (spec #120) brings badges back only where a real number exists.

## Decision

- **Source.** Badges read the portal's overview (`companyOverviewQuery` / `platformOverviewQuery` in `shared/api`) without `include`, so the read is counts-only and records no Audit Trail read (HRMS_Back_End ADR 0023). One request per portal, cached for 2 minutes, made only when the caller may read at least one badged section.
- **Which entries.** Company: People (total). Platform: Companies (total), Leads (open), Conversion requests (pending, marked for attention). A badge appears only on an entry the caller can open and only when its count is above zero.
- **Look.** One neutral, bordered badge style with tabular numbers instead of per-entry status colours; the active entry's badge takes the navy accent. Collapsed, a badge becomes a small dot by the icon.
- **Motion.** A changed number eases to its new value over about 200 ms with no bounce. An attention entry carries a slow, breathing navy dot. Under `prefers-reduced-motion` the number changes at once and the dot holds still.

## Consequences

Badges never show a number the backend did not count, and the sidebar adds exactly one light request. The dashboard asks for recent activity separately, with `include=recentActivity`, so the two share the backend logic but not one cache entry.
