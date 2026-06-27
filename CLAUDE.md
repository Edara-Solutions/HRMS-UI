# HRMS Frontend

## Coding standards — always

Before writing, editing, or reviewing any TypeScript in this repo, load the **`coding-standards`** skill (`.claude/skills/coding-standards/`) — the single source of truth for naming, types, language rules, modules, and comments. Start at `SKILL.md`; the frontend specifics are in `FRONTEND.md`.

For how the **UI** looks and how components are built (primitives, layout, tokens, theming, RTL, accessibility), use the **`edara-hrms-ui`** skill. The two compose: `edara-hrms-ui` for the component, `coding-standards` for the TypeScript inside it.
