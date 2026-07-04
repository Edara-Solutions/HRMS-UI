# Local Issue Tracker — HRMS Frontend

A lightweight, in-repo issue tracker. Each issue is a Markdown file
(`NNNN-slug.md`) with YAML frontmatter for machine-readability. No remote
service — issues version with the code they describe. Issues are **vertical
slices** derived from a parent PRD in [`../prd/`](../prd/README.md).

> **For AI agents:** an issue labelled `ready-for-agent` is fully specified and
> may be implemented without further interviewing the user. Read the issue, its
> parent PRD, the linked ADR, and `../frontend-architecture.md` first. Update the
> issue's `status` as you progress and check off the acceptance criteria.

## Issues

Vertical slices derived from PRD
[0001 — Migrate frontend to minimal Feature-Sliced Design](../prd/0001-frontend-fsd-migration.md).
Work top-down: only the `ready-for-agent` row is startable now; each `blocked`
row unlocks when its "Blocked by" issues are `done`.

| ID | Title | Status | Blocked by | Phase |
| -- | ----- | ------ | ---------- | ----- |
| [0001](0001-scaffold-fsd-skeleton.md) | Scaffold FSD skeleton + tooling | `ready-for-agent` | — | 1 |
| [0002](0002-migrate-shared-layer.md) | Migrate shared/ layer | `blocked` | 0001 | 1 |
| [0003](0003-routing-infra-app-shell.md) | Routing infrastructure + app-shell widget | `blocked` | 0001, 0002 | 1 |
| [0004](0004-features-auth.md) | features/auth (change-password interaction) | `blocked` | 0002 | 1 |
| [0005](0005-admin-companies-pages.md) | Migrate admin companies + company-detail pages | `blocked` | 0003 | 1 |
| [0006](0006-admin-leads-pages.md) | Migrate admin leads + lead-detail pages | `blocked` | 0003 | 1 |
| [0007](0007-remaining-admin-pages.md) | Migrate remaining admin pages (plans, audit, subscriptions) | `blocked` | 0003 | 1 |
| [0008](0008-auth-entry-pages.md) | Migrate auth/entry pages | `blocked` | 0003, 0004 | 1 |
| [0009](0009-placeholder-dashboards.md) | Migrate placeholder dashboards (admin + company) | `blocked` | 0003 | 1 |
| [0010](0010-steiger-strict-cleanup.md) | Flip Steiger to strict + retire legacy patterns | `blocked` | 0005–0009 | 1 |
| [0011](0011-phase2-generated-types.md) | Phase 2: generated types from backend OpenAPI | `blocked` | 0010 | 2 |

**Dependency chain:** `0001 → 0002 → 0003` unlocks the parallel page slices
`0005 / 0006 / 0007 / 0009` (and `0004 → 0008`); all page slices gate `0010`
(Phase 1 done), which gates `0011` (Phase 2).

## The `## Next` convention (persistent)

Every issue ends with a **`## Next`** section naming what to pick up when it
completes, and every phase-closing issue states the next phase. When you finish
a slice: mark it `done`, flip its dependents' status to `ready-for-agent` if
their blockers are all cleared, and start the issue named in `## Next`. This
keeps the migration self-advancing for any dev or agent without re-planning.

## Status vocabulary

- `open` — filed, not yet started.
- `ready-for-agent` — fully specified; an agent may pick it up and implement.
- `in-progress` — actively being worked.
- `blocked` — waiting on a blocking issue (named in the issue's "Blocked by").
- `done` — merged and verified.

## Label vocabulary

- `ready-for-agent` — specification is complete enough for autonomous implementation.
- `architecture` — changes structure/boundaries, not user-facing behavior.
- `enhancement` — new capability or improvement.
- `bug` — defect in existing behavior.
- `documentation` — docs only.

## Filing a new issue

1. Copy the frontmatter block from an existing issue; bump the `id` and pick a slug.
2. Use the issue template: **Parent → What to build → Acceptance criteria →
   Blocked by → Next** (the `## Next` section is required — see the convention above).
3. Add a row to the Issues table above.
