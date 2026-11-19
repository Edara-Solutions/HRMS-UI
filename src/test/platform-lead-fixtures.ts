export const leadIds = {
  lead: "33333333-3333-4333-8333-333333333333",
  contact: "44444444-4444-4444-8444-444444444444",
  plan: "55555555-5555-4555-8555-555555555555",
  request: "66666666-6666-4666-8666-666666666666",
  delivery: "77777777-7777-4777-8777-777777777777",
  activity: "88888888-8888-4888-8888-888888888888",
  other: "99999999-9999-4999-8999-999999999999",
};
export const leadInstant = "2026-09-27T10:00:00.000Z";
export const leadPermissions = [
  "leads:read",
  "leads:create",
  "leads:update",
  "leads:delete",
  "sending-domains:read",
  "sending-domains:manage",
  "REQUEST_LEAD_CONVERSION",
  "AUTO_APPROVE_LEAD_CONVERSION",
  "lead-conversion-requests:read",
  "APPROVE_LEAD_CONVERSION_REQUEST",
  "company-onboarding:retry",
  "plans:read",
];
export function leadBody(overrides: Record<string, unknown> = {}) {
  return {
    publicId: leadIds.lead,
    companyName: "Acme Lead",
    website: "https://acme.example",
    industry: "Technology",
    companySizeRange: "21_TO_50",
    country: "Egypt",
    city: "Cairo",
    source: "CRM",
    status: "QUALIFIED",
    lostReason: null,
    isConverted: false,
    numberOfAttempts: 2,
    lastAttemptAt: leadInstant,
    isArchived: false,
    createdAt: leadInstant,
    updatedAt: leadInstant,
    deletedAt: null,
    ...overrides,
  };
}
export function contactBody(overrides: Record<string, unknown> = {}) {
  return {
    publicId: leadIds.contact,
    name: "Intended Owner",
    email: "owner@example.test",
    phone: "01012345678",
    jobTitle: "Director",
    isPrimary: true,
    createdAt: leadInstant,
    updatedAt: leadInstant,
    deletedAt: null,
    ...overrides,
  };
}
export function activityBody(overrides: Record<string, unknown> = {}) {
  return {
    publicId: leadIds.activity,
    type: "NOTE",
    note: "Requested a demo",
    createdAt: leadInstant,
    updatedAt: leadInstant,
    deletedAt: null,
    ...overrides,
  };
}
export function eligibilityBody(overrides: Record<string, unknown> = {}) {
  return { isEligible: true, reasons: [], primaryContact: contactBody(), ...overrides };
}
export function leadDetailBody(overrides: Record<string, unknown> = {}) {
  return {
    lead: leadBody(),
    contacts: [contactBody()],
    activities: [activityBody()],
    primaryContact: contactBody(),
    conversionEligibility: eligibilityBody(),
    ...overrides,
  };
}
export function pageMeta(page = 1, totalPages = 1) {
  return { mode: "page", page, pageSize: 10, totalItems: totalPages, totalPages };
}
export function leadListBody() {
  return { items: [{ lead: leadBody(), contacts: [contactBody()] }], meta: pageMeta() };
}
export function planBody(overrides: Record<string, unknown> = {}) {
  return {
    publicId: leadIds.plan,
    name: "Growth",
    description: null,
    duration: 30,
    features: [],
    limits: null,
    isPublic: true,
    isActive: true,
    createdAt: leadInstant,
    updatedAt: leadInstant,
    ...overrides,
  };
}
export function plansBody() {
  return { data: [{ ...planBody(), deletedAt: null, prices: [], effectivePrice: null }] };
}
export function deliveryBody(overrides: Record<string, unknown> = {}) {
  return {
    publicId: leadIds.delivery,
    status: "FAILED_RETRYABLE",
    attemptCount: 1,
    maxAttempts: 3,
    lastError: "smtp-credential-canary",
    lastAttemptedAt: leadInstant,
    deliveredAt: null,
    exhaustedAt: null,
    idempotencyKey: "delivery-key-canary",
    createdAt: leadInstant,
    updatedAt: leadInstant,
    ...overrides,
  };
}
export function conversionBody(overrides: Record<string, unknown> = {}) {
  return {
    publicId: leadIds.request,
    status: "PENDING",
    rejectionReason: null,
    approvedAt: null,
    rejectedAt: null,
    createdAt: leadInstant,
    updatedAt: leadInstant,
    lead: leadBody(),
    primaryContact: contactBody(),
    plan: planBody(),
    requester: null,
    approvedBy: null,
    rejectedBy: null,
    company: null,
    ownerOnboardingDelivery: null,
    ...overrides,
  };
}
export function approvedBody(overrides: Record<string, unknown> = {}) {
  return conversionBody({
    status: "APPROVED",
    lead: leadBody({ isConverted: true, status: "WON_CONVERTED" }),
    approvedAt: leadInstant,
    company: { publicId: leadIds.other, name: "Acme Company", companyCode: "ACME" },
    ownerOnboardingDelivery: deliveryBody(),
    ...overrides,
  });
}
export function domainBody(overrides: Record<string, unknown> = {}) {
  return {
    publicId: leadIds.other,
    owner: "LEAD",
    ownerPublicId: leadIds.lead,
    domain: "mail.acme.example",
    status: "PENDING",
    health: "UNKNOWN",
    dnsRecords: [
      {
        kind: "OWNERSHIP_TXT",
        host: "mail.acme.example",
        recordType: "TXT",
        value: "verify-acme",
        description: "provider-internal-canary",
      },
    ],
    checkResults: [
      { kind: "OWNERSHIP_TXT", status: "PENDING", failureDetail: "dns-internal-canary" },
    ],
    verifiedAt: null,
    providerReference: "provider-secret-canary",
    lastFailure: "provider-failure-canary",
    createdAt: leadInstant,
    updatedAt: leadInstant,
    ...overrides,
  };
}
