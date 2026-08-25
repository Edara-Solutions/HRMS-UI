# HRMS UI — domain glossary

The language of the HRMS frontend. Terms here are implementation-free; when code
and this file disagree, one of them is wrong — fix it in the same change.

## Notification center

**Notification** — a server-generated event card addressed to one identity scope
(company member or platform admin). Carries a type key, importance, params, and
lifecycle timestamps.

**Unseen** — a notification the user's eyes never landed on (`seen_at` and
`read_at` both null). Unseen notifications count toward the bell's badge number.

**Unread** — a notification that has been presented (seen) but not yet acted on
(`read_at` null). Renders with settled styling; does not count toward the badge.

**Read** — a notification the user explicitly activated or bulk-marked
(`read_at` set). Renders muted.

**Seen** — the presentation write: stamping that a rendered row was shown to the
user. Drains the badge for the rows it covers. Distinct from read — dismissing a
toast is neither seen nor read.

**Badge count** — the number on the bell: exactly the unseen total from the
unread-count endpoint. Never derived from the feed cache.

**List style** — the user's chosen presentation shape of the notification list:
`panel` (anchored dropdown), `sheet` (end-side sheet over a scrim), or `flat`
(compact dropdown, no recency grouping, All/Unread chips). A presentation
preference; it changes how the list renders, never what it contains.

**Recency bucket** — the Today / Yesterday / Earlier grouping used by the panel
and sheet shapes. The flat shape deliberately has none.
