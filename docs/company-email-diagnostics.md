# Company email diagnostics for Platform support

Implements [Contract-gated extension: Company email diagnostics for Platform support](https://github.com/Edara-Solutions/HRMS-UI/issues/95). The [bounded backend runtime](https://github.com/Edara-Solutions/HRMS_Back_End/issues/291#issuecomment-5862767300) is pinned to producing commit `d96d4916aec1cc04f1a7215db50e1772432aef2d`. Its [runtime handoff](https://github.com/Edara-Solutions/HRMS_Back_End/blob/d96d4916aec1cc04f1a7215db50e1772432aef2d/docs/design/split-tier-users/company-email-diagnostics-runtime.md) and exact committed audience documents own the wire contracts, sender readiness, synthetic inputs, quota and delivery evidence.

## Ownership and authority

The existing `pages/platform/access-session` slice owns the model, command controller, queries and Email-area panel. No route, generic proxy, Company credential or Company User adapter is added. Preview and sending are independently projected from current `delegation:open`, their exact additional action and the fixed live Access Session. Preview-only authority cannot send; send-only authority can use the three accepted synthetic catalogue keys without accessing preview data. A root role never synthesizes a grant.

All four dedicated operations use the delegated client with the current Platform token, closed generated request/response schemas and the fixed session public ID. Catalogue and preview cache keys contain `platform-delegated`, operator, Access Session and operation; preview additionally includes sample and language. Receipt state is local to the same workspace and sign-in generation. It survives support-area tab changes. Replaced sign-ins and changes to the open/diagnostic grants remount that workspace and reject old in-flight responses. Inactive workspaces expose no retained receipt or intent.

| Method and suffix under `/api/v1/platform/access-sessions/{sessionPublicId}/email-diagnostics` | Exact action | Mounted consumer |
| --- | --- | --- |
| `GET /types` | `delegation:email-diagnostics:preview` | `api/email-diagnostics.ts` catalogue query |
| `GET /types/{key}/preview?locale=en\|ar` | `delegation:email-diagnostics:preview` | `api/email-diagnostics.ts` preview query |
| `POST /test-sends` | `delegation:email-diagnostics:test-send` | `api/email-diagnostics.ts` confirmed command |
| `GET /test-sends/{requestId}` | `delegation:email-diagnostics:test-send` | `api/email-diagnostics.ts` receipt lookup |

The exact ledger now contains **213** operations: 72 Company, 116 direct Platform, 23 delegated, one public UI and one headless health probe. Generator metadata includes refusal codes nested in union envelopes, including the dedicated diagnostic limiter. The new safe audit event is Company scoped, Platform visible and declares no personal data; the bilingual catalogue now describes 80 events.

## Inspection and delivery

Catalogue keys become closed localized sample labels; descriptions and unknown type keys never become fallback text. The preview shows subject, preheader, sender, reply-to, rendered HTML and plain text. The requested type and language must match the validated preview. HTML uses the existing sanitized frame with an empty sandbox, no referrer, deny-all CSP, inert links and blocked remote resources. Text fields use React escaping. No real credential payload is requested or created.

The operator mailbox comes only from validated Platform `/me`; the server resolves the actual recipient. The user confirms the selected Company's sample, language and registered mailbox. There is no recipient, Company, payload, sender or template override. A request UUID is created before confirmation. A synchronous lock prevents duplicate submission, and the transport never automatically retries mutations.

`202` shows durable acceptance and worker status, never a claim of mailbox receipt. Result lookups must match the original UUID, type and language. Unknown acceptance holds the unchanged command, disables new UUIDs and requires authoritative lookup. A receipt `404` may race acceptance and keeps the outcome unknown; only an explicit confirmation replays the same UUID and command. A failed lookup does not unlock replay. Conflicting requests can inspect their receipt but cannot start a fresh send. Readiness and invalid-mailbox/sample refusals use distinct safe copy and explicit later confirmation.

Malformed acceptance keeps the original intent available for manual receipt lookup through the independent result contract. Even a valid result does not re-enable the invalid send contract. An invalid result disables further result lookups; undeclared gateway failures retain unknown acceptance and require reconciliation before explicit replay.

The five-new-tests-per-operator/Company/ten-minute quota is enforced by the backend across sessions. The UI preserves input and respects validated `retryAfterSeconds` without retrying. A standard global `429` without timing uses a conservative ten-minute local delay. This cooldown is presentation, never authorization or a substitute for the server limit.

Expiry, closure, originating-sign-in replacement and declared authority loss clear Company previews/results and cancel reads. Losing the exact send grant clears local intent/receipt state and invalidates in-flight result settlement, even if the grant is restored within the same sign-in. `ACCESS_SESSION_INACTIVE` and `PERMISSION_DENIED` end the workspace immediately even when stale owned metadata still says `OPEN`. Diagnostic catalogue/preview concealment clears Company content; an ambiguous receipt lookup `404` retains only its bounded intent. Accepted delivery work is not cancelled by ending the support session.

## Acceptance evidence

| Parent cases | Verification |
| --- | --- |
| M08 / A1–A4 / C1 / D1–D2 / P1 | Exact four-operation transport tests, audience crossing rejection, fixed-scope/cache assertions, independent grants, terminal refusals, existing expiry/closure coverage and discarded acceptance after sign-in replacement |
| M09 / E1–E5 | Closed request overrides rejected, malformed success blocked, safe 409 readiness/conflict, 422, 429, 500/offline ambiguity, failed lookup and receipt-404 reconciliation |
| M10 / W1–W2 | Confirmation before POST, duplicate-click lock, frozen UUID/sample/locale, explicit replay and preservation through support tabs |
| M11 / R1 | Script, image, stylesheet, iframe, form and top-navigation browser canaries remain inert; no remote request, raw problem, recipient/provider field, catalogue description or credential disclosure |
| M12 / Q1–Q3 | Loading/query refusal states, empty/unavailable samples, English/Arabic, LTR/RTL, both themes, desktop/narrow, 200% text zoom, reduced motion, semantic labels and confirmation focus trap/return |

Run the normal typecheck, lint/Steiger, full unit tests, OpenAPI drift, build, React Doctor changed-scope scan, exact ledger and source/bundle boundary checks. Browser coverage is `platform-access-sessions.spec.ts` plus the unchanged Company communications journey, with `VITE_ENABLE_PLATFORM_PORTAL=true`; a portal-disabled build intentionally conceals these routes. Screenshots are local test artifacts under `test-results/` and do not ship. Tests intercept declared HTTP boundaries; backend production-guard/SMTP evidence remains in the linked runtime resolution.
