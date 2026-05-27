# Frontend Integration Guide — Cross-Cutting Concerns

> **Base URL** `http://localhost:3000/api/v1` (dev) — swap with your staging/prod URL via env var.

---

## 1. Authentication Contract

### Token Lifecycle

```
POST /auth/login  →  { accessToken, refreshToken, sessionId, expiresIn, mustChangePassword }
POST /auth/refresh →  { accessToken, refreshToken, sessionId, expiresIn }
```

- `accessToken` — short-lived JWT. Send as `Authorization: Bearer <token>` on every protected request.
- `refreshToken` — long-lived opaque token. Send via `POST /auth/refresh` when access expires.
- `sessionId` — UUID, identifies the device session. Stored in the JWT payload.
- `expiresIn` — seconds until `accessToken` expires.

### JWT Payload (decoded)

```json
{
  "id": "user-public-uuid",
  "companyId": "company-public-uuid",
  "sessionId": "session-uuid",
  "iat": 1716000000,
  "exp": 1716003600
}
```

> The JWT only carries UUIDs — never internal numeric IDs.

### `mustChangePassword` Gate (CRITICAL)

After login or invitation acceptance, if `mustChangePassword: true`:
- **All protected endpoints return `403 Forbidden`** except `POST /auth/change-password`.
- The UI **must** redirect to the change-password screen immediately and block all other navigation.
- After a successful password change, re-login or re-fetch tokens normally.

```mermaid
sequenceDiagram
    participant U as User
    participant UI as Frontend
    participant API as Backend

    U->>UI: Enter credentials
    UI->>API: POST /auth/login
    API-->>UI: 200 { accessToken, mustChangePassword: true }
    UI->>UI: Redirect to /change-password
    U->>UI: Enter new password
    UI->>API: POST /auth/change-password
    API-->>UI: 200 { ok: true }
    UI->>UI: Redirect to dashboard
```

### Token Refresh Strategy

```
If API response is 401:
  1. POST /auth/refresh with stored refreshToken
  2. If 200: store new tokens, retry original request
  3. If 4xx: clear tokens, redirect to /login
```

### Public Routes (no `Authorization` header needed)

| Route | Purpose |
|-------|---------|
| `POST /auth/login` | Credential login |
| `POST /auth/refresh` | Token rotation |
| `POST /auth/accept-invitation` | First-time password set |
| `GET /health` | Health check |

---

## 2. Error Contract

All errors return a JSON body:

```json
{ "error": "Human-readable message describing the problem" }
```

| HTTP Status | AppError Code | Meaning | UI Action |
|-------------|--------------|---------|-----------|
| `400` | — | Schema validation (Fastify AJV) | Show field errors |
| `401` | — | Missing/invalid JWT | Redirect to login |
| `403` | `FORBIDDEN` | Permission denied or `mustChangePassword` | Show permission error / redirect to change-password |
| `404` | `NOT_FOUND` | Resource not found | Show not-found state |
| `409` | `ALREADY_EXISTS` | Duplicate (e.g. email, company code) | Show conflict message |
| `422` | `VALIDATION` | Domain-level validation failed | Show inline error |
| `429` | — | Rate limit exceeded | Backoff + retry |
| `500` | `INTERNAL` | Server error | Show generic error |

### Validation Errors (400 — AJV schema failures)

Fastify returns structured errors when JSON schema validation fails:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "body/email must match format \"email\""
}
```

---

## 3. Pagination Patterns

### Page-Based (offset/limit) — used by: Users, Leads, Roles, Sessions, Audit

**Request query params:** `page` (default 1), `pageSize` (default 25, max 100)

**Response envelope:**
```json
{
  "items": [ ...records... ],
  "meta": {
    "mode": "page",
    "page": 1,
    "pageSize": 25,
    "totalItems": 143,
    "totalPages": 6
  }
}
```

### Cursor-Based — used by: Companies (`GET /companies/cursor`)

**Request query params:** `cursor` (opaque string), `limit` (default 20, max 100)

**Response envelope:**
```json
{
  "data": [ ...records... ],
  "meta": {
    "nextCursor": "MjAyNi0wMS0wMVQwMDowMDowMFo6NDI=",
    "limit": 20,
    "hasMore": true
  }
}
```

> Use `meta.nextCursor` as the `cursor` param in your next request. When `hasMore: false`, you've reached the end.

### Companies Page-Based — `GET /companies`

```json
{
  "data": [ ...companies... ],
  "meta": { "page": 1, "limit": 10, "total": 45, "totalPages": 5 }
}
```

---

## 4. Public ID Convention

> **Rule:** All API resources expose a UUID `publicId`. The internal numeric `id` is **never sent to clients**.

```json
// ✅ Use this
{ "publicId": "550e8400-e29b-41d4-a716-446655440000" }

// ❌ Never use internal id — it's never in responses
{ "id": 42 }
```

Always reference resources by their `publicId` in URL params:
```
GET  /users/550e8400-e29b-41d4-a716-446655440000
PATCH /leads/3fa85f64-5717-4562-b3fc-2c963f66afa6
```

---

## 5. Enum Catalog

### User Status (`status`)
| Value | Meaning |
|-------|---------|
| `ACTIVE` | Normal working state |
| `ONBOARDING` | Just joined, being set up |
| `PROBATION` | Under evaluation period |
| `SUSPENDED` | Temporarily deactivated |
| `TERMINATED` | Contract ended by company |
| `RESIGNED` | Employee left voluntarily |

### Employment Type (`employmentType`)
| Value | Meaning |
|-------|---------|
| `FULL_TIME` | Full-time employee |
| `PART_TIME` | Part-time employee |
| `CONTRACTOR` | External contractor |
| `INTERN` | Internship |

### Work Location (`workLocation`)
| Value | Meaning |
|-------|---------|
| `ONSITE` | At office |
| `REMOTE` | Work from home/anywhere |
| `HYBRID` | Mix of onsite and remote |

### Lead Status (`status`) — settable by client (REJOINED is system-only)
| Value | Pipeline Stage |
|-------|---------------|
| `NEW` | Just entered |
| `WRONG_NUMBER` | Bad contact info |
| `NO_ANSWER` | No response yet |
| `FOLLOWING_UP` | Active outreach |
| `CONTACTED` | Made contact |
| `QUALIFIED` | Confirmed fit |
| `NOT_QUALIFIED` | Poor fit |
| `NOT_INTERESTED` | Declined |
| `DEMO_SCHEDULED` | Demo booked |
| `WAITING_QUOTATION` | Awaiting price |
| `QUOTATION_SENT` | Price sent |
| `TRIAL_STARTED` | Trial active |
| `NEGOTIATION` | Deal in progress |
| `WON_CONVERTED` | Closed — became a company |
| `LOST` | Deal lost |
| `REJOINED` | System-set only (re-subscribed company) |

### Lead Source (`source`)
`CRM` · `LANDING_PAGE` · `FACEBOOK` · `GOOGLE` · `LINKEDIN` · `REFERRAL` · `PARTNER` · `OTHER`

### Lost Reason (`lostReason`)
`TOO_EXPENSIVE` · `MISSING_FEATURES` · `NOT_FIT` · `COMPETITOR_CHOSEN` · `NO_BUDGET` · `NO_DECISION` · `NO_RESPONSE`

### Company Size Range (`companySizeRange`)
| Value | Range |
|-------|-------|
| `5_TO_20` | 5–20 employees |
| `21_TO_50` | 21–50 employees |
| `51_TO_100` | 51–100 employees |
| `MORE_THAN_100` | 100+ employees |

### Lead Activity Type (`type`)
`CALLING_ON_WHATSAPP` · `CALLING_ON_PHONE` · `SENDING_EMAIL` · `RECEIVING_EMAIL` · `SENDING_SMS` · `RECEIVING_SMS` · `CHAT` · `SENDING_QUOTATION` · `REQUEST_QUOTATION` · `MEETING` · `NOTE` · `FORM_SUBMISSION` · `SYSTEM_EVENT` · `OTHER`

### Subscription Status (`subscriptionStatus`)
`TRIAL` · `ACTIVE` · `FROZEN` · `CANCELLED` · `EXPIRED`

### Plan Features (`features[]`)
`ATTENDANCE` · `ANALYTICS` · `OVERVIEW` · `TEAM_MANAGEMENT`

### Plan Limits (keys in `limits` object)
| Key | Meaning |
|-----|---------|
| `MAX_USERS` | Max employee accounts |
| `MAX_DEPARTMENTS` | Max departments |
| `MAX_POSITIONS` | Max job positions |

### Client Type (`clientType`)
`web` · `mobile`

---

## 6. Money / Pricing Format

All price endpoints return a `money` object instead of a raw number:

```json
{
  "money": {
    "currencyCode": "SAR",
    "currencyExponent": 2,
    "amountMinor": 14900,
    "amountMajor": "149.00",
    "formattedAmount": "SAR 149.00"
  }
}
```

> `amountMinor` is the canonical integer value (e.g. 14900 halalas = 149.00 SAR). Use `formattedAmount` for display.

### Price Source Resolution (`source`)
When resolving effective price, the backend tries:
1. `country` — exact country match
2. `region` — regional price
3. `default_row` — global fallback

The `source` field in the response tells you which level matched.

---

## 7. RBAC — Permission Actions Catalog

Used for UI permission guards (show/hide buttons, routes).

| Action | Grants Access To |
|--------|-----------------|
| `users:create` | Create employees |
| `users:read` | View employee list/details |
| `users:update` | Edit employee profile |
| `users:delete` | Delete employees |
| `users:reset-password` | Force password reset / reissue invitation |
| `roles:create` | Create roles |
| `roles:read` | View roles and permissions |
| `roles:update` | Edit roles and their permissions |
| `roles:delete` | Delete roles |
| `roles:assign` | Assign/revoke roles to users, transfer ownership |
| `sessions:read` | View other users' sessions |
| `sessions:revoke` | Revoke other users' sessions |
| `companies:read` | View company profile |
| `companies:update` | Edit company profile |
| `audit:read` | View audit log (SaaS admin only) |

---

## 8. Rate Limiting

| Scope | Limit |
|-------|-------|
| Global | 100 requests / minute per IP |
| Login (soft limit) | Configurable — generic error response to mask brute force |
| Login (hard limit) | Configurable — blocks IP entirely |

When rate-limited, the API returns `429 Too Many Requests`. Implement exponential backoff.

---

## 9. Request Headers Cheatsheet

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

- All POST/PATCH/PUT bodies must be JSON with `Content-Type: application/json`.
- Public endpoints do not need `Authorization`.

---

## 10. Sort Options Reference

| Module | Sort values |
|--------|------------|
| Users | `createdAtAsc` · `createdAtDesc` · `nameAsc` · `nameDesc` |
| Leads | `createdAtAsc` · `createdAtDesc` |

---

## 11. Billing Interval Reference

`billingInterval` is a free-form string with these conventional values:

| Value | Meaning |
|-------|---------|
| `monthly` | Monthly billing |
| `yearly` | Annual billing |
| `weekly` | Weekly billing |
| `daily` | Daily billing |

`intervalCount` (default `1`) multiplies the interval — e.g. `billingInterval: "monthly"` + `intervalCount: 3` = every 3 months.
