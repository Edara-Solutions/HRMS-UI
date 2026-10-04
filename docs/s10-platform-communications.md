# S10: Platform communications and governance

Implements [issue 92](https://github.com/Edara-Solutions/HRMS-UI/issues/92) on `refactor/split-tier-users`. This remains an internal migration stage; deployment waits for S12's removal and reachability gate. Company email diagnostics remain gated by backend issue 290 and S11.

## Operation ownership

All paths below have the `/api/v1/platform` prefix. Every operation uses its generated audience contract and the explicit Platform client. Cache roots include the Platform User identity. Routes import page public APIs only.

| Owner | Exact operations |
| --- | --- |
| Shared notification feature, mounted by PlatformShell | `GET /notifications`, `GET /notifications/unread-count`, `POST /notifications/seen`, `POST /notifications/read` |
| `pages/platform/notifications` | `GET /notification-settings`, `PUT /notification-settings/{typeKey}` |
| `pages/platform/announcements` | `GET /announcements`, `POST /announcements` |
| `pages/platform/audit` | `GET /audit-trail`, `GET /audit-trail/actors` |
| `pages/platform/emails` | `GET /email-types`, `GET /email-types/{key}`, `GET /email-types/{key}/preview`, `GET /email-types/{key}/variants`, `GET /email-template-variants/{key}/removal-readiness`, `POST /email-template-variants/{key}/migrate`, `POST /emails/test-send` |
| `pages/platform/email-deliveries` | `GET /emails/deliveries`, `GET /emails/deliveries/{context}/{publicId}`, `POST /emails/deliveries/{context}/{publicId}/cancel`, `POST /emails/deliveries/{context}/{publicId}/retry` |
| `pages/platform/email-sending` | `GET /emails/sending`, `POST /emails/sending/{context}/pause`, `POST /emails/sending/{context}/resume` |

These are the slice's 24 operations. Supporting Company-name and role pickers use the already migrated Platform registry and role operations, separately permission gated. Notification permission references are limited to actions declared for the Platform audience.

## Acceptance evidence

| Parent matrix case | Evidence |
| --- | --- |
| Wrong audience and foreign scope | Identity-keyed API tests, Company-only browser access refusal, foreign preview and delivery context rejection, existing audience transport/runtime tests |
| Permissions and protected targets | Read-only catalogue and announcement tests, zero-read permission tests, unknown notification versions remain neutral and uneditable; preview/test-send only accept EDARA types |
| Stale and concurrent state | Variant aggregate recheck, delivery context/status/attempt recheck, sending state recheck, notification routing recheck; synchronous command lock and live identity/authority check before writes |
| Disclosure | Empty sandbox and deny-all preview CSP, script/link/remote-resource browser canaries; delivery provider/internal actor identifiers never render; migration exposes aggregate counts and approved replacement variants |
| Malformed contracts | Generated request/response/refusal contract tests, malformed catalogue refusal, exact preview identity/locale and delivery context checks |
| Offline and ambiguous mutations | Shared bounded mutation recovery plus test-send 400/403/409/429/500 tests; drafts survive failures; writes are never retried automatically and require explicit reconciliation before another command |
| Announcement semantics | Both languages and explicit rules pinned before publish; all six dispatch states retained, nullable dispatch completion independent of state, distinct recipient and Company reach |
| Global audit | Generated Platform response models, USER and PLATFORM_USER actor labels, kind/identity grouping avoids same-name collisions; unavailable records retain a neutral timeline entry |
| Presentation and interaction | Chromium English/Arabic suites cross desktop/narrow and light/dark, assert 200% text layout, reduced motion, modal Tab/Escape and focus return; loading/empty/error states covered by component tests |

The feature `platform-communications-command` owns the shared command lock, bounded outcome and reconciliation interaction used by several pages. Wire types remain generated; page models contain only presentation and editing state.

The superseded Platform email slice, old Platform audit runtime validator, unused delivery filter widgets, unused sending copy and skipped legacy email browser test are removed after their replacement tests pass. The contract artifact registry no longer requires the migrated audit validator; shared frozen audit label/catalogue artifacts remain until their own final migration gate.

## Local release gate

Typecheck and Biome/Steiger passed. The full suite passed 737 tests; the affected suite passed 104 tests after the Doctor fixes, followed by eight test-send cases including the added offline case. OpenAPI drift, production build and the actual public-route bundle/import-boundary check passed. Chromium passed all 50 checks across English and Arabic. Reviewed desktop light and narrow RTL dark screenshots at 200% text. React Doctor verbose diff scored 91/100 with zero errors and one advisory: five independent composer state values. Event updates are batched by React and mutation locking remains synchronous; no suppression was added.
