# S9: Platform plans and prices

Implements [S9: Platform plans and prices](https://github.com/Edara-Solutions/HRMS-UI/issues/91)
from `origin/refactor/split-tier-users`. The product owner's implementation instruction
supersedes the backlog's historical publication-only pause. This remains internal
staging under the parent migration: no deployment until S12's complete removal and
reachability gate.

## Ownership and contracts

`pages/platform/plans` owns catalogue reads, filters, plan/price forms, permissions,
confirmation, market inspection, concurrency checks and reconciliation. Its two
thin routes enter through the slice's public API. The anonymous `pages/public-plans`
slice remains independent and uses only `shared/public-api`. Shared reuse is limited
to neutral schema forms, dialogs, read panels and explicit audience transport.

All eleven operations use generated contracts, `requestPlatformOperation`, and the
live Platform token. No parallel wire schemas remain. Delete responses are declared
200 bodies, not fabricated 204 responses; server message text is never rendered.

| Operation | Permission | Owner |
| --- | --- | --- |
| GET /api/v1/platform/plans | plans:read | Catalogue list, filters |
| GET /api/v1/platform/plans/{publicId} | plans:read | Definition detail, edit/delete preflight |
| POST /api/v1/platform/plans | plans:create | Definition editor |
| PATCH /api/v1/platform/plans/{publicId} | plans:update | Definition editor |
| DELETE /api/v1/platform/plans/{publicId} | plans:delete | Confirmed deletion |
| GET /api/v1/platform/plans/{publicId}/prices | plan-prices:read | Price list, current membership preflight |
| GET /api/v1/platform/plan-prices/{publicId} | plan-prices:read | Fresh price edit/delete preflight |
| POST /api/v1/platform/plans/{publicId}/prices | plan-prices:create | Price editor |
| PATCH /api/v1/platform/plan-prices/{publicId} | plan-prices:update | Price editor |
| DELETE /api/v1/platform/plan-prices/{publicId} | plan-prices:delete | Confirmed price deletion |
| GET /api/v1/platform/plans/{publicId}/effective-price | plan-prices:read | Explicit market inspection |

Cache keys include Platform audience, current identity, canonical operation, public
resource and applicable filters/market. They contain no credentials. Plan and price
response IDs must match the requested target; effective prices additionally match
the requested currency, billing interval and interval count. Price DTOs omit the
owning plan, so edit/delete verifies membership through the current scoped list.

## Workflow guarantees

Plan forms cover authored name/description, duration, supported features, limits,
publication and active state. PATCH submits changed fields; editing or removing a
limit preserves the other existing limits. The system default plan retains its
locked name/publication and cannot be deleted. Price forms use integer minor units,
explicit currency/interval, optional country/region/count and active state; they
never convert currencies or infer a market from browser locale.

Existing plan and price edits/deletions re-read the target and compare `updatedAt`.
Changes or missing price membership stop the command and refresh authoritative
state. There is no server revision/ETag field in these published request contracts;
the backend remains authoritative for races after preflight and reference conflicts.
Synchronous submission locks prevent duplicate commands. No mutation retries
automatically. Refusal/conflict recovery refreshes current identity; all settled
commands invalidate the Platform root, including affected conversion-plan reads.
Errors retain input and block further commands until an explicit successful fresh
read. Contract failures remain blocked. Ambiguous results never claim rollback or
success; the operator reviews refreshed records before another command.

The Platform effective-price endpoint returns a resolved object or refusal, not a
nullable price. The public catalogue's `effectivePrice: null` remains “no published
price resolved,” never free. Public pricing still requires both currency and interval,
with optional country/region/count. Authored text uses `bdi`/`dir=auto` rather than
fabricated translation. No enrollment CTA is introduced.

## Acceptance evidence

| Parent cases | Evidence |
| --- | --- |
| A1, A3 | Exact generated operation fixtures; Chromium checks paths/methods, Platform token and unchanged Company session; identity/resource/market cache tests |
| A2, E2 | Company-only browser entry sends no Platform call; existing audience transport/session tests cover wrong audience, one local refresh and isolated clearing |
| A4 | An edit interrupted during preflight cannot mutate for the replacement identity; shared live-generation transport rejects stale results; the portal boundary keys session generations and detail route keys resource changes |
| P1, P3 | Separate plans and plan-prices permission projections; read-only controls absent; system-default fields and deletion protected; 403 recovery revalidates `/me` |
| W1, W2 | All six writes exercised; changed-only PATCH; fresh definition/price and scoped membership checks; 409/ambiguous locks and reconciliation |
| E1, E3 | Generated 400/401/403/404 fixtures for each operation; owning form marks only matching declared field paths; foreign response ID and refusal states disclose no raw problem body |
| E4, E5, R1 | 400/403/409/429/500 mutation browser cases, offline create/read tests, malformed/foreign contract and market mismatch checks; canaries excluded from UI; no automatic write retry |
| Q1 | Loading geometry, empty catalogue, filtered empty and bounded offline/retry panels |
| Q2, Q3 | English/Arabic, LTR/RTL, crossed light/dark and narrow/desktop, 200% root text size, reduced motion, dialog panel focus/Tab/Escape/focus return, overflow checks and screenshots |
| Public pricing | Public browser regression suite plus both-live-identities/anonymous comparison: only credential-free `/public/plans`, no refresh calls |

Company access modes, delegated grants and Company scope cases C1/C2/D1/D2 are not
applicable to direct Platform catalogue management. No Company or delegated
operation is introduced. HTTP 429 is not declared by these pinned catalogue
contracts; it therefore fails closed as a contract status violation rather than
loosening the schema or inventing retry timing. Undeclared 5xx writes are uncertain.

Superseded slice-owned legacy forms/cards/filter helpers/fixtures, the unused manual
shared catalogue API, its barrel exports, and the entirely skipped legacy management
E2E specification are removed. The replacement component and browser suites cover
their supported journeys; frozen unrelated wire artifacts remain for S12.

Final local gates: typecheck and Biome/Steiger lint passed; all **714 unit tests in
103 files** passed (35 new slice tests); OpenAPI drift passed; the Platform-enabled
production build passed; React Doctor verbose diff against the origin base returned
**100/100 with no findings**, including staged new files; **34 Chromium checks**
passed across catalogue, public pricing and Platform refusals. The real public bundle
gate found seven reachable chunks totaling **622797 bytes**, with no protected
operation leakage. Presentation checks also inspect the main scroll container,
not only document width. CI outcomes are recorded on the pull request and issue.

The GitHub advisory action uses React Doctor 0.9.14 rather than the local pinned
0.5.8 scan. Its cleanup and repeated-lookup findings were addressed. Conditional
rendering complexity in the editor and detail component is reviewed as a maintenance
advisory: the branches are page-local permission/form states, with mutation behavior
covered by the scoped command model and fixtures. No diagnostic is suppressed.
The final GitHub score and check conclusions are recorded on the PR.
