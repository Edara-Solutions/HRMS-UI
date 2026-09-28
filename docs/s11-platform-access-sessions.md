# S11: Platform Access Sessions and delegated support workspace

Implements [Platform Access Sessions and delegated support workspace](https://github.com/Edara-Solutions/HRMS-UI/issues/93) on `refactor/split-tier-users`. Its original 19 delegated operations are now extended by [bounded Company email diagnostics](company-email-diagnostics.md), using four dedicated operations from the accepted, published backend runtime. S12 records the existing-contract removal gate; the diagnostic extension records its own contract, reachability and acceptance evidence.

## Operation ownership

All paths have the `/api/v1/platform` prefix. Direct operations use the Platform client; delegated operations use the explicit `delegatedApiClient`, which extends the Platform client (same sign-in, single-flight refresh and session clearing) but accepts only `delegated` contracts. Neither client can send the other's operations.

| Owner | Exact operations |
| --- | --- |
| `pages/platform/company-detail` (entry) | `POST /access-sessions` |
| `pages/platform/access-session` (lifecycle) | `GET /access-sessions/{id}`, `POST /access-sessions/{id}/close`, `GET /companies/{publicId}` (name only, separately gated) |
| Employees | `GET …/users`, `GET …/users/{userPublicId}`, `PATCH …/users/{userPublicId}` (firstName, lastName, phone, photoUrl only) |
| Roles (read-only) | `GET …/roles`, `GET …/roles/{rolePublicId}` |
| Profile & setup | `GET …/profile`, `PATCH …/profile`, `GET …/setup`, `POST …/setup/{stepPublicId}/start`, `…/complete`, `…/skip` |
| Email | `GET …/email-settings`, `PUT …/email-settings`, `GET …/email-readiness`, `GET …/email-template-assignments`, `POST …/email-template-assignments`, `DELETE …/email-template-assignments/{emailTypeKey}`, `GET …/sending-domain` |
| Scoped audit | `GET …/audit-trail` |

`…` is `/access-sessions/{sessionPublicId}`. Delegated reads are cached under `platform-delegated + Platform User + Access Session`; removing that root clears every Company read of the session and nothing else.

## Grants and lifecycle

- Each delegated operation needs `delegation:open`, its own `delegation:*` permission and a live session (`usePlatformAccess().delegatedAvailability`). Entry alone grants nothing; an area is listed only when one of its reads is granted.
- A session is live only while the server reports `OPEN` and its fixed expiry has not passed on the local clock; a timer fires at expiry.
- Expiry, close, loss of `delegation:open` or identity replacement cancel and remove the session's delegated cache and replace Company content with an ended state. Minimal owned metadata remains, and Close remains while `closedAt` is null.
- A delegated 403/404 re-reads `/me` and the owned session. A foreign, missing or other-sign-in session is a concealed 404; a malformed ID never matches the route declaration.
- Mutations run under a synchronous lock, are never retried, and reconcile the session, identity and affected reads before another attempt.

## Acceptance evidence

| Parent matrix case | Evidence |
| --- | --- |
| Wrong audience / foreign scope (A1, A2, C1, D2) | Delegated transport tests (client audience crossing, malformed session ID, identity replacement), concealed 404 page and browser tests |
| Permissions / protected targets (P1, D1) | Projection test for `delegation:open` + action + liveness; per-area and per-action page tests; roles read-only; no create/delete/reset/role/lifecycle/impersonation control |
| Stale / concurrent state (W2, D2) | Refusal reconciles against the session and clears content; permission loss mid-session; local expiry; setup and removal confirmations send exactly once |
| Disclosure canaries (R1) | Problem detail, readiness reason, sending-domain failure text and unknown setup statuses never render |
| Malformed contracts (E5) | Undeclared response field refused as a contract failure; generated request validation |
| Offline / ambiguous mutations (E4) | 500 correction and 500 session open report an unconfirmed outcome with one request and no retry |
| Presentation (Q1–Q3) | Chromium English/Arabic, desktop light and narrow RTL dark, dialog focus, no overflow at 200% text, reduced motion |

## Local release gate

Typecheck, Biome and Steiger pass. The full Vitest suite passes. OpenAPI drift, legacy contract artifacts and the production build pass. `tests/e2e/platform-access-sessions.spec.ts` passes in both Chromium projects alongside the existing Company workspace spec. React Doctor (changed scope against the base) scores 92/100 with zero errors and one advisory: the session-open mutation has no cache invalidation, which is intentional because success navigates to a session that has no cached data yet. Employee status, setup step type and sending-domain status/health are typed as free strings by the delegated contract, so their label allowlists fall back to a neutral "unknown" label rather than being derived from a schema enum.
