/** Wire-valid Company organization bodies. Every canary must stay out of the rendered DOM. */
const at = "2026-09-20T09:00:00.000Z";

export const organizationCanaries = [
  "internal-detail-canary",
  "internal-instance-canary",
  "requirement-message-canary",
  "ace09ed2-c5bd-4474-bac9-78a7bb659da3",
] as const;

export const stepIds = {
  profile: "11111111-1111-4111-8111-111111111111",
  roles: "22222222-2222-4222-8222-222222222222",
  branches: "33333333-3333-4333-8333-333333333333",
} as const;

export function setupStep(
  stepType: "SET_COMPANY_PROFILE" | "SET_ROLES" | "SET_BRANCHES",
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED",
  overrides: Record<string, unknown> = {},
) {
  const publicId =
    stepType === "SET_COMPANY_PROFILE"
      ? stepIds.profile
      : stepType === "SET_ROLES"
        ? stepIds.roles
        : stepIds.branches;
  return {
    publicId,
    stepType,
    status,
    isRequired: stepType !== "SET_BRANCHES",
    sequence: stepType === "SET_COMPANY_PROFILE" ? 1 : stepType === "SET_ROLES" ? 2 : 3,
    templateVersion: 1,
    dependencies: stepType === "SET_ROLES" ? ["SET_COMPANY_PROFILE"] : [],
    startedAt: status === "PENDING" ? null : at,
    completedAt: status === "COMPLETED" || status === "SKIPPED" ? at : null,
    createdAt: at,
    updatedAt: at,
    ...overrides,
  };
}

export function setupBody(steps: ReturnType<typeof setupStep>[]) {
  return {
    companyPublicId: "ace09ed2-c5bd-4474-bac9-78a7bb659da3",
    templateVersion: 1,
    steps,
  };
}

export function profileBody(overrides: Record<string, unknown> = {}) {
  return {
    publicId: "4b8f6a57-2b8d-4f5e-8c0e-6f1c3b2a9d10",
    companyPublicId: "ace09ed2-c5bd-4474-bac9-78a7bb659da3",
    name: "Edara Labs",
    logoUrl: null,
    email: "hello@edara.test",
    phone: null,
    country: "Egypt",
    city: null,
    addressLine: null,
    taxNumber: null,
    commercialNumber: null,
    status: "INCOMPLETE",
    createdAt: at,
    updatedAt: at,
    ...overrides,
  };
}

export function activationBody(overrides: Record<string, unknown> = {}) {
  return {
    lifecycleStatus: "ONBOARDING",
    activatedAt: null,
    canActivate: false,
    unmetRequirements: [
      { code: "COMPANY_PROFILE_INCOMPLETE", message: "requirement-message-canary" },
    ],
    ...overrides,
  };
}

export function registryBody(overrides: Record<string, unknown> = {}) {
  return {
    publicId: "ace09ed2-c5bd-4474-bac9-78a7bb659da3",
    companyCode: "EDARA",
    name: "Edara Labs",
    logo: null,
    website: "https://edara.test",
    country: "Egypt",
    lifecycleStatus: "ONBOARDING",
    activatedAt: null,
    ...overrides,
  };
}

export function subscriptionBody(overrides: Record<string, unknown> = {}) {
  return {
    subscription: {
      plan: { publicId: "9d1c5b7e-3a2f-4c6d-8e9f-0a1b2c3d4e5f", name: "Growth", duration: 30 },
      status: "TRIAL",
      startDate: at,
      endDate: null,
      initialTrialEndDate: "2026-10-04T09:00:00.000Z",
      trialEndDate: "2026-10-04T09:00:00.000Z",
      ...overrides,
    },
    history: [],
  };
}

export function accessPolicyBody(mode: string, reason: string | null = null) {
  return { mode, reason, effectiveUntil: null };
}
