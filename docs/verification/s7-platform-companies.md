# S7 — Platform Companies and subscriptions

Implements issue #89 from `refactor/split-tier-users`. This is internal staging;
the parent epic #81 remains nondeployable until S12 completes its removal and
reachability gate. The contextual Access Session action belongs to S11 and is
absent here.

## Operation ownership

All operations are the generated **Platform** contracts exported by
`shared/api/platform-company-operations.ts`. Transport and cache roots use the
current Platform identity. Public Company IDs and pagination distinguish reads;
tokens never enter keys. Routes import only their page public APIs.

| Method and path under `/api/v1/platform` | Owner and interaction |
| --- | --- |
| GET `/companies` | Companies page: paginated registry and current-page search |
| GET `/companies/cursor` | Subscriptions page: cursor navigation to Company workspaces |
| POST `/companies` | Shared registry feature: safe create fields |
| GET `/companies/{publicId}` | Company detail: registry inspector |
| PATCH `/companies/{publicId}` | Shared registry feature: changed safe fields only |
| DELETE `/companies/{publicId}` | Company detail: typed Company-name confirmation |
| POST `/companies/{publicId}/freeze` | Company detail: named commercial freeze confirmation |
| POST `/companies/{publicId}/unfreeze` | Company detail: named unfreeze confirmation |
| POST `/companies/{publicId}/suspend` | Company detail: named suspension confirmation |
| POST `/companies/{publicId}/unsuspend` | Company detail: named unsuspension confirmation |
| POST `/companies/{publicId}/restore` | Detail after deletion, or registry known-ID restore: confirmation |
| GET `/companies/{publicId}/access-policy` | Company detail: configured/effective access mode |
| PATCH `/companies/{publicId}/access-policy` | Company detail: confirmed policy form |
| GET `/companies/{publicId}/activation` | Company detail: pure readiness read |
| POST `/companies/{publicId}/activation/evaluate` | Company detail: confirmed re-evaluate and activate |
| GET `/companies/{publicId}/commercial-config` | Company detail: read-only commercial inspector |
| GET `/companies/{publicId}/subscription` | Company detail: subscription and minimized history |
| PATCH `/companies/{publicId}/subscription/trial` | Company detail: confirmed trial extension |
| POST `/company-subscriptions/expire-trials` | Subscriptions page: separate global typed `EXPIRE` confirmation |

Registry `isActive` remains labelled read-only. Freeze and suspension use the
commercial `isFrozen`/`isBlocked` flags; they do not infer registry lifecycle
changes. Restore targets soft-deleted records, not the `CLOSED` lifecycle state.
Unknown prerequisites disable commands; server refusals remain authoritative.

The registry form derives its schema from the generated create contract and
constructs an explicit field whitelist. Policy and trial forms derive their
body schemas from their generated operations. No page-owned wire schemas or
sibling-page imports remain. The registry feature is shared because create and
edit both use it. Superseded fixtures, mixed-client queries and activation-repair
controls were removed.

## Acceptance evidence

| Parent cases | Executable evidence |
| --- | --- |
| A1–A3 | Registry/detail/subscription unit fixtures assert exact Platform operations, public IDs, bodies and identity cache roots; browser fixtures assert the Platform bearer token and unchanged simultaneous Company identity. Missing Platform identity sends no request. |
| A4, C1 | Detail API tests reject every foreign Company echo before projection and reject an in-flight response after Platform identity replacement. Browser foreign-activation fixture conceals content and disables evaluation. |
| P1, W1–W2 | Route/action tests use exact permissions. Detail tests cover dedicated freeze/unfreeze, suspend/unsuspend, delete/restore, policy, trial and evaluation operations. Pending locks prevent duplicate submission; stale 409 refreshes before manual retry. Browser 403 re-reads actor authority and removes the action. |
| E1, E3–E5 | Refusal fixtures cover 400, 403, 409, 429, 500, offline and malformed successes. Global expiry failures remain indeterminate, refresh affected reads, never report zero/count or auto-retry. Detail actions preserve safe copy and reconcile. |
| Q1, R1 | Empty/filter-empty, unavailable/malformed reads and independent loading panels; raw activation details, policy notes, subscription reasons and refusal canaries are absent. No raw DTO rendering or credential fields. |
| Q2–Q3 | Twelve browser cases across English/Arabic projects: RTL/LTR, light/dark, desktop/narrow, 200% text size, reduced motion, keyboard confirmation, Escape/focus return and overflow assertions. |

P2, E2 and global session/cache convergence are supplied by the existing S1/S2
SELF and audience-runtime suites, which run in the full suite. P3 root/Owner
continuity and C2 Company write restrictions do not grant or restrict these
direct Platform operations; Company policy remains visibly orthogonal to
Platform authority. D1/D2 delegated workflows belong to S11.

Mutations use `retry: false`, synchronous duplicate locks, generated request and
response validation, and authoritative invalidation. After an uncertain result,
the operator must reconcile before explicitly trying again. Global expiry may
commit earlier per-Company transactions before failing, so only a validated
successful response can report its `expiredCount`.

Required checks: full unit suite, typecheck, Biome/Steiger, OpenAPI drift,
production build, verbose React Doctor diff, targeted browser suite, and
`scripts/check-audience-boundaries.mjs` against real production chunks. Exact
final results are recorded in the pull request and issue resolution.
