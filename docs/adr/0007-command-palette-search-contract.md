# 0007 — Header search is a command palette with a strict request budget

Date: 2026-11-16
Status: Accepted (to be built in #122)

## Context

`dev`'s header had a search field that did nothing. The restored shell (ADR 0004) keeps the field, so it has to work, and it must not turn every keystroke into server load.

## Decision

The header field opens a **command palette** (also ⌘K / Ctrl+K) with two kinds of result:

- **Pages**, from the permission-filtered navigation already in the client. No server call.
- **People**: on Company, employees when the caller holds `users:read`; on Platform, staff, Companies and leads where readable.

People search follows this budget:

- fetch only while the palette is open and the query has at least 2 characters;
- 250 ms debounce, and every superseded request is aborted;
- a short-lived query cache, so retyping a recent query costs nothing;
- at most 5 results per group;
- a 429 shows a quiet retry inside the palette instead of an error page.

**Help** opens a menu of keyboard shortcuts; a support contact is added once an address is provided.

## Consequences

Search is useful from day one for pages at zero cost. People search stays bounded at no more than one in-flight request per palette and few requests per word typed. Each searchable group respects the same read permissions as its list page.
