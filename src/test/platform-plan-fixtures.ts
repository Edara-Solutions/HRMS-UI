export const planId = "11111111-1111-4111-8111-111111111111";
export const priceId = "22222222-2222-4222-8222-222222222222";
export const catalogueInstant = "2026-09-20T10:00:00.000Z";
export const planPermissions = [
  "plans:read",
  "plans:create",
  "plans:update",
  "plans:delete",
  "plan-prices:read",
  "plan-prices:create",
  "plan-prices:update",
  "plan-prices:delete",
];
export function priceBody(overrides: Record<string, unknown> = {}) {
  return {
    publicId: priceId,
    countryCode: null,
    regionCode: null,
    billingInterval: "monthly",
    intervalCount: 1,
    isActive: true,
    money: {
      currencyCode: "USD",
      currencyExponent: 2,
      amountMinor: 7500,
      amountMajor: "75.00",
      formattedAmount: "USD 75.00",
    },
    createdAt: catalogueInstant,
    updatedAt: catalogueInstant,
    ...overrides,
  };
}
export function planBody(overrides: Record<string, unknown> = {}) {
  return {
    publicId: planId,
    name: "Growth خطة",
    description: "Authored description وصف",
    duration: 30,
    features: ["OVERVIEW", "TEAM_MANAGEMENT"],
    limits: { MAX_USERS: 100, MAX_DEPARTMENTS: 20 },
    isPublic: true,
    isActive: true,
    createdAt: catalogueInstant,
    updatedAt: catalogueInstant,
    deletedAt: null,
    ...overrides,
  };
}
export function planDetailBody(overrides: Record<string, unknown> = {}) {
  return { ...planBody(), prices: [priceBody()], effectivePrice: null, ...overrides };
}
export function effectiveBody(overrides: Record<string, unknown> = {}) {
  const price = priceBody();
  return {
    planPublicId: planId,
    planName: "Growth خطة",
    source: "default_row",
    pricePublicId: priceId,
    billingInterval: price.billingInterval,
    intervalCount: 1,
    countryCode: null,
    regionCode: null,
    money: price.money,
    ...overrides,
  };
}
