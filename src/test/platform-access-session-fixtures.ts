const at = "2026-09-20T09:00:00.000Z";

export const accessSessionIds = {
  session: "3f0f7a52-5d5b-4b8e-9d7e-7c3e8b1f2a10",
  company: "33333333-3333-4333-8333-333333333333",
  operator: "8f6b1a5c-3e2d-4c7b-8a6f-5e4d3c2b1a0f",
  approver: "9a7c2b6d-4f3e-4d8c-9b7a-6f5e4d3c2b1a",
} as const;

export const everyDelegatedPermission = [
  "delegation:open",
  "delegation:audit:read",
  "delegation:email-diagnostics:preview",
  "delegation:email-diagnostics:test-send",
] as const;

export function accessSessionBody(overrides: Record<string, unknown> = {}) {
  return {
    publicId: accessSessionIds.session,
    company: { publicId: accessSessionIds.company, name: "Acme Company" },
    operator: { publicId: accessSessionIds.operator, name: "Sara Haddad" },
    approver: { publicId: accessSessionIds.approver, name: "Omar Nasser" },
    reason: "SUPPORT_REQUEST",
    scope: "CHANGE",
    status: "OPEN",
    openedAt: at,
    expiresAt: new Date(Date.now() + 60 * 60_000).toISOString(),
    closedAt: null,
    endedBy: null,
    endNote: null,
    ...overrides,
  };
}

export const accessRequestIds = {
  request: "1b8d3c7e-5a4f-4e9d-8c8b-7a6f5e4d3c2b",
  approver: accessSessionIds.approver,
} as const;

export function accessRequestBody(overrides: Record<string, unknown> = {}) {
  return {
    publicId: accessRequestIds.request,
    company: { publicId: accessSessionIds.company, name: "Acme Company" },
    requester: { publicId: accessSessionIds.operator, name: "Sara Haddad" },
    reason: "INCIDENT_RESPONSE",
    scope: "CHANGE",
    requestedMinutes: 120,
    note: "Reproduce the failed payroll export. Ticket SUP-1234.",
    state: "PENDING",
    requestedAt: "2026-09-27T09:00:00.000Z",
    lapsesAt: "2026-09-28T09:00:00.000Z",
    decider: null,
    decidedAt: null,
    decisionNote: null,
    grantedScope: null,
    grantedMinutes: null,
    windowEndsAt: null,
    session: null,
    ...overrides,
  };
}
