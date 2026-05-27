# Edara HRMS — UI Component & Design Guide

> **Purpose:** Single source of truth for building UI components that match Edara's design philosophy.
> **Style:** Linear-core fusion (70% Linear, 20% Stripe, 10% Modern HR tools).

---

## 1. Design Philosophy

### Core Feel
- **Calm, precise, readable, fast** — not playful, not harsh
- **Trustworthy, smooth, quietly premium** — comfortable for long work sessions
- **Light-first, warm** — off-white `#F7F6F2` background, never pure white

### Fusion Model
| Influence | Weight | Applies To |
|-----------|--------|------------|
| Linear | 70% | Spacing discipline, restrained chrome, information hierarchy |
| Stripe | 20% | Typography polish, data clarity, metric handling |
| HR Tools | 10% | Employee-centric layouts, approvals, profiles |

---

## 2. Color System

### Light Theme
```css
--color-bg:           #F7F6F2;  /* Warm off-white background */
--color-surface:      #FBFBF8;  /* Cards, sidebar, slightly brighter */
--color-surface-2:    #F1EEE8;  /* Hover states, secondary surfaces */
--color-border:       #D9D5CD;  /* Subtle 1px borders */
--color-text:         #22211D;  /* Primary text */
--color-text-muted:   #6E6B64;  /* Secondary text */
--color-text-faint:   #A29E95;  /* Tertiary, labels, metadata */
--color-primary:      #123A6F;  /* Navy accent — THE brand color */
--color-primary-hover:#0E2F5A;  /* Darker navy for hover */
--color-primary-soft: #DDE8F5;  /* Active nav, selected chips */
--color-success:      #3E7B4E;  /* Semantic only */
--color-warning:      #A56A16;  /* Semantic only */
--color-danger:       #B34557;  /* Semantic only */
--color-info:         #356FA8;  /* Semantic only */
```

### Dark Theme
```css
--color-bg:           #171614;
--color-surface:      #1D1C1A;
--color-surface-2:    #252320;
--color-border:       #383631;
--color-text:         #E8E5DE;
--color-text-muted:   #B4AEA3;
--color-text-faint:   #8A847A;
--color-primary:      #8FB8E8;  /* Lighter navy for dark mode */
--color-primary-hover:#A5C8F0;
--color-primary-soft: #1F2F43;
--color-success:      #79AB86;
--color-warning:      #D0A15C;
--color-danger:       #D27C8B;
--color-info:         #82AEDD;
```

### Color Rules
1. **Navy is the ONLY brand accent** — use sparingly for: buttons, active nav, focused inputs, selected chips, active tabs, key links
2. **Semantic colors are semantic only** — success, warning, danger, info for status
3. **Never place two bright accents next to each other** — use neutral spacing
4. **Charts stay muted** — neutral gridlines, one navy series, 1–2 semantic supporting series

---

## 3. Typography

### Font Stack
```css
font-family: Inter, "Noto Sans Arabic", ui-sans-serif, system-ui, sans-serif;
font-variant-numeric: tabular-nums;  /* For metrics, payroll, balances */
```

### Type Scale
| Element | Size | Weight | Letter Spacing |
|---------|------|--------|----------------|
| Page title | 26px | 700 | -0.03em |
| Section title | 20-24px | 600 | -0.02em |
| Card title | 14px | 600 | -0.01em |
| Body | 14px | 400/500 | normal |
| Secondary UI | 13-13.5px | 500 | normal |
| Tiny labels | 11-12px | 500-600 | 0.06em (uppercase) |

### Rules
- **One font family** — no separate display fonts
- **Tabular numbers** for payroll, balances, attendance, analytics
- **Weight contrast over font contrast** — use 400/500/600/700 weights
- **Labels are concise and stable** — don't vary naming across modules

---

## 4. Spacing & Layout

### Spacing Scale (4px base unit)
```
4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96
```

### Layout Rules
| Element | Spacing |
|---------|---------|
| Page outer padding | 28px (px-7 py-7) |
| Card padding | 16-18px |
| Grid gaps | 12-16px |
| Form row gaps | 12-16px |
| Dense table cells | 11px vertical / 14px horizontal |

### App Shell Structure
```
┌─────────────────────────────────────────────────────┐
│ Header (56px): Search + Actions + Theme + Locale    │
├──────────┬──────────────────────────────────────────┤
│ Sidebar  │ Content Area (scrollable)                │
│ (252px)  │                                          │
│          │                                          │
└──────────┴──────────────────────────────────────────┘
```

---

## 5. Border Radius

| Element | Token | Value |
|---------|-------|-------|
| Badges, small chips | `--radius-sm` | 6px |
| Buttons, inputs, avatars | `--radius-md` | 8px |
| Cards, dropdowns | `--radius-lg` | 12px |
| Large containers | `--radius-xl` | 16px |
| Pills (avoid) | `--radius-full` | 999px |

### Rules
- **Avatars are rounded squares** (`radius-md`), NOT circles
- **Badges are rounded rectangles** (`radius-sm`), NOT pills
- **Cards use `radius-lg`** (12px) consistently
- **Avoid `radius-full`** except for truly pill-shaped elements

---

## 6. Shadows & Elevation

```css
--shadow-sm: 0 1px 3px rgba(20,20,20,0.06);   /* Floating menus, dropdowns */
--shadow-md: 0 6px 20px rgba(20,20,20,0.08);   /* Dialogs, drawers, card hover */
```

### Rules
- **Prefer 1px borders over shadows** — borders are calmer
- **`shadow-sm`** for floating menus and dropdowns
- **`shadow-md`** for dialogs, side drawers, card hover states
- **No heavy drop shadows** on every container
- **Hover shadow on cards** — adds subtle depth on interaction

---

## 7. Motion & Animation

```css
--motion-fast: 120ms;   /* Hover states, micro-interactions */
--motion-base: 180ms;   /* Standard transitions */
--motion-slow: 240ms;   /* Layout changes, sidebar collapse */
--motion-easing: cubic-bezier(0.16, 1, 0.3, 1);  /* Smooth, not bouncy */
```

### Rules
- **Fast and restrained** — motion serves function, not decoration
- **Hover states feel immediate but soft** — 120-140ms
- **No bouncy animations** in HR workflows
- **Success feedback is quiet and confident** — not celebratory
- **Respect `prefers-reduced-motion`** — disable animations when set

---

## 8. Component Patterns

### Buttons
| Variant | Style | Use Case |
|---------|-------|----------|
| Primary | Solid navy bg, white text, border | One per view, main action |
| Secondary | Surface bg, border, dark text | Secondary actions |
| Ghost | Transparent, no border | Tertiary, icon buttons |
| Destructive | Danger bg, white text | Delete, remove actions |

**Sizing:** `h-9` (36px), `px-3.5`, `text-[13px]`, `font-medium`, `radius-md`

### Inputs
- Height: `34px`
- Border: `1px solid var(--color-border)`
- Background: `var(--color-surface)`
- Focus: `border-[var(--color-primary)]` + `ring-2 ring-[var(--color-primary)]/10`
- Labels above fields, helper text below

### Cards
```tsx
<Card hoverable>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Subtitle</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```
- Background: `var(--color-surface)`
- Border: `1px solid var(--color-border)`
- Radius: `var(--radius-lg)` (12px)
- Hover: `var(--shadow-md)` when `hoverable`

### Badges
- Height: `20px` (h-5)
- Padding: `0 6px` (px-1.5)
- Font: `11px`, `font-semibold`
- Radius: `var(--radius-sm)` (6px)
- Subtle fills with dark text, NOT bright saturated pills

**Variants:**
| Variant | Color | Use Case |
|---------|-------|----------|
| default | Surface-2, muted text | Counts, neutral status |
| primary/teal | Primary-soft, primary text | Active, selected |
| success/done | Emerald-50, success text | Complete, active |
| warning/warn | Amber-50, warning text | Pending, attention |
| danger/risk | Rose-50, danger text | Errors, flags |
| info | Sky-50, info text | Informational |

### Avatars
- Size: `sm` (32px), `md` (40px), `lg` (48px)
- Radius: `var(--radius-md)` (8px) — **rounded square, NOT circle**
- Background: `var(--color-primary-soft)`
- Text: `var(--color-primary)`, `font-semibold`
- Fallback: Initials from name

### Tables
- Header: `11px`, `font-semibold`, `uppercase`, `tracking-wider`, `text-muted`
- Cells: `13.5px`, `11px vertical / 14px horizontal` padding
- Row hover: `color-mix(in srgb, var(--color-surface-2) 50%, transparent)`
- Border: `1px solid color-mix(in srgb, var(--color-border) 65%, transparent)` (subtle)
- Sticky header for long lists
- Numeric columns right-aligned with `tabular-nums`

---

## 9. Navigation Patterns

### Sidebar
- Width: `252px` (desktop), collapsible to `60px`
- Background: `var(--color-surface)`
- Border-right: `1px solid var(--color-border)`

**Brand Section:**
- Dark mark (company initial) + company name + subtitle
- Mark: `32px`, `radius-md`, `bg-[var(--color-text)]`, `text-[var(--color-surface)]`

**Nav Groups:**
- Section header: `11px`, `font-semibold`, `uppercase`, `tracking-widest`, `text-faint`
- Nav link: `13.5px`, `font-medium`, `padding: 8px 10px`, `radius-md`
- Active: `bg-[var(--color-primary-soft)]`, `text-[var(--color-primary)]`
- Hover: `bg-[var(--color-surface-2)]`, `text-[var(--color-text)]`
- Icon opacity: `70%` default, `100%` active

**Badges in Nav:**
- Position: `ms-auto` (end of row)
- Style: `h-5`, `radius-sm`, `10px font`, `tabular-nums`
- Active: `bg-primary/10 text-primary`
- Default: `bg-surface-2 text-muted`

**Footer:**
- Settings link
- User card: avatar + name + role + theme toggle

### Header (Topbar)
- Height: `56px` (h-14)
- Background: `var(--color-bg)` (matches content)
- Border-bottom: `1px solid var(--color-border)`

**Layout:**
```
[Search (max-w-400px)] [Spacer] [Bell] [Help] [Divider] [Theme] [Locale] [Avatar]
```

**Search:**
- Height: `34px`
- Icon: `15px`, positioned `start-3`
- Keyboard shortcut badge: `⌘K`, `11px`, `border`, `surface-2 bg`
- Focus: `border-primary` + `ring-2 ring-primary/10`

---

## 10. Dark Theme Implementation

### CSS Variables
Use `[data-theme="dark"]` selector on `:root` or `html` element.

### Theme Toggle
- Stored in `usePreferencesStore` (Zustand, persisted to localStorage)
- Applied via `document.documentElement.dataset.theme = theme`
- Toggle in sidebar footer user card + header

### Color Adjustments for Dark
- Primary becomes lighter: `#123A6F` → `#8FB8E8`
- Surfaces get darker: `#FBFBF8` → `#1D1C1A`
- Semantic colors desaturate slightly
- Shadows use `rgba(0,0,0,0.3-0.35)` instead of `rgba(20,20,20,0.06-0.08)`

---

## 11. Adding a New UI Component

### Step 1: Check Existing Components
Before creating new, check if existing components can be composed:
- `src/shared/ui/` — Base primitives (Button, Input, Card, Badge, Avatar, etc.)
- `src/shared/layout/` — Layout components (AppShell, Sidebar, Header)

### Step 2: Follow the Pattern
```tsx
// src/shared/ui/my-component.tsx
import { cn } from "@/shared/lib/cn";
import type { HTMLAttributes } from "react";

interface MyComponentProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "primary";
}

export function MyComponent({ className, variant = "default", ...props }: MyComponentProps) {
  return (
    <div
      className={cn(
        "base-styles-here",
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  );
}
```

### Step 3: Use Design Tokens
Always use CSS custom properties, never hardcode colors:
```css
/* ✅ Correct */
bg-[var(--color-surface)]
text-[var(--color-text-muted)]
border-[var(--color-border)]
rounded-[var(--radius-md)]

/* ❌ Wrong */
bg-white
text-gray-500
border-gray-200
rounded-lg
```

### Step 4: Follow Naming Conventions
- **Variants:** `default`, `primary`, `success`, `warning`, `danger`, `info`
- **Sizes:** `sm`, `md`, `lg`
- **States:** `hover`, `active`, `disabled`, `focus`

### Step 5: Ensure Accessibility
- Use semantic HTML elements
- Add `aria-label` for icon-only buttons
- Add `aria-expanded`, `aria-haspopup` for dropdowns
- Support keyboard navigation
- Respect `prefers-reduced-motion`

### Step 6: Run Quality Checks
```bash
bun run typecheck  # TypeScript
bun run lint       # Biome
bun run format     # Auto-format
```

---

## 12. Anti-Patterns to Avoid

| ❌ Don't | ✅ Do Instead |
|----------|---------------|
| Pure white backgrounds | Use `#F7F6F2` (bg) or `#FBFBF8` (surface) |
| Gradient-heavy hero aesthetics | Keep surfaces flat and calm |
| Colorful icon circles on every card | Minimal icon treatment |
| Purple-blue startup gradients | Navy accent only |
| Heavy drop shadows on containers | Subtle 1px borders |
| Bouncy animations | Fast, restrained motion |
| Bright saturated badge pills | Subtle fills with dark text |
| `radius-full` on avatars | Use `radius-md` (rounded square) |
| Pill-shaped badges | Use `radius-sm` (rounded rect) |
| Defining components inside components | Extract to separate files |
| Barrel imports (`export * from`) | Direct imports |
| Boolean prop proliferation | Use variant props or composition |

---

## 13. File Structure

```
src/
├── shared/
│   ├── ui/              # Base primitives
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── avatar.tsx
│   │   └── ...
│   ├── layout/          # Layout components
│   │   ├── app-shell.tsx
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   └── nav-items.tsx
│   ├── components/      # Shared components
│   │   ├── locale-switcher.tsx
│   │   └── theme-toggle.tsx
│   └── lib/             # Utilities
│       └── cn.ts
├── company/             # Company portal features
│   └── dashboard/
├── admin/               # Admin portal features
│   └── dashboard/
├── auth/                # Authentication
├── i18n/                # Internationalization
├── preferences/         # User preferences (theme, locale)
├── theme/               # Design tokens
└── styles/              # Global CSS
```

---

## 14. Quick Reference

### CSS Custom Properties
All design tokens are available as CSS custom properties in `globals.css`. Use them directly in Tailwind classes:
```
bg-[var(--color-surface)]
text-[var(--color-text-muted)]
border-[var(--color-border)]
rounded-[var(--radius-md)]
shadow-[var(--shadow-md)]
```

### cn() Utility
Use `cn()` from `@/shared/lib/cn` for conditional class merging:
```tsx
import { cn } from "@/shared/lib/cn";

<div className={cn(
  "base-styles",
  condition && "conditional-styles",
  className  // Allow override
)} />
```

### Zustand Stores
- `useAuthStore` — Authentication state
- `usePreferencesStore` — Theme, locale, sidebar state

### TanStack Router
- File-based routing in `src/app/`
- Route guards via `beforeLoad`
- Typed routes with `createFileRoute`

---

**Last updated:** Based on hrms_v1.html reference implementation.
