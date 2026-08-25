# 0003 — Notification list style is a user preference with three shapes

Date: 2026-08-25
Status: Accepted

## Context

The notification-center prototype (issue #51) validated three presentation
shapes for the notification list: an anchored dropdown **panel**, an end-side
**sheet** over a scrim, and a compact **flat** list with All/Unread chips. The
production epic shipped panel-only, and the closing sweep (#59) removed the
prototype's list-style preference as dead state, declaring v1 "panel-only —
Variant A".

Users then asked for the choice back: the shape is genuinely a matter of taste
and screen habit, and each validated shape serves a different one — the panel
for quick glances, the sheet for focused triage, the flat list for high-volume
scanning with filtering.

## Decision

The list style ships as a **user preference** with all three shapes selectable:
`panel`, `sheet`, `flat`.

- The setting lives **inside the notification center** (a style-picker view
  swapped into whichever shape is open), not on a settings route.
- Each option previews via a **live miniature** built from the same design
  tokens — never static images — so theme (light/dark) and direction
  (LTR/RTL) are always faithful.
- The choice persists **client-side** in the preferences store, like theme and
  locale. It is per-browser until server-synced preferences exist.
- The bell's badge is **the count pill under every shape**; the badge is the
  center's identity, not the list's.
- The sheet and flat shapes carry the prototype's extra affordances: per-row
  mark-read (which also gives non-navigable rows an individual read path) and,
  for flat, All/Unread chips.

## Consequences

- The bell becomes a dispatcher: it renders whichever shape the preference
  selects, over the same feed, lifecycle mutations, and arrival watcher.
- The badge contract from the epic (caps at 99+, derives solely from the
  unread-count endpoint) is unchanged and shape-independent.
- A future server-side preferences endpoint can migrate the persisted store
  version without UI changes.
- The prototype branch stays dead; the shapes are rebuilt as production
  components on the real feed, not ported from the mock-driven prototypes.
