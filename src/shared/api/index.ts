export { apiClient } from "./client";
export { apiBaseUrl } from "./config";
export {
  type AppError,
  type LoginError,
  type LoginErrorKind,
  mapHttpStatusToAppError,
  mapLoginError,
  readBackendErrorMessage,
} from "./error-mapper";
export type { Request as PublicPlansRequest } from "./generated/public/get-api-v1-public-plans";
export { ContractViolation } from "./generated/runtime";
export type {
  components as leadComponents,
  paths as leadPaths,
} from "./lead-contract";
export {
  parseLeadActivityListResponse,
  parseLeadConversionEligibility,
  parseLeadCreateResult,
  parseLeadDetails,
  parseLeadListResponse,
} from "./lead-runtime-contract";
export {
  ALL_KNOWN_PLAN_FEATURES,
  ALL_KNOWN_PLAN_LIMITS,
  BILLING_INTERVAL_VALUES,
  type BillingInterval,
  type CreatePlanInput,
  type CreatePlanPriceInput,
  type EffectivePrice,
  type EffectivePriceParams,
  isBillingInterval,
  type KnownPlanFeature,
  type Money,
  type Plan,
  type PlanDetailParams,
  type PlanFeature,
  type PlanLimits,
  type PlanListParams,
  type PlanListResponse,
  type PlanPrice,
  type PlanPriceListParams,
  type PublicPlanListParams,
  parsePlanListResponse,
  plansKeys,
  type ResolvedEffectivePrice,
  type UpdatePlanInput,
  type UpdatePlanPriceInput,
  useCreatePlan,
  useCreatePlanPrice,
  useDeletePlan,
  useDeletePlanPrice,
  useEffectivePlanPrice,
  usePlan,
  usePlanPrice,
  usePlanPrices,
  usePlans,
  usePublicPlans,
  useUpdatePlan,
  useUpdatePlanPrice,
} from "./plans";
export { executePublicRequest } from "./public-api";
export { queryClient } from "./query-client";
export type { components, paths } from "./schema";

export async function loadPublicPlansContract() {
  return import("./generated/public/get-api-v1-public-plans");
}
