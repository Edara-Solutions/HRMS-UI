export const companyIds = {
  company: "33333333-3333-4333-8333-333333333333",
  other: "44444444-4444-4444-8444-444444444444",
  plan: "55555555-5555-4555-8555-555555555555",
  subscription: "66666666-6666-4666-8666-666666666666",
};
export const companyInstant = "2026-09-27T10:00:00.000Z";
export const companyPermissions = [
  "companies:read",
  "companies:create",
  "companies:update",
  "companies:delete",
  "companies:freeze",
  "companies:suspend",
  "companies:restore",
  "company-access-policies:read",
  "company-access-policies:update",
  "company-activation:read",
  "company-activation:evaluate",
  "company-configs:read",
  "company-subscriptions:read",
  "company-subscriptions:extend-trial",
  "company-subscriptions:expire-trials",
];
export function companyBody(overrides: Record<string, unknown> = {}) {
  return {
    publicId: companyIds.company,
    companyCode: "ACME",
    name: "Acme Company",
    logo: null,
    website: "https://acme.example",
    phoneNumber: "01012345678",
    country: "Egypt",
    addressLine: "Cairo",
    isActive: true,
    lifecycleStatus: "ACTIVE",
    activatedAt: companyInstant,
    createdAt: companyInstant,
    updatedAt: companyInstant,
    ...overrides,
  };
}
export function companyListBody() {
  return { data: [companyBody()], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } };
}
export function companyCursorBody() {
  return { data: [companyBody()], meta: { nextCursor: null, limit: 20, hasMore: false } };
}
export function companyPolicyBody(mode = "NORMAL") {
  return {
    policy: {
      publicId: null,
      companyPublicId: companyIds.company,
      mode,
      reason: "reason-canary",
      note: "internal-policy-canary",
      effectiveFrom: null,
      effectiveUntil: null,
      createdAt: null,
      updatedAt: null,
      source: "default",
    },
    effectiveMode: mode,
    effectiveAt: companyInstant,
    isCurrentlyEffective: true,
    isExpired: false,
  };
}
export function companyActivationBody(canActivate = true) {
  return {
    companyPublicId: companyIds.company,
    lifecycleStatus: "ONBOARDING",
    activatedAt: null,
    canActivate,
    unmetRequirements: canActivate
      ? []
      : [
          {
            code: "REQUIRED_SETUP_INCOMPLETE",
            message: "message-canary",
            details: { stepTypes: ["detail-canary"] },
          },
        ],
  };
}
export function companyCommercialBody(frozen = false) {
  return {
    companyPublicId: companyIds.company,
    plan: { publicId: companyIds.plan, name: "Business" },
    subscriptionStatus: "TRIAL",
    subscriptionStartDate: companyInstant,
    subscriptionEndDate: null,
    trialEndDate: "2026-10-10T10:00:00.000Z",
    siteStatus: {
      isFrozen: frozen,
      isReadOnly: false,
      isBlocked: false,
      isUnderMaintenance: false,
    },
    updatedAt: companyInstant,
  };
}
export function companySubscriptionBody() {
  return {
    subscription: {
      publicId: companyIds.subscription,
      companyPublicId: companyIds.company,
      plan: { publicId: companyIds.plan, name: "Business", duration: 30 },
      status: "TRIAL",
      startDate: companyInstant,
      endDate: null,
      initialTrialEndDate: "2026-10-01T10:00:00.000Z",
      trialEndDate: "2026-10-10T10:00:00.000Z",
      note: "subscription-note-canary",
      createdAt: companyInstant,
      updatedAt: companyInstant,
    },
    history: [],
  };
}
