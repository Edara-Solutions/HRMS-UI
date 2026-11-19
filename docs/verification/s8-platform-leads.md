# S8: Platform leads, domains, conversion and onboarding delivery

Implements [S8: Platform leads, domains, conversion, and onboarding delivery](https://github.com/Edara-Solutions/HRMS-UI/issues/90)
from `origin/refactor/split-tier-users`. This remains internal staging. The parent
epic remains nondeployable until S12 completes its removal/reachability gate.

## Exact operation ownership

All 27 contracts are generated Platform operations, exported by
`shared/api/platform-lead-operations.ts`. Cache roots include the current Platform
User, exact operation, resource ID and pagination/filter inputs. Request and
response schemas remain generated; page models derive their types from them.

| Method and path under `/api/v1/platform` | Owner and interaction |
| --- | --- |
| GET `/leads` | Leads page: wrapped registry rows, URL filters and pagination |
| POST `/leads` | Registry feature: safe fields and optional primary contact |
| GET `/leads/{publicId}` | Lead detail: scoped registry, contacts and history |
| PATCH `/leads/{publicId}` | Registry feature: changed safe fields only |
| DELETE `/leads/{publicId}` | Lead detail: typed name confirmation, bodyless 204 |
| POST `/leads/{publicId}/archive` | Lead detail: named confirmation |
| POST `/leads/{publicId}/unarchive` | Lead detail: named confirmation |
| GET `/leads/{publicId}/conversion-eligibility` | Lead detail: minimized eligibility codes; fresh preflight on submission |
| POST `/leads/{publicId}/contacts` | Contact panel: validated, confirmed add |
| PATCH `/leads/{publicId}/contacts/{contactPublicId}` | Contact panel: confirmed changed contact fields |
| DELETE `/leads/{publicId}/contacts/{contactPublicId}` | Contact panel: typed contact confirmation, bodyless 204 |
| GET `/leads/{publicId}/activities` | Activity panel: resource/page-bound timeline |
| POST `/leads/{publicId}/activities` | Activity panel: validated, confirmed log |
| DELETE `/leads/{publicId}/activities/{activityPublicId}` | Activity panel: typed confirmation, bodyless 204 |
| GET `/leads/{leadPublicId}/sending-domain` | Domain panel: lead owner/scope check; DNS record projection |
| POST `/leads/{leadPublicId}/sending-domain` | Domain panel: confirmed provisioning |
| POST `/leads/{leadPublicId}/sending-domain/verify` | Domain panel: confirmed verification |
| GET `/leads/{leadPublicId}/sending-domain/readiness` | Domain panel: independent readiness read |
| GET `/lead-conversion-requests` | Requests page: status/date filters and pagination; complete pending-request reconciliation |
| POST `/lead-conversion-requests` | Lead detail: named request confirmation |
| POST `/lead-conversion-requests/immediate` | Lead detail: named immediate conversion; uncertain result latches resubmission off |
| GET `/lead-conversion-requests/{publicId}` | Request detail: read-only inspection and fresh transition preflight |
| PATCH `/lead-conversion-requests/{publicId}/plan` | Request detail: pending-only active plan correction |
| POST `/lead-conversion-requests/{publicId}/approve` | Request detail: pending/eligible lead/active plan prerequisites and setup confirmation |
| POST `/lead-conversion-requests/{publicId}/reject` | Request detail: pending-only bounded reason and confirmation |
| GET `/lead-conversion-requests/{publicId}/onboarding-delivery` | Delivery panel: independent original-result inspection |
| POST `/lead-conversion-requests/{publicId}/onboarding-delivery/retry` | Delivery panel: original delivery ID, failed/retryable state and attempts checked again; no body/recipient/owner input |

Active-plan discovery uses the existing generated GET `/plans` with
`isActive: true` and its own `plans:read` permission. This is a supporting
catalogue read, outside the 27 S8 operations. Registry create/edit and conversion
plan/setup controls are features because they are reused in two workflows.
Neutral schema forms, date boundary fields and query state panels stay in shared
UI. All CRM business transitions stay in page-owned models. Routes are thin.

Request inspection requires `lead-conversion-requests:read`, independently of
`APPROVE_LEAD_CONVERSION_REQUEST`. Lead/contact/activity writes, domain management,
request submission, immediate conversion and onboarding retry each use their
exact generated permission. Root role names never synthesize these permissions.

Approval, rejection and plan correction reread the original request before
issuing a command. Approval additionally requires an active plan, a convertible
unarchived/unconverted lead and a primary contact with name/email. Custom setup
retains the six supported step types, positive unique sequence, required flags,
and ordered dependencies. Optional trial end must be a valid future instant.
The backend remains authoritative when any prerequisite changes concurrently.

Immediate conversion can commit a pending request before approval fails.
Recovery scans every pending-request page, matches the original Lead ID, and
links the original request for a reviewer with read authority. An uncertain
result never re-enables submission; unavailable recovery guides a reviewer.
A first-page miss is never treated as proof of rollback.

Delivery inspection never falls back to an embedded delivery after a failed
read. Retry requires an approved request with its provisioned Company and the
same original delivery record, `FAILED_RETRYABLE`, and attempts remaining.
Both request and delivery are reread before retry; a replaced record blocks it.
There are no arbitrary credential, owner or recipient controls.

## Acceptance evidence

| Parent cases | Executable evidence |
| --- | --- |
| A1–A3 | CRM contract/page tests assert Platform operation keys, exact route parameters, bodies, bodyless commands and identity/resource/page query roots. Browser tests assert Platform bearer tokens and unchanged simultaneous Company identity. Existing audience suites cover absent/wrong audience sessions. |
| A4, C1 | API tests reject foreign lead, request, contact and domain owner/ID echoes before use. Browser foreign-request case conceals projected content and all decision controls. Shared audience-operation tests reject late identity responses. |
| P1, W1–W2 | Route tests require exact read permissions. Read-only request page tests do not discover plans or expose decisions. Transition tests cover terminal states, inactive plans, ineligible/converted/archived leads, missing contact and replaced delivery. Mutations use synchronous locks and authoritative invalidation. |
| E1, E3–E5 | Contract/browser fixtures exercise 400, 403, 404, 409, 429, 500, malformed responses and offline commands. Recovery never repeats a command automatically. Failed immediate conversion reconciles a page-two request; both submission controls stay blocked. |
| Q1, R1 | Loading/empty/filter-empty/unavailable sections and invalid contact email; nullable requester stays withheld. Provider details, system payload notes, problem text, SMTP errors and idempotency keys never render. Schema forms validate explicit field whitelists and identify invalid fields. |
| Q2–Q3 | Browser fixtures cross English/Arabic, RTL/LTR, light/dark and desktop/narrow. Assertions cover 200% text, reduced motion, overflow, named/typed confirmations, keyboard focus, Escape and focus return. Screenshots are browser test artifacts. |

P2, E2 and identity/cache convergence are covered by the S1/S2 audience runtime
and SELF suites included in the full run. P3 protected root/Owner continuity and
C2 Company write restrictions do not grant direct Platform CRM authority.
Delegated D1/D2 workflows belong to S11. All mutations explicitly disable retry;
ambiguous effects require authoritative reconciliation and a new manual action.

Superseded slice-owned mixed-client APIs, manual wire schemas, old components and
their replaced tests were removed after the replacement contract/page tests
passed. The parent legacy generated-contract artifact removal remains S12 work.

Required gates: full unit suite, typecheck, Biome/Steiger, OpenAPI drift,
production build, verbose React Doctor diff, targeted browser suite and real
production chunk/import-boundary checks. Final results are recorded on the PR
and issue resolution.
