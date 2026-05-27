# HRMS Frontend Initialization Plan

## Context

The working directory `F:\project\HRMS_Front_End` is empty (only `.claude/`). The user will provide their plan at `./fe-plan-v1.md` and wants the project skeleton bootstrapped via the `/bootstrap-frontend-from-plan` skill.

**Decisions locked with the user:**
- **Plan source**: `./fe-plan-v1.md` (user-provided, defines modules + tech stack)
- **Scope**: skeleton only — folders, config, theme tokens, i18n, auth stub, shadcn primitives, routing, and per-module `AGENTS.md` rule files. No business logic.
- **Invocation model**: a **single** invocation of `/bootstrap-frontend-from-plan`. Each subsequent phase is a **verification gate** over one slice of the scaffold output.
- **Tech stack**: deferred entirely to `fe-plan-v1.md` (no assumptions about framework, styling, i18n lib, etc.).

**Intended outcome**: a runnable, lint-clean skeleton whose folder structure, tokens, routing, auth stub, and per-module `AGENTS.md` files match the contract declared in `fe-plan-v1.md`.

**How to use this file**: Work through phases in order. Tick each task `- [x]` once completed. Do not start a phase until the previous phase's gate condition is satisfied.

**Execution adjustment**: Per user direction on 2026-05-27, scaffold execution is split into reviewable local commits. The first committed slice is tech stack and package foundation only (`6a8b2a8 Phase 1: apply frontend tech stack foundation`). Core/domain modules are intentionally left until later slices.

---

## Phase 0 — Pre-flight

**Goal**: Confirm `fe-plan-v1.md` is present and complete enough to drive the skill.

### Tasks

- [x] **0.1 Verify plan file exists**
  - Confirm `F:\project\HRMS_Front_End\fe-plan-v1.md` exists and is non-empty.
  - If missing, stop and ask the user to drop it in.

- [x] **0.2 Read and parse the plan**
  - Read `fe-plan-v1.md` end-to-end.
  - Extract: tech stack (framework, language, styling, i18n, state, forms, data layer), module list, theme tokens (colors, typography, spacing, radii), routing strategy, locale strategy, and any module-specific rules.

- [x] **0.3 Identify gaps**
  - List items the plan does **not** lock down — these become the focused-interview answers in Phase 1.
  - Note any ambiguity (e.g. framework family chosen but version not specified).

- [x] **0.4 Gate**
  - Do not proceed if: plan is missing, framework is undeclared, or module list is empty.

---

## Phase 1 — Single bootstrap invocation

**Goal**: Run `/bootstrap-frontend-from-plan` once to produce the entire scaffold.

### Tasks

- [x] **1.1 Invoke the skill**
  - Run `/bootstrap-frontend-from-plan` with `./fe-plan-v1.md` as the input.
  - Applied locally through the `bootstrap-frontend-from-plan` skill instructions and the required Vercel companion skills.

- [x] **1.2 Answer the focused interview**
  - Use the gap list from Phase 0 (task 0.3) to answer.
  - Keep answers consistent with the plan — never override what the plan already specifies.
  - User directed scaffold ordering: tech stack and package setup first, core modules last.
  - Root design/API docs were added in the project root and used as local reference copies.
  - OpenAPI generation currently targets `http://localhost:3000/api/v1/openapi.json` until a different local file or URL is provided.

- [ ] **1.3 Let the skill scaffold in one pass**
  - Project config (package manager, TS config, lint/format, build tooling)
  - Directory layout
  - Theme token file(s)
  - i18n bootstrap (locales, default, message catalog scaffold)
  - Auth stub (login route, session shape, guarded layout)
  - shadcn primitive set
  - Routing tree
  - Per-module `AGENTS.md` rule files
  - Root `AGENTS.md` index referencing every module

- [ ] **1.4 Capture the output summary**
  - Save the skill's final summary (files created, modules covered) — used as the checklist for Phases 2–5.

---

## Phase 2 — Foundation verification

**Goal**: Confirm the non-module skeleton (config, tokens, i18n, build pipeline) is correct.

### Tasks

- [x] **2.1 Verify `package.json`**
  - Declares the stack from `fe-plan-v1.md` (exact framework + version family, styling lib, i18n lib).
  - No extra unrelated dependencies.

- [x] **2.2 Verify install**
  - Lockfile present; `install` completes clean with no peer-dep warnings related to the declared stack.

- [x] **2.3 Verify config files**
  - `tsconfig` (or language equivalent), linter config, formatter config — all present and aligned with the plan's conventions (path aliases, strict mode, etc.).

- [x] **2.4 Verify theme tokens**
  - Token file matches the plan 1:1: colors, typography scale, spacing scale, radii. No extras, no omissions.

- [x] **2.5 Verify i18n**
  - Initialized with the locales the plan names; default locale matches; message catalog folders exist for each locale.

- [x] **2.6 Verify build pipeline on empty skeleton**
  - `typecheck`, `lint`, and `build` all pass.

---

## Phase 3 — Routing & auth-stub verification

**Goal**: Confirm the routing tree and auth scaffold match the plan.

### Tasks

- [ ] **3.1 Verify route tree**
  - Mirrors the module list in `fe-plan-v1.md`; every module has at least an index route placeholder.
  - Deferred: core module placeholders remain intentionally unscaffolded until the module phase.

- [x] **3.2 Verify locale routing**
  - Strategy (path prefix, subdomain, cookie) matches what the plan specifies.
  - Implemented the plan's persisted preference-store strategy: locale lives in Zustand prefs, with document `lang`/`dir` sync and EN/AR switcher behavior verified in browser.

- [x] **3.3 Verify auth stub structure**
  - Login route exists.
  - Session shape defined (type/interface).
  - Authenticated layout present.
  - Guard utility / middleware present.
  - Implemented public auth routes, session types, Zustand auth store, guarded company/admin layouts, ky client shell, error mapper, and single-flight refresh placeholder.
  - No real backend wiring — stub only.

- [x] **3.4 Verify guard behavior**
  - Unauthenticated request to a guarded route redirects to login.
  - Browser smoke verified `/company/dashboard` redirects to `/login`; dummy login returns to `/company/dashboard`.

- [x] **3.5 Verify auth-required shadcn primitives**
  - Button, Input, Form, Label (and anything else the login route uses) are present.
  - Implemented minimal owned primitives with navy styling and accessible label association.

---

## Phase 4 — Per-module rule (`AGENTS.md`) verification

**Goal**: Walk every module the plan names and confirm its rule file is correct.

### Tasks

- [ ] **4.1 Build the module checklist**
  - From `fe-plan-v1.md`, write down every module name that must exist (e.g. `auth`, `dashboard`, `employees`, `attendance`, `leave`, `payroll`, `settings` — final list comes from the plan).

- [ ] **4.2 Per-module directory check**
  - For each module on the checklist: directory exists at the expected path (`src/modules/<module>/` or framework equivalent).

- [ ] **4.3 Per-module `AGENTS.md` check**
  - Each module directory contains an `AGENTS.md` file.

- [ ] **4.4 Per-module rule alignment**
  - Rules inside each `AGENTS.md` align with what the plan says about that module (naming conventions, data layer, allowed dependencies, do/don't lists).

- [ ] **4.5 Root `AGENTS.md` index**
  - Root `AGENTS.md` links to every module's rule file. No orphans. No broken links.

---

## Phase 5 — Tech-stack sanity sweep

**Goal**: One end-to-end pass before declaring the skeleton ready.

### Tasks

- [ ] **5.1 Clean install**
  - Delete `node_modules` (or equivalent) and reinstall from lockfile.

- [ ] **5.2 Typecheck**
  - Run and expect zero errors.

- [ ] **5.3 Lint**
  - Run and expect zero errors.

- [ ] **5.4 Build**
  - Run and expect success with no warnings about missing tokens, missing locales, or unresolved aliases.

- [ ] **5.5 Dev-server smoke test**
  - Start the dev server, hit the root route and the login route, confirm they render with no runtime errors in the console.

---

## Phase 6 — Handoff

**Goal**: Lock in the baseline so module feature work can begin.

### Tasks

- [ ] **6.1 Git initialization** (if the plan calls for it)
  - `git init`, baseline commit.

- [ ] **6.2 Handoff note**
  - Short summary listing: stack chosen, modules scaffolded, where `AGENTS.md` files live, and what is intentionally **not** included (business logic, real API wiring, real auth backend).

- [ ] **6.3 Close out**
  - Module feature work begins after this point — outside the scope of this plan.

---

## Critical files involved

- `F:\project\HRMS_Front_End\fe-plan-v1.md` — single source of truth, read in Phase 0, never modified.
- All files produced by `/bootstrap-frontend-from-plan` in Phase 1 — verified in Phases 2–5, not authored by hand.

## End-to-end verification summary

`install` → `typecheck` → `lint` → `build` → `dev` all green on the empty skeleton; every module declared in `fe-plan-v1.md` has a directory and an `AGENTS.md`; root `AGENTS.md` indexes them all; theme tokens, locales, and routing match the plan exactly.
