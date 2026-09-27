const at = "2026-09-20T09:00:00.000Z";

export const accessSessionIds = {
  session: "3f0f7a52-5d5b-4b8e-9d7e-7c3e8b1f2a10",
  company: "33333333-3333-4333-8333-333333333333",
  employee: "4b2d7c1e-9a8f-4e3d-8c2b-1a0f9e8d7c6b",
  role: "5c3e8d2f-0b9a-4f4e-9d3c-2b1a0f9e8d7c",
  step: "6d4f9e3a-1c0b-4a5f-8e4d-3c2b1a0f9e8d",
  permission: "7e5a0f4b-2d1c-4b6a-9f5e-4d3c2b1a0f9e",
} as const;

export const everyDelegatedPermission = [
  "delegation:open",
  "delegation:users:read",
  "delegation:users:update",
  "delegation:roles:read",
  "delegation:profile:read",
  "delegation:profile:update",
  "delegation:setup:read",
  "delegation:setup:update",
  "delegation:email-settings:read",
  "delegation:email-settings:update",
  "delegation:email-readiness:read",
  "delegation:template-assignments:read",
  "delegation:template-assignments:create",
  "delegation:template-assignments:delete",
  "delegation:sending-domains:read",
  "delegation:audit:read",
  "companies:read",
] as const;

export function accessSessionBody(overrides: Record<string, unknown> = {}) {
  return {
    publicId: accessSessionIds.session,
    companyPublicId: accessSessionIds.company,
    reason: "SUPPORT_REQUEST",
    status: "OPEN",
    openedAt: at,
    expiresAt: new Date(Date.now() + 60 * 60_000).toISOString(),
    closedAt: null,
    ...overrides,
  };
}

export function delegatedEmployeeBody(overrides: Record<string, unknown> = {}) {
  return {
    publicId: accessSessionIds.employee,
    employeeCode: "EMP-7",
    firstName: "Omar",
    lastName: "Said",
    email: "omar@example.test",
    phone: null,
    status: "ACTIVE",
    photoUrl: null,
    createdAt: at,
    updatedAt: at,
    ...overrides,
  };
}

export function delegatedUsersBody(items = [delegatedEmployeeBody()]) {
  return {
    items,
    meta: { mode: "page", page: 1, pageSize: 20, totalItems: items.length, totalPages: 1 },
  };
}

export function delegatedRolesBody() {
  return {
    items: [
      {
        publicId: accessSessionIds.role,
        name: "HR Manager",
        description: null,
        isOwner: false,
        isSystem: true,
        createdAt: at,
        updatedAt: at,
      },
    ],
    meta: { mode: "page", page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
  };
}

export function delegatedRoleBody() {
  return {
    ...delegatedRolesBody().items[0],
    permissions: [
      { publicId: accessSessionIds.permission, action: "users:read", description: null },
    ],
  };
}

export function delegatedProfileBody() {
  return {
    companyPublicId: accessSessionIds.company,
    name: "Acme Labs",
    logoUrl: null,
    email: "hello@acme.test",
    phone: null,
    country: "EG",
    city: null,
    addressLine: null,
    taxNumber: null,
    commercialNumber: null,
    status: "INCOMPLETE",
    updatedAt: at,
  };
}

export function delegatedStepBody(status = "PENDING") {
  return {
    publicId: accessSessionIds.step,
    stepType: "SET_BRANCHES",
    status,
    isRequired: true,
    sequence: 1,
    startedAt: null,
    completedAt: null,
  };
}

export function delegatedEmailSettingsBody() {
  return {
    displayName: "Acme",
    primaryColor: "#123456",
    onPrimaryColor: "#ffffff",
    footerIdentity: "Acme Labs",
    senderLocalPart: "hr",
    replyToEmail: "hr@acme.test",
    defaultLocale: "en",
    defaultTimeZone: "Africa/Cairo",
    sendingDomain: "mail.acme.test",
    senderVerified: true,
  };
}

export function delegatedSendingDomainBody() {
  return {
    domain: "mail.acme.test",
    status: "VERIFIED",
    health: "HEALTHY",
    verifiedAt: at,
    lastFailure: "provider-failure-canary",
  };
}
