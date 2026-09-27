export { apiClient } from "./client";
export { isCompanyBlocked, useCompanyAccess } from "./company-access";
export { companyApi, loadCompanyIdentity, loginCompany } from "./company-api";
export { companyApiClient } from "./company-client";
export {
  CompanySessionChanged,
  companyAccessPolicyQuery,
  companyEmailReadinessQuery,
  companyQueryKey,
  companyReadQuery,
  requestCompanyOperation,
} from "./company-operation";
export { companyOrganizationOperations } from "./company-operations";
export { companyQueryClient } from "./company-query-client";
export { apiBaseUrl } from "./config";
export {
  type AppError,
  type LoginError,
  type LoginErrorKind,
  mapHttpStatusToAppError,
  mapLoginError,
  readBackendErrorMessage,
} from "./error-mapper";
export type { OperationKey, RefusalMode } from "./generated/authorization";
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
export { classifyMutationFailure, type MutationOutcome } from "./mutation-outcome";
export { executeOperationRequest, OperationRefusal } from "./operation-request";
export { readOperationResponse } from "./operation-response";
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
export { loadPlatformIdentity, loginPlatform, platformApi } from "./platform-api";
export { platformApiClient } from "./platform-client";
export { platformQueryClient } from "./platform-query-client";
export { queryClient } from "./query-client";
export type { components, paths } from "./schema";

export async function loadCompanyPasswordContract() {
  return import("./generated/company/post-api-v1-company-me-password");
}

export async function loadPlatformPasswordContract() {
  return import("./generated/platform/post-api-v1-platform-me-password");
}
