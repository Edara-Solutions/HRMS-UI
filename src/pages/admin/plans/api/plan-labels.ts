import { BILLING_INTERVAL_VALUES, type Plan, type PlanFeature } from "@/shared/api";

export const SYSTEM_DEFAULT_PLAN_NAME = "Default Full Access";

export const FEATURE_LABEL: Record<string, string> = {
  ATTENDANCE: "Attendance",
  ANALYTICS: "Analytics",
  OVERVIEW: "Overview",
  TEAM_MANAGEMENT: "Team management",
};

export const LIMIT_LABEL: Record<string, string> = {
  MAX_USERS: "Max users",
  MAX_DEPARTMENTS: "Max departments",
  MAX_POSITIONS: "Max positions",
};

export const BILLING_INTERVAL_LABEL: Record<string, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  biannual: "Biannual",
  annually: "Annually",
};

export const KNOWN_BILLING_INTERVALS = BILLING_INTERVAL_VALUES;
export const DEFAULT_INTERVAL_COUNT = 1;

export function getFeatureLabel(feature: PlanFeature): string {
  return FEATURE_LABEL[feature] ?? feature.replace(/_/g, " ").toLowerCase();
}

export function getLimitLabel(limitKey: string): string {
  return LIMIT_LABEL[limitKey] ?? limitKey.replace(/_/g, " ").toLowerCase();
}

export function isSystemDefaultPlan(plan: Pick<Plan, "name">): boolean {
  return plan.name === SYSTEM_DEFAULT_PLAN_NAME;
}

export function getPlanUnknownFeatures(plan: Pick<Plan, "features">): string[] {
  return plan.features.filter((feature) => !(feature in FEATURE_LABEL));
}

export function getPlanPriceMarketLabel(price: {
  countryCode: string | null;
  regionCode: string | null;
}): string {
  if (price.countryCode) return `Country: ${price.countryCode}`;
  if (price.regionCode) return `Region: ${price.regionCode}`;
  return "Default fallback";
}
