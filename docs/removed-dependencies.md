# Removed dependencies

Dependencies removed from `package.json` after `bun run doctor` flagged them as unused
(`deslop/unused-dependency`, confirmed by grepping `src/` for imports before removal).
Kept here so anyone missing one of these later knows it was a deliberate cleanup, not an accident.

| Package | Version at removal | Notes |
| --- | --- | --- |
| `@tanstack/react-table` | ^8.21.0 | No `useReactTable`/table imports anywhere in `src/`. |
| `@tanstack/react-virtual` | ^3.11.0 | No `useVirtualizer` usage; no list in the app is virtualized yet. |
| `class-variance-authority` | ^0.7.1 | Variant styling is done with the hand-rolled `cn()` + variant-map pattern in `src/shared/ui/*`, not `cva`. |
| `date-fns` | ^4.1.0 | No date formatting currently goes through `date-fns`; see `src/shared/lib/format-date.ts` for the in-house helper. |
| `date-fns-tz` | ^3.2.0 | Same as above, timezone variant. |
| `framer-motion` | ^12.0.0 | Motion in this app is implemented with Tailwind + the `--motion-*` CSS custom properties (see `edara-hrms-ui` skill `TOKENS.md`), not Framer Motion. |
| `sonner` | ^1.7.4 | No `<Toaster/>` mounted and no `toast()` calls anywhere; there is currently no toast/notification system in the app. |

If a future feature needs one of these (e.g. a toast system, a virtualized table), reinstall it
deliberately rather than assuming it's still wired up.
