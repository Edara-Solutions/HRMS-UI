# HRMS Frontend

## Coding standards — always

Before writing, editing, or reviewing any TypeScript in this repo, load the **`coding-standards`** skill (`.claude/skills/coding-standards/`) — the single source of truth for naming, types, language rules, modules, and comments. Start at `SKILL.md`; the frontend specifics are in `FRONTEND.md`.

For how the **UI** looks and how components are built (primitives, layout, tokens, theming, RTL, accessibility), use the **`edara-hrms-ui`** skill. The two compose: `edara-hrms-ui` for the component, `coding-standards` for the TypeScript inside it.

## Architecture — where code goes (always, before adding UI)

This frontend uses a minimal **Feature-Sliced Design**. Before creating, moving, or importing any UI code, read **[`docs/frontend-architecture.md`](docs/frontend-architecture.md)** — it is the source of truth for layers (`app / pages / widgets / features / shared`, no `entities`), the import rules Steiger enforces, thin directory-based routing, portal isolation (`admin` ↔ `company` never cross), and generating domain types from the backend OpenAPI schema. The rationale is in [`docs/adr/0001-frontend-fsd-architecture.md`](docs/adr/0001-frontend-fsd-architecture.md). When in doubt, keep code in its `pages/` slice.
