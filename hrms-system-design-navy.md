---
name: HRMS Design System
version: 1.1
product_type: web_app
mode: light_first
strategy: linear_core_fusion
inspiration:
  primary:
    - Linear
  secondary:
    - Stripe Dashboard
  workflow_references:
    - BambooHR
    - HiBob
    - Workday
principles:
  - calm_clarity
  - low_eye_strain
  - fast_scannability
  - human_professional_tone
  - consistency_across_modules
fonts:
  primary_ui: Inter
  fallback: "ui-sans-serif, system-ui, sans-serif"
  rules:
    - Use one font family across the product.
    - Prefer weight contrast over font contrast.
    - Use tabular numbers for metrics, payroll, balances, and analytics.
colors:
  light:
    bg: "#F7F6F2"
    surface: "#FBFBF8"
    surface_2: "#F1EEE8"
    border: "#D9D5CD"
    text: "#22211D"
    text_muted: "#6E6B64"
    text_faint: "#A29E95"
    primary: "#123A6F"
    primary_hover: "#0E2F5A"
    primary_soft: "#DDE8F5"
    success: "#3E7B4E"
    warning: "#A56A16"
    danger: "#B34557"
    info: "#356FA8"
  dark:
    bg: "#171614"
    surface: "#1D1C1A"
    surface_2: "#252320"
    border: "#383631"
    text: "#E8E5DE"
    text_muted: "#B4AEA3"
    text_faint: "#8A847A"
    primary: "#8FB8E8"
    primary_hover: "#A5C8F0"
    primary_soft: "#1F2F43"
spacing:
  base_unit: 4
  scale: [4,8,12,16,20,24,32,40,48,64,80,96]
radius:
  sm: 6
  md: 8
  lg: 12
  xl: 16
  full: 999
shadows:
  sm: "0 1px 2px rgba(20,20,20,0.05)"
  md: "0 6px 20px rgba(20,20,20,0.07)"
  lg: "0 18px 40px rgba(20,20,20,0.10)"
motion:
  duration_fast: 120
  duration_base: 180
  duration_slow: 240
  easing: "cubic-bezier(0.16, 1, 0.3, 1)"
---

# HRMS DESIGN.md

## Product Direction

This product should feel like a modern internal operating system for people teams: calm, precise, readable, and fast. The visual backbone is **Linear-style minimalism**; the data presentation and hierarchy borrow from **Stripe**; the module coverage and workflow expectations follow strong HR products.

This is **not** a playful app, and it is **not** a harsh enterprise dashboard. The target feeling is: trustworthy, smooth, quietly premium, and comfortable for long work sessions.

## Fusion Model

Use this weighting when design decisions are ambiguous:

- 70% Linear: spacing discipline, restrained chrome, information hierarchy, minimal surfaces.
- 20% Stripe: typography polish, financial/data clarity, metric handling, analytics composition.
- 10% Modern HR tools: employee-centric layouts, profile structure, approvals, org chart, onboarding, performance flows.

If a screen starts to look too playful, move it closer to Linear. If it starts to look too technical or cold, add HR warmth through copy tone, softer surfaces, and people-centered empty states rather than extra decoration.

## Core Principles

1. **Light-first, calm-first** — default to a warm off-white background instead of pure white.
2. **One strong accent** — primary navy is the only brand accent used heavily; other colors are semantic only.
3. **Low visual noise** — avoid unnecessary shadows, gradients, and decorative color blocks.
4. **Readable at speed** — every page should be scannable in under 5 seconds.
5. **Professional but human** — language and layout should support sensitive HR workflows without feeling stiff.
6. **Consistency beats novelty** — once a pattern is chosen for tables, drawers, filters, or forms, reuse it everywhere.

## Visual Language

### Surfaces

- Use layered neutrals instead of many card colors.
- The page background is warm and soft.
- Cards are slightly brighter than the background.
- Selected or active states use `primary_soft`, not full primary.
- Avoid pure white panels unless inside modals or focused forms.

### Borders and Elevation

- Prefer subtle 1px neutral borders over heavy shadows.
- Use `shadow-sm` for floating menus and dropdowns.
- Use `shadow-md` for dialogs and side drawers.
- Avoid colored borders on the left edge of cards.
- Status should be shown with badges, dots, or labels, not decorative card borders.

### Color Use Rules

- The brand accent must read as navy / deep professional blue, not teal, green, or cyan.
- Use the navy accent sparingly so the interface remains calm and HR-friendly.
- Primary navy is for primary buttons, active nav, focused inputs, selected chips, active tabs, and key links.
- Success, warning, and danger are semantic only.
- Charts should stay muted: neutral gridlines, one navy primary series, and 1–2 semantic supporting series max.
- Never place two bright accent colors next to each other without neutral spacing.

## Typography

### Font System

Use one family throughout the app:

- Primary: `Inter`
- Fallback: `ui-sans-serif, system-ui, sans-serif`

### Type Scale

- Page title: 28–32 / semibold
- Section title: 20–24 / semibold
- Card title: 16–18 / semibold
- Body: 14–16 / regular
- Secondary UI text: 13–14 / medium
- Tiny labels and metadata: 12 / medium

### Rules

- Do not use a separate display font in the product UI.
- Use tabular numbers for payroll, balances, attendance totals, and analytics.
- Keep line length short inside settings, drawers, and modals.
- Labels should be concise and stable; do not vary naming for the same concept across modules.

## Layout System

### App Shell

- Left sidebar navigation, fixed on desktop.
- Top utility bar for search, notifications, workspace switcher, and user menu.
- Main content area with one primary scroll region.
- On mobile, collapse sidebar into a sheet and convert high-frequency navigation into top tabs or segmented controls.

### Spacing Rhythm

- Page outer padding: 24–32
- Card padding: 16–24
- Grid gaps: 16–24
- Form row gaps: 12–16
- Dense table cells: 12 vertical / 16 horizontal

### Content Density

- Default density is **balanced**, not ultra-compact.
- Use dense mode only for tables and logs.
- Use comfortable mode for profiles, settings, and document-heavy screens.

## Navigation Model

Primary navigation should include:

- Dashboard
- People
- Org Chart
- Time Off
- Attendance
- Payroll
- Recruitment
- Onboarding
- Performance
- Documents
- Approvals
- Reports
- Settings

Rules:

- Keep top-level nav limited and stable.
- Put infrequent admin tasks under Settings or secondary tabs.
- Use breadcrumbs only for deep nested views, not on every page.
- Every module page needs one clear primary action.

## Component Rules

### Buttons

- Primary button: solid navy background, white text.
- Secondary button: neutral surface, subtle border, dark text.
- Ghost button: transparent, no border until hover.
- Destructive button: only inside danger contexts.
- One primary button per view.

### Inputs

- Inputs use soft surface fill with subtle border.
- Focus state uses navy-blue ring plus border shift.
- Labels stay above fields; avoid floating labels.
- Helper text is muted and always below the field.
- Validation appears inline and specific.

### Tables

- Tables are one of the most important components in the product.
- Use soft zebra striping only if the table is large; otherwise rely on spacing and row hover.
- Sticky header for long lists.
- Numeric columns are right-aligned.
- Status columns use pills with low-saturation fills.
- Bulk actions appear in a contextual bar after selection.

### Tabs and Segmented Controls

- Use tabs for page-level subviews.
- Use segmented controls for short local switches such as `All / Active / Archived`.
- Active states should be obvious but calm.
- Avoid over-animating tab changes.

### Cards

- Cards should never feel like marketing tiles.
- Use them for KPIs, summaries, employee overviews, and task clusters.
- Keep icon treatment minimal; no colorful icon circles by default.
- Titles, one supporting line, and one meaningful action are enough.

### Badges and Status

- Use subtle fills and dark text.
- Example patterns:
  - Active → soft navy
  - Pending → soft amber
  - At risk → soft rose
  - Complete → soft green
- Avoid bright saturated pills.

### Drawers and Modals

- Prefer right-side drawers for editing records without losing context.
- Use centered modals for confirmation, short forms, and irreversible actions.
- Long forms should not live in modals.

## Motion and Interaction

- Motion is fast and restrained.
- Hover states should feel immediate but soft.
- Use fade + slight translate for menus, popovers, and dropdowns.
- Use subtle highlight movement for selected rows or active filters.
- Never use bouncy animations in HR workflows.
- Success feedback should be quiet and confident, not celebratory.

## Content Tone

- Use direct, human language.
- Prefer `Approve time off` over `Initiate leave approval workflow`.
- Prefer `Employee ID` over `Human capital identifier`.
- Empty states should guide action without sounding robotic.
- Sensitive modules like payroll or performance should feel calm and respectful.

## Page-by-Page Patterns

### 1. Dashboard

Purpose: fast understanding, not deep work.

Rules:

- Top row: 3–5 KPI cards.
- Middle: activity, approvals queue, and upcoming events.
- Bottom: analytics previews and shortcuts to modules.
- Use charts sparingly; short trend lines are enough.
- Dashboard should open with immediate clarity, not a collage of widgets.

### 2. People Directory

Purpose: browse, search, filter, and act.

Rules:

- Default view is a clean table.
- Optional card view for smaller teams.
- Filters sit above the table and remain compact.
- Row click opens profile drawer or dedicated profile page.

### 3. Employee Profile

Purpose: the single source of truth for one employee.

Sections:

- Overview
- Job & team
- Compensation
- Time off
- Attendance
- Documents
- Performance
- Activity log

Rules:

- Header contains employee identity, status, team, manager, and top actions.
- Use tabs for sub-sections.
- Keep high-sensitivity data visually separated with clearer section boundaries.

### 4. Org Chart

Purpose: relationships and reporting clarity.

Rules:

- Keep the default canvas calm and spacious.
- Use soft connectors and restrained color.
- Clicking a node should open a side panel, not navigate away immediately.
- Avoid making the org chart look like a diagramming tool.

### 5. Time Off

Purpose: balances, requests, approval flow.

Rules:

- Show balance summary first.
- Request creation must be simple and mobile-friendly.
- Approval list uses dense but readable rows.
- Calendar integration should look native to the system, not like an embedded third-party widget.

### 6. Attendance

Purpose: time tracking, punctuality, shifts, exceptions.

Rules:

- Use strong date hierarchy.
- Exceptions should stand out through semantic labels, not loud color blocks.
- Daily and weekly views must share the same visual grammar.

### 7. Payroll

Purpose: confidence and precision.

Rules:

- Stripe influence is strongest here.
- Use crisp tables, clear numeric alignment, and calm emphasis.
- Avoid decorative visuals.
- All totals, subtotals, and exceptions must be easy to verify at a glance.

### 8. Recruitment

Purpose: pipeline management and candidate review.

Rules:

- Support both pipeline board and table view.
- Candidate cards should stay restrained.
- Status movement should be visually clear but not flashy.

### 9. Onboarding / Offboarding

Purpose: checklist-driven execution.

Rules:

- Use Asana-like task clarity, but with this system’s calmer styling.
- Progress indicators should be simple.
- Make due dates and blockers obvious.

### 10. Performance

Purpose: structured conversations and cycles.

Rules:

- Avoid emotionally aggressive colors.
- Use generous spacing for written feedback.
- Ratings, goals, and review history should sit in separate blocks.
- Support both manager and employee perspectives cleanly.

### 11. Documents and Policies

Purpose: documentation with trust.

Rules:

- Borrow the calm readability of document tools.
- Use wider reading width than dashboard tables.
- Keep metadata discreet.
- Actions like `Upload`, `Request signature`, or `Share policy` stay visible.

### 12. Approvals Center

Purpose: fast operational review.

Rules:

- Queue view first.
- Each row should show requester, type, risk level, date, and next action.
- Allow inline approval for simple items and drawer review for complex ones.

### 13. Reports and Analytics

Purpose: insight with minimal strain.

Rules:

- Neutral background, clean axes, low-saturation series.
- Use summary cards above charts.
- Prioritize trend, comparison, breakdown, and exception views.
- Never overload one screen with too many chart types.

### 14. Settings

Purpose: configuration without fear.

Rules:

- Use a narrow content width.
- Group related settings into well-labeled sections.
- Destructive actions belong in isolated cards.
- Keep advanced configuration collapsed by default.

## Accessibility and Comfort

- Maintain WCAG AA contrast minimums.
- Avoid pure white backgrounds for full-page surfaces.
- Body text should rarely drop below 14px; only metadata may use 12px.
- Every interactive element must have a clear focus state.
- Touch targets should be at least 44x44 on mobile.
- Respect reduced motion preferences.

## Anti-Patterns

Do not do the following:

- No gradient-heavy hero aesthetics inside the app.
- No colorful icon circles on every card.
- No three-column marketing feature layout inside product pages.
- No purple-blue startup gradients.
- No heavy drop shadows on every container.
- No pure white full-screen glare.
- No multi-accent chaos in charts or badges.
- No playful motion in payroll, approvals, or performance reviews.
- No inconsistent patterns between modules.

## Implementation Notes

When building screens from this DESIGN.md:

- Reuse the same sidebar, top bar, card, table, form, modal, badge, and empty-state primitives everywhere.
- Start with the page objective, then choose the smallest set of components needed.
- Default to a neutral surface and add color only where the user needs focus.
- If uncertain between two options, choose the calmer and more readable one.

## Final Decision Rule

If the team must choose **one source of truth**, choose this: **Linear-core fusion for style, Stripe-level data clarity for metrics, HR-native structure for workflows**.

That combination fits an HRMS better than copying Notion, Stripe, or any HR tool alone.
